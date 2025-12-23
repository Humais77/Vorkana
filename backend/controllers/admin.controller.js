const mongoose = require('mongoose');
const User = require('../models/user.model.js');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');
const Gig = require('../models/gig.model.js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const validator = require('validator');
// Add this at the top with your other imports
const gigController = require('../controllers/gig.controller.js');
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
const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '7d',
      issuer: 'vorkana',
      audience: 'vorkana-web'
    }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'vorkana',
      audience: 'vorkana-web'
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

   const sanitizedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      phoneNumber: user.phoneNumber,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      city: user.city,
      occupation: user.occupation,
      education: user.education,
      languages: user.languages,
      accountType: user.accountType,
      privacySettings: user.privacySettings,
      responseRate: user.responseRate,
      responseTime: user.responseTime,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      // Add any other fields you need
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

    console.log('[ADMIN UPDATE USER] Request body:', JSON.stringify(updates, null, 2));
    console.log('[ADMIN UPDATE USER] User ID:', id);
    console.log('[ADMIN UPDATE USER] Admin ID:', req.admin?._id);

    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID',
        requestId
      });
    }

    // Security: Define allowed update fields (expanded list)
    const allowedUpdates = [
      'name', 'role', 'isActive', 'emailVerified', 'twoFactorEnabled',
      'phoneNumber', 'bio', 'gender', 'dateOfBirth', 'country', 'city',
      'occupation', 'education', 'languages', 'accountType', 'privacySettings',
      'picture', 'bio', 'rating', 'responseRate', 'responseTime'
    ];
    
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        // Handle different data types
        if (key === 'languages' && typeof updates[key] === 'string') {
          // Convert string to array if needed
          filteredUpdates[key] = updates[key].split(',').map(lang => lang.trim());
        } else if (key === 'privacySettings' && typeof updates[key] === 'string') {
          // Parse JSON string for privacySettings
          try {
            filteredUpdates[key] = JSON.parse(updates[key]);
          } catch (e) {
            console.error('[ADMIN UPDATE USER] Invalid privacySettings JSON:', e);
          }
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });

    // Validate email if being updated
    if (filteredUpdates.email) {
      if (!validator.isEmail(filteredUpdates.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
          requestId
        });
      }
      
      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({ 
        email: filteredUpdates.email.toLowerCase(),
        _id: { $ne: id }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
          code: 'DUPLICATE_EMAIL',
          requestId
        });
      }
      
      filteredUpdates.email = filteredUpdates.email.toLowerCase();
    }

    // Security: Prevent self-demotion
    if (filteredUpdates.role && filteredUpdates.role !== 'admin' && id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role',
        code: 'SELF_ROLE_CHANGE',
        requestId
      });
    }

    // Validate date of birth if being updated
    if (filteredUpdates.dateOfBirth && !validateDateOfBirth(filteredUpdates.dateOfBirth)) {
      return res.status(400).json({
        success: false,
        message: 'You must be at least 13 years old and not older than 120 years',
        code: 'INVALID_DATE_OF_BIRTH',
        requestId
      });
    }

    // Validate phone number if being updated
    if (filteredUpdates.phoneNumber && !validatePhoneNumber(filteredUpdates.phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
        requestId
      });
    }

    console.log('[ADMIN UPDATE USER] Filtered updates:', JSON.stringify(filteredUpdates, null, 2));

    // Add updatedAt to the updates object (not as separate operator)
    filteredUpdates.updatedAt = new Date();

    // Find and update user - FIXED VERSION
    const user = await User.findByIdAndUpdate(
      id,
      filteredUpdates,  // Directly pass the updates object (mongoose handles $set automatically)
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    )
    .select('-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -emailVerificationToken -deviceTokens -loginHistory')
    .lean();

    if (!user) {
      console.log('[ADMIN UPDATE USER] User not found:', id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId
      });
    }

    // Security: Log admin action
    await logAdminAction(req.admin._id, 'UPDATE_USER', `user:${id}`, {
      updates: Object.keys(filteredUpdates),
      ip: req.ip,
      userEmail: user.email
    });

    console.log('[ADMIN UPDATE USER] Successfully updated user:', user._id);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        country: user.country,
        city: user.city,
        occupation: user.occupation,
        education: user.education,
        languages: user.languages,
        accountType: user.accountType,
        privacySettings: user.privacySettings,
        picture: user.picture,
        rating: user.rating,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[UPDATE USER ERROR]', error);
    console.error('[UPDATE USER ERROR STACK]', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('[UPDATE USER VALIDATION ERROR]', messages);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      console.error('[UPDATE USER DUPLICATE ERROR]', error);
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        code: 'DUPLICATE_EMAIL',
        requestId
      });
    }
    
    // Handle cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        code: 'CAST_ERROR',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user: ' + (error.message || 'Internal server error'),
      code: 'USER_UPDATE_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
const createUser = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const userData = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    console.log('[ADMIN CREATE USER] Request body:', JSON.stringify(userData, null, 2));

    // Security: Validate required fields
    if (!userData.email || !userData.password || !userData.name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }

    // Validate email format
    if (!validator.isEmail(userData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        requestId
      });
    }

    // Validate password strength
    if (!validatePassword(userData.password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&)',
        code: 'WEAK_PASSWORD',
        requestId
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      console.log('[ADMIN CREATE USER] User already exists:', userData.email);
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
        code: 'USER_EXISTS',
        requestId
      });
    }

    // Sanitize user data
    const sanitizedData = {
      name: validator.escape(userData.name.trim()),
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      role: userData.role || 'user',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : true,
      phoneNumber: userData.phoneNumber ? validator.escape(userData.phoneNumber.trim()) : '',
      bio: userData.bio ? validator.escape(userData.bio.trim()) : '',
      gender: userData.gender || '',
      dateOfBirth: userData.dateOfBirth || null,
      country: userData.country ? validator.escape(userData.country.trim()) : '',
      city: userData.city ? validator.escape(userData.city.trim()) : '',
      occupation: userData.occupation ? validator.escape(userData.occupation.trim()) : '',
      education: userData.education ? validator.escape(userData.education.trim()) : '',
      languages: Array.isArray(userData.languages) ? userData.languages : [],
      privacySettings: userData.privacySettings || {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showLastSeen: true
      },
      picture: userData.picture || null,
      createdByAdmin: req.admin._id,
      adminNotes: userData.adminNotes || ''
    };

    console.log('[ADMIN CREATE USER] Sanitized data:', JSON.stringify(sanitizedData, null, 2));

    // Validate date of birth if provided
    if (sanitizedData.dateOfBirth && !validateDateOfBirth(sanitizedData.dateOfBirth)) {
      return res.status(400).json({
        success: false,
        message: 'You must be at least 13 years old and not older than 120 years',
        code: 'INVALID_DATE_OF_BIRTH',
        requestId
      });
    }

    // Validate phone number if provided
    if (sanitizedData.phoneNumber && !validatePhoneNumber(sanitizedData.phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
        requestId
      });
    }

    // Create the user
    console.log('[ADMIN CREATE USER] Creating user in database...');
    const user = await User.create(sanitizedData);
    console.log('[ADMIN CREATE USER] User created successfully:', user._id);

    // Prepare response data (exclude sensitive fields)
    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      picture: user.picture,
      phoneNumber: user.phoneNumber,
      country: user.country,
      city: user.city,
      occupation: user.occupation,
      education: user.education,
      createdByAdmin: user.createdByAdmin,
      privacySettings: user.privacySettings,
      languages: user.languages || []
    };

    // Security: Log admin action
    await logAdminAction(req.admin._id, 'CREATE_USER', `user:${user._id}`, {
      email: user.email,
      role: user.role,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: responseData,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ADMIN CREATE USER ERROR]', error);
    console.error('[ADMIN CREATE USER ERROR DETAILS]', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('[ADMIN CREATE USER VALIDATION ERROR]', messages);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      console.error('[ADMIN CREATE USER DUPLICATE ERROR]', error);
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'DUPLICATE_EMAIL',
        requestId
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Failed to create user: ' + (error.message || 'Internal server error'),
      code: 'USER_CREATE_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  return password.length >= minLength && 
         hasUpperCase && 
         hasLowerCase && 
         hasNumbers && 
         hasSpecialChar;
};

// Helper function: validate date of birth
const validateDateOfBirth = (dob) => {
  if (!dob) return true;
  
  const date = new Date(dob);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    return age - 1 >= 13 && age - 1 <= 120;
  }
  
  return age >= 13 && age <= 120;
};

// Helper function: validate phone number
const validatePhoneNumber = (phone) => {
  if (!phone) return true;
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
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

// Get Gig by ID (Admin)
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
      .populate('subcategory', 'name slug')
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

// Create Gig (Admin)
const createGig = async (req, res) => {
  const requestId = uuidv4();
  
  try {
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
      
      const subcategory = await Category.findOne({
        _id: gigData.subcategory,
        parentCategory: gigData.projectCategory
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

    // Validate client exists if provided
    if (gigData.createdBy && !mongoose.Types.ObjectId.isValid(gigData.createdBy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID',
        code: 'INVALID_CLIENT_ID',
        requestId
      });
    }

    // Create gig
    const gig = await Gig.create(gigData);

    // Populate for response
    const populatedGig = await Gig.findById(gig._id)
      .populate('projectCategory', 'name slug icon')
      .populate('subcategory', 'name slug')
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
      budget: gig.budget,
      ip: req.ip
    });

    // Update category gig count
    await Category.findByIdAndUpdate(gig.projectCategory, {
      $inc: { gigsCount: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Gig created successfully',
      data: populatedGig,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CREATE GIG ERROR]', error);
    
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
      message: 'Failed to create gig',
      code: 'GIG_CREATE_ERROR',
      requestId
    });
  }
};

// Update Gig (Admin)
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

    // Update gig
    const gig = await Gig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('projectCategory', 'name slug icon')
    .populate('subcategory', 'name slug')
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
      
      // Decrement category count if gig was open
      if (gig.status === 'open' && gig.projectCategory) {
        await Category.findByIdAndUpdate(gig.projectCategory, {
          $inc: { gigsCount: -1 }
        });
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
      
      // Decrement category count if gig was open
      if (gig.status === 'open' && gig.projectCategory) {
        await Category.findByIdAndUpdate(gig.projectCategory, {
          $inc: { gigsCount: -1 }
        });
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
const exportGigs = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'json' } = req.query;

    // Get gigs with populated data
    const gigs = await Gig.find({ deletedAt: null })
      .populate('projectCategory', 'name slug')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .select('-__v -lastUpdatedBy -deletedAt -deletedBy -version -communicationHistory')
      .lean();

    if (format === 'csv') {
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

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="gigs_export_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', gigs.length);
      res.header('X-Export-Timestamp', new Date().toISOString());
      
      return res.send(csvContent);
    }

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
                totalBudget: { $sum: '$budget' },
                avgBudget: { $avg: '$budget' },
                totalBids: { $sum: { $size: '$bids' } },
                avgBidsPerGig: { $avg: { $size: '$bids' } }
              }
            }
          ],
          byCategory: [
            { $match: { status: 'open' } },
            {
              $group: {
                _id: '$projectCategory',
                count: { $sum: 1 },
                avgBudget: { $avg: '$budget' },
                totalBids: { $sum: { $size: '$bids' } },
                maxBudget: { $max: '$budget' },
                minBudget: { $min: '$budget' }
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
                avgBudget: { $avg: '$budget' }
              }
            },
            { $sort: { count: -1 } }
          ],
          byUrgency: [
            {
              $group: {
                _id: '$urgency',
                count: { $sum: 1 },
                avgBudget: { $avg: '$budget' }
              }
            },
            { $sort: { count: -1 } }
          ],
          budgetDistribution: [
            {
              $bucket: {
                groupBy: "$budget",
                boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, 100000],
                default: "100000+",
                output: {
                  count: { $sum: 1 },
                  avgBids: { $avg: { $size: '$bids' } }
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
                totalBudget: { $sum: '$budget' }
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gig statistics',
      code: 'GIG_STATS_ERROR',
      requestId
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
  generateAdminToken,
  getSystemHealthHandler, // Add this
  logAdminAction // Make sure this is exported if used in routes
};