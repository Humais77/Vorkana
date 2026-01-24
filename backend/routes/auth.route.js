// routes/auth.route.js - Production Ready with Redis Cache
const express = require("express");
const passport = require("passport");
const crypto = require("crypto");
const { 
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getPublicProfile,
  deactivateAccount,
  reactivateAccount,
  generateToken,
  generateRefreshToken,
  verifyEmailRedirect,
  resetPasswordRedirect,
  handleJSONErrors,
  checkVerificationStatus,
  setAuthCookies,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  refreshSession,
  checkSessionStatus,
  refreshCSRFToken
} = require("../controllers/auth.controller.js");
const { 
  protect, 
  verifyEmailToken, 
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  validateRequest,
  optionalAuth
} = require("../middleware/auth.middleware.js");
const SessionMiddleware = require("../middleware/session.middleware");
const SessionService = require("../services/session.service");
const CSRFMiddleware = require("../middleware/csrf.middleware");

// Import cache middleware
const { 
  createCacheMiddleware, 
  createClearCacheMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

// Cache configurations for auth
const AUTH_CACHE_CONFIG = {
  PUBLIC_PROFILE: {
    ttl: CACHE_TTL.PUBLIC.MEDIUM,
    namespace: NAMESPACES.PUBLIC,
    publicOnly: true,
    tags: ['auth', 'profile']
  },
  USER_PROFILE: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.USER,
    tags: ['auth', 'user', 'profile']
  },
  SESSIONS: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.USER,
    tags: ['auth', 'sessions']
  },
  CSRF: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.PUBLIC,
    tags: ['auth', 'csrf']
  }
};

// Create cache middlewares
const cachePublicProfile = createCacheMiddleware(AUTH_CACHE_CONFIG.PUBLIC_PROFILE);
const cacheUserProfile = createCacheMiddleware(AUTH_CACHE_CONFIG.USER_PROFILE);
const cacheSessions = createCacheMiddleware(AUTH_CACHE_CONFIG.SESSIONS);
const cacheCSRF = createCacheMiddleware(AUTH_CACHE_CONFIG.CSRF);

// Clear cache middleware for write operations
const clearAuthCache = createClearCacheMiddleware({
  patterns: [
    'auth:*',
    'user:*',
    '*:tags:*auth*',
    '*:tags:*user*'
  ],
  tags: ['auth', 'user'],
  namespace: NAMESPACES.USER,
  clearAllOnWrite: false
});

const router = express.Router();

// Validation schemas
const registerValidation = validateRequest({
  body: {
    name: { type: 'string', minLength: 2, maxLength: 50, required: true },
    email: { type: 'string', format: 'email', required: true },
    password: { type: 'string', minLength: 8, required: true },
    phoneNumber: { type: 'string', minLength: 10, maxLength: 15, required: false },
    dateOfBirth: { type: 'string', format: 'date', required: false },
    gender: { type: 'string', enum: ['male', 'female', 'other', 'prefer-not-to-say', ''], required: false },
    country: { type: 'string', maxLength: 100, required: false },
    city: { type: 'string', maxLength: 100, required: false },
    role: { type: 'string', enum: ['user'], default: 'user' }
  }
});

const loginValidation = validateRequest({
  body: {
    email: { type: 'string', format: 'email', required: true },
    password: { type: 'string', required: true },
    deviceToken: { type: 'string', required: false },
    deviceType: { type: 'string', required: false }
  }
});

const updateProfileValidation = validateRequest({
  body: {
    name: { type: 'string', minLength: 2, maxLength: 50, required: false },
    email: { type: 'string', format: 'email', required: false },
    phoneNumber: { type: 'string', minLength: 10, maxLength: 15, required: false },
    bio: { type: 'string', maxLength: 500, required: false },
    gender: { type: 'string', enum: ['male', 'female', 'other', 'prefer-not-to-say', ''], required: false },
    dateOfBirth: { type: 'string', format: 'date', required: false },
    country: { type: 'string', maxLength: 100, required: false },
    city: { type: 'string', maxLength: 100, required: false },
    languages: { type: 'array', items: { type: 'string', maxLength: 50 }, required: false },
    occupation: { type: 'string', maxLength: 100, required: false },
    education: { type: 'string', maxLength: 200, required: false },
    picture: { type: 'string', format: 'url', required: false },
    privacySettings: { 
      type: 'object',
      properties: {
        profileVisibility: { type: 'string', enum: ['public', 'registered', 'private'], required: false },
        showEmail: { type: 'boolean', required: false },
        showPhone: { type: 'boolean', required: false },
        showLocation: { type: 'boolean', required: false },
        showLastSeen: { type: 'boolean', required: false }
      },
      required: false 
    }
  }
});

const changePasswordValidation = validateRequest({
  body: {
    currentPassword: { type: 'string', required: true },
    newPassword: { type: 'string', minLength: 8, required: true }
  }
});

const forgotPasswordValidation = validateRequest({
  body: {
    email: { type: 'string', format: 'email', required: true }
  }
});

const resetPasswordValidation = validateRequest({
  body: {
    token: { type: 'string', minLength: 64, maxLength: 64, required: true },
    newPassword: { type: 'string', minLength: 8, required: true }
  }
});

const deactivateValidation = validateRequest({
  body: {
    password: { type: 'string', required: true },
    reason: { type: 'string', maxLength: 500, required: false }
  }
});

const reactivateValidation = validateRequest({
  body: {
    email: { type: 'string', format: 'email', required: true },
    password: { type: 'string', required: true }
  }
});

// ==================== AUTHENTICATION ROUTES (No Cache) ====================

// Register
router.post("/register", 
  registerLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  registerValidation,
  register
);

// Login
router.post("/login", 
  authLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  loginValidation,
  login
);

// Logout
router.post("/logout", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  logout
);

// Refresh session
router.post("/refresh", 
  (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      req.body.refreshToken = refreshToken;
    }
    next();
  },
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  refreshSession
);

// ==================== PUBLIC ROUTES (Cached) ====================

// Check auth status
router.get("/check-auth", 
  SessionMiddleware.optionalAuth, 
  cacheControlMiddleware({ public: true, maxAge: 60 }),
  (req, res) => {
    if (req.user) {
      res.json({
        success: true,
        isAuthenticated: true,
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          picture: req.user.picture,
          emailVerified: req.user.emailVerified,
          isOnline: req.user.isOnline
        },
        cached: false
      });
    } else {
      res.json({
        success: true,
        isAuthenticated: false,
        cached: false
      });
    }
  }
);

// Get public profile
router.get("/profile/:userId/public", 
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicProfile,
  getPublicProfile
);

// CSRF token
router.get("/csrf-token", 
  cacheControlMiddleware({ public: true, maxAge: 60 }),
  cacheCSRF,
  (req, res) => {
    const { csrfToken } = req;
    if (csrfToken) {
      res.json({
        success: true,
        csrfToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'CSRF token not available'
      });
    }
  }
);

// ==================== PROTECTED ROUTES (Cached for user) ====================

// Get profile
router.get("/profile", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheUserProfile,
  getProfile
);

// Update profile
router.put("/profile", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  updateProfileValidation,
  updateProfile
);

// Change password
router.post("/change-password", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  changePasswordValidation,
  changePassword
);

// Get active sessions
router.get("/sessions", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ public: false, maxAge: 60 }),
  cacheSessions,
  getActiveSessions
);

// Terminate session
router.delete("/sessions/:sessionId", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  terminateSession
);

// Terminate all other sessions
router.delete("/sessions/others", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  terminateAllOtherSessions
);

// Check session status
router.get("/session/status", 
  SessionMiddleware.optionalAuth,
  cacheControlMiddleware({ public: true, maxAge: 30 }),
  (req, res) => {
    res.json({
      success: true,
      isAuthenticated: !!req.user,
      user: req.user ? {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      } : null,
      timestamp: new Date().toISOString()
    });
  }
);

// Deactivate account
router.post("/deactivate", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  deactivateValidation,
  deactivateAccount
);

// Reactivate account
router.post("/reactivate", 
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  reactivateValidation,
  reactivateAccount
);

// Refresh CSRF token
router.post("/csrf-token/refresh",
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  refreshCSRFToken
);

// ==================== VERIFICATION ROUTES (No Cache) ====================

// Verify email
router.get("/verify-email/:token", 
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  verifyEmail
);

// Verification redirect
router.get("/verify/:token", 
  cacheControlMiddleware({ noStore: true }),
  (req, res) => {
    const { token } = req.params;
    res.redirect(`${process.env.FRONTEND_URL}/verification/redirect?token=${token}`);
  }
);

// Resend verification
router.post("/resend-verification", 
  passwordResetLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  validateRequest({ body: { email: { type: 'string', format: 'email', required: true } } }),
  resendVerificationEmail
);

// Verified status
router.get("/verified-status", 
  cacheControlMiddleware({ public: true, maxAge: 30 }),
  (req, res) => {
    const { token, status } = req.query;
    res.redirect(`${process.env.FRONTEND_URL}/verification/status?token=${token}&status=${status}`);
  }
);

// Check verification status
router.get("/check-verification", 
  cacheControlMiddleware({ public: true, maxAge: 60 }),
  checkVerificationStatus
);

// ==================== PASSWORD RESET ROUTES (No Cache) ====================

// Forgot password
router.post("/forgot-password", 
  passwordResetLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  forgotPasswordValidation,
  forgotPassword
);

// Reset password redirect
router.get("/reset/redirect/:token", 
  cacheControlMiddleware({ noStore: true }),
  (req, res) => {
    const { token } = req.params;
    if (!token || token.length !== 64) {
      return res.redirect(`${process.env.FRONTEND_URL}/reset/invalid`);
    }
    res.redirect(`${process.env.FRONTEND_URL}/reset/redirect?token=${token}`);
  }
);

// Reset password
router.post("/reset-password", 
  passwordResetLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  resetPasswordValidation,
  resetPassword
);

// ==================== OAUTH ROUTES (No Cache) ====================

// Google OAuth
router.get("/google",
  cacheControlMiddleware({ noStore: true }),
  (req, res, next) => {
    const state = crypto.randomBytes(32).toString('hex');
    
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000,
      signed: true
    });
    
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      state: state,
      prompt: "select_account"
    })(req, res, next);
  }
);

// Google callback
router.get("/google/callback",
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  (req, res, next) => {
    const state = req.query.state;
    const storedState = req.signedCookies?.oauth_state;
    
    if (!state || !storedState || state !== storedState) {
      console.error('Invalid state parameter:', { state, storedState });
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }
    
    res.clearCookie('oauth_state');
    
    passport.authenticate("google", {
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
      session: false 
    }, async (err, user, info) => {
      if (err || !user) {
        console.error('Google OAuth error:', err || info);
        
        let errorParam = 'auth_failed';
        if (err?.message?.includes('already exists') || err?.message?.includes('already registered')) {
          errorParam = 'user_exists';
        } else if (err?.message?.includes('Email already exists')) {
          errorParam = 'email_exists';
        }
        
        return res.redirect(`${process.env.FRONTEND_URL}/signin?error=${errorParam}`);
      }
      
      try {
        const session = await SessionService.createSession(user._id, req, {
          loginType: 'google',
          source: 'web'
        });
        
        SessionMiddleware.setAuthCookies(res, session.token, session.refreshToken);
        
        const userData = encodeURIComponent(JSON.stringify({
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            role: user.role,
            emailVerified: user.emailVerified,
            registrationStatus: user.registrationStatus,
            isOnline: user.isOnline
          }
        }));
        
        const returnTo = req.cookies?.return_to || `${process.env.FRONTEND_URL}/dashboard`;
        res.clearCookie('return_to');
        
        res.redirect(`${returnTo}?oauth_success=true&data=${userData}`);
        
      } catch (error) {
        console.error('Google session creation error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/signin?error=session_failed`);
      }
    })(req, res, next);
  }
);

// ==================== HEALTH CHECK ====================

router.get("/health", 
  cacheControlMiddleware({ maxAge: 30 }),
  (req, res) => {
    const cache = require('../utils/cache');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cache: cache.stats()
    });
  }
);

module.exports = router;