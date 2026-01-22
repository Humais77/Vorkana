const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');
const { 
  verifyAdmin,
  requirePermission,
  adminDashboardLimiter,
  auditLog,
  setAdminCookie,
  clearAdminCookies
} = require('../middleware/admin.middleware.js');
const serviceController = require('../controllers/services.controller.js');
const categoryController = require('../controllers/category.controller.js');
const subcategoryController = require('../controllers/subcategory.controller.js');
const gigController = require('../controllers/gig.controller.js');
const {logout} = require('../controllers/auth.controller.js');
const mongoose = require('mongoose');
// IMPORT MODELS
const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js');
const User = require('../models/user.model.js');
const cache = require('../utils/cache.js'); 

// Security: Admin-only rate limiting
const adminApiLimiter = adminDashboardLimiter;

// Cache middleware
const cacheMiddleware = (duration = 300, keyPrefix = '') => {
  return async (req, res, next) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip cache if explicitly disabled
    if (req.query.cache === 'false') {
      res.set('X-Cache', 'BYPASSED');
      return next();
    }
    
    // Generate cache key based on request
    const cacheKey = adminController.generateCacheKey(
      keyPrefix || `admin:${req.baseUrl}${req.path}`,
      {
        query: req.query,
        params: req.params,
        userRole: req.admin?.role,
        userId: req.admin?._id
      }
    );
    
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`Cache HIT: ${cacheKey}`);
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': duration
        });
        
        // If it's a full response object with success field
        if (cached.success !== undefined) {
          return res.json({
            ...cached,
            cached: true,
            requestId: req.headers['x-request-id'] || crypto.randomUUID(),
            timestamp: new Date().toISOString()
          });
        }
        
        // If it's just data
        return res.json({
          success: true,
          data: cached,
          cached: true,
          requestId: req.headers['x-request-id'] || crypto.randomUUID(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Add cache control to response
      res.set({
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey,
        'X-Cache-TTL': duration
      });
      
      // Store the original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Only cache successful responses
        if (data && data.success !== false) {
          cache.set(cacheKey, data, duration).catch(err => {
            console.warn('Cache set error:', err.message);
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

// Clear cache middleware (for POST/PUT/DELETE operations)
const clearCacheMiddleware = (resourceType) => {
  return async (req, res, next) => {
    // Store the original json method
    const originalJson = res.json;
    
    // Override json method to clear cache after successful operations
    res.json = function(data) {
      // Only clear cache on successful operations
      if (data && data.success !== false) {
        const clearCachePromises = [];
        
        // Clear specific resource cache
        if (resourceType && req.params.id) {
          clearCachePromises.push(
            adminController.invalidateSpecificCache(resourceType, req.params.id)
          );
        }
        
        // Clear list caches for the resource type
        if (resourceType) {
          clearCachePromises.push(
            adminController.invalidateAdminCache(resourceType)
          );
        }
        
        // Clear dashboard cache if relevant
        if (['users', 'gigs', 'services', 'categories', 'subcategories'].includes(resourceType)) {
          clearCachePromises.push(
            adminController.invalidateAdminCache('dashboard')
          );
        }
        
        // Execute all cache clearing in background
        Promise.allSettled(clearCachePromises).then(results => {
          const failed = results.filter(r => r.status === 'rejected');
          if (failed.length > 0) {
            console.warn('Some cache clearing failed:', failed.map(f => f.reason.message));
          }
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};
router.get('/dashboard', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('view_dashboard'),
  auditLog('VIEW_DASHBOARD', 'dashboard'),
  cacheMiddleware(300, 'admin:dashboard'), // Cache for 5 minutes
  adminController.getDashboardStats
);
router.post('/logout', 
  verifyAdmin,
  // Middleware to set admin logout flags
  (req, res, next) => {
    console.log('🛡️ Admin logout middleware triggered for:', {
      adminId: req.admin?._id,
      email: req.admin?.email
    });
    
    // Set flags for logout controller
    req.isAdminLogout = true;
    req.isAdmin = true;
    req.adminId = req.admin._id;
    
    // Also set user object for logout controller
    req.user = {
      _id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role
    };
    
    console.log('🛡️ Admin flags set:', {
      isAdminLogout: req.isAdminLogout,
      isAdmin: req.isAdmin,
      adminId: req.adminId
    });
    
    next();
  },
  // Call the logout controller
  logout
);

router.get('/session',
  verifyAdmin,
  cacheMiddleware(60, 'admin:session'), // Cache for 1 minute
  adminController.checkAdminSession
);

// ============================================
// SUBCATEGORY MANAGEMENT ROUTES
// ============================================
router.get('/categories/analytics', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_CATEGORY_ANALYTICS', 'categories'),
  cacheMiddleware(300, 'admin:categories:analytics'), // Cache for 5 minutes
  categoryController.getCategoryStats
);
router.get('/subcategories/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_SUBCATEGORY_STATS', 'categories'),
  cacheMiddleware(300, 'admin:subcategories:stats'), // Cache for 5 minutes
  adminController.getSubcategoryStats
);
router.get('/services/stats', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('view_analytics'),
  auditLog('VIEW_SERVICE_STATS', 'services'),
  cacheMiddleware(300, 'admin:services:stats'), // Cache for 5 minutes
  adminController.getServiceStats
);
router.post('/categories/repair-counts', 
  verifyAdmin,
  requirePermission('system_settings'),
  auditLog('REPAIR_CATEGORY_COUNTS', 'categories'),
  categoryController.repairCategoryCounts
);

router.post('/subcategories/repair-counts', 
  verifyAdmin,
  requirePermission('system_settings'),
  auditLog('REPAIR_SUBCATEGORY_COUNTS', 'categories'),
  subcategoryController.repairSubcategoryCounts
);

// Gig statistics
router.get('/gigs/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_GIG_STATS', 'gigs'),
  cacheMiddleware(300, 'admin:gigs:stats'), // Cache for 5 minutes
  async (req, res, next) => {
    req.user = { role: 'admin', _id: req.admin._id };
    next();
  },
  gigController.getGigStats // Use main gig controller
);

router.get('/categories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  cacheMiddleware(600, 'admin:categories:dropdown'),
  async (req, res) => {
    try {
      console.log('[CATEGORIES DROPDOWN] Fetching categories...');
      console.log('[CATEGORIES DROPDOWN] Query params:', req.query);
      
      const { 
        includeSubcategories = false, 
        showAll = false,
        onlyWithSubcategories = false 
      } = req.query;
      
      // Build filter
      const filter = { 
        isActive: true,
        deletedAt: null
      };
      
      // DEBUG: Log the filter being used
      console.log('[CATEGORIES DROPDOWN] Filter before allowSubcategories:', filter);
      
      // Only filter by allowSubcategories if explicitly requested
      if (onlyWithSubcategories === 'true') {
        filter.allowSubcategories = true;
      }
      // Remove allowSubcategories filter if showAll is true
      else if (showAll === 'true') {
        // Don't filter by allowSubcategories
        console.log('[CATEGORIES DROPDOWN] showAll=true, removing allowSubcategories filter');
      } else {
        // Default: show all active categories
        console.log('[CATEGORIES DROPDOWN] Using default filter (no allowSubcategories)');
      }
      
      console.log('[CATEGORIES DROPDOWN] Final filter:', filter);
      
      const categories = await Category.find(filter)
        .select('name slug icon parentCategory order isActive featured popular servicesCount gigsCount allowSubcategories')
        .sort({ order: 1, name: 1 })
        .lean();
      
      console.log(`[CATEGORIES DROPDOWN] Found ${categories.length} categories`);
      console.log('[CATEGORIES DROPDOWN] Categories found:', categories.map(c => ({
        name: c.name,
        allowSubcategories: c.allowSubcategories,
        id: c._id
      })));
      
      // If includeSubcategories is true, fetch subcategories
      if (includeSubcategories === 'true') {
        const categoryIds = categories.map(cat => cat._id);
        
        const subcategories = await Subcategory.find({
          category: { $in: categoryIds },
          isActive: true,
          deletedAt: null
        })
        .select('name slug icon category order isActive description servicesCount gigsCount')
        .sort({ order: 1, name: 1 })
        .lean();
        
        const subcategoriesByCategory = {};
        subcategories.forEach(sub => {
          const catId = sub.category.toString();
          if (!subcategoriesByCategory[catId]) {
            subcategoriesByCategory[catId] = [];
          }
          subcategoriesByCategory[catId].push(sub);
        });
        
        categories.forEach(category => {
          const catId = category._id.toString();
          category.subcategories = subcategoriesByCategory[catId] || [];
          category.subcategoriesCount = category.subcategories.length;
        });
      }
      
      res.json({
        success: true,
        data: categories,
        count: categories.length,
        filterUsed: filter,
        queryParams: req.query
      });
    } catch (error) {
      console.error('[CATEGORIES DROPDOWN ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);
router.get('/categories/:categoryId/subcategories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORIES_DROPDOWN', 'categories'),
  cacheMiddleware(600, 'admin:subcategories:dropdown:bycategory'), // Cache for 10 minutes
  adminController.getSubcategoriesDropdown
);

router.get('/subcategories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  cacheMiddleware(600, 'admin:subcategories:dropdown'), // Cache for 10 minutes
  async (req, res) => {
    try {
      console.log('[SUBCATEGORIES DROPDOWN] Fetching subcategories...');
      console.log('[SUBCATEGORIES DROPDOWN] Admin user:', req.admin?.email);
      
      const { categoryId } = req.query;
      
      const filter = {
        isActive: true,
        deletedAt: null
      };
      
      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        filter.category = categoryId;
      }
      
      const subcategories = await Subcategory.find(filter)
        .select('name slug icon description category order')
        .populate('category', 'name slug')
        .sort({ order: 1, name: 1 })
        .lean();
      
      console.log(`[SUBCATEGORIES DROPDOWN] Found ${subcategories.length} subcategories`);
      
      res.json({
        success: true,
        data: subcategories
      });
    } catch (error) {
      console.error('[SUBCATEGORIES DROPDOWN ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subcategories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
// Get all subcategories with pagination and filtering
router.get('/subcategories', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORIES', 'categories'),
  cacheMiddleware(300, 'admin:subcategories'),
  async (req, res, next) => {
    try {
      // Create a clean query object for subcategories
      const cleanQuery = {};
      
      // Copy only non-empty parameters
      for (const [key, value] of Object.entries(req.query)) {
        if (value === '') continue;
        
        if (['page', 'limit', 'order'].includes(key)) {
          cleanQuery[key] = parseInt(value) || (key === 'page' ? 1 : key === 'limit' ? 20 : 0);
        }
        else if (['isActive'].includes(key)) {
          if (value === 'true' || value === true || value === '1') {
            cleanQuery[key] = true;
          } else if (value === 'false' || value === false || value === '0') {
            cleanQuery[key] = false;
          }
        }
        else {
          cleanQuery[key] = value;
        }
      }
      
      // Ensure pagination defaults
      if (!cleanQuery.page) cleanQuery.page = 1;
      if (!cleanQuery.limit) cleanQuery.limit = 20;
      
      // ADD DEFAULT PARAMETERS FOR CATEGORY POPULATION
      cleanQuery.populateCategory = 'true'; // Force category population
      cleanQuery.includeCategoryDetails = 'true';
      
      // Replace the req.query with clean version
      req.query = cleanQuery;
      
      console.log('[SUBCATEGORIES QUERY] Cleaned query:', cleanQuery);
      next();
    } catch (error) {
      console.error('[SUBCATEGORIES MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.getSubcategories
);


router.get('/subcategories/export', 
  verifyAdmin, 
  requirePermission('manage_categories'),
  auditLog('EXPORT_SUBCATEGORIES', 'categories'),
  cacheMiddleware(3600, 'admin:subcategories:export'), // Cache exports for 1 hour
  adminController.exportSubcategories
);



router.post('/subcategories/bulk', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('BULK_SUBCATEGORY_ACTION', 'categories'),
  clearCacheMiddleware('subcategories'),
  adminController.bulkUpdateSubcategories
);

router.get('/categories/export', 
  verifyAdmin, 
  requirePermission('manage_categories'),
  auditLog('EXPORT_CATEGORIES', 'categories'),
  cacheMiddleware(3600, 'admin:categories:export'), // Cache exports for 1 hour
  adminController.exportCategories
);

router.get('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORY', 'categories'),
  cacheMiddleware(600, 'admin:subcategory'),
  async (req, res, next) => {
    try {
      console.log('[GET SUBCATEGORY BY ID] Request:', {
        id: req.params.id,
        admin: req.admin?.email
      });
      
      // Fix the ID if it's wrapped in quotes
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      // Set population parameters
      req.query.populateCategory = true;
      req.query.includeCategoryDetails = true;
      req.query.populate = 'true';
      
      next();
    } catch (error) {
      console.error('[GET SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.getSubcategoryById
);
// Create subcategory
router.post('/subcategories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('CREATE_SUBCATEGORY', 'categories'),
  clearCacheMiddleware('subcategories'),
  async (req, res, next) => {
    try {
      console.log('[CREATE SUBCATEGORY] Request body:', req.body);
      next();
    } catch (error) {
      console.error('[CREATE SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.createSubcategory
);

// Update subcategory - FIXED ROUTE WITH BODY PARSER
router.put('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('UPDATE_SUBCATEGORY', 'categories'),
  clearCacheMiddleware('subcategories'),
  // Add JSON body parser middleware specifically for this route
  express.json({ limit: '10mb' }),
  async (req, res, next) => {
    try {
      console.log('[UPDATE SUBCATEGORY] Incoming request:', {
        params: req.params,
        body: req.body,
        admin: req.admin?.email
      });
      
      // Fix the ID if it's wrapped in quotes
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
        console.log('[UPDATE SUBCATEGORY] Fixed ID:', req.params.id);
      }
      
      next();
    } catch (error) {
      console.error('[UPDATE SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.updateSubcategory
);

// Delete subcategory (soft or permanent)
router.delete('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('DELETE_SUBCATEGORY', 'categories'),
  clearCacheMiddleware('subcategories'),
  async (req, res, next) => {
    try {
      console.log('[DELETE SUBCATEGORY] Request:', {
        id: req.params.id,
        query: req.query,
        admin: req.admin?.email
      });
      
      // Fix the ID if needed
      if (req.params.id === '[object Object]') {
        if (req.body && req.body.id) {
          req.params.id = req.body.id;
        } else if (req.query && req.query.id) {
          req.params.id = req.query.id;
        }
      }
      
      // Fix quoted ID
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      next();
    } catch (error) {
      console.error('[DELETE SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.deleteSubcategory
);

// ============================================
// DASHBOARD ROUTES
// ============================================

// ============================================
// USER MANAGEMENT ROUTES
// ============================================
router.get('/users', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('VIEW_USERS', 'users'),
  cacheMiddleware(300, 'admin:users'), // Cache for 5 minutes
  adminController.getUsers
);

router.post('/users', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('CREATE_USER', 'users'),
  clearCacheMiddleware('users'),
  adminController.createUser
);

router.get('/users/export', 
  verifyAdmin, 
  requirePermission('manage_users'),
  auditLog('EXPORT_USERS', 'users'),
  cacheMiddleware(3600, 'admin:users:export'), // Cache exports for 1 hour
  adminController.exportUsers
);

// User bulk operations
router.post('/users/bulk-action', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('BULK_USER_ACTION', 'users'),
  clearCacheMiddleware('users'),
  async (req, res, next) => {
    try {
      console.log('[USERS BULK ACTION] Request:', {
        body: req.body,
        admin: req.admin?.email
      });
      next();
    } catch (error) {
      console.error('[USERS BULK ACTION MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.bulkUpdateUsers
);

router.put('/users/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('UPDATE_USER', 'users'),
  clearCacheMiddleware('users'),
  adminController.updateUser
);

router.delete('/users/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('DELETE_USER', 'users'),
  clearCacheMiddleware('users'),
  adminController.deleteUser
);


router.post('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('CREATE_CATEGORY', 'categories'),
  clearCacheMiddleware('categories'),
  categoryController.createCategory
);

router.get('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('VIEW_CATEGORIES', 'categories'),
  cacheMiddleware(300, 'admin:categories'), // Cache for 5 minutes
  async (req, res, next) => {
    try {
      // Create a clean query object
      const cleanQuery = {};
      
      // Copy only non-empty parameters
      for (const [key, value] of Object.entries(req.query)) {
        // Skip empty strings for boolean fields
        if (value === '' && ['featured', 'popular', 'isActive'].includes(key)) {
          continue;
        }
        
        // Parse numeric values
        if (['page', 'limit', 'sortOrder', 'order', 'level'].includes(key)) {
          cleanQuery[key] = parseInt(value) || (key === 'page' ? 1 : key === 'limit' ? 20 : 0);
        }
        // Parse boolean values
        else if (['featured', 'isActive', 'popular', 'showAll', 'isAdmin'].includes(key)) {
          if (value === 'true' || value === true || value === '1') {
            cleanQuery[key] = true;
          } else if (value === 'false' || value === false || value === '0') {
            cleanQuery[key] = false;
          }
        }
        // Keep other values as-is
        else {
          cleanQuery[key] = value;
        }
      }
      
      // Add admin defaults
      cleanQuery.showAll = true;
      cleanQuery.isAdmin = true;
      
      // Ensure pagination defaults
      if (!cleanQuery.page) cleanQuery.page = 1;
      if (!cleanQuery.limit) cleanQuery.limit = 20;
      
      // Replace the req.query with clean version
      req.query = cleanQuery;
      
      console.log('[CATEGORIES QUERY] Cleaned query:', cleanQuery);
      next();
    } catch (error) {
      console.error('[CATEGORIES MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  categoryController.getCategories
);

router.put('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('UPDATE_CATEGORY', 'categories'),
  clearCacheMiddleware('categories'),
  categoryController.updateCategory
);

// Get single category by ID (Admin)
router.get('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('VIEW_CATEGORY', 'categories'),
  cacheMiddleware(600, 'admin:category'), // Cache single item for 10 minutes
  async (req, res, next) => {
    try {
      console.log('[ADMIN GET CATEGORY] Request received:', {
        id: req.params.id,
        admin: req.admin?.email
      });
      
      // Fix the ID if needed
      if (req.params.id === '[object Object]') {
        if (req.body && req.body.id) {
          req.params.id = req.body.id;
        } else if (req.query && req.query.id) {
          req.params.id = req.query.id;
        }
      }
      
      // Fix quoted ID
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      // Set admin query parameters
      req.query.showAll = true;
      req.query.includeDeleted = true;
      req.query.populate = 'true';
      
      next();
    } catch (error) {
      console.error('[ADMIN GET CATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  categoryController.getCategoryById
);

router.delete('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('DELETE_CATEGORY', 'categories'),
  clearCacheMiddleware('categories'),
  async (req, res, next) => {
    try {
      console.log('[DELETE CATEGORY] Request received:', {
        params: req.params,
        body: req.body,
        query: req.query,
        admin: req.admin?.email
      });
      
      // Fix the ID if it's [object Object]
      if (req.params.id === '[object Object]') {
        console.log('[DELETE CATEGORY] Detected object ID, attempting to fix...');
        
        if (req.body && req.body.id) {
          req.params.id = req.body.id;
          console.log('[DELETE CATEGORY] Fixed ID from body:', req.params.id);
        } else if (req.query && req.query.id) {
          req.params.id = req.query.id;
          console.log('[DELETE CATEGORY] Fixed ID from query:', req.params.id);
        } else if (req.body && req.body._id) {
          req.params.id = req.body._id;
          console.log('[DELETE CATEGORY] Fixed ID from body._id:', req.params.id);
        }
      }
      
      next();
    } catch (error) {
      console.error('[DELETE CATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  categoryController.deleteCategory
);

router.post('/categories/:id/restore', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('RESTORE_CATEGORY', 'categories'),
  clearCacheMiddleware('categories'),
  express.json({ limit: '10mb' }),
  async (req, res, next) => {
    try {
      console.log('[RESTORE CATEGORY ROUTE] Request received:', {
        params: req.params,
        body: req.body,
        query: req.query,
        admin: req.admin?.email
      });
      
      // Fix the ID if it's [object Object]
      if (req.params.id === '[object Object]') {
        console.log('[RESTORE CATEGORY ROUTE] Detected object ID, attempting to fix...');
        
        if (req.body && req.body.id) {
          req.params.id = req.body.id;
          console.log('[RESTORE CATEGORY ROUTE] Fixed ID from body:', req.params.id);
        } else if (req.query && req.query.id) {
          req.params.id = req.query.id;
          console.log('[RESTORE CATEGORY ROUTE] Fixed ID from query:', req.params.id);
        } else if (req.body && req.body._id) {
          req.params.id = req.body._id;
          console.log('[RESTORE CATEGORY ROUTE] Fixed ID from body._id:', req.params.id);
        }
      }
      
      // Fix quoted ID
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      // Ensure we have proper JSON body for POST requests
      if (req.method === 'POST' && !req.body && req.query.searchValue) {
        req.body = {
          searchBy: req.query.searchBy || 'id',
          searchValue: req.query.searchValue,
          force: req.query.force || 'false'
        };
      }
      
      next();
    } catch (error) {
      console.error('[RESTORE CATEGORY ROUTE MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  categoryController.restoreCategory
);

router.post('/categories/bulk-action', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('BULK_CATEGORY_ACTION', 'categories'),
  clearCacheMiddleware('categories'),
  categoryController.bulkUpdateCategories
);



// ============================================
// SERVICE MANAGEMENT ROUTES
// ============================================
router.get('/services', 
  verifyAdmin,  
  adminApiLimiter,
  requirePermission('manage_services'),
  auditLog('VIEW_SERVICES', 'services'),
  cacheMiddleware(300, 'admin:services'), // Cache for 5 minutes
  async (req, res, next) => {
    req.query.isAdmin = true;
    req.query.showAll = true;
    req.query.includeInactive = true;
    
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
    if (req.query.featured === '') delete req.query.featured;
    if (req.query.status === '') delete req.query.status;
    
    next();
  },
  serviceController.getAdminServices
);


router.delete('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('DELETE_SERVICE', 'services'),
  clearCacheMiddleware('services'),
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      
      // Log the request details for debugging
      console.log('[ADMIN DELETE SERVICE] Request received:', {
        params: req.params,
        query: req.query,
        body: req.body,
        admin: req.admin?.email,
        adminRole: req.admin?.role
      });
      
      // Ensure permanent parameter is passed correctly
      if (req.query.permanent) {
        req.query.permanent = String(req.query.permanent).toLowerCase();
      }
      
      if (req.query.force) {
        req.query.force = String(req.query.force).toLowerCase();
      }
      
      next();
    } catch (error) {
      console.error('[ADMIN DELETE SERVICE ERROR]', error);
      next(error);
    }
  },
  serviceController.deleteService
);

router.get('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('VIEW_SERVICE', 'services'),
  cacheMiddleware(600, 'admin:service'), // Cache single item for 10 minutes
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      // Add query parameters for full details
      req.query.includeFullDetails = 'true';
      req.query.includeSubcategory = 'true';
      req.query.populate = 'true';
      next();
    } catch (error) {
      console.error('[ADMIN GET SERVICE ERROR]', error);
      next(error);
    }
  },
  serviceController.getServiceById
);

router.put('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('UPDATE_SERVICE', 'services'),
  clearCacheMiddleware('services'),
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      next();
    } catch (error) {
      console.error('[ADMIN UPDATE SERVICE ERROR]', error);
      next(error);
    }
  },
  serviceController.updateService
);

router.get('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIGS', 'gigs'),
  cacheMiddleware(300, 'admin:gigs'), // Cache for 5 minutes
  async (req, res, next) => {
    // Set admin flags for gig controller
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    req.query.showAll = true;
    req.query.includeInactive = true;
    req.query.isAdmin = true;
    
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
    if (req.query.status === '') delete req.query.status;
    if (req.query.urgency === '') delete req.query.urgency;
    
    if (req.query.minBudget) req.query.minBudget = parseFloat(req.query.minBudget);
    if (req.query.maxBudget) req.query.maxBudget = parseFloat(req.query.maxBudget);
    
    next();
  },
  gigController.getGigs // Use main gig controller
);

// Get gig by ID (admin view)
router.get('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIG', 'gigs'),
  cacheMiddleware(600, 'admin:gig'), // Cache single item for 10 minutes
  async (req, res, next) => {
    // Set admin flags
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    req.query.populateSubcategory = true;
    req.query.populateCategory = true;
    req.query.includeCommunication = true;
    next();
  },
  gigController.getGigById // Use main gig controller
);

// Create gig (admin)
router.post('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('CREATE_GIG', 'gigs'),
  clearCacheMiddleware('gigs'),
  // Use upload middleware if needed
  // upload.array('images', 10),
  async (req, res, next) => {
    // Set admin as creator
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    
    // If client ID provided, set as createdBy
    if (req.body.clientId) {
      req.body.createdBy = req.body.clientId;
    } else {
      req.body.createdBy = req.admin._id;
    }
    
    delete req.body.clientId;
    next();
  },
  gigController.createGig // Use main gig controller
);

// Update gig (admin)
router.put('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('UPDATE_GIG', 'gigs'),
  clearCacheMiddleware('gigs'),
  // Add JSON body parser with version handling
  express.json({ limit: '10mb' }),
  async (req, res, next) => {
    // Set admin user
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    
    // Log for debugging
    console.log('[ADMIN UPDATE GIG] Request:', {
      id: req.params.id,
      body: req.body,
      admin: req.admin.email
    });
    
    next();
  },
  gigController.updateGig // Use main gig controller
);

// Delete gig (admin)
router.delete('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('DELETE_GIG', 'gigs'),
  clearCacheMiddleware('gigs'),
  express.json(),
  async (req, res, next) => {
    // Set admin user
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    
    // Fix ID if needed
    if (req.params.id === '[object Object]') {
      if (req.body && req.body.id) {
        req.params.id = req.body.id;
      } else if (req.query && req.query.id) {
        req.params.id = req.query.id;
      }
    }
    
    // Parse query parameters
    if (req.query.permanent) {
      req.query.permanent = String(req.query.permanent).toLowerCase();
    }
    
    if (req.query.force) {
      req.query.force = String(req.query.force).toLowerCase();
    }
    
    next();
  },
  gigController.deleteGig // Use main gig controller
);

// Bulk operations (admin) - Keep this in admin controller or create new endpoint
router.post('/gigs/bulk', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('BULK_GIG_ACTION', 'gigs'),
  clearCacheMiddleware('gigs'),
  async (req, res) => {
    // For bulk operations, keep using admin controller or create new endpoint
    try {
      const { ids, operation, data = {} } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No gigs selected',
          code: 'NO_GIGS_SELECTED'
        });
      }
      
      let updateData = {};
      let message = 'Gigs updated successfully';
      
      switch (operation) {
        case 'activate':
          updateData = { status: 'open', isActive: true };
          message = 'Gigs activated successfully';
          break;
        case 'pause':
          updateData = { status: 'closed', isActive: false };
          message = 'Gigs closed successfully';
          break;
        case 'delete':
          // Use gig controller's delete function for each
          const results = await Promise.all(
            ids.map(id => 
              Gig.findByIdAndUpdate(id, {
                isActive: false,
                deletedAt: new Date(),
                deletedBy: req.admin._id
              })
            )
          );
          
          // Invalidate cache
          await adminController.invalidateAdminCache('gigs');
          
          return res.json({
            success: true,
            message: 'Gigs deleted successfully',
            modifiedCount: results.filter(r => r).length
          });
        default:
          updateData = data;
      }
      
      updateData.lastUpdatedBy = req.admin._id;
      
      const result = await Gig.updateMany(
        { _id: { $in: ids } },
        { $set: updateData }
      );
      
      // Invalidate cache
      await adminController.invalidateAdminCache('gigs');
      
      res.json({
        success: true,
        message,
        modifiedCount: result.modifiedCount
      });
      
    } catch (error) {
      console.error('[BULK UPDATE GIGS ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation'
      });
    }
  }
);

// Export gigs
router.get('/gigs/export', 
  verifyAdmin, 
  requirePermission('manage_gigs'),
  auditLog('EXPORT_GIGS', 'gigs'),
  cacheMiddleware(3600, 'admin:gigs:export'), // Cache exports for 1 hour
  async (req, res, next) => {
    req.user = { role: 'admin', _id: req.admin._id };
    next();
  },
  gigController.exportGigs // Use main gig controller
);

// Restore gig (admin only)
router.post('/gigs/:id/restore', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('RESTORE_GIG', 'gigs'),
  clearCacheMiddleware('gigs'),
  async (req, res, next) => {
    req.user = { role: 'admin', _id: req.admin._id };
    next();
  },
  gigController.restoreGig // Use main gig controller
);

// ============================================
// DROPDOWN ROUTES
// ============================================


router.get('/users/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  cacheMiddleware(600, 'admin:users:dropdown'), // Cache for 10 minutes
  async (req, res) => {
    try {
      console.log('[USERS DROPDOWN] Fetching users...');
      console.log('[USERS DROPDOWN] Admin user:', req.admin?.email);
      
      const { role = '' } = req.query;
      
      const query = { 
        isActive: true,
        deletedAt: null 
      };
      
      if (role) {
        query.role = role;
      }
      
      const users = await User.find(query)
        .select('name email picture role')
        .sort({ name: 1 })
        .limit(100)
        .lean();
      
      console.log(`[USERS DROPDOWN] Found ${users.length} users`);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('[USERS DROPDOWN ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ============================================
// SYSTEM MANAGEMENT ROUTES
// ============================================
router.get('/system/health', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('system_settings'),
  auditLog('VIEW_SYSTEM_HEALTH', 'system'),
  cacheMiddleware(30, 'admin:system:health'), // Cache for 30 seconds
  adminController.getSystemHealthHandler
);

router.get('/activity/recent', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('view_dashboard'),
  auditLog('VIEW_RECENT_ACTIVITY', 'dashboard'),
  cacheMiddleware(300, 'admin:activity:recent'), // Cache for 5 minutes
  adminController.getRecentActivity
);

// Cache management endpoints (admin only)
router.post('/cache/clear', 
  verifyAdmin,
  requirePermission('system_settings'),
  async (req, res) => {
    try {
      const { type } = req.body;
      
      if (type === 'all') {
        await cache.del('admin:*');
        console.log('Cleared all admin cache');
      } else if (type) {
        await adminController.invalidateAdminCache(type);
        console.log(`Cleared admin cache for type: ${type}`);
      } else {
        // Clear specific patterns
        const patterns = [
          'admin:users:*',
          'admin:categories:*',
          'admin:subcategories:*',
          'admin:services:*',
          'admin:gigs:*',
          'admin:dashboard:*'
        ];
        
        await Promise.all(patterns.map(pattern => cache.del(pattern)));
        console.log('Cleared all admin resource caches');
      }
      
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        clearedType: type || 'all'
      });
    } catch (error) {
      console.error('[CACHE CLEAR ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

router.get('/cache/stats', 
  verifyAdmin,
  requirePermission('system_settings'),
  async (req, res) => {
    try {
      // This would require Redis-specific implementation
      // For now, return basic cache info
      res.json({
        success: true,
        data: {
          enabled: true,
          type: process.env.REDIS_URL ? 'redis' : 'memory',
          memoryCacheSize: 'N/A', // Would need to track memory cache size
          redisConnected: !!cache.redisClient && cache.redisClient.status === 'ready'
        }
      });
    } catch (error) {
      console.error('[CACHE STATS ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cache stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;