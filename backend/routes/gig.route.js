const express = require('express');
const router = express.Router();

const { createGig, getGigs,getGigById, updateGig, deleteGig } = require('../controllers/gig.controller.js');
const { validateCreate, validateUpdate } = require('../middleware/validators/gig.validator.js');
const { adminOnly } = require('../middleware/auth.middleware.js');

router.get('/', getGigs);
router.get('/:id', getGigById);
router.post('/', validateCreate, createGig);
router.put('/:id', validateUpdate, updateGig);
router.delete('/:id', adminOnly, deleteGig);

module.exports = router;