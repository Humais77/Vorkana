import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

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
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }
    
    return Promise.reject(error);
  }
);

export const categoriesAPI = {
  /**
   * Get all categories
   * @returns {Promise<Array>} Array of categories
   */
  getAll: async () => {
    try {
      const response = await axiosInstance.get('/api/categories');
      
      // Handle different response structures
      let categories = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          categories = response.data;
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          categories = response.data.categories;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categories = response.data.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          categories = response.data.data;
        }
      }
      
      // Ensure each category has required fields
      return categories.map(category => ({
        _id: category._id || category.id,
        name: category.name || 'Unnamed Category',
        description: category.description || '',
        icon: category.icon || '📁',
        slug: category.slug || category.name?.toLowerCase().replace(/\s+/g, '-'),
        createdAt: category.createdAt || new Date().toISOString(),
        updatedAt: category.updatedAt || new Date().toISOString(),
      }));
      
    } catch (error) {
      console.error('Categories API error:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to fetch categories';
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 404:
            errorMessage = "Categories endpoint not found";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          case 401:
            errorMessage = "Authentication required";
            break;
          case 403:
            errorMessage = "Access forbidden";
            break;
          default:
            errorMessage = data?.message || `Server error (${status})`;
        }
      } else if (error.request) {
        errorMessage = "No response from server. Please check if backend is running.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      // Throw a proper error object
      throw new Error(errorMessage, {
        cause: error,
        details: {
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        }
      });
    }
  },
  
  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object>} Category object
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/api/categories/${id}`);
      return response.data.category || response.data;
    } catch (error) {
      console.error('Get category by ID error:', error);
      throw error;
    }
  },
  
  /**
   * Create a new category (admin only)
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
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
   * @param {string} id - Category ID
   * @param {Object} updateData - Updated category data
   * @returns {Promise<Object>} Updated category
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
   * @param {string} id - Category ID
   * @returns {Promise<Object>} Deletion result
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
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
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
   * @returns {Promise<Array>} Categories with gig counts
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
   * @returns {Promise<Array>} Popular categories
   */
  getPopular: async () => {
    try {
      const response = await axiosInstance.get('/api/categories/popular');
      return response.data.categories || response.data.data || [];
    } catch (error) {
      console.error('Get popular categories error:', error);
      throw error;
    }
  },
};