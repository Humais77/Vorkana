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
      // 1. Get tokens from cookies
      const token = req.cookies?.token;
      const refreshToken = req.cookies?.refreshToken;
      
      // 2. Validate with session service
      const sessionResult = await SessionService.validateSession(token, refreshToken);
      
      if (!sessionResult.valid) {
        // 3. Clear ALL cookies on invalid session
        this.clearAuthCookies(res);
        
        // 4. Return 401 with specific code
        return res.status(401).json({
          success: false,
          message: 'Session expired or invalid',
          code: 'SESSION_EXPIRED',
          requiresLogin: true,
          redirectUrl: '/signin'
        });
      }
      
      // 5. Set user in request if valid
      const user = await User.findById(sessionResult.userId);
      req.user = user;
      req.sessionId = sessionResult.sessionId;
      
      // 6. Update last activity
      await SessionService.updateActivity(sessionResult.sessionId);
      
      next();
    } catch (error) {
      // 7. Clear cookies on any error
      this.clearAuthCookies(res);
      
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
        requiresLogin: true
      });
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

optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    let refreshToken = req.cookies?.refreshToken;

    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // No token, skip auth check
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }

    try {
      const sessionResult = await this.sessionService.validateSession(
        token,
        refreshToken
      );

      // FIX: Add null check and default values
      if (sessionResult.valid && sessionResult.userId) {
        // Check if we have lastActivity, if not use current time
        const lastActivity = sessionResult.lastActivity || new Date();
        
        // Check if sessionResult has isAdmin property
        const isAdmin = sessionResult.isAdmin || sessionResult.role === 'admin';
        const idleTimeout = isAdmin ? this.adminIdleTimeout : this.idleTimeout;
        const idleTime = Date.now() - lastActivity.getTime();
        
        if (idleTime > idleTimeout) {
          console.log(`Session idle timeout in optionalAuth (${isAdmin ? 'admin' : 'user'})`);
          req.user = null;
          req.isAuthenticated = false;
          return next();
        }

        const user = await User.findById(sessionResult.userId);
        if (user && user.isActive) {
          req.user = user;
          req.token = token;
          req.sessionId = sessionResult.sessionId;
          req.isAuthenticated = true;
          
          // Update last seen
          user.lastSeenAt = new Date();
          await user.save({ validateBeforeSave: false });
        }
      }
    } catch (error) {
      console.log('Optional auth session validation failed:', error.message);
      // Silent fail - don't logout, just set as not authenticated
      req.user = null;
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    req.isAuthenticated = false;
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
  
  // DECODE tokens to get expiration timestamps
  const tokenDecoded = jwt.decode(token);
  const refreshDecoded = jwt.decode(refreshToken);
  
  // Calculate MAXAGE ONLY (in milliseconds) - NO DATE OBJECTS
  const tokenMaxAge = tokenDecoded?.exp ? 
    Math.max(60000, (tokenDecoded.exp * 1000) - Date.now()) : 
    3 * 60 * 60 * 1000; // Fallback: 3 hours
  
  const refreshMaxAge = refreshDecoded?.exp ?
    Math.max(60000, (refreshDecoded.exp * 1000) - Date.now()) :
    30 * 24 * 60 * 60 * 1000; // Fallback: 30 days
  
  console.log('🍪 PRODUCTION COOKIES SET:', {
    token: {
      maxAgeMs: tokenMaxAge,
      maxAgeHours: (tokenMaxAge / 1000 / 60 / 60).toFixed(2),
      expiresAtUnix: tokenDecoded?.exp,
      expiresAtUTC: tokenDecoded?.exp ? new Date(tokenDecoded.exp * 1000).toISOString() : null
    },
    refresh: {
      maxAgeMs: refreshMaxAge,
      maxAgeDays: (refreshMaxAge / 1000 / 60 / 60 / 24).toFixed(2),
      expiresAtUnix: refreshDecoded?.exp,
      expiresAtUTC: refreshDecoded?.exp ? new Date(refreshDecoded.exp * 1000).toISOString() : null
    }
  });

  // BASE COOKIE CONFIG - Use exact same config for all cookies
  const baseCookieConfig = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  };

  // 1. ACCESS TOKEN COOKIE - MAXAGE ONLY
  res.cookie('token', token, {
    ...baseCookieConfig,
    maxAge: tokenMaxAge
  });

  // 2. REFRESH TOKEN COOKIE - MAXAGE ONLY
  res.cookie('refreshToken', refreshToken, {
    ...baseCookieConfig,
    maxAge: refreshMaxAge
  });

  // 3. CSRF TOKEN COOKIE - MAXAGE ONLY (24 hours)
  if (csrfToken) {
    res.cookie('csrfToken', csrfToken, {
      ...baseCookieConfig,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // 4. CLIENT-SIDE FLAG - NO HTTPONLY, SAME MAXAGE
  res.cookie('isAuthenticated', 'true', {
    ...baseCookieConfig,
    httpOnly: false, // Client can read this
    maxAge: tokenMaxAge
  });

  // Add helpful response headers for debugging
  res.set({
    'X-Auth-Token-Expiry-Seconds': Math.floor(tokenMaxAge / 1000),
    'X-Refresh-Token-Expiry-Days': (refreshMaxAge / 1000 / 60 / 60 / 24).toFixed(1),
    'X-Server-Timestamp': Date.now().toString()
  });
};
clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const clearConfig = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  };

  // Clear all auth cookies
  ['token', 'refreshToken', 'csrfToken', 'isAuthenticated'].forEach(cookie => {
    res.clearCookie(cookie, {
      ...clearConfig,
      httpOnly: cookie !== 'isAuthenticated' // isAuthenticated is not httpOnly
    });
  });
  
  console.log('🧹 All auth cookies cleared');
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