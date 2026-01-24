// routes/category.route.js - Production Ready with Redis Cache
const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/category.validator.js');
const SessionMiddleware = require("../middleware/session.middleware");
const CSRFMiddleware = require("../middleware/csrf.middleware");
const mongoose = require('mongoose');

// Import cache middleware
const { 
  createCacheMiddleware, 
  createClearCacheMiddleware,
  cacheStatsMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

// Cache configurations for categories
const CATEGORY_CACHE_CONFIG = {
  PUBLIC_LIST: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    publicOnly: true,
    tags: ['categories', 'list']
  },
  ADMIN_LIST: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.ADMIN,
    checkUserRole: true,
    rolesToBypass: ['admin'],
    tags: ['categories', 'admin', 'list']
  },
  DETAIL: {
    ttl: CACHE_TTL.PUBLIC.LONG,
    namespace: NAMESPACES.PUBLIC,
    tags: ['categories', 'detail']
  },
  STATS: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.ADMIN,
    tags: ['categories', 'stats']
  },
  DROPDOWN: {
    ttl: CACHE_TTL.STATIC.DAY,
    namespace: NAMESPACES.PUBLIC,
    tags: ['categories', 'dropdown']
  }
};

// Create cache middlewares
const cachePublicList = createCacheMiddleware(CATEGORY_CACHE_CONFIG.PUBLIC_LIST);
const cacheAdminList = createCacheMiddleware(CATEGORY_CACHE_CONFIG.ADMIN_LIST);
const cacheDetail = createCacheMiddleware(CATEGORY_CACHE_CONFIG.DETAIL);
const cacheStats = createCacheMiddleware(CATEGORY_CACHE_CONFIG.STATS);
const cacheDropdown = createCacheMiddleware(CATEGORY_CACHE_CONFIG.DROPDOWN);

// Clear cache middleware for write operations
const clearCategoryCache = createClearCacheMiddleware({
  patterns: [
    'categories:*',
    'category:*',
    '*:tags:*categories*'
  ],
  tags: ['categories'],
  namespace: NAMESPACES.PUBLIC,
  clearAllOnWrite: false
});

// Rate limiting
const rateLimit = require('express-rate-limit');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkOperationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many bulk operations, please try again later.',
    code: 'BULK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many create requests'
});

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many update requests'
});

// ==================== CACHE MANAGEMENT ROUTES ====================

// Cache stats (admin only)
router.get('/cache/stats', 
  SessionMiddleware.authenticate,
  adminOnly,
  adminLimiter,
  cacheStatsMiddleware,
  async (req, res) => {
    res.json({
      success: true,
      data: req.cacheStats
    });
  }
);

// Clear category cache (admin only)
router.post('/cache/clear', 
  SessionMiddleware.authenticate,
  adminOnly,
  adminLimiter,
  async (req, res) => {
    try {
      const { pattern = 'categories:*', namespace = NAMESPACES.PUBLIC } = req.body;
      
      const fullPattern = namespace !== 'default' ? `${namespace}:${pattern}` : pattern;
      const cleared = await require('../utils/cache').del(fullPattern);
      
      res.json({
        success: true,
        message: `Cleared ${cleared} cache entries`,
        pattern: fullPattern,
        cleared
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ==================== PUBLIC ROUTES (Cached) ====================

// Get all categories (public - cached)
router.get('/', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  validateQuery, 
  controller.getCategories
);

// Search categories (public - cached)
router.get('/search', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 180 }),
  cachePublicList,
  validateQuery, 
  controller.searchCategories
);

// Get category by ID or slug (public - cached)
router.get('/:id', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 600 }),
  cacheDetail,
  controller.getCategoryById
);

// ==================== ADMIN READ ROUTES (Cached) ====================

// Get categories for admin (cached, shorter TTL)
router.get('/admin/list', 
  SessionMiddleware.authenticate,
  adminOnly,
  adminLimiter,
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheAdminList,
  validateQuery,
  controller.getCategories
);

// Get category stats (admin - cached)
router.get('/stats', 
  SessionMiddleware.authenticate,
  adminOnly,
  adminLimiter,
  cacheControlMiddleware({ public: false, maxAge: 180 }),
  cacheStats,
  controller.getCategoryStats
);

// Export categories (admin - no cache needed)
router.get('/export', 
  SessionMiddleware.authenticate,
  adminOnly,
  adminLimiter,
  cacheControlMiddleware({ noStore: true }),
  validateQuery,
  controller.exportCategories
);

// Get categories dropdown (cached)
router.get('/dropdown/list', 
  publicLimiter,
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 86400 }),
  cacheDropdown,
  async (req, res, next) => {
    try {
      // Set flag for controller to return dropdown format
      req.query.dropdown = true;
      next();
    } catch (error) {
      next(error);
    }
  },
  controller.getCategories
);

// ==================== ADMIN WRITE ROUTES (Clear Cache) ====================

// Create category (clears cache)
router.post('/', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  adminOnly,
  adminLimiter,
  createLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearCategoryCache,
  validateCreate,
  controller.createCategory
);

// Update category (clears cache)
router.put('/:id', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  adminOnly,
  adminLimiter,
  updateLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearCategoryCache,
  validateUpdate,
  controller.updateCategory
);

// Delete category (clears cache)
router.delete('/:id', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  adminOnly,
  adminLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearCategoryCache,
  controller.deleteCategory
);

// Restore category (clears cache)
router.patch('/:id/restore', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  adminOnly,
  adminLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearCategoryCache,
  controller.restoreCategory
);

// Bulk operations (clears cache)
router.post('/bulk', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  adminOnly,
  bulkOperationLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearCategoryCache,
  validateBulk,
  controller.bulkUpdateCategories
);

// Repair category counts (clears cache)
router.get('/repair-counts/status', 
  SessionMiddleware.authenticate,
  adminOnly,
  adminLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearCategoryCache,
  controller.repairCategoryCounts
);

// ==================== HEALTH CHECK ====================

router.get('/health', 
  publicLimiter,
  cacheControlMiddleware({ maxAge: 30 }),
  async (req, res) => {
    try {
      const cache = require('../utils/cache');
      const health = await cache.health();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        cache: {
          redis: health.redis.healthy,
          memory: health.memory.healthy,
          overall: health.overall
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
);

module.exports = router;