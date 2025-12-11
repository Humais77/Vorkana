// api/services.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request:', config.method, config.url, config.data);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    
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
  /**
   * Get all services (public)
   */
  getAll: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Get all services error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch services');
    }
  },
  
  /**
   * Get seller's services
   */
  getMyServices: async (filters = {}) => {
    try {
      // Clean filters
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== 'undefined' && filters[key] !== '') {
          cleanFilters[key] = filters[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanFilters).toString();
      console.log('Fetching services with filters:', cleanFilters);
      
      const response = await axiosInstance.get(`/api/services/seller/my-services${queryString ? '?' + queryString : ''}`);
      
      console.log('My services response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data || [],
          pagination: response.data.pagination || null
        };
      }
      
      return response.data || { success: false, data: [] };
      
    } catch (error) {
      console.error('Get my services error:', error);
      
      let errorMessage = 'Failed to fetch your services';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Please login to view your services';
        } else if (error.response.status === 403) {
          errorMessage = 'Only sellers can view services';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  /**
   * Get service by ID or slug
   */
  getById: async (identifier) => {
    try {
      const response = await axiosInstance.get(`/api/services/${identifier}`);
      
      console.log('Service by ID response:', response.data);
      
      if (response.data && response.data.success) {
        return response.data.service || response.data.data;
      }
      
      throw new Error('Service not found');
      
    } catch (error) {
      console.error('Get service by ID error:', error);
      
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
  
  /**
   * Create a new service
   */
  create: async (serviceData, files = null) => {
    try {
      console.log('Creating service with data:', serviceData);
      console.log('Files:', files);
      
      let response;
      
      if (files && files.length > 0) {
        // Use FormData for file upload
        const formData = new FormData();
        
        // Append service data as JSON string
        formData.append('data', JSON.stringify(serviceData));
        
        // Append files
        files.forEach((file) => {
          formData.append('images', file);
        });
        
        response = await axiosInstance.post('/api/services', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON request without files
        console.log('Creating service via JSON:', serviceData);
        response = await axiosInstance.post('/api/services', serviceData);
      }
      
      console.log('Create service response:', response.data);
      
      // Handle response structure
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Service created successfully',
          service: response.data.service || response.data.data
        };
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Create service error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      let errorMessage = 'Failed to create service';
      
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400) {
          if (data.code === 'CATEGORY_NOT_FOUND') {
            errorMessage = 'Invalid category selected. Please refresh the page and try again.';
          } else if (data.errors) {
            // Validation errors
            const validationErrors = data.errors.map(err => err.message).join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else if (data.message) {
            errorMessage = data.message;
          }
        } else if (status === 401) {
          errorMessage = 'Please login to create a service';
        } else if (status === 403) {
          errorMessage = 'Only sellers can create services';
        } else if (status === 409) {
          errorMessage = 'A service with similar title already exists';
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  /**
   * Update service
   */
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
      console.error('Update service error:', error);
      
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
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  /**
   * Delete service
   */
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
      console.error('Delete service error:', error);
      
      let errorMessage = 'Failed to delete service';
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 403) {
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
  
  /**
   * Restore service
   */
  restore: async (id) => {
    try {
      const response = await axiosInstance.patch(`/api/services/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error('Restore service error:', error);
      throw new Error(error.response?.data?.message || 'Failed to restore service');
    }
  },
  
  /**
   * Search services
   */
  search: async (searchParams) => {
    try {
      const queryString = new URLSearchParams(searchParams).toString();
      const response = await axiosInstance.get(`/api/services/search${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.results || response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Search services error:', error);
      throw new Error(error.response?.data?.message || 'Failed to search services');
    }
  },
  
  /**
   * Get similar services
   */
  getSimilar: async (serviceId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`/api/services/similar/${serviceId}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.services || response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Get similar services error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get similar services');
    }
  },
  
  /**
   * Like/Unlike service
   */
  toggleLike: async (serviceId, action = 'toggle') => {
    try {
      const response = await axiosInstance.post(`/api/services/${serviceId}/like`, { action });
      return response.data;
    } catch (error) {
      console.error('Toggle like error:', error);
      throw new Error(error.response?.data?.message || 'Failed to like service');
    }
  },
  
  /**
   * Get service statistics
   */
  getStats: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services/seller/stats${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get service stats error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch service statistics');
    }
  },
  
  /**
   * Upload service images
   */
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
      console.error('Upload images error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload images');
    }
  },
  
  /**
   * Remove service image
   */
  removeImage: async (serviceId, imageUrl) => {
    try {
      const encodedUrl = encodeURIComponent(imageUrl);
      const response = await axiosInstance.delete(`/api/services/${serviceId}/images/${encodedUrl}`);
      return response.data;
    } catch (error) {
      console.error('Remove image error:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove image');
    }
  },
  
  /**
   * Set service thumbnail
   */
  setThumbnail: async (serviceId, imageUrl) => {
    try {
      const encodedUrl = encodeURIComponent(imageUrl);
      const response = await axiosInstance.put(`/api/services/${serviceId}/thumbnail/${encodedUrl}`);
      return response.data;
    } catch (error) {
      console.error('Set thumbnail error:', error);
      throw new Error(error.response?.data?.message || 'Failed to set thumbnail');
    }
  },
  
  /**
   * Upload new thumbnail
   */
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
      console.error('Upload thumbnail error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload thumbnail');
    }
  },
  
  /**
   * Bulk operations
   */
  bulkOperation: async (ids, operation, data = {}) => {
    try {
      const response = await axiosInstance.post('/api/services/seller/bulk', {
        ids,
        operation,
        data
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      throw new Error(error.response?.data?.message || 'Failed to perform bulk operation');
    }
  },
  
  /**
   * Export services
   */
  export: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services/seller/export${queryString ? '?' + queryString : ''}`, {
        responseType: 'blob'
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Export services error:', error);
      throw new Error(error.response?.data?.message || 'Failed to export services');
    }
  },
  
  /**
   * Increment service views
   */
  incrementViews: async (serviceId) => {
    try {
      const response = await axiosInstance.post(`/api/services/${serviceId}/views`);
      return response.data;
    } catch (error) {
      console.error('Increment views error:', error);
      return null;
    }
  },
  
  /**
   * Get categories
   */
  getCategories: async () => {
    try {
      const response = await axiosInstance.get('/api/categories?isActive=true');
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
    }
  },
};