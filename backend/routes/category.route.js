const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateQuery 
} = require('../middleware/validators/category.validator.js');

const { 
  createCacheMiddleware, 
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

const CATEGORY_CACHE_CONFIG = {
  PUBLIC_LIST: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    publicOnly: true,
    tags: ['categories', 'list']
  },
  DETAIL: {
    ttl: CACHE_TTL.PUBLIC.LONG,
    namespace: NAMESPACES.PUBLIC,
    tags: ['categories', 'detail']
  },
  DROPDOWN: {
    ttl: CACHE_TTL.STATIC.DAY,
    namespace: NAMESPACES.PUBLIC,
    tags: ['categories', 'dropdown']
  }
};

const cachePublicList = createCacheMiddleware(CATEGORY_CACHE_CONFIG.PUBLIC_LIST);
const cacheDetail = createCacheMiddleware(CATEGORY_CACHE_CONFIG.DETAIL);
const cacheDropdown = createCacheMiddleware(CATEGORY_CACHE_CONFIG.DROPDOWN);

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

router.get('/', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  validateQuery, 
  controller.getCategories
);

router.get('/search', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 180 }),
  cachePublicList,
  validateQuery, 
  controller.searchCategories
);

router.get('/:id', 
  publicLimiter, 
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 600 }),
  cacheDetail,
  controller.getCategoryById
);

router.get('/dropdown/list', 
  publicLimiter,
  optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 86400 }),
  cacheDropdown,
  async (req, res, next) => {
    try {
      req.query.dropdown = true;
      next();
    } catch (error) {
      next(error);
    }
  },
  controller.getCategories
);

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