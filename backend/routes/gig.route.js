const express = require('express');
const router = express.Router();

const {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig
} = require('../controllers/gig.controller.js');

const { validateCreate, validateUpdate } = require('../middleware/validators/gig.validator.js');
const { protect } = require('../middleware/auth.middleware.js');
const { creatorOrAdmin } = require('../middleware/gig.middleware.js');

router.get('/', getGigs);
router.get('/:id', getGigById);

router.post('/', protect, validateCreate, createGig);

router.put('/:id',
  protect,
  creatorOrAdmin,
  validateUpdate,
  updateGig
);

router.delete('/:id',
  protect,
  creatorOrAdmin,
  deleteGig
);

module.exports = router;
