const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model.js');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const crypto = require('crypto');
const { ipKeyGenerator } = require('express-rate-limit');

const tokenBlacklist = new Set();


// Add clearAuthCookies function
const clearAuthCookies = (res) => {
  const clearCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };
  
  res.clearCookie('token', clearCookieOptions);
  res.clearCookie('refreshToken', { ...clearCookieOptions, path: '/api/auth/refresh' });
  res.clearCookie('isAuthenticated', { ...clearCookieOptions, httpOnly: false });
};

// Add this helper function to check auth status
const checkAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      req.isAuthenticated = false;
      return next();
    }
    
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -passwordHistory');
    
    if (user && user.isActive) {
      req.isAuthenticated = true;
      req.user = user;
    } else {
      req.isAuthenticated = false;
    }
    
    next();
  } catch (error) {
    req.isAuthenticated = false;
    next();
  }
};
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }
    
    next();
  };
};

// FIX: Proper ipKeyGenerator usage
const getClientIp = (req) => {
  // Use ipKeyGenerator if available
  try {
    if (typeof ipKeyGenerator === 'function') {
      return ipKeyGenerator(req);
    }
  } catch (error) {
    // Fallback to standard IP extraction
  }
  
  // Standard IP extraction
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         '0.0.0.0';
};

const rateLimiter = (max, windowMs) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = getClientIp(req);
      return req.user?._id ? `${ip}-${req.user._id}` : ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 for testing
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  skip: (req) => {
    // Skip for specific test routes if needed
    return req.path.includes('/health');
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Increased from 3 to 5
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 3 to 10 for testing
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.'
  }
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    // First, validate JSON parsing
    if (req.is('application/json')) {
      try {
        if (typeof req.body === 'string') {
          req.body = JSON.parse(req.body);
        }
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format in request body',
          error: parseError.message
        });
      }
    }
    
    if (schema.body) {
      for (const [key, rules] of Object.entries(schema.body)) {
        const value = req.body[key];
        
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${key} is required`);
          continue;
        }
        
        if (!rules.required && (value === undefined || value === null)) {
          continue;
        }
        
        // Type validation
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${key} must be a string`);
        } else if (rules.type === 'number' && typeof value !== 'number' && !isNaN(value)) {
          errors.push(`${key} must be a number`);
        } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`);
        } else if (rules.type === 'array' && !Array.isArray(value)) {
          errors.push(`${key} must be an array`);
        } else if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          errors.push(`${key} must be an object`);
        }
        
        if (rules.type === 'string' && typeof value === 'string') {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${key} must be at least ${rules.minLength} characters`);
          }
          
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${key} cannot exceed ${rules.maxLength} characters`);
          }
          
          if (rules.format === 'email' && !validator.isEmail(value)) {
            errors.push(`${key} must be a valid email address`);
          }
          
          if (rules.format === 'url' && !validator.isURL(value, { require_protocol: false })) {
            errors.push(`${key} must be a valid URL`);
          }
          
          if (rules.format === 'date' && !validator.isDate(value)) {
            errors.push(`${key} must be a valid date`);
          }
          
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
          }
          
          if (rules.sanitize !== false) {
            req.body[key] = validator.escape(value);
          }
        }
      }
    }
    
    if (schema.params) {
      for (const [key, rules] of Object.entries(schema.params)) {
        const value = req.params[key];
        
        if (rules.required && !value) {
          errors.push(`${key} parameter is required`);
        }
      }
    }
    
    if (schema.query) {
      for (const [key, rules] of Object.entries(schema.query)) {
        const value = req.query[key];
        
        if (rules.required && !value) {
          errors.push(`${key} query parameter is required`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

const verifyEmailToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to access this resource',
        requiresVerification: true,
        email: user.email
      });
    }
    
    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking email verification'
    });
  }
};

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = getClientIp(req);
  
  console.log(`${timestamp} - ${method} ${url} - IP: ${ip}`);
  
  // Store the IP in request for later use
  req.clientIp = ip;
  
  next();
};

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
};

const userOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
  
  next();
};

const optionalAuth = (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      User.findById(decoded.id)
        .then(user => {
          if (user && user.isActive) {
            req.user = user;
          }
          next();
        })
        .catch(() => next());
    } catch (error) {
      // Silently fail for optional auth
      next();
    }
  } else {
    next();
  }
};

// Enhanced security middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  
  next();
};

// Request size limiter
const requestSizeLimiter = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);
    const maxSize = parseSize(limit);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: `Request payload too large. Maximum size is ${limit}`
      });
    }
    
    next();
  };
};

// Helper to parse size string (e.g., '10mb') to bytes
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const value = parseFloat(match[1]);
  const unit = match[3];
  
  return Math.floor(value * units[unit]);
}

// Enhanced error logging
const errorLogger = (err, req, res, next) => {
  const ip = getClientIp(req);
  const timestamp = new Date().toISOString();
  
  console.error(`🔴 [${timestamp}] Unhandled Error - IP: ${ip} - Path: ${req.path}:`, {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  next(err);
};

module.exports = {
  authorize,
  adminOnly,
  userOnly,
  optionalAuth,
  rateLimiter,
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  validateRequest,
  verifyEmailToken,
  logRequest,
  tokenBlacklist,
  securityHeaders,
  requestSizeLimiter,
  errorLogger,
  getClientIp
};