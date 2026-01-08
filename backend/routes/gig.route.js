// gig.route.js - Updated with proper CORS and security headers
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ipKeyGenerator } = require('express-rate-limit');

const {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig,
  restoreGig,
  getGigStats,
  searchGigs,
  exportGigs,
  uploadImages,
  removeImage,
  setThumbnail,
  uploadThumbnail,
  getGigsBySubcategory,
  errorHandler
} = require('../controllers/gig.controller.js');

const { 
  validateCreate, 
  validateUpdate, 
  validateQuery 
} = require('../middleware/validators/gig.validator.js');
const { csrfProtection, setCsrfToken } = require('../middleware/csrf.js');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth.middleware.js');
const { handleMulterError } = require('../middleware/upload.middleware.js');

// Configure multer storage
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
    const sanitizedName = file.originalname
      .replace(path.extname(file.originalname), '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    const filename = `${sanitizedName}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip|rar|webp|gif/i;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    const maxSize = 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return cb(new Error('File size exceeds 10MB limit'), false);
    }
    
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
    // Security check for executable files
    const executableExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.py'];
    const fileExtension = path.extname(originalName);
    if (executableExtensions.includes(fileExtension)) {
      return cb(new Error('Executable files are not allowed'), false);
    }
    
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only images, PDFs, docs, and archives are allowed.'), false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: fileFilter
});

// Configure multer for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/i;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    const maxSize = 5 * 1024 * 1024; // 5MB for images
    
    if (file.size > maxSize) {
      return cb(new Error('Image size exceeds 5MB limit'), false);
    }
    
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
    return cb(null, true);
  }
  
  cb(new Error('Invalid image type. Only JPEG, JPG, PNG, WebP, and GIF are allowed.'), false);
};

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  },
  fileFilter: imageFilter
});

const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: imageFilter
});

const handleMultipleFileFields = (req, res, next) => {
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'thumbnail', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
};

const handleImageUpload = (req, res, next) => {
  imageUpload.array('images', 10)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
};

const handleThumbnailUpload = (req, res, next) => {
  thumbnailUpload.single('thumbnail')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
};

// Rate limiting
const rateLimit = require('express-rate-limit');

const gigLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // ✅ FIXED: Use ipKeyGenerator properly
  keyGenerator: (req, res) => {
    // Use the built-in ipKeyGenerator
    const ip = ipKeyGenerator(req, res);
    
    // Include user ID if authenticated
    return req.user?._id ? `${ip}-${req.user._id}` : ip;
  }
});
router.use(setCsrfToken);
// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

router.get('/', optionalAuth, validateQuery, getGigs);
router.get('/subcategory/:subcategoryId', optionalAuth, validateQuery, getGigsBySubcategory);
router.get('/search', optionalAuth, validateQuery, searchGigs);
router.get('/:id', optionalAuth, getGigById);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

router.post('/', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  handleMultipleFileFields, 
  validateCreate, 
  createGig
);

router.put('/:id', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  handleMultipleFileFields, 
  validateUpdate, 
  updateGig
);

// Image management routes
router.post('/:id/images/upload', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  handleImageUpload, 
  uploadImages
);
router.delete('/:id/images/:publicId', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  removeImage
);

router.put('/:id/thumbnail/:publicId', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  setThumbnail
);
router.post('/:id/thumbnail/upload', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  handleThumbnailUpload, 
  uploadThumbnail
);
router.delete('/:id', 
  protect,
  csrfProtection, // CSRF check
  gigLimiter, 
  deleteGig
);
// ============================================
// ADMIN ROUTES (Admin only)
// ============================================
router.get('/stats', 
  protect, // ✅ Uses cookie-based auth
  adminOnly, 
  csrfProtection,
  setCsrfToken,
  gigLimiter, 
  getGigStats
);

router.get('/export', 
  protect, // ✅ Uses cookie-based auth
  adminOnly, 
  csrfProtection,
  setCsrfToken,
  gigLimiter, 
  validateQuery, 
  exportGigs
);

router.patch('/:id/restore', 
  protect, // ✅ Uses cookie-based auth
  adminOnly, 
  csrfProtection,
  setCsrfToken,
  gigLimiter, 
  restoreGig
);

// Add health check route
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Gig routes are operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use(errorHandler);

module.exports = router;