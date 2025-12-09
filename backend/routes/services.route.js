const express = require('express');
const router = express.Router();
const controller = require('../controllers/services.controller.js');
const { protect } = require('../middleware/auth.middleware.js');
const { validateCreate, validateUpdate } = require('../middleware/validators/service.validator.js');

router.post('/', protect, validateCreate, controller.createService);
router.get('/', controller.getServices);
router.get('/stats', controller.getServiceStats);
router.get('/export', controller.exportServices);
router.get('/:id', controller.getServiceById);
router.put('/:id', protect, validateUpdate, controller.updateService);
router.delete('/:id', protect, controller.deleteService);
router.post('/bulk', protect, controller.bulkUpdateServices);

module.exports = router;