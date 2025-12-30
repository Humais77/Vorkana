const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { promisify } = require('util');
const rateLimit = require('express-rate-limit');
const blacklist = new Set(); // In production, use Redis
const mongoose = require('mongoose');
const EmailService = require('../services/email.service');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const asyncHandler = require('express-async-handler');
const { performance } = require('perf_hooks');

// Cache utility import (make sure this file exists)
const cache = require('../utils/cache.js');
const perfMiddleware = (req, res, next) => {
  req.startTime = performance.now();
  next();
};

// Cached bcrypt comparison for timing attack prevention
const fakeCompare = async () => {
  return await bcrypt.compare('fake', '$2b$10$fakeHashForTimingPrevention');
};

// ========== TOKEN FUNCTIONS ==========
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

const verifyToken = (token) => {
  return promisify(jwt.verify)(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return promisify(jwt.verify)(
    token, 
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  );
};

// ========== SECURITY FUNCTIONS ==========
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

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};

const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Optional field

  try {
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      return false;
    }
    // Optional: enforce mobile only (if you want mobile numbers specifically)
    // return phoneNumber.getType() === 'MOBILE' || phoneNumber.getType() === 'FIXED_LINE_OR_MOBILE';

    return true;
  } catch (error) {
    return false;
  }
};
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

// ========== CACHE FUNCTIONS ==========
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

const invalidateUserCache = async (userId) => {
  try {
    await cache.del(`user:${userId}*`);
    await cache.del('users:*');
    console.log(`Cache invalidated for user: ${userId}`);
  } catch (err) {
    console.warn('Error invalidating user cache:', err.message);
  }
};

// ========== AUDIT LOGGING ==========
const logSecurityEvent = (event, userId, ip, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    ip,
    ...details
  };
  
  console.log('[SECURITY]', JSON.stringify(logEntry));
  
  // In production, save to security log database
  if (process.env.NODE_ENV === 'production') {
    // Implement logging to database or external service
  }
};
const optimizeDatabase = async () => {
  try {
    const mongoose = require('mongoose');
    
    // Set connection options for better performance
    mongoose.connection.on('connected', () => {
      console.log('✅ Database connected with optimized settings');
      
      // Set query timeouts
      mongoose.set('maxTimeMS', 10000);
      
      // Disable full docs in update operations
      mongoose.set('returnOriginal', false);
      
      // Enable lean queries by default for find operations
      mongoose.set('toObject', { virtuals: true });
      mongoose.set('toJSON', { virtuals: true });
    });
    
  } catch (error) {
    console.error('Database optimization error:', error.message);
  }
};
// ========== CONTROLLER FUNCTIONS ==========

// Register new user
const register = asyncHandler(async (req, res) => {
  const startTime = performance.now();
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const { name, email, password, phoneNumber, dateOfBirth, gender, country, city } = req.body;

    // 1. Quick validations first (fast checks)
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // 2. Email validation (fast regex check before database)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // 3. Password strength validation (fast checks)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // 4. Check for existing user (database call - optimize with lean)
    const existingUser = await User.findOne({ email: email.toLowerCase() })
      .select('_id')
      .lean()
      .maxTimeMS(5000); // Timeout after 5 seconds

    if (existingUser) {
      // Constant-time delay to prevent timing attacks
      await fakeCompare();
      
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // 5. Prepare user data (avoid unnecessary operations)
    const userData = {
      name: name.trim().substring(0, 50), // Limit length
      email: email.toLowerCase().trim(),
      password,
      role: 'user',
      privacySettings: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showLastSeen: true
      }
    };

    // Only add optional fields if they exist and are valid
    if (phoneNumber && phoneNumber.trim()) {
      userData.phoneNumber = phoneNumber.trim().substring(0, 20);
    }
    
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        userData.dateOfBirth = dob;
      }
    }
    
    if (gender && ['male', 'female', 'other', 'prefer-not-to-say'].includes(gender)) {
      userData.gender = gender;
    }
    
    if (country && country.trim()) {
      userData.country = country.trim().substring(0, 100);
    }
    
    if (city && city.trim()) {
      userData.city = city.trim().substring(0, 100);
    }

    // 6. Create user (password hashing happens in pre-save middleware)
    const user = await User.create(userData);

    // 7. Generate verification token (don't wait for email)
    const verificationToken = user.createEmailVerificationToken();
    
    // Save user without waiting for email
    user.save({ validateBeforeSave: false }).catch(err => {
      console.error('Error saving user after creation:', err.message);
    });

    // 8. Send verification email in background (non-blocking)
    if (EmailService && typeof EmailService.sendVerificationEmail === 'function') {
      process.nextTick(async () => {
        try {
          await EmailService.sendVerificationEmail(user, verificationToken);
        } catch (emailError) {
          console.error('Background email error:', emailError.message);
        }
      });
    }

    // 9. Response (immediate)
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Registration completed in ${processingTime.toFixed(2)}ms`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      requiresVerification: true,
      processingTime: processingTime.toFixed(2),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ Registration error (${(endTime - startTime).toFixed(2)}ms):`, error.message);

    // Handle specific errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Optimized login function
const login = asyncHandler(async (req, res) => {
  const startTime = performance.now();
  const { email, password, deviceToken, deviceType } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // 1. Quick validations
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // 2. Find user with optimized query
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +failedLoginAttempts +lockUntil +suspiciousActivityDetected +emailVerified')
      .maxTimeMS(5000);

    if (!user) {
      // Constant-time delay for security
      await fakeCompare();
      
      const endTime = performance.now();
      console.log(`❌ Login failed - user not found (${(endTime - startTime).toFixed(2)}ms)`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 3. Check account status (fast checks)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account is locked. Try again in ${remainingTime} minutes.`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // 4. Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Log failed attempt in background
      process.nextTick(async () => {
        try {
          await user.incrementLoginAttempts();
          await user.addLoginHistory(ip, userAgent, false);
        } catch (err) {
          console.error('Error logging failed attempt:', err.message);
        }
      });

      // Constant-time delay
      await fakeCompare();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 5. Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 6. Reset login attempts in background
    process.nextTick(async () => {
      try {
        await user.resetLoginAttempts();
        await user.addLoginHistory(ip, userAgent, true);
        
        if (deviceToken) {
          await user.addDeviceToken(deviceToken, deviceType);
        }
        
        user.lastLoginAt = new Date();
        user.lastSeenAt = new Date();
        await user.save({ validateBeforeSave: false });
      } catch (err) {
        console.error('Error updating user after login:', err.message);
      }
    });

    // 7. Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // 8. Prepare response (lean user object)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.picture,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      country: user.country,
      city: user.city,
      bio: user.bio,
      rating: user.rating,
      isOnline: true
    };

    // 9. Cache public profile in background
    process.nextTick(async () => {
      try {
        const publicProfile = {
          _id: user._id,
          name: user.name,
          picture: user.picture,
          bio: user.bio,
          rating: user.rating,
          totalReviews: user.totalReviews,
          responseRate: user.responseRate,
          responseTime: user.responseTime,
          occupation: user.occupation,
          education: user.education,
          languages: user.languages,
          createdAt: user.createdAt,
          isOnline: true,
          accountType: user.accountType,
          country: user.privacySettings.showLocation ? user.country : undefined,
          city: user.privacySettings.showLocation ? user.city : undefined
        };
        
        const userCacheKey = `user:${user._id}:public`;
        if (cache && typeof cache.set === 'function') {
          await cache.set(userCacheKey, publicProfile, 300);
        }
      } catch (err) {
        console.error('Error caching user profile:', err.message);
      }
    });

    const endTime = performance.now();
    console.log(`✅ Login completed in ${(endTime - startTime).toFixed(2)}ms`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      processingTime: (endTime - startTime).toFixed(2),
      user: userResponse
    });

  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ Login error (${(endTime - startTime).toFixed(2)}ms):`, error.message);
    
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});
optimizeDatabase();
// Add database connection optimization



// Get user profile with caching
const getProfile = async (req, res) => {
  try {
    const cacheKey = `user:${req.user._id}:profile`;
    
    // Try to get from cache first
    const cachedProfile = await cache.get(cacheKey);
    if (cachedProfile) {
      return res.json({
        success: true,
        user: cachedProfile,
        cached: true
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update last seen
    user.lastSeenAt = new Date();
    await user.save({ validateBeforeSave: false });

    const userProfile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.picture,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      phoneNumber: user.phoneNumber,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      city: user.city,
      languages: user.languages,
      occupation: user.occupation,
      education: user.education,
      privacySettings: user.privacySettings,
      accountType: user.accountType,
      rating: user.rating,
      totalReviews: user.totalReviews,
      responseRate: user.responseRate,
      responseTime: user.responseTime,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
      isOnline: user.isOnline,
      age: user.age,
      fullLocation: user.fullLocation
    };

    // Cache the profile for 5 minutes
    await cache.set(cacheKey, userProfile, 300);

    res.json({
      success: true,
      user: userProfile,
      cached: false
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      picture, 
      phoneNumber, 
      bio, 
      gender, 
      dateOfBirth, 
      country, 
      city,
      languages,
      occupation,
      education,
      privacySettings,
      github,
      linkedin,
      website
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = sanitizeInput(name);
    if (email && email !== user.email) {
      // Handle email change with verification
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(409).json({
          success: false,
          message: 'Email already taken'
        });
      }
      updateData.email = email.toLowerCase();
      updateData.emailVerified = false;
    }
    if (bio !== undefined) updateData.bio = sanitizeInput(bio);
    if (phoneNumber !== undefined) {
      if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number'
        });
      }
      updateData.phoneNumber = phoneNumber || '';
    }
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth && !validateDateOfBirth(dateOfBirth)) {
        return res.status(400).json({
          success: false,
          message: 'You must be at least 13 years old and not older than 120 years'
        });
      }
      updateData.dateOfBirth = dateOfBirth || null;
    }
    if (country !== undefined) updateData.country = country || '';
    if (city !== undefined) updateData.city = city || '';
    if (languages !== undefined) updateData.languages = languages || [];
    if (occupation !== undefined) updateData.occupation = occupation || '';
    if (education !== undefined) updateData.education = education || '';
    if (github !== undefined) updateData.github = github || '';
    if (linkedin !== undefined) updateData.linkedin = linkedin || '';
    if (website !== undefined) updateData.website = website || '';
    if (privacySettings !== undefined) updateData.privacySettings = privacySettings;
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        fields: '-password -passwordHistory -resetPasswordToken -resetPasswordExpires -failedLoginAttempts -lockUntil -twoFactorSecret -emailVerificationToken -deviceTokens -loginHistory -suspiciousActivityDetected'
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      });
    }

    // Invalidate cache for this user
    await invalidateUserCache(req.user._id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        picture: updatedUser.picture,
        emailVerified: updatedUser.emailVerified,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth,
        country: updatedUser.country,
        city: updatedUser.city,
        languages: updatedUser.languages,
        occupation: updatedUser.occupation,
        education: updatedUser.education,
        github: updatedUser.github,
        linkedin: updatedUser.linkedin,
        website: updatedUser.website,
        privacySettings: updatedUser.privacySettings,
        rating: updatedUser.rating,
        isOnline: updatedUser.isOnline,
        lastSeenAt: updatedUser.lastSeenAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Passwords must be strings'
      });
    }

    // Get user with password and password history
    const user = await User.findById(req.user._id)
      .select('+password +passwordHistory +lastPasswordChangeAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      logSecurityEvent('PASSWORD_CHANGE_FAILED', user._id, ip, { reason: 'wrong_current_password' });
      
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Validate new password strength
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&)'
      });
    }

    // Check password history (prevent reusing last 3 passwords)
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const lastThreePasswords = user.passwordHistory.slice(-3);
      
      for (const oldPassword of lastThreePasswords) {
        const isOldPassword = await bcrypt.compare(newPassword, oldPassword.password);
        if (isOldPassword) {
          return res.status(400).json({
            success: false,
            message: 'You cannot reuse your last 3 passwords',
            code: 'PASSWORD_REUSE'
          });
        }
      }
    }

    // Minimum time between password changes (optional)
    const lastChange = user.lastPasswordChangeAt || user.createdAt;
    const hoursSinceLastChange = (Date.now() - lastChange) / (1000 * 60 * 60);
    
    if (hoursSinceLastChange < 1) {
      return res.status(400).json({
        success: false,
        message: 'You can only change your password once per hour',
        code: 'PASSWORD_CHANGE_RATE_LIMIT'
      });
    }

    // Set the new password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Invalidate cache for this user
    await invalidateUserCache(user._id);

    // Invalidate current token
    const authToken = req.headers.authorization?.split(' ')[1];
    if (authToken) {
      blacklist.add(authToken);
    }

    // Log password change
    logSecurityEvent('PASSWORD_CHANGED', user._id, ip, {
      passwordChangedAt: new Date().toISOString()
    });

    // Send security notification email
    try {
      await EmailService.sendPasswordChangedEmail(user, ip);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
      // Don't fail the operation if email fails
    }

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
      requiresReauth: true,
      securityAlertSent: true
    });

  } catch (error) {
    console.error('Change password error:', error);
    logSecurityEvent('PASSWORD_CHANGE_ERROR', req.user?._id, req.ip, { error: error.message });
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Password validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

// Verify email with token validation
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;  // ❌ This is const
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!token || token.length !== 64) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token format'
      });
    }

    const user = await User.findByVerificationToken(token);
    if (!user) {
      logSecurityEvent('EMAIL_VERIFICATION_FAILED', null, ip, { reason: 'invalid_token' });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.suspiciousActivityDetected = false;
    await user.save();
    
    // ✅ FIX: Use different variable names
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Invalidate cache for this user
    await invalidateUserCache(user._id);
    
    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if email fails
    }

    // Log verification
    logSecurityEvent('EMAIL_VERIFIED', user._id, ip, { email: user.email });

    res.json({
      success: true,
      message: 'Email verified successfully',
      token: authToken,  // ✅ FIX: Use the new variable
      refreshToken: refreshToken,  // ✅ FIX: Use the new variable
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        country: user.country,
        city: user.city,
        privacySettings: user.privacySettings
      },
      redirectUrl: `${process.env.FRONTEND_URL}/dashboard`
    });
  } catch (error) {
    console.error('Verify email error:', error);
    logSecurityEvent('EMAIL_VERIFICATION_ERROR', null, req.ip, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Server error verifying email',
      code: 'VERIFICATION_ERROR'
    });
  }
};

// Resend verification email with rate limiting
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if user exists (security through obscurity)
    if (!user) {
      // Still return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a verification email'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Rate limiting check (max 3 attempts per hour)
    const lastVerificationAttempt = user.loginHistory
      ?.filter(log => log.success === false && log.userAgent?.includes('verification-resend'))
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (lastVerificationAttempt) {
      const hoursSinceLastAttempt = (Date.now() - lastVerificationAttempt.timestamp) / (1000 * 60 * 60);
      if (hoursSinceLastAttempt < 1) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another verification email',
          retryAfter: 3600 - Math.floor(hoursSinceLastAttempt * 3600)
        });
      }
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Log resend attempt
    await user.addLoginHistory(ip, 'verification-resend', true);

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      logSecurityEvent('VERIFICATION_EMAIL_SEND_FAILED', user._id, ip, { 
        email: user.email,
        error: emailError.message 
      });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    // Log event
    logSecurityEvent('VERIFICATION_EMAIL_RESENT', user._id, ip, { email: user.email });

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    logSecurityEvent('VERIFICATION_RESEND_ERROR', null, req.ip, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Server error sending verification email'
    });
  }
};

// Forgot password with enhanced security
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Security: Don't reveal if user exists
    if (!user) {
      logSecurityEvent('PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL', null, ip, { email });
      
      // Return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logSecurityEvent('PASSWORD_RESET_REQUEST_INACTIVE_ACCOUNT', user._id, ip, { email: user.email });
      
      // Still return success to prevent enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Rate limiting check (max 3 reset requests per day)
    const resetAttemptsToday = user.loginHistory
      ?.filter(log => 
        log.userAgent?.includes('password-reset') && 
        new Date(log.timestamp).toDateString() === new Date().toDateString()
      ).length || 0;
    
    if (resetAttemptsToday >= 3) {
      logSecurityEvent('PASSWORD_RESET_RATE_LIMIT_EXCEEDED', user._id, ip, { email: user.email });
      
      return res.status(429).json({
        success: false,
        message: 'Too many password reset attempts. Please try again tomorrow.',
        code: 'RESET_RATE_LIMIT'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Log reset request
    await user.addLoginHistory(ip, 'password-reset', true);

    // Send password reset email
    try {
      await EmailService.sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      logSecurityEvent('PASSWORD_RESET_EMAIL_FAILED', user._id, ip, { 
        email: user.email,
        error: emailError.message 
      });
      
      // Rollback token generation
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

    // Log security event
    logSecurityEvent('PASSWORD_RESET_REQUESTED', user._id, ip, { email: user.email });

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    logSecurityEvent('PASSWORD_RESET_ERROR', null, req.ip, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset'
    });
  }
};

// Reset password with token validation
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!token || token.length !== 64) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&)'
      });
    }

    // Find user with valid token
    const user = await User.findByResetToken(token);
    if (!user) {
      logSecurityEvent('PASSWORD_RESET_FAILED', null, ip, { reason: 'invalid_token' });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if new password is same as any of the last 3 passwords
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const lastThreePasswords = user.passwordHistory.slice(-3);
      
      for (const oldPassword of lastThreePasswords) {
        const isOldPassword = await bcrypt.compare(newPassword, oldPassword.password);
        if (isOldPassword) {
          return res.status(400).json({
            success: false,
            message: 'You cannot reuse your last 3 passwords',
            code: 'PASSWORD_REUSE'
          });
        }
      }
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.suspiciousActivityDetected = false;
    
    await user.save();

    // Invalidate cache for this user
    await invalidateUserCache(user._id);

    // Generate new tokens
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Log password reset
    logSecurityEvent('PASSWORD_RESET_SUCCESS', user._id, ip, { email: user.email });

    // Send confirmation email
    try {
      await EmailService.sendPasswordChangedEmail(user, ip);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
      // Don't fail the reset if email fails
    }

    res.json({
      success: true,
      message: 'Password reset successful',
      token: authToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    logSecurityEvent('PASSWORD_RESET_ERROR', null, req.ip, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// Enhanced logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { deviceToken } = req.body;
    
    if (token) {
      // Add to blacklist with TTL (7 days in production)
      blacklist.add(token);
      
      // In production with Redis:
      // await redis.setex(`blacklist:${token}`, 604800, '1');
    }

    // Remove device token for push notifications
    if (deviceToken && req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        await user.removeDeviceToken(deviceToken);
        // Invalidate cache for this user
        await invalidateUserCache(user._id);
      }
    }

    // Log logout event
    logSecurityEvent('LOGOUT', req.user?._id, req.ip, { deviceTokenRemoved: !!deviceToken });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Enhanced refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: oldRefreshToken, deviceToken } = req.body;
    
    if (!oldRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(oldRefreshToken);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account inactive'
      });
    }

    // Update device token if provided
    if (deviceToken) {
      await user.addDeviceToken(deviceToken);
    }

    // Update last seen
    user.lastSeenAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Log token refresh
    logSecurityEvent('TOKEN_REFRESHED', user._id, req.ip, { deviceTokenUpdated: !!deviceToken });

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        emailVerified: user.emailVerified,
        isOnline: user.isOnline
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    logSecurityEvent('TOKEN_REFRESH_ERROR', null, req.ip, { error: error.message });
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error refreshing token'
    });
  }
};
const calculateMemberDuration = (createdAt) => {
  if (!createdAt) return 'Recently';
  const created = new Date(createdAt);
  const now = new Date();
  const diffYears = now.getFullYear() - created.getFullYear();
  const diffMonths = now.getMonth() - created.getMonth();
  
  if (diffYears > 0) {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
  }
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
};
// Get public user profile (for other users to see) with caching
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User account is not active'
      });
    }

    // Check privacy settings
    if (user.privacySettings.profileVisibility === 'private') {
      return res.status(403).json({
        success: false,
        message: 'This profile is private'
      });
    }

    // Check if profile is only for registered users
    if (user.privacySettings.profileVisibility === 'registered' && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Please login to view this profile'
      });
    }

    // Get the user document with the transform applied
    // We need to manually apply privacy settings
    const userObject = user.toObject();
    
    // Build public profile with manual privacy checks
    const publicProfile = {
      _id: userObject._id,
      name: userObject.name,
      picture: userObject.picture,
      bio: userObject.bio,
      rating: userObject.rating,
      totalReviews: userObject.totalReviews,
      responseRate: userObject.responseRate,
      responseTime: userObject.responseTime,
      occupation: userObject.occupation,
      education: userObject.education,
      languages: userObject.languages,
      createdAt: userObject.createdAt,
      isOnline: userObject.isOnline,
      accountType: userObject.accountType,
      completedOrders: userObject.completedOrders || 0,
      gender: userObject.gender,
      dateOfBirth: userObject.dateOfBirth,
      age: userObject.age,
      fullLocation: userObject.fullLocation,
      lastSeenAt: userObject.lastSeenAt
    };

    // Add location if allowed
    if (userObject.privacySettings.showLocation) {
      publicProfile.country = userObject.country;
      publicProfile.city = userObject.city;
      publicProfile.fullLocation = userObject.fullLocation || 
        (userObject.city && userObject.country ? 
          `${userObject.city}, ${userObject.country}` : null);
    }

    // Add email if allowed (always show for the profile owner)
    if (req.user && req.user._id.toString() === userId.toString()) {
      // Always show email to the profile owner
      publicProfile.email = userObject.email;
    } else if (userObject.privacySettings.showEmail) {
      // Show email to others if privacy settings allow
      publicProfile.email = userObject.email;
    }

    // Add phone if allowed
    if (userObject.privacySettings.showPhone) {
      publicProfile.phoneNumber = userObject.phoneNumber;
    }

    // Add last seen if allowed
    if (!userObject.privacySettings.showLastSeen) {
      delete publicProfile.lastSeenAt;
    }

    // Add social links
    if (userObject.linkedin) publicProfile.linkedin = userObject.linkedin;
    if (userObject.github) publicProfile.github = userObject.github;
    if (userObject.website) publicProfile.website = userObject.website;

    // Add privacy settings (for the frontend to know what's visible)
    publicProfile.privacySettings = userObject.privacySettings;

    // Calculate member duration for display
    const memberSince = calculateMemberDuration(userObject.createdAt);
    publicProfile.memberSince = memberSince;

    res.json({
      success: true,
      profile: publicProfile
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving profile'
    });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to deactivate account'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Deactivate account
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || 'User requested';
    
    await user.save({ validateBeforeSave: false });

    // Invalidate cache for this user
    await invalidateUserCache(user._id);

    // Invalidate all tokens
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      blacklist.add(token);
    }

    // Log deactivation
    logSecurityEvent('ACCOUNT_DEACTIVATED', user._id, req.ip, { reason });

    // Send deactivation email
    try {
      await EmailService.sendAccountDeactivatedEmail(user, reason);
    } catch (emailError) {
      console.error('Failed to send account deactivated email:', emailError);
      // Don't fail deactivation if email fails
    }

    res.json({
      success: true,
      message: 'Account deactivated successfully',
      reactivationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    logSecurityEvent('ACCOUNT_DEACTIVATION_ERROR', req.user?._id, req.ip, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Server error deactivating account'
    });
  }
};

const reactivateAccount = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if account is deactivated
    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is already active'
      });
    }

    // Check if deactivated for more than 30 days
    if (user.deactivatedAt && (Date.now() - user.deactivatedAt) > 30 * 24 * 60 * 60 * 1000) {
      return res.status(410).json({
        success: false,
        message: 'Account cannot be reactivated after 30 days. Please create a new account.',
        code: 'ACCOUNT_PERMANENTLY_DELETED'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logSecurityEvent('REACTIVATION_FAILED', user._id, ip, { reason: 'wrong_password' });
      
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Reactivate account
    user.isActive = true;
    user.deactivatedAt = undefined;
    user.deactivationReason = undefined;
    
    await user.save({ validateBeforeSave: false });

    // Invalidate cache for this user
    await invalidateUserCache(user._id);

    // Generate new tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Log reactivation
    logSecurityEvent('ACCOUNT_REACTIVATED', user._id, ip, { email: user.email });

    // Send reactivation email
    try {
      await EmailService.sendAccountReactivatedEmail(user);
    } catch (emailError) {
      console.error('Failed to send account reactivated email:', emailError);
      // Don't fail reactivation if email fails
    }

    res.json({
      success: true,
      message: 'Account reactivated successfully',
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Reactivate account error:', error);
    logSecurityEvent('ACCOUNT_REACTIVATION_ERROR', null, req.ip, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Server error reactivating account'
    });
  }
};

const handleJSONErrors = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body',
      error: err.message,
      code: 'INVALID_JSON'
    });
  }
  next(err);
};

const verifyEmailRedirect = async (req, res) => {
  try {
    const { token } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!token || token.length !== 64) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Token - Vorkana</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 500px; margin: 0 auto; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Invalid Verification Link</h1>
            <p>The verification link is invalid or has expired.</p>
            <a href="${process.env.FRONTEND_URL}/resend-verification">Resend Verification Email</a>
          </div>
        </body>
        </html>
      `);
    }

    const user = await User.findByVerificationToken(token);
    if (!user) {
      logSecurityEvent('EMAIL_VERIFICATION_FAILED_REDIRECT', null, ip, { reason: 'invalid_token' });
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Token - Vorkana</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 500px; margin: 0 auto; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Invalid Verification Link</h1>
            <p>The verification link has expired.</p>
            <a href="${process.env.FRONTEND_URL}/resend-verification">Request a new verification email</a>
          </div>
        </body>
        </html>
      `);
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.redirect(`${process.env.FRONTEND_URL}/verified?status=already`);
    }

    // Verify the email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.suspiciousActivityDetected = false;
    await user.save();
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Invalidate cache for this user
    await invalidateUserCache(user._id);
    
    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Log verification
    logSecurityEvent('EMAIL_VERIFIED_REDIRECT', user._id, ip, { email: user.email });

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Create a redirect page with token storage
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - Vorkana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          .success-icon {
            font-size: 48px;
            color: #10b981;
            margin-bottom: 20px;
          }
          h1 {
            color: #111827;
            margin-bottom: 10px;
          }
          p {
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #10b981;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Email Verified Successfully!</h1>
          <p>Your email has been verified. You're being logged in...</p>
          <div class="spinner"></div>
        </div>
        <script>
          // ✅ FIX: Use the correct variable names
          localStorage.setItem('userToken', '${authToken}');
          localStorage.setItem('refreshToken', '${refreshToken}');
          
          // Store user info
          localStorage.setItem('userInfo', JSON.stringify({
            _id: '${user._id}',
            name: '${user.name.replace(/'/g, "\\'")}',
            email: '${user.email}',
            role: '${user.role}',
            emailVerified: true
          }));
          
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = '${process.env.FRONTEND_URL}/dashboard?verified=true';
          }, 1500);
        </script>
      </body>
      </html>
    `;

    res.send(redirectHtml);

  } catch (error) {
    console.error('Verify email redirect error:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Vorkana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #fef2f2;
          }
          .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .error-icon {
            color: #dc2626;
            font-size: 48px;
            margin-bottom: 20px;
          }
          .error { 
            color: #dc2626; 
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
          }
          .btn:hover {
            background: #059669;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">⚠️</div>
          <h1 class="error">Verification Error</h1>
          <p>There was an error verifying your email. Please try again.</p>
          <a href="${process.env.FRONTEND_URL}/resend-verification" class="btn">
            Resend Verification Email
          </a>
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
            <a href="${process.env.FRONTEND_URL}" style="color: #10b981;">Return to Home</a>
          </p>
        </div>
      </body>
      </html>
    `;
    
    res.status(500).send(errorHtml);
  }
};

// Password reset redirect handler
const resetPasswordRedirect = async (req, res) => {
  try {
    const { token } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!token || token.length !== 64) {
      logSecurityEvent('PASSWORD_RESET_INVALID_TOKEN_REDIRECT', null, ip, { token });
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Reset Link - Vorkana</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="refresh" content="3;url=${process.env.FRONTEND_URL}/forgot-password">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; padding: 0;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              background: white; 
              border-radius: 16px; 
              padding: 40px; 
              max-width: 500px; 
              width: 90%;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .error-icon {
              color: #dc2626;
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { 
              color: #111827; 
              margin-bottom: 10px; 
            }
            p { 
              color: #4b5563; 
              margin-bottom: 20px; 
              line-height: 1.6;
            }
            .spinner {
              display: inline-block;
              width: 20px;
              height: 20px;
              border: 3px solid #f3f3f3;
              border-top: 3px solid #dc2626;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-right: 10px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .link {
              color: #10b981;
              text-decoration: none;
              font-weight: 500;
            }
            .link:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠️</div>
            <h1>Invalid Reset Link</h1>
            <p>The password reset link is invalid or has expired.</p>
            <p>Redirecting you to request a new reset link...</p>
            <p><span class="spinner"></span> 3 seconds</p>
            <p style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/forgot-password" class="link">
                Click here if not redirected
              </a>
            </p>
          </div>
        </body>
        </html>
      `);
    }

    const user = await User.findByResetToken(token);
    if (!user) {
      logSecurityEvent('PASSWORD_RESET_EXPIRED_TOKEN_REDIRECT', null, ip, { token });
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Reset Link - Vorkana</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="refresh" content="3;url=${process.env.FRONTEND_URL}/forgot-password">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; padding: 0;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              background: white; 
              border-radius: 16px; 
              padding: 40px; 
              max-width: 500px; 
              width: 90%;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .warning-icon {
              color: #f59e0b;
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { 
              color: #111827; 
              margin-bottom: 10px; 
            }
            p { 
              color: #4b5563; 
              margin-bottom: 20px; 
              line-height: 1.6;
            }
            .spinner {
              display: inline-block;
              width: 20px;
              height: 20px;
              border: 3px solid #f3f3f3;
              border-top: 3px solid #f59e0b;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-right: 10px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background: #10b981;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 500;
              margin-top: 10px;
            }
            .btn:hover {
              background: #059669;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="warning-icon">⏰</div>
            <h1>Reset Link Expired</h1>
            <p>This password reset link has expired. Please request a new one.</p>
            <p>Redirecting you to request a new reset link...</p>
            <p><span class="spinner"></span> 3 seconds</p>
            <div style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn">
                Request New Reset Link
              </a>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Check if token is expired
    if (user.resetPasswordExpires < Date.now()) {
      logSecurityEvent('PASSWORD_RESET_EXPIRED_REDIRECT', user._id, ip, { email: user.email });
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired - Vorkana</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="refresh" content="5;url=${process.env.FRONTEND_URL}/forgot-password">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; padding: 0;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              background: white; 
              border-radius: 16px; 
              padding: 40px; 
              max-width: 500px; 
              width: 90%;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .warning-icon {
              color: #f59e0b;
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { 
              color: #111827; 
              margin-bottom: 10px; 
            }
            p { 
              color: #4b5563; 
              margin-bottom: 20px; 
              line-height: 1.6;
            }
            .countdown {
              font-size: 24px;
              font-weight: bold;
              color: #10b981;
              margin: 20px 0;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background: #10b981;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 500;
            }
            .btn:hover {
              background: #059669;
            }
          </style>
          <script>
            let countdown = 5;
            const countdownElement = document.getElementById('countdown');
            const interval = setInterval(() => {
              countdown--;
              countdownElement.textContent = countdown;
              if (countdown <= 0) {
                clearInterval(interval);
              }
            }, 1000);
          </script>
        </head>
        <body>
          <div class="container">
            <div class="warning-icon">⏰</div>
            <h1>Reset Link Has Expired</h1>
            <p>Password reset links are valid for 15 minutes only.</p>
            <p>Please request a new reset link.</p>
            <div class="countdown" id="countdown">5</div>
            <p>Redirecting in <span id="countdown">5</span> seconds...</p>
            <div style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn">
                Get New Reset Link
              </a>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Valid token - redirect to frontend with token
    logSecurityEvent('PASSWORD_RESET_REDIRECT_SUCCESS', user._id, ip, { email: user.email });

    // Create redirect page
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Password - Vorkana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          .success-icon {
            color: #10b981;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #111827;
            margin-bottom: 10px;
          }
          p {
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #10b981;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">🔒</div>
          <h1>Reset Your Password</h1>
          <p>You're being redirected to reset your password...</p>
          <div class="spinner"></div>
        </div>
        <script>
          // Store token in localStorage and redirect
          localStorage.setItem('resetToken', '${token}');
          
          // Redirect to frontend reset page
          setTimeout(() => {
            window.location.href = '${process.env.FRONTEND_URL}/reset-password?token=${token}';
          }, 1000);
          
          // Fallback: If localStorage fails, use URL parameter
          setTimeout(() => {
            window.location.href = '${process.env.FRONTEND_URL}/reset-password?token=${token}';
          }, 2000);
        </script>
      </body>
      </html>
    `;

    res.send(redirectHtml);

  } catch (error) {
    console.error('Reset password redirect error:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Vorkana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 0;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            background: white; 
            border-radius: 16px; 
            padding: 40px; 
            max-width: 500px; 
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          .error-icon {
            color: #dc2626;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 { 
            color: #dc2626; 
            margin-bottom: 10px; 
          }
          p { 
            color: #4b5563; 
            margin-bottom: 20px; 
            line-height: 1.6;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin-top: 10px;
          }
          .btn:hover {
            background: #059669;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">⚠️</div>
          <h1>Something Went Wrong</h1>
          <p>We encountered an error processing your reset request.</p>
          <p>Please try requesting a new password reset link.</p>
          <div style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn">
              Request New Reset Link
            </a>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
            <a href="${process.env.FRONTEND_URL}" style="color: #10b981;">Return to Home</a>
          </p>
        </div>
      </body>
      </html>
    `;
    
    res.status(500).send(errorHtml);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getPublicProfile,
  deactivateAccount,
  reactivateAccount,
  generateToken,
  generateRefreshToken,
  verifyEmailRedirect,
  resetPasswordRedirect,
  handleJSONErrors
};