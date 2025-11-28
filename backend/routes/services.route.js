const express = require('express');
const {
    createService,
    getServices,
    getServiceById,
    updateService,
    deleteService,
} = require('../controllers/services.controller');
const router = express.Router();

router.post("/", createService);
router.get("/", getServices);
router.get("/:id", getServiceById);
router.put("/:id", updateService);
router.delete("/:id", deleteService);

module.exports = router;