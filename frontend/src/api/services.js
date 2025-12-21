// services.js - Updated for Cloudinary integration
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        data: config.data,
        headers: config.headers
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
    }
    
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
  // ============================================
  // CRUD Operations
  // ============================================
  
  getAll: async (filters = {}) => {
    try {
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== 'undefined' && filters[key] !== '') {
          cleanFilters[key] = filters[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanFilters).toString();
      const response = await axiosInstance.get(`/api/services${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch services';
      console.error('Get all services error:', error.response?.data || error.message);
      throw new Error(message);
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
      
      if (import.meta.env.DEV) {
        console.log('Fetching my services with filters:', cleanFilters);
      }
      
      const response = await axiosInstance.get(`/api/services/my-services${queryString ? '?' + queryString : ''}`);
      
      if (import.meta.env.DEV) {
        console.log('My services response:', response.data);
      }
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data || [],
          pagination: response.data.pagination || null,
          summary: response.data.summary || null
        };
      }
      
      return response.data || { success: false, data: [] };
      
    } catch (error) {
      console.error('Error fetching my services:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to fetch your services';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Please login to view your services';
        } else if (error.response.status === 404) {
          errorMessage = 'Services endpoint not found. Please contact support.';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  getById: async (identifier, options = {}) => {
    try {
      const { incrementView = true } = options;
      const queryString = new URLSearchParams({
        incrementView: incrementView.toString()
      }).toString();
      
      const response = await axiosInstance.get(`/api/services/${identifier}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.service || response.data.data;
      }
      
      throw new Error('Service not found');
      
    } catch (error) {
      let errorMessage = 'Failed to fetch service';
      if (error.response) {
        const { status, data } = error.response;
        if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 400) {
          errorMessage = 'Invalid service ID';
        } else if (status === 403) {
          errorMessage = 'Access to this service is restricted';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  // ============================================
  // Create & Update with File Uploads
  // ============================================
  
  create: async (serviceData, files = null) => {
    try {
      const formData = new FormData();
      
      // Append all service data as JSON string
      formData.append('data', JSON.stringify(serviceData));
      
      // Append files if any
      if (files && Array.isArray(files)) {
        files.forEach((file) => {
          if (file && file instanceof File) {
            formData.append('images', file);
          }
        });
      }
      
      const response = await axiosInstance.post('/api/services', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
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
          } else if (data.code === 'SUBCATEGORY_NOT_FOUND') {
            errorMessage = 'Invalid subcategory selected.';
          } else if (data.errors) {
            const validationErrors = data.errors.map(err => err.message).join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else if (data.message) {
            errorMessage = data.message;
          }
        } else if (status === 401) {
          errorMessage = 'Please login to create a service';
        } else if (status === 409) {
          errorMessage = 'A service with similar title already exists';
        } else if (status === 413) {
          errorMessage = 'File size too large. Maximum 5MB per file.';
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
        
        files.forEach((file) => {
          if (file && file instanceof File) {
            formData.append('images', file);
          }
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
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  // ============================================
  // Delete Operations
  // ============================================
  
  delete: async (id, options = {}) => {
    try {
      const { permanent = false } = options;
      const queryString = new URLSearchParams({
        permanent: permanent.toString()
      }).toString();
      
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
          errorMessage = 'You can only delete your own services';
        } else if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 400) {
          errorMessage = data?.message || 'Cannot delete service';
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
  
  // ============================================
  // Image Management with Cloudinary
  // ============================================
  
  uploadImages: async (serviceId, files) => {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new Error('No files provided');
      }
      
      const formData = new FormData();
      files.forEach(file => {
        if (file && file instanceof File) {
          formData.append('images', file);
        }
      });
      
      const response = await axiosInstance.post(`/api/services/${serviceId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      let errorMessage = 'Failed to upload images';
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400) {
          if (data.code === 'MAX_IMAGES_EXCEEDED') {
            errorMessage = 'Cannot upload more than 10 images per service';
          } else if (data.code === 'NO_IMAGES') {
            errorMessage = 'No images provided';
          } else if (data.code === 'FILE_TOO_LARGE') {
            errorMessage = 'File size too large. Maximum 5MB per file.';
          } else {
            errorMessage = data.message || errorMessage;
          }
        } else if (status === 413) {
          errorMessage = 'Total file size exceeds limit';
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  removeImage: async (serviceId, imageUrl) => {
    try {
      // Cloudinary URLs might have special characters
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
      if (!file || !(file instanceof File)) {
        throw new Error('No thumbnail file provided');
      }
      
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      const response = await axiosInstance.post(`/api/services/${serviceId}/thumbnail`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      let errorMessage = 'Failed to upload thumbnail';
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400) {
          if (data.code === 'FILE_TOO_LARGE') {
            errorMessage = 'Thumbnail size too large. Maximum 2MB.';
          } else if (data.code === 'NO_THUMBNAIL') {
            errorMessage = 'No thumbnail file provided';
          }
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  // ============================================
  // Search & Discovery
  // ============================================
  
  search: async (searchParams) => {
    try {
      const cleanParams = {};
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== undefined && searchParams[key] !== '') {
          cleanParams[key] = searchParams[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanParams).toString();
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
  
  // ============================================
  // Interactions
  // ============================================
  
  toggleLike: async (serviceId, action = 'toggle') => {
    try {
      const response = await axiosInstance.post(`/api/services/${serviceId}/like`, { action });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to like service');
    }
  },
  
  incrementViews: async (serviceId) => {
    try {
      const response = await axiosInstance.post(`/api/services/${serviceId}/views`);
      return response.data;
    } catch (error) {
      console.error('Failed to increment views:', error);
      return null;
    }
  },
  
  // ============================================
  // Categories
  // ============================================
  
  getCategories: async () => {
    try {
      const response = await axiosInstance.get('/api/categories?isActive=true&populate=true');
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
    }
  },
  
  // ============================================
  // Admin Operations
  // ============================================
  
  getServiceStats: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services/admin/stats${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching service stats:', error);
      // Return default stats on error
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
    }
  },
  
  bulkOperation: async (ids, operation, data = {}) => {
    try {
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
      const response = await axiosInstance.get(`/api/services/admin/export${queryString ? '?' + queryString : ''}`, {
        responseType: 'blob'
      });
      
      return response.data;
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export services');
    }
  },
  
  // ============================================
  // Helper Methods
  // ============================================
  
  validateImageFile: (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only images (JPEG, PNG, WebP, GIF, SVG) are allowed.');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit.');
    }
    
    return true;
  },
  
  validateThumbnailFile: (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid thumbnail type. Only JPEG, PNG, and WebP are allowed.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Thumbnail size exceeds 2MB limit.');
    }
    
    return true;
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};