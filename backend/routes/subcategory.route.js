const express = require('express');
const router = express.Router();
const controller = require('../controllers/subcategory.controller.js');
const {adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const rateLimit = require('express-rate-limit');
const SessionMiddleware = require("../middleware/session.middleware");
const CSRFMiddleware = require('../middleware/csrf.middleware');
// Rate limiting
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Public routes
router.get('/', publicLimiter, optionalAuth, controller.getSubcategories);
router.get('/:id', publicLimiter, optionalAuth, controller.getSubcategoryById);
router.get('/category/:categoryId', publicLimiter, optionalAuth, controller.getSubcategoriesByCategory);
router.get('/slug/:slug', publicLimiter, optionalAuth, controller.getSubcategoryBySlug);
// Admin routes
router.post('/',  SessionMiddleware.authenticate,SessionMiddleware.authenticate,  adminOnly, adminLimiter, controller.createSubcategory);
router.put('/:id',  SessionMiddleware.authenticate,SessionMiddleware.authenticate,  adminOnly, adminLimiter, controller.updateSubcategory);
router.delete('/:id',  SessionMiddleware.authenticate,SessionMiddleware.authenticate,  adminOnly, adminLimiter, controller.deleteSubcategory);
router.patch('/:id/restore',  SessionMiddleware.authenticate,SessionMiddleware.authenticate,  adminOnly, adminLimiter, controller.restoreSubcategory);
router.post('/bulk',  SessionMiddleware.authenticate,SessionMiddleware.authenticate,  adminOnly, adminLimiter, controller.bulkUpdateSubcategories);

module.exports = router;