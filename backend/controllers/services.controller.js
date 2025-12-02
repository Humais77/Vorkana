// backend/controllers/services.controller.js

const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');

/**
 * Sanitize string input to prevent XSS attacks
 */
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }).trim();
};

/**
 * Sanitize request body
 */
const sanitizeBody = (body) => {
  const clean = {};
  for (const key in body) {
    if (Object.hasOwn(body, key)) {
      clean[key] = typeof body[key] === 'string' ? sanitizeInput(body[key]) : body[key];
    }
  }
  return clean;
};

/**
 * Create a new service
 */
const createService = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { title, description, category, price, deliveryTime } = sanitizeBody(req.body);

    // Validate required fields
    if (!title || !category || price === undefined || !deliveryTime) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate numeric values
    if (price < 0) return res.status(400).json({ success: false, message: 'Invalid price' });
    if (deliveryTime < 1) return res.status(400).json({ success: false, message: 'Invalid delivery time' });

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });

    const service = await Service.create({
      title,
      description: description || '',
      category,
      price,
      deliveryTime,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, service });
  } catch (err) {
    next(err); 
  }
};


const getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .populate('category', 'name')
      .populate('createdBy', 'fullname email'); 

    res.json({ success: true, services });
  } catch (err) {
    next(err);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const service = await Service.findById(id)
      .populate('category', 'name')
      .populate('createdBy', 'fullname email');

    if (!service || service.isActive === false) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, service });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const service = await Service.findById(id);
    if (!service || service.isActive === false) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    if (req.user.role !== 'admin' && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const cleanData = sanitizeBody(req.body);
    const allowed = ['title', 'description', 'category', 'price', 'deliveryTime'];

    allowed.forEach(field => {
      if (Object.hasOwn(cleanData, field)) {
        service[field] = cleanData[field];
      }
    });
    if (service.price < 0) return res.status(400).json({ success: false, message: 'Invalid price' });
    if (service.deliveryTime < 1) return res.status(400).json({ success: false, message: 'Invalid delivery time' });
    if (cleanData.category) {
      if (!mongoose.Types.ObjectId.isValid(cleanData.category)) {
        return res.status(400).json({ success: false, message: 'Invalid category ID' });
      }
      const cat = await Category.findById(cleanData.category);
      if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });
    }

    await service.save();

    const populated = await Service.findById(service._id)
      .populate('category', 'name')
      .populate('createdBy', 'fullname email');

    res.json({ success: true, service: populated || service });
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const service = await Service.findById(id);
    if (!service || service.isActive === false) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (req.user.role !== 'admin' && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    service.isActive = false;
    await service.save();

    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
};
