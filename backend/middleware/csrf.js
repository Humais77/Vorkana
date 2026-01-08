// middleware/csrf.js - FIXED VERSION
const crypto = require('crypto');
const { setCookie } = require('../config/cookies.js');

const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Enhanced CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for specific endpoints
  const skipPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh-token',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/logout'
  ];

  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Get CSRF token from header or body
  const csrfToken = req.headers['x-csrf-token'] || req.headers['xsrf-token'] || req.body._csrf;
  const cookieCsrfToken = req.cookies['XSRF-TOKEN'];

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('CSRF Check:', {
      path: req.path,
      hasHeaderToken: !!csrfToken,
      hasCookieToken: !!cookieCsrfToken,
      tokenLength: csrfToken?.length,
      cookieLength: cookieCsrfToken?.length
    });
  }

  if (!csrfToken || !cookieCsrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Timing-safe comparison
  try {
    const tokenBuffer = Buffer.from(csrfToken, 'hex');
    const cookieBuffer = Buffer.from(cookieCsrfToken, 'hex');
    
    if (tokenBuffer.length !== cookieBuffer.length || 
        !crypto.timingSafeEqual(tokenBuffer, cookieBuffer)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token format',
      code: 'CSRF_TOKEN_FORMAT_INVALID'
    });
  }

  next();
};

// Middleware to set CSRF token
const setCsrfToken = (req, res, next) => {
  // Only generate if not present or if it's an auth-related request
  const shouldGenerate = !req.cookies['XSRF-TOKEN'] || 
    req.path.includes('/login') || 
    req.path.includes('/register') ||
    req.path.includes('/refresh-token');

  if (shouldGenerate) {
    const csrfToken = generateCsrfToken();
    setCookie(res, 'XSRF-TOKEN', csrfToken, 'csrf');
    
    // Also set in header for immediate use
    res.setHeader('X-CSRF-Token', csrfToken);
    req.csrfToken = csrfToken;
  }
  
  next();
};

module.exports = { csrfProtection, setCsrfToken, generateCsrfToken };