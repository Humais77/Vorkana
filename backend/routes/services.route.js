const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/services.controller.js');
const { protect, sellerOnly, adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/service.validator.js');

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const serviceLimiter = rateLimit({
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

const imageUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random bytes
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Security: Sanitize filename
    const originalName = file.originalname.replace(path.extname(file.originalname), '');
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    
    const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    // Additional security checks
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (file.size > maxSize) {
      return cb(new Error('File size exceeds 5MB limit'), false);
    }
    
    // Check for potential malicious files
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
    // Check for executable files
    const executableExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.py'];
    const fileExtension = path.extname(originalName);
    if (executableExtensions.includes(fileExtension)) {
      return cb(new Error('Executable files are not allowed'), false);
    }
    
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only images (jpeg, jpg, png, webp, gif, svg) are allowed.'), false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: fileFilter
});

// Single file upload for thumbnails
const thumbnailUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for thumbnails
    files: 1 // Only one thumbnail
  },
  fileFilter: fileFilter
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB per file (2MB for thumbnails).',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed for service images.',
        code: 'TOO_MANY_FILES'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        code: 'UNEXPECTED_FILE_FIELD'
      });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  if (err.message.includes('File size exceeds')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'FILE_SIZE_EXCEEDED'
    });
  }
  
  if (err.message.includes('Invalid filename')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid filename detected',
      code: 'INVALID_FILENAME'
    });
  }

  if (err.message.includes('Executable files are not allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'EXECUTABLE_FILE_NOT_ALLOWED'
    });
  }
  
  next(err);
};

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all services
router.get('/', optionalAuth, validateQuery, controller.getServices);

// Search services
router.get('/search', optionalAuth, validateQuery, controller.searchServices);

// Get similar services
router.get('/similar/:id', optionalAuth, controller.getSimilarServices);

// Get service by ID or slug
router.get('/:id', optionalAuth, controller.getServiceById);

// ============================================
// PROTECTED ROUTES (All authenticated users)
// ============================================

// Like/Unlike service
router.post('/:id/like', protect, serviceLimiter, controller.toggleLike);

// ============================================
// SELLER ROUTES
// ============================================

// Create service with images
router.post('/', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Update service
router.put('/:id', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete service
router.delete('/:id', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  controller.deleteService
);

// Restore service
router.patch('/:id/restore', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  controller.restoreService
);

// Get seller stats
router.get('/seller/stats', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  validateQuery, 
  controller.getServiceStats
);

// Bulk operations
router.post('/seller/bulk', 
  protect, 
  sellerOnly, 
  bulkOperationLimiter, 
  validateBulk, 
  controller.bulkUpdateServices
);

// Export services
router.get('/seller/export', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  validateQuery, 
  controller.exportServices
);

// ============================================
// SELLER IMAGE MANAGEMENT ROUTES
// ============================================

// Upload additional images
router.post('/:id/images', 
  protect, 
  sellerOnly, 
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Remove specific image
router.delete('/:id/images/:imageUrl', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  controller.removeImage
);

// Set existing image as thumbnail
router.put('/:id/thumbnail/:imageUrl', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  controller.setThumbnail
);

// Upload new thumbnail
router.post('/:id/thumbnail', 
  protect, 
  sellerOnly, 
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// ============================================
// ADMIN ROUTES
// ============================================

// Update service (admin)
router.put('/admin/:id', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete service (admin)
router.delete('/admin/:id', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  controller.deleteService
);

// Get admin stats
router.get('/admin/stats', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  validateQuery, 
  controller.getServiceStats
);

// Bulk operations (admin)
router.post('/admin/bulk', 
  protect, 
  adminOnly, 
  bulkOperationLimiter, 
  validateBulk, 
  controller.bulkUpdateServices
);

// Export services (admin)
router.get('/admin/export', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  validateQuery, 
  controller.exportServices
);

// ============================================
// ADMIN IMAGE MANAGEMENT ROUTES
// ============================================

// Upload additional images (admin)
router.post('/admin/:id/images', 
  protect, 
  adminOnly, 
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Remove specific image (admin)
router.delete('/admin/:id/images/:imageUrl', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  controller.removeImage
);

// Set existing image as thumbnail (admin)
router.put('/admin/:id/thumbnail/:imageUrl', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  controller.setThumbnail
);

// Upload new thumbnail (admin)
router.post('/admin/:id/thumbnail', 
  protect, 
  adminOnly, 
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// ============================================
// BATCH OPERATION ROUTES
// ============================================

// Batch update services status
router.patch('/batch/status', 
  protect, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Batch feature/unfeature services
router.patch('/batch/feature', 
  protect, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Batch recommend/unrecommend services
router.patch('/batch/recommend', 
  protect, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// Batch popular/unpopular services
router.patch('/batch/popular', 
  protect, 
  adminOnly, 
  bulkOperationLimiter, 
  controller.bulkUpdateServices
);

// ============================================
// SERVICE HEALTH CHECK ROUTES
// ============================================

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

// Service metrics
router.get('/metrics/overview', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  (req, res) => {
    res.json({
      success: true,
      metrics: {
        routes: {
          public: 4,
          protected: 1,
          seller: 11,
          admin: 11,
          total: 27
        },
        features: {
          fileUploads: true,
          imageManagement: true,
          bulkOperations: true,
          search: true,
          stats: true,
          export: true,
          rateLimiting: true
        }
      }
    });
});
// routes/services.js - Update this route
router.get('/seller/my-services', 
  protect, 
  sellerOnly, 
  serviceLimiter, 
  controller.getMyServices  // Use the controller method
);

module.exports = router;