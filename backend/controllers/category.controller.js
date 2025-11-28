const Category = require('../models/category.model.js');
const slugify = require('slugify');
const errorHandler = require('../utils/errorHandler.js');

const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const category = await Category.create({
            name,
            description,
            createdBy: req.user?._id,
        });
        res.status(201).json({ success: true, category });
    } catch (error) {
       next(error);
    }
}

const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find().lean().sort({ createdAt: -1 });
        res.json({ success: true, categories });
    } catch (error) {
       next(error);
    }
}

const getCategoryById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const categoryById = await Category.findById(id).lean()
        if (!categoryById) return res.status(404).json({ message: "Category not found" });
        res.json({ success: true, categoryById });
    } catch (error) {
       next(error);
    }
}

const updateCategory = async (req, res, next) => {
    try {
    const id = req.params.id;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    // ownership: only creator or admin
    if (category.createdBy && req.user.role !== 'admin' && category.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { name, description } = req.body;
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    await category.save();

    res.json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

const deleteCategory = async (req, res, next) => {
    try {
    const id = req.params.id;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    // ownership check
    if (category.createdBy && req.user.role !== 'admin' && category.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory };