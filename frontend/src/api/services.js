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
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch services');
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
  
  create: async (serviceData, files = null) => {
  try {
   let response;
    
    if (files && files.length > 0) {
      const formData = new FormData();
      
      formData.append('data', JSON.stringify(serviceData));   // ← this is correct

      files.forEach((file) => {
        formData.append('images', file);                      // ← correct
      });
      
      response = await axiosInstance.post('/api/services', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      // ← this was wrong – you were sending json but backend expects multipart when no files
      // Fix: always send multipart even with no files → backend will parse req.body.data perfectly
      const formData = new FormData();
      formData.append('data', JSON.stringify(serviceData));
      // no images → that's fine

      response = await axiosInstance.post('/api/services', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    
    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Service created successfully',
        service: response.data.service
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
      } else if (status === 413) {
        errorMessage = 'File size too large. Maximum size is 5MB per file.';
      } else if (status === 409) {
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
        errorMessage = 'You can only update your own services';
      } else if (status === 404) {
        errorMessage = 'Service not found';
      } else if (status === 409) {
        errorMessage = 'Service was modified by another user. Please refresh and try again.';
      } else if (status === 413) {
        errorMessage = 'File size too large. Maximum size is 5MB per file.';
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
      const queryString = new URLSearchParams(searchParams).toString();
      const response = await axiosInstance.get(`/api/services/search${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.results || response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search services');
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
      files.forEach(file => {
        formData.append('images', file);
      });
      
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
  
  removeImage: async (serviceId, imageUrl) => {
    try {
      const encodedUrl = encodeURIComponent(imageUrl);
      const response = await axiosInstance.delete(`/api/services/${serviceId}/images/${encodedUrl}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove image');
    }
  },
  
  setThumbnail: async (serviceId, imageUrl) => {
    try {
      const encodedUrl = encodeURIComponent(imageUrl);
      const response = await axiosInstance.put(`/api/services/${serviceId}/thumbnail/${encodedUrl}`);
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
  uploadImage: async (file, type = 'service') => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const endpoint = type === 'thumbnail' ? '/api/uploads/thumbnail' : '/api/uploads/image';
    
    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload image');
  }
},
};