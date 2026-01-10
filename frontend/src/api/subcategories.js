// api/subcategories.js
import axios from 'axios';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for cookie-based auth
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (originalRequest.url.includes('/api/auth')) {
        return Promise.reject(error);
      }
      
      try {
        await axiosInstance.post('/api/auth/refresh', {}, {
          withCredentials: true
        });
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userInfo');
        }
        
        if (!window.location.pathname.includes('/signin') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/signin';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('userInfo');
    }
    
    return Promise.reject(error);
  }
);

// Validation Schema
const SubcategorySchema = z.object({
  name: z.string()
    .min(2, 'Subcategory name must be at least 2 characters')
    .max(50, 'Subcategory name cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Invalid characters in subcategory name'),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  category: z.string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid category ID')
    .nonempty('Category is required'),
  order: z.number()
    .min(0, 'Order cannot be negative')
    .max(1000, 'Order cannot exceed 1000')
    .optional()
    .default(0),
  icon: z.string()
    .max(50, 'Icon name too long')
    .optional()
    .default('📁'),
});

// Main API object
export const subcategoriesAPI = {
  /**
   * Get all subcategories - REAL DATA ONLY
   */
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/subcategories', { 
        params: {
          ...params,
          _t: Date.now()
        }
      });
      
      let subcategories = [];
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        subcategories = response.data.data;
      } else if (Array.isArray(response.data)) {
        subcategories = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        subcategories = response.data.data;
      }
      
      return subcategories;
      
    } catch (error) {
      console.error('Get subcategories error:', error);
      
      throw error;
    }
  },
  
  /**
   * Get subcategory by ID
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/api/subcategories/${id}`);
      
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data;
      
    } catch (error) {
      console.error('Get subcategory by ID error:', error);
      throw error;
    }
  },
  
  /**
   * Get subcategories by category ID or slug
   */
  getByCategory: async (categoryIdentifier, params = {}) => {
    try {
      if (!categoryIdentifier || typeof categoryIdentifier !== 'string' || categoryIdentifier.trim() === '') {
        throw new Error('Invalid category identifier');
      }

      const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryIdentifier);
      
      let url;
      if (isObjectId) {
        url = `/api/subcategories/category/${categoryIdentifier}`;
      } else {
        url = `/api/subcategories/category-by-slug/${categoryIdentifier}`;
      }
      
      const response = await axiosInstance.get(url, { 
        params: {
          activeOnly: true,
          ...params
        }
      });
      
      if (response.data?.success) {
        return {
          subcategories: response.data.data || [],
          category: response.data.category,
          count: response.data.count || 0
        };
      }
      
      return {
        subcategories: response.data || [],
        category: null,
        count: response.data?.length || 0
      };
      
    } catch (error) {
      console.error('Get subcategories by category error:', error);
      
      // Return empty data instead of throwing
      return {
        subcategories: [],
        category: null,
        count: 0,
        error: error.message
      };
    }
  },
  
  getByIdOrSlug: async (identifier) => {
    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
      
      let url;
      if (isObjectId) {
        url = `/api/subcategories/${identifier}`;
      } else {
        url = `/api/subcategories/slug/${identifier}`;
      }
      
      const response = await axiosInstance.get(url);
      
      if (response.data?.success) {
        return response.data.data;
      }
      return response.data;
      
    } catch (error) {
      console.error('Get subcategory by ID or slug error:', error);
      
      // Try to fetch all and filter if slug endpoint doesn't exist
      if (error.response?.status === 404 && !/^[0-9a-fA-F]{24}$/.test(identifier)) {
        try {
          const allResponse = await axiosInstance.get('/api/subcategories', {
            params: { activeOnly: true, limit: 100 }
          });
          
          let subcategories = [];
          if (allResponse.data?.success && Array.isArray(allResponse.data.data)) {
            subcategories = allResponse.data.data;
          } else if (Array.isArray(allResponse.data)) {
            subcategories = allResponse.data;
          }
          
          const foundSubcategory = subcategories.find(sub => 
            sub.slug === identifier || 
            sub.name.toLowerCase().replace(/\s+/g, '-') === identifier
          );
          
          if (foundSubcategory) {
            return foundSubcategory;
          }
        } catch (fallbackError) {
          console.error('Fallback search error:', fallbackError);
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Create subcategory (admin only)
   */
  create: async (subcategoryData) => {
    try {
      const validatedData = SubcategorySchema.parse(subcategoryData);
      
      const response = await axiosInstance.post('/api/subcategories', validatedData);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to create subcategory');
      }
      
      return response.data;
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw { 
          type: 'VALIDATION_ERROR', 
          errors: validationErrors 
        };
      }
      throw error;
    }
  },
  
  /**
   * Update subcategory (admin only)
   */
  update: async (id, updateData) => {
    try {
      const response = await axiosInstance.put(`/api/subcategories/${id}`, updateData);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update subcategory');
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Update subcategory error:', error);
      throw error;
    }
  },
  
  /**
   * Delete subcategory (admin only)
   */
  delete: async (id, force = false) => {
    try {
      const response = await axiosInstance.delete(`/api/subcategories/${id}`, {
        params: { force }
      });
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to delete subcategory');
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Delete subcategory error:', error);
      throw error;
    }
  },
  
  /**
   * Restore deleted subcategory (admin only)
   */
  restore: async (id) => {
    try {
      const response = await axiosInstance.patch(`/api/subcategories/${id}/restore`);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to restore subcategory');
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Restore subcategory error:', error);
      throw error;
    }
  },
  
  /**
   * Search subcategories
   */
  search: async (query, params = {}) => {
    try {
      const response = await axiosInstance.get('/api/subcategories', {
        params: {
          search: query,
          limit: 20,
          ...params
        }
      });
      
      if (response.data?.success) {
        return response.data.data || [];
      }
      return response.data || [];
      
    } catch (error) {
      console.error('Search subcategories error:', error);
      throw error;
    }
  },
  
  /**
   * Bulk operations (admin only)
   */
  bulk: async (operation, ids, data = {}) => {
    try {
      const response = await axiosInstance.post('/api/subcategories/bulk', {
        ids,
        operation,
        data
      });
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Bulk operation failed');
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      throw error;
    }
  }
};