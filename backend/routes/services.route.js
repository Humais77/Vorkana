const express = require('express');
const router = express.Router();
const controller = require('../controllers/services.controller.js');
const { protect, sellerOnly, adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/service.validator.js');

// Public routes (no authentication required)
router.get('/', optionalAuth, validateQuery, controller.getServices);
router.get('/search', optionalAuth, validateQuery, controller.searchServices);
router.get('/similar/:id', optionalAuth, controller.getSimilarServices);
router.get('/:id', optionalAuth, controller.getServiceById);

// Protected routes (requires authentication)
router.post('/:id/like', protect, controller.toggleLike);

// Seller routes (requires seller or admin role)
router.post('/',  protect, sellerOnly, validateCreate, controller.createService);
router.put('/:id',  protect, sellerOnly, validateUpdate, controller.updateService);
router.delete('/:id',  protect, sellerOnly, controller.deleteService);
router.patch('/:id/restore',  protect, sellerOnly, controller.restoreService);
router.get('/seller/stats',  protect, sellerOnly, controller.getServiceStats);
router.post('/seller/bulk',  protect, sellerOnly, validateBulk, controller.bulkUpdateServices);
router.get('/seller/export',  protect, sellerOnly, validateQuery, controller.exportServices);


router.put('/admin/:id',  protect, adminOnly, validateUpdate, controller.updateService);
router.delete('/admin/:id',  protect, adminOnly, controller.deleteService);
router.get('/admin/stats',  protect, adminOnly, controller.getServiceStats);
router.post('/admin/bulk',  protect, adminOnly, validateBulk, controller.bulkUpdateServices);
router.get('/admin/export',  protect, adminOnly, validateQuery, controller.exportServices);

module.exports = router;