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

// Public routes
router.get('/', optionalAuth, validateQuery, controller.getCategories);
router.get('/search', optionalAuth, validateQuery, controller.searchCategories);
router.get('/:id', optionalAuth, controller.getCategoryById);

// Protected admin routes with stricter rate limiting
router.post('/',  protect, adminOnly, validateCreate, controller.createCategory);
router.put('/:id',  protect, adminOnly, validateUpdate, controller.updateCategory);
router.delete('/:id',  protect, adminOnly, controller.deleteCategory);
router.patch('/:id/restore',  protect, adminOnly, controller.restoreCategory);
router.post('/bulk',  protect, adminOnly, validateBulk, controller.bulkUpdateCategories);
router.get('/stats',  protect, adminOnly, controller.getCategoryStats);
router.get('/export/export',  protect, adminOnly, validateQuery, controller.exportCategories);

module.exports = router;