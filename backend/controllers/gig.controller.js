const Gig = require('../models/gig.model.js');
const Category = require('../models/category.model.js');
const mongoose = require('mongoose');
const { sanitizeHtml } = require('../utils/sanitize.js');

const createGig = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // req.body now contains text fields
    const data = req.body;

    // If attachments exist
    const attachments = req.files; // array of uploaded files

    if (!data.projectCategory) {
      return res.status(400).json({ success: false, message: 'Project category is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(data.projectCategory)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(data.projectCategory);
    if (!category) return res.status(400).json({ success: false, message: 'Category not found' });

    // Auto-fill user information
    data.createdBy = req.user._id;
    data.fullName = req.user.name || data.fullName; // Use user's name if available
    data.oauthEmail = req.user.email; // Auto-fill user's email

    // If user is logged in, they don't need to provide fullName and email
    if (!data.fullName && req.user.name) {
      data.fullName = req.user.name;
    }

    const gig = new Gig(data);

    // If you want to store attachments paths
    if (attachments && attachments.length > 0) {
      gig.attachments = attachments.map(file => ({
        filename: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype
      }));
    }

    await gig.save();

    await gig.populate('projectCategory', 'name');
    await gig.populate('createdBy', 'name email');

    res.status(201).json({ success: true, gig });
  } catch (err) {
    console.error('CreateGig Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getGigs = async (req, res) => {
  try {
    const gigs = await Gig.find()
      .populate('projectCategory', 'name')
      .populate('createdBy', 'fullname email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, gigs });
  } catch (err) {
    console.error('GetGigs Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getGigById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid Gig ID' });

    const gig = await Gig.findById(id)
      .populate('projectCategory', 'name')
      .populate('createdBy', 'fullname email');

    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    res.json({ success: true, gig });
  } catch (err) {
    console.error('GetGigById Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateGig = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid Gig ID' });

    const gig = await Gig.findById(id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    if (req.user.role !== 'admin' && gig.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden' });

    const data = req.body;
    delete data.createdBy;

    if (data.projectCategory && !mongoose.Types.ObjectId.isValid(data.projectCategory))
      return res.status(400).json({ success: false, message: 'Invalid category ID' });

    if (data.projectCategory) {
      const category = await Category.findById(data.projectCategory);
      if (!category) return res.status(400).json({ success: false, message: 'Category not found' });
    }

    const updated = await Gig.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('projectCategory', 'name')
      .populate('createdBy', 'fullname email');

    res.json({ success: true, gig: updated });
  } catch (err) {
    console.error('UpdateGig Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteGig = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid Gig ID' });

    const gig = await Gig.findById(id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    if (req.user.role !== 'admin' && gig.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden' });

    await gig.deleteOne();
    res.json({ success: true, message: 'Gig deleted successfully' });
  } catch (err) {
    console.error('DeleteGig Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createGig, getGigs, getGigById, updateGig, deleteGig
};