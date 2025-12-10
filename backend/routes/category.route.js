const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/category.validator.js');

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

// Public routes
router.get('/', optionalAuth, validateQuery, controller.getCategories);
router.get('/search', optionalAuth, validateQuery, controller.searchCategories);
router.get('/:id', optionalAuth, controller.getCategoryById);

// Protected admin routes with rate limiting
router.post('/', protect, adminOnly, adminLimiter, validateCreate, controller.createCategory);
router.put('/:id', protect, adminOnly, adminLimiter, validateUpdate, controller.updateCategory);
router.delete('/:id', protect, adminOnly, adminLimiter, controller.deleteCategory);
router.patch('/:id/restore', protect, adminOnly, adminLimiter, controller.restoreCategory);
router.post('/bulk', protect, adminOnly, bulkOperationLimiter, validateBulk, controller.bulkUpdateCategories);
router.get('/stats', protect, adminOnly, adminLimiter, controller.getCategoryStats);
router.get('/export', protect, adminOnly, adminLimiter, validateQuery, controller.exportCategories);

module.exports = router;