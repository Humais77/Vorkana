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
    path: '/'
  };

  if (isProd && process.env.COOKIE_DOMAIN) {
    baseConfig.domain = process.env.COOKIE_DOMAIN;
  }

  return baseConfig;
};
 authenticate = async (req, res, next) => {
  try {
    // Clean legacy cookies first
    this.cleanupLegacyCookies(req, res);
    
    let token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;
    
    // If no tokens, check headers
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Special handling for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    if (!token && !refreshToken) {
      console.log('🔐 No tokens found');
      return this.handleUnauthorized(res, 'Please login to continue');
    }
    
    let sessionResult;
    let newTokenIssued = false;
    
    // Validate current session
    if (token) {
      sessionResult = await SessionService.validateSession(token, refreshToken);
    }
    
    // Handle token refresh if needed
    if ((!sessionResult || !sessionResult.valid) && refreshToken) {
      console.log('🔄 Attempting session refresh...');
      try {
        const refreshed = await SessionService.refreshSession(refreshToken);
        if (refreshed) {
          token = refreshed.token;
          newTokenIssued = true;
          this.setAuthCookies(res, refreshed.token, refreshed.refreshToken);
          sessionResult = {
            valid: true,
            userId: refreshed.userId,
            sessionId: refreshed.sessionId,
            token: refreshed.token,
            refreshToken: refreshed.refreshToken,
            lastActivity: new Date()
          };
        }
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError.message);
        this.clearAuthCookies(res);
        return this.handleUnauthorized(res, 'Session expired. Please login again.');
      }
    }
    
    // If still invalid, clear and return
    if (!sessionResult || !sessionResult.valid) {
      this.clearAuthCookies(res);
      return this.handleUnauthorized(res, 'Session expired or invalid');
    }
    
    // Get user
    const user = await User.findById(sessionResult.userId);
    if (!user || !user.isActive) {
      await SessionService.logoutSession(sessionResult.sessionId, sessionResult.userId, 'inactive');
      this.clearAuthCookies(res);
      return this.handleUnauthorized(res, 'Account not found or deactivated');
    }
    
    // Set request properties
    req.sessionID = sessionResult.sessionId;
    req.user = user;
    req.token = sessionResult.token;
    req.isAdmin = user.role === 'admin';
    req.sessionValidatedAt = new Date();
    
    // Update user last seen
    user.lastSeenAt = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Generate CSRF if not present or if new token was issued
    if (!req.cookies?.csrfToken || newTokenIssued) {
      CSRFMiddleware.generateToken(req, res);
    }
    
    // Add session validation header
    res.setHeader('X-Session-Validated', 'true');
    if (newTokenIssued) {
      res.setHeader('X-Session-Refreshed', 'true');
    }
    
    next();
  } catch (error) {
    console.error('🔥 Authentication error:', error);
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
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction;
  
  // Access token cookie (3 hours for users, 1 hour for admins)
  // Extract role from token to set appropriate expiry
  let decoded;
  try {
    decoded = jwt.decode(token);
  } catch (error) {
    decoded = { role: 'user' };
  }
  
  const isAdmin = decoded.role === 'admin';
  const accessTokenMaxAge = isAdmin ? 60 * 60 * 1000 : 3 * 60 * 60 * 1000;

  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: accessTokenMaxAge,
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    partitioned: true
  });

  // Refresh token cookie (30 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    partitioned: true
  });

  // CSRF token cookie (24 hours)
  if (csrfToken) {
    res.cookie('csrfToken', csrfToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
      ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      partitioned: true
    });
  }

  // Client-side auth flag (same as token)
  res.cookie('isAuthenticated', 'true', {
    httpOnly: false,
    secure: isSecure,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: accessTokenMaxAge,
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    partitioned: true
  });
};
clearAuthCookies = (res) => {
  const clearOpts = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  // Clear all possible auth cookies
  const cookies = ['token', 'refreshToken', 'csrfToken', 'isAuthenticated', 'oauth_state'];
  cookies.forEach(cookie => {
    res.clearCookie(cookie, clearOpts);
  });

  // Also clear with different paths
  res.clearCookie('token', { ...clearOpts, path: '/' });
  res.clearCookie('refreshToken', { ...clearOpts, path: '/' });
  res.clearCookie('csrfToken', { ...clearOpts, path: '/' });
  res.clearCookie('isAuthenticated', { ...clearOpts, path: '/', httpOnly: false });
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