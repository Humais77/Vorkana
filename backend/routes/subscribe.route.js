const express = require('express');
const { 
  subscribe,
  verifyEmail,
  unsubscribe,
  updatePreferences,
  getStats,
  getSubscriberStatus
} = require('../controllers/subscribe.controller');
const { protect } = require('../middleware/auth.middleware');
const { verifyAdmin } = require('../middleware/admin.middleware');
const router = express.Router();

// Public routes
router.post('/subscribe', subscribe);
router.get('/verify/:token', verifyEmail);
router.get('/unsubscribe/:token', unsubscribe);
router.get('/status/:email', getSubscriberStatus); // Made public for checking status

// Protected routes (for logged-in users to update preferences)
router.patch('/preferences', protect, updatePreferences);

// Admin routes
router.get('/stats', protect, verifyAdmin, getStats);

module.exports = router;