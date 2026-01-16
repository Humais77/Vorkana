import axios from 'axios';
import { toast } from 'react-hot-toast';
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Create admin axios instance with cookie support
const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Request': 'true'
  },
  withCredentials: true,
});

// Cache control for frontend
const cache = {
  memoryCache: new Map(),
  
  ttl: {
    list: 5 * 60 * 1000,
    item: 10 * 60 * 1000,
    dropdown: 10 * 60 * 1000,
    stats: 5 * 60 * 1000,
    export: 60 * 60 * 1000,
  },
  
  generateKey: (endpoint, params = {}) => {
    const key = `${endpoint}:${JSON.stringify(params)}`;
    return btoa(key).substring(0, 64);
  },
  
  get: (key) => {
    const cached = cache.memoryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      cache.memoryCache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  set: (key, data, ttl = cache.ttl.list) => {
    cache.memoryCache.set(key, {
      data,
      expiry: Date.now() + ttl,
      timestamp: new Date().toISOString()
    });
    
    if (cache.memoryCache.size > 100) {
      const firstKey = cache.memoryCache.keys().next().value;
      cache.memoryCache.delete(firstKey);
    }
  },
  
  delete: (pattern) => {
    if (pattern.includes('*')) {
      const prefix = pattern.replace('*', '');
      for (const key of cache.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          cache.memoryCache.delete(key);
        }
      }
    } else {
      cache.memoryCache.delete(pattern);
    }
  },
  
  clear: () => {
    cache.memoryCache.clear();
  },
  
  stats: () => ({
    size: cache.memoryCache.size,
    keys: Array.from(cache.memoryCache.keys()),
    entries: Array.from(cache.memoryCache.entries()).map(([key, value]) => ({
      key: key.substring(0, 50) + '...',
      expiry: new Date(value.expiry).toLocaleTimeString(),
      size: JSON.stringify(value.data).length
    }))
  })
};

// Request interceptor
adminApi.interceptors.request.use(
  (config) => {
    console.log('[ADMIN API] Request to:', config.url);
    
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    if (config.method === 'get' && config.params?.cache === false) {
      config.headers['X-Cache-Control'] = 'no-cache';
    }
    
    return config;
  },
  (error) => {
    console.error('[ADMIN API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

adminApi.interceptors.response.use(
  (response) => {
    console.log('[ADMIN API] Response from:', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    console.error('[ADMIN API] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      code: error.response?.data?.code
    });
    
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && 
        (error.response?.data?.code === 'ADMIN_SESSION_TIMEOUT' || 
         error.response?.data?.message?.includes('Admin session expired'))) {
      
      console.log('[ADMIN API] Admin session timeout detected');
      
      localStorage.removeItem('adminInfo');
      sessionStorage.removeItem('adminInfo');
      cache.clear();
      
      const message = error.response?.data?.message || 'Your admin session has expired after 1 hour of inactivity.';
      toast.error(message);
      
      setTimeout(() => {
        window.location.href = '/signin?adminSessionExpired=true';
      }, 1000);
      
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });
        
        console.log('[ADMIN API] Token refresh successful');
        return adminApi(originalRequest);
      } catch (refreshError) {
        console.error('[ADMIN API] Token refresh failed:', refreshError);
        
        localStorage.removeItem('adminInfo');
        sessionStorage.removeItem('adminInfo');
        cache.clear();
        
        if (window.location.pathname.startsWith('/admin')) {
          toast.error('Session expired. Please login again.');
          setTimeout(() => {
            window.location.href = '/signin?admin=true';
          }, 1000);
        }
      }
    }
    
    if (error.response?.status === 403 && error.response?.data?.code === 'ADMIN_ACCESS_REQUIRED') {
      toast.error('Admin privileges required to access this page.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
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

// Cache-aware API calls
const createCachedApiCall = (apiCall, cacheKey, ttlType = 'list') => {
  return async (...args) => {
    const params = args[0] || {};
    if (params.cache === false) {
      delete params.cache;
      return apiCall(...args);
    }
    
    const key = cache.generateKey(cacheKey, params);
    
    const cachedData = cache.get(key);
    if (cachedData) {
      console.log('[ADMIN API] Frontend cache HIT for:', cacheKey);
      return { data: { ...cachedData, _cached: true, _cacheKey: key } };
    }
    
    const response = await apiCall(...args);
    
    if (response.data && response.data.success !== false) {
      cache.set(key, response.data, cache.ttl[ttlType]);
    }
    
    return response;
  };
};

// Cache invalidation helpers
const invalidateCache = (pattern) => {
  cache.delete(pattern);
  console.log('[ADMIN API] Invalidated cache pattern:', pattern);
};

// Export the cache object for manual control
export const adminCache = {
  ...cache,
  invalidate: invalidateCache
};

export const adminAPI = {
  // Dashboard
  getDashboardStats: createCachedApiCall(
    () => adminApi.get('/api/admin/dashboard'),
    'admin:dashboard:stats',
    'stats'
  ),
  
  getRealtimeMetrics: createCachedApiCall(
    () => adminApi.get('/api/admin/dashboard/realtime'),
    'admin:dashboard:realtime',
    'stats'
  ),
  
  getChartData: createCachedApiCall(
    (chartType, timeRange = '7d') => 
      adminApi.get(`/api/admin/dashboard/charts/${chartType}`, {
        params: { range: timeRange }
      }),
    'admin:dashboard:charts',
    'stats'
  ),
  
  getRecentActivities: createCachedApiCall(
    (limit = 10) => 
      adminApi.get('/api/admin/dashboard/activities', {
        params: { limit }
      }),
    'admin:dashboard:activities',
    'stats'
  ),
  
  // Users
  getUsers: createCachedApiCall(
    (params) => adminApi.get('/api/admin/users', { params }),
    'admin:users:list',
    'list'
  ),
  
  getUserById: createCachedApiCall(
    (id) => adminApi.get(`/api/admin/users/${id}`),
    (id) => `admin:users:item:${id}`,
    'item'
  ),
  
  createUser: (data) => {
    invalidateCache('admin:users:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/users', data);
  },
  
  updateUser: (id, data) => {
    invalidateCache(`admin:users:item:${id}`);
    invalidateCache('admin:users:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.put(`/api/admin/users/${id}`, data);
  },
  
  deleteUser: (id, options = {}) => {
    console.log('[ADMIN API] Deleting user:', { id, options });
    
    let userId = id;
    if (typeof id === 'object') {
      userId = id._id || id.id || id;
    }
    
    userId = String(userId).trim();
    
    invalidateCache(`admin:users:item:${userId}`);
    invalidateCache('admin:users:list:*');
    invalidateCache('admin:dashboard:*');
    
    return adminApi.delete(`/api/admin/users/${encodeURIComponent(userId)}`, {
      params: {
        permanent: String(options.permanent || false).toLowerCase(),
        force: String(options.force || false).toLowerCase(),
        reason: options.reason || ''
      }
    });
  },
  
  bulkUpdateUsers: ({ ids, operation, data = {} }) => {
    invalidateCache('admin:users:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/users/bulk-action', { ids, operation, data });
  },
  
  exportUsers: (format = 'csv') => 
    adminApi.get('/api/admin/users/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
  // Categories (NO SUB-CATEGORIES HERE)
  getCategories: createCachedApiCall(
    (params) => adminApi.get('/api/admin/categories', { params }),
    'admin:categories:list',
    'list'
  ),
  
  getCategoryById: createCachedApiCall(
    (id) => adminApi.get(`/api/admin/categories/${id}`),
    (id) => `admin:categories:item:${id}`,
    'item'
  ),
  
  createCategory: (data) => {
    // Categories and subcategories are now separate, so only invalidate category cache
    invalidateCache('admin:categories:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/categories', data);
  },
  
  updateCategory: (id, data) => {
    invalidateCache(`admin:categories:item:${id}`);
    invalidateCache('admin:categories:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.put(`/api/admin/categories/${id}`, data);
  },
  
  deleteCategory: (id, params = {}) => {
    invalidateCache(`admin:categories:item:${id}`);
    invalidateCache('admin:categories:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.delete(`/api/admin/categories/${id}`, { params });
  },
  
  getCategoryStats: createCachedApiCall(
    () => adminApi.get('/api/admin/categories/analytics'),
    'admin:categories:stats',
    'stats'
  ),
  
  exportCategories: (format = 'csv') => 
    adminApi.get('/api/admin/categories/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
  bulkUpdateCategories: ({ ids, operation, data = {} }) => {
    invalidateCache('admin:categories:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/categories/bulk-action', { ids, operation, data });
  },
  
  // Subcategories (SEPARATE FROM CATEGORIES)
  getSubcategories: createCachedApiCall(
    (params) => adminApi.get('/api/admin/subcategories', { params }),
    'admin:subcategories:list',
    'list'
  ),
  
  getSubcategoryById: createCachedApiCall(
    (id) => adminApi.get(`/api/admin/subcategories/${id}`),
    (id) => `admin:subcategories:item:${id}`,
    'item'
  ),
  
  createSubcategory: (data) => {
    invalidateCache('admin:subcategories:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/subcategories', data);
  },
  
  updateSubcategory: (id, data) => {
    invalidateCache(`admin:subcategories:item:${id}`);
    invalidateCache('admin:subcategories:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.put(`/api/admin/subcategories/${id}`, data);
  },
  
  deleteSubcategory: (id, params = {}) => {
    invalidateCache(`admin:subcategories:item:${id}`);
    invalidateCache('admin:subcategories:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.delete(`/api/admin/subcategories/${id}`, { params });
  },
  
  bulkUpdateSubcategories: ({ ids, operation, data = {} }) => {
    invalidateCache('admin:subcategories:*');
    return adminApi.post('/api/admin/subcategories/bulk', { ids, operation, data });
  },
  
  getSubcategoryStats: createCachedApiCall(
    () => adminApi.get('/api/admin/subcategories/stats'),
    'admin:subcategories:stats',
    'stats'
  ),
  
  exportSubcategories: (format = 'csv') => 
    adminApi.get('/api/admin/subcategories/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
  // Services
  getServices: createCachedApiCall(
    (params) => adminApi.get('/api/admin/services', { 
      params: {
        ...params,
        populateSubcategories: true // Keep this for service-subcategory relationship
      }
    }),
    'admin:services:list',
    'list'
  ),
  
  getServiceById: createCachedApiCall(
    (id) => adminApi.get(`/api/admin/services/${id}`, {
      params: { 
        includeCommunication: true,
        populateSubcategories: true,
        includeFullDetails: true
      }
    }),
    (id) => `admin:services:item:${id}`,
    'item'
  ),
  
  createService: (data) => {
    invalidateCache('admin:services:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/services', data);
  },
  
  updateService: (id, data) => {
    invalidateCache(`admin:services:item:${id}`);
    invalidateCache('admin:services:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.put(`/api/admin/services/${id}`, data);
  },
  
  restoreService: (id) => {
    invalidateCache(`admin:services:item:${id}`);
    invalidateCache('admin:services:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post(`/api/admin/services/${id}/restore`);
  },
  
  bulkRestoreServices: (ids) => {
    invalidateCache('admin:services:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/services/bulk/restore', { ids });
  },
  
  deleteService: (id, options = {}) => {
    invalidateCache(`admin:services:item:${id}`);
    invalidateCache('admin:services:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.delete(`/api/admin/services/${id}`, { 
      params: {
        permanent: String(options.permanent || false).toLowerCase(),
        force: String(options.force || false).toLowerCase(),
        reason: options.reason || ''
      }
    });
  },
  
  bulkUpdateServices: ({ ids, operation, data = {} }) => {
    invalidateCache('admin:services:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/services/bulk', { ids, operation, data });
  },
  
  exportServices: (format = 'csv') => 
    adminApi.get('/api/services/admin/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
  getServiceStats: createCachedApiCall(
    () => adminApi.get('/api/admin/services/stats'),
    'admin:services:stats',
    'stats'
  ),
  
  // Gigs
  getGigs: createCachedApiCall(
    (params) => adminApi.get('/api/admin/gigs', { params }),
    'admin:gigs:list',
    'list'
  ),
  
  getGigById: createCachedApiCall(
    (id) => adminApi.get(`/api/admin/gigs/${id}`, {
      params: { includeCommunication: true }
    }),
    (id) => `admin:gigs:item:${id}`,
    'item'
  ),
  
  createGig: (data) => {
    invalidateCache('admin:gigs:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/gigs', data);
  },
  
  updateGig: (id, data) => {
    invalidateCache(`admin:gigs:item:${id}`);
    invalidateCache('admin:gigs:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.put(`/api/admin/gigs/${id}`, data);
  },
  
  deleteGig: (id, params = {}) => {
    invalidateCache(`admin:gigs:item:${id}`);
    invalidateCache('admin:gigs:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.delete(`/api/admin/gigs/${id}`, { params });
  },
  
  bulkUpdateGigs: (data) => {
    invalidateCache('admin:gigs:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/gigs/bulk', data);
  },
  
  exportGigs: (format = 'csv') => 
    adminApi.get('/api/admin/gigs/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
  getGigStats: createCachedApiCall(
    () => adminApi.get('/api/admin/gigs/stats'),
    'admin:gigs:stats',
    'stats'
  ),
  
  // Dropdowns
  getCategoriesForDropdown: createCachedApiCall(
    () => adminApi.get('/api/admin/categories/dropdown', {
      params: { active: true, limit: 100 }
    }),
    'admin:categories:dropdown',
    'dropdown'
  ),
  

  getSubcategoriesForDropdown: createCachedApiCall(
    (categoryId = null) => {
      const params = { active: true, limit: 100 };
      if (categoryId) params.categoryId = categoryId;
      return adminApi.get('/api/admin/subcategories/dropdown', { params });
    },
    (categoryId) => `admin:subcategories:dropdown:${categoryId || 'all'}`,
    'dropdown'
  ),
  
  getUsersForDropdown: createCachedApiCall(
    (role = '') => 
      adminApi.get('/api/admin/users/dropdown', {
        params: { role, limit: 100 }
      }),
    (role) => `admin:users:dropdown:${role || 'all'}`,
    'dropdown'
  ),
  
  // Restore operations
  restoreCategory: (id) => {
    invalidateCache(`admin:categories:item:${id}`);
    invalidateCache('admin:categories:list:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post(`/api/admin/categories/${id}/restore`);
  },
  
  bulkRestoreCategories: (ids) => {
    invalidateCache('admin:categories:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/admin/categories/bulk/restore', { ids });
  },
  
  // Recent Activity
  getRecentActivity: createCachedApiCall(
    async (limit = 10) => {
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
    'admin:activity:recent',
    'stats'
  ),
  
  // System
  getSystemHealth: createCachedApiCall(
    () => adminApi.get('/api/admin/system/health'),
    'admin:system:health',
    'stats'
  ),
  
  repairCategoryCounts: () => {
    invalidateCache('admin:categories:*');
    invalidateCache('admin:dashboard:*');
    return adminApi.post('/api/categories/repair-counts');
  },
  
  // Authentication
  adminLogout: () => {
    cache.clear();
    return adminApi.post('/api/admin/logout');
  },
  
  verifyAdminSession: createCachedApiCall(
    () => adminApi.get('/api/admin/verify-session'),
    'admin:session',
    'item'
  ),
  
  // Cache management
  clearCache: (type = 'all') => {
    if (type === 'all') {
      cache.clear();
      console.log('[ADMIN API] Cleared all frontend cache');
    } else {
      invalidateCache(`admin:${type}:*`);
      console.log(`[ADMIN API] Cleared frontend cache for: ${type}`);
    }
    
    return { success: true, message: 'Cache cleared' };
  },
  
  getCacheStats: () => {
    return cache.stats();
  }
};

export const clearAdminCache = (pattern = 'admin:*') => {
  invalidateCache(pattern);
};

window.addEventListener('beforeunload', () => {
});

if (process.env.NODE_ENV === 'development') {
  window.adminCache = cache;
}