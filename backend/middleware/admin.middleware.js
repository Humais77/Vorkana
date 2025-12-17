const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model.js');
const rateLimit = require('express-rate-limit');

// Security: Rate limiting for admin dashboard
const adminDashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return req.user ? `${req.ip}-${req.user._id}` : req.ip;
  },
  message: {
    success: false,
    message: 'Too many admin requests. Please wait.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Advanced admin verification with multi-factor checks
// In admin.middleware.js - FIX THE TOKEN EXTRACTION
const verifyAdmin = async (req, res, next) => {
  try {
    // Security: Check for admin token in multiple locations
    let token;
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.adminToken || req.cookies?.token;
    
    // FIX: Accept both "Admin" and "Bearer" prefixes
    if (authHeader && (authHeader.startsWith('Admin ') || authHeader.startsWith('Bearer '))) {
      token = authHeader.split(' ')[1];
    } else if (cookieToken) {
      token = cookieToken;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. No token provided.',
        code: 'ADMIN_TOKEN_REQUIRED'
      });
    }

    // FIX: Use the same JWT_SECRET for now
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Security: Find user with additional checks
    const user = await User.findOne({
      _id: decoded.id,
      isActive: true,
      role: 'admin' // This is key - must be admin role
    }).select('+lastLoginAt +failedLoginAttempts');

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Admin user not found or inactive.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Security: Set admin-specific headers
    res.set({
      'X-Admin-Access': 'true',
      'X-Admin-User-Id': user._id,
      'X-Admin-Role': user.role
    });

    req.admin = user;
    req.adminToken = token;
    
    // Security: Log admin access
    console.log(`[ADMIN ACCESS] ${new Date().toISOString()} - ${user.email} - ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.error('[ADMIN VERIFICATION ERROR]', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token.',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Admin token expired.',
        code: 'ADMIN_TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Admin authentication failed.',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
};
// Role-based access control middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required.',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    // Security: Define admin permissions matrix
    const permissions = {
      'view_dashboard': ['admin'],
      'manage_users': ['admin'],
      'manage_categories': ['admin'],
      'view_analytics': ['admin'],
      'export_data': ['admin'],
      'system_settings': ['admin']
    };

    const userRole = req.admin.role;
    const allowedRoles = permissions[permission] || [];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Audit logging middleware
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();
    
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Log admin action
      console.log(`[ADMIN AUDIT] ${new Date().toISOString()} - ` +
        `User: ${req.admin?.email} - ` +
        `Action: ${action} - ` +
        `Resource: ${resource} - ` +
        `IP: ${req.ip} - ` +
        `Status: ${res.statusCode} - ` +
        `ResponseTime: ${responseTime}ms`);
      
      // If there's an error, log details
      if (res.statusCode >= 400) {
        console.error(`[ADMIN ERROR] ${action} failed:`, {
          user: req.admin?.email,
          error: typeof data === 'string' ? data : data?.message,
          body: req.body,
          params: req.params
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  verifyAdmin,
  requirePermission,
  adminDashboardLimiter,
  auditLog
};