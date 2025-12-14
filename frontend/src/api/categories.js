// api/categories.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _: Date.now() // Cache busting
      };
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
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
    }
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config.url);
      throw new Error('Request timeout. Please check your connection.');
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }
    
    // Network error (CORS, server down, etc.)
    if (!error.response) {
      console.error('Network error:', error.message);
      throw new Error('Cannot connect to server. Please check if the server is running.');
    }
    
    // Handle specific HTTP errors
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export const categoriesAPI = {
  /**
   * Get all categories - SIMPLIFIED VERSION
   */
  getAll: async (params = {}) => {
    try {
      console.log('Fetching categories with params:', params);
      
      const response = await axiosInstance.get('/api/categories', { params });
      
      console.log('API Response:', response.data);
      
      // Handle different response structures
      let categories = [];
      
      if (response.data) {
        // Case 1: New format { success: true, data: [...] }
        if (response.data.success && Array.isArray(response.data.data)) {
          categories = response.data.data;
        }
        // Case 2: Direct array response
        else if (Array.isArray(response.data)) {
          categories = response.data;
        }
        // Case 3: Data property with array
        else if (response.data.data && Array.isArray(response.data.data)) {
          categories = response.data.data;
        }
      }
      
      console.log('Processed categories:', categories.length);
      
      // Transform to consistent structure
      return categories.map(category => ({
        _id: category._id || category.id,
        name: category.name || 'Unnamed Category',
        description: category.description || '',
        icon: category.icon || '📁',
        slug: category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-') : ''),
        parentCategory: category.parentCategory || null,
        level: category.level || 0,
        children: category.children || category.subcategories || [],
        createdAt: category.createdAt || new Date().toISOString(),
        updatedAt: category.updatedAt || new Date().toISOString(),
      }));
      
    } catch (error) {
      console.error('Categories API getAll error:', error.message);
      
      // Return mock data for development
      if (error.message.includes('Network') || error.message.includes('timeout')) {
        console.warn('API unavailable, using mock data for development');
        return getMockCategories(params.parentCategory);
      }
      
      throw error;
    }
  },
  
  /**
   * Get parent categories with subcategories
   */
  getParentCategories: async () => {
    try {
      console.log('Fetching parent categories...');
      
      const response = await axiosInstance.get('/api/categories', {
        params: {
          parentCategory: null,
          level: 0,
          includeSubcategories: true,
          limit: 50,
          _: Date.now() // Cache busting
        }
      });
      
      console.log('Parent categories response:', response.data);
      
      // Handle response
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
      
      console.log('Processed parent categories:', categories.length);
      
      // Transform to ensure consistent structure
      return categories.map(category => {
        // Get subcategories from children or subcategories
        const children = category.children || category.subcategories || [];
        
        return {
          _id: category._id || category.id,
          name: category.name || 'Unnamed Category',
          description: category.description || '',
          icon: category.icon || '📁',
          slug: category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-') : ''),
          parentCategory: category.parentCategory || null,
          children: children.map(child => ({
            _id: child._id || child.id,
            name: child.name || 'Unnamed Subcategory',
            slug: child.slug || (child.name ? child.name.toLowerCase().replace(/\s+/g, '-') : ''),
            icon: child.icon || '📂',
            parentCategory: category._id || category.id
          })),
          level: category.level || 0,
          createdAt: category.createdAt || new Date().toISOString(),
          updatedAt: category.updatedAt || new Date().toISOString(),
        };
      });
      
    } catch (error) {
      console.error('Get parent categories error:', error.message);
      
      // Return mock data for development
      if (error.message.includes('Network') || error.message.includes('timeout')) {
        console.warn('API unavailable, using mock parent categories');
        return getMockParentCategories();
      }
      
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
      
      // Mock data for development
      if (error.message.includes('Network')) {
        console.warn('Using mock category data');
        return getMockCategoryById(id);
      }
      
      throw error;
    }
  },
  
  /**
   * Create a new category (admin only)
   */
  create: async (categoryData) => {
    try {
      const response = await axiosInstance.post('/api/categories', categoryData);
      return response.data.category || response.data;
    } catch (error) {
      console.error('Create category error:', error);
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

// Mock data for development when API is unavailable
const getMockCategories = (parentCategory = null) => {
  const mockCategories = [
    {
      _id: '1',
      name: 'Web Development',
      description: 'Website and web application development',
      icon: 'fa-code',
      slug: 'web-development',
      parentCategory: null,
      children: [
        {
          _id: '1a',
          name: 'Frontend Development',
          slug: 'frontend-development',
          icon: 'fa-browser',
          parentCategory: '1'
        },
        {
          _id: '1b',
          name: 'Backend Development',
          slug: 'backend-development',
          icon: 'fa-server',
          parentCategory: '1'
        }
      ],
      level: 0,
      order: 1,
      featured: true,
      popular: true,
      servicesCount: 150,
      gigsCount: 45,
      isActive: true
    },
    {
      _id: '2',
      name: 'Graphic Design',
      description: 'Logo, banner, and graphic design services',
      icon: 'fa-paint-brush',
      slug: 'graphic-design',
      parentCategory: null,
      children: [
        {
          _id: '2a',
          name: 'Logo Design',
          slug: 'logo-design',
          icon: 'fa-pen-nib',
          parentCategory: '2'
        },
        {
          _id: '2b',
          name: 'UI/UX Design',
          slug: 'ui-ux-design',
          icon: 'fa-palette',
          parentCategory: '2'
        }
      ],
      level: 0,
      order: 2,
      featured: true,
      popular: false,
      servicesCount: 89,
      gigsCount: 23,
      isActive: true
    },
    {
      _id: '3',
      name: 'Digital Marketing',
      description: 'Online marketing and advertising services',
      icon: 'fa-bullhorn',
      slug: 'digital-marketing',
      parentCategory: null,
      children: [
        {
          _id: '3a',
          name: 'Social Media Marketing',
          slug: 'social-media-marketing',
          icon: 'fa-hashtag',
          parentCategory: '3'
        }
      ],
      level: 0,
      order: 3,
      featured: false,
      popular: true,
      servicesCount: 67,
      gigsCount: 18,
      isActive: true
    }
  ];
  
  // Filter by parentCategory if specified
  if (parentCategory === null) {
    return mockCategories.filter(cat => !cat.parentCategory);
  }
  
  return mockCategories;
};

const getMockParentCategories = () => {
  return getMockCategories(null);
};

const getMockCategoryById = (id) => {
  const mockCategories = getMockCategories();
  
  // Find category in parent categories
  let category = mockCategories.find(cat => cat._id === id);
  
  // If not found, check in children
  if (!category) {
    for (const parent of mockCategories) {
      if (parent.children) {
        const child = parent.children.find(child => child._id === id);
        if (child) {
          category = child;
          break;
        }
      }
    }
  }
  
  return category || {
    _id: id,
    name: 'Mock Category',
    description: 'Mock category for development',
    icon: 'fa-folder',
    slug: 'mock-category',
    parentCategory: null,
    children: [],
    isActive: true
  };
};