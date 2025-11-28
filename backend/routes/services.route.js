const express = require('express');
const controller = require('../controllers/services.controller.js');
const { protect, adminOnly } = require('../middleware/auth.middleware.js');
const { validateCreate } = require('../middleware/validators/service.validator.js');
const router = express.Router();

router.post("/", protect,validateCreate,controller.createService);
router.get("/", controller.getServices);
router.get("/:id", controller.getServiceById);
router.put('/:id', protect, validateCreate, controller.updateService);
router.delete('/:id', protect, adminOnly, controller.deleteService); 

module.exports = router;