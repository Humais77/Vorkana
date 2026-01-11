import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Create admin axios instance with cookie support
const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Request': 'true'
  },
  withCredentials: true, // IMPORTANT: Enables cookie sending
});

// Request interceptor - Simplified for cookies
adminApi.interceptors.request.use(
  (config) => {
    console.log('[ADMIN API] Request to:', config.url);
    
    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Cookies are sent automatically with withCredentials: true
    // No need to manually set Authorization header
    
    console.log('[ADMIN API] Request headers:', {
      'X-CSRF-Token': config.headers['X-CSRF-Token'] ? 'Present' : 'Missing',
      withCredentials: 'true'
    });
    
    return config;
  },
  (error) => {
    console.error('[ADMIN API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Updated for cookie-based auth
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
    
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('[ADMIN API] Attempting token refresh via cookie...');
      
      try {
        // Try to refresh token via cookie
        await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });
        
        console.log('[ADMIN API] Token refresh successful');
        
        // Retry original request
        return adminApi(originalRequest);
      } catch (refreshError) {
        console.error('[ADMIN API] Token refresh failed:', refreshError);
        
        // Clear admin state and redirect to login
        localStorage.removeItem('adminInfo');
        sessionStorage.removeItem('adminInfo');
        
        // Check if we're not already on login page
        if (!window.location.pathname.includes('/admin/login') &&
            !window.location.pathname.includes('/signin')) {
          window.location.href = '/admin/login';
        }
      }
    }
    
    // Handle 403 Forbidden (not admin)
    if (error.response?.status === 403) {
      if (!window.location.pathname.includes('/admin')) {
        window.location.href = '/';
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

// Helper function to get CSRF token from cookies
const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' || name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
};
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
  deleteUser: (id, options = {}) => {
  console.log('[ADMIN API] Deleting user:', { id, options });
  
  // Ensure ID is properly formatted
  let userId = id;
  if (typeof id === 'object') {
    userId = id._id || id.id || id;
  }
  
  // Clean up the ID
  userId = String(userId).trim();
  
  return adminApi.delete(`/api/admin/users/${encodeURIComponent(userId)}`, {
    params: {
      permanent: String(options.permanent || false).toLowerCase(),
      force: String(options.force || false).toLowerCase(),
      reason: options.reason || ''
    }
  });
},
  bulkUpdateUsers: ({ ids, operation, data = {} }) => 
  adminApi.post('/api/admin/users/bulk-action', { ids, operation, data }),
  exportUsers: (format = 'csv') => 
    adminApi.get('/api/admin/users/export', { 
      params: { format },
      responseType: 'blob'
    }),
 getCategories: (params) => adminApi.get('/api/admin/categories', { params }),
  getCategoryById: (id) => adminApi.get(`/api/admin/categories/${id}`),
  createCategory: (data) => adminApi.post('/api/admin/categories', data),
  updateCategory: (id, data) => adminApi.put(`/api/admin/categories/${id}`, data),
  deleteCategory: (id, params = {}) => adminApi.delete(`/api/admin/categories/${id}`, { params }),
  getCategoryStats: () => adminApi.get('/api/admin/categories/analytics'),
   exportCategories: (format = 'csv') => 
    adminApi.get('/api/admin/categories/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
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
  getSubcategoryStats: () => adminApi.get('/api/admin/subcategories/stats'),
exportSubcategories: (format = 'csv') => 
  adminApi.get('/api/admin/subcategories/export', { 
    params: { format },
    responseType: 'blob'
  }),
  getDashboardSubcategoryStats: () => 
  adminApi.get('/api/admin/dashboard/subcategories'),
    
 getServices: (params) => adminApi.get('/api/admin/services', { 
  params: {
    ...params,
    populateSubcategories: true
  }
}),
  
  getServiceById: (id) => adminApi.get(`/api/admin/services/${id}`, {
  params: { 
    includeCommunication: true,
    populateSubcategories: true 
  }
}),
  
  createService: (data) => adminApi.post('/api/admin/services', data), // You need to add this route
  updateService: (id, data) => adminApi.put(`/api/admin/services/${id}`, data),
deleteService: (id, options = {}) => 
  adminApi.delete(`/api/admin/services/${id}`, { 
    params: {
      permanent: String(options.permanent || false).toLowerCase(),
      force: String(options.force || false).toLowerCase(),
      reason: options.reason || ''
    }
  }),
  bulkUpdateServices: ({ ids, operation, data = {} }) => 
  adminApi.post('/api/admin/services/bulk', { ids, operation, data }),
exportServices: (format = 'csv') => 
  adminApi.get('/api/services/admin/export', { 
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
  getGigById: (id) => adminApi.get(`/api/admin/gigs/${id}`, {
  params: { includeCommunication: true }
}),

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
     getSubcategoriesDropdown: (categoryId, params = {}) => 
    adminApi.get(`/api/admin/categories/${categoryId}/subcategories/dropdown`, { params }),
  
    getSubcategoriesByCategory: (categoryId, params = {}) => 
  adminApi.get(`/api/admin/categories/${categoryId}/subcategories/dropdown`, { params }),
  // Get users for dropdown (clients/freelancers)
  getUsersForDropdown: (role = '') => 
    adminApi.get('/api/admin/users/dropdown', {
      params: { role, limit: 100 }
    }),
  getRecentActivity: async (limit = 10) => {
  try {
    const response = await axios.get(`/api/admin/activity/recent`, {
      
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
},
repairCategoryCounts: () => adminApi.post('/api/categories/repair-counts'),
};
