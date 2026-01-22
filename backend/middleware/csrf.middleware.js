// middleware/csrf.middleware.js
const crypto = require('crypto');

class CSRFMiddleware {
  constructor() {
    this.csrfTokens = new Map();
    this.cleanupInterval = 60 * 60 * 1000;
    this.tokenExpiry = 24 * 60 * 60 * 1000;
    
    // Start cleanup job
    setInterval(() => this.cleanupExpiredTokens(), this.cleanupInterval);
  }

  // Generate CSRF token
  generateToken(req, res) {
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = req.sessionId || req.user?._id || 'anonymous';
    
    // Store token with metadata
    this.csrfTokens.set(token, {
      userId: req.user?._id,
      sessionId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      createdAt: Date.now(),
      expiresAt: Date.now() + this.tokenExpiry,
      referer: req.headers.referer || req.headers.origin || ''
    });

    // Set cookie for frontend
    this.setCSRFCookie(res, token);
    
    return token;
  }

  // Validate CSRF token
  validateToken(req, token) {
    if (!token) {
      return { valid: false, error: 'CSRF token missing' };
    }

    const tokenData = this.csrfTokens.get(token);
    
    if (!tokenData) {
      return { valid: false, error: 'Invalid CSRF token' };
    }

    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      this.csrfTokens.delete(token);
      return { valid: false, error: 'CSRF token expired' };
    }

    // Check if token matches session
   const sessionId = req.sessionId || req.user?._id || 'anonymous';
  const tokenSessionId = tokenData.sessionId;
    if (tokenSessionId !== sessionId && tokenSessionId !== 'anonymous') {
    console.log('CSRF session mismatch:', {
      tokenSessionId,
      reqSessionId: sessionId,
      path: req.path,
      user: req.user?._id
    });
    
    // For logout and certain endpoints, allow mismatch if user exists
    const allowedMismatchPaths = ['/api/auth/logout', '/api/auth/login'];
    if (allowedMismatchPaths.includes(req.path) && req.user) {
      console.log('Allowing CSRF session mismatch for:', req.path);
      // Update token session ID to match current session
      tokenData.sessionId = sessionId;
      this.csrfTokens.set(token, tokenData);
    } else {
      return { valid: false, error: 'CSRF token session mismatch' };
    }
  }


    // Validate origin/referer for production
    if (process.env.NODE_ENV === 'production') {
      const origin = req.headers.origin || req.headers.referer;
      if (origin && tokenData.referer) {
        const tokenOrigin = new URL(tokenData.referer).origin;
        const requestOrigin = new URL(origin).origin;
        if (tokenOrigin !== requestOrigin) {
          return { valid: false, error: 'CSRF token origin mismatch' };
        }
      }
    }

    // Refresh token expiry on successful validation
    tokenData.expiresAt = Date.now() + this.tokenExpiry;
    this.csrfTokens.set(token, tokenData);

    return { valid: true, tokenData };
  }

  // middleware/csrf.middleware.js - Update requireCSRF method
requireCSRF = (req, res, next) => {
  // Skip CSRF for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip for API tokens (Bearer tokens)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Skip for refresh token endpoint
  if (req.path === '/api/auth/refresh') {
    return next();
  }

  // SPECIAL CASE: Allow login and register without CSRF token
  // (they will generate a new token after successful auth)
  const authEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ];
  
  if (authEndpoints.includes(req.path)) {
    console.log(`⚠️ CSRF bypassed for auth endpoint: ${req.path}`);
    
    // Try to validate if token exists, but don't fail
    let token = req.headers['x-csrf-token'] || 
                req.headers['csrf-token'] || 
                req.body?.csrfToken ||
                req.query?.csrfToken ||
                req.cookies?.csrfToken;

    if (token) {
      const validation = this.validateToken(req, token);
      if (!validation.valid) {
        console.log(`CSRF token invalid for ${req.path}, but proceeding:`, validation.error);
        // Generate new token after successful auth
      }
    }
    
    return next();
  }

  // Get token from headers or body for other endpoints
  let token = req.headers['x-csrf-token'] || 
              req.headers['csrf-token'] || 
              req.body?.csrfToken ||
              req.query?.csrfToken;

  // For form submissions
  if (!token && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    token = req.body?.csrfToken;
  }

  const validation = this.validateToken(req, token);
  
  if (!validation.valid) {
    console.error('CSRF validation failed:', {
      path: req.path,
      method: req.method,
      error: validation.error,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent']
    });

    return res.status(403).json({
      success: false,
      message: 'Security validation failed',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Attach token data to request
  req.csrfTokenData = validation.tokenData;
  req.csrfToken = token;
  
  next();
};
  // middleware/csrf.middleware.js - Update attachCSRF method
attachCSRF = (req, res, next) => {
  // Always generate token for CSRF endpoint
  if (req.path === '/api/csrf-token') {
    const token = this.generateToken(req, res);
    req.csrfToken = token;
    res.locals.csrfToken = token;
    return next();
  }
  
  // Generate token for login page (frontend needs it before login)
  if (req.path === '/api/auth/login' && req.method === 'GET') {
    const token = this.generateToken(req, res);
    req.csrfToken = token;
    res.locals.csrfToken = token;
    return next();
  }

  // Skip if already has token in cookies
  const existingToken = req.cookies?.csrfToken;
  if (existingToken && this.csrfTokens.has(existingToken)) {
    req.csrfToken = existingToken;
    res.locals.csrfToken = existingToken;
    return next();
  }

  // Generate new token for authenticated users
  if (req.user) {
    const token = this.generateToken(req, res);
    req.csrfToken = token;
    res.locals.csrfToken = token;
  }
  
  next();
};

  // Set CSRF cookie
  setCSRFCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = isProduction;
    
    res.cookie('csrfToken', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: this.tokenExpiry,
      ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
      partitioned: true
    });
  }

  // Clear CSRF cookie
  clearCSRFCookie(res) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.clearCookie('csrfToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      ...(isProduction && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
    });
  }

  // Get client IP
  getClientIp(req) {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           '0.0.0.0';
  }

  // Cleanup expired tokens
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

  // Get token statistics
  getTokenStats() {
    return {
      totalTokens: this.csrfTokens.size,
      activeSessions: new Set(Array.from(this.csrfTokens.values()).map(t => t.sessionId)).size
    };
  }
}

module.exports = new CSRFMiddleware();