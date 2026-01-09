// gigs.js - Updated for cookie-based authentication
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    config.headers['X-Request-ID'] = `gig_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => Promise.reject(error)
);
axiosInstance.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      return response.data;
    }
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  },
  (error) => {
    if (!error.response) {
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0
      });
    }
    
    if (error.response.status === 401) {
      localStorage.removeItem('userInfo');
      if (window.location.pathname !== '/signin' && 
          window.location.pathname !== '/signup') {
        window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
      
      return Promise.reject({
        success: false,
        message: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED',
        status: 401
      });
    }
    
    if (error.response.status === 500) {
      return Promise.reject({
        success: false,
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: 500,
        data: error.response.data
      });
    }
    
    return Promise.reject(error.response.data || {
      success: false,
      message: error.message,
      status: error.response.status
    });
  }
);

const cleanParams = (params) => {
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    if (value !== undefined && 
        value !== null && 
        value !== '' && 
        value !== 'undefined' && 
        value !== 'null') {
      
      if (typeof value === 'boolean') {
        cleaned[key] = value;
      }
      else if (Array.isArray(value)) {
        cleaned[key] = value.filter(v => v && v !== '');
      }
      else if (typeof value === 'object' && !(value instanceof Date)) {
        // Handle nested objects
      }
      else if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      }
      else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

export const gigsAPI = {
  getAll: async (params = {}) => {
    try {
      const defaultParams = {
        page: 1,
        limit: 12,
        sort: 'createdAt',
        order: 'desc',
        status: 'open',
        populate: true,
        includeCategory: true,
        includeSubcategory: true,
        includeClient: true,
        lean: true
      };
      
      const cleanedParams = cleanParams({
        ...defaultParams,
        ...params
      });
      
      const response = await axiosInstance.get('/api/gigs', {
        params: cleanedParams,
        paramsSerializer: {
          serialize: (params) => {
            const searchParams = new URLSearchParams();
            
            Object.entries(params).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                  searchParams.append(key, value.join(','));
                } else if (typeof value === 'boolean') {
                  searchParams.append(key, value.toString());
                } else {
                  searchParams.append(key, value.toString());
                }
              }
            });
            
            return searchParams.toString();
          }
        }
      });
      
      return {
        success: true,
        data: response.data || response.gigs || [],
        pagination: response.pagination || {
          page: parseInt(cleanedParams.page) || 1,
          limit: parseInt(cleanedParams.limit) || 12,
          total: response.total || 0,
          totalPages: Math.ceil((response.total || 0) / (parseInt(cleanedParams.limit) || 12))
        },
        ...response
      };
      
    } catch (error) {
      if (error.code === 'SERVER_ERROR' || error.status === 500) {
        return {
          success: false,
          data: [],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 12,
            total: 0,
            totalPages: 0
          },
          isFallback: true,
          error: error.message
        };
      }
      
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw {
          success: false,
          message: 'Invalid gig identifier',
          code: 'INVALID_ID'
        };
      }
      
      const params = {
        populate: 'true',
        includeCategory: 'true',
        includeSubcategory: 'true',
        includeClient: 'true',
        includeSeller: 'true'
      };
      
      const response = await axiosInstance.get(`/api/gigs/${id}`, { params });
      
      return {
        success: true,
        data: response.data || response.gig,
        gig: response.data || response.gig,
        ...response
      };
      
    } catch (error) {
      if (error.status === 500 || error.code === 'SERVER_ERROR') {
        return {
          success: false,
          data: {
            _id: id,
            title: 'Gig Unavailable',
            description: 'This gig is currently unavailable due to server issues.',
            status: 'unavailable',
            budget: 0,
            currency: 'USD',
            isFallback: true
          },
          gig: {
            _id: id,
            title: 'Gig Unavailable',
            description: 'This gig is currently unavailable due to server issues.',
            status: 'unavailable',
            budget: 0,
            currency: 'USD',
            isFallback: true
          },
          isFallback: true,
          error: error.message
        };
      }
      
      if (error.status === 404) {
        throw {
          success: false,
          message: 'Gig not found',
          code: 'GIG_NOT_FOUND',
          status: 404
        };
      }
      
      throw error;
    }
  },
  
  getBySubcategory: async (subcategoryId, params = {}) => {
    try {
      const defaultParams = {
        page: 1,
        limit: 12,
        sort: 'createdAt',
        order: 'desc',
        status: 'open',
        populate: true,
        includeCategory: true,
        includeSubcategory: true,
        includeClient: true
      };
      
      const cleanedParams = cleanParams({
        ...defaultParams,
        ...params
      });
      
      const response = await axiosInstance.get(`/api/gigs/subcategory/${subcategoryId}`, {
        params: cleanedParams
      });
      
      return {
        success: true,
        data: response.data || [],
        subcategory: response.subcategory,
        pagination: response.pagination || {
          page: parseInt(cleanedParams.page) || 1,
          limit: parseInt(cleanedParams.limit) || 12,
          total: response.total || 0,
          totalPages: Math.ceil((response.total || 0) / (parseInt(cleanedParams.limit) || 12))
        },
        ...response
      };
      
    } catch (error) {
      if (error.code === 'SERVER_ERROR' || error.status === 500) {
        return {
          success: false,
          data: [],
          subcategory: null,
          pagination: {
            page: params.page || 1,
            limit: params.limit || 12,
            total: 0,
            totalPages: 0
          },
          isFallback: true,
          error: error.message
        };
      }
      
      throw error;
    }
  },
  
  uploadImages: async (gigId, files) => {
    try {
      const formData = new FormData();
      
      if (Array.isArray(files)) {
        files.forEach(file => {
          formData.append('images', file);
        });
      } else if (files) {
        formData.append('images', files);
      }
      
      const response = await axiosInstance.post(`/api/gigs/${gigId}/images/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload images');
    }
  },
  
  removeImage: async (gigId, publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const response = await axiosInstance.delete(`/api/gigs/${gigId}/images/${encodedId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove image');
    }
  },
  
  setThumbnail: async (gigId, publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const response = await axiosInstance.put(`/api/gigs/${gigId}/thumbnail/${encodedId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set thumbnail');
    }
  },
  
  uploadThumbnail: async (gigId, file) => {
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      const response = await axiosInstance.post(`/api/gigs/${gigId}/thumbnail/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload thumbnail');
    }
  },

  create: async (formData) => {
    try {
      const config = {
        headers: {},
        timeout: 60000
      };
      
      if (formData instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      
      const response = await axiosInstance.post('/api/gigs', formData, config);
      
      return {
        success: true,
        data: response.data,
        message: response.message || 'Gig created successfully',
        ...response
      };
      
    } catch (error) {
      if (error.status === 400) {
        throw {
          message: error.message || 'Validation failed',
          errors: error.errors,
          code: error.code || 'VALIDATION_ERROR',
          status: 400
        };
      }
      
      if (error.status === 401) {
        throw {
          message: 'Please sign in to create a gig',
          code: 'AUTH_REQUIRED',
          status: 401
        };
      }
      
      throw error;
    }
  },
  
  update: async (id, gigData) => {
    try {
      const config = {
        headers: {}
      };
      
      if (gigData instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      
      const response = await axiosInstance.put(`/api/gigs/${id}`, gigData, config);
      
      // Ensure subcategory and category are populated
      if (response.data && response.data.data) {
        const populatedResponse = await axiosInstance.get(`/api/gigs/${id}`, {
          params: {
            includeSubcategory: true,
            includeCategory: true,
            populate: true
          }
        });
        
        return {
          success: true,
          data: populatedResponse.data?.data || populatedResponse.data,
          message: response.message || 'Gig updated successfully',
          ...populatedResponse
        };
      }
      
      return response;
    } catch (error) {
      if (error.status === 409) {
        throw {
          message: 'This gig was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          status: 409,
          currentVersion: error.currentVersion
        };
      }
      
      if (error.status === 400) {
        throw {
          message: error.message || 'Validation failed',
          errors: error.errors,
          code: error.code || 'VALIDATION_ERROR',
          status: 400
        };
      }
      
      if (error.status === 401) {
        throw {
          message: 'Please sign in to update this gig',
          code: 'AUTH_REQUIRED',
          status: 401
        };
      }
      
      throw error;
    }
  },
  
  delete: async (id, options = {}) => {
    try {
      console.log('[GIGS API] Deleting gig with ID:', id);
      console.log('[GIGS API] Delete options:', options);
      
      let gigId;
      
      if (typeof id === 'object') {
        if (id._id) {
          gigId = id._id;
        } else if (id.id) {
          gigId = id.id;
        } else {
          gigId = JSON.stringify(id);
        }
        console.log('[GIGS API] Converted object ID to string:', gigId);
      } else {
        gigId = String(id).trim();
      }
      
      if (!gigId || gigId === 'undefined' || gigId === 'null' || gigId === '[object Object]') {
        console.error('[GIGS API] Invalid ID after processing:', gigId);
        throw {
          success: false,
          message: 'Invalid gig ID',
          code: 'INVALID_ID',
          status: 400
        };
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Use the regular gigs endpoint (cookies handle auth)
      const response = await axiosInstance.delete(`/api/gigs/${gigId}`, {
        params: options,
        ...config
      });
      
      return response;
      
    } catch (error) {
      console.error('[GIGS API] Delete error:', error);
      throw error;
    }
  },
  
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/gigs/stats');
      return response;
      
    } catch (error) {
      return {
        success: false,
        data: {
          overview: [{
            totalGigs: 0,
            openGigs: 0,
            inProgressGigs: 0,
            completedGigs: 0,
            cancelledGigs: 0,
            totalBudget: 0,
            avgBudget: 0
          }]
        },
        isFallback: true
      };
    }
  },
  
  restore: async (id) => {
    try {
      const response = await axiosInstance.patch(`/api/gigs/${id}/restore`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  // Search gigs
  search: async (params = {}) => {
    try {
      const cleanedParams = cleanParams(params);
      const response = await axiosInstance.get('/api/gigs/search', {
        params: cleanedParams
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Export axios instance for other services
export { axiosInstance };