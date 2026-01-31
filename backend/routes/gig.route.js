const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig,
  restoreGig,
  getGigStats,
  searchGigs,
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
const { optionalAuth } = require('../middleware/auth.middleware.js');
const { handleMulterError } = require('../middleware/upload.middleware.js');
const SessionMiddleware = require("../middleware/session.middleware");
const CSRFMiddleware = require('../middleware/csrf.middleware');

// Import cache middleware
const { 
  createCacheMiddleware, 
  createClearCacheMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

// Cache configurations for gigs
const GIG_CACHE_CONFIG = {
  PUBLIC_LIST: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    publicOnly: true,
    tags: ['gigs', 'list']
  },
  DETAIL: {
    ttl: CACHE_TTL.PUBLIC.LONG,
    namespace: NAMESPACES.PUBLIC,
    tags: ['gigs', 'detail']
  },
  USER_GIGS: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.USER,
    tags: ['gigs', 'user']
  },
  STATS: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.USER,
    tags: ['gigs', 'stats']
  }
};

// Create cache middlewares
const cachePublicList = createCacheMiddleware(GIG_CACHE_CONFIG.PUBLIC_LIST);
const cacheDetail = createCacheMiddleware(GIG_CACHE_CONFIG.DETAIL);
const cacheStats = createCacheMiddleware(GIG_CACHE_CONFIG.STATS);

// Clear cache middleware for write operations
const clearGigCache = createClearCacheMiddleware({
  patterns: [
    'gigs:*',
    'gig:*',
    '*:tags:*gigs*'
  ],
  tags: ['gigs'],
  namespace: NAMESPACES.PUBLIC,
  clearAllOnWrite: false
});

// Configure multer
const storage = multer.memoryStorage();

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
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 11
  },
  fileFilter: fileFilter
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/i;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    const maxSize = 5 * 1024 * 1024;
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
});

// Get all gigs
router.get('/', 
  optionalAuth, 
  gigLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  validateQuery, 
  getGigs
);
// Get gig stats (user specific)
router.get('/stats', 
  SessionMiddleware.authenticate, 
  gigLimiter,
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheStats,
  getGigStats
);

// Search gigs
router.get('/search', 
  optionalAuth, 
  gigLimiter,
  cacheControlMiddleware({ public: true, maxAge: 180 }),
  cachePublicList,
  validateQuery, 
  searchGigs
);

// Get gigs by subcategory
router.get('/subcategory/:subcategoryId', 
  optionalAuth, 
  gigLimiter,
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicList,
  validateQuery, 
  getGigsBySubcategory
);

// Get gig by ID
router.get('/:id', 
  optionalAuth, 
  gigLimiter,
  cacheControlMiddleware({ public: true, maxAge: 600 }),
  cacheDetail,
  getGigById
);




// Create gig
router.post('/', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  handleMultipleFileFields, 
  validateCreate, 
  createGig
);

// Update gig
router.put('/:id', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  handleMultipleFileFields, 
  validateUpdate, 
  updateGig
);

// Delete gig
router.delete('/:id', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  deleteGig
);

// Restore gig
router.patch('/:id/restore', 
  SessionMiddleware.authenticate, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  restoreGig
);

// Upload images
router.post('/:id/images/upload', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  handleImageUpload, 
  uploadImages
);

// Remove image
router.delete('/:id/images/:publicId', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  removeImage
);

// Set thumbnail
router.put('/:id/thumbnail/:publicId', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  setThumbnail
);

// Upload thumbnail
router.post('/:id/thumbnail/upload', 
  SessionMiddleware.authenticate, 
  CSRFMiddleware.requireCSRF, 
  gigLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearGigCache,
  handleThumbnailUpload, 
  uploadThumbnail
);

// ==================== HEALTH CHECK ====================

router.get('/health/check', 
  gigLimiter,
  cacheControlMiddleware({ maxAge: 30 }),
  (req, res) => {
    const cache = require('../utils/cache');
    
    res.json({
      success: true,
      message: 'Gig routes are operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cache: cache.stats()
    });
  }
);

router.use(errorHandler);

module.exports = router;