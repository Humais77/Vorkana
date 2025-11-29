const Gig = require('../models/gig.model.js');
const { sanitizeInput } = require('../utils/sanitize.js');

const sanitizeBody = (body) => {
  const clean = {};
  for (const key in body) {
    clean[key] = typeof body[key] === 'string' ? sanitizeInput(body[key]) : body[key];
  }
  return clean;
};

// Create Gig
const createGig = async (req, res) => {
  try {
    const cleanData = sanitizeBody(req.body);
    const gig = await Gig.create(cleanData);
    res.status(201).json({ success: true, gig });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get All Gigs
const getGigs = async (req, res) => {
  try {
    const gigs = await Gig.find().populate('projectCategory', 'name').sort({ createdAt: -1 });
    res.json({ success: true, gigs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get Gig By ID
const getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id).populate('projectCategory', 'name');
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    res.json({ success: true, gig });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update Gig
const updateGig = async (req, res) => {
  try {
    const cleanData = sanitizeBody(req.body);
    const updated = await Gig.findByIdAndUpdate(req.params.id, cleanData, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Gig not found' });
    res.json({ success: true, gig: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete Gig (Admin Only)
const deleteGig = async (req, res) => {
  try {
    const deleted = await Gig.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Gig not found' });
    res.json({ success: true, message: 'Gig deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { createGig, getGigs, getGigById, updateGig, deleteGig };