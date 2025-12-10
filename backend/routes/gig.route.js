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
  submitProposal,
  getGigStats,
  searchGigs,
  exportGigs
} = require('../controllers/gig.controller.js');

const { 
  validateCreate, 
  validateUpdate, 
  validateProposal,
  validateQuery 
} = require('../middleware/validators/gig.validator.js');
const { protect, sellerOnly, userOnly, optionalAuth, adminOnly } = require('../middleware/auth.middleware.js');

// Configure multer storage
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
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    // Additional security checks
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      return cb(new Error('File size exceeds 10MB limit'), false);
    }
    
    // Check for potential malicious files
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only images, PDFs, docs, and archives are allowed.'), false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: fileFilter
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB per file.',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.',
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
  
  next(err);
};

// Rate limiting middleware (you can add this separately)
const rateLimit = require('express-rate-limit');

const gigLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const proposalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 proposal submissions per hour
  message: {
    success: false,
    message: 'Too many proposal submissions, please try again later.',
    code: 'PROPOSAL_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get('/', optionalAuth, validateQuery, getGigs);
router.get('/search', optionalAuth, validateQuery, searchGigs);
router.get('/:id', optionalAuth, getGigById);

// Protected routes
router.get('/stats', protect, gigLimiter, getGigStats);
router.post('/', protect, gigLimiter, upload.array('attachments', 5), handleMulterError, validateCreate, createGig);
router.post('/:id/proposals', protect, sellerOnly, proposalLimiter, validateProposal, submitProposal);
router.put('/:id', protect, gigLimiter, upload.array('attachments', 5), handleMulterError, validateUpdate, updateGig);
router.delete('/:id', protect, gigLimiter, deleteGig);
router.patch('/:id/restore', protect, adminOnly, gigLimiter, restoreGig);
router.get('/export', protect, adminOnly, gigLimiter, validateQuery, exportGigs);

module.exports = router;