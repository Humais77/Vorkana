import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// CSRF token management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request ID generator
const generateRequestId = () => {
  return `subcat_req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Request interceptor with CSRF handling
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
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
      console.log(`📤 Subcategories Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Subcategories request error:', error);
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
      console.log(`📥 Subcategories Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error) => {
    // Handle CSRF errors
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('CSRF token invalid for subcategories, refreshing...');
      
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
      localStorage.removeItem('userInfo');
      if (window.location.pathname !== '/signin' && 
          window.location.pathname !== '/signup') {
        window.location.href = '/signin?redirect=' + encodeURIComponent(window.location.pathname);
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
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry);
};

const refreshCSRFToken = async () => {
  try {
    console.log('Refreshing CSRF token for subcategories API...');
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
      
      // Return empty array instead of throwing for better UX
      if (error.response?.status === 500 || error.code === 'SERVER_ERROR') {
        return [];
      }
      
      throw {
        success: false,
        message: 'Failed to load subcategories',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500,
        data: []
      };
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
      
      if (error.response?.status === 404) {
        throw {
          success: false,
          message: 'Subcategory not found',
          code: 'SUBCATEGORY_NOT_FOUND',
          status: 404
        };
      }
      
      throw {
        success: false,
        message: 'Failed to load subcategory',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
          success: true,
          subcategories: response.data.data || [],
          category: response.data.category,
          count: response.data.count || 0
        };
      }
      
      return {
        success: true,
        subcategories: response.data || [],
        category: null,
        count: response.data?.length || 0
      };
      
    } catch (error) {
      console.error('Get subcategories by category error:', error);
      
      // Return empty data instead of throwing
      return {
        success: false,
        subcategories: [],
        category: null,
        count: 0,
        error: error.message,
        code: error.code || 'NETWORK_ERROR'
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
      
      if (error.response?.status === 404) {
        throw {
          success: false,
          message: 'Subcategory not found',
          code: 'SUBCATEGORY_NOT_FOUND',
          status: 404
        };
      }
      
      throw {
        success: false,
        message: 'Failed to load subcategory',
        code: error.code || 'NETWORK_ERROR',
        status: error.status || 500
      };
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
      
      if (error.response?.status === 500 || error.code === 'SERVER_ERROR') {
        return [];
      }
      
      throw {
        success: false,
        message: 'Failed to search subcategories',
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