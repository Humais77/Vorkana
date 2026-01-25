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

 validateToken = (req, token) => {
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

  // Refresh token expiry on successful validation
  tokenData.expiresAt = Date.now() + this.tokenExpiry;
  this.csrfTokens.set(token, tokenData);

  return { valid: true, tokenData };
};

// UPDATE requireCSRF method - make it more lenient
requireCSRF = (req, res, next) => {
  // Skip CSRF for safe methods and auth endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for auth endpoints (except logout)
  const publicAuthEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/reactivate',
    '/api/auth/refresh'
  ];
  
  if (publicAuthEndpoints.includes(req.path)) {
    return next();
  }

  // Get token from headers or body
  let token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  
  // Fallback to cookie if not in headers/body
  if (!token) {
    token = req.cookies?.csrfToken;
  }

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token required',
      code: 'CSRF_TOKEN_REQUIRED'
    });
  }

  const validation = this.validateToken(req, token);
  
  if (!validation.valid) {
    // For logout, be more lenient
    if (req.path === '/api/auth/logout') {
      console.warn('CSRF validation failed for logout, proceeding anyway');
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};
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

  // CRITICAL: Skip CSRF for public auth endpoints
  const publicAuthEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/reactivate'
  ];
  
  if (publicAuthEndpoints.includes(req.path)) {
    return next();
  }

  // SPECIAL HANDLING FOR LOGOUT
  if (req.path === '/api/auth/logout') {
    // For logout, we'll validate if token exists but won't block
    let token = req.headers['x-csrf-token'] || 
                req.headers['csrf-token'] || 
                req.body?.csrfToken ||
                req.query?.csrfToken ||
                req.cookies?.csrfToken;

    if (token) {
      const validation = this.validateToken(req, token);
      if (!validation.valid) {
        console.warn('CSRF validation failed for logout, but proceeding:', validation.error);
        // Don't block logout - proceed anyway
      }
    } else {
      console.log('No CSRF token for logout - allowing for API clients');
      // Allow logout without CSRF (for Postman, mobile apps, etc.)
    }
    
    return next();
  }

  // For all other endpoints, require CSRF
  let token = req.headers['x-csrf-token'] || 
              req.headers['csrf-token'] || 
              req.body?.csrfToken ||
              req.query?.csrfToken;

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

  setCSRFCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction;
  
  // Use expires instead of maxAge
  const expires = new Date(Date.now() + this.tokenExpiry);
  
  res.cookie('csrfToken', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    expires: expires, // Use expires
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