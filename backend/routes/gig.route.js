const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  // New image-related functions
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
const {  optionalAuth, adminOnly } = require('../middleware/auth.middleware.js');
const { handleMulterError } = require('../middleware/upload.middleware.js');
const SessionMiddleware = require("../middleware/session.middleware");

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

// Configure multer for images (different from regular files)
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
});

//  SessionMiddleware.authenticateed stats and export routes
router.get('/stats',  SessionMiddleware.authenticate, gigLimiter, getGigStats);
router.get('/export',  SessionMiddleware.authenticate, adminOnly, gigLimiter, validateQuery, exportGigs);
router.get('/', optionalAuth, validateQuery, getGigs);
router.get('/search', optionalAuth, validateQuery, searchGigs);
router.get('/subcategory/:subcategoryId', optionalAuth, validateQuery, getGigsBySubcategory);
router.get('/:id', optionalAuth, getGigById);

//  SessionMiddleware.authenticateed routes - authentication via cookies
router.post('/',  SessionMiddleware.authenticate, gigLimiter, handleMultipleFileFields, validateCreate, createGig);
router.put('/:id',  SessionMiddleware.authenticate, gigLimiter, handleMultipleFileFields, validateUpdate, updateGig);
router.delete('/:id',  SessionMiddleware.authenticate, gigLimiter, deleteGig);
router.patch('/:id/restore',  SessionMiddleware.authenticate, adminOnly, gigLimiter, restoreGig);

//  SessionMiddleware.authenticateed image management routes
router.post('/:id/images/upload',  SessionMiddleware.authenticate, gigLimiter, handleImageUpload, uploadImages);
router.delete('/:id/images/:publicId',  SessionMiddleware.authenticate, gigLimiter, removeImage);
router.put('/:id/thumbnail/:publicId',  SessionMiddleware.authenticate, gigLimiter, setThumbnail);
router.post('/:id/thumbnail/upload',  SessionMiddleware.authenticate, gigLimiter, handleThumbnailUpload, uploadThumbnail);


router.use(errorHandler)

module.exports = router;