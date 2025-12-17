import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Request': 'true'
  }
});

// Request interceptor
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
adminApi.interceptors.response.use(
  (response) => {
    // Transform responses to consistent format
    if (response.data && typeof response.data === 'object') {
      return {
        ...response,
        data: {
          success: true,
          ...response.data
        }
      };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (!refreshToken) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminRefreshToken');
          window.location.href = '/admin/login';
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/api/admin/refresh-token`, {
          refreshToken
        });
        
        if (response.data.success) {
          localStorage.setItem('adminToken', response.data.token);
          localStorage.setItem('adminRefreshToken', response.data.refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          return adminApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/admin/login';
      }
    }
    
    // Transform error response
    if (error.response?.data) {
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            success: false,
            message: error.response.data.message || 'An error occurred',
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
  
  // Categories
  getCategories: (params) => adminApi.get('/api/admin/categories', { params }),
  getCategoryById: (id) => adminApi.get(`/api/admin/categories/${id}`),
  createCategory: (data) => adminApi.post('/api/admin/categories', data),
  updateCategory: (id, data) => adminApi.put(`/api/admin/categories/${id}`, data),
  deleteCategory: (id) => adminApi.delete(`/api/admin/categories/${id}`),
  // Add to your admin.js API file
bulkUpdateCategories: async ({ ids, operation, data = {} }) => {
  return axios.post('/api/admin/categories/bulk-update', {
    ids,
    operation,
    data
  });
},
  getCategoryStats: () => adminApi.get('/api/admin/categories/stats'),
  
  // Services & Gigs
  // Add to your existing adminAPI object in admin.js

// Services
getServices: (params) => {
  // For admin, use the admin-specific endpoint
  if (params.isAdmin) {
    return adminApi.get('/api/services/admin/services', { params });
  }
  return adminApi.get('/api/admin/services', { params });
},
getServiceById: (id) => adminApi.get(`/api/admin/services/${id}`),
createService: (data) => adminApi.post('/api/admin/services', data),
updateService: (id, data) => adminApi.put(`/api/admin/services/${id}`, data),
deleteService: (id) => adminApi.delete(`/api/admin/services/${id}`),
bulkUpdateServices: (data) => adminApi.post('/api/admin/services/bulk', data),
exportServices: (format = 'csv') => 
  adminApi.get('/api/admin/services/export', { 
    params: { format },
    responseType: 'blob'
  }),
getServiceStats: () => adminApi.get('/api/admin/services/stats'),
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
  deleteGig: (id) => adminApi.delete(`/api/admin/gigs/${id}`),
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
