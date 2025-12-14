const express = require("express");
const passport = require("passport");
const crypto = require("crypto");
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword,
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  logout,
  refreshToken
} = require("../controllers/auth.controller.js");
const { 
  protect, 
  verifyEmailToken, 
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  validateRequest 
} = require("../middleware/auth.middleware.js");

const router = express.Router();

// ========== INPUT VALIDATION MIDDLEWARE ==========
const registerValidation = validateRequest({
  body: {
    name: { type: 'string', minLength: 2, maxLength: 50, required: true },
    email: { type: 'string', format: 'email', required: true },
    password: { type: 'string', minLength: 8, required: true },
    role: { type: 'string', enum: ['user', 'seller'], default: 'user' }
  }
});

const loginValidation = validateRequest({
  body: {
    email: { type: 'string', format: 'email', required: true },
    password: { type: 'string', required: true }
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

// ========== PUBLIC ROUTES ==========

// Registration with rate limiting - FIXED: Use middleware function properly
router.post("/register", 
  registerLimiter, // Fixed: Use the pre-configured limiter
  registerValidation,
  register
);

// Login with rate limiting - FIXED: Use middleware function properly
router.post("/login", 
  authLimiter, // Fixed: Use the pre-configured limiter
  loginValidation,
  login
);

// Refresh token
router.post("/refresh-token", refreshToken);

// Email verification
router.get("/verify-email/:token", verifyEmail);

// Resend verification with rate limiting
router.post("/resend-verification", 
  passwordResetLimiter, // Fixed: Use the pre-configured limiter
  validateRequest({ body: { email: { type: 'string', format: 'email', required: true } } }),
  resendVerificationEmail
);

// Password reset with rate limiting
router.post("/forgot-password", 
  passwordResetLimiter, // Fixed: Use the pre-configured limiter
  forgotPasswordValidation,
  forgotPassword
);

router.post("/reset-password", 
  passwordResetLimiter, // Fixed: Use the pre-configured limiter
  resetPasswordValidation,
  resetPassword
);

// ========== PROTECTED ROUTES ==========
// FIXED: These are functions, not calling them immediately
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/change-password", protect, changePassword);
router.post("/logout", protect, logout);

// In auth.route.js - Update the Google OAuth route:

router.get("/google",
  (req, res, next) => {
    // Generate and store state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in signed cookie (now works with cookie-parser)
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      signed: true // Now this works with cookie-parser
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
    // Verify state parameter from signed cookie
    const state = req.query.state;
    const storedState = req.signedCookies?.oauth_state;
    
    if (!state || !storedState || state !== storedState) {
      console.error('Invalid state parameter:', { state, storedState });
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }
    
    // Clear the state cookie
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
      const token = require('../controllers/auth.controller.js').generateToken(user._id);
      const refreshToken = require('../controllers/auth.controller.js').generateRefreshToken(user._id);
      
      const userData = encodeURIComponent(JSON.stringify({
        token,
        refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }));
      
      // Redirect with success data
      res.redirect(`${process.env.FRONTEND_URL}/oauth-success?data=${userData}`);
    })(req, res, next);
  }
);

module.exports = router;