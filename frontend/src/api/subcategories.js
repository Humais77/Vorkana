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
});
const getSecureToken = () => {
  // Try secure storage in order of preference
  try {
    // 1. HttpOnly cookie (most secure)
    const httpOnlyToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    
    if (httpOnlyToken) return httpOnlyToken;
    
    // 2. Secure localStorage with encryption in production
    const rawToken = localStorage.getItem('userToken');
    if (rawToken && process.env.NODE_ENV === 'development') {
      return rawToken; // Only in dev
    }
    
    // In production, decrypt or use different storage
    if (rawToken && process.env.NODE_ENV === 'production') {
      // Consider using crypto-js for encryption
      // return decryptToken(rawToken);
      return rawToken; // Temporary - implement encryption
    }
  } catch (error) {
    console.error('Token retrieval error:', error);
    return null;
  }
  return null;
};
// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getSecureToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('userToken');
      window.location.href = '/login';
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
   * Get all subcategories
   */
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/subcategories', { 
        params: {
          ...params,
          _t: Date.now() // Cache busting
        }
      });
      
      // Handle different response structures
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
   * Get subcategories by category ID
   */
getByCategory: async (categoryIdentifier, params = {}) => {
  try {
    if (!categoryIdentifier || typeof categoryIdentifier !== 'string' || categoryIdentifier.trim() === '') {
      throw new Error('Invalid category identifier');
    }

    // Check if it's an ObjectId (24 hex chars) or a slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryIdentifier);
    
    let url;
    if (isObjectId) {
      // It's a MongoDB ObjectId
      url = `/api/subcategories/category/${categoryIdentifier}`;
    } else {
      // It's a slug - use a different endpoint
      url = `/api/subcategories/category-by-slug/${categoryIdentifier}`;
    }
    
    const response = await axiosInstance.get(url, { 
      params: {
        activeOnly: true,
        ...params
      }
    });
    
    // Handle response
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
    
    // Return empty structure instead of throwing
    return {
      subcategories: [],
      category: null,
      count: 0,
      error: error.message
    };
  }
},
  
  /**
   * Create subcategory (admin only)
   */
  create: async (subcategoryData) => {
    try {
      // Validate input
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

// Mock data for development
const getMockSubcategories = (categoryId = null) => {
  const mockSubcategories = [
    {
      _id: '1a',
      name: 'Frontend Development',
      slug: 'frontend-development',
      description: 'React, Vue, Angular development',
      category: '1',
      order: 1,
      servicesCount: 75,
      gigsCount: 20,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '1b',
      name: 'Backend Development',
      slug: 'backend-development',
      description: 'Node.js, Python, PHP backend services',
      category: '1',
      order: 2,
      servicesCount: 65,
      gigsCount: 18,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '2a',
      name: 'Logo Design',
      slug: 'logo-design',
      description: 'Professional logo design services',
      category: '2',
      order: 1,
      servicesCount: 45,
      gigsCount: 12,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  ];
  
  if (categoryId) {
    return mockSubcategories.filter(sub => sub.category === categoryId);
  }
  
  return mockSubcategories;
};

// Export mock functions for testing
export const mockSubcategoriesAPI = {
  getAll: async (params = {}) => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    return getMockSubcategories(params.category);
  },
  
  getByCategory: async (categoryId) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      subcategories: getMockSubcategories(categoryId),
      category: { _id: categoryId, name: 'Mock Category' },
      count: getMockSubcategories(categoryId).length
    };
  }
};