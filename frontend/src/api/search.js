import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const searchAPI = {
  // Unified search across all types
  unifiedSearch: async (query, options = {}) => {
    try {
      const {
        type = 'all',
        page = 1,
        limit = 10,
        filters = {},
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = options;

      const params = {
        query,
        type,
        page,
        limit,
        sortBy,
        sortOrder,
        ...filters
      };

      // Clean up params
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axiosInstance.get('/api/search', { params });

      if (response.data && response.data.success) {
        return response.data;
      }

      return {
        success: true,
        data: [],
        total: 0,
        query
      };

    } catch (error) {
      console.error('Search API error:', error);
      throw new Error(error.response?.data?.message || 'Failed to perform search');
    }
  },

  // Quick search for instant results (navbar)
  quickSearch: async (query, limit = 5) => {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          data: {
            services: [],
            gigs: [],
            categories: [],
            users: []
          },
          query
        };
      }

      const response = await axiosInstance.get('/api/search/quick', {
        params: { query, limit }
      });

      if (response.data && response.data.success) {
        return response.data;
      }

      return {
        success: true,
        data: {
          services: [],
          gigs: [],
          categories: [],
          users: []
        },
        query
      };

    } catch (error) {
      console.error('Quick search error:', error);
      // Return empty results on error for better UX
      return {
        success: true,
        data: {
          services: [],
          gigs: [],
          categories: [],
          users: []
        },
        query
      };
    }
  },

  // Search specific types
  searchServices: async (query, filters = {}) => {
    try {
      const params = { query, ...filters };
      const response = await axiosInstance.get('/api/services/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search services error:', error);
      throw error;
    }
  },

  searchGigs: async (query, filters = {}) => {
    try {
      const params = { query, ...filters };
      const response = await axiosInstance.get('/api/gigs/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search gigs error:', error);
      throw error;
    }
  },

  searchCategories: async (query, filters = {}) => {
    try {
      const params = { query, ...filters };
      const response = await axiosInstance.get('/api/categories/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search categories error:', error);
      throw error;
    }
  },

  // Get search suggestions
  getSuggestions: async (query, type = 'all') => {
    try {
      const response = await axiosInstance.get('/api/search/suggestions', {
        params: { query, type }
      });
      return response.data;
    } catch (error) {
      console.error('Get suggestions error:', error);
      return {
        success: true,
        suggestions: []
      };
    }
  },

  // Save search history
  saveSearchHistory: async (query, type = 'search') => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await axiosInstance.post('/api/search/history', {
        query,
        type,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Silently fail - search history is optional
    }
  },

  // Get search history
  getSearchHistory: async (limit = 10) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return [];

      const response = await axiosInstance.get('/api/search/history', {
        params: { limit }
      });

      return response.data?.data || [];
    } catch (error) {
      return [];
    }
  },

  // Clear search history
  clearSearchHistory: async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await axiosInstance.delete('/api/search/history');
    } catch (error) {
      // Silently fail
    }
  }
};