// admin.controller.js 
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
const cache = require('../utils/cache.js'); // Import cache utility

// Cache helper functions (similar to category controller)
const generateRequestId = () => crypto.randomUUID();

const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

// Cache invalidation functions
const invalidateAdminCache = async (type = 'all') => {
  try {
    switch(type) {
      case 'users':
        await cache.del('admin:users:*');
        await cache.del('admin:user:*');
        await cache.del('admin:stats:users:*');
        break;
      case 'gigs':
        await cache.del('admin:gigs:*');
        await cache.del('admin:gig:*');
        await cache.del('admin:stats:gigs:*');
        break;
      case 'services':
        await cache.del('admin:services:*');
        await cache.del('admin:service:*');
        await cache.del('admin:stats:services:*');
        break;
      case 'subcategories':
        await cache.del('admin:subcategories:*');
        await cache.del('admin:subcategory:*');
        await cache.del('admin:stats:subcategories:*');
        break;
      case 'dashboard':
        await cache.del('admin:dashboard:*');
        await cache.del('admin:stats:*');
        await cache.del('admin:activity:*');
        break;
      case 'all':
      default:
        await cache.del('admin:*');
        break;
    }
    console.log(`Admin cache invalidated for: ${type}`);
  } catch (err) {
    console.warn('Error invalidating admin cache:', err.message);
  }
};

const invalidateSpecificCache = async (resource, id) => {
  try {
    await cache.del(`admin:${resource}:single:*${id}*`);
    await cache.del(`admin:${resource}:*${id}*`);
    console.log(`Cache invalidated for ${resource}: ${id}`);
  } catch (err) {
    console.warn('Error invalidating specific admin cache:', err.message);
  }
};

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
  const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  filter.$or = [
    { name: { $regex: sanitizedSearch, $options: 'i' } },
    { description: { $regex: sanitizedSearch, $options: 'i' } },
    { slug: { $regex: sanitizedSearch, $options: 'i' } }
  ];
}

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Generate cache key
    const cacheKey = generateCacheKey('admin:categories', {
      filter: JSON.stringify(filter),
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      skip
    });

    // Try to get from cache
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache HIT admin:categories:', cacheKey);
      return res.json({
        ...cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Get categories from DB
    const categories = await Category.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    // Get total count
    const total = await Category.countDocuments(filter);

    const result = {
      success: true,
      data: categories,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };

    // Cache the result
    await cache.set(cacheKey, result, 300); // 5 minutes cache

    res.json(result);
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

    // Invalidate cache
    await invalidateAdminCache('users');

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
    
    // Generate cache key for dashboard stats
    const cacheKey = generateCacheKey('admin:dashboard:stats', {
      timestamp: Math.floor(Date.now() / 60000) // Cache per minute
    });

    // Try to get from cache
    const cachedStats = await cache.get(cacheKey);
    if (cachedStats) {
      console.log('Cache HIT admin:dashboard:stats');
      return res.json({
        ...cachedStats,
        cached: true,
        requestId,
        executionTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Run all aggregation queries in parallel for maximum performance
    const [
      userStats,
      categoryStats,
      subcategoryStats,
      serviceStats,
      gigStats,
      userGrowth,
      platformMetrics
    ] = await Promise.all([
      // 1. User Statistics (enhanced with role breakdown - REMOVED SELLERS)
      User.aggregate([
        {
          $facet: {
            totals: [
              { $match: { deletedAt: null } },
              {
                $group: {
                  _id: null,
                  totalUsers: { $sum: 1 },
                  activeUsers: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
                  verifiedUsers: { $sum: { $cond: [{ $eq: ["$emailVerified", true] }, 1, 0] } },
                  pendingUsers: { 
                    $sum: { 
                      $cond: [{ $eq: ["$registrationStatus", "pending"] }, 1, 0] 
                    } 
                  },
                  // User role breakdown - ONLY ADMINS REMAIN
                  adminCount: { 
                    $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } 
                  },
                  // New users in last 7 days
                  newUsers7d: {
                    $sum: {
                      $cond: [
                        { 
                          $gte: [
                            "$createdAt",
                            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ],
            // Daily signups for the last 30 days
            dailySignups: [
              { 
                $match: { 
                  createdAt: { 
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  } 
                } 
              },
              {
                $group: {
                  _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { "_id.date": 1 } },
              { $limit: 30 }
            ],
            // User geography
            byCountry: [
              { $match: { country: { $exists: true, $ne: "" } } },
              { $group: { _id: "$country", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]),
      
      // 2. Category Statistics (enhanced)
      Category.aggregate([
        { $match: { deletedAt: null } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalCategories: { $sum: 1 },
                  activeCategories: { 
                    $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } 
                  },
                  featuredCategories: { 
                    $sum: { $cond: [{ $eq: ["$featured", true] }, 1, 0] } 
                  },
                  popularCategories: { 
                    $sum: { $cond: [{ $eq: ["$popular", true] }, 1, 0] } 
                  },
                  // Top categories by content
                  totalServices: { $sum: { $ifNull: ["$servicesCount", 0] } },
                  totalGigs: { $sum: { $ifNull: ["$gigsCount", 0] } }
                }
              }
            ],
            topByServices: [
              { $sort: { servicesCount: -1 } },
              { $limit: 5 },
              { $project: { name: 1, servicesCount: 1, gigsCount: 1, featured: 1 } }
            ],
            topByGigs: [
              { $sort: { gigsCount: -1 } },
              { $limit: 5 },
              { $project: { name: 1, gigsCount: 1, servicesCount: 1 } }
            ]
          }
        }
      ]),
      
      // 3. Subcategory Statistics (enhanced)
      Subcategory.aggregate([
        { $match: { deletedAt: null } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalSubcategories: { $sum: 1 },
                  activeSubcategories: { 
                    $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } 
                  },
                  totalServices: { $sum: { $ifNull: ["$servicesCount", 0] } },
                  totalGigs: { $sum: { $ifNull: ["$gigsCount", 0] } }
                }
              }
            ],
            topByServices: [
              { $sort: { servicesCount: -1 } },
              { $limit: 10 },
              { $project: { name: 1, servicesCount: 1, category: 1 } }
            ],
            byCategory: [
              {
                $group: {
                  _id: "$category",
                  count: { $sum: 1 },
                  totalServices: { $sum: "$servicesCount" },
                  totalGigs: { $sum: "$gigsCount" }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]),
      
      // 4. Service Statistics (REMOVED FINANCIAL METRICS)
      Service.aggregate([
        { $match: { deletedAt: null } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalServices: { $sum: 1 },
                  activeServices: { 
                    $sum: { 
                      $cond: [
                        { $in: ["$status", ["active", "published"]] },
                        1,
                        0
                      ]
                    } 
                  },
                  draftServices: { 
                    $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } 
                  },
                  pendingServices: { 
                    $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } 
                  },
                  suspendedServices: { 
                    $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] } 
                  },
                  featuredServices: { 
                    $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] } 
                  },
                  recommendedServices: { 
                    $sum: { $cond: [{ $eq: ["$isRecommended", true] }, 1, 0] } 
                  },
                  // Performance metrics (NO REVENUE)
                  avgPrice: { $avg: { $ifNull: ["$price", 0] } },
                  minPrice: { $min: { $ifNull: ["$price", 0] } },
                  maxPrice: { $max: { $ifNull: ["$price", 0] } },
                  avgDeliveryTime: { $avg: { $ifNull: ["$deliveryTime", 0] } },
                  avgRating: { $avg: { $ifNull: ["$rating", 0] } },
                  totalViews: { $sum: { $ifNull: ["$views", 0] } },
                  totalLikes: { $sum: { $ifNull: ["$likes", 0] } }
                }
              }
            ],
            // Growth over time (NO REVENUE)
            growth: [
              { 
                $match: { 
                  createdAt: { 
                    $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                  } 
                } 
              },
              {
                $group: {
                  _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    week: { $week: "$createdAt" }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 } },
              { $limit: 12 }
            ],
            // Status breakdown (NO REVENUE)
            byStatus: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                  avgPrice: { $avg: { $ifNull: ["$price", 0] } }
                }
              },
              { $sort: { count: -1 } }
            ],
            // Top performing services (NO REVENUE)
            topPerforming: [
              { $match: { status: "active" } },
              { 
                $addFields: { 
                  performanceScore: { 
                    $multiply: [
                      { $ifNull: ["$rating", 0] },
                      { $ifNull: ["$views", 1] }
                    ]
                  }
                } 
              },
              { $sort: { performanceScore: -1 } },
              { $limit: 10 },
              { 
                $project: { 
                  title: 1, 
                  price: 1, 
                  rating: 1, 
                  views: 1,
                  createdBy: 1,
                  category: 1,
                  performanceScore: 1
                } 
              }
            ]
          }
        }
      ]),
      
      // 5. Gig Statistics (REMOVED BUDGET, BIDS, AND FINANCIAL METRICS)
      Gig.aggregate([
        { $match: { deletedAt: null } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalGigs: { $sum: 1 },
                  openGigs: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
                  inProgressGigs: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
                  assignedGigs: { $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] } },
                  completedGigs: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                  cancelledGigs: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                  // Timeline metrics (NO BUDGET)
                  avgTimeline: { $avg: { $ifNull: ["$timeline", 0] } }
                }
              }
            ],
            // Urgency breakdown (NO BUDGET, NO BIDS)
            byUrgency: [
              {
                $group: {
                  _id: "$urgency",
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } }
            ],
            // Growth over time (NO BUDGET)
            growth: [
              { 
                $match: { 
                  createdAt: { 
                    $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                  } 
                } 
              },
              {
                $group: {
                  _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { "_id.year": 1, "_id.month": 1 } },
              { $limit: 12 }
            ]
          }
        }
      ]),
      
      // 6. User Growth Timeline (last 12 months)
      User.aggregate([
        { 
          $match: { 
            createdAt: { 
              $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
            } 
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            newUsers: { $sum: 1 },
            verifiedUsers: { 
              $sum: { $cond: [{ $eq: ["$emailVerified", true] }, 1, 0] } 
            },
            activeUsers: { 
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } 
            }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 12 }
      ]),
      
      // 7. Platform Performance Metrics
      Promise.all([
        // Active users in last 30 days
        User.countDocuments({
          lastSeenAt: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          isActive: true
        }),
        // Services created in last 30 days
        Service.countDocuments({
          createdAt: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }),
        // Gigs created in last 30 days
        Gig.countDocuments({
          createdAt: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }),
        // Average rating across services
        Service.aggregate([
          { $match: { rating: { $exists: true, $ne: null } } },
          { $group: { _id: null, avgRating: { $avg: "$rating" } } }
        ])
      ])
    ]);

    // Process and format the results
    const stats = {
      overview: {
        // User statistics
        users: {
          total: userStats[0]?.totals[0]?.totalUsers || 0,
          active: userStats[0]?.totals[0]?.activeUsers || 0,
          verified: userStats[0]?.totals[0]?.verifiedUsers || 0,
          pending: userStats[0]?.totals[0]?.pendingUsers || 0,
          newLast7d: userStats[0]?.totals[0]?.newUsers7d || 0,
          roles: {
            admins: userStats[0]?.totals[0]?.adminCount || 0,
            // Removed sellers count
            sellers: 0
          }
        },
        
        // Content statistics
        categories: {
          total: categoryStats[0]?.totals[0]?.totalCategories || 0,
          active: categoryStats[0]?.totals[0]?.activeCategories || 0,
          featured: categoryStats[0]?.totals[0]?.featuredCategories || 0,
          popular: categoryStats[0]?.totals[0]?.popularCategories || 0
        },
        
        subcategories: {
          total: subcategoryStats[0]?.totals[0]?.totalSubcategories || 0,
          active: subcategoryStats[0]?.totals[0]?.activeSubcategories || 0
        },
        
        services: {
          total: serviceStats[0]?.totals[0]?.totalServices || 0,
          active: serviceStats[0]?.totals[0]?.activeServices || 0,
          draft: serviceStats[0]?.totals[0]?.draftServices || 0,
          pending: serviceStats[0]?.totals[0]?.pendingServices || 0,
          suspended: serviceStats[0]?.totals[0]?.suspendedServices || 0,
          featured: serviceStats[0]?.totals[0]?.featuredServices || 0,
          recommended: serviceStats[0]?.totals[0]?.recommendedServices || 0
        },
        
        gigs: {
          total: gigStats[0]?.totals[0]?.totalGigs || 0,
          open: gigStats[0]?.totals[0]?.openGigs || 0,
          inProgress: gigStats[0]?.totals[0]?.inProgressGigs || 0,
          assigned: gigStats[0]?.totals[0]?.assignedGigs || 0,
          completed: gigStats[0]?.totals[0]?.completedGigs || 0,
          cancelled: gigStats[0]?.totals[0]?.cancelledGigs || 0
        }
      },
      
      // Financial metrics section removed entirely
      // performance: {
      //   services: {
      //     avgDeliveryTime: Math.round(serviceStats[0]?.totals[0]?.avgDeliveryTime || 0),
      //     avgRating: parseFloat((serviceStats[0]?.totals[0]?.avgRating || 0).toFixed(2)),
      //     totalViews: serviceStats[0]?.totals[0]?.totalViews || 0,
      //     totalLikes: serviceStats[0]?.totals[0]?.totalLikes || 0
      //   },
      //   gigs: {
      //     avgTimeline: Math.round(gigStats[0]?.totals[0]?.avgTimeline || 0),
      //     // Removed bids-related metrics
      //   },
      //   platform: {
      //     activeUsers30d: platformMetrics[0] || 0,
      //     newServices30d: platformMetrics[1] || 0,
      //     newGigs30d: platformMetrics[2] || 0,
      //     avgServiceRating: parseFloat((platformMetrics[3]?.[0]?.avgRating || 0).toFixed(2))
      //   }
      // },
      
      // Performance metrics (without financial data)
      performance: {
        services: {
          avgDeliveryTime: Math.round(serviceStats[0]?.totals[0]?.avgDeliveryTime || 0),
          avgRating: parseFloat((serviceStats[0]?.totals[0]?.avgRating || 0).toFixed(2)),
          totalViews: serviceStats[0]?.totals[0]?.totalViews || 0,
          totalLikes: serviceStats[0]?.totals[0]?.totalLikes || 0,
          // Service price metrics (without revenue)
          avgPrice: Math.round(serviceStats[0]?.totals[0]?.avgPrice || 0),
          minPrice: serviceStats[0]?.totals[0]?.minPrice || 0,
          maxPrice: serviceStats[0]?.totals[0]?.maxPrice || 0
        },
        gigs: {
          avgTimeline: Math.round(gigStats[0]?.totals[0]?.avgTimeline || 0)
          // Removed totalBids and avgBidsPerGig
        },
        platform: {
          activeUsers30d: platformMetrics[0] || 0,
          newServices30d: platformMetrics[1] || 0,
          newGigs30d: platformMetrics[2] || 0,
          avgServiceRating: parseFloat((platformMetrics[3]?.[0]?.avgRating || 0).toFixed(2))
        }
      },
      
      // Top lists and insights
      insights: {
        topCategoriesByServices: categoryStats[0]?.topByServices || [],
        topCategoriesByGigs: categoryStats[0]?.topByGigs || [],
        topSubcategoriesByServices: subcategoryStats[0]?.topByServices || [],
        topPerformingServices: serviceStats[0]?.topPerforming || [],
        serviceStatusBreakdown: serviceStats[0]?.byStatus || [],
        gigUrgencyBreakdown: gigStats[0]?.byUrgency || [],
        // Removed gigBudgetDistribution
        gigBudgetDistribution: [] // Empty array since we removed budget distribution
      },
      
      // Growth trends
      trends: {
        userGrowth: userGrowth.map(item => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          newUsers: item.newUsers,
          verifiedUsers: item.verifiedUsers,
          activeUsers: item.activeUsers
        })),
        serviceGrowth: serviceStats[0]?.growth?.map(item => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${item._id.week}`,
          count: item.count
          // Removed revenue
        })) || [],
        gigGrowth: gigStats[0]?.growth?.map(item => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          count: item.count
          // Removed totalBudget
        })) || [],
        dailySignups: userStats[0]?.dailySignups?.map(item => ({
          date: item._id.date,
          count: item.count
        })) || []
      },
      
      // Geography
      geography: {
        usersByCountry: userStats[0]?.byCountry || []
      },
      
      // Calculated metrics (updated to remove financial calculations)
      calculated: {
        conversionRate: userStats[0]?.totals[0]?.totalUsers > 0 
          ? parseFloat(((userStats[0]?.totals[0]?.verifiedUsers / userStats[0]?.totals[0]?.totalUsers) * 100).toFixed(2))
          : 0,
        
        serviceCompletionRate: serviceStats[0]?.totals[0]?.totalServices > 0
          ? parseFloat(((serviceStats[0]?.totals[0]?.activeServices / serviceStats[0]?.totals[0]?.totalServices) * 100).toFixed(2))
          : 0,
        
        gigCompletionRate: gigStats[0]?.totals[0]?.totalGigs > 0
          ? parseFloat(((gigStats[0]?.totals[0]?.completedGigs / gigStats[0]?.totals[0]?.totalGigs) * 100).toFixed(2))
          : 0,
        
        contentDensity: categoryStats[0]?.totals[0]?.totalCategories > 0
          ? parseFloat(((serviceStats[0]?.totals[0]?.totalServices + gigStats[0]?.totals[0]?.totalGigs) / categoryStats[0]?.totals[0]?.totalCategories).toFixed(2))
          : 0
      }
    };

    // Add recent activity (limit to 10 most recent items)
    const recentActivity = await Promise.all([
      // Recent users
      User.find({ deletedAt: null })
        .select('name email role picture createdAt lastLoginAt isActive')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      
      // Recent services
      Service.find({ deletedAt: null })
        .select('title slug category createdBy createdAt status price')
        .populate('createdBy', 'name email picture')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // Recent gigs
      Gig.find({ deletedAt: null })
        .select('title slug projectCategory createdBy createdAt status')
        .populate('createdBy', 'name email picture')
        .populate('projectCategory', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Format recent activity
    stats.recentActivity = [
      ...recentActivity[0].map(user => ({
        id: user._id,
        type: 'USER',
        action: 'joined',
        title: `${user.name || 'User'} joined`,
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: user.role
        },
        timestamp: user.createdAt,
        status: user.isActive ? 'active' : 'inactive'
      })),
      ...recentActivity[1].map(service => ({
        id: service._id,
        type: 'SERVICE',
        action: service.status === 'active' ? 'published' : 'created',
        title: `Service: ${service.title}`,
        user: service.createdBy ? {
          name: service.createdBy.name,
          email: service.createdBy.email,
          picture: service.createdBy.picture
        } : null,
        details: {
          price: service.price,
          category: service.category?.name
        },
        timestamp: service.createdAt,
        status: service.status
      })),
      ...recentActivity[2].map(gig => ({
        id: gig._id,
        type: 'GIG',
        action: gig.status === 'open' ? 'posted' : 'updated',
        title: `Gig: ${gig.title}`,
        user: gig.createdBy ? {
          name: gig.createdBy.name,
          email: gig.createdBy.email,
          picture: gig.createdBy.picture
        } : null,
        details: {
          // Removed budget from details
          category: gig.projectCategory?.name
        },
        timestamp: gig.createdAt,
        status: gig.status
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, 15); // Keep only 15 most recent

    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`[DASHBOARD STATS] Completed in ${executionTime}ms for request: ${requestId}`);
    console.log(`[DASHBOARD STATS] Results:`, {
      users: stats.overview.users.total,
      categories: stats.overview.categories.total,
      subcategories: stats.overview.subcategories.total,
      services: stats.overview.services.total,
      gigs: stats.overview.gigs.total
    });

    // Prepare the final response
    const response = {
      success: true,
      data: stats,
      meta: {
        requestId,
        executionTime: `${executionTime}ms`,
        cacheExpiry: '5 minutes',
        dataSource: 'aggregated',
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // Cache for 5 minutes

    // Log the aggregation for monitoring
    await logAdminAction(req.admin._id, 'VIEW_DASHBOARD_STATS', 'dashboard', {
      executionTime,
      cacheKey,
      userCount: stats.overview.users.total,
      serviceCount: stats.overview.services.total,
      gigCount: stats.overview.gigs.total
    });

    res.json(response);

  } catch (error) {
    console.error('[DASHBOARD STATS ERROR]', error);
    console.error('[DASHBOARD STATS ERROR DETAILS]', error.stack);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Return graceful fallback with minimal essential stats
    try {
      const fallbackStats = await getFallbackStats();
      
      res.status(200).json({
        success: true,
        message: 'Dashboard statistics loaded with fallback method due to aggregation complexity',
        code: 'DASHBOARD_FALLBACK_ACTIVATED',
        data: fallbackStats,
        meta: {
          requestId,
          executionTime: `${executionTime}ms`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          note: 'Aggregation failed, using fallback counts'
        }
      });
    } catch (fallbackError) {
      console.error('[DASHBOARD STATS FALLBACK ERROR]', fallbackError);
      
      res.status(200).json({
        success: true,
        message: 'Dashboard statistics unavailable',
        code: 'DASHBOARD_UNAVAILABLE',
        data: getMinimalStats(),
        meta: {
          requestId,
          executionTime: `${executionTime}ms`,
          error: 'All data fetching methods failed'
        }
      });
    }
  }
};

// Helper function for fallback statistics
async function getFallbackStats() {
  const [
    totalUsers,
    activeUsers,
    totalCategories,
    totalSubcategories,
    totalServices,
    activeServices,
    totalGigs,
    openGigs
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, isActive: true }),
    Category.countDocuments({ deletedAt: null }),
    Subcategory.countDocuments({ deletedAt: null }),
    Service.countDocuments({ deletedAt: null }),
    Service.countDocuments({ deletedAt: null, status: 'active' }),
    Gig.countDocuments({ deletedAt: null }),
    Gig.countDocuments({ deletedAt: null, status: 'open' })
  ]);

  return {
    overview: {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      categories: {
        total: totalCategories
      },
      subcategories: {
        total: totalSubcategories
      },
      services: {
        total: totalServices,
        active: activeServices
      },
      gigs: {
        total: totalGigs,
        open: openGigs
      }
    },
    performance: {
      services: {
        avgRating: 0
      },
      platform: {
        activeUsers30d: activeUsers
      }
    },
    insights: [],
    trends: [],
    recentActivity: [],
    calculated: {
      conversionRate: 0,
      serviceCompletionRate: 0,
      gigCompletionRate: 0
    }
  };
}

// Minimal stats when everything fails
function getMinimalStats() {
  return {
    overview: {
      users: { total: 0, active: 0 },
      categories: { total: 0 },
      subcategories: { total: 0 },
      services: { total: 0, active: 0 },
      gigs: { total: 0, open: 0 }
    },
    performance: {
      services: { avgRating: 0 },
      platform: { activeUsers30d: 0 }
    },
    insights: [],
    trends: [],
    recentActivity: [],
    calculated: {
      conversionRate: 0,
      serviceCompletionRate: 0,
      gigCompletionRate: 0
    }
  };
}

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
      accountType = '',
      cache: useCacheParam = 'false'
    } = req.query;

    // Build secure query filter
    const filter = { deletedAt: null };
    
    // Search filter - FIXED: Use regex search instead of $text
    if (search && search.trim()) {
      const sanitizedSearch = validator.escape(search.trim());
      
      // Create regex patterns for case-insensitive search
      const searchRegex = new RegExp(sanitizedSearch, 'i');
      
      // Search across multiple fields
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { role: searchRegex },
        { accountType: searchRegex },
        { country: searchRegex },
        { city: searchRegex },
        { occupation: searchRegex }
      ];
      
      console.log(`[ADMIN GET USERS] Searching for: "${sanitizedSearch}"`);
    }
    
    // Role filter
    if (role && ['user', 'admin', 'seller', 'buyer', 'moderator'].includes(role)) {
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

    // Generate cache key
    const cacheKey = generateCacheKey('admin:users', {
      filter: JSON.stringify(filter),
      page: pageNum,
      limit: limitNum,
      sort,
      skip
    });

    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log('Cache HIT admin:users:', cacheKey);
        return res.json({
          ...cachedResult,
          cached: true,
          requestId,
          timestamp: new Date().toISOString(),
          executionTime: `${Date.now() - startTime}ms`
        });
      }
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

    // Log the filter for debugging
    console.log(`[ADMIN GET USERS] Filter:`, JSON.stringify(filter, null, 2));
    console.log(`[ADMIN GET USERS] Search: "${search}"`);

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

    console.log(`[ADMIN GET USERS] Found ${users.length} users, Total: ${total}`);

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

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 300); // Cache for 5 minutes
    }

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

    // Handle specific MongoDB errors
    if (error.name === 'MongoServerError') {
      if (error.code === 27) { // IndexNotFound error
        console.error('[ADMIN GET USERS] MongoDB index not found. Falling back to simple search.');
        
        // Try a simpler search without $text
        try {
          // Retry with simpler filter
          const simpleFilter = { ...req.query };
          if (simpleFilter.search) {
            delete simpleFilter.search; // Remove search to avoid error
          }
          
          // Fallback response
          return res.status(200).json({
            success: true,
            message: 'Search temporarily disabled due to index configuration. Please contact administrator.',
            data: {
              users: [],
              stats: { total: 0, active: 0, admins: 0, pending: 0 },
              pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
              }
            },
            meta: {
              requestId,
              timestamp: new Date().toISOString(),
              warning: 'Search index not configured. Using fallback.',
              executionTime: `${Date.now() - startTime}ms`
            }
          });
        } catch (fallbackError) {
          console.error('[ADMIN GET USERS FALLBACK ERROR]', fallbackError);
        }
      }
    }
    
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
    const { cache: useCacheParam = 'false' } = req.query;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
        requestId
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('admin:user:single', { id });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedUser = await cache.get(cacheKey);
      if (cachedUser) {
        console.log('Cache HIT admin:user:single:', cacheKey);
        return res.json({
          ...cachedUser,
          cached: true,
          requestId,
          timestamp: new Date().toISOString(),
          adminView: true
        });
      }
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

    const response = {
      success: true,
      data: formattedUser,
      requestId,
      timestamp: new Date().toISOString(),
      adminView: true
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 600); // Cache for 10 minutes
    }

    res.json(response);

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

    // ===== INVALIDATE CACHE =====
    await invalidateAdminCache('users');

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

    // ===== INVALIDATE CACHE =====
    await invalidateSpecificCache('user', id);
    await invalidateAdminCache('users');

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

    // ===== INVALIDATE CACHE =====
    await invalidateSpecificCache('user', userId);
    await invalidateAdminCache('users');

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

// Export Users - FIXED VERSION
const exportUsers = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'json', cache: useCacheParam = 'false' } = req.query;

    console.log(`[EXPORT USERS] Starting export with format: ${format}, requestId: ${requestId}`);

    // Generate cache key for export
    const cacheKey = generateCacheKey('admin:export:users', { format });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedExport = await cache.get(cacheKey);
      if (cachedExport) {
        console.log('Cache HIT admin:export:users:', cacheKey);
        
        if (format.toLowerCase() === 'csv') {
          res.header('Content-Type', 'text/csv; charset=utf-8');
          res.header('Content-Disposition', `attachment; filename="users_export_${Date.now()}.csv"`);
          res.header('X-Request-ID', requestId);
          res.header('X-Export-Records', cachedExport.count || 0);
          res.header('X-Export-Timestamp', new Date().toISOString());
          res.header('X-Cache', 'HIT');
          
          return res.send(cachedExport.csvContent);
        }
        
        return res.json({
          success: true,
          count: cachedExport.count,
          data: cachedExport.data,
          exportedAt: cachedExport.exportedAt,
          requestId,
          format: 'json',
          cached: true
        });
      }
    }

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

      // Cache the export if enabled
      if (useCache) {
        await cache.set(cacheKey, {
          csvContent,
          count: users.length,
          exportedAt: new Date().toISOString()
        }, 3600); // Cache exports for 1 hour
      }

      // Set proper CSV headers
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.header('Content-Disposition', `attachment; filename="users_export_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', users.length);
      res.header('X-Export-Timestamp', new Date().toISOString());
      res.header('X-Cache', useCache ? 'MISS' : 'BYPASSED');
      
      return res.send(csvContent);
    }

    // Default to JSON format
    console.log(`[EXPORT USERS] Returning JSON format, ${users.length} users`);
    
    // Cache the JSON export if enabled
    const exportData = {
      success: true,
      count: users.length,
      data: users,
      exportedAt: new Date().toISOString(),
      requestId,
      format: 'json'
    };
    
    if (useCache) {
      await cache.set(cacheKey, exportData, 3600); // Cache exports for 1 hour
    }
    
    res.json(exportData);

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
    // Generate cache key for health check
    const cacheKey = generateCacheKey('admin:system:health', {
      timestamp: Math.floor(Date.now() / 30000) // Cache for 30 seconds
    });
    
    // Try to get from cache
    const cachedHealth = await cache.get(cacheKey);
    if (cachedHealth) {
      console.log('Cache HIT admin:system:health');
      return res.json({
        ...cachedHealth,
        cached: true,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    const health = await checkSystemHealth();
    
    // Cache the health check result
    await cache.set(cacheKey, {
      success: true,
      data: health
    }, 30); // Cache for 30 seconds
    
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

const getSubcategoriesDropdown = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { categoryId } = req.params; // Changed from req.query to req.params
    const { activeOnly = true, cache: useCacheParam = 'false' } = req.query;

    console.log('[GET SUBCATEGORIES DROPDOWN] Request:', {
      categoryId,
      activeOnly,
      admin: req.admin?.email
    });

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('admin:subcategories:dropdown', {
      categoryId,
      activeOnly
    });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedSubcategories = await cache.get(cacheKey);
      if (cachedSubcategories) {
        console.log('Cache HIT admin:subcategories:dropdown:', cacheKey);
        return res.json({
          ...cachedSubcategories,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Build filter
    const filter = {
      category: categoryId,
      deletedAt: null
    };

    if (activeOnly === 'true' || activeOnly === true) {
      filter.isActive = true;
    }

    // Get subcategories WITH category population
    const subcategories = await Subcategory.find(filter)
      .populate('category', 'name slug description') // ADD THIS
      .select('name slug description icon order servicesCount gigsCount')
      .sort({ order: 1, name: 1 })
      .lean();

    console.log(`[GET SUBCATEGORIES DROPDOWN] Found ${subcategories.length} subcategories for category ${categoryId}`);

    const response = {
      success: true,
      data: subcategories,
      count: subcategories.length,
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 600); // Cache for 10 minutes
    }

    res.json(response);

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
      sortOrder = 'asc',
      cache: useCacheParam = 'false'
    } = req.query;

    // Build filter
    const filter = { deletedAt: null };
    
    if (search) {
  const sanitizedSearch = validator.escape(search.trim());
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

    // Generate cache key
    const cacheKey = generateCacheKey('admin:subcategories', {
      filter: JSON.stringify(filter),
      page: pageNum,
      limit: limitNum,
      sortField,
      sortDirection,
      skip
    });

    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log('Cache HIT admin:subcategories:', cacheKey);
        return res.json({
          ...cachedResult,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

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

    const response = {
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
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 300); // Cache for 5 minutes
    }

    res.json(response);

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
    const { cache: useCacheParam = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('admin:subcategory:single', { id });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedSubcategory = await cache.get(cacheKey);
      if (cachedSubcategory) {
        console.log('Cache HIT admin:subcategory:single:', cacheKey);
        return res.json({
          ...cachedSubcategory,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
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

    const response = {
      success: true,
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 600); // Cache for 10 minutes
    }

    res.json(response);

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

    // ===== INVALIDATE CACHE =====
    await invalidateAdminCache('subcategories');
    await invalidateAdminCache('categories');

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

    // ===== INVALIDATE CACHE =====
    await invalidateSpecificCache('subcategory', id);
    await invalidateAdminCache('subcategories');

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

    // ===== INVALIDATE CACHE =====
    await invalidateSpecificCache('subcategory', id);
    await invalidateAdminCache('subcategories');
    await invalidateAdminCache('categories');

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

    // ===== INVALIDATE CACHE =====
    await invalidateAdminCache('subcategories');
    await invalidateAdminCache('categories');

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

// Updated getSubcategoryStats function
const getSubcategoryStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    // Generate cache key
    const cacheKey = generateCacheKey('admin:stats:subcategories', {
      timestamp: Math.floor(Date.now() / 60000)
    });
    
    // Try to get from cache
    const cachedStats = await cache.get(cacheKey);
    if (cachedStats) {
      console.log('Cache HIT admin:stats:subcategories');
      return res.json({
        ...cachedStats,
        cached: true,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // FIXED AGGREGATION: Use direct counts from services and gigs
    const [subcategories, categoryStats] = await Promise.all([
      Subcategory.find({ deletedAt: null })
        .populate('category', 'name slug')
        .select('name slug category servicesCount gigsCount isActive')
        .lean(),
      
      // Get actual counts from services and gigs grouped by subcategory
      Promise.all([
        Service.aggregate([
          { $match: { status: 'active', isActive: true, deletedAt: null } },
          { $group: { _id: '$subcategory', count: { $sum: 1 } } }
        ]),
        Gig.aggregate([
          { $match: { status: 'open', isActive: true, deletedAt: null } },
          { $group: { _id: '$subcategory', count: { $sum: 1 } } }
        ])
      ])
    ]);

    // Create maps for actual counts
    const serviceCountMap = {};
    const gigCountMap = {};
    
    // Process service counts
    if (categoryStats[0]) {
      categoryStats[0].forEach(item => {
        if (item._id) {
          serviceCountMap[item._id.toString()] = item.count;
        }
      });
    }
    
    // Process gig counts
    if (categoryStats[1]) {
      categoryStats[1].forEach(item => {
        if (item._id) {
          gigCountMap[item._id.toString()] = item.count;
        }
      });
    }

    // Update subcategories with actual counts
    const updatedSubcategories = subcategories.map(sub => {
      const subId = sub._id.toString();
      const actualServices = serviceCountMap[subId] || 0;
      const actualGigs = gigCountMap[subId] || 0;
      
      // Fix negative counts
      const fixedServices = Math.max(0, actualServices);
      const fixedGigs = Math.max(0, actualGigs);
      
      return {
        ...sub,
        servicesCount: fixedServices,
        gigsCount: fixedGigs
      };
    });

    // Calculate overview
    const overview = {
      totalSubcategories: updatedSubcategories.length,
      activeSubcategories: updatedSubcategories.filter(s => s.isActive).length,
      totalServices: updatedSubcategories.reduce((sum, sub) => sum + sub.servicesCount, 0),
      totalGigs: updatedSubcategories.reduce((sum, sub) => sum + sub.gigsCount, 0),
      avgServices: updatedSubcategories.length > 0 
        ? updatedSubcategories.reduce((sum, sub) => sum + sub.servicesCount, 0) / updatedSubcategories.length
        : 0,
      avgGigs: updatedSubcategories.length > 0 
        ? updatedSubcategories.reduce((sum, sub) => sum + sub.gigsCount, 0) / updatedSubcategories.length
        : 0
    };

    // Group by category
    const byCategoryMap = {};
    updatedSubcategories.forEach(sub => {
      const catId = sub.category?._id?.toString() || 'unknown';
      
      if (!byCategoryMap[catId]) {
        byCategoryMap[catId] = {
          _id: sub.category?._id || null,
          count: 0,
          totalServices: 0,
          totalGigs: 0,
          category: sub.category || { name: 'Unknown', slug: '' }
        };
      }
      
      byCategoryMap[catId].count += 1;
      byCategoryMap[catId].totalServices += sub.servicesCount;
      byCategoryMap[catId].totalGigs += sub.gigsCount;
    });

    const byCategory = Object.values(byCategoryMap).sort((a, b) => b.count - a.count);

    // Get growth data
    const growth = await Subcategory.aggregate([
      { $match: { deletedAt: null } },
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
    ]);

    // Update database with corrected counts
    for (const sub of updatedSubcategories) {
      if (sub.servicesCount !== sub.servicesCount || sub.gigsCount !== sub.gigsCount) {
        await Subcategory.findByIdAndUpdate(sub._id, {
          servicesCount: Math.max(0, sub.servicesCount),
          gigsCount: Math.max(0, sub.gigsCount)
        });
      }
    }

    const response = {
      success: true,
      data: {
        overview: [overview],
        byCategory,
        growth
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // Cache for 5 minutes

    res.json(response);

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
    const { format = 'json', cache: useCacheParam = 'false' } = req.query;

    // Generate cache key
    const cacheKey = generateCacheKey('admin:export:subcategories', { format });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedExport = await cache.get(cacheKey);
      if (cachedExport) {
        console.log('Cache HIT admin:export:subcategories:', cacheKey);
        
        if (format === 'csv') {
          res.header('Content-Type', 'text/csv');
          res.header('Content-Disposition', `attachment; filename="subcategories_export_${Date.now()}.csv"`);
          res.header('X-Request-ID', requestId);
          res.header('X-Export-Records', cachedExport.count);
          res.header('X-Export-Timestamp', new Date().toISOString());
          res.header('X-Cache', 'HIT');
          
          return res.send(cachedExport.csvContent);
        }
        
        return res.json({
          success: true,
          format: 'json',
          count: cachedExport.count,
          data: cachedExport.data,
          exportedAt: cachedExport.exportedAt,
          requestId,
          cached: true
        });
      }
    }

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

      // Cache the export if enabled
      if (useCache) {
        await cache.set(cacheKey, {
          csvContent,
          count: subcategories.length,
          exportedAt: new Date().toISOString()
        }, 3600); // Cache exports for 1 hour
      }

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="subcategories_export_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', subcategories.length);
      res.header('X-Export-Timestamp', new Date().toISOString());
      res.header('X-Cache', useCache ? 'MISS' : 'BYPASSED');
      
      return res.send(csvContent);
    }

    // Default to JSON
    const exportData = {
      success: true,
      format: 'json',
      count: subcategories.length,
      data: subcategories,
      exportedAt: new Date().toISOString(),
      requestId
    };
    
    // Cache the JSON export if enabled
    if (useCache) {
      await cache.set(cacheKey, exportData, 3600); // Cache exports for 1 hour
    }
    
    res.json(exportData);

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
    const { limit = 15, days = 30, cache: useCacheParam = 'false' } = req.query;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Safety cap
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Generate cache key
    const cacheKey = generateCacheKey('admin:activity:recent', {
      limit: limitNum,
      days,
      cutoffDate: cutoffDate.toISOString()
    });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedActivity = await cache.get(cacheKey);
      if (cachedActivity) {
        console.log('Cache HIT admin:activity:recent:', cacheKey);
        return res.json({
          ...cachedActivity,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

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

    const response = {
      success: true,
      data: finalActivities,
      count: finalActivities.length,
      filters: {
        days: parseInt(days),
        limit: limitNum
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 300); // Cache for 5 minutes
    }

    res.json(response);

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
  getSystemHealthHandler, 
  logAdminAction,
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
  getRecentActivity,
  checkAdminSession,
  adminLogout,
  fakeDelay,
  getAdminPermissions,
  getUserById,
  generateCacheKey,
  invalidateAdminCache,
  invalidateSpecificCache
};