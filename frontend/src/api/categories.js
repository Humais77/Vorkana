import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// CSRF token management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request ID generator
const generateRequestId = () => {
  return `cat_req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Request interceptor with CSRF handling
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
    // Add timestamp for cache busting on GET requests
    if (config.method === 'get' && config.cacheBust !== false) {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    // Add CSRF token for non-GET requests
    if (config.method !== 'get' && config.method !== 'GET') {
      // Check if token is expired
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        try {
          await refreshCSRFToken();
        } catch (error) {
          console.warn('Failed to refresh CSRF token:', error.message);
        }
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        // Also add to body for JSON requests
        if (config.data && typeof config.data === 'object' && !config.data.csrfToken) {
          config.data.csrfToken = csrfToken;
        }
      }
    }
    
    if (DEBUG) {
      console.log(`📤 Categories Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Categories request error:', error);
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
      console.log(`📥 Categories Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error) => {
    // Handle CSRF errors
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('Categories API: CSRF token invalid, refreshing...');
      
      try {
        // Try to refresh CSRF token
        await refreshCSRFToken();
        
        // Retry original request
        if (error.config) {
          error.config.headers['X-CSRF-Token'] = csrfToken;
          if (error.config.data && typeof error.config.data === 'object') {
            error.config.data.csrfToken = csrfToken;
          }
          return axiosInstance(error.config);
        }
      } catch (refreshError) {
        console.error('CSRF refresh failed:', refreshError);
        // Clear auth and redirect to login
        clearAuthData();
        window.location.href = '/signin?csrf_error=true';
      }
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Categories API: Authentication required');
      localStorage.removeItem('userInfo');
      if (window.location.pathname !== '/signin' && 
          window.location.pathname !== '/signup') {
        window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }
    
    // Handle network errors
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

// CSRF token management functions
const setCSRFToken = (token, expiresAt) => {
  csrfToken = token;
  csrfTokenExpiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  
  localStorage.setItem('csrfToken', token);
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry);
};

const refreshCSRFToken = async () => {
  try {
    console.log('Refreshing CSRF token for categories API...');
    const response = await axiosInstance.get('/api/csrf/token');
    if (response.data.success) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      console.log('CSRF token refreshed successfully');
      return csrfToken;
    }
    throw new Error('Failed to refresh CSRF token');
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error.message);
    throw error;
  }
};

const clearAuthData = () => {
  localStorage.removeItem('userInfo');
  localStorage.removeItem('csrfToken');
  localStorage.removeItem('csrfTokenExpiry');
};


// Main categories API functions
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
        createdAt: category.createdAt || '',
        updatedAt: category.updatedAt || '',
        isActive: category.isActive !== false,
        servicesCount: category.servicesCount || 0,
        gigsCount: category.gigsCount || 0
      }));
      
    } catch (error) {
      console.error('Categories API getAll error:', error.message);
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to load categories',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
        return {
          _id: category._id || category.id,
          name: category.name || '',
          description: category.description || '',
          slug: category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-') : ''),
          parentCategory: category.parentCategory || null,
          level: category.level || 0,
          createdAt: category.createdAt || '',
          updatedAt: category.updatedAt || '',
          isActive: category.isActive !== false
        };
      });
      
    } catch (error) {
      console.error('Get parent categories error:', error.message);
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to load parent categories',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
      
      if (error.status === 404) {
        throw {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          status: 404
        };
      }
      
      throw error.response?.data || {
        success: false,
        message: 'Failed to load category',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
      throw error.response?.data || {
        success: false,
        message: 'Failed to search categories',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
      throw error.response?.data || {
        success: false,
        message: 'Failed to load category statistics',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
      throw error.response?.data || {
        success: false,
        message: 'Failed to load popular categories',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
    }
  },

  
  // CSRF token management
  getCSRFToken: async () => {
    try {
      const response = await axiosInstance.get('/api/csrf/token');
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  },
  
  refreshCSRFToken: async () => {
    return refreshCSRFToken();
  },
  
  hasValidCSRFToken: () => {
    return csrfToken && Date.now() < parseInt(csrfTokenExpiry);
  },
  
  clearAuthData: clearAuthData
};

// Export axios instance for other services
export { axiosInstance };