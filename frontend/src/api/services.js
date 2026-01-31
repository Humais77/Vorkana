// services.js - Production-ready with CSRF protection
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// CSRF token management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

// Create axios instance with cookie support
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // IMPORTANT: Enables cookie sending
});

// Request ID generator
const generateRequestId = () => {
  return `service_req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Request interceptor with CSRF handling
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
    // Handle FormData content type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
        // Also add to body for form submissions
        if (config.data && typeof config.data === 'object' && !config.data.csrfToken) {
          config.data.csrfToken = csrfToken;
        }
      }
    }
    
    if (DEBUG) {
      console.log(`📤 Services Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Services request error:', error);
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
    console.log('Refreshing CSRF token for services API...');
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

// Response interceptor with CSRF handling
axiosInstance.interceptors.response.use(
  (response) => {
    // Update CSRF token from response
    if (response.data?.csrfToken) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
    }
    
    if (DEBUG) {
      console.log(`📥 Services Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle CSRF errors
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('CSRF token invalid, refreshing...');
      
      try {
        // Try to refresh CSRF token
        await refreshCSRFToken();
        
        // Retry original request
        if (originalRequest) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
          if (originalRequest.data && typeof originalRequest.data === 'object') {
            originalRequest.data.csrfToken = csrfToken;
          }
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('CSRF refresh failed:', refreshError);
        // Clear auth and redirect to login
        clearAuthData();
        window.location.href = '/signin?csrf_error=true';
      }
    }
    
    // Handle 401 - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      
      // Skip refresh for auth endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/api/auth/');
      
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh token via cookie
        await axiosInstance.post('/api/auth/refresh', {}, {
          withCredentials: true
        });
        
        // Retry original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Clear client-side auth state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userInfo');
        }
        
        // Redirect to login if not on auth pages
        if (!window.location.pathname.includes('/signin') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/signin';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle specific status codes
    if (error.response) {
      const { status, data } = error.response;
      
      // Rate limiting
      if (status === 429) {
        console.warn('Rate limited:', data.message);
      }
      
      // Account lock
      if (status === 423) {
        console.warn('Account locked:', data.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export const servicesAPI = {
  getAll: async (filters = {}) => {
    try {
      // Clean filters - remove undefined/null/empty values
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && 
            filters[key] !== null && 
            filters[key] !== '' && 
            filters[key] !== 'undefined') {
          cleanFilters[key] = filters[key];
        }
      });

      console.log('Fetching services with filters:', cleanFilters);
      
      // Build query string
      const queryString = new URLSearchParams(cleanFilters).toString();
      const url = `/api/services${queryString ? '?' + queryString : ''}`;
      
      console.log('API URL:', url);
      
      const response = await axiosInstance.get(url);
      
      console.log('API Response status:', response.status);
      console.log('API Response:', response.data);
      
      // Handle response
      if (response.data) {
        return {
          success: response.data.success !== false,
          data: response.data.data || response.data.services || [],
          pagination: response.data.pagination || {
            page: filters.page || 1,
            limit: filters.limit || 12,
            total: (response.data.data || response.data.services || []).length,
            totalPages: Math.ceil((response.data.data || response.data.services || []).length / (filters.limit || 12))
          },
          message: response.data.message,
          ...response.data
        };
      }
      
      console.warn('No data in response');
      return {
        success: false,
        data: [],
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 0,
          totalPages: 0
        },
        message: 'No data received'
      };
      
    } catch (error) {
      console.error('Services API getAll error:', error.message);
      console.error('Error response:', error.response?.data);
      
      return {
        success: false,
        data: [],
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 0,
          totalPages: 0
        },
        error: error.message,
        message: 'Failed to fetch services'
      };
    }
  },
  
  getByCategoryId: async (categoryId, params = {}) => {
    try {
      const cleanParams = {
        category: categoryId,
        isActive: true,
        status: 'active',
        ...params
      };
      
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key] === undefined || cleanParams[key] === null || cleanParams[key] === '') {
          delete cleanParams[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await axiosInstance.get(`/api/services/category/${categoryId}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Error fetching services by category:', error);
      return [];
    }
  },
  
  getBySubcategoryId: async (subcategoryId, params = {}) => {
    try {
      const cleanParams = {
        subcategory: subcategoryId,
        isActive: true,
        status: 'active',
        ...params
      };
      
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key] === undefined || cleanParams[key] === null || cleanParams[key] === '') {
          delete cleanParams[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await axiosInstance.get(`/api/services/subcategory/${subcategoryId}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Error fetching services by subcategory ID:', error);
      return [];
    }
  },
  
  getBySubcategorySlug: async (subcategorySlug, params = {}) => {
    try {
      const cleanParams = {
        isActive: true,
        status: 'active',
        ...params
      };
      
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key] === undefined || cleanParams[key] === null || cleanParams[key] === '') {
          delete cleanParams[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await axiosInstance.get(`/api/services/subcategory/slug/${encodeURIComponent(subcategorySlug)}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      console.error('Error fetching services by subcategory slug:', error);
      return [];
    }
  },
  
  getMyServices: async (filters = {}) => {
    try {
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== 'undefined' && filters[key] !== '') {
          cleanFilters[key] = filters[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanFilters).toString();
      
      console.log('Fetching my services with filters:', cleanFilters);
      console.log('URL: /api/services/my-services' + (queryString ? '?' + queryString : ''));
      
      const response = await axiosInstance.get(`/api/services/my-services${queryString ? '?' + queryString : ''}`);
      
      console.log('Response status:', response.status);
      console.log('Response data structure:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataType: typeof response.data?.data,
        isArray: Array.isArray(response.data?.data),
        message: response.data?.message
      });
      
      if (response.data) {
        return {
          success: response.data.success !== false,
          data: response.data.data || [],
          pagination: response.data.pagination || {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: (response.data.data || []).length,
            totalPages: Math.ceil((response.data.data || []).length / (filters.limit || 20))
          },
          message: response.data.message,
          ...response.data
        };
      }
      
      return {
        success: false,
        data: [],
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: 0,
          totalPages: 0
        },
        message: 'No data received'
      };
      
    } catch (error) {
      console.error('Error fetching my services:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to fetch your services';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Please login to view your services';
        } else if (error.response.status === 404) {
          errorMessage = 'Services endpoint not found';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  getAllActive: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/services/all-active', { params });
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      return {
        success: false,
        data: [],
        pagination: {}
      };
      
    } catch (error) {
      console.error('Get all active services error:', error);
      return {
        success: false,
        data: [],
        pagination: {},
        error: error.message
      };
    }
  },
  
  getById: async (identifier) => {
    try {
      const response = await axiosInstance.get(`/api/services/${identifier}`);
      
      if (response.data && response.data.success) {
        return response.data.service || response.data.data;
      }
      
      throw new Error('Service not found');
      
    } catch (error) {
      let errorMessage = 'Failed to fetch service';
      if (error.response) {
        const { status } = error.response;
        if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 400) {
          errorMessage = 'Invalid service ID';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  getByCategory: async (categoryIdentifier, params = {}) => {
    try {
      const response = await axiosInstance.get(`/api/services/category/${encodeURIComponent(categoryIdentifier)}`, {
        params: {
          isActive: true,
          status: 'published',
          ...params
        }
      });
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch category services');
    }
  },
  
  create: async (serviceData, files = null) => {
    try {
      let formData;
      
      if (files instanceof FormData) {
        formData = files;
      } else {
        formData = new FormData();
        
        // Append service data as JSON
        formData.append('data', JSON.stringify(serviceData));
        
        // Append files if provided
        if (serviceData?.thumbnailFile) {
          formData.append('thumbnail', serviceData.thumbnailFile);
        }
        
        if (serviceData?.imageFiles && Array.isArray(serviceData.imageFiles)) {
          serviceData.imageFiles.forEach(file => {
            formData.append('images', file);
          });
        }
      }
      
      // Add CSRF token to FormData
      if (csrfToken) {
        formData.append('csrfToken', csrfToken);
      }
      
      const response = await axiosInstance.post('/api/services', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Service created successfully',
          service: response.data.service || response.data.data,
          serviceId: response.data.service?._id || response.data.data?._id,
          csrfToken: response.data.csrfToken
        };
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Create service error:', error);
      console.error('Error details:', error.response?.data);
      
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      let errorMessage = 'Failed to create service';
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400) {
          if (data.errors) {
            const validationErrors = data.errors.map(err => err.message).join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else {
            errorMessage = data?.message || errorMessage;
          }
        } else if (status === 401) {
          errorMessage = 'Please login to create a service';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to create services';
        } else if (status === 404) {
          errorMessage = 'Category or subcategory not found';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  getAdminServices: async (filters = {}) => {
    try {
      const cleanFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          cleanFilters[key] = filters[key];
        }
      });
      
      const queryString = new URLSearchParams(cleanFilters).toString();
      const response = await axiosInstance.get(`/api/services/admin/services${queryString ? '?' + queryString : ''}`);
      
      return response.data || { success: false, data: [] };
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch admin services');
    }
  },
  
  update: async (id, updateData, options = {}) => {
    try {
      console.log('Updating service:', id);
      
      let response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Handle FormData vs JSON data
      if (updateData instanceof FormData) {
        console.log('Sending FormData to update service');
        
        // Add CSRF token to FormData
        if (csrfToken) {
          updateData.append('csrfToken', csrfToken);
        }
        
        response = await axiosInstance.put(`/api/services/${id}`, updateData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: controller.signal,
          timeout: 30000
        });
      } else {
        console.log('Sending JSON data to update service');
        
        // Add CSRF token to JSON data
        const dataWithCSRF = {
          ...updateData,
          ...(csrfToken ? { csrfToken } : {})
        };
        
        response = await axiosInstance.put(`/api/services/${id}`, dataWithCSRF, {
          signal: controller.signal,
          timeout: 30000
        });
      }

      clearTimeout(timeoutId);
      
      console.log('Update response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Service updated successfully',
          service: response.data.service || response.data.data,
          thumbnailUpdated: response.data.thumbnailUpdated || false,
          imagesUpdated: response.data.imagesUpdated || false,
          csrfToken: response.data.csrfToken
        };
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Update service error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
        throw new Error('Request timeout. Please try a smaller update.');
      }
      
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }
      
      let errorMessage = 'Failed to update service';
      if (error.response) {
        const { data, status } = error.response;
        
        if (status === 400 && data.errors) {
          const validationErrors = data.errors.map(err => err.message).join(', ');
          errorMessage = `Validation failed: ${validationErrors}`;
        } else if (status === 403) {
          errorMessage = 'You can only update your own services';
        } else if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 409) {
          errorMessage = 'Service was modified by another user. Please refresh and try again.';
        } else if (status === 413) {
          errorMessage = 'File size too large. Please reduce image sizes.';
        } else if (status === 422) {
          errorMessage = data?.message || 'Invalid data provided';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      throw new Error(errorMessage);
    }
  },
  
  delete: async (id, options = {}) => {
    try {
      const config = {
        params: options
      };
      
      // Add CSRF token for delete request
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.delete(`/api/services/${id}`, config);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Service deleted successfully',
          csrfToken: response.data.csrfToken
        };
      }
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      let errorMessage = 'Failed to delete service';
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 403) {
          errorMessage = 'You can only delete your own services';
        } else if (status === 404) {
          errorMessage = 'Service not found';
        } else if (status === 400) {
          errorMessage = data?.message || 'Cannot delete service with active orders';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  },
  
  restore: async (id) => {
    try {
      const config = {};
      
      // Add CSRF token for restore request
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.patch(`/api/services/${id}/restore`, config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to restore service');
    }
  },
  
  search: async (searchParams) => {
    try {
      const params = {};
      
      if (searchParams.query) {
        params.q = searchParams.query;
      }
      if (searchParams.q) {
        params.q = searchParams.q;
      }
      
      if (searchParams.category) params.category = searchParams.category;
      if (searchParams.minPrice) params.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) params.maxPrice = searchParams.maxPrice;
      if (searchParams.sort) params.sort = searchParams.sort;
      if (searchParams.limit) params.limit = searchParams.limit;
      
      const queryString = new URLSearchParams(params).toString();
      
      const response = await axiosInstance.get(`/api/services/search${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.results || response.data.data || [],
          pagination: response.data.pagination || {
            total: (response.data.results || response.data.data || []).length
          },
          ...response.data
        };
      }
      
      return {
        success: true,
        data: response.data || [],
        pagination: {
          total: (response.data || []).length
        }
      };
      
    } catch (error) {
      console.error('Search services error:', error);
      console.error('Error details:', error.response?.data);
      
      return {
        success: false,
        data: [],
        pagination: {
          total: 0
        },
        error: error.message
      };
    }
  },
  
  getPopularServices: async (params = {}) => {
    try {
      const cleanParams = {};
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          cleanParams[key] = params[key];
        }
      });

      console.log('Fetching popular services with params:', cleanParams);
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const url = `/api/services/popular${queryString ? '?' + queryString : ''}`;
      
      console.log('Popular services API URL:', url);
      
      const response = await axiosInstance.get(url);
      
      console.log('Popular services response:', response.data);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.services || response.data.data || [],
          count: response.data.count || 0,
          categoryStats: response.data.categoryStats || [],
          ...response.data
        };
      }
      
      return {
        success: true,
        data: [],
        count: 0,
        categoryStats: []
      };
      
    } catch (error) {
      console.error('Popular services API error:', error.message);
      console.error('Error details:', error.response?.data);
      
      return {
        success: false,
        data: [],
        count: 0,
        categoryStats: [],
        error: error.message
      };
    }
  },
  
  getPopularServicesByCategory: async (params = {}) => {
  try {
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });

    
    const queryString = new URLSearchParams(cleanParams).toString();
    const url = `/api/services/popular/category${queryString ? '?' + queryString : ''}`;
    
    const response = await axiosInstance.get(url);
    
    
    // Handle different response structures
    let data = [];
    let count = 0;
    
    if (response.data) {
      if (response.data.data && Array.isArray(response.data.data)) {
        data = response.data.data;
        count = response.data.count || response.data.data.length;
      } else if (Array.isArray(response.data)) {
        data = response.data;
        count = response.data.length;
      } else if (response.data.services && Array.isArray(response.data.services)) {
        data = response.data.services;
        count = response.data.count || response.data.services.length;
      }
      
      return {
        success: response.data.success !== false,
        data: data,
        count: count,
        categoryStats: response.data.categoryStats || [],
        ...response.data
      };
    }
    
    return {
      success: false,
      data: [],
      count: 0,
      error: 'No data received'
    };
    
  } catch (error) {
    console.error('Popular services by category error:', error);
    console.error('Error details:', error.response?.data);
    
    return {
      success: false,
      data: [],
      count: 0,
      error: error.message
    };
  }
},
  
  togglePopularStatus: async (serviceId, isPopular) => {
    try {
      const data = {
        isPopular
      };
      
      // Add CSRF token
      if (csrfToken) {
        data.csrfToken = csrfToken;
      }
      
      const response = await axiosInstance.patch(`/api/services/${serviceId}/popular`, data);
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to update popular status');
    }
  },
  
  getSimilar: async (serviceId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`/api/services/similar/${serviceId}${queryString ? '?' + queryString : ''}`);
      
      if (response.data && response.data.success) {
        return response.data.services || response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get similar services');
    }
  },
  
  getStats: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services/admin/stats${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      return {
        success: true,
        data: {
          totalServices: 0,
          activeServices: 0,
          draftServices: 0,
          totalRevenue: 0,
        }
      };
    }
  },
  
  uploadImages: async (serviceId, files) => {
    try {
      const formData = new FormData();
      
      if (Array.isArray(files)) {
        files.forEach(file => {
          formData.append('images', file);
        });
      } else if (files) {
        formData.append('images', files);
      }
      
      // Add CSRF token
      if (csrfToken) {
        formData.append('csrfToken', csrfToken);
      }
      
      const response = await axiosInstance.post(`/api/services/${serviceId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to upload images');
    }
  },
  
  removeImage: async (serviceId, publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const config = {};
      
      // Add CSRF token
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.delete(`/api/services/${serviceId}/images/${encodedId}`, config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to remove image');
    }
  },
  
  setThumbnail: async (serviceId, publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const config = {};
      
      // Add CSRF token
      if (csrfToken) {
        config.data = { csrfToken };
      }
      
      const response = await axiosInstance.put(`/api/services/${serviceId}/thumbnail/${encodedId}`, config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to set thumbnail');
    }
  },
  
  uploadThumbnail: async (serviceId, file) => {
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      // Add CSRF token
      if (csrfToken) {
        formData.append('csrfToken', csrfToken);
      }
      
      const response = await axiosInstance.post(`/api/services/${serviceId}/thumbnail`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to upload thumbnail');
    }
  },
  
  bulkOperation: async (ids, operation, data = {}) => {
    try {
      const requestData = {
        ids,
        operation,
        data
      };
      
      // Add CSRF token
      if (csrfToken) {
        requestData.csrfToken = csrfToken;
      }
      
      const response = await axiosInstance.post('/api/services/admin/bulk', requestData);
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to perform bulk operation');
    }
  },
  
  export: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/services/admin/export${queryString ? '?' + queryString : ''}`, {
        responseType: 'blob'
      });
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        throw {
          message: 'Security validation failed. Please refresh the page.',
          code: 'CSRF_TOKEN_INVALID',
          status: 403,
          requiresCSRFRefresh: true
        };
      }
      
      throw new Error(error.response?.data?.message || 'Failed to export services');
    }
  },
  
  getCategories: async () => {
    try {
      const response = await axiosInstance.get('/api/categories?isActive=true');
      
      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return response.data || [];
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories');
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

export { axiosInstance };