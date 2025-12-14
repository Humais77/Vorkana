// api/gigs.js - UPDATED VERSION

import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'; // Changed to 5000

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Remove custom headers that cause CORS issues
    // config.headers['X-Request-ID'] = Math.random().toString(36).substring(7);
    
    // Handle FormData properly
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Always return data property for consistency
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
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0
      });
    }
    
    // Handle server errors (500)
    if (error.response.status === 500) {
      return Promise.reject({
        success: false,
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: 500,
        data: error.response.data
      });
    }
    
    // Return the error response as-is
    return Promise.reject(error.response.data || {
      success: false,
      message: error.message,
      status: error.response.status
    });
  }
);

// Helper to clean params
const cleanParams = (params) => {
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    // Skip undefined, null, empty strings, and 'undefined' strings
    if (value !== undefined && 
        value !== null && 
        value !== '' && 
        value !== 'undefined' && 
        value !== 'null') {
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        cleaned[key] = value;
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        cleaned[key] = value.filter(v => v && v !== '');
      }
      // Handle objects (excluding dates)
      else if (typeof value === 'object' && !(value instanceof Date)) {
        // Skip complex objects in query params
      }
      // Handle dates
      else if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      }
      // Handle strings and numbers
      else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

export const gigsAPI = {
  // Get all gigs - SIMPLIFIED
  getAll: async (params = {}) => {
    try {
      console.log('Fetching gigs with params:', params);
      
      // Default safe parameters
      const defaultParams = {
        page: 1,
        limit: 12,
        sort: 'createdAt',
        order: 'desc',
        status: 'open',
        populate: true,
        includeCategory: true,
        includeClient: true,
        lean: true
      };
      
      // Clean parameters
      const cleanedParams = cleanParams({
        ...defaultParams,
        ...params
      });
      
      console.log('Cleaned params:', cleanedParams);
      
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
      
      console.log('Gigs response:', response);
      
      // Ensure consistent response format
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
      console.error('Error fetching gigs:', error);
      
      // Return empty data on error
      if (error.code === 'SERVER_ERROR' || error.status === 500) {
        console.warn('Server error, returning empty gigs array');
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
  
  // Get gig by ID - IMPROVED ERROR HANDLING
  getById: async (id) => {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw {
          success: false,
          message: 'Invalid gig identifier',
          code: 'INVALID_ID'
        };
      }
      
      console.log(`Fetching gig ${id}...`);
      
      // Simple parameters to avoid issues
      const params = {
        populate: 'true',
        includeCategory: 'true',
        includeClient: 'true',
        includeSeller: 'true'
      };
      
      const response = await axiosInstance.get(`/api/gigs/${id}`, { params });
      
      console.log(`Gig ${id} response:`, response);
      
      return {
        success: true,
        data: response.data || response.gig,
        gig: response.data || response.gig,
        ...response
      };
      
    } catch (error) {
      console.error(`Error fetching gig ${id}:`, error);
      
      // Handle 500 errors specially
      if (error.status === 500 || error.code === 'SERVER_ERROR') {
        console.warn(`Gig ${id} server error, returning fallback`);
        
        // Return fallback gig data
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
  
  // Create gig - SIMPLIFIED
  create: async (gigData) => {
    try {
      console.log('Creating gig with data:', gigData);
      
      let dataToSend = gigData;
      const isFormData = gigData instanceof FormData;
      
      if (!isFormData) {
        const formData = new FormData();
        
        // Handle regular fields
        Object.keys(gigData).forEach(key => {
          if (gigData[key] !== undefined && gigData[key] !== null && gigData[key] !== '') {
            if (key === 'skillsRequired' && Array.isArray(gigData[key])) {
              gigData[key].forEach((skill, index) => {
                formData.append(`skillsRequired[${index}]`, skill);
              });
            } else if (key === 'deliverables' && Array.isArray(gigData[key])) {
              gigData[key].forEach((deliverable, index) => {
                formData.append(`deliverables[${index}]`, deliverable);
              });
            } else if (key === 'attachments' && Array.isArray(gigData[key])) {
              gigData[key].forEach((file, index) => {
                if (file instanceof File) {
                  formData.append('attachments', file);
                }
              });
            } else if (typeof gigData[key] === 'object') {
              formData.append(key, JSON.stringify(gigData[key]));
            } else {
              formData.append(key, gigData[key]);
            }
          }
        });
        
        dataToSend = formData;
      }
      
      const config = {
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        timeout: 60000
      };
      
      if (dataToSend instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      
      const response = await axiosInstance.post('/api/gigs', dataToSend, config);
      
      return {
        success: true,
        data: response.data,
        message: response.message || 'Gig created successfully',
        ...response
      };
      
    } catch (error) {
      console.error('Error creating gig:', error);
      
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
  
  // Update gig
  update: async (id, gigData) => {
    try {
      console.log(`Updating gig ${id}...`);
      
      const response = await axiosInstance.put(`/api/gigs/${id}`, gigData);
      
      return {
        success: true,
        data: response.data,
        message: response.message || 'Gig updated successfully',
        ...response
      };
      
    } catch (error) {
      console.error(`Error updating gig ${id}:`, error);
      throw error;
    }
  },
  
  // Delete gig
  delete: async (id, options = {}) => {
    try {
      console.log(`Deleting gig ${id}...`);
      
      const params = {};
      if (options.permanent) params.permanent = 'true';
      if (options.force) params.force = 'true';
      
      const response = await axiosInstance.delete(`/api/gigs/${id}`, { params });
      
      return {
        success: true,
        data: response.data,
        message: response.message || 'Gig deleted successfully',
        ...response
      };
      
    } catch (error) {
      console.error(`Error deleting gig ${id}:`, error);
      throw error;
    }
  },
  
  // Get stats - WITH FALLBACK
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/gigs/stats');
      return response;
      
    } catch (error) {
      console.error('Error fetching gig stats:', error);
      
      // Return fallback stats
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
      const response = await axiosInstance.patch(`/api/gigs/${id}/restore`);
      return response;
    } catch (error) {
      console.error(`Error restoring gig ${id}:`, error);
      throw error;
    }
  }
};