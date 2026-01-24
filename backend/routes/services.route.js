// routes/service.route.js - Production Ready with Redis Cache
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
const CSRFMiddleware = require('../middleware/csrf.middleware');
const rateLimit = require('express-rate-limit');
const { 
  upload, 
  thumbnailUpload, 
  handleMulterError,
  processUploadToCloudinary 
} = require('../middleware/upload.middleware.js');

// Import cache middleware
const { 
  createCacheMiddleware, 
  createClearCacheMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

// Cache configurations for services
const SERVICE_CACHE_CONFIG = {
  PUBLIC_LIST: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    publicOnly: true,
    tags: ['services', 'list']
  },
  ADMIN_LIST: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.ADMIN,
    checkUserRole: true,
    rolesToBypass: ['admin'],
    tags: ['services', 'admin', 'list']
  },
  DETAIL: {
    ttl: CACHE_TTL.PUBLIC.LONG,
    namespace: NAMESPACES.PUBLIC,
    tags: ['services', 'detail']
  },
  POPULAR: {
    ttl: CACHE_TTL.PUBLIC.SHORT,
    namespace: NAMESPACES.PUBLIC,
    tags: ['services', 'popular']
  },
  USER_SERVICES: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.USER,
    tags: ['services', 'user']
  },
  STATS: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.ADMIN,
    tags: ['services', 'stats']
  }
};

// Create cache middlewares
const cachePublicList = createCacheMiddleware(SERVICE_CACHE_CONFIG.PUBLIC_LIST);
const cacheAdminList = createCacheMiddleware(SERVICE_CACHE_CONFIG.ADMIN_LIST);
const cacheDetail = createCacheMiddleware(SERVICE_CACHE_CONFIG.DETAIL);
const cachePopular = createCacheMiddleware(SERVICE_CACHE_CONFIG.POPULAR);
const cacheUserServices = createCacheMiddleware(SERVICE_CACHE_CONFIG.USER_SERVICES);
const cacheStats = createCacheMiddleware(SERVICE_CACHE_CONFIG.STATS);

// Clear cache middleware for write operations
const clearServiceCache = createClearCacheMiddleware({
  patterns: [
    'services:*',
    'service:*',
    '*:tags:*services*'
  ],
  tags: ['services'],
  namespace: NAMESPACES.PUBLIC,
  clearAllOnWrite: false
});

// Rate limiting
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

// ==================== PUBLIC ROUTES (Cached) ====================
router.get('/my-services', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  serviceLimiter,
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheUserServices,
  validateQuery, 
  controller.getMyServices
);
// Get all services (public - cached)
router.get('/', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  validateQuery, 
  controller.getServices
);

// Get services with stats
router.get('/with-stats', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 180 }),
  cachePublicList,
  controller.getServicesWithCategoryStats
);

// Search services
router.get('/search', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 180 }),
  cachePublicList,
  validateQuery, 
  controller.searchServices
);

// Get service by ID or slug
router.get('/:id', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 600 }),
  cacheDetail,
  controller.getServiceById
);

// Get popular services
router.get('/popular', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 180 }),
  cachePopular,
  controller.getPopularServices
);

// Get popular services by category
router.get('/popular/category', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePopular,
  controller.getPopularServicesByCategory
);

// Get services by category
router.get('/category/:categoryId', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  controller.getServicesByCategory
);

// Get services by subcategory
router.get('/subcategory/:subcategoryId', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  controller.getServicesBySubcategory
);

// Get similar services
router.get('/similar/:id', 
  optionalAuth, 
  serviceLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  controller.getSimilarServices
);

// ==================== USER ROUTES (Cached for user) ====================

// Get my services


// ==================== ADMIN READ ROUTES (Cached) ====================

// Get admin services
router.get('/admin/services', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheAdminList,
  validateQuery, 
  controller.getAdminServices
);

// Get admin stats
router.get('/admin/stats', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ public: false, maxAge: 180 }),
  cacheStats,
  controller.getServiceStats
);

// Export services (admin - no cache)
router.get('/admin/export', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  validateQuery, 
  controller.exportServices
);

// ==================== USER WRITE ROUTES (Clear Cache) ====================

// Create service
router.post('/', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  uploadWithThumbnail, 
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Update my service
router.put('/:id', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  uploadWithThumbnail,
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete my service
router.delete('/:id', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.deleteService
);

// Restore my service
router.patch('/:id/restore', 
  SessionMiddleware.authenticate, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.restoreService
);

// Upload additional images
router.post('/:id/images', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  imageUploadLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Remove specific image
router.delete('/:id/images/:publicId', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.removeImage
);

// Set existing image as thumbnail
router.put('/:id/thumbnail/:publicId', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.setThumbnail
);

// Upload new thumbnail
router.post('/:id/thumbnail', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF,
  imageUploadLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// ==================== ADMIN WRITE ROUTES (Clear Cache) ====================

// Admin create service
router.post('/admin/create', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  uploadWithThumbnail,
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Admin update service
router.put('/admin/:id', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Admin delete service
router.delete('/admin/:id', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.deleteService
);

// Bulk operations (admin)
router.post('/admin/bulk', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  validateBulk, 
  controller.bulkUpdateServices
);

// Admin upload images
router.post('/admin/:id/images', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  imageUploadLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Admin remove image
router.delete('/admin/:id/images/:publicId', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.removeImage
);

// Admin set thumbnail
router.put('/admin/:id/thumbnail/:publicId', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.setThumbnail
);

// Admin upload thumbnail
router.post('/admin/:id/thumbnail', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  imageUploadLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// Toggle popular status
router.patch('/:id/popular', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  serviceLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.togglePopularStatus
);

// Batch operations
router.patch('/batch/status', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.bulkUpdateServices
);

router.patch('/batch/feature', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.bulkUpdateServices
);

router.patch('/batch/recommend', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.bulkUpdateServices
);

router.patch('/batch/popular', 
  SessionMiddleware.authenticate, 
  adminOnly, 
  bulkOperationLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearServiceCache,
  controller.bulkUpdateServices
);

// ==================== HEALTH CHECK ====================

router.get('/health/check', 
  serviceLimiter,
  cacheControlMiddleware({ maxAge: 30 }),
  (req, res) => {
    const cache = require('../utils/cache');
    
    res.json({
      success: true,
      message: 'Service routes are operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cache: cache.stats()
    });
  }
);

module.exports = router;