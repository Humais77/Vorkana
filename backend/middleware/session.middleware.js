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
    // Get tokens from cookies
    let token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;

    // If no token but have refreshToken, try to refresh
    if (!token && refreshToken) {
      console.log('🔄 No access token, attempting refresh...');
      try {
        const refreshed = await this.sessionService.refreshSession(refreshToken);
        if (refreshed) {
          token = refreshed.token;
          // Set new cookies
          this.setAuthCookies(res, refreshed.token, refreshed.refreshToken);
        }
      } catch (refreshError) {
        console.log('❌ Refresh failed:', refreshError.message);
        this.clearAuthCookies(res);
        return this.handleUnauthorized(res, 'Session expired. Please login again.');
      }
    }

    if (!token) {
      return this.handleUnauthorized(res, 'Authentication required');
    }

    // Validate session
    const sessionResult = await this.sessionService.validateSession(token, refreshToken);
    
    if (!sessionResult.valid) {
      this.clearAuthCookies(res);
      return this.handleUnauthorized(res, 'Session expired or invalid. Please login again.');
    }

    // Get user
    const user = await User.findById(sessionResult.userId)
      .select('+isActive +emailVerified')
      .lean(false);
    
    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      if (sessionResult.sessionId) {
        try {
          await this.sessionService.logoutSession(
            sessionResult.sessionId,
            sessionResult.userId,
            'system'
          );
        } catch (logoutError) {
          console.error('Error logging out inactive user:', logoutError);
        }
      }
      this.clearAuthCookies(res);
      return this.handleUnauthorized(res, 'Account not found or deactivated');
    }

    // Update user's last seen
    await User.findByIdAndUpdate(
      user._id, 
      { lastSeenAt: new Date() },
      { new: true }
    );

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
      redirectUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
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
 setAuthCookies = (res, token, refreshToken) => {
    const cookieConfig = this.getCookieConfig();

    // Access token (1 hour)
    res.cookie('token', token, {
      ...cookieConfig,
      maxAge: 60 * 60 * 1000
    });

    // Refresh token (30 days)
    res.cookie('refreshToken', refreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Non-httpOnly cookie for client-side checking
    res.cookie('isAuthenticated', 'true', {
      ...cookieConfig,
      httpOnly: false,
      maxAge: 60 * 60 * 1000
    });
  };

  clearAuthCookies = (res) => {
    const clearOpts = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    // Clear all auth cookies
    res.clearCookie('token', clearOpts);
    res.clearCookie('refreshToken', clearOpts);
    res.clearCookie('isAuthenticated', { ...clearOpts, httpOnly: false });
    
    // Clear any legacy cookies
    const legacyCookies = ['auth_status', 'access_token', 'refresh_token'];
    legacyCookies.forEach(cookie => {
      res.clearCookie(cookie, clearOpts);
    });
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