const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery ,
} = require('../middleware/validators/category.validator.js');
const SessionMiddleware = require("../middleware/session.middleware");
const timeout = (ms) => {
  return (req, res, next) => {
    res.setTimeout(ms, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          code: 'TIMEOUT'
        });
      }
    });
    next();
  };
};
// Rate limiting for admin operations
const rateLimit = require('express-rate-limit');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Higher limit for public access
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkOperationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10,
  skipSuccessfulRequests: false,
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
  max: 20, // Lower limit for create operations
  message: 'Too many create requests'
});

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many update requests'
});
router.get('/', publicLimiter, optionalAuth, validateQuery, controller.getCategories);
// Bulk operations
router.post('/bulk',  SessionMiddleware.authenticate, adminOnly, bulkOperationLimiter, validateBulk, controller.bulkUpdateCategories);

// Stats and export
router.get('/stats',  SessionMiddleware.authenticate, adminOnly, timeout(10000), controller.getCategoryStats);
router.get('/export',  SessionMiddleware.authenticate, adminOnly, adminLimiter, validateQuery, controller.exportCategories);

// Repair counts
router.get('/repair-counts/status',  SessionMiddleware.authenticate, adminOnly, adminLimiter, controller.repairCategoryCounts);
// ========== PUBLIC ROUTES (cookies optional) ==========
router.get('/', publicLimiter, optionalAuth, validateQuery, controller.getCategories);
router.get('/search', publicLimiter, optionalAuth, validateQuery, controller.searchCategories);
router.get('/:id', publicLimiter, optionalAuth, controller.getCategoryById);

// ========== ADMIN  SESSIONMIDDLEWARE.AUTHENTICATEED ROUTES (cookies required) ==========
router.post('/',  SessionMiddleware.authenticate, adminOnly, adminLimiter, createLimiter, validateCreate, controller.createCategory);
router.put('/:id',  SessionMiddleware.authenticate, adminOnly, adminLimiter, updateLimiter, validateUpdate, controller.updateCategory);
router.delete('/:id',  SessionMiddleware.authenticate, adminOnly, adminLimiter, controller.deleteCategory);
router.patch('/:id/restore',  SessionMiddleware.authenticate, adminOnly, adminLimiter, controller.restoreCategory);


// Health check (public)
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await mongoose.connection.db.admin().ping();
    
    // Test cache connection
    await cache.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;