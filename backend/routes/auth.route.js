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
const Session = require("../models/session.model")
const jwt = require("jsonwebtoken");
const { 
  createCacheMiddleware, 
  createClearCacheMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

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

const cachePublicProfile = createCacheMiddleware(AUTH_CACHE_CONFIG.PUBLIC_PROFILE);
const cacheUserProfile = createCacheMiddleware(AUTH_CACHE_CONFIG.USER_PROFILE);
const cacheSessions = createCacheMiddleware(AUTH_CACHE_CONFIG.SESSIONS);
const cacheCSRF = createCacheMiddleware(AUTH_CACHE_CONFIG.CSRF);

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

router.post("/register", 
  registerLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  registerValidation,
  register
);

router.post("/login", 
  authLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  loginValidation,
  login
);

router.post("/logout", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  logout
);

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

router.get("/check-auth", 
  SessionMiddleware.optionalAuth, 
  cacheControlMiddleware({ public: true, maxAge: 60 }),
  async (req, res) => {
    try {
      if (req.user) {
        const userResponse = {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          picture: req.user.picture,
          emailVerified: req.user.emailVerified,
          isOnline: req.user.isOnline,
          accountType: req.user.accountType || 'basic',
          lastSeenAt: req.user.lastSeenAt || new Date().toISOString()
        };
        
        res.json({
          success: true,
          isAuthenticated: true,
          user: userResponse,
          cached: false
        });
      } else {
        res.json({
          success: true,
          isAuthenticated: false,
          cached: false
        });
      }
    } catch (error) {
      console.error('Check auth error:', error);
      res.json({
        success: true,
        isAuthenticated: false,
        cached: false
      });
    }
  }
);

router.get("/profile/:userId/public", 
  cacheControlMiddleware({ public: true, maxAge: 300 }),
  cachePublicProfile,
  getPublicProfile
);

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

router.get("/profile", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheUserProfile,
  getProfile
);

router.put("/profile", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  updateProfileValidation,
  updateProfile
);

router.post("/change-password", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  changePasswordValidation,
  changePassword
);

router.get("/sessions", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ public: false, maxAge: 60 }),
  cacheSessions,
  getActiveSessions
);

router.delete("/sessions/:sessionId", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  terminateSession
);

router.get("/test/session-timing", 
  SessionMiddleware.authenticate,
  async (req, res) => {
    const token = req.cookies?.token;
    const decoded = jwt.decode(token);
    
    res.json({
      tokenExpiresAt: new Date(decoded.exp * 1000).toISOString(),
      tokenExpiresIn: Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60) + ' minutes',
      cookies: req.cookies,
      session: {
        lastActivity: req.session?.lastActivity,
        idleTimeout: req.user?.role === 'admin' ? '1 hour' : '3 hours'
      }
    });
  }
);

router.delete("/sessions/others", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  terminateAllOtherSessions
);

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

router.post("/deactivate", 
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  deactivateValidation,
  deactivateAccount
);

router.post("/reactivate", 
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  reactivateValidation,
  reactivateAccount
);

router.post("/csrf-token/refresh",
  SessionMiddleware.authenticate,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  refreshCSRFToken
);

router.get("/debug/session",
  SessionMiddleware.authenticate,
  async (req, res) => {
  try {
    const token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;
    
    let tokenStatus = {
      exists: !!token,
      length: token?.length,
      preview: token ? token.substring(0, 30) + '...' : null
    };
    
    let decoded;
    let verification = { success: false, error: null };
    
    if (token) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        verification.success = true;
        verification.expiresAt = new Date(decoded.exp * 1000);
        verification.expiresIn = Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60);
        
        tokenStatus = {
          ...tokenStatus,
          valid: true,
          payload: {
            id: decoded.id,
            role: decoded.role,
            type: decoded.type,
            exp: decoded.exp,
            iat: decoded.iat
          },
          expiresAt: verification.expiresAt.toISOString(),
          expiresIn: `${verification.expiresIn} minutes`
        };
      } catch (verifyError) {
        verification.success = false;
        verification.error = verifyError.name;
        verification.message = verifyError.message;
        
        decoded = jwt.decode(token);
        
        tokenStatus = {
          ...tokenStatus,
          valid: false,
          error: verifyError.name,
          errorMessage: verifyError.message,
          decodedPayload: decoded,
          expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null
        };
      }
    }
    
    const session = await Session.findOne({
      token: token,
      userId: req.user?._id
    }).lean();
    
    res.json({
      success: true,
      token: tokenStatus,
      verification: verification,
      session: {
        exists: !!session,
        sessionId: session?._id,
        isActive: session?.isActive,
        expiresAt: session?.expiresAt,
        lastActivity: session?.lastActivity,
        idleTime: session ? Date.now() - new Date(session.lastActivity).getTime() : null,
        idleTimeMinutes: session ? Math.round((Date.now() - new Date(session.lastActivity).getTime()) / 1000 / 60) + ' minutes' : null
      },
      user: req.user ? {
        _id: req.user._id,
        role: req.user.role,
        lastSeenAt: req.user.lastSeenAt,
        isOnline: req.user.isOnline
      } : null,
      environment: {
        jwtSecretLength: process.env.JWT_SECRET?.length || 0,
        refreshSecretLength: process.env.JWT_REFRESH_SECRET?.length || 0,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
)

router.get('/debug/sessions', 
  SessionMiddleware.authenticate,
  async (req, res) => {
    const sessions = await Session.find({ userId: req.user._id });
    const activeSessions = await Session.find({ 
      userId: req.user._id, 
      isActive: true 
    });
    
    res.json({
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      sessions: sessions.map(s => ({
        id: s._id,
        isActive: s.isActive,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
        idleTime: Date.now() - s.lastActivity.getTime(),
        idleMinutes: Math.round((Date.now() - s.lastActivity.getTime()) / 1000 / 60)
      }))
    });
  }
);

router.get("/verify-email/:token", 
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  verifyEmail
);

router.get("/verify/:token", 
  cacheControlMiddleware({ noStore: true }),
  (req, res) => {
    const { token } = req.params;
    res.redirect(`${process.env.FRONTEND_URL}/verification/redirect?token=${token}`);
  }
);

router.post("/resend-verification", 
  passwordResetLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  validateRequest({ body: { email: { type: 'string', format: 'email', required: true } } }),
  resendVerificationEmail
);

router.get("/verified-status", 
  cacheControlMiddleware({ public: true, maxAge: 30 }),
  (req, res) => {
    const { token, status } = req.query;
    res.redirect(`${process.env.FRONTEND_URL}/verification/status?token=${token}&status=${status}`);
  }
);

router.get("/check-verification", 
  cacheControlMiddleware({ public: true, maxAge: 60 }),
  checkVerificationStatus
);

router.post("/forgot-password", 
  passwordResetLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  forgotPasswordValidation,
  forgotPassword
);

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

router.post("/reset-password", 
  passwordResetLimiter,
  cacheControlMiddleware({ noStore: true }),
  clearAuthCache,
  resetPasswordValidation,
  resetPassword
);

router.get("/google",
  cacheControlMiddleware({ noStore: true }),
  (req, res, next) => {
    const state = crypto.randomBytes(32).toString('hex');
    
    res.cookie('oauth_just_logged_in', 'true', {
  maxAge: 10000,
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
});
    
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      state: state,
      prompt: "select_account"
    })(req, res, next);
  }
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/signin',
    session: false
  }),
  async (req, res) => {
    try {
      console.log('✅ Google OAuth successful for:', req.user.email);
      
      const session = await SessionService.createSession(
        req.user._id, 
        req, 
        {
          loginType: 'google_oauth',
          source: 'web',
          userRole: req.user.role
        }
      );
      
      SessionMiddleware.setAuthCookies(
        res, 
        session.token, 
        session.refreshToken
      );
      
      const csrfToken = CSRFMiddleware.generateToken(req, res);
      
      const userResponse = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        picture: req.user.picture,
        emailVerified: req.user.emailVerified,
        isOnline: true,
        accountType: req.user.accountType || 'basic',
        lastSeenAt: new Date().toISOString()
      };
      
      const redirectData = {
        success: true,
        isAuthenticated: true,
        user: userResponse,
        session: {
          expiresAt: session.expiresAt,
          idleTimeout: 3 * 60 * 60 * 1000
        },
        csrfToken,
        timestamp: Date.now()
      };
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const encodedData = encodeURIComponent(JSON.stringify(redirectData));
      res.redirect(`${frontendUrl}/oauth-success#data=${encodedData}`);
      
    } catch (error) {
      console.error('❌ Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/signin?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
    }
  }
);

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

router.get("/test/cookie-behavior", (req, res) => {
  const now = Date.now();
  const testExpiration = 5 * 60 * 1000;
  
  res.cookie('test_cookie_maxage', 'maxage_value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: testExpiration
  });
  
  res.cookie('test_cookie_expires', 'expires_value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(now + testExpiration)
  });
  
  res.json({
    success: true,
    message: 'Test cookies set',
    server: {
      timeISO: new Date().toISOString(),
      timeUTC: new Date().toUTCString(),
      timestamp: now,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    cookies: {
      maxAge: {
        value: testExpiration,
        description: `${testExpiration / 1000} seconds from now`,
        expiresAt: new Date(now + testExpiration).toISOString()
      },
      expires: {
        value: new Date(now + testExpiration).toUTCString(),
        description: 'Absolute time in GMT'
      }
    },
    recommendation: 'USE maxAge FOR CROSS-TIMEZONE COMPATIBILITY'
  });
});

module.exports = router;