const mongoose = require('mongoose');
const Gig = require('../models/gig.model.js');

const creatorOrAdmin = async (req, res, next) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid Gig ID' });
  }

  const gig = await Gig.findById(id);
  if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

  if (req.user.role !== 'admin' && gig.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  req.gig = gig;
  next();
};

module.exports = { creatorOrAdmin };
