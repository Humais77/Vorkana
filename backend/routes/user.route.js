const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { switchRole } = require('../controllers/user.controller');

router.patch('/switch-role', protect, switchRole);

module.exports = router;