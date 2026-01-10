// api/categories.js
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
    
    if (config.method === 'get' && config.cacheBust !== false) {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
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
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }
    
    if (!error.response) {
      throw new Error('Cannot connect to server. Please check if the server is running.');
    }
    
    return Promise.reject(error);
  }
);

// Validation schema
const CategorySchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Invalid characters in category name'),
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  parentCategory: z.string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid category ID')
    .optional()
    .nullable(),
});

export const categoriesAPI = {
  /**
   * Get all categories - REAL DATA ONLY
   */
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/categories', { params });
      
      let categories = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          categories = response.data.data;
        } else if (Array.isArray(response.data)) {
          categories = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categories = response.data.data;
        }
      }
      
      return categories.map(category => ({
        _id: category._id || category.id,
        name: category.name || '',
        description: category.description || '',
        slug: category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-') : ''),
        parentCategory: category.parentCategory || null,
        level: category.level || 0,
        children: category.children || category.subcategories || [],
        createdAt: category.createdAt || '',
        updatedAt: category.updatedAt || '',
        isActive: category.isActive !== false,
        servicesCount: category.servicesCount || 0,
        gigsCount: category.gigsCount || 0
      }));
      
    } catch (error) {
      console.error('Categories API getAll error:', error.message);
      
      throw error;
    }
  },
  
  /**
   * Get parent categories with subcategories
   */
  getParentCategories: async () => {
    try {
      const response = await axiosInstance.get('/api/categories', {
        params: {
          parentCategory: null,
          level: 0,
          includeSubcategories: true,
          limit: 50,
          _: Date.now()
        }
      });
      
      let categories = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          categories = response.data.data;
        } else if (Array.isArray(response.data)) {
          categories = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categories = response.data.data;
        }
      }
      
      return categories.map(category => {
        const children = category.children || category.subcategories || [];
        
        return {
          _id: category._id || category.id,
          name: category.name || '',
          description: category.description || '',
          slug: category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-') : ''),
          parentCategory: category.parentCategory || null,
          children: children.map(child => ({
            _id: child._id || child.id,
            name: child.name || '',
            slug: child.slug || (child.name ? child.name.toLowerCase().replace(/\s+/g, '-') : ''),
            parentCategory: category._id || category.id
          })),
          level: category.level || 0,
          createdAt: category.createdAt || '',
          updatedAt: category.updatedAt || '',
          isActive: category.isActive !== false
        };
      });
      
    } catch (error) {
      console.error('Get parent categories error:', error.message);
      
      throw error;
    }
  },
  
  /**
   * Get category by ID
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/api/categories/${id}`);
      
      let category;
      if (response.data.success && response.data.data) {
        category = response.data.data;
      } else {
        category = response.data;
      }
      
      return category;
      
    } catch (error) {
      console.error('Get category by ID error:', error);
      
      throw error;
    }
  },
  
  /**
   * Create a new category (admin only)
   */
  create: async (categoryData) => {
    try {
      const validatedData = CategorySchema.parse(categoryData);
      
      const sanitizedData = {
        ...validatedData,
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || '',
      };
      
      const response = await axiosInstance.post('/api/categories', sanitizedData);
      
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid server response');
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
   * Update category (admin only)
   */
  update: async (id, updateData) => {
    try {
      const response = await axiosInstance.put(`/api/categories/${id}`, updateData);
      return response.data.category || response.data;
    } catch (error) {
      console.error('Update category error:', error);
      throw error;
    }
  },
  
  /**
   * Delete category (admin only)
   */
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/api/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete category error:', error);
      throw error;
    }
  },
  
  /**
   * Search categories by name
   */
  search: async (query) => {
    try {
      const response = await axiosInstance.get(`/api/categories/search?q=${encodeURIComponent(query)}`);
      return response.data.categories || response.data.data || [];
    } catch (error) {
      console.error('Search categories error:', error);
      throw error;
    }
  },
  
  /**
   * Get categories with statistics
   */
  withStats: async () => {
    try {
      const response = await axiosInstance.get('/api/categories/stats');
      return response.data.categories || response.data.data || [];
    } catch (error) {
      console.error('Get categories with stats error:', error);
      throw error;
    }
  },
  
  /**
   * Get popular categories
   */
  getPopular: async () => {
    try {
      const response = await axiosInstance.get('/api/categories', {
        params: {
          popular: true,
          isActive: true,
          limit: 10
        }
      });
      
      let categories = [];
      if (response.data.success && Array.isArray(response.data.data)) {
        categories = response.data.data;
      } else if (Array.isArray(response.data)) {
        categories = response.data;
      }
      
      return categories;
    } catch (error) {
      console.error('Get popular categories error:', error);
      throw error;
    }
  },
};