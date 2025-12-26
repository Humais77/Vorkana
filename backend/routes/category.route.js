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

// ==========================================
// CRITICAL: Order routes from MOST specific to LEAST specific
// ==========================================

// 1. STATIC ROUTES (Most specific)
router.get('/search', publicLimiter, optionalAuth, validateQuery, controller.searchCategories);
router.get('/stats', protect, adminOnly, adminLimiter, controller.getCategoryStats);
router.get('/export', protect, adminOnly, adminLimiter, validateQuery, controller.exportCategories); // Move BEFORE :id

// 2. PUBLIC ROUTES
router.get('/', publicLimiter, optionalAuth, validateQuery, controller.getCategories);

// 3. PARAMETERIZED ROUTES (Less specific - comes last)
router.get('/:id', publicLimiter, optionalAuth, controller.getCategoryById);

// ==========================================
// ADMIN PROTECTED ROUTES
// ==========================================

// Static admin routes
router.post('/', protect, adminOnly, adminLimiter, validateCreate, controller.createCategory);
router.post('/bulk', protect, adminOnly, bulkOperationLimiter, validateBulk, controller.bulkUpdateCategories);

// Parameterized admin routes
router.put('/:id', protect, adminOnly, adminLimiter, validateUpdate, controller.updateCategory);
router.delete('/:id', protect, adminOnly, adminLimiter, controller.deleteCategory);
router.patch('/:id/restore', protect, adminOnly, adminLimiter, controller.restoreCategory);

module.exports = router;