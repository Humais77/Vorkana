import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// In adminApi.js - Enhanced interceptor
const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Request': 'true'
  },
  // Add withCredentials for cookies
  withCredentials: true
});

// Request interceptor - FIXED version
adminApi.interceptors.request.use(
  (config) => {
    console.log('[ADMIN API] Request to:', config.url);
    
    // Try multiple token sources
    let token = null;
    
    // 1. Check localStorage
    token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
    console.log('[ADMIN API] Token from localStorage:', token ? 'Present' : 'Missing');
    
    // 2. Check cookies (will be sent automatically with withCredentials)
    
    // 3. Check sessionStorage as fallback
    if (!token) {
      token = sessionStorage.getItem('adminToken');
      console.log('[ADMIN API] Token from sessionStorage:', token ? 'Present' : 'Missing');
    }
    
    if (token) {
      // Clean the token (remove quotes if present)
      token = token.replace(/^"(.*)"$/, '$1').trim();
      console.log('[ADMIN API] Setting Authorization header');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[ADMIN API] No token found for request');
    }
    
    // Add CSRF token if available
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    console.log('[ADMIN API] Request headers:', {
      Authorization: config.headers.Authorization ? 'Present' : 'Missing',
      'X-CSRF-Token': config.headers['X-CSRF-Token'] ? 'Present' : 'Missing'
    });
    
    return config;
  },
  (error) => {
    console.error('[ADMIN API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - FIXED version
adminApi.interceptors.response.use(
  (response) => {
    console.log('[ADMIN API] Response from:', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    console.error('[ADMIN API] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('[ADMIN API] Attempting token refresh...');
      
      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (!refreshToken) {
          console.warn('[ADMIN API] No refresh token available');
          // Redirect to login
          window.location.href = '/admin/login';
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/api/admin/refresh-token`, {
          refreshToken
        }, {
          withCredentials: true
        });
        
        if (response.data.success) {
          console.log('[ADMIN API] Token refresh successful');
          localStorage.setItem('adminToken', response.data.token);
          localStorage.setItem('adminRefreshToken', response.data.refreshToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          return adminApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('[ADMIN API] Token refresh failed:', refreshError);
        // Clear tokens and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/admin/login';
      }
    }
    
    // Handle other errors
    if (error.response?.data) {
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            success: false,
            message: error.response.data.message || 'An error occurred',
            code: error.response.data.code || 'UNKNOWN_ERROR',
            ...error.response.data
          }
        }
      });
    }
    
    return Promise.reject(error);
  }
);
export const adminAPI = {
  // Dashboard - returns comprehensive data
  getDashboardStats: () => adminApi.get('/api/admin/dashboard'),
  
  // Enhanced dashboard endpoints
  getRealtimeMetrics: () => adminApi.get('/api/admin/dashboard/realtime'),
  
  getChartData: (chartType, timeRange = '7d') => 
    adminApi.get(`/api/admin/dashboard/charts/${chartType}`, {
      params: { range: timeRange }
    }),
  
  getRecentActivities: (limit = 10) => 
    adminApi.get('/api/admin/dashboard/activities', {
      params: { limit }
    }),
  
  // Users
  getUsers: (params) => adminApi.get('/api/admin/users', { params }),
  getUserById: (id) => adminApi.get(`/api/admin/users/${id}`),
  createUser: (data) => adminApi.post('/api/admin/users', data),
  updateUser: (id, data) => adminApi.put(`/api/admin/users/${id}`, data),
  deleteUser: (id) => adminApi.delete(`/api/admin/users/${id}`),
  bulkUpdateUsers: (data) => adminApi.post('/api/admin/users/bulk', data),
  exportUsers: (format = 'csv') => 
    adminApi.get('/api/admin/users/export', { 
      params: { format },
      responseType: 'blob'
    }),
 getCategories: (params) => adminApi.get('/api/admin/categories', { params }),
  getCategoryById: (id) => adminApi.get(`/api/admin/categories/${id}`),
  createCategory: (data) => adminApi.post('/api/admin/categories', data),
  updateCategory: (id, data) => adminApi.put(`/api/admin/categories/${id}`, data),
  deleteCategory: (id) => adminApi.delete(`/api/admin/categories/${id}`),
  
  // Fix bulk update categories endpoint
  bulkUpdateCategories: ({ ids, operation, data = {} }) => 
    adminApi.post('/api/admin/categories/bulk-action', { ids, operation, data }),
  getSubcategories: (params) => adminApi.get('/api/admin/subcategories', { params }),
  getSubcategoryById: (id) => adminApi.get(`/api/admin/subcategories/${id}`),
  createSubcategory: (data) => adminApi.post('/api/admin/subcategories', data),
  updateSubcategory: (id, data) => adminApi.put(`/api/admin/subcategories/${id}`, data),
  deleteSubcategory: (id, params = {}) => adminApi.delete(`/api/admin/subcategories/${id}`, { params }),
  bulkUpdateSubcategories: ({ ids, operation, data = {} }) => 
    adminApi.post('/api/admin/subcategories/bulk', { ids, operation, data }),
  
    
getServices: (params) => adminApi.get('/api/admin/services', { params }),
  getServiceById: (id) => adminApi.get(`/api/admin/services/${id}`),
  createService: (data) => adminApi.post('/api/admin/services', data), // You need to add this route
  updateService: (id, data) => adminApi.put(`/api/admin/services/${id}`, data),
  deleteService: (id) => adminApi.delete(`/api/admin/services/${id}`),
  bulkUpdateServices: ({ ids, operation, data = {} }) => 
    adminApi.post('/api/admin/services/bulk', { ids, operation, data }),
exportServices: (format = 'csv') => 
  adminApi.get('/api/services/admin/export', { 
    params: { format },
    responseType: 'blob'
  }),
getServiceStats: () => adminApi.get('/api/services/admin/stats'),
  // Security
  getSecurityLogs: (params) => adminApi.get('/api/admin/security/logs', { params }),
  getSecurityStats: () => adminApi.get('/api/admin/security/stats'),
  
  // Activity
  getActivityLogs: (params) => adminApi.get('/api/admin/activity/logs', { params }),
  
  // System
  getSystemHealth: () => adminApi.get('/api/admin/system/health'),
  
  // Authentication
  adminLogin: (credentials) => adminApi.post('/api/admin/login', credentials),
  adminLogout: () => adminApi.post('/api/admin/logout'),
  verifyAdminSession: () => adminApi.get('/api/admin/verify-session'),
  
  // Settings
  updateSettings: (data) => adminApi.put('/api/admin/settings', data),
  getSettings: () => adminApi.get('/api/admin/settings'),
  
  // Uploads
  uploadImage: (file, type = 'category') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    
    return adminApi.post('/api/admin/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  // Analytics
  getAnalytics: (params) => adminApi.get('/api/admin/analytics', { params }),
  
 getGigs: (params) => adminApi.get('/api/admin/gigs', { params }),
  getGigById: (id) => adminApi.get(`/api/admin/gigs/${id}`),
  createGig: (data) => adminApi.post('/api/admin/gigs', data),
  updateGig: (id, data) => adminApi.put(`/api/admin/gigs/${id}`, data),
deleteGig: (id, params = {}) => adminApi.delete(`/api/admin/gigs/${id}`, { params }),
  bulkUpdateGigs: (data) => adminApi.post('/api/admin/gigs/bulk', data),
  exportGigs: (format = 'csv') => 
    adminApi.get('/api/admin/gigs/export', { 
      params: { format },
      responseType: 'blob'
    }),
  getGigStats: () => adminApi.get('/api/admin/gigs/stats'),
  
  // Get categories for dropdowns
  getCategoriesForDropdown: () => 
    adminApi.get('/api/admin/categories/dropdown', {
      params: { active: true, limit: 100 }
    }),
    
  // Get users for dropdown (clients/freelancers)
  getUsersForDropdown: (role = '') => 
    adminApi.get('/api/admin/users/dropdown', {
      params: { role, limit: 100 }
    }),
  
};
