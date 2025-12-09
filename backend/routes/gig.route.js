const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig,
  submitProposal,
  getGigStats
} = require('../controllers/gig.controller.js');

const { validateCreate, validateUpdate, validateProposal } = require('../middleware/validators/gig.validator.js');
const { protect, sellerOnly, userOnly, optionalAuth } = require('../middleware/auth.middleware.js');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip|rar/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images, PDFs, docs, and archives are allowed.'));
  }
});

// Public routes
router.get('/', optionalAuth, getGigs);
router.get('/:id', optionalAuth, getGigById);

// Protected routes
router.get('/stats', protect, getGigStats);
router.post('/', protect, upload.array('attachments', 5), validateCreate, createGig);
router.post('/:id/proposals',  protect, sellerOnly, validateProposal, submitProposal);
router.put('/:id', protect, upload.array('attachments', 5), validateUpdate, updateGig);
router.delete('/:id', protect, deleteGig);

module.exports = router;