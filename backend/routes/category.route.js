const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller.js');
const { protect, adminOnly } = require('../middleware/auth.middleware.js');
const { validateCreate } = require('../middleware/validators/category.validator.js');


router.post('/', protect, adminOnly, validateCreate, controller.createCategory);
router.get('/', controller.getCategories);
router.get('/:id', controller.getCategoryById);
router.put('/:id', protect, validateCreate, controller.updateCategory);
router.delete('/:id', protect, adminOnly, controller.deleteCategory);

module.exports = router;