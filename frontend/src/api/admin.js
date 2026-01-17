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

const cache = {
  memoryCache: new Map(),
  maxSize: 100,
 ttl: {
    list: 2 * 60 * 1000,    
    item: 5 * 60 * 1000,   
    dropdown: 5 * 60 * 1000,
    stats: 2 * 60 * 1000,   
    export: 30 * 60 * 1000,
  },
  
  generateKey: (endpoint, params = {}) => {
    // Remove undefined/null/empty params
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    });
    
    const keyStr = `${endpoint}:${JSON.stringify(cleanParams)}`;
    // Create consistent hash
    const hash = btoa(keyStr).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
    return hash;
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
    // Don't cache empty results or errors
    if (!data || data.success === false || (data.data && data.data.length === 0)) {
      return;
    }
    
    // Prevent circular references by creating a clean copy
    const cleanData = JSON.parse(JSON.stringify(data));
    
    cache.memoryCache.set(key, {
      data: cleanData,
      expiry: Date.now() + ttl,
      timestamp: new Date().toISOString()
    });
    
    // ENFORCE cache size limit aggressively
    if (cache.memoryCache.size > cache.maxSize) {
      // Remove oldest entries first
      const keys = Array.from(cache.memoryCache.keys());
      const keysToDelete = keys.slice(0, keys.length - cache.maxSize);
      
      keysToDelete.forEach(key => {
        cache.memoryCache.delete(key);
      });
      
      console.log(`[CACHE] Trimmed ${keysToDelete.length} entries, current size: ${cache.memoryCache.size}`);
    }
    
    // Schedule automatic cleanup for this entry
    setTimeout(() => {
      if (cache.memoryCache.has(key)) {
        cache.memoryCache.delete(key);
      }
    }, ttl + 10000); // 10 seconds grace period
  },
  
  clearExpired: () => {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of cache.memoryCache.entries()) {
      if (now > entry.expiry) {
        cache.memoryCache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[CACHE CLEANUP] Removed ${deletedCount} expired entries`);
    }
  },
  
  // Add memory usage monitoring
  getMemoryUsage: () => {
    const entries = Array.from(cache.memoryCache.entries());
    let totalSize = 0;
    
    entries.forEach(([key, value]) => {
      try {
        const keySize = new Blob([key]).size;
        const valueSize = new Blob([JSON.stringify(value)]).size;
        totalSize += keySize + valueSize;
      } catch (e) {
        // Ignore serialization errors
      }
    });
    
    return {
      entries: cache.memoryCache.size,
      approximateSize: `${Math.round(totalSize / 1024)} KB`,
      maxSize: cache.maxSize,
      hitRate: 'N/A' // Would need to track hits/misses
    };
  },
  
  // Add periodic cleanup
  startCleanupInterval: () => {
    // Clean expired entries every minute
    setInterval(() => {
      cache.clearExpired();
      
      // Log memory usage periodically
      const usage = cache.getMemoryUsage();
      console.log(`[CACHE MEMORY] ${usage.entries} entries, ${usage.approximateSize}`);
    }, 60000); // Every minute
  },
  
  
  delete: (pattern) => {
    const keysToDelete = [];
    
    for (const key of cache.memoryCache.keys()) {
      if (pattern === 'all' || key.startsWith(pattern.replace('*', ''))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.memoryCache.delete(key));
  },
  
  clearAllCategoryCache: () => {
    cache.delete('admin:categories');
    cache.delete('admin:dashboard');
    console.log('[CACHE] Cleared all category-related cache');
  },
  
  clearCategoryListCache: () => {
    cache.delete('admin:categories:list');
    console.log('[CACHE] Cleared category list cache');
  },
  
  clearSpecificCategoryCache: (categoryId) => {
    const pattern = `admin:categories:${categoryId}`;
    cache.delete(pattern);
    console.log(`[CACHE] Cleared cache for category: ${categoryId}`);
  },
  clearAllSubcategoryCache: () => {
    cache.delete('admin:subcategories');
    cache.delete('admin:dashboard');
    console.log('[CACHE] Cleared all subcategory-related cache');
  },
  
  clearSubcategoryListCache: () => {
    cache.delete('admin:subcategories:list');
    console.log('[CACHE] Cleared subcategory list cache');
  },
  
  clearSpecificSubcategoryCache: (subcategoryId) => {
    const pattern = `admin:subcategories:${subcategoryId}`;
    cache.delete(pattern);
    console.log(`[CACHE] Cleared cache for subcategory: ${subcategoryId}`);
  }
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

const createCachedApiCall = (apiCall, cacheKey, ttlType = 'list') => {
  return async (...args) => {
    const params = args[0] || {};
    
    // Skip cache if explicitly requested
    if (params.cache === false || params._refresh) {
      delete params.cache;
      delete params._refresh;
      return apiCall(...args);
    }
    
    const key = cache.generateKey(cacheKey, params);
    const cachedData = cache.get(key);
    
    if (cachedData) {
      console.log('[CACHE HIT]', cacheKey);
      return { data: { ...cachedData, _cached: true } };
    }
    
    const response = await apiCall(...args);
    
    // Only cache successful responses
    if (response.data && response.data.success !== false) {
      cache.set(key, response.data, cache.ttl[ttlType]);
    }
    
    return response;
  };
};

// Cache invalidation helpers
const invalidateCategoryCache = () => {
  cache.clearAllCategoryCache();
};

const invalidateSpecificCategoryCache = (categoryId) => {
  cache.clearSpecificCategoryCache(categoryId);
};
const invalidateSubcategoryCache = () => {
  cache.clearAllSubcategoryCache();
};

const invalidateSpecificSubcategoryCache = (subcategoryId) => {
  cache.clearSpecificSubcategoryCache(subcategoryId);
};

// Cache invalidation helpers
const invalidateCache = (pattern) => {
  cache.delete(pattern);
  console.log('[ADMIN API] Invalidated cache pattern:', pattern);
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
   getCategories: (params) => {
    // Add a timestamp or random parameter to bypass cache when refresh is needed
    const queryParams = { ...params };
    if (params._refresh) {
      queryParams._t = Date.now();
    }
    return adminApi.get('/api/admin/categories', { params: queryParams });
  },
  
  getCategoryById: createCachedApiCall(
    (id) => adminApi.get(`/api/admin/categories/${id}`),
    (id) => `admin:categories:${id}`,
    'item'
  ),
  
 createCategory: async (data) => {
    try {
      const response = await adminApi.post('/api/admin/categories', data);
      
      // Force clear frontend cache
      invalidateCategoryCache();
      cache.clearAllCategoryCache();
      
      // Show success message
      if (response.data.success) {
        toast.success('Category created successfully');
      }
      
      return response;
    } catch (error) {
      console.error('[CREATE CATEGORY ERROR]', error);
      throw error;
    }
  },
  
  updateCategory: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/admin/categories/${id}`, data);
      
      // Force clear frontend cache
      invalidateSpecificCategoryCache(id);
      cache.clearCategoryListCache();
      invalidateCategoryCache();
      
      // Show success message
      if (response.data.success) {
        toast.success('Category updated successfully');
      }
      
      return response;
    } catch (error) {
      console.error('[UPDATE CATEGORY ERROR]', error);
      throw error;
    }
  },
  
  deleteCategory: async (id, params = {}) => {
    try {
      const response = await adminApi.delete(`/api/admin/categories/${id}`, { params });
      
      // Force clear all cache
      invalidateSpecificCategoryCache(id);
      cache.clearCategoryListCache();
      invalidateCategoryCache();
      cache.delete('admin:dashboard:*');
      
      // Show success message based on deletion type
      if (response.data.success) {
        const message = params.permanent === 'true' 
          ? 'Category permanently deleted' 
          : 'Category soft deleted successfully';
        toast.success(message);
      }
      
      return response;
    } catch (error) {
      console.error('[DELETE CATEGORY ERROR]', error);
      throw error;
    }
  },
  
  bulkUpdateCategories: async ({ ids, operation, data = {} }) => {
    try {
      // Clear all category cache before bulk operation
      invalidateCategoryCache();
      
      const response = await adminApi.post('/api/admin/categories/bulk-action', { 
        ids, 
        operation, 
        data 
      });
      
      if (response.data.success) {
        toast.success(`Successfully ${operation}d ${ids.length} categories`);
      }
      
      return response;
    } catch (error) {
      console.error('[BULK UPDATE CATEGORIES ERROR]', error);
      throw error;
    }
  },
  
  exportCategories: (format = 'csv') => 
    adminApi.get('/api/admin/categories/export', { 
      params: { format },
      responseType: 'blob'
    }),
  
  getCategoryStats: createCachedApiCall(
    () => adminApi.get('/api/admin/categories/analytics'),
    'admin:categories:stats',
    'stats'
  ),
  
  // Restore category
  restoreCategory: async (id) => {
    try {
      invalidateCategoryCache();
      invalidateSpecificCategoryCache(id);
      
      const response = await adminApi.post(`/api/admin/categories/${id}/restore`);
      
      if (response.data.success) {
        toast.success('Category restored successfully');
      }
      
      return response;
    } catch (error) {
      console.error('[RESTORE CATEGORY ERROR]', error);
      throw error;
    }
  },
  
  // Export the cache object for manual control
  cache,
  
  // Cache management
  invalidateCache: (pattern = 'admin:*') => {
    cache.delete(pattern);
  },
  
  clearAllCache: () => {
    cache.delete('all');
    console.log('[CACHE] Cleared all cache');
  },
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
  
  createSubcategory: async (data) => {
    try {
      console.log('[API CREATE SUBCATEGORY] Sending data:', data);
      const response = await adminApi.post('/api/admin/subcategories', data);
      console.log('[API CREATE SUBCATEGORY] Response:', response.data);
      
      // Force clear frontend cache
      invalidateSubcategoryCache();
      cache.clearAllSubcategoryCache();
      
      // Clear related categories cache since subcategories are linked
      cache.delete('admin:categories:*');
      
      // Show success message
      if (response.data.success) {
        toast.success('Subcategory created successfully');
      }
      
      return response;
    } catch (error) {
      console.error('[API CREATE SUBCATEGORY ERROR]', error);
      throw error;
    }
  },
  
  updateSubcategory: async (id, data) => {
    try {
      console.log('[API UPDATE SUBCATEGORY] Updating:', id, data);
      const response = await adminApi.put(`/api/admin/subcategories/${id}`, data);
      console.log('[API UPDATE SUBCATEGORY] Response:', response.data);
      
      // Force clear frontend cache
      invalidateSpecificSubcategoryCache(id);
      cache.clearSubcategoryListCache();
      invalidateSubcategoryCache();
      
      // Clear related categories cache
      if (data.category) {
        cache.delete(`admin:categories:${data.category}:*`);
      }
      
      // Show success message
      if (response.data.success) {
        toast.success('Subcategory updated successfully');
      }
      
      return response;
    } catch (error) {
      console.error('[API UPDATE SUBCATEGORY ERROR]', error);
      throw error;
    }
  },
  
  deleteSubcategory: async (id, params = {}) => {
    try {
      console.log('[API DELETE SUBCATEGORY] Deleting:', id, params);
      const response = await adminApi.delete(`/api/admin/subcategories/${id}`, { params });
      console.log('[API DELETE SUBCATEGORY] Response:', response.data);
      
      // Force clear all cache
      invalidateSpecificSubcategoryCache(id);
      cache.clearSubcategoryListCache();
      invalidateSubcategoryCache();
      cache.delete('admin:dashboard:*');
      
      // Clear related categories cache
      cache.delete('admin:categories:*');
      
      // Show success message based on deletion type
      if (response.data.success) {
        const message = params.permanent === 'true' 
          ? 'Subcategory permanently deleted' 
          : 'Subcategory soft deleted successfully';
        toast.success(message);
      }
      
      return response;
    } catch (error) {
      console.error('[API DELETE SUBCATEGORY ERROR]', error);
      throw error;
    }
  },
  
  bulkUpdateSubcategories: async ({ ids, operation, data = {} }) => {
    try {
      console.log('[API BULK UPDATE SUBCATEGORIES] Operation:', operation, 'IDs:', ids);
      // Clear all subcategory cache before bulk operation
      invalidateSubcategoryCache();
      
      const response = await adminApi.post('/api/admin/subcategories/bulk-action', { 
        ids, 
        operation, 
        data 
      });
      
      console.log('[API BULK UPDATE SUBCATEGORIES] Response:', response.data);
      
      if (response.data.success) {
        toast.success(`Successfully ${operation}d ${ids.length} subcategories`);
      }
      
      // Clear categories cache since subcategories are linked
      cache.delete('admin:categories:*');
      
      return response;
    } catch (error) {
      console.error('[API BULK UPDATE SUBCATEGORIES ERROR]', error);
      throw error;
    }
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
export const adminCache = {
  invalidateCategoryCache,
  invalidateSpecificCategoryCache,
  invalidateSubcategoryCache,
  invalidateSpecificSubcategoryCache,
  clearAll: () => cache.delete('all')
};

// Add event listeners for cache clearing
window.addEventListener('beforeunload', () => {
  // Keep cache for page reloads
});

if (typeof window !== 'undefined') {
  cache.startCleanupInterval();
}
if (process.env.NODE_ENV === 'development') {
  window.adminCache = cache;
}