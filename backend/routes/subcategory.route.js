const express = require('express');
const router = express.Router();
const controller = require('../controllers/subcategory.controller.js');
const {optionalAuth } = require('../middleware/auth.middleware.js');
const rateLimit = require('express-rate-limit');

// Import cache middleware
const { 
  createCacheMiddleware, 
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

// Cache configuration for subcategories
const SUBCATEGORY_CACHE_CONFIG = {
  PUBLIC_LIST: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    publicOnly: true,
    tags: ['subcategories', 'list']
  },
  DETAIL: {
    ttl: CACHE_TTL.PUBLIC.LONG,
    namespace: NAMESPACES.PUBLIC,
    tags: ['subcategories', 'detail']
  },
  BY_CATEGORY: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    tags: ['subcategories', 'by-category']
  },
  DROPDOWN: {
    ttl: CACHE_TTL.STATIC.DAY,
    namespace: NAMESPACES.PUBLIC,
    tags: ['subcategories', 'dropdown']
  }
};

// Create cache middleware instances
const cachePublicList = createCacheMiddleware(SUBCATEGORY_CACHE_CONFIG.PUBLIC_LIST);
const cacheDetail = createCacheMiddleware(SUBCATEGORY_CACHE_CONFIG.DETAIL);
const cacheByCategory = createCacheMiddleware(SUBCATEGORY_CACHE_CONFIG.BY_CATEGORY);
const cacheDropdown = createCacheMiddleware(SUBCATEGORY_CACHE_CONFIG.DROPDOWN);

// Rate limiting
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

// Get all subcategories (public - cached)
router.get('/', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  controller.getSubcategories
);

// Get subcategory by ID (public - cached)
router.get('/:id', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 600 }),
  cacheDetail,
  controller.getSubcategoryById
);

// Get subcategories by category (public - cached)
router.get('/category/:categoryId', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cacheByCategory,
  controller.getSubcategoriesByCategory
);

// Get subcategory by slug (public - cached)
router.get('/slug/:slug', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 600 }),
  cacheDetail,
  controller.getSubcategoryBySlug
);

// Get subcategories dropdown (public - cached)
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
  controller.getSubcategories
);

// Health check endpoint (with cache control)
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