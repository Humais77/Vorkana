import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }
    
    return Promise.reject(error);
  }
);

export const servicesAPI = {
getAll: async (filters = {}) => {
  try {
    // Clean filters - remove undefined/null/empty values
    const cleanFilters = {};
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && 
          filters[key] !== null && 
          filters[key] !== '' && 
          filters[key] !== 'undefined') {
        cleanFilters[key] = filters[key];
      }
    });

    console.log('Fetching services with filters:', cleanFilters);
    
    // Build query string
    const queryString = new URLSearchParams(cleanFilters).toString();
    const url = `/api/services${queryString ? '?' + queryString : ''}`;
    
    console.log('API URL:', url);
    
    const response = await axiosInstance.get(url);
    
    console.log('API Response status:', response.status);
    console.log('API Response data structure:', {
      hasData: !!response.data,
      hasDataData: !!response.data?.data,
      isArray: Array.isArray(response.data?.data),
      dataType: typeof response.data?.data,
      keys: Object.keys(response.data || {})
    });
    
    // Handle response - return the full response object
    if (response.data) {
      // Ensure data is always an array
      let dataArray = [];
      
      if (response.data.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
      } else if (Array.isArray(response.data)) {
        dataArray = response.data;
      }
      
      // Return consistent structure
      return {
        success: true,
        data: dataArray,
        pagination: response.data.pagination || {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: dataArray.length,
          totalPages: Math.ceil(dataArray.length / (filters.limit || 12))
        },
        ...response.data
      };
    }
    
    console.warn('No data in response');
    return {
      success: true,
      data: [],
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 12,
        total: 0,
        totalPages: 0
      }
    };
    
  } catch (error) {
    console.error('Services API getAll error:', error.message);
    console.error('Error response:', error.response?.data);
    
    // Return empty data structure on error
    return {
      success: false,
      data: [],
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 12,
        total: 0,
        totalPages: 0
      },
      error: error.message
    };
  }
},
  
  getMyServices: async (filters = {}) => {
  try {
    const cleanFilters = {};
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== 'undefined' && filters[key] !== '') {
        cleanFilters[key] = filters[key];
      }
    });
    
    const queryString = new URLSearchParams(cleanFilters).toString();
    
    // DEBUG: Log the URL
    console.log('Fetching serivces with filters:',cleanFilters);
    
    const response = await axiosInstance.get(`/api/services/my-services${queryString ? '?' + queryString : ''}`);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data || [],
        pagination: response.data.pagination || null
      };
    }
    
    return response.data || { success: false, data: [] };
    
  } catch (error) {
    console.error('Error fetching my services:', error);
    console.error('Error response:', error.response);
    
    let errorMessage = 'Failed to fetch your services';
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'Please login to view your services';
      } else if (error.response.status === 404) {
        // This indicates route not found
        errorMessage = 'Services endpoint not found. Please contact support.';
      } else {
        errorMessage = error.response.data?.message || errorMessage;
      }
    }
    
    throw new Error(errorMessage);
  }
},
getAllActive: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/services/all-active', { params });
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      return {
        success: false,
        data: [],
        pagination: {}
      };
      
    } catch (error) {
      console.error('Get all active services error:', error);
      return {
        success: false,
        data: [],
        pagination: {},
        error: error.message
      };
    }
  },
  getById: async (identifier) => {
    try {
      const response = await axiosInstance.get(`/api/services/${identifier}`);
      
      if (response.data && response.data.success) {
        return response.data.service || response.data.data;
      }
      
      throw new Error('Service not found');
      
    } catch (error) {
      let errorMessage = 'Failed to fetch service';
      if (error.response) {
        const { status } = error.response;
        if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 400) {
          errorMessage = 'Invalid service ID';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  // In services.js - Add to servicesAPI object
getByCategory: async (categoryIdentifier, params = {}) => {
  try {
    const response = await axiosInstance.get(`/api/services/category/${encodeURIComponent(categoryIdentifier)}`, {
      params: {
        isActive: true,
        status: 'published',
        ...params
      }
    });
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    }
    
    return response.data || [];
    
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch category services');
  }
},
  create: async (serviceData, files = null) => {
    try {
     let response;
    
    if (files && files instanceof FormData) {
      // If files is already FormData (with serviceData appended)
      response = await axiosInstance.post('/api/services', files, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else if (files && files.length > 0) {
      // If separate files array
      const formData = new FormData();
      
      formData.append('data', JSON.stringify(serviceData));
       Object.keys(serviceData).forEach(key => {
        if (serviceData[key] !== undefined && serviceData[key] !== null) {
          formData.append(key, 
            typeof serviceData[key] === 'object' 
              ? JSON.stringify(serviceData[key]) 
              : serviceData[key]
          );
        }
      });
      
      files.forEach((file) => {
        formData.append('images', file);
      });
      
     response = await axiosInstance.post('/api/services', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // No files
      response = await axiosInstance.post('/api/services', serviceData);
    }
    
    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Service created successfully',
        service: response.data.service || response.data.data
      };
    }
    
    return response.data;
      
    } catch (error) {
      let errorMessage = 'Failed to create service';
      
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400) {
          if (data.code === 'CATEGORY_NOT_FOUND') {
            errorMessage = 'Invalid category selected. Please refresh the page and try again.';
          } else if (data.errors) {
            const validationErrors = data.errors.map(err => err.message).join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else if (data.message) {
            errorMessage = data.message;
          }
        } else if (status === 401) {
          errorMessage = 'Please login to create a service';
        } 
        // REMOVE: seller-specific restriction
        // else if (status === 403) {
        //   errorMessage = 'Only sellers can create services';
        // } 
        else if (status === 409) {
          errorMessage = 'A service with similar title already exists';
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  update: async (id, updateData, files = null) => {
    try {
      let response;
      
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(updateData));
        
        files.forEach((file, index) => {
          formData.append('images', file);
        });
        
        response = await axiosInstance.put(`/api/services/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await axiosInstance.put(`/api/services/${id}`, updateData);
      }
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Service updated successfully',
          service: response.data.service || response.data.data
        };
      }
      
      return response.data;
      
    } catch (error) {
      let errorMessage = 'Failed to update service';
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400 && data.errors) {
          const validationErrors = data.errors.map(err => err.message).join(', ');
          errorMessage = `Validation failed: ${validationErrors}`;
        } else if (status === 403) {
          // CHANGE: Update error message to be generic
          errorMessage = 'You can only update your own services';
        } else if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 409) {
          errorMessage = 'Service was modified by another user. Please refresh and try again.';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  delete: async (id, options = {}) => {
    try {
      const queryString = new URLSearchParams(options).toString();
      const response = await axiosInstance.delete(`/api/services/${id}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Service deleted successfully'
        };
      }
      
      return response.data;
      
    } catch (error) {
      let errorMessage = 'Failed to delete service';
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 403) {
          // CHANGE: Update error message
          errorMessage = 'You can only delete your own services';
        } else if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 400) {
          errorMessage = data?.message || 'Cannot delete service with active orders';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  restore: async (id) => {
    try {
      const response = await axiosInstance.patch(`/api/services/${id}/restore`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to restore service');
    }
  },
  
  search: async (searchParams) => {
  try {
    // Ensure query parameter is named correctly
    const params = {};
    
    // Map query to q if needed
    if (searchParams.query) {
      params.q = searchParams.query;
    }
    if (searchParams.q) {
      params.q = searchParams.q;
    }
    
    // Add other parameters
    if (searchParams.category) params.category = searchParams.category;
    if (searchParams.minPrice) params.minPrice = searchParams.minPrice;
    if (searchParams.maxPrice) params.maxPrice = searchParams.maxPrice;
    if (searchParams.sort) params.sort = searchParams.sort;
    if (searchParams.limit) params.limit = searchParams.limit;
    
    const queryString = new URLSearchParams(params).toString();
    
    const response = await axiosInstance.get(`/api/services/search${queryString ? '?' + queryString : ''}`);
    
    // Handle different response structures
    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.results || response.data.data || [],
        pagination: response.data.pagination || {
          total: (response.data.results || response.data.data || []).length
        },
        ...response.data
      };
    }
    
    return {
      success: true,
      data: response.data || [],
      pagination: {
        total: (response.data || []).length
      }
    };
    
  } catch (error) {
    console.error('Search services error:', error);
    console.error('Error details:', error.response?.data);
    
    // Always return a structured response
    return {
      success: false,
      data: [],
      pagination: {
        total: 0
      },
      error: error.message
    };
  }
},
getPopularServices: async (params = {}) => {
    try {
      const cleanParams = {};
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          cleanParams[key] = params[key];
        }
      });

      console.log('Fetching popular services with params:', cleanParams);
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const url = `/api/services/popular${queryString ? '?' + queryString : ''}`;
      
      console.log('Popular services API URL:', url);
      
      const response = await axiosInstance.get(url);
      
      console.log('Popular services response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.services || response.data.data || [],
          count: response.data.count || 0,
          categoryStats: response.data.categoryStats || [],
          ...response.data
        };
      }
      
      return {
        success: true,
        data: [],
        count: 0,
        categoryStats: []
      };
      
    } catch (error) {
      console.error('Popular services API error:', error.message);
      console.error('Error details:', error.response?.data);
      
      // Return empty data on error
      return {
        success: false,
        data: [],
        count: 0,
        categoryStats: [],
        error: error.message
      };
    }
  },
  
  // Add this method for popular services by category
  getPopularServicesByCategory: async (params = {}) => {
  try {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });

    console.log('Fetching popular services by category with params:', cleanParams);
    
    const queryString = new URLSearchParams(cleanParams).toString();
    const url = `/api/services/popular/category${queryString ? '?' + queryString : ''}`;
    
    console.log('Popular services by category API URL:', url);
    
    const response = await axiosInstance.get(url);
    
    console.log('Popular services by category response:', response.data);
    
    // IMPORTANT: Return data in the expected format
    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data || response.data.services || [],
        count: response.data.count || 0,
        ...response.data
      };
    }
    
    // Fallback to getPopularServices if needed
    console.log('Falling back to regular popular services...');
    const popularResponse = await axiosInstance.get(`/api/services/popular${queryString ? '?' + queryString : ''}`);
    
    if (popularResponse.data && popularResponse.data.success) {
      return {
        success: true,
        data: popularResponse.data.services || popularResponse.data.data || [],
        count: popularResponse.data.count || 0,
        ...popularResponse.data
      };
    }
    
    return {
      success: true,
      data: [],
      count: 0
    };
    
  } catch (error) {
    console.error('Popular services by category API error:', error.message);
    console.error('Error details:', error.response?.data);
    
    // Return empty data on error
    return {
      success: false,
      data: [],
      count: 0,
      error: error.message
    };
  }
},
  
  // Add method to toggle popular status (admin only)
  togglePopularStatus: async (serviceId, isPopular) => {
    try {
      const response = await axiosInstance.patch(`/api/services/${serviceId}/popular`, {
        isPopular
      });
      
      return response.data;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update popular status');
    }
  },
  getSimilar: async (serviceId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`/api/services/similar/${serviceId}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.services || response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get similar services');
    }
  },
  
  toggleLike: async (serviceId, action = 'toggle') => {
    try {
      const response = await axiosInstance.post(`/api/services/${serviceId}/like`, { action });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to like service');
    }
  },
  
  getStats: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      // CHANGE: Update endpoint from seller to user
      const response = await axiosInstance.get(`/api/services/admin/stats${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      return {
      success: true,
      data: {
        totalServices: 0,
        activeServices: 0,
        draftServices: 0,
        totalRevenue: 0,
        avgRating: 0
      }
    };
      throw new Error(error.response?.data?.message || 'Failed to fetch service statistics');
    }
  },
  
  uploadImages: async (serviceId, files) => {
  try {
    const formData = new FormData();
    
    if (Array.isArray(files)) {
      files.forEach(file => {
        formData.append('images', file);
      });
    } else if (files) {
      formData.append('images', files);
    }
    
    const response = await axiosInstance.post(`/api/services/${serviceId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
    
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload images');
  }
},
  
  removeImage: async (serviceId, publicId) => {
  try {
    const encodedId = encodeURIComponent(publicId);
    const response = await axiosInstance.delete(`/api/services/${serviceId}/images/${encodedId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to remove image');
  }
},
  
  setThumbnail: async (serviceId, publicId) => {
  try {
    const encodedId = encodeURIComponent(publicId);
    const response = await axiosInstance.put(`/api/services/${serviceId}/thumbnail/${encodedId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to set thumbnail');
  }
},
  
  uploadThumbnail: async (serviceId, file) => {
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      const response = await axiosInstance.post(`/api/services/${serviceId}/thumbnail`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload thumbnail');
    }
  },
  
  bulkOperation: async (ids, operation, data = {}) => {
    try {
      // CHANGE: Update endpoint from seller to user
      const response = await axiosInstance.post('/api/services/admin/bulk', {
        ids,
        operation,
        data
      });
      
      return response.data;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to perform bulk operation');
    }
  },
  
  export: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      // CHANGE: Update endpoint from seller to user
      const response = await axiosInstance.get(`/api/services/admin/export${queryString ? '?' + queryString : ''}`, {
        responseType: 'blob'
      });
      
      return response.data;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export services');
    }
  },
  
  incrementViews: async (serviceId) => {
    try {
      const response = await axiosInstance.post(`/api/services/${serviceId}/views`);
      return response.data;
    } catch (error) {
      return null;
    }
  },
  
  getCategories: async () => {
    try {
      const response = await axiosInstance.get('/api/categories?isActive=true');
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
    }
  },
};