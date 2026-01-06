const express = require("express");
const passport = require("passport");
const crypto = require("crypto");
const {  register,
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
  getSessionStatus, // Add this
  setAuthCookies,   // Add this for testing/development
  clearAuthCookies 
} = require("../controllers/auth.controller.js");
const { 
 protect,
  authorize,
  adminOnly,
  userOnly,
  optionalAuth,
  rateLimiter,
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  validateRequest,
  verifyEmailToken,
  logRequest,
  tokenBlacklist,
  securityHeaders,
  requestSizeLimiter,
  errorLogger,
  getClientIp,
  setCsrfToken
} = require("../middleware/auth.middleware.js");
const { csrfProtection, generateCsrfToken } = require('../middleware/csrf.js');
const router = express.Router();

// ========== VALIDATION SCHEMAS ==========
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

// ========== AUTHENTICATION ROUTES ==========
router.post("/register", 
  registerLimiter,
  registerValidation,
  register
);

router.post("/login", 
  authLimiter,
  loginValidation,
  login
);

router.post("/refresh-token", 
  authLimiter,
  refreshToken
);
router.get("/csrf-token", 
  setCsrfToken,
  (req, res) => {
    res.json({
      success: true,
      csrfToken: req.cookies['XSRF-TOKEN']
    });
  }
);
router.get("/session",
  optionalAuth,
  getSessionStatus
);


router.post("/logout", 
  protect,
  logout
);

// ========== EMAIL VERIFICATION ROUTES ==========
router.get("/verify-email/:token", 
  verifyEmail
);
router.get("/verify/:token", (req, res) => {
  const { token } = req.params;
  res.redirect(`${process.env.FRONTEND_URL}/verification/redirect?token=${token}`);
});
router.post("/resend-verification", 
  passwordResetLimiter,
  validateRequest({ body: { email: { type: 'string', format: 'email', required: true } } }),
  resendVerificationEmail
);

router.get("/verified-status", (req, res) => {
  const { token, status } = req.query;
  
  // Simply redirect to frontend with query params
  res.redirect(`${process.env.FRONTEND_URL}/verification/status?token=${token}&status=${status}`);
});
router.get("/check-verification", checkVerificationStatus);
// ========== PASSWORD MANAGEMENT ROUTES ==========
router.post("/forgot-password", 
  passwordResetLimiter,
  forgotPasswordValidation,
  forgotPassword
);

router.get("/reset/redirect/:token", (req, res) => {
  const { token } = req.params;
  
  // Validate token format
  if (!token || token.length !== 64) {
    return res.redirect(`${process.env.FRONTEND_URL}/reset/invalid`);
  }
  
  res.redirect(`${process.env.FRONTEND_URL}/reset/redirect?token=${token}`);
}); // Add this line
router.post("/reset-password", 
  passwordResetLimiter,
  resetPasswordValidation,
  resetPassword
);

// ========== PROFILE ROUTES ==========
router.get("/profile", 
  protect, 
  getProfile
);

router.put("/profile", 
  protect,
  csrfProtection, // Add CSRF protection
  updateProfileValidation,
  updateProfile
);

router.post("/change-password", 
  protect,
  csrfProtection, // Add CSRF protection
  changePasswordValidation,
  changePassword
);

// ========== ACCOUNT MANAGEMENT ROUTES ==========
router.post("/deactivate", 
  protect,
  csrfProtection, // Add CSRF protection
  deactivateValidation,
  deactivateAccount
);


router.post("/reactivate", 
  reactivateValidation,
  reactivateAccount
);

// ========== PUBLIC PROFILES ROUTES ==========
router.get("/profile/:userId/public", 
  getPublicProfile
);

// ========== GOOGLE OAUTH ROUTES ==========
router.get("/google",
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

router.get("/google/callback",
  (req, res, next) => {
    const state = req.query.state;
    const storedState = req.signedCookies?.oauth_state;
    
    if (!state || !storedState || state !== storedState) {
      console.error('Invalid state parameter:', { state, storedState });
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }
    
    res.clearCookie('oauth_state', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    
    passport.authenticate("google", {
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
      session: false 
    }, (err, user, info) => {
      if (err || !user) {
        console.error('Google OAuth error:', err || info);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }
      
      // Generate tokens
      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      const csrfToken = crypto.randomBytes(32).toString('hex');
      
      // Set HTTP-only cookies
      res.cookie('access_token', token, cookieConfig);
      res.cookie('refresh_token', refreshToken, refreshCookieConfig);
      res.cookie('XSRF-TOKEN', csrfToken, csrfCookieConfig);
      
      // Store CSRF token in header for immediate use
      res.setHeader('X-CSRF-Token', csrfToken);
      
      // Redirect to success page
      res.redirect(`${process.env.FRONTEND_URL}/oauth-success`);
    })(req, res, next);
  }
);

// Add CSRF cookie config
const csrfCookieConfig = {
  httpOnly: false, // Must be accessible by JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

const refreshCookieConfig = {
  ...cookieConfig,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh'
};
module.exports = router;