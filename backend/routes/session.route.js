const express = require('express');
const router = express.Router();
const {
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  refreshSession,
  checkSessionStatus
} = require('../controllers/auth.controller');
const SessionMiddleware = require('../middleware/session.middleware');

// All routes require authentication
router.use(SessionMiddleware.authenticate);

// Get active sessions
router.get('/sessions', getActiveSessions);

// Terminate specific session
router.delete('/sessions/:sessionId', terminateSession);

// Terminate all other sessions
router.delete('/sessions', terminateAllOtherSessions);

// Refresh session
router.post('/refresh', refreshSession);

// Check session status (public route - optional auth)
router.get('/status', 
  SessionMiddleware.optionalAuth,
  checkSessionStatus
);

module.exports = router;