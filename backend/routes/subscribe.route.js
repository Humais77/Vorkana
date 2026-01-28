const express = require('express');
const { 
  subscribe,
  unsubscribe,
  getSubscriptionStatus,
  toggleSubscription
} = require('../controllers/subscribe.controller');
const CSRFMiddleware = require('../middleware/csrf.middleware');

const router = express.Router();

// Simple subscription routes
router.post('/subscribe', CSRFMiddleware.requireCSRF, subscribe);
router.post('/unsubscribe', CSRFMiddleware.requireCSRF, unsubscribe);
router.post('/toggle', CSRFMiddleware.requireCSRF, toggleSubscription);
router.get('/status/:email', getSubscriptionStatus);

module.exports = router;