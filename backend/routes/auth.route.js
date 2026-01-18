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
   checkSessionStatus
} = require("../controllers/auth.controller.js");
const { 
  protect, 
  verifyEmailToken, 
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  validateRequest ,
  optionalAuth
} = require("../middleware/auth.middleware.js");
const SessionMiddleware = require("../middleware/session.middleware");
const SessionService = require("../services/session.service")
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
  registerValidation,
  register
);

router.post("/login", 
  authLimiter,
  loginValidation,
  login
);
router.get("/check-auth", 
  SessionMiddleware.optionalAuth, 
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
        }
      });
    } else {
      res.json({
        success: true,
        isAuthenticated: false
      });
    }
  }
);

router.post("/refresh", 
  (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      req.body.refreshToken = refreshToken;
    }
    next();
  },
  refreshSession 
);

router.post("/logout", 
  SessionMiddleware.authenticate, 
  logout
);
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
  
  res.redirect(`${process.env.FRONTEND_URL}/verification/status?token=${token}&status=${status}`);
});
router.get("/check-verification", checkVerificationStatus);
router.post("/forgot-password", 
  passwordResetLimiter,
  forgotPasswordValidation,
  forgotPassword
);

router.get("/reset/redirect/:token", (req, res) => {
  const { token } = req.params;
  
  if (!token || token.length !== 64) {
    return res.redirect(`${process.env.FRONTEND_URL}/reset/invalid`);
  }
  
  res.redirect(`${process.env.FRONTEND_URL}/reset/redirect?token=${token}`);
}); 
router.post("/reset-password", 
  passwordResetLimiter,
  resetPasswordValidation,
  resetPassword
);

router.get("/profile", 
  SessionMiddleware.authenticate,
  getProfile
);
router.put("/profile", 
  SessionMiddleware.authenticate,
  updateProfileValidation,
  updateProfile
);

router.post("/change-password", 
  SessionMiddleware.authenticate, 
  changePasswordValidation,
  changePassword
);
router.get("/sessions", 
  SessionMiddleware.authenticate, 
  getActiveSessions
);

router.delete("/sessions/:sessionId", 
  SessionMiddleware.authenticate, 
  terminateSession
);

router.delete("/sessions/others", 
  SessionMiddleware.authenticate, 
  terminateAllOtherSessions
);

router.get("/session/status", 
  SessionMiddleware.optionalAuth,
  checkSessionStatus
);

router.post("/deactivate", 
  SessionMiddleware.authenticate, 
  deactivateValidation,
  deactivateAccount
);

router.post("/reactivate", 
  reactivateValidation,
  reactivateAccount
);

router.get("/profile/:userId/public", 
  getPublicProfile
);
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
    
    res.clearCookie('oauth_state');
    
    passport.authenticate("google", {
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
      session: false 
    }, async (err, user, info) => {
      if (err || !user) {
        console.error('Google OAuth error:', err || info);
        
        // Handle specific errors
        let errorParam = 'auth_failed';
        if (err?.message?.includes('already exists') || err?.message?.includes('already registered')) {
          errorParam = 'user_exists';
        } else if (err?.message?.includes('Email already exists')) {
          errorParam = 'email_exists';
        }
        
        return res.redirect(`${process.env.FRONTEND_URL}/signin?error=${errorParam}`);
      }
      
      try {
        // Create session for Google user
        const session = await SessionService.createSession(user._id, req, {
          loginType: 'google',
          source: 'web'
        });
        
        // Set auth cookies
        SessionMiddleware.setAuthCookies(res, session.token, session.refreshToken);
        
        // Prepare user data for frontend
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
        
        // Redirect based on where user came from
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
module.exports = router;