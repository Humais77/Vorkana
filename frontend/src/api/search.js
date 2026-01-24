// search.js - Production ready API client
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for better UX
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials:true,
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Don't throw for 4xx errors
  }
});

// Request interceptor with enhanced error handling
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache headers for search requests
    if (config.url.includes('/api/search')) {
      config.headers['X-Request-Source'] = 'web-client';
      config.headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with comprehensive error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // Handle successful responses
    const { data } = response;
    
    // Check if response structure is valid
    if (data && typeof data === 'object') {
      // Ensure success property exists
      if (data.success === undefined) {
        data.success = true;
      }
      
      // Add response time if available in headers
      const responseTime = response.headers['x-response-time'];
      if (responseTime) {
        data.responseTime = responseTime;
      }
    }
    
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      error.response = {
        data: {
          success: false,
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR'
        },
        status: 0
      };
    }
    
    // Handle specific error cases
    const { response } = error;
    
    if (response) {
      switch (response.status) {
        case 400:
          response.data.message = response.data.message || 'Bad request. Please check your search parameters.';
          break;
        case 401:
          response.data.message = 'Please login to continue';
          response.data.code = 'UNAUTHORIZED';
          break;
        case 403:
          response.data.message = 'Access forbidden';
          response.data.code = 'FORBIDDEN';
          break;
        case 404:
          response.data.message = 'Resource not found';
          response.data.code = 'NOT_FOUND';
          break;
        case 408:
        case 'ECONNABORTED':
          response.data.message = 'Request timeout. Please try again.';
          response.data.code = 'TIMEOUT';
          break;
        case 429:
          response.data.message = 'Too many requests. Please try again later.';
          response.data.code = 'RATE_LIMITED';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          response.data.message = 'Server error. Please try again later.';
          response.data.code = 'SERVER_ERROR';
          break;
        default:
          response.data.message = response.data.message || 'An unexpected error occurred';
          response.data.code = response.data.code || 'UNKNOWN_ERROR';
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to generate request ID
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper function to clean and validate params
const cleanParams = (params) => {
  if (!params || typeof params !== 'object') return {};
  
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    // Remove undefined, null, empty string
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    // Handle different types
    if (Array.isArray(value)) {
      if (value.length > 0) {
        // Join arrays with comma for query params
        cleaned[key] = value.join(',');
      }
    } else if (typeof value === 'boolean') {
      // Convert booleans to string
      cleaned[key] = value.toString();
    } else if (typeof value === 'number') {
      // Validate numbers
      if (isNaN(value) || !isFinite(value)) return;
      
      // Add range limits for certain parameters
      if (key.includes('price') || key.includes('budget')) {
        if (value < 0 || value > 1000000) return;
      }
      if (key.includes('rating')) {
        if (value < 0 || value > 5) return;
      }
      if (key.includes('limit') || key.includes('page')) {
        if (value < 1 || value > 200) return;
      }
      
      cleaned[key] = value;
    } else if (typeof value === 'string') {
      // Validate and sanitize strings
      const trimmed = value.trim();
      if (trimmed.length === 0) return;
      
      // Limit query length
      if (key === 'query' || key === 'q' || key === 'search') {
        if (trimmed.length > 200) {
          cleaned[key] = trimmed.substring(0, 200);
        } else {
          cleaned[key] = trimmed;
        }
      } else {
        cleaned[key] = trimmed;
      }
    } else {
      // Keep other types as is
      cleaned[key] = value;
    }
  });
  
  return cleaned;
};

// Rate limiting and retry logic
const withRetry = async (fn, maxRetries = 2, retryDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry for certain error types
      if (error.response?.status && [400, 401, 403, 404, 429].includes(error.response.status)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt > maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Cache implementation for search results
const searchCache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`search_cache_${key}`);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      
      // Check if cache is expired (5 minutes)
      if (Date.now() - timestamp > 300000) {
        localStorage.removeItem(`search_cache_${key}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  },
  
  set: (key, data) => {
    try {
      const item = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`search_cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  },
  
  clear: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('search_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

export const searchAPI = {
  // Unified search with cache and retry
  unifiedSearch: async (query, options = {}) => {
    const defaultOptions = {
      type: 'services',
      page: 1,
      limit: 48,
      filters: {},
      sort: 'relevance',
      order: 'desc',
      source: 'top-bar',
      search_in: 'everywhere',
      cache: true,
      retry: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Generate cache key
    const cacheKey = `search_${mergedOptions.type}_${query}_${JSON.stringify(mergedOptions.filters)}_${mergedOptions.page}`;
    
    // Try cache first
    if (mergedOptions.cache && mergedOptions.page === 1) {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        console.log('Cache hit for:', cacheKey);
        return {
          ...cached,
          cached: true
        };
      }
    }
    
    // Build params
    let params = {
      query: query,
      type: mergedOptions.type,
      page: mergedOptions.page,
      limit: mergedOptions.limit,
      sort: mergedOptions.sort,
      order: mergedOptions.order,
      source: mergedOptions.source,
      search_in: mergedOptions.search_in,
      ...mergedOptions.filters
    };
    
    params = cleanParams(params);
    
    // Validate required parameters
    if (!params.query || typeof params.query !== 'string' || params.query.trim().length < 1) {
      return {
        success: false,
        message: 'Search query is required',
        code: 'QUERY_REQUIRED',
        data: {
          results: [],
          totalCount: 0,
          pagination: {
            page: mergedOptions.page,
            limit: mergedOptions.limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };
    }
    
    try {
      const searchFn = () => axiosInstance.get('/api/search/search', {
        params,
        timeout: 15000
      });
      
      const response = mergedOptions.retry ? 
        await withRetry(searchFn, 2, 1000) :
        await searchFn();
      
      const { data } = response;
      
      // Ensure response structure
      const result = {
        success: data.success !== false,
        ...data,
        requestId: response.headers['x-request-id']
      };
      
      // Cache successful results
      if (mergedOptions.cache && mergedOptions.page === 1 && result.success && result.data?.results?.length > 0) {
        searchCache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('Search API error:', error);
      
      const errorData = error.response?.data || {
        success: false,
        message: 'Search service unavailable',
        code: 'SERVICE_UNAVAILABLE'
      };
      
      // Return structured error response
      return {
        ...errorData,
        data: {
          results: [],
          totalCount: 0,
          pagination: {
            page: mergedOptions.page,
            limit: mergedOptions.limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          meta: {
            query: query,
            type: mergedOptions.type,
            totalResults: 0
          }
        }
      };
    }
  },

  // Quick search with aggressive caching
  quickSearch: async (query, limit = 5) => {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: [],
        query
      };
    }
    
    const cacheKey = `quick_${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await axiosInstance.get('/api/search/quick', {
        params: { 
          query: query.trim(),
          limit: Math.min(limit, 10)
        },
        timeout: 3000
      });
      
      const result = {
        success: true,
        data: response.data?.data || [],
        query
      };
      
      // Cache for 1 minute
      searchCache.set(cacheKey, result);
      
      return result;
      
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
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: []
      };
    }
    
    const cacheKey = `suggestions_${query}_${type}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await axiosInstance.get('/api/search/suggestions', {
        params: { 
          query: query.trim(),
          type,
          limit: Math.min(limit, 20)
        },
        timeout: 5000
      });
      
      const result = {
        success: true,
        data: response.data?.data || []
      };
      
      // Cache for 2 minutes
      searchCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Get suggestions error:', error);
      return {
        success: true,
        data: []
      };
    }
  },

  // Get filter options
  getFilterOptions: async (query, type = 'services') => {
    const cacheKey = `filters_${query}_${type}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await axiosInstance.get('/api/search/filters', {
        params: { query, type },
        timeout: 5000
      });
      
      const result = {
        success: true,
        data: response.data?.data || {}
      };
      
      searchCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Get filter options error:', error);
      return {
        success: true,
        data: {
          sort: [],
          budget: [],
          rating: [],
          deliveryTime: []
        }
      };
    }
  },

  // Get search statistics
  getSearchStats: async () => {
    const cacheKey = 'stats';
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await axiosInstance.get('/api/search/stats', {
        timeout: 5000
      });
      
      const result = {
        success: true,
        data: response.data?.data || {
          totals: { services: 0, gigs: 0, categories: 0 },
          recentActivity: { services: 0, gigs: 0, period: '7 days' },
          topCategories: []
        }
      };
      
      // Cache for 5 minutes
      searchCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Get search stats error:', error);
      return {
        success: true,
        data: {
          totals: { services: 0, gigs: 0, categories: 0 },
          recentActivity: { services: 0, gigs: 0, period: '7 days' },
          topCategories: []
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
      }, {
        timeout: 3000
      });
      
      return { success: true };
    } catch (error) {
      // Don't show error for history saves
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
        params: { limit },
        timeout: 3000
      });
      
      return {
        success: true,
        data: response.data?.data || []
      };
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

  // Clear all cache
  clearCache: () => {
    searchCache.clear();
    return { success: true };
  },

  // Helper: Format search URL
  formatSearchURL: (query, type = 'services', filters = {}) => {
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('type', type);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value.toString());
        }
      }
    });
    
    return `/search?${params.toString()}`;
  },

  // Helper: Parse search URL
  parseSearchURL: (searchString) => {
    try {
      const params = new URLSearchParams(searchString);
      const query = params.get('query') || '';
      const type = params.get('type') || 'services';
      const page = parseInt(params.get('page') || '1');
      
      const filters = {};
      params.forEach((value, key) => {
        if (!['query', 'type', 'page'].includes(key)) {
          // Handle comma-separated arrays
          if (value.includes(',')) {
            filters[key] = value.split(',').filter(v => v.trim());
          } else {
            filters[key] = value;
          }
        }
      });
      
      return { query, type, page, filters };
    } catch (error) {
      console.error('Parse URL error:', error);
      return { query: '', type: 'services', page: 1, filters: {} };
    }
  },

  // Helper: Get recent searches from localStorage
  getRecentSearches: () => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch (error) {
      console.error('Get recent searches error:', error);
      return [];
    }
  },

  // Helper: Save recent search
  saveRecentSearch: (query, type = 'search') => {
    try {
      const recent = searchAPI.getRecentSearches();
      const updated = [
        { query, type, timestamp: new Date().toISOString() },
        ...recent.filter(item => item.query.toLowerCase() !== query.toLowerCase())
      ].slice(0, 10);
      
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Save recent search error:', error);
      return [];
    }
  }
};