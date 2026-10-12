// middleware/csrf.middleware.js
const crypto = require('crypto');

class CSRFMiddleware {
  constructor() {
    this.csrfTokens = new Map();
    this.cleanupInterval = 60 * 60 * 1000;      // 1 hour
    this.tokenExpiry = 24 * 60 * 60 * 1000;     // 24 hours

    setInterval(() => this.cleanupExpiredTokens(), this.cleanupInterval);
  }

  // ---- Token generation ----
  generateToken(req, res) {
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = req.sessionId || req.user?._id || 'anonymous';

    this.csrfTokens.set(token, {
      userId: req.user?._id,
      sessionId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      createdAt: Date.now(),
      expiresAt: Date.now() + this.tokenExpiry,
      referer: req.headers.referer || req.headers.origin || ''
    });

    this.setCSRFCookie(res, token);
    return token;
  }

  // ---- Token validation ----
  validateToken(req, token) {
    if (!token) {
      return { valid: false, error: 'CSRF token missing' };
    }

    const tokenData = this.csrfTokens.get(token);
    if (!tokenData) {
      return { valid: false, error: 'Invalid CSRF token' };
    }

    if (tokenData.expiresAt < Date.now()) {
      this.csrfTokens.delete(token);
      return { valid: false, error: 'CSRF token expired' };
    }

    // Sliding expiry
    tokenData.expiresAt = Date.now() + this.tokenExpiry;
    this.csrfTokens.set(token, tokenData);

    return { valid: true, tokenData };
  }

  // ---- CSRF enforcement middleware ----
  requireCSRF = (req, res, next) => {
    // 1. Safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // 2. Bearer token auth (mobile / API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }

    // 3. Public auth endpoints (no CSRF needed)
    const pathname = req.originalUrl.split('?')[0].replace(/\/+$/, '');

    const publicAuthEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/reactivate',
      '/api/auth/refresh',
      '/api/auth/csrf-token/refresh'
    ];

    if (publicAuthEndpoints.includes(pathname)) {
      return next();
    }

    // 4. Special handling for logout — never block
    if (pathname === '/api/auth/logout') {
      const token =
        req.headers['x-csrf-token'] ||
        req.headers['csrf-token'] ||
        req.body?.csrfToken ||
        req.query?.csrfToken ||
        req.cookies?.csrfToken;

      if (token) {
        const validation = this.validateToken(req, token);
        if (!validation.valid) {
          console.warn('CSRF validation failed for logout, proceeding:', validation.error);
        }
      } else {
        console.log('No CSRF token for logout — allowing API clients');
      }
      return next();
    }

    // 5. Everything else requires a valid CSRF token
    const token =
      req.headers['x-csrf-token'] ||
      req.headers['csrf-token'] ||
      req.body?.csrfToken ||
      req.query?.csrfToken ||
      req.cookies?.csrfToken;

    const validation = this.validateToken(req, token);

    if (!validation.valid) {
      console.error('CSRF validation failed:', {
        path: req.path,
        method: req.method,
        error: validation.error
      });

      return res.status(403).json({
        success: false,
        message: 'Security validation failed',
        code: 'CSRF_TOKEN_INVALID'
      });
    }

    return next();
  };

  // ---- Token attachment middleware ----
  attachCSRF = (req, res, next) => {
    // Always generate for the CSRF endpoint
    if (req.path === '/api/csrf-token') {
      const token = this.generateToken(req, res);
      req.csrfToken = token;
      res.locals.csrfToken = token;
      return next();
    }

    // Login page needs a token before login
    if (req.path === '/api/auth/login' && req.method === 'GET') {
      const token = this.generateToken(req, res);
      req.csrfToken = token;
      res.locals.csrfToken = token;
      return next();
    }

    // Reuse existing valid cookie token
    const existingToken = req.cookies?.csrfToken;
    if (existingToken && this.csrfTokens.has(existingToken)) {
      req.csrfToken = existingToken;
      res.locals.csrfToken = existingToken;
      return next();
    }

    // Generate a fresh token for authenticated users
    if (req.user) {
      const token = this.generateToken(req, res);
      req.csrfToken = token;
      res.locals.csrfToken = token;
    }

    return next();
  };

  // ---- Cookie helpers ----
  setCSRFCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('csrfToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    expires: new Date(Date.now() + this.tokenExpiry),
    ...(isProduction && process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {})
  });
}

  clearCSRFCookie(res) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('csrfToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      ...(isProduction && process.env.COOKIE_DOMAIN
        ? { domain: process.env.COOKIE_DOMAIN }
        : {})
    });
  }

  // ---- Utilities ----
  getClientIp(req) {
    return (
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '0.0.0.0'
    );
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [token, data] of this.csrfTokens.entries()) {
      if (data.expiresAt < now) {
        this.csrfTokens.delete(token);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired CSRF tokens`);
    }
  }

  getTokenStats() {
    return {
      totalTokens: this.csrfTokens.size,
      activeSessions: new Set(
        Array.from(this.csrfTokens.values()).map(t => t.sessionId)
      ).size
    };
  }
}

module.exports = new CSRFMiddleware();