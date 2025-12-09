const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { protect, adminOnly } = require('../middleware/auth.middleware.js');
const {
  validateCreate,
  validateUpdate,
  validateBulk,
  validateQuery
} = require('../middleware/validators/category.validator.js');

// Apply query validation to all GET routes
router.get('/', validateQuery, controller.getCategories);
router.get('/search', validateQuery, controller.searchCategories);
router.get('/stats', controller.getCategoryStats);
router.get('/export', validateQuery, controller.exportCategories);
router.get('/:id', controller.getCategoryById);

// Protected admin routes
router.post('/', protect, adminOnly, validateCreate, controller.createCategory);
router.post('/bulk', protect, adminOnly, validateBulk, controller.bulkUpdateCategories);
router.put('/:id', protect, adminOnly, validateUpdate, controller.updateCategory);
router.delete('/:id', protect, adminOnly, controller.deleteCategory);
router.patch('/:id/restore', protect, adminOnly, controller.restoreCategory);

module.exports = router;