const express = require('express');
const { 
  subscribe,
  unsubscribe,
  getSubscriptionStatus,
  toggleSubscription
} = require('../controllers/subscribe.controller');

const router = express.Router();

// Simple subscription routes
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/toggle', toggleSubscription); // One endpoint for both actions
router.get('/status/:email', getSubscriptionStatus);

module.exports = router;