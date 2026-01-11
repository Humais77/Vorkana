const SessionService = require('../services/session.service');
const User = require('../models/user.model');
const Session = require('../models/session.model');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

class SessionMiddleware {
  constructor() {
    this.sessionService = SessionService;
    this.cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Always use 'lax' for development
    path: '/', // IMPORTANT: Same path for all cookies
    maxAge: 60 * 60 * 1000 // Default 1 hour
  };
  
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
    this.cookieConfig.domain = process.env.COOKIE_DOMAIN;
  }
  
  }
  // Main authentication middleware with session management
  authenticate = async (req, res, next) => {
    try {
      // Get tokens
      let token = req.cookies?.token;
      let refreshToken = req.cookies?.refreshToken;
      
      // DEBUG: Log what we're receiving
      console.log('🔍 Auth check - Cookies:', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        tokenLength: token?.length,
        refreshTokenLength: refreshToken?.length
      });

      if (!token) {
        console.log('❌ No token found in cookies');
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NO_TOKEN'
        });
      }

      // FIX: If refreshToken is missing but token exists, try to find session by token only
      if (!refreshToken) {
        console.log('⚠️ Refresh token missing, searching session by token only');
        
        // Try to find session by token
        const session = await Session.findOne({ token, isActive: true });
        if (session) {
          refreshToken = session.refreshToken;
          console.log('✅ Found refresh token from session');
        }
      }

      // Validate session
      const sessionResult = await this.sessionService.validateSession(token, refreshToken);
      
      console.log('🔍 Session validation result:', {
        valid: sessionResult.valid,
        error: sessionResult.error,
        refreshed: sessionResult.refreshed,
        hasSessionId: !!sessionResult.sessionId
      });

      if (!sessionResult.valid) {
        console.log('❌ Invalid session, clearing cookies');
        this.clearAuthCookies(res);
        return res.status(401).json({
          success: false,
          message: 'Session expired or invalid. Please login again.',
          code: 'SESSION_INVALID'
        });
      }

      const user = await User.findById(sessionResult.userId)
  .select('+isActive +emailVerified') // force important fields
  .lean(false); // prevent lean documents issues
      
      if (!user || !user.isActive) {
        console.log('❌ User not found or inactive');
        if (sessionResult.sessionId) {
          await this.sessionService.logoutSession(
            sessionResult.sessionId,
            sessionResult.userId,
            'system'
          );
        }
        this.clearAuthCookies(res);
        return res.status(401).json({
          success: false,
          message: 'Account not found or deactivated'
        });
      }

      // Update user's last seen
      user.lastSeenAt = new Date();
      await user.save({ validateBeforeSave: false });

      // Set request data
      req.user = user;
      req.token = sessionResult.token;
      req.sessionId = sessionResult.sessionId;
      req.refreshToken = sessionResult.refreshToken;

      // Update cookies if token was refreshed
      if (sessionResult.refreshed) {
        console.log('🔄 Token was auto-refreshed, updating cookies');
        this.setAuthCookies(res, sessionResult.token, sessionResult.refreshToken);
      }

      console.log('✅ Authentication successful for user:', user.email);
      next();

    } catch (error) {
    console.error(' Authentication error:', error);
    
    this.clearAuthCookies(res);
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
      requiresLogin: true
    });
    }
  };

  // Optional authentication (for public routes)
  optionalAuth = async (req, res, next) => {
    try {
      let token = req.cookies?.token;
      let refreshToken = req.cookies?.refreshToken;

      if (!token && req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (token) {
        const sessionResult = await this.sessionService.validateSession(
          token,
          refreshToken
        );

        if (sessionResult.valid) {
          const user = await User.findById(sessionResult.userId);
          if (user && user.isActive) {
            req.user = user;
            req.token = token;
            req.sessionId = sessionResult.sessionId;
            
            // Update last seen
            user.lastSeenAt = new Date();
            await user.save({ validateBeforeSave: false });
          }
        }
      }

      next();
    } catch (error) {
      // Silent fail for optional auth
      next();
    }
  };

  // Check idle timeout (to be called before sensitive operations)
  checkIdleTimeout = async (req, res, next) => {
    if (!req.sessionId) return next();

    try {
      const sessionStatus = await this.sessionService.getSessionStatus(req.sessionId);
      
      if (sessionStatus.exists && sessionStatus.isIdle) {
        await this.sessionService.logoutSession(
          req.sessionId,
          req.user._id,
          'inactive'
        );
        
        this.clearAuthCookies(res);
        
        return res.status(401).json({
          success: false,
          message: 'Session inactive for too long. Please login again.',
          code: 'SESSION_IDLE_TIMEOUT',
          timeout: 3 * 60 * 60 * 1000 // 3 hours in ms
        });
      }
      
      next();
    } catch (error) {
      next(); // Continue on error
    }
  };

  // Enhanced authorize middleware
  authorize = (...roles) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check idle timeout for authorized routes
      await this.checkIdleTimeout(req, res, (err) => {
        if (err) return next(err);
      });

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required roles: ${roles.join(', ')}`
        });
      }

      next();
    };
  };
cleanupLegacyCookies = (req, res) => {
    const legacyCookies = [
      'access_token',
      'refresh_token', 
      'sessionInfo',
      'old_token',
      'old_refreshToken'
    ];
    
    legacyCookies.forEach(cookieName => {
      if (req.cookies?.[cookieName]) {
        console.log(`🧹 Clearing legacy cookie: ${cookieName}`);
        res.clearCookie(cookieName, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/'
        });
      }
    });
  };

 setAuthCookies = (res, token, refreshToken, userData = null) => {
  const isProd = process.env.NODE_ENV === 'production';
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    partitioned: true
  };

  // Access token
  res.cookie('token', token, {
    ...baseOptions,
    maxAge: 60 * 60 * 1000 // 1 hour
  });

  // Refresh token
  res.cookie('refreshToken', refreshToken, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Client-side readable flag (optional)
  res.cookie('auth_status', 'true', {
    ...baseOptions,
    httpOnly: false,
    maxAge: 60 * 60 * 1000
  });
};

clearAuthCookies = (res) => {
  const clearOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };
  
  res.clearCookie('token', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('auth_status', { ...clearOpts, httpOnly: false }); // Fixed name
};

  // Handle session errors
  handleSessionError = (res, error) => {
    const message = error.message || 'Session error';
    
    let status = 401;
    let code = 'SESSION_ERROR';
    
    if (message.includes('idle') || message.includes('timeout')) {
      code = 'SESSION_IDLE_TIMEOUT';
    } else if (message.includes('expired')) {
      code = 'SESSION_EXPIRED';
    } else if (message.includes('invalid') || message.includes('not found')) {
      code = 'INVALID_SESSION';
    }

    return res.status(status).json({
      success: false,
      message,
      code,
      requiresLogin: true
    });
  };

 trackActivity = (req, res, next) => {
    const originalEnd = res.end;
    
    res.end = async function(...args) {
      if (req.sessionId && res.statusCode < 400) {
        try {
          await SessionService.updateActivity(req.sessionId);
        } catch (error) {
          console.error('Failed to update activity:', error);
        }
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

module.exports = new SessionMiddleware();