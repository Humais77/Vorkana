const mongoose = require('mongoose');
const User = require('../models/user.model.js');
const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js');
const Service = require('../models/services.model.js');
const Gig = require('../models/gig.model.js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const parsePhoneNumberFromString = require("libphonenumber-js").parsePhoneNumberFromString;
const bcrypt = require('bcryptjs');


// Admin Logout
const adminLogout = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { clearAdminCookies } = require('../middleware/admin.middleware.js');
    
    // Clear admin cookies
    clearAdminCookies(res);
    
    // Log admin logout
    if (req.admin) {
      await logAdminAction(req.admin._id, 'ADMIN_LOGOUT', 'system', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[ADMIN LOGOUT] Success for admin: ${req.admin?.email || 'unknown'}`);
    
    res.json({
      success: true,
      message: 'Admin logout successful',
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ADMIN LOGOUT ERROR]', error);
    
    res.status(500).json({
      success: false,
      message: 'Admin logout failed',
      code: 'ADMIN_LOGOUT_ERROR',
      requestId
    });
  }
};

// Check Admin Session
const checkAdminSession = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'No active admin session',
        code: 'NO_ADMIN_SESSION',
        requestId
      });
    }
    
    // Update last seen
    req.admin.lastSeenAt = new Date();
    await req.admin.save({ validateBeforeSave: false });
    
    const responseData = {
      _id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      picture: req.admin.picture,
      emailVerified: req.admin.emailVerified,
      createdAt: req.admin.createdAt.toISOString(),
      lastLoginAt: req.admin.lastLoginAt?.toISOString(),
      lastSeenAt: req.admin.lastSeenAt?.toISOString(),
      permissions: getAdminPermissions(req.admin.role)
    };
    
    res.json({
      success: true,
      message: 'Admin session is valid',
      user: responseData,
      session: {
        valid: true,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      },
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CHECK ADMIN SESSION ERROR]', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to check admin session',
      code: 'SESSION_CHECK_ERROR',
      requestId
    });
  }
};

// Helper function for timing attack prevention
const fakeDelay = () => {
  return new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 100));
};

// Helper function to get admin permissions
const getAdminPermissions = (role) => {
  const permissions = {
    // Dashboard
    'view_dashboard': ['admin', 'super_admin', 'moderator'],
    
    // Users
    'view_users': ['admin', 'super_admin', 'moderator'],
    'manage_users': ['admin', 'super_admin'],
    'export_users': ['admin', 'super_admin'],
    
    // Categories (includes subcategories)
    'view_categories': ['admin', 'super_admin', 'moderator'],
    'manage_categories': ['admin', 'super_admin', 'moderator'],
    'export_categories': ['admin', 'super_admin'],
    
    // Subcategories specific permissions
    'view_subcategories': ['admin', 'super_admin', 'moderator'],
    'manage_subcategories': ['admin', 'super_admin', 'moderator'],
    
    // Services
    'view_services': ['admin', 'super_admin', 'moderator'],
    'manage_services': ['admin', 'super_admin', 'moderator'],
    'export_services': ['admin', 'super_admin'],
    
    // Gigs
    'view_gigs': ['admin', 'super_admin', 'moderator'],
    'manage_gigs': ['admin', 'super_admin', 'moderator'],
    'export_gigs': ['admin', 'super_admin'],
    
    // Analytics
    'view_analytics': ['admin', 'super_admin'],
    'export_data': ['admin', 'super_admin'],
    
    // System
    'system_settings': ['admin', 'super_admin']
  };
  
  // Filter permissions for the specific role
  const userPermissions = {};
  Object.keys(permissions).forEach(permission => {
    if (permissions[permission].includes(role)) {
      userPermissions[permission] = true;
    }
  });
  
  return userPermissions;
};
// Security: Audit trail function
const logAdminAction = async (adminId, action, resource, details = {}) => {
  try {
    // In production, store in a separate audit collection
    const auditLog = {
      adminId,
      action,
      resource,
      details,
      ipAddress: details.ip,
      userAgent: details.userAgent,
      timestamp: new Date()
    };
    
    console.log('[ADMIN ACTION LOG]', auditLog);
    
    // Optional: Store in database
    // await AuditLog.create(auditLog);
    
  } catch (error) {
    console.error('[AUDIT LOG ERROR]', error);
  }
};
// In your admin categories controller
const getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      status,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {
      deletedAt: null
    };

    // Handle boolean filters - convert empty strings to undefined
    if (status !== undefined && status !== '') {
      filter.isActive = status === 'true';
    }
    
    if (featured !== undefined && featured !== '') {
      filter.featured = featured === 'true';
    }

    // Add search filter if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get categories
    const categories = await Category.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    // Get total count
    const total = await Category.countDocuments(filter);

    res.json({
      success: true,
      data: categories,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories'
    });
  }
};
const bulkUpdateUsers = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { ids, operation, data = {} } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users selected',
        code: 'NO_USERS_SELECTED',
        requestId
      });
    }

    // Validate IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid user IDs provided',
        code: 'INVALID_IDS',
        requestId
      });
    }

    let updateData = {};
    let message = 'Users updated successfully';

    switch (operation) {
      case 'activate':
        updateData = { 
          isActive: true,
          deletedAt: null
        };
        message = 'Users activated successfully';
        break;
        
      case 'deactivate':
        updateData = { 
          isActive: false 
        };
        message = 'Users deactivated successfully';
        break;
        
      case 'verify-email':
        updateData = { 
          emailVerified: true 
        };
        message = 'Users email verified successfully';
        break;
        
      case 'unverify-email':
        updateData = { 
          emailVerified: false 
        };
        message = 'Users email unverified successfully';
        break;
        
      case 'promote-admin':
        // Security: Check if admin is trying to self-promote
        if (validIds.includes(req.admin._id.toString())) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change your own role in bulk operation',
            code: 'SELF_ROLE_CHANGE',
            requestId
          });
        }
        updateData = { 
          role: 'admin' 
        };
        message = 'Users promoted to admin successfully';
        break;
        
      case 'demote-user':
        // Security: Check if admin is trying to self-demote
        if (validIds.includes(req.admin._id.toString())) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change your own role in bulk operation',
            code: 'SELF_ROLE_CHANGE',
            requestId
          });
        }
        updateData = { 
          role: 'user' 
        };
        message = 'Users demoted to regular users successfully';
        break;
        
      case 'delete':
        updateData = { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.admin._id 
        };
        message = 'Users deleted successfully';
        break;
        
      default:
        updateData = data;
    }

    updateData.updatedAt = new Date();

    // Perform bulk update
    const result = await User.updateMany(
      { 
        _id: { $in: validIds },
        _id: { $ne: req.admin._id } // Prevent self-modification
      },
      { $set: updateData }
    );

    // Security: Log bulk action
    await logAdminAction(req.admin._id, `BULK_${operation.toUpperCase()}_USERS`, 'users', {
      count: validIds.length,
      operation,
      modifiedCount: result.modifiedCount,
      ip: req.ip
    });

    res.json({
      success: true,
      message,
      operation,
      modifiedCount: result.modifiedCount,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BULK UPDATE USERS ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate data found',
        code: 'DUPLICATE_DATA',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      code: 'BULK_OPERATION_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getDashboardStats = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log(`[DASHBOARD STATS] Starting dashboard stats collection for request: ${requestId}`);
    
    // Run all queries in parallel for better performance
    const [
      userStats,
      categoryStats,
      subcategoryStats,
      serviceStats,
      gigStats,
      recentActivity
    ] = await Promise.all([
      // User stats
      User.aggregate([
        {
          $facet: {
            totalUsers: [{ $count: "count" }],
            activeUsers: [{ $match: { isActive: true } }, { $count: "count" }]
          }
        }
      ]),
      
      // Category stats - FIXED: Simplified query
      Category.aggregate([
        { 
          $match: { 
            deletedAt: null,
            isSubcategory: false
          } 
        },
        {
          $group: {
            _id: null,
            totalCategories: { $sum: 1 },
            activeCategories: {
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ["$isActive", true] }, { $ifNull: ["$isActive", true] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      
      // Subcategory stats - FIXED: Use Subcategory model
      Subcategory.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            totalSubcategories: { $sum: 1 },
            activeSubcategories: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$isActive", true] }, { $ifNull: ["$isActive", true] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      
      // Service stats
      Service.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            totalServices: { $sum: 1 },
            activeServices: {
              $sum: {
                $cond: [
                  { 
                    $or: [
                      { $eq: ["$status", "active"] },
                      { $eq: ["$isActive", true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      
      // Gig stats
      Gig.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            totalGigs: { $sum: 1 },
            activeGigs: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["open", "in_progress", "assigned"]
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      
      // Recent activity
      User.find({ 
        deletedAt: null
      }, { 
        name: 1, 
        email: 1, 
        role: 1, 
        picture: 1, 
        createdAt: 1,
        lastLoginAt: 1,
        isActive: 1
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
    ]);

    // Process and format the results
    const stats = {
      overview: {
        totalUsers: userStats[0]?.totalUsers?.[0]?.count || 0,
        activeUsers: userStats[0]?.activeUsers?.[0]?.count || 0
      },
      categories: {
        totalCategories: categoryStats[0]?.totalCategories || 0,
        activeCategories: categoryStats[0]?.activeCategories || 0,
        totalSubcategories: subcategoryStats[0]?.totalSubcategories || 0,
        activeSubcategories: subcategoryStats[0]?.activeSubcategories || 0
      },
      services: {
        totalServices: serviceStats[0]?.totalServices || 0,
        activeServices: serviceStats[0]?.activeServices || 0
      },
      gigs: {
        totalGigs: gigStats[0]?.totalGigs || 0,
        activeGigs: gigStats[0]?.activeGigs || 0
      },
      recentActivity: recentActivity.map(user => ({
        id: user._id,
        name: user.name || 'Unknown User',
        email: user.email || 'No email',
        role: user.role || 'user',
        avatar: user.picture || null,
        joined: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        lastSeen: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
        isActive: user.isActive || false,
        isNew: !user.lastLoginAt && user.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      }))
    };

    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`[DASHBOARD STATS] Completed in ${executionTime}ms for request: ${requestId}`);
    console.log(`[DASHBOARD STATS] Results:`, {
      users: stats.overview.totalUsers,
      categories: stats.categories.totalCategories,
      subcategories: stats.categories.totalSubcategories,
      services: stats.services.totalServices,
      gigs: stats.gigs.totalGigs
    });

    res.json({
      success: true,
      data: stats,
      requestId,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DASHBOARD STATS ERROR]', error);
    console.error('[DASHBOARD STATS ERROR DETAILS]', error.stack);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Return simplified but accurate stats even on error
    try {
      // Fallback to individual counts if aggregation fails
      const [
        totalUsers,
        activeUsers,
        totalCategories,
        activeCategories,
        totalSubcategories,
        activeSubcategories,
        totalServices,
        activeServices,
        totalGigs,
        activeGigs
      ] = await Promise.all([
        User.countDocuments({ deletedAt: null }),
        User.countDocuments({ deletedAt: null, isActive: true }),
        Category.countDocuments({ deletedAt: null, isSubcategory: false }),
        Category.countDocuments({ deletedAt: null, isSubcategory: false, isActive: true }),
        Subcategory.countDocuments({ deletedAt: null }),
        Subcategory.countDocuments({ deletedAt: null, isActive: true }),
        Service.countDocuments({ deletedAt: null }),
        Service.countDocuments({ deletedAt: null, $or: [{ status: 'active' }, { isActive: true }] }),
        Gig.countDocuments({ deletedAt: null }),
        Gig.countDocuments({ 
          deletedAt: null, 
          status: { $in: ['open', 'in_progress', 'assigned'] } 
        })
      ]);

      const fallbackStats = {
        overview: {
          totalUsers,
          activeUsers
        },
        categories: {
          totalCategories,
          activeCategories,
          totalSubcategories,
          activeSubcategories
        },
        services: {
          totalServices,
          activeServices
        },
        gigs: {
          totalGigs,
          activeGigs
        },
        recentActivity: []
      };

      console.log(`[DASHBOARD STATS] Fallback stats after error:`, fallbackStats);
      
      res.json({
        success: true,
        message: 'Dashboard statistics loaded with fallback method',
        code: 'DASHBOARD_FALLBACK',
        requestId,
        executionTime: `${executionTime}ms`,
        data: fallbackStats
      });
    } catch (fallbackError) {
      console.error('[DASHBOARD STATS FALLBACK ERROR]', fallbackError);
      
      // Return minimal stats
      res.status(200).json({
        success: true,
        message: 'Dashboard statistics loaded with minimal data',
        code: 'DASHBOARD_MINIMAL',
        requestId,
        executionTime: `${executionTime}ms`,
        data: {
          overview: {
            totalUsers: 0,
            activeUsers: 0
          },
          categories: {
            totalCategories: 0,
            activeCategories: 0,
            totalSubcategories: 0,
            activeSubcategories: 0
          },
          services: {
            totalServices: 0,
            activeServices: 0
          },
          gigs: {
            totalGigs: 0,
            activeGigs: 0
          },
          recentActivity: []
        }
      });
    }
  }
};
const getUsers = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log(`[ADMIN GET USERS] Request started - ID: ${requestId}`);
    
    // Extract and sanitize query parameters
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      isActive = '',
      registrationStatus = '',
      emailVerified = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      accountType = ''
    } = req.query;

    // Build secure query filter
    const filter = { deletedAt: null };
    
    // Search filter - sanitize input to prevent regex injection
    if (search && search.trim()) {
      const sanitizedSearch = validator.escape(search.trim());
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { 'phoneNumber': { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }
    
    // Role filter
    if (role && ['user', 'admin', 'seller', 'buyer'].includes(role)) { // Added seller and buyer
      filter.role = role;
    }
    
    // Account type filter
    if (accountType && ['basic', 'premium', 'business'].includes(accountType)) {
      filter.accountType = accountType;
    }
    
    // Boolean filters
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }
    
    if (emailVerified !== '') {
      filter.emailVerified = emailVerified === 'true';
    }
    
    // Registration status filter
    if (registrationStatus && ['pending', 'verified', 'expired', 'cancelled'].includes(registrationStatus)) {
      filter.registrationStatus = registrationStatus;
    }

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Validate sort fields for security
    const allowedSortFields = [
      'name', 'email', 'role', 'createdAt', 'updatedAt', 
      'lastLoginAt', 'rating', 'completedOrders', 'responseRate'
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Create sort object
    const sort = { [sortField]: sortDirection };
    
    // If sorting by name, add secondary sort by email for consistency
    if (sortField === 'name') {
      sort.email = 1;
    }

    // Projection to exclude sensitive fields - ADMIN VERSION (no privacy filtering)
    const projection = {
      // Include all fields for admin
      // Exclude only sensitive security fields
      password: 0,
      resetPasswordToken: 0,
      resetPasswordExpires: 0,
      twoFactorSecret: 0,
      verificationToken: 0,
      verificationTokenExpires: 0,
      registrationData: 0,
      registrationExpiresAt: 0,
      passwordHistory: 0,
      deviceTokens: 0,
      loginHistory: 0,
      failedLoginAttempts: 0,
      lockUntil: 0,
      suspiciousActivityDetected: 0,
      __v: 0
    };

    // Execute queries in parallel for better performance
    const [users, total, activeCount, adminCount, pendingCount] = await Promise.all([
      // Get paginated users - ADMIN SHOULD SEE ALL DATA
      User.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      
      // Get total count
      User.countDocuments(filter),
      
      // Get active users count
      User.countDocuments({ ...filter, isActive: true }),
      
      // Get admin count
      User.countDocuments({ ...filter, role: 'admin' }),
      
      // Get pending registration count
      User.countDocuments({ ...filter, registrationStatus: 'pending' })
    ]);

    // IMPORTANT: DO NOT APPLY PRIVACY SETTINGS FOR ADMIN
    // Admin should see all data regardless of user privacy settings
    const sanitizedUsers = users.map(user => {
      const sanitized = { ...user };
      
      // Format dates for consistency
      if (sanitized.dateOfBirth) {
        sanitized.dateOfBirth = sanitized.dateOfBirth.toISOString().split('T')[0];
      }
      
      if (sanitized.createdAt) {
        sanitized.createdAt = sanitized.createdAt.toISOString();
      }
      
      if (sanitized.updatedAt) {
        sanitized.updatedAt = sanitized.updatedAt.toISOString();
      }
      
      if (sanitized.lastLoginAt) {
        sanitized.lastLoginAt = sanitized.lastLoginAt.toISOString();
      }
      
      if (sanitized.lastSeenAt) {
        sanitized.lastSeenAt = sanitized.lastSeenAt.toISOString();
      }
      
      // Add computed fields
      sanitized.isOnline = sanitized.lastSeenAt && 
        new Date(sanitized.lastSeenAt) > new Date(Date.now() - 5 * 60 * 1000);
      
      sanitized.accountAge = sanitized.createdAt ? 
        Date.now() - new Date(sanitized.createdAt).getTime() : null;
      
      // Add admin-specific flags
      sanitized._isAdminView = true; // Flag to indicate this is admin view
      sanitized._privacyOverridden = true; // Flag that admin bypassed privacy
      
      return sanitized;
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    // Prepare response
    const response = {
      success: true,
      data: {
        users: sanitizedUsers,
        stats: {
          total,
          active: activeCount,
          admins: adminCount,
          pending: pendingCount
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          nextPage: pageNum < totalPages ? pageNum + 1 : null,
          prevPage: pageNum > 1 ? pageNum - 1 : null
        }
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${Date.now() - startTime}ms`,
        results: sanitizedUsers.length,
        filters: {
          search: search || null,
          role: role || null,
          isActive: isActive !== '' ? isActive === 'true' : null,
          registrationStatus: registrationStatus || null
        },
        adminView: true // Indicate this is admin view
      }
    };

    console.log(`[ADMIN GET USERS] Request completed - ID: ${requestId}, Users: ${sanitizedUsers.length}, Total: ${total}`);
    
    res.json(response);

  } catch (error) {
    console.error(`[ADMIN GET USERS ERROR] Request ID: ${requestId}`, error);
    
    // Log additional error details for debugging
    console.error('[ADMIN GET USERS ERROR DETAILS]', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      code: 'USERS_FETCH_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};
const getUserById = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
        requestId
      });
    }

    // Find user - ADMIN VERSION (no privacy filtering)
    const user = await User.findById(id, {
      password: 0,
      resetPasswordToken: 0,
      resetPasswordExpires: 0,
      twoFactorSecret: 0,
      verificationToken: 0,
      verificationTokenExpires: 0,
      registrationData: 0,
      registrationExpiresAt: 0,
      passwordHistory: 0,
      deviceTokens: 0,
      loginHistory: 0,
      failedLoginAttempts: 0,
      lockUntil: 0,
      suspiciousActivityDetected: 0,
      __v: 0
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId
      });
    }

    // Format dates
    const formattedUser = { ...user };
    
    if (formattedUser.dateOfBirth) {
      formattedUser.dateOfBirth = formattedUser.dateOfBirth.toISOString().split('T')[0];
    }
    
    if (formattedUser.createdAt) {
      formattedUser.createdAt = formattedUser.createdAt.toISOString();
    }
    
    if (formattedUser.updatedAt) {
      formattedUser.updatedAt = formattedUser.updatedAt.toISOString();
    }
    
    if (formattedUser.lastLoginAt) {
      formattedUser.lastLoginAt = formattedUser.lastLoginAt.toISOString();
    }
    
    if (formattedUser.lastSeenAt) {
      formattedUser.lastSeenAt = formattedUser.lastSeenAt.toISOString();
    }

    // Add admin flags
    formattedUser._isAdminView = true;
    formattedUser._privacyOverridden = true;

    res.json({
      success: true,
      data: formattedUser,
      requestId,
      timestamp: new Date().toISOString(),
      adminView: true
    });

  } catch (error) {
    console.error(`[ADMIN GET USER BY ID ERROR] Request ID: ${requestId}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      code: 'USER_FETCH_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};
/**
 * @desc    Create a new user (Admin)
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
const createUser = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log(`[ADMIN CREATE USER] Request started - ID: ${requestId}`);
    console.log('[ADMIN CREATE USER] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[ADMIN CREATE USER] Admin ID:', req.admin._id);

    const userData = req.body;
    const adminId = req.admin._id;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // ===== VALIDATION =====
    
    // Required fields validation
    const requiredFields = ['name', 'email', 'password'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Email validation
    if (!validator.isEmail(userData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Password validation
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        code: 'WEAK_PASSWORD',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Check for existing user (including pending registrations)
    const existingUser = await User.findOne({ 
      email: userData.email.toLowerCase().trim()
    });
    
    if (existingUser) {
      console.log('[ADMIN CREATE USER] User already exists:', userData.email);
      
      // Provide specific message based on registration status
      let message = 'User already exists';
      if (existingUser.registrationStatus === 'pending') {
        message = 'User with this email has a pending registration';
      } else if (existingUser.registrationStatus === 'verified') {
        message = 'User with this email is already verified';
      }
      
      return res.status(409).json({
        success: false,
        message,
        code: 'USER_EXISTS',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // ===== DATA SANITIZATION =====
    
    const sanitizedData = {
      // Authentication
      name: validator.escape(userData.name.trim()),
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      
      // Account settings
      role: ['user', 'admin'].includes(userData.role) ? userData.role : 'user',
      accountType: ['basic', 'premium', 'business'].includes(userData.accountType) ? userData.accountType : 'basic',
      isActive: userData.isActive !== undefined ? Boolean(userData.isActive) : true,
      emailVerified: userData.emailVerified !== undefined ? Boolean(userData.emailVerified) : true,
      registrationStatus: userData.emailVerified ? 'verified' : 'pending',
      
      // Profile information
      picture: userData.picture && validator.isURL(userData.picture) ? userData.picture : null,
      bio: userData.bio ? validator.escape(userData.bio.trim()) : '',
      phoneNumber: userData.phoneNumber ? validator.escape(userData.phoneNumber.trim()) : '',
      gender: ['male', 'female', 'other', 'prefer-not-to-say', ''].includes(userData.gender) ? userData.gender : '',
      dateOfBirth: validateDate(userData.dateOfBirth) ? new Date(userData.dateOfBirth) : null,
      country: userData.country ? validator.escape(userData.country.trim()) : '',
      city: userData.city ? validator.escape(userData.city.trim()) : '',
      languages: Array.isArray(userData.languages) ? 
        userData.languages.map(lang => validator.escape(lang.trim())).filter(lang => lang) : [],
      occupation: userData.occupation ? validator.escape(userData.occupation.trim()) : '',
      education: userData.education ? validator.escape(userData.education.trim()) : '',
      
      // Platform metrics
      rating: Math.min(5, Math.max(0, parseFloat(userData.rating) || 0)),
      responseRate: Math.min(100, Math.max(0, parseFloat(userData.responseRate) || 0)),
      responseTime: Math.max(0, parseFloat(userData.responseTime) || 0),
      
      // Privacy settings
      privacySettings: userData.privacySettings || {
        profileVisibility: userData.profileVisibility || 'public',
        showEmail: Boolean(userData.showEmail),
        showPhone: Boolean(userData.showPhone),
        showLocation: userData.showLocation !== undefined ? Boolean(userData.showLocation) : true,
        showLastSeen: userData.showLastSeen !== undefined ? Boolean(userData.showLastSeen) : true
      },
      
      // Two-factor authentication
      twoFactorEnabled: Boolean(userData.twoFactorEnabled),
      
      // Admin metadata
      createdByAdmin: adminId,
      adminNotes: userData.adminNotes ? validator.escape(userData.adminNotes.trim()) : '',
      
      // Security timestamps
      lastPasswordChangeAt: new Date()
    };

    // Validate phone number if provided
    if (sanitizedData.phoneNumber && !validatePhoneNumber(sanitizedData.phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // ===== CREATE USER =====
    
    console.log('[ADMIN CREATE USER] Creating user with sanitized data');
    
    const user = await User.create(sanitizedData);
    
    console.log('[ADMIN CREATE USER] User created successfully:', user._id);

    // ===== PREPARE RESPONSE =====
    
    // Exclude sensitive fields from response
    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      registrationStatus: user.registrationStatus,
      picture: user.picture,
      phoneNumber: user.phoneNumber,
      country: user.country,
      city: user.city,
      occupation: user.occupation,
      education: user.education,
      rating: user.rating,
      responseRate: user.responseRate,
      responseTime: user.responseTime,
      privacySettings: user.privacySettings,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      createdByAdmin: user.createdByAdmin,
      languages: user.languages || []
    };

    // ===== LOG ADMIN ACTION =====
    
    await logAdminAction(adminId, 'CREATE_USER', `user:${user._id}`, {
      email: user.email,
      role: user.role,
      ip: ip,
      timestamp: new Date().toISOString()
    });

    // ===== SEND RESPONSE =====
    
    const responseTime = Date.now() - startTime;
    
    console.log(`[ADMIN CREATE USER] Request completed - ID: ${requestId}, Time: ${responseTime}ms`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: responseData,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    console.error(`[ADMIN CREATE USER ERROR] Request ID: ${requestId}`, error);
    console.error('[ADMIN CREATE USER ERROR DETAILS]', error.stack);
    
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('[ADMIN CREATE USER VALIDATION ERROR]', messages);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    if (error.code === 11000) {
      console.error('[ADMIN CREATE USER DUPLICATE ERROR]', error);
      
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'DUPLICATE_EMAIL',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      code: 'USER_CREATE_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      executionTime: `${responseTime}ms`,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

/**
 * @desc    Update user (Admin)
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.admin._id;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log(`[ADMIN UPDATE USER] Request started - ID: ${requestId}`);
    console.log('[ADMIN UPDATE USER] Params:', { id });
    console.log('[ADMIN UPDATE USER] Updates:', JSON.stringify(updates, null, 2));

    // ===== VALIDATION =====
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Prevent self-modification for certain operations
    if (id === adminId.toString()) {
      if (updates.role && updates.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role',
          code: 'SELF_ROLE_CHANGE',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
      
      if (updates.isActive !== undefined && !updates.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
          code: 'SELF_DEACTIVATION',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ===== DATA SANITIZATION =====
    
    // Define allowed update fields
    const allowedUpdates = [
      'name', 'role', 'accountType', 'isActive', 'emailVerified', 
      'registrationStatus', 'twoFactorEnabled', 'phoneNumber', 'bio', 
      'gender', 'dateOfBirth', 'country', 'city', 'languages', 
      'occupation', 'education', 'picture', 'rating', 'responseRate', 
      'responseTime', 'privacySettings', 'profileVisibility', 
      'showEmail', 'showPhone', 'showLocation', 'showLastSeen',
      'completedOrders', 'lastSeenAt'
    ];
    
    const filteredUpdates = {};
    
    // Filter and sanitize updates
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        switch (key) {
          case 'email':
            if (validator.isEmail(value)) {
              filteredUpdates[key] = value.toLowerCase().trim();
            }
            break;
            
          case 'name':
          case 'bio':
          case 'country':
          case 'city':
          case 'occupation':
          case 'education':
            filteredUpdates[key] = validator.escape(String(value).trim());
            break;
            
          case 'phoneNumber':
            if (validatePhoneNumber(value)) {
              filteredUpdates[key] = validator.escape(String(value).trim());
            }
            break;
            
          case 'dateOfBirth':
            if (validateDate(value)) {
              filteredUpdates[key] = new Date(value);
            }
            break;
            
          case 'languages':
            if (Array.isArray(value)) {
              filteredUpdates[key] = value.map(lang => validator.escape(String(lang).trim()));
            }
            break;
            
          case 'privacySettings':
            if (typeof value === 'object') {
              filteredUpdates[key] = value;
            }
            break;
            
          case 'rating':
            filteredUpdates[key] = Math.min(5, Math.max(0, parseFloat(value) || 0));
            break;
            
          case 'responseRate':
            filteredUpdates[key] = Math.min(100, Math.max(0, parseFloat(value) || 0));
            break;
            
          case 'responseTime':
            filteredUpdates[key] = Math.max(0, parseFloat(value) || 0);
            break;
            
          case 'picture':
            if (validator.isURL(value)) {
              filteredUpdates[key] = value;
            }
            break;
            
          default:
            filteredUpdates[key] = value;
        }
      }
    }
    
    // Handle privacy settings shortcuts
    if (updates.profileVisibility) {
      filteredUpdates.privacySettings = {
        ...(filteredUpdates.privacySettings || {}),
        profileVisibility: updates.profileVisibility
      };
    }
    
    // Update timestamps
    filteredUpdates.updatedAt = new Date();

    // ===== UPDATE USER =====
    
    console.log('[ADMIN UPDATE USER] Filtered updates:', JSON.stringify(filteredUpdates, null, 2));
    
    const user = await User.findByIdAndUpdate(
      id,
      filteredUpdates,
      {
        new: true,
        runValidators: true,
        context: 'query',
        select: '-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -verificationToken -verificationTokenExpires -registrationData -registrationExpiresAt -passwordHistory -deviceTokens -loginHistory -failedLoginAttempts -lockUntil -suspiciousActivityDetected -__v'
      }
    );

    if (!user) {
      console.log('[ADMIN UPDATE USER] User not found:', id);
      
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${Date.now() - startTime}ms`
      });
    }

    // ===== PREPARE RESPONSE =====
    
    // Format dates for consistency
    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      registrationStatus: user.registrationStatus,
      picture: user.picture,
      phoneNumber: user.phoneNumber,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      country: user.country,
      city: user.city,
      occupation: user.occupation,
      education: user.education,
      languages: user.languages,
      rating: user.rating,
      responseRate: user.responseRate,
      responseTime: user.responseTime,
      privacySettings: user.privacySettings,
      twoFactorEnabled: user.twoFactorEnabled,
      completedOrders: user.completedOrders,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null
    };

    // Apply privacy settings to response
    if (responseData.privacySettings) {
      if (!responseData.privacySettings.showEmail) {
        delete responseData.email;
      }
      
      if (!responseData.privacySettings.showPhone) {
        delete responseData.phoneNumber;
      }
      
      if (!responseData.privacySettings.showLocation) {
        delete responseData.country;
        delete responseData.city;
      }
      
      if (!responseData.privacySettings.showLastSeen) {
        delete responseData.lastSeenAt;
      }
    }

    // ===== LOG ADMIN ACTION =====
    
    await logAdminAction(adminId, 'UPDATE_USER', `user:${id}`, {
      updatedFields: Object.keys(filteredUpdates),
      userEmail: user.email,
      ip: ip,
      timestamp: new Date().toISOString()
    });

    console.log(`[ADMIN UPDATE USER] User updated successfully: ${user._id}`);

    // ===== SEND RESPONSE =====
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: responseData,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    console.error(`[ADMIN UPDATE USER ERROR] Request ID: ${requestId}`, error);
    console.error('[ADMIN UPDATE USER ERROR DETAILS]', error.stack);
    
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        code: 'DUPLICATE_EMAIL',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        code: 'CAST_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      code: 'USER_UPDATE_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      executionTime: `${responseTime}ms`,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

/**
 * @desc    Delete user (Admin - Soft or Permanent)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { permanent = 'false', reason = '' } = req.query;
    const adminId = req.admin._id;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log(`[ADMIN DELETE USER] Request started - ID: ${requestId}`);
    console.log('[ADMIN DELETE USER] Params:', { 
      id, 
      originalId: req.params.id,
      permanent, 
      reason 
    });

    // ===== FIX: Handle [object Object] case =====
    let userId = id;
    
    // Handle [object Object] case
    if (id === '[object Object]' || id === 'undefined' || id === 'null') {
      console.log('[ADMIN DELETE USER] Fixing ID...');
      
      // Try to get ID from body
      if (req.body && req.body.id) {
        userId = req.body.id;
        console.log('[ADMIN DELETE USER] Using ID from body:', userId);
      } 
      // Try to get ID from query
      else if (req.query && req.query.id) {
        userId = req.query.id;
        console.log('[ADMIN DELETE USER] Using ID from query:', userId);
      }
      // Try to parse from the string itself
      else {
        try {
          const decoded = decodeURIComponent(userId);
          if (decoded.startsWith('{')) {
            const parsed = JSON.parse(decoded);
            userId = parsed._id || parsed.id;
            console.log('[ADMIN DELETE USER] Parsed ID from JSON:', userId);
          }
        } catch (e) {
          console.error('[ADMIN DELETE USER] Failed to parse ID:', e);
        }
      }
    }
    
    // ===== VALIDATION =====
    
    // Validate the ID
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('[ADMIN DELETE USER] No valid ID found');
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('[ADMIN DELETE USER] Invalid MongoDB ID:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID_FORMAT',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Prevent self-deletion
    if (userId === adminId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        code: 'SELF_DELETION',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Check if already deleted
    if (user.deletedAt && permanent !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'User is already deleted',
        code: 'ALREADY_DELETED',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // ===== DELETE USER =====
    
    let result;
    const now = new Date();
    
    if (permanent === 'true') {
      const Service = require('../models/services.model.js');
      const Gig = require('../models/gig.model.js');
      
      // Check for active dependencies
      const [activeServices, activeGigs, activeOrders] = await Promise.all([
        Service.countDocuments({ createdBy: userId, deletedAt: null, status: 'active' }),
        Gig.countDocuments({ createdBy: userId, deletedAt: null, status: 'open' }),
      ]);
      
      if (activeServices > 0 || activeGigs > 0 || activeOrders > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot permanently delete user with active services, gigs, or orders',
          code: 'ACTIVE_DEPENDENCIES',
          details: {
            activeServices,
            activeGigs,
            activeOrders
          },
          requestId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Perform permanent deletion
      result = await User.findByIdAndDelete(userId);
      
      console.log(`[ADMIN DELETE USER] User permanently deleted: ${userId}`);
      
    } else {
      // Soft delete
      result = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          deletedAt: now,
          deletedBy: adminId,
          deletionReason: validator.escape(String(reason).trim()),
          lastSeenAt: now,
          // Clear active sessions if any
          $set: { activeSessions: [] }
        },
        { new: true }
      );
      
      console.log(`[ADMIN DELETE USER] User soft deleted: ${userId}`);
    }

    // ===== LOG ADMIN ACTION =====
    
    await logAdminAction(adminId, 'DELETE_USER', `user:${userId}`, {
      permanent: permanent === 'true',
      reason: reason || undefined,
      userEmail: user.email,
      ip: ip,
      timestamp: now.toISOString()
    });

    // ===== SEND RESPONSE =====
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: permanent === 'true' ? 'User permanently deleted' : 'User deactivated successfully',
      data: {
        _id: userId,
        email: user.email,
        name: user.name,
        isActive: false,
        deletedAt: now.toISOString(),
        deletionReason: reason || undefined
      },
      meta: {
        requestId,
        timestamp: now.toISOString(),
        executionTime: `${responseTime}ms`,
        deletionType: permanent === 'true' ? 'permanent' : 'soft'
      }
    });

  } catch (error) {
    console.error(`[ADMIN DELETE USER ERROR] Request ID: ${requestId}`, error);
    console.error('[ADMIN DELETE USER ERROR DETAILS]', error.stack);
    
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_ID_FORMAT',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      code: 'USER_DELETE_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      executionTime: `${responseTime}ms`,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};
/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string' };
  }
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`at least ${minLength} characters`);
  }
  if (!hasUpperCase) {
    errors.push('one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('one number');
  }
  if (!hasSpecialChar) {
    errors.push('one special character (@$!%*?&)');
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? `Password must contain ${errors.join(', ')}` : 'Password is valid'
  };
};

/**
 * Validate date format and age range
 */
const validateDate = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    return age - 1 >= 13 && age - 1 <= 120;
  }
  
  return age >= 13 && age <= 120;
};

/**
 * Validate phone number
 */
const validatePhoneNumber = (phone) => {
  if (!phone || phone.trim() === '') return true;
  
  const phoneStr = phone.toString().trim();
  const phoneRegex = /^\+[\d\s\-\(\)\.]+$/;
  const cleanPhone = phoneStr.replace(/[\s\-\(\)\.]/g, '');
  
  return phoneRegex.test(phoneStr) && cleanPhone.length >= 8 && cleanPhone.length <= 16;
};
// Export Users
// Export Users - FIXED VERSION
const exportUsers = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'json' } = req.query;

    console.log(`[EXPORT USERS] Starting export with format: ${format}, requestId: ${requestId}`);

    // Security: Get users with minimal sensitive data
    const users = await User.find()
      .select('name email role isActive emailVerified createdAt lastLoginAt phoneNumber country city occupation education languages')
      .lean();

    console.log(`[EXPORT USERS] Found ${users.length} users to export`);

    if (format.toLowerCase() === 'csv') {
      // Prepare CSV headers
      const headers = [
        'ID',
        'Name',
        'Email',
        'Role',
        'Active',
        'Email Verified',
        'Phone Number',
        'Country',
        'City',
        'Occupation',
        'Education',
        'Languages',
        'Created At',
        'Last Login'
      ];

      // Prepare CSV rows
      const csvRows = users.map(user => [
        user._id,
        `"${(user.name || '').replace(/"/g, '""')}"`, // Escape quotes
        user.email || '',
        user.role || 'user',
        user.isActive ? 'Yes' : 'No',
        user.emailVerified ? 'Yes' : 'No',
        user.phoneNumber || '',
        user.country || '',
        user.city || '',
        user.occupation || '',
        user.education || '',
        `"${(Array.isArray(user.languages) ? user.languages.join(', ') : '').replace(/"/g, '""')}"`,
        user.createdAt ? new Date(user.createdAt).toISOString() : '',
        user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : 'Never'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\r\n'); // Use \r\n for proper CSV format

      console.log(`[EXPORT USERS] CSV content generated, ${csvRows.length} rows`);

      // Set proper CSV headers
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.header('Content-Disposition', `attachment; filename="users_export_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', users.length);
      res.header('X-Export-Timestamp', new Date().toISOString());
      
      return res.send(csvContent);
    }

    // Default to JSON format
    console.log(`[EXPORT USERS] Returning JSON format, ${users.length} users`);
    
    res.json({
      success: true,
      count: users.length,
      data: users,
      exportedAt: new Date().toISOString(),
      requestId,
      format: 'json'
    });

  } catch (error) {
    console.error('[EXPORT USERS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      code: 'EXPORT_ERROR',
      requestId,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const checkSystemHealth = async () => {
  try {
    const mongoose = require('mongoose');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      env: process.env.NODE_ENV,
      responseTime: '0ms',
      version: process.version,
      platform: process.platform
    };
    
    // Convert memory usage to MB for readability
    health.memory = {
      heapTotal: Math.round(health.memory.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(health.memory.heapUsed / 1024 / 1024) + ' MB',
      rss: Math.round(health.memory.rss / 1024 / 1024) + ' MB',
      external: Math.round(health.memory.external / 1024 / 1024) + ' MB'
    };
    
    return health;
  } catch (error) {
    console.error('[SYSTEM HEALTH CHECK ERROR]', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Add this route handler separately
const getSystemHealthHandler = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const health = await checkSystemHealth();
    
    res.json({
      success: true,
      data: health,
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[GET SYSTEM HEALTH ERROR]', error);
    
    res.status(500).json({
      success: false,
      message: 'System health check failed',
      code: 'HEALTH_CHECK_ERROR',
      requestId,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// In admin.controller.js - Fix the getServiceStats function
const getServiceStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    console.log('[SERVICE STATS] Starting stats aggregation');
    
    // Simplify the aggregation for better performance
    const stats = await Service.aggregate([
      {
        $facet: {
          // Overview stats - simplified
          overview: [
            {
              $group: {
                _id: null,
                totalServices: { $sum: 1 },
                activeServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'active'] },
                      1,
                      0
                    ]
                  } 
                },
                draftServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'draft'] },
                      1,
                      0
                    ]
                  } 
                },
                pendingServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'pending'] },
                      1,
                      0
                    ]
                  } 
                },
                pausedServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'paused'] },
                      1,
                      0
                    ]
                  } 
                },
                suspendedServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'suspended'] },
                      1,
                      0
                    ]
                  } 
                },
                featuredServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$isFeatured', true] },
                      1,
                      0
                    ]
                  } 
                },
                recommendedServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$isRecommended', true] },
                      1,
                      0
                    ]
                  } 
                },
                // Use $ifNull to handle null values
                totalViews: { $sum: { $ifNull: ['$views', 0] } },
                totalLikes: { $sum: { $ifNull: ['$likes', 0] } },
                avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                avgRating: { $avg: { $ifNull: ['$rating', 0] } },
                avgDeliveryTime: { $avg: { $ifNull: ['$deliveryTime', 0] } },
                // Calculate revenue safely
                totalRevenue: { 
                  $sum: { 
                    $multiply: [
                      { $ifNull: ['$price', 0] },
                      { $ifNull: ['$ordersCount', 0] }
                    ]
                  } 
                }
              }
            }
          ],
          
          // Category stats - simplified
          byCategory: [
            { 
              $match: { 
                status: { $in: ['active', 'published'] },
                isActive: true,
                category: { $exists: true, $ne: null }
              } 
            },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgRating: { $avg: { $ifNull: ['$rating', 0] } },
                avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                totalRevenue: { 
                  $sum: { 
                    $multiply: [
                      { $ifNull: ['$price', 0] },
                      { $ifNull: ['$ordersCount', 0] }
                    ]
                  } 
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          
          // Status breakdown
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                avgOrders: { $avg: { $ifNull: ['$ordersCount', 0] } }
              }
            },
            { $sort: { count: -1 } }
          ],
          
          // Monthly growth
          growth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                revenue: { 
                  $sum: { 
                    $multiply: [
                      { $ifNull: ['$price', 0] },
                      { $ifNull: ['$ordersCount', 0] }
                    ]
                  } 
                }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    console.log('[SERVICE STATS] Aggregation completed:', stats.length);

    // Handle empty results
    const result = stats[0] || {
      overview: [{
        totalServices: 0,
        activeServices: 0,
        draftServices: 0,
        pendingServices: 0,
        pausedServices: 0,
        suspendedServices: 0,
        featuredServices: 0,
        recommendedServices: 0,
        totalViews: 0,
        totalLikes: 0,
        avgPrice: 0,
        avgRating: 0,
        avgDeliveryTime: 0,
        totalRevenue: 0
      }],
      byCategory: [],
      byStatus: [],
      growth: []
    };

    // Get category names for byCategory
    const byCategory = result.byCategory || [];
    const categoryIds = byCategory.map(item => item._id).filter(id => id);
    
    let categories = [];
    if (categoryIds.length > 0) {
      categories = await Category.find({ _id: { $in: categoryIds } })
        .select('name slug')
        .lean();
    }
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });
    
    // Replace category IDs with names
    const byCategoryWithNames = byCategory.map(item => ({
      ...item,
      category: categoryMap[item._id?.toString()] || { name: 'Unknown', slug: '' }
    }));

    // Format dates in growth data
    const formattedGrowth = (result.growth || []).map(item => ({
      ...item,
      period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
    }));

    res.json({
      success: true,
      data: {
        overview: result.overview[0] || result.overview,
        byCategory: byCategoryWithNames,
        byStatus: result.byStatus || [],
        growth: formattedGrowth
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SERVICE STATS ERROR]', error);
    console.error('[SERVICE STATS ERROR DETAILS]', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics: ' + error.message,
      code: 'SERVICE_STATS_ERROR',
      requestId
    });
  }
};
// In admin.controller.js - Add exportCategories function
const exportCategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'csv' } = req.query;

    console.log('[EXPORT CATEGORIES] Starting export, format:', format);

    // Get categories with minimal data
    const categories = await Category.find({ deletedAt: null })
      .populate('parentCategory', 'name slug')
      .populate('createdBy', 'name email')
      .select('-__v -lastUpdatedBy -deletedAt -deletedBy -version -metaDescription -metaTitle')
      .lean();

    console.log(`[EXPORT CATEGORIES] Found ${categories.length} categories`);

    if (format.toLowerCase() === 'csv') {
      // Prepare CSV headers
      const headers = [
        'ID', 'Name', 'Slug', 'Description', 'Parent Category', 
        'Level', 'Order', 'Active', 'Featured', 'Popular',
        'Icon', 'Color', 'Services Count', 'Gigs Count',
        'Subcategories Count', 'Created By', 'Created At', 'Updated At'
      ];

      // Prepare CSV rows
      const csvRows = categories.map(cat => [
        cat._id,
        `"${(cat.name || '').replace(/"/g, '""')}"`,
        cat.slug || '',
        `"${(cat.description || '').replace(/"/g, '""')}"`,
        cat.parentCategory?.name || '',
        cat.level || 0,
        cat.order || 0,
        cat.isActive ? 'Yes' : 'No',
        cat.featured ? 'Yes' : 'No',
        cat.popular ? 'Yes' : 'No',
        cat.icon || '',
        cat.color || '',
        cat.servicesCount || 0,
        cat.gigsCount || 0,
        cat.subcategories?.length || 0,
        cat.createdBy?.name || '',
        new Date(cat.createdAt).toISOString(),
        new Date(cat.updatedAt).toISOString()
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      console.log(`[EXPORT CATEGORIES] CSV content generated, ${categories.length} rows`);

      // Set proper CSV headers
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="categories_export_${Date.now()}.csv"`,
        'X-Request-ID': requestId,
        'X-Export-Records': categories.length.toString(),
        'X-Export-Timestamp': new Date().toISOString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      return res.send(csvContent);
    }

    // Default to JSON format
    console.log(`[EXPORT CATEGORIES] Returning JSON format, ${categories.length} categories`);
    
    res.json({
      success: true,
      format: 'json',
      count: categories.length,
      data: categories,
      exportedAt: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    console.error('[EXPORT CATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export categories',
      code: 'EXPORT_ERROR',
      requestId,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Add these functions to admin.controller.js

// Get Gigs (Admin)
const getGigs = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      category = '',
      minBudget = '',
      maxBudget = '',
      urgency = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Security: Build secure query
    const filter = { deletedAt: null };
    
    // Search filter
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { slug: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.projectCategory = category;
    }
    
    // Budget range filter
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = parseFloat(minBudget);
      if (maxBudget) filter.budget.$lte = parseFloat(maxBudget);
    }
    
    // Urgency filter
    if (urgency) {
      filter.urgency = urgency;
    }

    // Security: Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Security: Validate sort fields
    const allowedSortFields = ['title', 'budget', 'createdAt', 'updatedAt', 'deadline', 'urgency'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query with population
    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .populate('projectCategory', 'name slug icon')
        .populate('subcategory', 'name slug')
        .populate('createdBy', 'name email picture')
        .populate('assignedTo', 'name email picture')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Gig.countDocuments(filter)
    ]);

    // Security: Sanitize gig data
    const sanitizedGigs = gigs.map(gig => {
      const safeGig = { ...gig };
      
      // Remove sensitive data from populated users
      if (safeGig.createdBy) {
        delete safeGig.createdBy.email;
        delete safeGig.createdBy.phone;
        delete safeGig.createdBy.password;
      }
      
      if (safeGig.assignedTo) {
        delete safeGig.assignedTo.email;
        delete safeGig.assignedTo.phone;
        delete safeGig.assignedTo.password;
      }
      
      // Remove sensitive fields
      delete safeGig.__v;
      delete safeGig.lastUpdatedBy;
      delete safeGig.deletedAt;
      delete safeGig.deletedBy;
      delete safeGig.version;
      delete safeGig.communicationHistory;
      
      // Truncate long description for list view
      if (safeGig.description && safeGig.description.length > 100) {
        safeGig.description = safeGig.description.substring(0, 100) + '...';
      }
      
      return safeGig;
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: sanitizedGigs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET GIGS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gigs',
      code: 'GIGS_FETCH_ERROR',
      requestId
    });
  }
};

// In admin.controller.js - Update getGigById function
const getGigById = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;

    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_GIG_ID',
        requestId
      });
    }

    const gig = await Gig.findOne({ _id: id, deletedAt: null })
      .populate('projectCategory', 'name slug icon')
      .populate({
        path: 'subcategory',
        select: 'name slug description icon order category', // Added category field
        populate: {
          path: 'category',
          select: 'name slug'
        }
      })
      .populate('createdBy', 'name email picture')
      .populate('assignedTo', 'name email picture')
      .lean();

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    // Security: Remove sensitive data
    if (gig.createdBy) {
      delete gig.createdBy.email;
      delete gig.createdBy.phone;
      delete gig.createdBy.password;
    }
    
    if (gig.assignedTo) {
      delete gig.assignedTo.email;
      delete gig.assignedTo.phone;
      delete gig.assignedTo.password;
    }
    
    // Remove sensitive fields
    delete gig.__v;
    delete gig.lastUpdatedBy;
    delete gig.deletedAt;
    delete gig.deletedBy;
    delete gig.version;

    // Format dates
    ['createdAt', 'updatedAt', 'deadline'].forEach(dateField => {
      if (gig[dateField]) {
        gig[dateField] = new Date(gig[dateField]).toISOString();
      }
    });

    // Hide communication history if not needed
    if (!req.query.includeCommunication) {
      delete gig.communicationHistory;
    }

    res.json({
      success: true,
      data: gig,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET GIG BY ID ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gig',
      code: 'GIG_FETCH_ERROR',
      requestId
    });
  }
};

// Create Gig (Admin) - UPDATED VERSION
const createGig = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    console.log('[CREATE GIG] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[CREATE GIG] Admin ID:', req.admin._id);

    const gigData = {
      ...req.body,
      createdBy: req.admin._id,
      lastUpdatedBy: req.admin._id,
      version: 1
    };

    // Validate required fields
    if (!gigData.title || !gigData.projectCategory) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required',
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }

    // Validate category exists
    if (!mongoose.Types.ObjectId.isValid(gigData.projectCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    const category = await Category.findById(gigData.projectCategory);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Validate subcategory if provided
    if (gigData.subcategory) {
      if (!mongoose.Types.ObjectId.isValid(gigData.subcategory)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subcategory ID',
          code: 'INVALID_SUBCATEGORY_ID',
          requestId
        });
      }
      
      const subcategory = await Subcategory.findOne({
        _id: gigData.subcategory,
        category: gigData.projectCategory,
        isActive: true
      });
      
      if (!subcategory) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory not found or does not belong to selected category',
          code: 'SUBCATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    // FIX: Remove any client/createdBy validation since admin is creating it
    // The admin is the creator, so we don't need to validate a separate client
    
    // If client ID is provided in body, use it; otherwise use admin as creator
    if (gigData.clientId && mongoose.Types.ObjectId.isValid(gigData.clientId)) {
      // Validate client exists
      const client = await User.findById(gigData.clientId);
      if (!client) {
        return res.status(400).json({
          success: false,
          message: 'Client not found',
          code: 'CLIENT_NOT_FOUND',
          requestId
        });
      }
      gigData.createdBy = gigData.clientId;
    } else {
      // Admin is creating the gig on behalf of the system or themselves
      gigData.createdBy = req.admin._id;
    }

    // Remove any clientId field to avoid confusion
    delete gigData.clientId;

    console.log('[CREATE GIG] Final gig data:', JSON.stringify(gigData, null, 2));

    // Create gig with runValidators false to avoid user validation
    const gig = await Gig.create(gigData);

    // Populate for response
    const populatedGig = await Gig.findById(gig._id)
      .populate('projectCategory', 'name slug icon')
      .populate('subcategory', 'name slug icon description')
      .populate('createdBy', 'name email picture')
      .lean();

    // Security: Remove sensitive data
    if (populatedGig.createdBy) {
      delete populatedGig.createdBy.email;
      delete populatedGig.createdBy.phone;
      delete populatedGig.createdBy.password;
    }
    
    delete populatedGig.__v;
    delete populatedGig.lastUpdatedBy;
    delete populatedGig.deletedAt;
    delete populatedGig.deletedBy;
    delete populatedGig.version;
    delete populatedGig.communicationHistory;

    // Security: Log admin action
    await logAdminAction(req.admin._id, 'CREATE_GIG', `gig:${gig._id}`, {
      title: gig.title,
      category: gig.projectCategory,
      subcategory: gig.subcategory,
      budget: gig.budget,
      ip: req.ip
    });

    // Update category gig count
    await Category.findByIdAndUpdate(gig.projectCategory, {
      $inc: { gigsCount: 1 }
    });
    
    // Update subcategory gig count if exists
    if (gig.subcategory) {
      await Subcategory.findByIdAndUpdate(gig.subcategory, {
        $inc: { gigsCount: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Gig created successfully',
      data: populatedGig,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CREATE GIG ERROR]', error);
    console.error('[CREATE GIG ERROR DETAILS]', error.stack);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Gig with this title already exists',
        code: 'DUPLICATE_GIG',
        requestId
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('[CREATE GIG VALIDATION ERROR]', messages);
      console.error('[CREATE GIG VALIDATION ERROR DETAILS]', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create gig: ' + (error.message || 'Internal server error'),
      code: 'GIG_CREATE_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update updateGig function
const updateGig = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const updates = req.body;

    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_GIG_ID',
        requestId
      });
    }

    // Find existing gig
    const existingGig = await Gig.findById(id);
    if (!existingGig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    // Check for version conflict
    if (updates.version && updates.version !== existingGig.version) {
      return res.status(409).json({
        success: false,
        message: 'Gig was modified by another user. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
        currentVersion: existingGig.version,
        requestId
      });
    }

    // Prepare update data
    const updateData = {
      ...updates,
      lastUpdatedBy: req.admin._id,
      $inc: { version: 1 }
    };

    // Remove version from update data to avoid conflict
    delete updateData.version;

    // Validate category if changed
    if (updates.projectCategory && updates.projectCategory !== existingGig.projectCategory.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updates.projectCategory)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
          code: 'INVALID_CATEGORY_ID',
          requestId
        });
      }

      const category = await Category.findById(updates.projectCategory);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }

      // Update category counts
      await Category.findByIdAndUpdate(existingGig.projectCategory, {
        $inc: { gigsCount: -1 }
      });
      
      await Category.findByIdAndUpdate(updates.projectCategory, {
        $inc: { gigsCount: 1 }
      });
    }

    // Validate subcategory if changed - UPDATED FOR SUBCATEGORY MODEL
    if (updates.subcategory !== undefined) {
      if (updates.subcategory === null || updates.subcategory === '') {
        // Removing subcategory - decrement old subcategory count if exists
        if (existingGig.subcategory) {
          await Subcategory.findByIdAndUpdate(existingGig.subcategory, {
            $inc: { gigsCount: -1 }
          });
        }
      } else if (updates.subcategory !== existingGig.subcategory?.toString()) {
        // Changing to a new subcategory
        if (!mongoose.Types.ObjectId.isValid(updates.subcategory)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid subcategory ID',
            code: 'INVALID_SUBCATEGORY_ID',
            requestId
          });
        }
        
        // Check new subcategory exists and belongs to category
        const subcategory = await Subcategory.findOne({
          _id: updates.subcategory,
          category: updates.projectCategory || existingGig.projectCategory,
          isActive: true
        });
        
        if (!subcategory) {
          return res.status(400).json({
            success: false,
            message: 'Subcategory not found or does not belong to selected category',
            code: 'SUBCATEGORY_NOT_FOUND',
            requestId
          });
        }
        
        // Update subcategory counts
        if (existingGig.subcategory) {
          await Subcategory.findByIdAndUpdate(existingGig.subcategory, {
            $inc: { gigsCount: -1 }
          });
        }
        
        await Subcategory.findByIdAndUpdate(updates.subcategory, {
          $inc: { gigsCount: 1 }
        });
      }
    }

    // Update gig
    const gig = await Gig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('projectCategory', 'name slug icon')
    .populate('subcategory', 'name slug icon description') // Updated to Subcategory model
    .populate('createdBy', 'name email picture')
    .lean();

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Security: Remove sensitive data
    if (gig.createdBy) {
      delete gig.createdBy.email;
      delete gig.createdBy.phone;
      delete gig.createdBy.password;
    }
    
    delete gig.__v;
    delete gig.lastUpdatedBy;
    delete gig.deletedAt;
    delete gig.deletedBy;
    delete gig.version;
    delete gig.communicationHistory;

    // Security: Log admin action
    await logAdminAction(req.admin._id, 'UPDATE_GIG', `gig:${id}`, {
      updatedFields: Object.keys(updates),
      oldVersion: existingGig.version,
      newVersion: gig.version,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Gig updated successfully',
      data: gig,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[UPDATE GIG ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Gig with this title already exists',
        code: 'DUPLICATE_GIG',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update gig',
      code: 'GIG_UPDATE_ERROR',
      requestId
    });
  }
};

const deleteGig = async (req, res) => {
  const requestId = crypto.randomBytes(8).toString('hex');
  
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;
    
    console.log('[ADMIN DELETE GIG] Starting deletion:', {
      id,
      params: req.params,
      query: req.query,
      admin: req.admin?.email,
      ip: req.ip
    });
    
    // Fix the ID if it's [object Object]
    let gigId = id;
    
    // Handle [object Object] case
    if (id === '[object Object]' || id === 'undefined' || id === 'null') {
      console.log('[ADMIN DELETE GIG] Fixing ID...');
      
      // Try to get ID from body
      if (req.body && req.body.id) {
        gigId = req.body.id;
        console.log('[ADMIN DELETE GIG] Using ID from body:', gigId);
      } 
      // Try to get ID from query
      else if (req.query && req.query.id) {
        gigId = req.query.id;
        console.log('[ADMIN DELETE GIG] Using ID from query:', gigId);
      }
      // Try to parse from the string itself
      else {
        try {
          const decoded = decodeURIComponent(gigId);
          if (decoded.startsWith('{')) {
            const parsed = JSON.parse(decoded);
            gigId = parsed._id || parsed.id;
            console.log('[ADMIN DELETE GIG] Parsed ID from JSON:', gigId);
          }
        } catch (e) {
          console.error('[ADMIN DELETE GIG] Failed to parse ID:', e);
        }
      }
    }
    
    // Validate the ID
    if (!gigId || gigId === 'undefined' || gigId === 'null') {
      console.error('[ADMIN DELETE GIG] No valid ID found');
      return res.status(400).json({
        success: false,
        message: 'Gig ID is required',
        code: 'MISSING_GIG_ID',
        requestId
      });
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      console.error('[ADMIN DELETE GIG] Invalid MongoDB ID:', gigId);
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID format',
        code: 'INVALID_ID_FORMAT',
        requestId
      });
    }
    
    // Find the gig
    const gig = await Gig.findById(gigId);
    
    if (!gig) {
      console.error('[ADMIN DELETE GIG] Gig not found:', gigId);
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }
    
    if (gig.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Gig is already deleted',
        code: 'ALREADY_DELETED',
        requestId
      });
    }
    
    let result;
    const now = new Date();
    
    if (permanent === 'true') {
      // Permanent delete
      if (force !== 'true' && gig.status === 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete gig that is in progress',
          code: 'GIG_IN_PROGRESS',
          requestId
        });
      }
      
      // Delete from database
      result = await Gig.deleteOne({ _id: gigId });
      
      // Decrement category and subcategory counts if gig was open
      if (gig.status === 'open') {
        if (gig.projectCategory) {
          await Category.findByIdAndUpdate(gig.projectCategory, {
            $inc: { gigsCount: -1 }
          });
        }
        
        if (gig.subcategory) {
          await Subcategory.findByIdAndUpdate(gig.subcategory, {
            $inc: { gigsCount: -1 }
          });
        }
      }
      
      console.log('[ADMIN DELETE GIG] Permanent deletion successful:', gigId);
      
    } else {
      // Soft delete
      result = await Gig.findByIdAndUpdate(
        gigId,
        {
          isActive: false,
          deletedAt: now,
          deletedBy: req.admin._id,
          lastUpdatedBy: req.admin._id
        },
        { new: true }
      );
      
      // Decrement category and subcategory counts if gig was open
      if (gig.status === 'open') {
        if (gig.projectCategory) {
          await Category.findByIdAndUpdate(gig.projectCategory, {
            $inc: { gigsCount: -1 }
          });
        }
        
        if (gig.subcategory) {
          await Subcategory.findByIdAndUpdate(gig.subcategory, {
            $inc: { gigsCount: -1 }
          });
        }
      }
      
      console.log('[ADMIN DELETE GIG] Soft deletion successful:', gigId);
    }
    
    // Log admin action
    await logAdminAction(req.admin._id, 'DELETE_GIG', `gig:${gigId}`, {
      title: gig.title || 'Unknown',
      permanent: permanent === 'true',
      force: force === 'true',
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: permanent === 'true' ? 'Gig permanently deleted' : 'Gig deleted successfully',
      data: {
        _id: gig._id,
        title: gig.title || 'Unknown',
        slug: gig.slug,
        isActive: false,
        deletedAt: now
      },
      requestId,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('[ADMIN DELETE GIG ERROR]', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID format',
        code: 'INVALID_ID_FORMAT',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete gig',
      code: 'DELETE_GIG_ERROR',
      requestId
    });
  }
};
// Bulk Update Gigs
const bulkUpdateGigs = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { ids, operation, data = {} } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No gigs selected',
        code: 'NO_GIGS_SELECTED',
        requestId
      });
    }

    // Validate IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid gig IDs provided',
        code: 'INVALID_IDS',
        requestId
      });
    }

    let updateData = {};
    let message = 'Gigs updated successfully';

    switch (operation) {
      case 'activate':
        updateData = { 
          status: 'open',
          isActive: true 
        };
        message = 'Gigs activated successfully';
        break;
        
      case 'pause':
        updateData = { 
          status: 'closed',
          isActive: false 
        };
        message = 'Gigs closed successfully';
        break;
        
      case 'delete':
        updateData = { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.admin._id 
        };
        message = 'Gigs deleted successfully';
        break;
        
      case 'feature':
        updateData = { 
          featured: true 
        };
        message = 'Gigs featured successfully';
        break;
        
      case 'unfeature':
        updateData = { 
          featured: false 
        };
        message = 'Gigs unfeatured successfully';
        break;
        
      default:
        updateData = data;
    }

    updateData.lastUpdatedBy = req.admin._id;
    updateData.$inc = { version: 1 };

    // Perform bulk update
    const result = await Gig.updateMany(
      { _id: { $in: validIds } },
      { $set: updateData }
    );

    // Update category counts if needed
    if (operation === 'activate' || operation === 'pause' || operation === 'delete') {
      const gigs = await Gig.find({ _id: { $in: validIds } }, 'projectCategory status');
      
      const categoryUpdates = {};
      gigs.forEach(gig => {
        const catId = gig.projectCategory.toString();
        if (!categoryUpdates[catId]) {
          categoryUpdates[catId] = 0;
        }
        
        if (operation === 'activate' && gig.status !== 'open') {
          categoryUpdates[catId] += 1;
        } else if ((operation === 'pause' || operation === 'delete') && gig.status === 'open') {
          categoryUpdates[catId] -= 1;
        }
      });

      // Apply category updates
      for (const [catId, change] of Object.entries(categoryUpdates)) {
        if (change !== 0) {
          await Category.findByIdAndUpdate(catId, {
            $inc: { gigsCount: change }
          });
        }
      }
    }

    // Security: Log bulk action
    await logAdminAction(req.admin._id, `BULK_${operation.toUpperCase()}_GIGS`, 'gigs', {
      count: validIds.length,
      operation,
      ip: req.ip
    });

    res.json({
      success: true,
      message,
      modifiedCount: result.modifiedCount,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BULK UPDATE GIGS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      code: 'BULK_OPERATION_ERROR',
      requestId
    });
  }
};

// Export Gigs
// Export Gigs - FIXED VERSION
const exportGigs = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'json' } = req.query;
    
    console.log('[EXPORT GIGS] Request received:', {
      format,
      query: req.query,
      params: req.params,
      admin: req.admin?.email
    });

    // Get gigs with populated data
    const gigs = await Gig.find({ deletedAt: null })
      .populate('projectCategory', 'name slug')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .select('-__v -lastUpdatedBy -deletedAt -deletedBy -version -communicationHistory')
      .lean();

    console.log(`[EXPORT GIGS] Found ${gigs.length} gigs, format requested: ${format}`);

    // FIX: Check format properly (case-insensitive)
    const requestedFormat = (format || '').toString().toLowerCase().trim();
    
    if (requestedFormat === 'csv') {
      const headers = [
        'ID', 'Title', 'Slug', 'Description', 'Budget', 'Currency', 
        'Category', 'Subcategory', 'Status', 'Urgency', 'Visibility',
        'Client Name', 'Client Email', 'Assigned To', 'Created At', 
        'Updated At', 'Deadline', 'Bids Count', 'Skills Required', 
        'Deliverables', 'Timeline', 'Timeline Unit'
      ];

      const csvRows = gigs.map(gig => [
        gig._id,
        `"${(gig.title || '').replace(/"/g, '""')}"`,
        gig.slug || '',
        `"${(gig.description || '').replace(/"/g, '""')}"`,
        gig.budget || 0,
        gig.currency || 'USD',
        gig.projectCategory?.name || '',
        gig.subcategory?.name || '',
        gig.status || 'open',
        gig.urgency || 'medium',
        gig.visibility || 'public',
        gig.createdBy?.name || '',
        gig.createdBy?.email || '',
        gig.assignedTo?.name || '',
        new Date(gig.createdAt).toISOString(),
        new Date(gig.updatedAt).toISOString(),
        gig.deadline ? new Date(gig.deadline).toISOString() : '',
        gig.bids?.length || 0,
        `"${(gig.skillsRequired || []).join(', ').replace(/"/g, '""')}"`,
        `"${(gig.deliverables || []).join(', ').replace(/"/g, '""')}"`,
        gig.timeline || '',
        gig.timelineUnit || 'days'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Set proper headers
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="gigs_export_${Date.now()}.csv"`,
        'X-Request-ID': requestId,
        'X-Export-Records': gigs.length.toString(),
        'X-Export-Timestamp': new Date().toISOString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      console.log(`[EXPORT GIGS] Sending CSV response with ${gigs.length} records`);
      return res.send(csvContent);
    }

    // Default to JSON
    console.log(`[EXPORT GIGS] Sending JSON response with ${gigs.length} records`);
    
    res.set({
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Export-Records': gigs.length.toString()
    });
    
    res.json({
      success: true,
      format: 'json',
      count: gigs.length,
      data: gigs,
      exportedAt: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    console.error('[EXPORT GIGS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export gigs',
      code: 'EXPORT_ERROR',
      requestId
    });
  }
};

// Get Gig Statistics
// Get Gig Statistics - FIXED VERSION
const getGigStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const stats = await Gig.aggregate([
      { $match: { deletedAt: null } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalGigs: { $sum: 1 },
                openGigs: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                inProgressGigs: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                assignedGigs: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
                completedGigs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelledGigs: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                closedGigs: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                totalBudget: { $sum: { $ifNull: ['$budget', 0] } },
                avgBudget: { $avg: { $ifNull: ['$budget', 0] } },
                totalBids: {
                  $sum: {
                    $cond: [
                      { $isArray: '$bids' },
                      { $size: '$bids' },
                      0
                    ]
                  }
                },
                avgBidsPerGig: {
                  $avg: {
                    $cond: [
                      { $isArray: '$bids' },
                      { $size: '$bids' },
                      0
                    ]
                  }
                }
              }
            }
          ],
          byCategory: [
            { $match: { status: 'open' } },
            {
              $group: {
                _id: '$projectCategory',
                count: { $sum: 1 },
                avgBudget: { $avg: { $ifNull: ['$budget', 0] } },
                totalBids: {
                  $sum: {
                    $cond: [
                      { $isArray: '$bids' },
                      { $size: '$bids' },
                      0
                    ]
                  }
                },
                maxBudget: { $max: { $ifNull: ['$budget', 0] } },
                minBudget: { $min: { $ifNull: ['$budget', 0] } }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgBudget: { $avg: { $ifNull: ['$budget', 0] } }
              }
            },
            { $sort: { count: -1 } }
          ],
          byUrgency: [
            {
              $group: {
                _id: '$urgency',
                count: { $sum: 1 },
                avgBudget: { $avg: { $ifNull: ['$budget', 0] } }
              }
            },
            { $sort: { count: -1 } }
          ],
          budgetDistribution: [
            {
              $bucket: {
                groupBy: { $ifNull: ["$budget", 0] },
                boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, 100000],
                default: "100000+",
                output: {
                  count: { $sum: 1 },
                  avgBids: {
                    $avg: {
                      $cond: [
                        { $isArray: '$bids' },
                        { $size: '$bids' },
                        0
                      ]
                    }
                  }
                }
              }
            }
          ],
          monthlyGrowth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                totalBudget: { $sum: { $ifNull: ['$budget', 0] } }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    // Get top categories with names
    const byCategory = stats[0]?.byCategory || [];
    const categoryIds = byCategory.map(item => item._id).filter(id => id);
    
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('name slug')
      .lean();
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });
    
    // Replace category IDs with names
    const byCategoryWithNames = byCategory.map(item => ({
      ...item,
      category: categoryMap[item._id?.toString()] || { name: 'Unknown', slug: '' }
    }));

    res.json({
      success: true,
      data: {
        ...stats[0],
        byCategory: byCategoryWithNames
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GIG STATS ERROR]', error);
    console.error('[GIG STATS ERROR DETAILS]', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gig statistics',
      code: 'GIG_STATS_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getSubcategoriesDropdown = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { categoryId } = req.params;
    const { activeOnly = true } = req.query;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    // Build filter
    const filter = {
      category: categoryId,
      deletedAt: null
    };

    if (activeOnly === 'true' || activeOnly === true) {
      filter.isActive = true;
    }

    // Get subcategories
    const subcategories = await Subcategory.find(filter)
      .select('name slug description icon order servicesCount gigsCount')
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: subcategories,
      count: subcategories.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET SUBCATEGORIES DROPDOWN ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      code: 'SUBCATEGORIES_FETCH_ERROR',
      requestId
    });
  }
};
const getSubcategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      isActive = '',
      sortBy = 'order',
      sortOrder = 'asc'
    } = req.query;

    // Build filter
    const filter = { deletedAt: null };
    
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { slug: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }
    
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const allowedSortFields = ['name', 'order', 'createdAt', 'updatedAt', 'servicesCount', 'gigsCount'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'order';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [subcategories, total] = await Promise.all([
      Subcategory.find(filter)
        .populate('category', 'name slug')
        .populate('createdBy', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Subcategory.countDocuments(filter)
    ]);

    // Sanitize response
    const safeSubcategories = subcategories.map(sub => {
      const safeSub = { ...sub };
      delete safeSub.__v;
      delete safeSub.deletedAt;
      delete safeSub.deletedBy;
      delete safeSub.version;
      delete safeSub.lastUpdatedBy;
      if (safeSub.createdBy) {
        delete safeSub.createdBy.password;
        delete safeSub.createdBy.resetPasswordToken;
        delete safeSub.createdBy.resetPasswordExpires;
      }
      return safeSub;
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: safeSubcategories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET SUBCATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      code: 'SUBCATEGORIES_FETCH_ERROR',
      requestId
    });
  }
};

// Get Subcategory by ID (Admin)
const getSubcategoryById = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    const subcategory = await Subcategory.findOne({ _id: id, deletedAt: null })
      .populate('category', 'name slug description')
      .populate('createdBy', 'name email')
      .lean();

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Remove sensitive fields
    delete subcategory.__v;
    delete subcategory.deletedAt;
    delete subcategory.deletedBy;
    delete subcategory.version;
    delete subcategory.lastUpdatedBy;
    if (subcategory.createdBy) {
      delete subcategory.createdBy.password;
      delete subcategory.createdBy.resetPasswordToken;
      delete subcategory.createdBy.resetPasswordExpires;
    }

    res.json({
      success: true,
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET SUBCATEGORY BY ID ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategory',
      code: 'SUBCATEGORY_FETCH_ERROR',
      requestId
    });
  }
};

// Create Subcategory (Admin)
const createSubcategory = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const subcategoryData = {
      ...req.body,
      createdBy: req.admin._id,
      lastUpdatedBy: req.admin._id,
      version: 1
    };

    // Validate required fields
    if (!subcategoryData.name || !subcategoryData.category) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required',
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }

    // Validate category exists
    if (!mongoose.Types.ObjectId.isValid(subcategoryData.category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    const category = await Category.findById(subcategoryData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check for duplicate name in same category
    const existingSubcategory = await Subcategory.findOne({
      name: subcategoryData.name.trim(),
      category: subcategoryData.category,
      deletedAt: null
    });

    if (existingSubcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this name already exists in this category',
        code: 'DUPLICATE_SUBCATEGORY',
        requestId
      });
    }

    // Create subcategory
    const subcategory = await Subcategory.create(subcategoryData);

    // Populate for response
    const populatedSubcategory = await Subcategory.findById(subcategory._id)
      .populate('category', 'name slug')
      .lean();

    // Remove sensitive fields
    delete populatedSubcategory.__v;
    delete populatedSubcategory.deletedAt;
    delete populatedSubcategory.deletedBy;
    delete populatedSubcategory.version;
    delete populatedSubcategory.lastUpdatedBy;

    // Update category stats
    await Category.findByIdAndUpdate(subcategoryData.category, {
      $inc: { servicesCount: 0, gigsCount: 0 } // Initialize counts
    });

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: populatedSubcategory,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CREATE SUBCATEGORY ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this slug already exists',
        code: 'DUPLICATE_SLUG',
        requestId
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create subcategory',
      code: 'SUBCATEGORY_CREATE_ERROR',
      requestId
    });
  }
};

// Update Subcategory (Admin)
const updateSubcategory = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('[UPDATE SUBCATEGORY] Request:', { id, updates });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    // Find existing subcategory
    const existingSubcategory = await Subcategory.findById(id);
    if (!existingSubcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check for version conflict
    if (updates.version && updates.version !== existingSubcategory.version) {
      return res.status(409).json({
        success: false,
        message: 'Subcategory was modified by another user. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
        currentVersion: existingSubcategory.version,
        requestId
      });
    }

    // Prepare update data
    const updateData = {
      ...updates,
      lastUpdatedBy: req.admin._id,
      $inc: { version: 1 }
    };

    // Remove version from update data
    delete updateData.version;

    // If changing category, validate new category
    if (updates.category && updates.category !== existingSubcategory.category.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updates.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
          code: 'INVALID_CATEGORY_ID',
          requestId
        });
      }

      const newCategory = await Category.findById(updates.category);
      if (!newCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }

      // Check for duplicate name in new category
      const duplicate = await Subcategory.findOne({
        name: updates.name || existingSubcategory.name,
        category: updates.category,
        _id: { $ne: id },
        deletedAt: null
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory with this name already exists in the new category',
          code: 'DUPLICATE_IN_NEW_CATEGORY',
          requestId
        });
      }
    }

    // If changing name, check for duplicates in same category
    if (updates.name && updates.name !== existingSubcategory.name) {
      const duplicate = await Subcategory.findOne({
        name: updates.name,
        category: updates.category || existingSubcategory.category,
        _id: { $ne: id },
        deletedAt: null
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory with this name already exists',
          code: 'DUPLICATE_NAME',
          requestId
        });
      }
    }

    // Update subcategory
    const subcategory = await Subcategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('category', 'name slug')
    .lean();

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Remove sensitive fields
    delete subcategory.__v;
    delete subcategory.deletedAt;
    delete subcategory.deletedBy;
    delete subcategory.version;
    delete subcategory.lastUpdatedBy;

    res.json({
      success: true,
      message: 'Subcategory updated successfully',
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[UPDATE SUBCATEGORY ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this slug already exists',
        code: 'DUPLICATE_SLUG',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update subcategory',
      code: 'SUBCATEGORY_UPDATE_ERROR',
      requestId
    });
  }
};

// Delete Subcategory (Admin)
const deleteSubcategory = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    console.log('[DELETE SUBCATEGORY] Request:', { id, permanent, force });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    const subcategory = await Subcategory.findById(id);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    if (subcategory.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is already deleted',
        code: 'ALREADY_DELETED',
        requestId
      });
    }

    let result;
    const now = new Date();
    
    if (permanent === 'true') {
      // Check for dependencies if not forcing
      if (force !== 'true') {
        if (subcategory.servicesCount > 0 || subcategory.gigsCount > 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete subcategory with active services or gigs',
            code: 'DEPENDENCIES_EXIST',
            requestId
          });
        }
      }
      
      // Permanent delete
      result = await Subcategory.deleteOne({ _id: id });
      
      console.log('[DELETE SUBCATEGORY] Permanent deletion successful:', id);
      
    } else {
      // Soft delete
      result = await Subcategory.findByIdAndUpdate(
        id,
        {
          isActive: false,
          deletedAt: now,
          deletedBy: req.admin._id,
          lastUpdatedBy: req.admin._id
        },
        { new: true }
      );
      
      console.log('[DELETE SUBCATEGORY] Soft deletion successful:', id);
    }

    res.json({
      success: true,
      message: permanent === 'true' ? 'Subcategory permanently deleted' : 'Subcategory deleted successfully',
      data: {
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        isActive: false,
        deletedAt: now
      },
      requestId,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('[DELETE SUBCATEGORY ERROR]', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID format',
        code: 'INVALID_ID_FORMAT',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcategory',
      code: 'DELETE_SUBCATEGORY_ERROR',
      requestId
    });
  }
};

// Bulk Update Subcategories
const bulkUpdateSubcategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { ids, operation, data = {} } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No subcategories selected',
        code: 'NO_SUBCATEGORIES_SELECTED',
        requestId
      });
    }

    // Validate IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid subcategory IDs provided',
        code: 'INVALID_IDS',
        requestId
      });
    }

    let updateData = {};
    let message = 'Subcategories updated successfully';

    switch (operation) {
      case 'activate':
        updateData = { isActive: true };
        message = 'Subcategories activated successfully';
        break;
        
      case 'deactivate':
        updateData = { isActive: false };
        message = 'Subcategories deactivated successfully';
        break;
        
      default:
        updateData = data;
    }

    updateData.lastUpdatedBy = req.admin._id;
    updateData.$inc = { version: 1 };

    // Perform bulk update
    const result = await Subcategory.updateMany(
      { _id: { $in: validIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message,
      modifiedCount: result.modifiedCount,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BULK UPDATE SUBCATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      code: 'BULK_OPERATION_ERROR',
      requestId
    });
  }
};

// Get Subcategory Statistics
const getSubcategoryStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const stats = await Subcategory.aggregate([
      { $match: { deletedAt: null } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalSubcategories: { $sum: 1 },
                activeSubcategories: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
                totalServices: { $sum: '$servicesCount' },
                totalGigs: { $sum: '$gigsCount' },
                avgServices: { $avg: '$servicesCount' },
                avgGigs: { $avg: '$gigsCount' }
              }
            }
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalServices: { $sum: '$servicesCount' },
                totalGigs: { $sum: '$gigsCount' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          growth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    // Get category names for byCategory
    const byCategory = stats[0]?.byCategory || [];
    const categoryIds = byCategory.map(item => item._id).filter(id => id);
    
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('name slug')
      .lean();
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });
    
    const byCategoryWithNames = byCategory.map(item => ({
      ...item,
      category: categoryMap[item._id?.toString()] || { name: 'Unknown', slug: '' }
    }));

    res.json({
      success: true,
      data: {
        ...stats[0],
        byCategory: byCategoryWithNames
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SUBCATEGORY STATS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategory statistics',
      code: 'SUBCATEGORY_STATS_ERROR',
      requestId
    });
  }
};

// Export Subcategories
const exportSubcategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'json' } = req.query;

    // Get subcategories with populated data
    const subcategories = await Subcategory.find({ deletedAt: null })
      .populate('category', 'name slug')
      .populate('createdBy', 'name email')
      .select('-__v -lastUpdatedBy -deletedAt -deletedBy -version')
      .lean();

    if (format === 'csv') {
      const headers = [
        'ID', 'Name', 'Slug', 'Description', 'Category', 
        'Order', 'Active', 'Services Count', 'Gigs Count',
        'Created At', 'Updated At'
      ];

      const csvRows = subcategories.map(sub => [
        sub._id,
        `"${(sub.name || '').replace(/"/g, '""')}"`,
        sub.slug || '',
        `"${(sub.description || '').replace(/"/g, '""')}"`,
        sub.category?.name || '',
        sub.order || 0,
        sub.isActive ? 'Yes' : 'No',
        sub.servicesCount || 0,
        sub.gigsCount || 0,
        new Date(sub.createdAt).toISOString(),
        new Date(sub.updatedAt).toISOString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="subcategories_export_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', subcategories.length);
      res.header('X-Export-Timestamp', new Date().toISOString());
      
      return res.send(csvContent);
    }

    res.json({
      success: true,
      format: 'json',
      count: subcategories.length,
      data: subcategories,
      exportedAt: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    console.error('[EXPORT SUBCATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subcategories',
      code: 'EXPORT_ERROR',
      requestId
    });
  }
};
const getRecentActivity = async (req, res) => {
  const requestId = uuidv4();

  try {
    const { limit = 15, days = 30 } = req.query;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Safety cap
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Base filter for "recent" and not deleted
    const baseFilter = {
      deletedAt: null,
      createdAt: { $gte: cutoffDate }
    };

    // Run all queries in parallel with Promise.allSettled for resilience
    const [usersResult, servicesResult, gigsResult] = await Promise.allSettled([
      User.find({ ...baseFilter })
        .select('name email picture role createdAt lastLoginAt isActive')
        .sort({ createdAt: -1 })
        .limit(limitNum * 2) // Oversample to allow balanced final selection
        .lean(),

      Service.find({ ...baseFilter })
        .select('title slug category createdBy createdAt status')
        .populate('createdBy', 'name email picture')
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limitNum * 2)
        .lean(),

      Gig.find({ ...baseFilter })
        .select('title slug projectCategory createdBy createdAt status budget')
        .populate('createdBy', 'name email picture')
        .populate('projectCategory', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limitNum * 2)
        .lean()
    ]);

    // Extract successful results
    const recentUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
    const recentServices = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
    const recentGigs = gigsResult.status === 'fulfilled' ? gigsResult.value : [];

    // Build unified activity entries
    const activities = [];

    recentUsers.forEach(user => {
      activities.push({
        id: user._id,
        type: 'USER_REGISTRATION',
        action: 'registered',
        title: 'New User Joined',
        description: `${user.name || 'A user'} joined the platform`,
        actor: {
          id: user._id,
          name: user.name || 'Unknown',
          email: user.email,
          picture: user.picture || null,
          role: user.role || 'user'
        },
        target: null,
        metadata: {
          isActive: user.isActive,
          neverLoggedIn: !user.lastLoginAt
        },
        timestamp: user.createdAt,
        isoTimestamp: new Date(user.createdAt).toISOString()
      });
    });

    recentServices.forEach(service => {
      activities.push({
        id: service._id,
        type: 'SERVICE_CREATED',
        action: 'created service',
        title: 'New Service Published',
        description: `${service.createdBy?.name || 'Someone'} published "${service.title}"`,
        actor: {
          id: service.createdBy?._id,
          name: service.createdBy?.name || 'Unknown',
          email: service.createdBy?.email,
          picture: service.createdBy?.picture || null
        },
        target: {
          id: service._id,
          title: service.title,
          slug: service.slug,
          category: service.category?.name || 'Uncategorized'
        },
        metadata: {
          status: service.status || 'active'
        },
        timestamp: service.createdAt,
        isoTimestamp: new Date(service.createdAt).toISOString()
      });
    });

    recentGigs.forEach(gig => {
      activities.push({
        id: gig._id,
        type: 'GIG_POSTED',
        action: 'posted gig',
        title: 'New Gig Posted',
        description: `${gig.createdBy?.name || 'Someone'} posted "${gig.title}" (Budget: $${gig.budget || 'N/A'})`,
        actor: {
          id: gig.createdBy?._id,
          name: gig.createdBy?.name || 'Unknown',
          email: gig.createdBy?.email,
          picture: gig.createdBy?.picture || null
        },
        target: {
          id: gig._id,
          title: gig.title,
          slug: gig.slug,
          category: gig.projectCategory?.name || 'Uncategorized',
          budget: gig.budget
        },
        metadata: {
          status: gig.status || 'open'
        },
        timestamp: gig.createdAt,
        isoTimestamp: new Date(gig.createdAt).toISOString()
      });
    });

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply final limit
    const finalActivities = activities.slice(0, limitNum);

    res.json({
      success: true,
      data: finalActivities,
      count: finalActivities.length,
      filters: {
        days: parseInt(days),
        limit: limitNum
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET RECENT ACTIVITY ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      code: 'ACTIVITY_FETCH_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  createUser,
  getCategories,
  updateUser,
  deleteUser,
  exportUsers,
  getServiceStats,
  getGigs,
  getGigById,
  createGig,
  updateGig,
  deleteGig,
  bulkUpdateGigs,
  exportGigs,
  getGigStats,
  getSystemHealthHandler, 
  logAdminAction ,
  getSubcategoriesDropdown,
   getSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  bulkUpdateSubcategories,
  getSubcategoryStats,
  exportSubcategories,
  bulkUpdateUsers,
  exportCategories,
  getRecentActivity,
  checkAdminSession,adminLogout,fakeDelay,getAdminPermissions,
  getUserById 
};