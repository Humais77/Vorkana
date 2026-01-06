// middleware/csrf.js
const crypto = require('crypto');

// Generate CSRF token for new sessions
const generateCsrfToken = (req, res, next) => {
  // Only generate if not already present or if it's a login/signup request
  if (!req.cookies['XSRF-TOKEN'] || req.path.includes('/login') || req.path.includes('/register')) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // EXPLICIT cookie settings - don't rely on default
    const cookieOptions = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Explicitly set
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    // Add domain only in production
    if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    
    res.cookie('XSRF-TOKEN', csrfToken, cookieOptions);
    
    // Also add to response headers for easy access
    res.setHeader('X-CSRF-Token', csrfToken);
    
    // Store in request for later use
    req.csrfToken = csrfToken;
  }
  
  next();
};

const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints that don't need it
  const skipPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh-token',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/logout'
  ];
  
  if (skipPaths.includes(req.path)) {
    return next();
  }
  
  // Get CSRF token from header or body
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const cookieCsrfToken = req.cookies['XSRF-TOKEN'];
  
  if (!csrfToken || !cookieCsrfToken) {
    console.warn('CSRF token missing:', {
      hasHeaderToken: !!csrfToken,
      hasCookieToken: !!cookieCsrfToken,
      path: req.path
    });
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token is required'
    });
  }
  
  // Compare tokens (use timing-safe comparison)
  if (!crypto.timingSafeEqual(
    Buffer.from(csrfToken),
    Buffer.from(cookieCsrfToken)
  )) {
    console.warn('CSRF token mismatch:', {
      headerToken: csrfToken?.substring(0, 10),
      cookieToken: cookieCsrfToken?.substring(0, 10),
      path: req.path,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }
  
  next();
};

module.exports = { csrfProtection, generateCsrfToken };