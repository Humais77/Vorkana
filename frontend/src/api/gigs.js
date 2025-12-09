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

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  // Don't set Content-Type header here - it will be set automatically for FormData
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
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = Math.random().toString(36).substring(7);
    
    // Don't set Content-Type for FormData - let browser set it automatically
    if (config.data instanceof FormData) {
      // Browser will set the correct Content-Type with boundary
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // Extract data from response
    return response.data;
  },
  (error) => {
    // Handle network errors
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
    
    // Handle specific error codes
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    // Create a formatted error object
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
  // Get all gigs with query parameters
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/gigs', {
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          sort: params.sort || 'createdAt',
          order: params.order || 'desc',
          search: params.search,
          category: params.category,
          minBudget: params.minBudget,
          maxBudget: params.maxBudget,
          status: params.status,
          urgency: params.urgency,
          createdBy: params.createdBy,
          assignedTo: params.assignedTo,
          fields: params.fields,
          populate: params.populate || true,
          includeClient: params.includeClient || true,
          includeCategory: params.includeCategory || true,
          showAll: params.showAll || false,
          lean: params.lean || true,
          ...params
        },
        paramsSerializer: {
          indexes: null // Don't serialize arrays with indexes
        }
      });
      
      // Normalize response structure
      return {
        success: true,
        data: response.data?.data || response.data || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        },
        metadata: response.data?.metadata,
        ...response
      };
    } catch (error) {
      console.error('Error fetching gigs:', error);
      throw error;
    }
  },
  
  // Get popular gigs
  getPopular: async () => {
    try {
      const response = await axiosInstance.get('/api/gigs', {
        params: {
          page: 1,
          limit: 8,
          sort: 'budget',
          order: 'desc',
          status: 'open',
          urgency: 'high',
          fields: 'title,slug,budget,description,createdBy,category,urgency,createdAt',
          populate: true,
          includeClient: true,
          includeCategory: true
        }
      });
      
      return {
        success: true,
        data: response.data?.data || response.data || [],
        ...response
      };
    } catch (error) {
      console.error('Error fetching popular gigs:', error);
      throw error;
    }
  },
  
  // Get gig by ID or slug
  getById: async (id) => {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid gig ID');
      }
      
      const response = await axiosInstance.get(`/api/gigs/${id}`, {
        params: {
          populate: true,
          incrementView: true
        }
      });
      
      // Normalize response
      const gigData = response.gig || response.data || response;
      
      return {
        success: true,
        gig: gigData,
        ...response
      };
    } catch (error) {
      console.error(`Error fetching gig ${id}:`, error);
      
      // Return a proper error structure
      if (error.response?.status === 404) {
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
  // Create a new gig
create: async (gigData) => {
  try {
    // Check if gigData is FormData
    const isFormData = gigData instanceof FormData;
    
    let formData;
    
    if (isFormData) {
      // If it's already FormData, use it directly
      formData = gigData;
    } else {
      // Otherwise create FormData and append data
      formData = new FormData();
      
      // Append all form data
      Object.keys(gigData).forEach(key => {
        if (gigData[key] !== null && gigData[key] !== undefined && gigData[key] !== '') {
          if (key === 'attachments' && Array.isArray(gigData[key])) {
            // Handle file attachments
            gigData[key].forEach((file, index) => {
              if (file instanceof File) {
                formData.append('attachments', file);
              } else if (typeof file === 'string') {
                formData.append(`attachments[${index}]`, file);
              }
            });
          } else if (key === 'budget' || key === 'price') {
            // Ensure numbers are properly formatted
            formData.append(key, parseFloat(gigData[key]) || gigData[key]);
          } else if (key === 'skillsRequired' && Array.isArray(gigData[key])) {
            // Handle skills array properly
            gigData[key].forEach((skill, index) => {
              formData.append(`skillsRequired[${index}]`, skill);
            });
          } else if (typeof gigData[key] === 'object') {
            // Stringify objects
            formData.append(key, JSON.stringify(gigData[key]));
          } else {
            formData.append(key, gigData[key]);
          }
        }
      });
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('=== SENDING FORM DATA ===');
      if (isFormData) {
        // Log FormData entries
        for (let [key, value] of formData.entries()) {
          console.log(`${key}: ${value instanceof File ? `${value.name} (${value.type})` : value}`);
        }
      } else {
        console.log('Creating gig with data:', gigData);
      }
    }
    
    const response = await axiosInstance.post('/api/gigs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for file uploads
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentComplete = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentComplete}%`);
        }
      }
    });
    
    // Normalize response
    const createdGig = response.gig || response.data || response;
    
    return {
      success: true,
      gig: createdGig,
      message: response.message || 'Gig created successfully',
      ...response
    };
  } catch (error) {
    console.error('Error creating gig:', error);
    console.error('Error details:', error.response?.data);
    
    // Handle validation errors
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      throw {
        message: errorData.message || 'Validation failed',
        errors: errorData.errors,
        code: errorData.code || 'VALIDATION_ERROR',
        status: 400
      };
    }
    
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw {
        message: 'Authentication required. Please sign in.',
        code: 'AUTH_REQUIRED',
        status: error.response.status
      };
    }
    
    throw error;
  }
},
  
  // Update an existing gig
  update: async (id, gigData) => {
    try {
      let dataToSend = gigData;
      
      // Check if we have files to upload
      const hasFiles = gigData.attachments && 
                       Array.isArray(gigData.attachments) && 
                       gigData.attachments.some(f => f instanceof File);
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        
        Object.keys(gigData).forEach(key => {
          if (gigData[key] !== null && gigData[key] !== undefined) {
            if (key === 'attachments') {
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
      
      const config = hasFiles ? {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      } : {};
      
      const response = await axiosInstance.put(`/api/gigs/${id}`, dataToSend, config);
      
      return {
        success: true,
        gig: response.gig || response.data || response,
        message: response.message || 'Gig updated successfully',
        ...response
      };
    } catch (error) {
      console.error(`Error updating gig ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a gig
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/api/gigs/${id}`);
      
      return {
        success: true,
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
        proposal: response.proposal || response.data,
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
        stats: response.stats || response.data,
        ...response
      };
    } catch (error) {
      console.error('Error fetching gig stats:', error);
      throw error;
    }
  },
  
  // Search gigs
  search: async (searchParams) => {
    try {
      const response = await axiosInstance.get('/api/gigs/search', {
        params: searchParams
      });
      
      return {
        success: true,
        data: response.data?.data || response.data || [],
        pagination: response.data?.pagination,
        query: searchParams.query,
        ...response
      };
    } catch (error) {
      console.error('Error searching gigs:', error);
      throw error;
    }
  },
  
  // Get similar gigs
  getSimilar: async (gigId) => {
    try {
      const response = await axiosInstance.get(`/api/gigs/similar/${gigId}`);
      
      return {
        success: true,
        data: response.data?.data || response.data || [],
        ...response
      };
    } catch (error) {
      console.error(`Error fetching similar gigs for ${gigId}:`, error);
      throw error;
    }
  },
  
  // Export gigs
  exportGigs: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/gigs/export', {
        params,
        responseType: params.format === 'csv' ? 'blob' : 'json'
      });
      
      if (params.format === 'csv') {
        // Handle CSV download
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `gigs_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Export started' };
      }
      
      return {
        success: true,
        data: response.data || response,
        ...response
      };
    } catch (error) {
      console.error('Error exporting gigs:', error);
      throw error;
    }
  }
};