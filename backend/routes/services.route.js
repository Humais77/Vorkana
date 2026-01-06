// service.route.js - Updated with CSRF protection
const express = require('express');
const router = express.Router();
const controller = require('../controllers/services.controller.js');
const { protect, adminOnly, optionalAuth, csrfProtection } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/service.validator.js');

const rateLimit = require('express-rate-limit');
const { 
  upload, 
  thumbnailUpload, 
  handleMulterError
} = require('../middleware/upload.middleware.js');

// Rate limiters
const serviceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return req.user?._id ? `${ip}-${req.user._id}` : ip;
  }
});

const bulkOperationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many bulk operations, please try again later.',
    code: 'BULK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const imageUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many image uploads, please try again later.',
    code: 'IMAGE_UPLOAD_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create combined upload middleware
const uploadWithThumbnail = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'thumbnail', maxCount: 1 }
]);

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

router.get('/', optionalAuth, validateQuery, controller.getServices);
router.get('/search', optionalAuth, validateQuery, controller.searchServices);
router.get('/similar/:id', optionalAuth, controller.getSimilarServices);
router.get('/popular', optionalAuth, serviceLimiter, controller.getPopularServices);
router.get('/popular/category', optionalAuth, serviceLimiter, controller.getPopularServicesByCategory);
router.get('/category/:categoryId', optionalAuth, serviceLimiter, controller.getServicesByCategory);
router.get('/subcategory/:subcategoryId', optionalAuth, serviceLimiter, controller.getServicesBySubcategory);
router.get('/subcategory/slug/:slug', optionalAuth, serviceLimiter, controller.getServicesBySubcategorySlug);
router.get('/with-stats', optionalAuth, serviceLimiter, controller.getServicesWithCategoryStats);
router.get('/:id', optionalAuth, controller.getServiceById);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Get my services
router.get('/my-services', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  validateQuery, 
  controller.getMyServices
);

// Like/Unlike service
router.post('/:id/like', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.toggleLike
);

// ============================================
// USER ROUTES (Service creators - with CSRF)
// ============================================

// Create service
router.post('/', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  uploadWithThumbnail, 
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Update service
router.put('/:id', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  uploadWithThumbnail,
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete service
router.delete('/:id', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.deleteService
);

// Restore service
router.patch('/:id/restore', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.restoreService
);

// Image management
router.post('/:id/images', 
  protect, 
  csrfProtection, // ADD CSRF
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

router.delete('/:id/images/:publicId', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.removeImage
);

router.put('/:id/thumbnail/:publicId', 
  protect, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.setThumbnail
);

router.post('/:id/thumbnail', 
  protect, 
  csrfProtection, // ADD CSRF
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// ============================================
// ADMIN ROUTES (Admin only - with CSRF)
// ============================================

// Admin create service
router.post('/admin/create', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  uploadWithThumbnail,
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Get admin services
router.get('/admin/services', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  validateQuery, 
  controller.getAdminServices
);

// Admin update service
router.put('/admin/:id', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Admin delete service
router.delete('/admin/:id', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.deleteService
);

// Admin stats
router.get('/admin/stats', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.getServiceStats
);

// Bulk operations
router.post('/admin/bulk', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  bulkOperationLimiter, 
  validateBulk, 
  controller.bulkUpdateServices
);

// Export services
router.get('/admin/export', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  validateQuery, 
  controller.exportServices
);

// Admin image management
router.post('/admin/:id/images', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

router.delete('/admin/:id/images/:publicId', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.removeImage
);

router.put('/admin/:id/thumbnail/:publicId', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.setThumbnail
);

router.post('/admin/:id/thumbnail', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// Toggle popular status
router.patch('/:id/popular', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  controller.togglePopularStatus
);

// ============================================
// BATCH OPERATIONS (Admin only)
// ============================================

router.patch('/batch/status', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

router.patch('/batch/feature', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

router.patch('/batch/recommend', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

router.patch('/batch/popular', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// ============================================
// HEALTH CHECK & METRICS
// ============================================

router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Service routes are operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      authentication: true,
      csrfProtection: true,
      fileUploads: true,
      rateLimiting: true
    }
  });
});

router.get('/metrics/overview', 
  protect, 
  adminOnly, 
  csrfProtection, // ADD CSRF
  serviceLimiter, 
  (req, res) => {
    res.json({
      success: true,
      metrics: {
        routes: {
          public: 9,
          protected: 2,
          user: 8,
          admin: 11,
          total: 30
        },
        security: {
          csrfProtection: true,
          rateLimiting: true,
          fileValidation: true,
          authentication: true
        }
      }
    });
});

// Get all active services
router.get('/all/active', 
  protect, 
  csrfProtection, // ADD CSRF
  controller.getAllActiveServices
);

module.exports = router;