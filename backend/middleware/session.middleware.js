const SessionService = require('../services/session.service');
const User = require('../models/user.model');
const Session = require('../models/session.model');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const CSRFMiddleware = require('./csrf.middleware');
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
 getCookieConfig = () => {
    const isProd = process.env.NODE_ENV === 'production';
    
    const baseConfig = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      partitioned: true
    };

    // Add domain for production
    if (isProd && process.env.COOKIE_DOMAIN) {
      baseConfig.domain = process.env.COOKIE_DOMAIN;
    }

    return baseConfig;
  };
 authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;

    // If no token at all
    if (!token && !refreshToken) {
      return this.handleUnauthorized(res, 'Please login to continue');
    }

    // Validate session
    let sessionResult;
    
    if (token) {
      sessionResult = await SessionService.validateSession(token, refreshToken);
    } else if (refreshToken) {
      // Try to refresh if only refresh token exists
      try {
        const refreshed = await SessionService.refreshSession(refreshToken);
        if (refreshed) {
          token = refreshed.token;
          this.setAuthCookies(res, refreshed.token, refreshed.refreshToken);
          sessionResult = {
            valid: true,
            userId: refreshed.userId,
            sessionId: refreshed.sessionId,
            token: refreshed.token,
            refreshToken: refreshed.refreshToken
          };
        }
      } catch (refreshError) {
        this.clearAuthCookies(res);
        return this.handleUnauthorized(res, 'Session expired');
      }
    }

    if (!sessionResult || !sessionResult.valid) {
      // Check if it's a timeout
      const isTimeout = sessionResult?.reason === 'timeout';
      
      if (isTimeout) {
        console.log('[AUTH] Session timeout detected');
        this.clearAuthCookies(res);
        
        // Return timeout-specific response
        return res.status(401).json({
          success: false,
          message: 'Session timed out due to inactivity',
          code: 'SESSION_TIMEOUT',
          requiresLogin: true,
          redirectUrl: '/signin?timeout=true'
        });
      }
      
      this.clearAuthCookies(res);
      return this.handleUnauthorized(res, 'Session expired. Please login again.');
    }

    // Get user
    const user = await User.findById(sessionResult.userId);
    
    if (!user || !user.isActive) {
      await SessionService.logoutSession(sessionResult.sessionId, sessionResult.userId, 'inactive');
      this.clearAuthCookies(res);
      return this.handleUnauthorized(res, 'Account not found or deactivated');
    }

    // Special check for admin routes
    const isAdminRoute = req.path.startsWith('/admin');
    if (isAdminRoute && user.role !== 'admin') {
      console.log(`[AUTH] Non-admin trying to access admin route: ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    // Update last seen
    user.lastSeenAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Set request data
    req.user = user;
    req.token = sessionResult.token;
    req.sessionId = sessionResult.sessionId;
    req.isAdmin = user.role === 'admin';
 if (!req.cookies?.csrfToken) {
      CSRFMiddleware.generateToken(req, res);
    }
    console.log(`✅ Authenticated: ${user.email}, Role: ${user.role}, Admin Route: ${isAdminRoute}, Is admin from token: ${sessionResult.isAdmin}`);

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    this.clearAuthCookies(res);
    return this.handleUnauthorized(res, 'Authentication failed');
  }
};

  handleUnauthorized = (res, message = 'Unauthorized') => {
    return res.status(401).json({
      success: false,
      message,
      code: 'UNAUTHORIZED',
      requiresLogin: true,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin`
    });
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
handleRefresh = async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const refreshed = await this.sessionService.refreshSession(refreshToken);
      
      if (!refreshed) {
        throw new Error('Invalid refresh token');
      }

      // Set new cookies
      this.setAuthCookies(res, refreshed.token, refreshed.refreshToken);

      return res.json({
        success: true,
        message: 'Session refreshed successfully',
        expiresAt: refreshed.expiresAt
      });
    } catch (error) {
      console.error('Refresh error:', error.message);
      
      // Clear cookies on refresh failure
      this.clearAuthCookies(res);
      
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED',
        requiresLogin: true
      });
    }
  };
 setAuthCookies = (res, token, refreshToken, csrfToken = null) => {
  const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };

  // Access token (1 hour)
  res.cookie('token', token, {
    ...cookieConfig,
    maxAge: 60 * 60 * 1000
  });

  // Refresh token (7 days)
  res.cookie('refreshToken', refreshToken, {
    ...cookieConfig,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // CSRF token if provided
  if (csrfToken) {
    res.cookie('csrfToken', csrfToken, {
      ...cookieConfig,
      maxAge: 24 * 60 * 60 * 1000
    });
  }

  // Client-side auth flag
  res.cookie('isAuthenticated', 'true', {
    ...cookieConfig,
    httpOnly: false,
    maxAge: 60 * 60 * 1000
  });
};

// Update clearAuthCookies
clearAuthCookies = (res) => {
  const clearOpts = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.clearCookie('token', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('csrfToken', clearOpts);
  res.clearCookie('isAuthenticated', { ...clearOpts, httpOnly: false });
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
      if (req.sessionId) {
        try {
          await SessionService.updateActivity(req.sessionId);
        } catch (error) {
          console.error('Activity update failed:', error);
        }
      }
      originalEnd.apply(this, args);
    };
    
    next();
  };
}
const requireCSRF = (req, res, next) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from headers or body
  const csrfToken = req.headers['x-csrf-token'] || req.body?.csrfToken;
  
  if (!csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token required',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }

  const validation = CSRFMiddleware.validateToken(req, csrfToken);
  
  if (!validation.valid) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};
module.exports = new SessionMiddleware();