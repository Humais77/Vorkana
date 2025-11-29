const mongoose = require('mongoose');
const Category = require('../models/category.model.js');

// Create
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category with that name already exists' });
    }
    next(error);
  }
};

// Get all
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .lean()
      .sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// Get by ID
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findOne({ _id: id, isActive: true });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// Update
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.createdBy && req.user.role !== 'admin' &&
      category.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { name, description } = req.body;
    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();

    await category.save();

    res.json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category with that name already exists' });
    }
    next(error);
  }
};

// Delete (soft delete)
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.createdBy && req.user.role !== 'admin' &&
      category.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
