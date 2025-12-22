const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model.js');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit'); 
// Security: Rate limiting for admin dashboard
const adminDashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    // Use ipKeyGenerator instead of accessing req.ip directly
    const ip = ipKeyGenerator(req);
    return req.user ? `${ip}-${req.user._id}` : ip;
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
// In admin.middleware.js - UPDATED VERIFY ADMIN FUNCTION
const verifyAdmin = async (req, res, next) => {
  try {
    console.log('[ADMIN VERIFICATION] Starting verification...');
    console.log('[ADMIN VERIFICATION] Headers:', req.headers);
    
    // Security: Check for admin token in multiple locations
    let token;
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.adminToken || req.cookies?.token;
    
    // FIX: Accept both "Admin" and "Bearer" prefixes
    if (authHeader && (authHeader.startsWith('Admin ') || authHeader.startsWith('Bearer ') || authHeader.startsWith('admin '))) {
      token = authHeader.split(' ')[1];
      console.log('[ADMIN VERIFICATION] Token from header:', token ? 'Present' : 'Missing');
    } else if (cookieToken) {
      token = cookieToken;
      console.log('[ADMIN VERIFICATION] Token from cookie:', token ? 'Present' : 'Missing');
    }
    
    if (!token) {
      console.log('[ADMIN VERIFICATION] No token found');
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. No token provided.',
        code: 'ADMIN_TOKEN_REQUIRED'
      });
    }

    // FIX: Log token verification attempt
    console.log('[ADMIN VERIFICATION] Verifying token...');
    
    // FIX: Use the same JWT_SECRET for now
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log('[ADMIN VERIFICATION] Decoded token:', decoded);
    
    // FIX: Check user with more flexible role checking
    const user = await User.findOne({
      _id: decoded.id || decoded._id, // Try both possibilities
      isActive: true
    }).select('+lastLoginAt +failedLoginAttempts');

    if (!user) {
      console.log('[ADMIN VERIFICATION] User not found:', decoded.id);
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive.',
        code: 'USER_NOT_FOUND'
      });
    }

    // FIX: Check if user has admin role (support multiple role formats)
    const isAdmin = user.role === 'admin' || 
                   user.role === 'Admin' || 
                   user.role === 'administrator' ||
                   (Array.isArray(user.roles) && user.roles.includes('admin'));
    
    if (!isAdmin) {
      console.log('[ADMIN VERIFICATION] User is not admin. Role:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Admin access required. Your role: ' + user.role,
        code: 'ADMIN_ACCESS_REQUIRED'
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
    req.user = user; // Also set req.user for compatibility
    
    console.log(`[ADMIN VERIFICATION] Access granted: ${user.email} (${user.role})`);
    
    next();
  } catch (error) {
    console.error('[ADMIN VERIFICATION ERROR]', error.message);
    console.error('[ADMIN VERIFICATION ERROR] Stack:', error.stack);
    
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
      code: 'ADMIN_AUTH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// In admin.middleware.js - UPDATED requirePermission function
// In admin.middleware.js - UPDATED requirePermission function
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      console.log('[PERMISSION CHECK] No admin object found');
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required.',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    console.log(`[PERMISSION CHECK] Checking permission: ${permission}`);
    console.log(`[PERMISSION CHECK] User role: ${req.admin.role}`);
    console.log(`[PERMISSION CHECK] User ID: ${req.admin._id}`);

    // FIX: Updated permissions matrix - admin should have all permissions
    const permissions = {
      // Dashboard
      'view_dashboard': ['admin', 'super_admin', 'moderator'],
      
      // Users
      'view_users': ['admin', 'super_admin', 'moderator'],  // ADD THIS
      'manage_users': ['admin', 'super_admin'],
      'export_users': ['admin', 'super_admin'],
      
      // Categories
      'view_categories': ['admin', 'super_admin', 'moderator'],  // ADD THIS
      'manage_categories': ['admin', 'super_admin', 'moderator'],
      'export_categories': ['admin', 'super_admin'],
      
      // Services
      'view_services': ['admin', 'super_admin', 'moderator'],  // ADD THIS
      'manage_services': ['admin', 'super_admin', 'moderator'],
      'export_services': ['admin', 'super_admin'],
      
      // Gigs
      'view_gigs': ['admin', 'super_admin', 'moderator'],  // ADD THIS
      'manage_gigs': ['admin', 'super_admin', 'moderator'],
      'export_gigs': ['admin', 'super_admin'],
      
      // Analytics
      'view_analytics': ['admin', 'super_admin'],
      'export_data': ['admin', 'super_admin'],
      
      // System
      'system_settings': ['admin', 'super_admin'],
      
      // Fallback for any other permissions
      '*': ['admin', 'super_admin', 'moderator']  // Wildcard for any permission not listed
    };

    const userRole = req.admin.role;
    
    // Check if permission exists in matrix, otherwise use wildcard
    const allowedRoles = permissions[permission] || permissions['*'] || [];
    
    console.log(`[PERMISSION CHECK] Allowed roles for ${permission}:`, allowedRoles);
    
    // Always allow admin and super_admin for all permissions
    if (userRole === 'super_admin' || userRole === 'admin') {
      console.log(`[PERMISSION CHECK] Bypass check for ${userRole}`);
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      console.log(`[PERMISSION CHECK] Access denied. User role ${userRole} not in allowed roles:`, allowedRoles);
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${permission}, Your role: ${userRole}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        allowedRoles: allowedRoles
      });
    }

    console.log(`[PERMISSION CHECK] Permission ${permission} granted to ${userRole}`);
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