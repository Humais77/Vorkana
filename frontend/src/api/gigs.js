// import axios from 'axios';

// const API_URL = import.meta.env.VITE_BACKEND_URL;

// const axiosInstance = axios.create({
//   baseURL: API_URL,
//   timeout: 30000,
// });

// // Request interceptor for auth token
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('userToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// export const gigsAPI = {
//   getAll: async () => {
//     const response = await axiosInstance.get('/api/gigs');
//     return response.data.gigs || response.data;
//   },
  
//   getPopular: async () => {
//     const response = await axiosInstance.get('/api/gigs/popular');
//     return response.data.gigs || response.data;
//   },
  
//   getById: async (id) => {
//     const response = await axiosInstance.get(`/api/gigs/${id}`);
//     return response.data.gig || response.data;
//   },
  
//   create: async (gigData) => {
//     const response = await axiosInstance.post('/api/gigs', gigData, {
//       headers: {
//         'Content-Type': 'multipart/form-data',
//       },
//     });
//     return response.data.gig || response.data;
//   },
// };
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

export const gigsAPI = {
  // Get all gigs with query parameters - UPDATED
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/gigs', {
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          sort: params.sort || 'createdAt',
          order: params.order || 'desc',
          search: params.search,
          projectCategory: params.projectCategory,
          subcategory: params.subcategory,
          minBudget: params.minBudget,
          maxBudget: params.maxBudget,
          status: params.status,
          urgency: params.urgency,
          visibility: params.visibility,
          paymentStatus: params.paymentStatus,
          disputeStatus: params.disputeStatus,
          createdBy: params.createdBy,
          assignedTo: params.assignedTo,
          hasAttachments: params.hasAttachments,
          hasProposals: params.hasProposals,
          hasMilestones: params.hasMilestones,
          skillsRequired: params.skillsRequired,
          createdAfter: params.createdAfter,
          createdBefore: params.createdBefore,
          deadlineAfter: params.deadlineAfter,
          deadlineBefore: params.deadlineBefore,
          ids: params.ids,
          excludeIds: params.excludeIds,
          fields: params.fields,
          populate: params.populate !== false,
          showAll: params.showAll || false,
          includeCategory: params.includeCategory !== false,
          includeClient: params.includeClient !== false,
          includeSeller: params.includeSeller !== false,
          lean: params.lean !== false,
          cache: params.cache || false,
        },
        paramsSerializer: {
          indexes: null
        }
      });
      
      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        },
        requestId: response.requestId,
        responseTime: response.responseTime,
        ...response
      };
    } catch (error) {
      console.error('Error fetching gigs:', error);
      throw error;
    }
  },
  
  // Get gig by ID or slug - UPDATED
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
  
  // Create a new gig - UPDATED for form data structure
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
              formData.append(key, gigData[key]);
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
  
  // Update an existing gig - UPDATED
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
  
  // Delete a gig - UPDATED with parameters
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
  
  // Submit proposal for a gig
  submitProposal: async (gigId, proposalData) => {
    try {
      const response = await axiosInstance.post(`/api/gigs/${gigId}/proposals`, proposalData);
      
      return {
        success: true,
        data: response.data,
        message: response.message || 'Proposal submitted successfully',
        ...response
      };
    } catch (error) {
      console.error(`Error submitting proposal for gig ${gigId}:`, error);
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
      throw error;
    }
  },
  
  // Search gigs - UPDATED
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
  
  // Restore gig (admin only) - NEW
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
  
  // Export gigs - UPDATED
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