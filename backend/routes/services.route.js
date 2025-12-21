const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/services.controller.js');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth.middleware.js');
const { 
  validateCreate, 
  validateUpdate, 
  validateBulk, 
  validateQuery 
} = require('../middleware/validators/service.validator.js');

const rateLimit = require('express-rate-limit');

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    
    const originalName = file.originalname.replace(path.extname(file.originalname), '');
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    
    const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    const maxSize = 5 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return cb(new Error('File size exceeds 5MB limit'), false);
    }
    
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
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
    fileSize: 5 * 1024 * 1024,
    files: 10
  },
  fileFilter: fileFilter
});

const thumbnailUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  },
  fileFilter: fileFilter
});
const uploadWithThumbnail = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 11 // 1 thumbnail + 10 images max
  },
  fileFilter: fileFilter
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'thumbnail', maxCount: 1 }
]);

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
router.get('/my-services', 
  protect, 
  serviceLimiter, 
  validateQuery, 
  controller.getMyServices
);
// Get service by ID or slug
router.get('/:id', optionalAuth, controller.getServiceById);

// ============================================
// PROTECTED ROUTES (All authenticated users)
// ============================================

// Like/Unlike service
router.post('/:id/like', protect, serviceLimiter, controller.toggleLike);

// ============================================
// USER ROUTES (Service creators)
// ============================================

// Get my created services


// Create service with images
router.post('/', 
  protect, 
  serviceLimiter, 
  uploadWithThumbnail, // This handles both thumbnail and images
  handleMulterError, 
  validateCreate, 
  controller.createService
);

// Update my service
router.put('/:id', 
  protect, 
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete my service
router.delete('/:id', 
  protect, 
  serviceLimiter, 
  controller.deleteService
);

// Restore my service
router.patch('/:id/restore', 
  protect, 
  serviceLimiter, 
  controller.restoreService
);

// Upload additional images to my service
router.post('/:id/images', 
  protect, 
  imageUploadLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  controller.uploadImages
);

// Remove specific image from my service
router.delete('/:id/images/:publicId', 
  protect, 
  serviceLimiter, 
  controller.removeImage
);

// Set existing image as thumbnail for my service
router.put('/:id/thumbnail/:publicId', 
  protect, 
  serviceLimiter, 
  controller.setThumbnail
);

// Upload new thumbnail for my service
router.post('/:id/thumbnail', 
  protect, 
  imageUploadLimiter, 
  thumbnailUpload.single('thumbnail'), 
  handleMulterError, 
  controller.uploadThumbnail
);

// ============================================
// ADMIN ROUTES
// ============================================

// Update any service (admin)
router.put('/admin/:id', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  upload.array('images', 10), 
  handleMulterError, 
  validateUpdate, 
  controller.updateService
);

// Delete any service (admin)
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
router.delete('/admin/:id/images/:publicId', 
  protect, 
  adminOnly, 
  serviceLimiter, 
  controller.removeImage
);

// Set existing image as thumbnail (admin)
router.put('/admin/:id/thumbnail/:publicId', 
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
// BATCH OPERATION ROUTES (Admin only)
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
          user: 8,
          admin: 11,
          total: 24
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

module.exports = router;