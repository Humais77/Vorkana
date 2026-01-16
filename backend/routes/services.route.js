// service.route.js - Remove local storage configurations
const express = require('express');
const router = express.Router();
const controller = require('../controllers/services.controller.js');
const { adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/service.validator.js');
const SessionMiddleware = require("../middleware/session.middleware");

const rateLimit = require('express-rate-limit');
const { 
  upload, 
  thumbnailUpload, 
  handleMulterError,
  processUploadToCloudinary 
} = require('../middleware/upload.middleware.js');

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
  legacyHeaders: false,
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
  legacyHeaders: false,
});

// Create combined upload middleware
const uploadWithThumbnail = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Get all services
router.get('/', optionalAuth, validateQuery, controller.getServices);
// Get services with stats
router.get('/with-stats', 
  optionalAuth, 
  serviceLimiter, 
  controller.getServicesWithCategoryStats
);
// Search services
router.get('/search', optionalAuth, validateQuery, controller.searchServices);

// Get similar services
router.get('/similar/:id', optionalAuth, controller.getSimilarServices);

// Get my services
router.get('/my-services', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  validateQuery, 
  controller.getMyServices
);

// Get service by ID or slug
router.get('/:id', optionalAuth, controller.getServiceById);

// Get popular services
router.get('/popular', 
  optionalAuth, 
  serviceLimiter, 
  controller.getPopularServices
);

// Get popular services by category
router.get('/popular/category', 
  optionalAuth, 
  serviceLimiter, 
  controller.getPopularServicesByCategory
);

// Get all active services
router.get('/all/active', 
   SessionMiddleware.authenticate, 
  controller.getAllActiveServices
);

// Get services by category
router.get('/category/:categoryId', 
  optionalAuth, 
  serviceLimiter, 
  controller.getServicesByCategory
);

// Get services by subcategory ID
router.get('/subcategory/:subcategoryId', 
  optionalAuth, 
  serviceLimiter, 
  controller.getServicesBySubcategory
);

// Get services by subcategory slug
router.get('/subcategory/slug/:slug', 
  optionalAuth, 
  serviceLimiter, 
  controller.getServicesBySubcategorySlug
);

// Create service with Cloudinary uploads
router.post('/', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  uploadWithThumbnail, 
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Update my service
router.put('/:id', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  uploadWithThumbnail,
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete my service
router.delete('/:id', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  controller.deleteService
);

// Restore my service
router.patch('/:id/restore', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  controller.restoreService
);

// Upload additional images to my service (Cloudinary)
router.post('/:id/images', 
   SessionMiddleware.authenticate, 
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Remove specific image from my service (Cloudinary)
router.delete('/:id/images/:publicId', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  controller.removeImage
);

// Set existing image as thumbnail for my service
router.put('/:id/thumbnail/:publicId', 
   SessionMiddleware.authenticate, 
  serviceLimiter, 
  controller.setThumbnail
);

// Upload new thumbnail for my service (Cloudinary)
router.post('/:id/thumbnail', 
   SessionMiddleware.authenticate, 
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// Admin create service
router.post('/admin/create', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  uploadWithThumbnail,
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Get admin services
router.get('/admin/services', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  validateQuery, 
  controller.getAdminServices
);

// Update any service (admin)
router.put('/admin/:id', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete any service (admin)
router.delete('/admin/:id', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  controller.deleteService
);

// Get admin stats
router.get('/admin/stats', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  controller.getServiceStats
);

// Bulk operations (admin)
router.post('/admin/bulk', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter, 
  validateBulk, 
  controller.bulkUpdateServices
);

// Export services (admin)
router.get('/admin/export', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  validateQuery, 
  controller.exportServices
);

// Upload additional images (admin)
router.post('/admin/:id/images', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Remove specific image (admin)
router.delete('/admin/:id/images/:publicId', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  controller.removeImage
);

// Set existing image as thumbnail (admin)
router.put('/admin/:id/thumbnail/:publicId', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  controller.setThumbnail
);

// Upload new thumbnail (admin)
router.post('/admin/:id/thumbnail', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// Toggle popular status (admin)
router.patch('/:id/popular', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter, 
  controller.togglePopularStatus
);

// Batch update services status
router.patch('/batch/status', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Batch feature/unfeature services
router.patch('/batch/feature', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Batch recommend/unrecommend services
router.patch('/batch/recommend', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Batch popular/unpopular services
router.patch('/batch/popular', 
   SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Service health check
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Service routes are operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

module.exports = router;