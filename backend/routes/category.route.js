const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery ,
  validateSubcategory 
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
router.get('/', publicLimiter, optionalAuth, validateQuery, controller.getCategories);

// Get subcategories by category
router.get('/:categoryId/subcategories', 
  publicLimiter, 
  optionalAuth, 
  controller.getSubcategoriesByCategory
);

// Search categories
router.get('/search', publicLimiter, optionalAuth, validateQuery, controller.searchCategories);

// Get category by ID or slug
router.get('/:id', publicLimiter, optionalAuth, controller.getCategoryById);

// ==========================================
// ADMIN PROTECTED ROUTES
// ==========================================

// Create category
router.post('/', protect, adminOnly, adminLimiter, validateCreate, controller.createCategory);

// Create subcategory
router.post('/subcategories', 
  protect, 
  adminOnly, 
  adminLimiter, 
  validateSubcategory, // Use subcategory validator
  controller.createSubcategory
);

// Bulk operations
router.post('/bulk', protect, adminOnly, bulkOperationLimiter, validateBulk, controller.bulkUpdateCategories);

// Update category
router.put('/:id', protect, adminOnly, adminLimiter, validateUpdate, controller.updateCategory);

// Delete category
router.delete('/:id', protect, adminOnly, adminLimiter, controller.deleteCategory);

// Restore category
router.patch('/:id/restore', protect, adminOnly, adminLimiter, controller.restoreCategory);

// ==========================================
// STATS AND EXPORTS (Admin only)
// ==========================================

router.get('/stats', protect, adminOnly, adminLimiter, controller.getCategoryStats);
router.get('/export', protect, adminOnly, adminLimiter, validateQuery, controller.exportCategories);

module.exports = router;