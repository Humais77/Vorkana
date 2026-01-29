// search.js - Production ready API client with CSRF protection
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// CSRF token management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true,
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  }
});

// Request interceptor with CSRF handling
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    config.headers['X-Request-ID'] = requestId;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.url.includes('/api/search')) {
      config.headers['X-Request-Source'] = 'web-client';
      config.headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
    }
    
    // Add CSRF token for non-GET requests to search endpoints
    if (config.method !== 'get' && config.method !== 'GET' && config.url.includes('/api/search')) {
      // Check if token is expired
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        try {
          await refreshSearchCSRFToken();
        } catch (error) {
          console.warn('Failed to refresh CSRF token for search:', error.message);
        }
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        // Also add to body for POST requests
        if (config.data && typeof config.data === 'object' && !config.data.csrfToken) {
          config.data.csrfToken = csrfToken;
        }
      }
    }
    
    if (DEBUG) {
      console.log(`📤 Search Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        params: config.params
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Search request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Update CSRF token from response
    if (response.data?.csrfToken) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
    }
    
    if (DEBUG) {
      console.log(`📥 Search Response: ${response.status} ${response.config.url}`, {
        data: response.data,
        headers: response.headers
      });
    }
    
    if (response.data && typeof response.data === 'object') {
      if (response.data.success === undefined) {
        response.data.success = true;
      }
      
      const responseTime = response.headers['x-response-time'];
      if (responseTime) {
        response.data.responseTime = responseTime;
      }
    }
    
    return response;
  },
  async (error) => {
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
    
    const { response } = error;
    
    // Handle CSRF errors
    if (response?.status === 403 && 
        response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('Search CSRF token invalid, refreshing...');
      
      try {
        // Try to refresh CSRF token
        await refreshSearchCSRFToken();
        
        // Retry original request
        if (error.config) {
          error.config.headers['X-CSRF-Token'] = csrfToken;
          if (error.config.data && typeof error.config.data === 'object') {
            error.config.data.csrfToken = csrfToken;
          }
          return axiosInstance(error.config);
        }
      } catch (refreshError) {
        console.error('Search CSRF refresh failed:', refreshError);
        // Redirect to login with CSRF error
        if (window.location.pathname !== '/signin' && 
            window.location.pathname !== '/signup') {
          window.location.href = '/signin?csrf_error=true';
        }
      }
    }
    
    // Handle authentication errors
    if (response?.status === 401) {
      localStorage.removeItem('userInfo');
      if (window.location.pathname !== '/signin' && 
          window.location.pathname !== '/signup') {
        window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }
    
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

// CSRF token management functions
const setCSRFToken = (token, expiresAt) => {
  csrfToken = token;
  csrfTokenExpiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  
  localStorage.setItem('csrfToken', token);
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry.toString());
};

const refreshSearchCSRFToken = async () => {
  try {
    console.log('Refreshing CSRF token for search API...');
    const response = await axiosInstance.get('/api/search/csrf-token');
    if (response.data.success) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      console.log('Search CSRF token refreshed successfully');
      return csrfToken;
    }
    throw new Error('Failed to refresh CSRF token');
  } catch (error) {
    console.error('Failed to refresh search CSRF token:', error.message);
    throw error;
  }
};

// Clear auth data
const clearAuthData = () => {
  localStorage.removeItem('userInfo');
  localStorage.removeItem('csrfToken');
  localStorage.removeItem('csrfTokenExpiry');
};

// Helper function to clean params
const cleanParams = (params) => {
  if (!params || typeof params !== 'object') return {};
  
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        cleaned[key] = value.join(',');
      }
    } else if (typeof value === 'boolean') {
      cleaned[key] = value.toString();
    } else if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return;
      
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
      const trimmed = value.trim();
      if (trimmed.length === 0) return;
      
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
      cleaned[key] = value;
    }
  });
  
  return cleaned;
};

// Retry logic
const withRetry = async (fn, maxRetries = 2, retryDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status && [400, 401, 403, 404, 429].includes(error.response.status)) {
        throw error;
      }
      
      if (attempt > maxRetries) {
        throw error;
      }
      
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.warn(`Search request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Cache implementation
const searchCache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`search_cache_${key}`);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      
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
  },
  
  clearOld: () => {
    const now = Date.now();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('search_cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (now - item.timestamp > 3600000) { // 1 hour
            localStorage.removeItem(key);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    });
  }
};

// Clear old cache on load
if (typeof window !== 'undefined') {
  searchCache.clearOld();
}

export const searchAPI = {
  // CSRF Token management
  getCSRFToken: async () => {
    try {
      const response = await axiosInstance.get('/api/search/csrf-token');
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get search CSRF token:', error);
      throw error;
    }
  },
  
  refreshCSRFToken: async () => {
    return refreshSearchCSRFToken();
  },
  
  hasValidCSRFToken: () => {
    return csrfToken && Date.now() < parseInt(csrfTokenExpiry);
  },
  
  clearAuthData: clearAuthData,
  
  // Unified search
  unifiedSearch: async (query, options = {}) => {
    const defaultOptions = {
      type: 'services',
      page: 1,
      limit: 24,
      filters: {},
      sort: 'relevance',
      order: 'desc',
      cache: true,
      retry: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    const cacheKey = `search_${mergedOptions.type}_${query}_${JSON.stringify(mergedOptions.filters)}_${mergedOptions.page}`;
    
    if (mergedOptions.cache && mergedOptions.page === 1) {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        console.log('Search cache hit for:', cacheKey);
        return {
          ...cached,
          cached: true
        };
      }
    }
    
    let params = {
      query: query,
      type: mergedOptions.type,
      page: mergedOptions.page,
      limit: mergedOptions.limit,
      sort: mergedOptions.sort,
      order: mergedOptions.order,
      ...mergedOptions.filters
    };
    
    params = cleanParams(params);
    
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
      
      const result = {
        success: data.success !== false,
        ...data,
        requestId: response.headers['x-request-id']
      };
      
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

  // Quick search
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

  // Get suggestions
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

  // Search history - with CSRF protection
  getSearchHistory: async (limit = 20) => {
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

  saveSearchHistory: async (query, type = 'search', filters = {}) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return { success: true };
      
      // Ensure CSRF token is valid before making POST request
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        await refreshSearchCSRFToken();
      }
      
      const response = await axiosInstance.post('/api/search/history', {
        query,
        type,
        filters,
        csrfToken
      }, {
        timeout: 3000
      });
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('Save search history error:', error);
      
      // Handle CSRF errors
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        return {
          success: false,
          message: 'Security validation failed',
          code: 'CSRF_TOKEN_INVALID',
          requiresCSRFRefresh: true
        };
      }
      
      return { success: false };
    }
  },

  clearSearchHistory: async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return { success: true };
      
      // Ensure CSRF token is valid before making DELETE request
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        await refreshSearchCSRFToken();
      }
      
      const response = await axiosInstance.delete('/api/search/history', {
        data: { csrfToken },
        timeout: 3000
      });
      
      return response.data;
    } catch (error) {
      console.error('Clear search history error:', error);
      
      // Handle CSRF errors
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        return {
          success: false,
          message: 'Security validation failed',
          code: 'CSRF_TOKEN_INVALID',
          requiresCSRFRefresh: true
        };
      }
      
      return { success: false };
    }
  },

  // Advanced search (POST request with CSRF protection)
  advancedSearch: async (searchData) => {
    try {
      // Ensure CSRF token is valid before making POST request
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        await refreshSearchCSRFToken();
      }
      
      const response = await axiosInstance.post('/api/search/advanced', {
        ...searchData,
        csrfToken
      }, {
        timeout: 15000
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Advanced search error:', error);
      
      // Handle CSRF errors
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        return {
          success: false,
          message: 'Security validation failed',
          code: 'CSRF_TOKEN_INVALID',
          requiresCSRFRefresh: true
        };
      }
      
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await axiosInstance.get('/api/search/health', {
        timeout: 5000
      });
      
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        success: false,
        message: 'Search service unavailable'
      };
    }
  },

  // Clear cache
  clearCache: () => {
    searchCache.clear();
    return { success: true };
  },

  // URL helpers
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

  parseSearchURL: (searchString) => {
    try {
      const params = new URLSearchParams(searchString);
      const query = params.get('query') || '';
      const type = params.get('type') || 'services';
      const page = parseInt(params.get('page') || '1');
      
      const filters = {};
      params.forEach((value, key) => {
        if (!['query', 'type', 'page'].includes(key)) {
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

  // Local storage helpers
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
  },

  clearRecentSearches: () => {
    try {
      localStorage.removeItem('recentSearches');
      return { success: true };
    } catch (error) {
      console.error('Clear recent searches error:', error);
      return { success: false };
    }
  }
};

// Export axios instance for other services
export { axiosInstance };