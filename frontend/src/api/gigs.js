// gigs.js - Production-ready with CSRF protection
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// CSRF token management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request ID generator
const generateRequestId = () => {
  return `gig_req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Request interceptor with CSRF handling
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
    // Handle FormData content type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Add CSRF token for non-GET requests
    if (config.method !== 'get' && config.method !== 'GET') {
      // Check if token is expired
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        try {
          await refreshCSRFToken();
        } catch (error) {
          console.warn('Failed to refresh CSRF token:', error.message);
        }
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        // Also add to body for form submissions
        if (config.data && typeof config.data === 'object' && !config.data.csrfToken) {
          config.data.csrfToken = csrfToken;
        }
      }
    }
    
    if (DEBUG) {
      console.log(`📤 Gigs Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Gigs request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Update CSRF token from response
    if (response.data?.csrfToken) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
    }
    
    if (DEBUG) {
      console.log(`📥 Gigs Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error) => {
    // Handle CSRF errors
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('CSRF token invalid, refreshing...');
      
      try {
        // Try to refresh CSRF token
        await refreshCSRFToken();
        
        // Retry original request
        if (error.config) {
          error.config.headers['X-CSRF-Token'] = csrfToken;
          if (error.config.data && typeof error.config.data === 'object') {
            error.config.data.csrfToken = csrfToken;
          }
          return axiosInstance(error.config);
        }
      } catch (refreshError) {
        console.error('CSRF refresh failed:', refreshError);
        // Clear auth and redirect to login
        clearAuthData();
        window.location.href = '/signin?csrf_error=true';
      }
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('userInfo');
      if (window.location.pathname !== '/signin' && 
          window.location.pathname !== '/signup') {
        window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }
    
    return Promise.reject(error);
  }
);

// CSRF token management functions
const setCSRFToken = (token, expiresAt) => {
  csrfToken = token;
  csrfTokenExpiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  
  localStorage.setItem('csrfToken', token);
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry);
};

const refreshCSRFToken = async () => {
  try {
    console.log('Refreshing CSRF token for gigs API...');
    const response = await axiosInstance.get('/api/csrf/token');
    if (response.data.success) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      console.log('CSRF token refreshed successfully');
      return csrfToken;
    }
    throw new Error('Failed to refresh CSRF token');
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error.message);
    throw error;
  }
};

const clearAuthData = () => {
  localStorage.removeItem('userInfo');
  localStorage.removeItem('csrfToken');
  localStorage.removeItem('csrfTokenExpiry');
};

// Helper function to clean parameters
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

// Main gigs API functions
export const gigsAPI = {
  // Get all gigs
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
        data: response.data?.data || response.data || [],
        pagination: response.data?.pagination || {
          page: parseInt(cleanedParams.page) || 1,
          limit: parseInt(cleanedParams.limit) || 12,
          total: response.data?.total || 0,
          totalPages: Math.ceil((response.data?.total || 0) / (parseInt(cleanedParams.limit) || 12))
        },
        ...response.data
      };
      
    } catch (error) {
      console.error('Get all gigs error:', error);
      
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
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to load gigs',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Get gig by ID
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
        data: response.data?.data || response.data,
        gig: response.data?.data || response.data,
        ...response.data
      };
      
    } catch (error) {
      console.error('Get gig by ID error:', error);
      
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
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to load gig',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Get gigs by subcategory
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
        data: response.data?.data || [],
        subcategory: response.data?.subcategory,
        pagination: response.data?.pagination || {
          page: parseInt(cleanedParams.page) || 1,
          limit: parseInt(cleanedParams.limit) || 12,
          total: response.data?.total || 0,
          totalPages: Math.ceil((response.data?.total || 0) / (parseInt(cleanedParams.limit) || 12))
        },
        ...response.data
      };
      
    } catch (error) {
      console.error('Get gigs by subcategory error:', error);
      
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
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to load gigs',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Create gig
  create: async (formData) => {
    try {
      const config = {
        headers: {},
        timeout: 60000
      };
      
      // Handle FormData
      if (formData instanceof FormData) {
        delete config.headers['Content-Type'];
        
        // Add CSRF token to FormData
        if (csrfToken) {
          formData.append('csrfToken', csrfToken);
        }
      } else if (csrfToken) {
        // Add CSRF token to JSON data
        formData.csrfToken = csrfToken;
      }
      
      const response = await axiosInstance.post('/api/gigs', formData, config);
      
      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.message || 'Gig created successfully',
        ...response.data
      };
      
    } catch (error) {
      console.error('Create gig error:', error);
      
      if (error.status === 400) {
        throw {
          message: error.response?.data?.message || 'Validation failed',
          errors: error.response?.data?.errors,
          code: error.response?.data?.code || 'VALIDATION_ERROR',
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
      
      if (error.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to create gig',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Update gig
  update: async (id, gigData) => {
    try {
      const config = {
        headers: {}
      };
      
      // Handle FormData
      if (gigData instanceof FormData) {
        delete config.headers['Content-Type'];
        
        // Add CSRF token to FormData
        if (csrfToken) {
          gigData.append('csrfToken', csrfToken);
        }
      } else if (csrfToken) {
        // Add CSRF token to JSON data
        gigData.csrfToken = csrfToken;
      }
      
      const response = await axiosInstance.put(`/api/gigs/${id}`, gigData, config);
      
      // Ensure subcategory and category are populated
      if (response.data?.data) {
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
          message: response.data?.message || 'Gig updated successfully',
          ...populatedResponse.data
        };
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Update gig error:', error);
      
      if (error.status === 409) {
        throw {
          message: 'This gig was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          status: 409,
          currentVersion: error.response?.data?.currentVersion
        };
      }
      
      if (error.status === 400) {
        throw {
          message: error.response?.data?.message || 'Validation failed',
          errors: error.response?.data?.errors,
          code: error.response?.data?.code || 'VALIDATION_ERROR',
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
      
      if (error.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to update gig',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Delete gig
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
        params: options
      };
      
      // Add CSRF token for delete request
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.delete(`/api/gigs/${gigId}`, config);
      
      return response.data;
      
    } catch (error) {
      console.error('[GIGS API] Delete error:', error);
      
      if (error.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to delete gig',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Search gigs
  search: async (params = {}) => {
    try {
      const cleanedParams = cleanParams(params);
      const response = await axiosInstance.get('/api/gigs/search', {
        params: cleanedParams
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Search gigs error:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to search gigs',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Get gig stats
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/gigs/stats');
      return response.data;
      
    } catch (error) {
      console.error('Get gig stats error:', error);
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
  
  // Restore gig
  restore: async (id) => {
    try {
      const config = {};
      
      // Add CSRF token for restore request
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.patch(`/api/gigs/${id}/restore`, config);
      return response.data;
      
    } catch (error) {
      console.error('Restore gig error:', error);
      
      if (error.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to restore gig',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Image management
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
      
      // Add CSRF token
      if (csrfToken) {
        formData.append('csrfToken', csrfToken);
      }
      
      const response = await axiosInstance.post(`/api/gigs/${gigId}/images/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Upload images error:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload images',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  removeImage: async (gigId, publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const config = {};
      
      // Add CSRF token
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.delete(`/api/gigs/${gigId}/images/${encodedId}`, config);
      return response.data;
      
    } catch (error) {
      console.error('Remove image error:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to remove image',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  setThumbnail: async (gigId, publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const config = {};
      
      // Add CSRF token
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.put(`/api/gigs/${gigId}/thumbnail/${encodedId}`, config);
      return response.data;
      
    } catch (error) {
      console.error('Set thumbnail error:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to set thumbnail',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  uploadThumbnail: async (gigId, file) => {
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      // Add CSRF token
      if (csrfToken) {
        formData.append('csrfToken', csrfToken);
      }
      
      const response = await axiosInstance.post(`/api/gigs/${gigId}/thumbnail/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Upload thumbnail error:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload thumbnail',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // Export gigs
  exportGigs: async (params = {}) => {
    try {
      const cleanedParams = cleanParams(params);
      const response = await axiosInstance.get('/api/gigs/export', {
        params: cleanedParams,
        responseType: 'blob'
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Export gigs error:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to export gigs',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },
  
  // CSRF token management
  getCSRFToken: async () => {
    try {
      const response = await axiosInstance.get('/api/csrf/token');
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  },
  
  refreshCSRFToken: async () => {
    return refreshCSRFToken();
  },
  
  hasValidCSRFToken: () => {
    return csrfToken && Date.now() < parseInt(csrfTokenExpiry);
  },
  
  clearAuthData: clearAuthData
};

// Export axios instance for other services
export { axiosInstance };