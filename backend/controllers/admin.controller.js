const mongoose = require('mongoose');
const User = require('../models/user.model.js');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');
const Gig = require('../models/gig.model.js');
const Order = require('../models/order.model.js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Security: Generate admin-specific token
const generateAdminToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'admin',
      aud: 'vorkana-admin',
      iss: 'vorkana'
    },
    process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '2h',
      algorithm: 'HS256'
    }
  );
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

// Dashboard Statistics
// Simplify the getDashboardStats function to return only essential data
const getDashboardStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    // Execute parallel queries
    const [
      totalUsers,
      activeUsers,
      totalCategories,
      activeCategories,
      totalServices,
      activeServices,
      totalGigs,
      activeGigs,
      recentActivity
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      
      // Categories
      Category.countDocuments(),
      Category.countDocuments({ isActive: true, deletedAt: null }),
      
      // Services
      Service.countDocuments(),
      Service.countDocuments({ isActive: true }),
      
      // Gigs
      Gig.countDocuments(),
      Gig.countDocuments({ isActive: true }),
      
      // Recent activity (last 5 users)
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email role picture createdAt')
        .lean()
    ]);

    const stats = {
      overview: {
        totalUsers,
        activeUsers
      },
      categories: {
        totalCategories,
        activeCategories
      },
      services: {
        totalServices,
        activeServices
      },
      gigs: {
        totalGigs,
        activeGigs
      },
      recentActivity: recentActivity.map(user => ({
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        joined: user.createdAt
      }))
    };

    res.json({
      success: true,
      data: stats,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DASHBOARD STATS ERROR]', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard statistics',
      code: 'DASHBOARD_ERROR',
      requestId
    });
  }
};
// User Management
const getUsers = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Security: Build secure query
    const query = {};
    
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (isActive !== '') query.isActive = isActive === 'true';

    // Security: Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Security: Validate sort fields
    const allowedSortFields = ['name', 'email', 'role', 'createdAt', 'lastLoginAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query with projection (exclude sensitive fields)
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -emailVerificationToken')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    // Security: Sanitize user data
    const sanitizedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    }));

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: sanitizedUsers,
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
    console.error('[GET USERS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      code: 'USERS_FETCH_ERROR',
      requestId
    });
  }
};

// Update User (Admin)
const updateUser = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const updates = req.body;

    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
        requestId
      });
    }

    // Security: Define allowed update fields
    const allowedUpdates = ['name', 'role', 'isActive', 'emailVerified', 'twoFactorEnabled'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Security: Prevent self-demotion
    if (filteredUpdates.role && filteredUpdates.role !== 'admin' && id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role',
        code: 'SELF_ROLE_CHANGE',
        requestId
      });
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId
      });
    }

    // Security: Log admin action
    await logAdminAction(req.admin._id, 'UPDATE_USER', `user:${id}`, {
      updates: filteredUpdates,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[UPDATE USER ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
        code: 'DUPLICATE_EMAIL',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      code: 'USER_UPDATE_ERROR',
      requestId
    });
  }
};

// Delete User (Soft Delete)
const deleteUser = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
        requestId
      });
    }

    // Security: Prevent self-deletion
    if (id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        code: 'SELF_DELETION',
        requestId
      });
    }

    let result;
    
    if (permanent === 'true') {
      // Permanent delete (with additional checks)
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          requestId
        });
      }

      // Check for dependencies (orders, services, etc.)
      const userOrders = await Order.countDocuments({ user: id }).catch(() => 0);
      if (userOrders > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete user with existing orders',
          code: 'USER_HAS_DEPENDENCIES',
          requestId
        });
      }

      result = await User.findByIdAndDelete(id);
      
      // Security: Log permanent deletion
      await logAdminAction(req.admin._id, 'PERMANENT_DELETE_USER', `user:${id}`, {
        ip: req.ip,
        userName: user.name,
        userEmail: user.email
      });

    } else {
      // Soft delete
      result = await User.findByIdAndUpdate(
        id,
        { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.admin._id
        },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          requestId
        });
      }

      // Security: Log soft deletion
      await logAdminAction(req.admin._id, 'SOFT_DELETE_USER', `user:${id}`, {
        ip: req.ip
      });
    }

    res.json({
      success: true,
      message: permanent === 'true' ? 'User permanently deleted' : 'User deactivated',
      data: {
        _id: result._id,
        email: result.email,
        isActive: result.isActive,
        deletedAt: result.deletedAt
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DELETE USER ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      code: 'USER_DELETE_ERROR',
      requestId
    });
  }
};

// Export Users
const exportUsers = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    // Security: Get users with minimal sensitive data
    const users = await User.find()
      .select('name email role isActive emailVerified createdAt lastLoginAt')
      .lean();

    if (format === 'csv') {
      const headers = ['ID', 'Name', 'Email', 'Role', 'Active', 'Email Verified', 'Created At', 'Last Login'];
      const csvRows = users.map(user => [
        user._id,
        `"${user.name.replace(/"/g, '""')}"`,
        user.email,
        user.role,
        user.isActive ? 'Yes' : 'No',
        user.emailVerified ? 'Yes' : 'No',
        new Date(user.createdAt).toISOString(),
        user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : 'Never'
      ]);

      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="users_export.csv"');
      return res.send(csvContent);
    }

    res.json({
      success: true,
      count: users.length,
      data: users,
      exportedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[EXPORT USERS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users'
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
const getServiceStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const stats = await Service.aggregate([
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalServices: { $sum: 1 },
                activeServices: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                draftServices: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                pendingServices: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                pausedServices: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
                suspendedServices: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
                featuredServices: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
                recommendedServices: { $sum: { $cond: [{ $eq: ['$isRecommended', true] }, 1, 0] } },
                popularServices: { $sum: { $cond: [{ $eq: ['$isPopular', true] }, 1, 0] } },
                totalOrders: { $sum: '$ordersCount' },
                totalViews: { $sum: '$views' },
                totalLikes: { $sum: '$likes' },
                avgPrice: { $avg: '$price' },
                avgRating: { $avg: '$rating' },
                avgDeliveryTime: { $avg: '$deliveryTime' },
                totalRevenue: { $sum: { $multiply: ['$price', '$ordersCount'] } }
              }
            }
          ],
          byCategory: [
            { $match: { status: 'active', isActive: true } },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalOrders: { $sum: '$ordersCount' },
                avgRating: { $avg: '$rating' },
                avgPrice: { $avg: '$price' }
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
                avgPrice: { $avg: '$price' },
                avgOrders: { $avg: '$ordersCount' }
              }
            },
            { $sort: { count: -1 } }
          ],
          byFeatured: [
            {
              $group: {
                _id: '$isFeatured',
                count: { $sum: 1 },
                avgOrders: { $avg: '$ordersCount' },
                avgRating: { $avg: '$rating' }
              }
            }
          ],
          growth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  week: { $week: '$createdAt' }
                },
                count: { $sum: 1 },
                totalOrders: { $sum: '$ordersCount' }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.week': -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    res.json({
      success: true,
      data: result,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SERVICE STATS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics',
      code: 'SERVICE_STATS_ERROR',
      requestId
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getCategories,
  updateUser,
  deleteUser,
  exportUsers,
  getServiceStats,
  generateAdminToken,
  getSystemHealthHandler, // Add this
  logAdminAction // Make sure this is exported if used in routes
};