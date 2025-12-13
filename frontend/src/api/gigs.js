// src/api/gigs.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    config.headers['X-Request-ID'] = Math.random().toString(36).substring(7);
    
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      error.response = {
        data: {
          success: false,
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR'
        },
        status: 0
      };
    }
    
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    const formattedError = {
      ...error,
      message: errorMessage,
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      data: error.response?.data || null
    };
    
    return Promise.reject(formattedError);
  }
);

// Helper function to check if a value should be included in params
const shouldIncludeParam = (key, value) => {
  if (value === undefined || value === null) return false;
  
  // Special handling for boolean false values
  if (typeof value === 'boolean' && value === false && key !== 'showAll') return false;
  
  // Skip empty strings for certain fields
  if (typeof value === 'string' && value.trim() === '') {
    const skipEmptyFields = [
      'projectCategory', 'subcategory', 'urgency', 'currency',
      'visibility', 'paymentStatus', 'disputeStatus'
    ];
    return !skipEmptyFields.includes(key);
  }
  
  return true;
};

// Helper to clean params before sending
const cleanParams = (params) => {
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    if (shouldIncludeParam(key, value)) {
      // Validate ObjectId fields
      if (['projectCategory', 'subcategory', 'createdBy', 'assignedTo'].includes(key)) {
        if (isValidObjectId(value)) {
          cleaned[key] = value;
        }
      }
      // Validate enum fields
      else if (key === 'urgency' && ['low', 'medium', 'high', 'urgent'].includes(value)) {
        cleaned[key] = value;
      }
      else if (key === 'visibility' && ['public', 'private', 'invite_only'].includes(value)) {
        cleaned[key] = value;
      }
      else if (key === 'status' && ['open', 'in_progress', 'assigned', 'completed', 'cancelled', 'closed'].includes(value)) {
        cleaned[key] = value;
      }
      // Include all other valid values
      else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

// Helper function to check if string is a valid ObjectId
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export const gigsAPI = {
  // Get all gigs with query parameters - FIXED VERSION
  getAll: async (params = {}) => {
    try {
      console.log('Original params:', params);
      
      // Set default values for required fields
      const defaultParams = {
        page: 1,
        limit: 12,
        sort: 'createdAt',
        order: 'desc',
        status: 'open',
        populate: true,
        includeCategory: true,
        includeClient: true,
        includeSeller: true,
        lean: true,
        cache: false,
      };
      
      // Merge params with defaults
      const mergedParams = { ...defaultParams, ...params };
      
      // Clean the parameters - remove empty strings and invalid values
      const cleanedParams = cleanParams(mergedParams);
      
      console.log('Cleaned params for backend:', cleanedParams);
      
      const response = await axiosInstance.get('/api/gigs', {
        params: cleanedParams,
        paramsSerializer: {
          indexes: null,
          serialize: (params) => {
            const searchParams = new URLSearchParams();
            
            Object.entries(params).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                  searchParams.append(key, value.join(','));
                } else if (typeof value === 'object' && !(value instanceof Date)) {
                  searchParams.append(key, JSON.stringify(value));
                } else if (value instanceof Date) {
                  searchParams.append(key, value.toISOString());
                } else {
                  searchParams.append(key, value.toString());
                }
              }
            });
            
            return searchParams.toString();
          }
        }
      });
      
      console.log('Backend response structure:', response);
      
      // Ensure consistent response structure
      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination || {
          page: cleanedParams.page || 1,
          limit: cleanedParams.limit || 12,
          total: response.count || 0,
          totalPages: Math.ceil((response.count || 0) / (cleanedParams.limit || 12))
        },
        ...response
      };
      
    } catch (error) {
      console.error('Error fetching gigs:', error);
      
      // If validation error, retry with cleaned params
      if (error.code === 'QUERY_VALIDATION_ERROR' || error.status === 400) {
        console.log('Validation error, retrying with stricter param cleaning...');
        
        // More aggressive cleaning for retry
        const retryParams = { ...params };
        delete retryParams.projectCategory;
        delete retryParams.urgency;
        delete retryParams.currency;
        delete retryParams.visibility;
        
        // Set only safe defaults
        const safeParams = {
          page: retryParams.page || 1,
          limit: retryParams.limit || 12,
          status: 'open',
          sort: 'createdAt',
          order: 'desc'
        };
        
        try {
          const retryResponse = await axiosInstance.get('/api/gigs', { params: safeParams });
          return {
            success: true,
            data: retryResponse.data || [],
            pagination: {
              page: safeParams.page,
              limit: safeParams.limit,
              total: retryResponse.count || 0,
              totalPages: Math.ceil((retryResponse.count || 0) / safeParams.limit)
            },
            wasRetried: true
          };
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  },
  
  // Get gig by ID or slug
  getById: async (id) => {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid gig identifier');
      }
      
      const response = await axiosInstance.get(`/api/gigs/${id}`, {
        params: {
          populate: true,
          includeCategory: true,
          includeClient: true,
          includeSeller: true
        }
      });
      
      return {
        success: true,
        data: response.data,
        gig: response.data,
        requestId: response.requestId,
        ...response
      };
    } catch (error) {
      console.error(`Error fetching gig ${id}:`, error);
      
      if (error.status === 404) {
        throw {
          message: 'Gig not found',
          code: 'GIG_NOT_FOUND',
          status: 404
        };
      }
      throw error;
    }
  },
  
  // Create a new gig
  create: async (gigData) => {
    try {
      const isFormData = gigData instanceof FormData;
      let formData;
      
      if (isFormData) {
        formData = gigData;
      } else {
        formData = new FormData();
        
        Object.keys(gigData).forEach(key => {
          if (gigData[key] !== null && gigData[key] !== undefined && gigData[key] !== '') {
            if (key === 'attachments' && Array.isArray(gigData[key])) {
              gigData[key].forEach((file) => {
                if (file instanceof File) {
                  formData.append('attachments', file);
                }
              });
            } else if (key === 'files' && Array.isArray(gigData[key])) {
              gigData[key].forEach((file) => {
                if (file instanceof File) {
                  formData.append('files', file);
                }
              });
            } else if (key === 'skillsRequired' && Array.isArray(gigData[key])) {
              gigData[key].forEach((skill, index) => {
                formData.append(`skillsRequired[${index}]`, skill);
              });
            } else if (key === 'deliverables' && Array.isArray(gigData[key])) {
              gigData[key].forEach((deliverable, index) => {
                formData.append(`deliverables[${index}]`, deliverable);
              });
            } else if (typeof gigData[key] === 'object') {
              formData.append(key, JSON.stringify(gigData[key]));
            } else {
              // Handle empty subcategory
              if (key === 'subcategory' && !gigData[key]) {
                // Don't append empty subcategory
              } else {
                formData.append(key, gigData[key]);
              }
            }
          }
        });
      }
      
      const response = await axiosInstance.post('/api/gigs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable && progressEvent.total > 0) {
            const percentComplete = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentComplete}%`);
          }
        }
      });
      
      return {
        success: true,
        data: response.data,
        gig: response.data,
        message: response.message || 'Gig created successfully',
        requestId: response.requestId,
        ...response
      };
    } catch (error) {
      console.error('Error creating gig:', error);
      
      if (error.status === 400) {
        throw {
          message: error.data?.message || 'Validation failed',
          errors: error.data?.errors,
          code: error.data?.code || 'VALIDATION_ERROR',
          status: 400
        };
      }
      
      if (error.status === 401 || error.status === 403) {
        throw {
          message: 'Authentication required. Please sign in.',
          code: 'AUTH_REQUIRED',
          status: error.status
        };
      }
      
      throw error;
    }
  },
  
  // Update an existing gig
  update: async (id, gigData) => {
    try {
      let dataToSend = gigData;
      const hasFiles = gigData.attachments && 
                      Array.isArray(gigData.attachments) && 
                      gigData.attachments.some(f => f instanceof File);
      
      if (hasFiles) {
        const formData = new FormData();
        
        Object.keys(gigData).forEach(key => {
          if (gigData[key] !== null && gigData[key] !== undefined) {
            if (key === 'attachments') {
              gigData[key].forEach((file) => {
                if (file instanceof File) {
                  formData.append('attachments', file);
                }
              });
            } else if (typeof gigData[key] === 'object' && !Array.isArray(gigData[key])) {
              formData.append(key, JSON.stringify(gigData[key]));
            } else {
              formData.append(key, gigData[key]);
            }
          }
        });
        
        dataToSend = formData;
      }
      
      const config = hasFiles ? {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      } : {};
      
      const response = await axiosInstance.put(`/api/gigs/${id}`, dataToSend, config);
      
      return {
        success: true,
        data: response.data,
        gig: response.data,
        message: response.message || 'Gig updated successfully',
        ...response
      };
    } catch (error) {
      console.error(`Error updating gig ${id}:`, error);
      
      if (error.status === 409) {
        throw {
          message: 'Gig was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          status: 409
        };
      }
      
      throw error;
    }
  },
  
  // Delete a gig
  delete: async (id, options = {}) => {
    try {
      const response = await axiosInstance.delete(`/api/gigs/${id}`, {
        params: {
          permanent: options.permanent || false,
          force: options.force || false
        }
      });
      
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
  
  // Get gig statistics
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/gigs/stats');
      
      return {
        success: true,
        data: response.data,
        stats: response.data,
        ...response
      };
    } catch (error) {
      console.error('Error fetching gig stats:', error);
      
      return {
        success: false,
        data: {
          overview: [{
            totalGigs: 0,
            activeGigs: 0,
            totalOrders: 0,
            totalBudget: 0,
            avgBudget: 0
          }]
        },
        isFallback: true,
        error: error.message
      };
    }
  },
  
  // Search gigs
  search: async (searchParams = {}) => {
    try {
      const response = await axiosInstance.get('/api/gigs/search', {
        params: {
          query: searchParams.query,
          fuzzy: searchParams.fuzzy || 'false',
          threshold: searchParams.threshold || 0.3,
          limit: searchParams.limit || 20,
          ...searchParams
        }
      });
      
      return {
        success: true,
        data: response.data || [],
        query: searchParams.query,
        count: response.count || response.data?.length || 0,
        ...response
      };
    } catch (error) {
      console.error('Error searching gigs:', error);
      throw error;
    }
  },
  
  // Restore gig (admin only)
  restore: async (id) => {
    try {
      const response = await axiosInstance.patch(`/api/gigs/${id}/restore`);
      
      return {
        success: true,
        data: response.data,
        message: response.message || 'Gig restored successfully',
        ...response
      };
    } catch (error) {
      console.error(`Error restoring gig ${id}:`, error);
      throw error;
    }
  },
  
  // Export gigs
  exportGigs: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/gigs/export', {
        params: {
          format: params.format || 'json',
          ...params
        },
        responseType: params.format === 'csv' ? 'blob' : 'json'
      });
      
      if (params.format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `gigs_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return { 
          success: true, 
          message: 'Export started',
          filename: `gigs_export_${Date.now()}.csv`
        };
      }
      
      return {
        success: true,
        data: response.data,
        format: 'json',
        count: response.count,
        ...response
      };
    } catch (error) {
      console.error('Error exporting gigs:', error);
      throw error;
    }
  },
  
  // Get similar gigs
  getSimilar: async (gigId) => {
    try {
      const response = await axiosInstance.get(`/api/gigs/similar/${gigId}`);
      
      return {
        success: true,
        data: response.data || [],
        ...response
      };
    } catch (error) {
      console.error(`Error fetching similar gigs for ${gigId}:`, error);
      throw error;
    }
  }
};