const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model.js');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const crypto = require('crypto');

// Import the ipKeyGenerator helper from express-rate-limit
const { ipKeyGenerator } = require('express-rate-limit');

// Token blacklist (use Redis in production)
const tokenBlacklist = new Set();

// Protect route middleware
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Get token from cookie
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
    
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }
    
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Grant access to protected route
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Protect middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization
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

// FIXED: Rate limiting middleware with proper IPv6 handling
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
    // FIX: Use ipKeyGenerator for proper IPv6 handling
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req); // Get properly normalized IP
      // Use IP + user ID if available for more precise limiting
      return req.user?._id ? `${ip}-${req.user._id}` : ip;
    }
  });
};

// Rate limiter for specific routes (e.g., auth routes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator, // Use the built-in IP key generator
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.'
  }
});

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    // Validate body
    if (schema.body) {
      for (const [key, rules] of Object.entries(schema.body)) {
        const value = req.body[key];
        
        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${key} is required`);
          continue;
        }
        
        // Skip further validation if value is not required and not provided
        if (!rules.required && (value === undefined || value === null)) {
          continue;
        }
        
        // Type validation
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${key} must be a string`);
        } else if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${key} must be a number`);
        } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`);
        }
        
        // String-specific validations
        if (rules.type === 'string') {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${key} must be at least ${rules.minLength} characters`);
          }
          
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${key} cannot exceed ${rules.maxLength} characters`);
          }
          
          if (rules.format === 'email' && !validator.isEmail(value)) {
            errors.push(`${key} must be a valid email address`);
          }
          
          if (rules.format === 'url' && !validator.isURL(value)) {
            errors.push(`${key} must be a valid URL`);
          }
          
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
          }
          
          // Sanitize input
          if (rules.sanitize !== false) {
            req.body[key] = validator.escape(value);
          }
        }
      }
    }
    
    // Validate params
    if (schema.params) {
      for (const [key, rules] of Object.entries(schema.params)) {
        const value = req.params[key];
        
        if (rules.required && !value) {
          errors.push(`${key} parameter is required`);
        }
      }
    }
    
    // Validate query
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

// Email verification middleware
const verifyEmailToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to access this resource'
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

// Log request middleware
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
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

// Seller only middleware
const sellerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
  
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Seller access required'
    });
  }
  
  next();
};

// User only middleware
const userOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
  
  // Allow all authenticated users
  next();
};

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  // Try to authenticate but don't require it
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  
  if (token) {
    try {
      // Try to verify token
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
      // Token is invalid, proceed without user
      next();
    }
  } else {
    next();
  }
};

module.exports = {
  protect,
  authorize,
  adminOnly,
  sellerOnly,
  userOnly,
  optionalAuth,
  rateLimiter,
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  validateRequest,
  verifyEmailToken,
  logRequest,
  tokenBlacklist
};