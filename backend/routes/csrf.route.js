// routes/csrf.route.js
const express = require('express');
const router = express.Router();
const CSRFMiddleware = require('../middleware/csrf.middleware');
const SessionMiddleware = require('../middleware/session.middleware');

// Get CSRF token (public endpoint, rate limited)
router.get('/token', (req, res) => {
  const token = CSRFMiddleware.generateToken(req, res);
  
  res.json({
    success: true,
    csrfToken: token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });
});

// Refresh CSRF token (requires authentication)
router.post('/refresh',
  SessionMiddleware.authenticate,
  (req, res) => {
    const token = CSRFMiddleware.generateToken(req, res);
    
    res.json({
      success: true,
      csrfToken: token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
  }
);

// Validate CSRF token (for debugging/testing)
router.post('/validate',
  SessionMiddleware.authenticate,
  (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required'
      });
    }
    
    const validation = CSRFMiddleware.validateToken(req, token);
    
    res.json({
      success: true,
      valid: validation.valid,
      error: validation.error,
      tokenData: validation.valid ? validation.tokenData : null
    });
  }
);

// Get CSRF stats (admin only)
router.get('/stats',
  SessionMiddleware.authenticate,
  SessionMiddleware.authorize('admin'),
  (req, res) => {
    const stats = CSRFMiddleware.getTokenStats();
    
    res.json({
      success: true,
      stats
    });
  }
);

module.exports = router;