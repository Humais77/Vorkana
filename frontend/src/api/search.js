// search.js - Updated to work with new backend
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
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
    
    // Add cache headers for search requests
    if (config.url.includes('/api/search')) {
      config.headers['X-Request-Source'] = 'web-client';
      config.headers['X-Client-Version'] = '1.0.0';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 408 || error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    }
    return Promise.reject(error);
  }
);

// Helper function to clean params
const cleanParams = (params) => {
  const cleaned = { ...params };
  
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
      delete cleaned[key];
    }
    
    // Convert arrays to strings
    if (Array.isArray(cleaned[key])) {
      cleaned[key] = cleaned[key].join(',');
    }
    
    // Convert booleans to strings
    if (typeof cleaned[key] === 'boolean') {
      cleaned[key] = cleaned[key].toString();
    }
  });
  
  return cleaned;
};

export const searchAPI = {
  // Unified search across all types
  unifiedSearch: async (query, options = {}) => {
    try {
      const {
        type = 'services',
        page = 1,
        limit = 48,
        filters = {},
        sort = 'relevance',
        order = 'desc',
        source = 'top-bar',
        search_in = 'everywhere'
      } = options;

      // Build params object
      let params = {
        query,
        type,
        page,
        limit,
        sort,
        order,
        source,
        search_in,
        ...filters
      };

      // Clean params
      params = cleanParams(params);

      const response = await axiosInstance.get('/api/search/search', { 
        params,
        timeout: 10000
      });

      if (response.data && response.data.success) {
        return response.data;
      }

      // Fallback response
      return {
        success: true,
        data: {
          results: [],
          totalCount: 0,
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          meta: {
            query,
            type,
            totalResults: 0
          },
          relatedData: {
            categories: [],
            subcategories: [],
            suggestions: [],
            topSellers: []
          }
        }
      };

    } catch (error) {
      console.error('Search API error:', error);
      
      // Return empty results instead of throwing for better UX
      return {
        success: false,
        error: error.response?.data?.message || 'Search service unavailable',
        data: {
          results: [],
          totalCount: 0,
          pagination: {
            page: options.page || 1,
            limit: options.limit || 48,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          meta: {
            query: query,
            type: options.type || 'services',
            totalResults: 0
          }
        }
      };
    }
  },

  // Quick search for instant results (navbar)
  quickSearch: async (query, limit = 5) => {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          data: [],
          query
        };
      }

      const response = await axiosInstance.get('/api/search/quick', {
        params: { 
          query: query.trim(),
          limit: Math.min(limit, 10)
        },
        timeout: 3000
      });

      if (response.data && response.data.success) {
        return response.data;
      }

      return {
        success: true,
        data: [],
        query
      };

    } catch (error) {
      console.error('Quick search error:', error);
      return {
        success: true,
        data: [],
        query
      };
    }
  },

  // Get search suggestions
  getSuggestions: async (query, type = 'all', limit = 10) => {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          data: []
        };
      }

      const response = await axiosInstance.get('/api/search/suggestions', {
        params: { 
          query: query.trim(),
          type,
          limit: Math.min(limit, 20)
        },
        timeout: 5000
      });

      if (response.data && response.data.success) {
        return response.data;
      }

      return {
        success: true,
        data: []
      };

    } catch (error) {
      console.error('Get suggestions error:', error);
      return {
        success: true,
        data: []
      };
    }
  },

  // Legacy search endpoints for backward compatibility
  searchServices: async (query, filters = {}) => {
    return searchAPI.unifiedSearch(query, { type: 'services', ...filters });
  },

  searchGigs: async (query, filters = {}) => {
    return searchAPI.unifiedSearch(query, { type: 'gigs', ...filters });
  },

  searchCategories: async (query, filters = {}) => {
    try {
      const params = cleanParams({ query, ...filters });
      const response = await axiosInstance.get('/api/categories/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search categories error:', error);
      throw error;
    }
  },

  // Get search statistics
  getSearchStats: async () => {
    try {
      const response = await axiosInstance.get('/api/search/stats', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Get search stats error:', error);
      return {
        success: true,
        data: {
          totals: {
            services: 0,
            gigs: 0,
            categories: 0,
            subcategories: 0
          },
          popularSearches: [],
          trendingCategories: [],
          lastUpdated: new Date().toISOString()
        }
      };
    }
  },

  // Save search history
  saveSearchHistory: async (query, type = 'search') => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return { success: true };

      await axiosInstance.post('/api/search/history', {
        query,
        type,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Save search history error:', error);
      return { success: false };
    }
  },

  // Get search history
  getSearchHistory: async (limit = 10) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return { success: true, data: [] };

      const response = await axiosInstance.get('/api/search/history', {
        params: { limit }
      });

      return response.data;
    } catch (error) {
      console.error('Get search history error:', error);
      return { success: true, data: [] };
    }
  },

  // Clear search history
  clearSearchHistory: async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return { success: true };

      await axiosInstance.delete('/api/search/history');
      return { success: true };
    } catch (error) {
      console.error('Clear search history error:', error);
      return { success: false };
    }
  },

  // Helper: Format search URL
  formatSearchURL: (query, type = 'services', filters = {}) => {
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('type', type);
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.set(key, filters[key]);
      }
    });
    
    return `/search?${params.toString()}`;
  },

  // Helper: Parse search URL
  parseSearchURL: (searchString) => {
    const params = new URLSearchParams(searchString);
    const query = params.get('query') || '';
    const type = params.get('type') || 'services';
    
    const filters = {};
    params.forEach((value, key) => {
      if (key !== 'query' && key !== 'type') {
        filters[key] = value;
      }
    });
    
    return { query, type, filters };
  }
};