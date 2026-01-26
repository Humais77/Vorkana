const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { promisify } = require('util');
const mongoose = require('mongoose');
const EmailService = require('../services/email.service');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const asyncHandler = require('express-async-handler');
const { performance } = require('perf_hooks');
const SessionService = require('../services/session.service');
const SessionMiddleware = require("../middleware/session.middleware.js")
const cache = require('../utils/cache.js');
const Session = require('../models/session.model');
const CSRFMiddleware = require('../middleware/csrf.middleware');
const generateToken = (id, role = 'user') => {
  try {
    const expiresIn = role === 'admin' ? '1h' : '3h';
    console.log(`🔐 Generating ${role} token, expires in: ${expiresIn}`);
    
    // Calculate expiration timestamp correctly
    const expiresInSeconds = role === 'admin' ? 3600 : 10800; // 1h or 3h in seconds
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    
    const token = jwt.sign(
      { 
        id, 
        role,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: expiresAt  // Explicitly set expiration
      }, 
      process.env.JWT_SECRET, 
      {
        expiresIn,
        issuer: 'Vorkanna',
        audience: 'Vorkanna-web'
      }
    );
    
    // Verify it was created correctly
    const decoded = jwt.decode(token);
    const expirationDate = new Date(decoded.exp * 1000);
    console.log(`✅ Token generated for ${id}:`, {
      expiresAt: expirationDate.toISOString(),
      localTime: expirationDate.toLocaleString(),
      expiresIn: `${Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60)} minutes from now`
    });
    
    return token;
  } catch (error) {
    console.error('❌ Token generation failed:', error);
    throw error;
  }
};

const generateRefreshToken = (id, role = 'user') => {
  try {
    const expiresIn = role === 'admin' ? '7d' : '30d';
    console.log(`🔐 Generating ${role} refresh token, expires in: ${expiresIn}`);
    
    // Calculate expiration for refresh token
    const expiresInSeconds = role === 'admin' ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    
    const token = jwt.sign(
      { 
        id, 
        role,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: expiresAt
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn,
        issuer: 'Vorkanna',
        audience: 'Vorkanna-web'
      }
    );
    
    const decoded = jwt.decode(token);
    const expirationDate = new Date(decoded.exp * 1000);
    console.log(`✅ Refresh token generated:`, {
      expiresAt: expirationDate.toISOString(),
      localTime: expirationDate.toLocaleString(),
      expiresInDays: Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60 / 60 / 24)
    });
    
    return token;
  } catch (error) {
    console.error('❌ Refresh token generation failed:', error);
    throw error;
  }
};

// UPDATED verifyToken functions
const verifyToken = async (token) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }
    
    console.log('🔍 Verifying token:', {
      length: token.length,
      startsWith: token.substring(0, 10) + '...'
    });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified:', {
      id: decoded.id,
      role: decoded.role,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'none',
      expiresIn: decoded.exp ? Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60) + ' minutes' : 'none'
    });
    
    return decoded;
  } catch (error) {
    console.error('❌ Token verification failed:', {
      name: error.name,
      message: error.message,
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20)
    });
    throw error;
  }
};

const verifyRefreshToken = async (token) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid refresh token format');
    }
    
    return await promisify(jwt.verify)(
      token, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    throw error;
  }
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

const register = asyncHandler(async (req, res) => {
  try {
    const { name, email, password, phoneNumber, dateOfBirth, gender, country, city } = req.body;

    // 1. Basic validations
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // 2. Check for existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // If user exists and is verified
      if (existingUser.emailVerified) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }
      
      // If user exists but is pending, delete it
      if (existingUser.registrationStatus === 'pending') {
        await User.deleteOne({ _id: existingUser._id });
      }
    }

    // 3. Prepare registration data
    const registrationData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      phoneNumber: phoneNumber || '',
      dateOfBirth: dateOfBirth || null,
      gender: gender || '',
      country: country || '',
      city: city || '',
      role: 'user'
    };

    // 4. Create minimal user document
    const user = new User({
      email: registrationData.email,
      registrationData: registrationData,
      registrationStatus: 'pending',
      emailVerified: false,
      isActive: false,
    });

    // 5. Generate verification token - FIXED METHOD NAME
    const verificationToken = user.generateVerificationToken();
    
    // 6. Save user with pending status
    await user.save({ validateBeforeSave: false });

    // 7. Send verification email
    try {
      await EmailService.sendVerificationEmail(user.email, user.registrationData.name, verificationToken);
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
      // Don't fail registration if email fails
    }

    const csrfToken = CSRFMiddleware.generateToken(req, res);
    console.log(`✅ Registration initiated for: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      user: {
        email: user.email,
        registrationStatus: 'pending'
      },
      csrfToken
    });

  } catch (error) {
    console.error('Registration error:', error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      code: 'REGISTRATION_ERROR'
    });
  }
});


const login = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password, deviceToken, deviceType } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log('🔐 Login attempt:', { 
      email, 
      ip,
      timestamp: new Date().toISOString() 
    });

    // 1. Basic validations
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // 2. Find user with optimized query - REMOVED admin controller reference
    console.time('User lookup');
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      emailVerified: true,
      registrationStatus: 'verified',
      isActive: true
    }).select('+password +failedLoginAttempts +lockUntil +suspiciousActivityDetected name role picture phoneNumber country city bio rating email');
    console.timeEnd('User lookup');

    if (!user) {
      console.log('❌ User not found or not verified/active');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account not verified'
      });
    }

    // 3. Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      console.log('🔒 Account locked:', { remainingTime });
      return res.status(423).json({
        success: false,
        message: `Account is locked. Try again in ${remainingTime} minutes.`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    // 4. Verify password
    console.time('Password verification');
    const isPasswordValid = await user.comparePassword(password);
    console.timeEnd('Password verification');
    
    if (!isPasswordValid) {
      console.log('❌ Password invalid');
      
      // Log failed attempt in background
      process.nextTick(async () => {
        try {
          await user.incrementLoginAttempts();
          await user.loginHistory(ip, userAgent, false);
        } catch (err) {
          console.error('Error logging failed attempt:', err.message);
        }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ Password valid, proceeding with login...');

    // 5. Reset login attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastSeenAt = new Date();
    user.suspiciousActivityDetected = false;
    
    // Save user in background
    process.nextTick(async () => {
      try {
        await user.save({ validateBeforeSave: false });
      } catch (err) {
        console.error('Error saving user:', err.message);
      }
    });

    // 6. Create session - ONLY for regular users, not calling admin controller
    SessionMiddleware.clearAuthCookies(res);
    console.time('Session creation');
    const session = await SessionService.createSession(user._id, req, {
      loginType: 'email_password',
      source: 'web',
      userRole: user.role
    });
    console.timeEnd('Session creation');

    console.log('🎯 Session created:', {
      sessionId: session.sessionId,
      userRole: user.role
    });

    // 7. Generate CSRF token
    const csrfToken = CSRFMiddleware.generateToken(req, res);

    // 8. Set cookies
    SessionMiddleware.setAuthCookies(res, session.token, session.refreshToken, csrfToken);

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
    isOnline: true,
    accountType: user.accountType || 'basic',
    lastSeenAt: new Date().toISOString(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

    const responseTime = Date.now() - startTime;
    console.log(`✅ Login completed in ${responseTime}ms for:`, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      session: {
        expiresAt: session.expiresAt,
        idleTimeout: user.role === 'admin' ? 60 * 60 * 1000 : 3 * 60 * 60 * 1000,
        timeoutMinutes: user.role === 'admin' ? 60 : 180
      },
      csrfToken,
      performance: {
        responseTime: `${responseTime}ms`,
        serverTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🔥 Login error:', error.message);
    console.error('Error stack:', error.stack);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      code: 'LOGIN_ERROR',
      performance: {
        responseTime: `${responseTime}ms`
      }
    });
  }
});
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
    const csrfValidation = validateCSRF(req);
    if (!csrfValidation.valid) {
      return res.status(403).json({
        success: false,
        message: 'Security validation failed',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
    const { 
      name, 
      email, 
      phoneNumber, 
      bio, 
      gender, 
      dateOfBirth, 
      country, 
      city,
      languages,
      occupation,
      education,
      github,
      linkedin,
      website,
      privacySettings
    } = req.body;

    console.log('📝 Profile update request:', {
      userId: req.user._id,
      fields: Object.keys(req.body),
      hasPrivacySettings: !!privacySettings
    });

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data with validation
    const updateData = {};
    
    // Only update fields that are provided and pass validation
    const updateField = (field, value, validationFn = null) => {
      if (value !== undefined) {
        if (validationFn && !validationFn(value)) return false;
        updateData[field] = value;
        return true;
      }
      return false;
    };

    // Update basic fields
    if (name) updateData.name = sanitizeInput(name.trim());
    if (bio !== undefined) updateData.bio = sanitizeInput(bio);
    
    // Update contact info
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber || '';
    }
    
    // Update location
    if (country !== undefined) updateData.country = country || '';
    if (city !== undefined) updateData.city = city || '';
    
    // Update arrays
    if (languages !== undefined) {
      updateData.languages = Array.isArray(languages) ? languages : [];
    }
    
    // Update other fields
    if (occupation !== undefined) updateData.occupation = occupation || '';
    if (education !== undefined) updateData.education = education || '';
    if (github !== undefined) updateData.github = github || '';
    if (linkedin !== undefined) updateData.linkedin = linkedin || '';
    if (website !== undefined) updateData.website = website || '';
    if (gender !== undefined) updateData.gender = gender || '';
    
    // Update date of birth with validation
    if (dateOfBirth !== undefined) {
      if (dateOfBirth && !validateDateOfBirth(dateOfBirth)) {
        return res.status(400).json({
          success: false,
          message: 'You must be at least 13 years old and not older than 120 years'
        });
      }
      updateData.dateOfBirth = dateOfBirth || null;
    }
    
    // Update privacy settings
    if (privacySettings !== undefined) {
      updateData.privacySettings = {
        profileVisibility: privacySettings.profileVisibility || 'public',
        showEmail: !!privacySettings.showEmail,
        showPhone: !!privacySettings.showPhone,
        showLocation: !!privacySettings.showLocation,
        showLastSeen: !!privacySettings.showLastSeen
      };
    }

    console.log('✅ Update data prepared:', Object.keys(updateData));

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

    console.log('✅ Profile updated successfully for user:', updatedUser.email);

    // Prepare response
    const userResponse = {
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
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
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

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already taken'
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
 const csrfValidation = validateCSRF(req);
    if (!csrfValidation.valid) {
      return res.status(403).json({
        success: false,
        message: 'Security validation failed',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
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

const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token || token.length !== 64) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token format'
      });
    }

    // Find user by verification token
    const user = await User.findByVerificationToken(token);
    
    if (!user) {
      // Check if user might already be verified
      const crypto = require('crypto');
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      // Find any user who had this token (even if cleared)
      const potentialUser = await User.findOne({
        $or: [
          { verificationToken: hashedToken },
          { 'registrationData.email': { $exists: true } }
        ]
      });
      
      if (potentialUser) {
        // Check if user is already verified
        if (potentialUser.emailVerified && potentialUser.registrationStatus === 'verified') {
          console.log(`✅ User already verified: ${potentialUser.email}`);
          return res.json({
            success: true,
            message: 'Email is already verified. You can now login to your account.',
            alreadyVerified: true,
            email: potentialUser.email,
            redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?verified=true&email=${encodeURIComponent(potentialUser.email)}`
          });
        }
        
        // Check if registration expired
        if (potentialUser.registrationExpiresAt && potentialUser.registrationExpiresAt < Date.now()) {
          return res.status(400).json({
            success: false,
            message: 'Verification link has expired. Please register again.',
            code: 'VERIFICATION_EXPIRED'
          });
        }
      }
      
      console.log('Verification failed: Invalid token or expired');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    console.log(`Found user for verification: ${user.email}`);

    // Complete the registration process
    await user.verifyAndCompleteRegistration();
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Email verified for: ${user.email}`);

    // Return success response
    res.json({
      success: true,
      message: 'Email verified successfully! You can now login to your account.',
      verified: true,
      email: user.email,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?verified=true&email=${encodeURIComponent(user.email)}`
    });

  } catch (error) {
    console.error('Verify email error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error verifying email',
      code: 'VERIFICATION_ERROR'
    });
  }
});
const resendVerificationEmail = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find pending registration
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      registrationStatus: 'pending',
      emailVerified: false
    });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If a registration exists with this email, you will receive a verification email'
      });
    }

    // Generate new verification token - FIXED METHOD NAME
    const verificationToken = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user.email, user.registrationData?.name || 'User', verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error sending verification email'
    });
  }
});
const checkVerificationStatus = asyncHandler(async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('emailVerified registrationStatus name')
      .lean();

    res.json({
      success: true,
      isVerified: user?.emailVerified || false,
      registrationStatus: user?.registrationStatus || 'none',
      name: user?.name || null
    });
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking verification status'
    });
  }
});

// Forgot password with enhanced security
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Security: Don't reveal if user exists
    if (!user) {
      logSecurityEvent('PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL', null, ip, { email });
      
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logSecurityEvent('PASSWORD_RESET_REQUEST_INACTIVE_ACCOUNT', user._id, ip, { email: user.email });
      
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Check if user is verified
    if (!user.emailVerified || user.registrationStatus !== 'verified') {
      logSecurityEvent('PASSWORD_RESET_REQUEST_UNVERIFIED_ACCOUNT', user._id, ip, { email: user.email });
      
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    console.log(`Generated reset token for user: ${user.email}`);

    // Send password reset email
    try {
      await EmailService.sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Rollback token generation
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset'
    });
  }
});

// Reset password with token validation
const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    console.log('Reset password request received:', { 
      tokenLength: token?.length,
      hasPassword: !!newPassword 
    });
    
    if (!token || token.length !== 64) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token format'
      });
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[@$!%*?&]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)'
      });
    }

    // Find user with valid reset token
    console.log('Looking for user with reset token...');
    const user = await User.findByResetToken(token);
    
    if (!user) {
      console.log('No user found with valid reset token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    console.log(`Found user for password reset: ${user.email}`);

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Check if new password is same as any of the last 3 passwords
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const lastThreePasswords = user.passwordHistory.slice(-3);
      
      for (const oldPassword of lastThreePasswords) {
        try {
          const isOldPassword = await bcrypt.compare(newPassword, oldPassword.password);
          if (isOldPassword) {
            return res.status(400).json({
              success: false,
              message: 'You cannot reuse your last 3 passwords',
              code: 'PASSWORD_REUSE'
            });
          }
        } catch (bcryptError) {
          console.error('Error comparing passwords:', bcryptError);
        }
      }
    }

    // Store old password in history before updating
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }
    
    // Keep only last 5 passwords
    if (user.passwordHistory.length >= 5) {
      user.passwordHistory.shift();
    }
    
    // Add current password to history before changing it
    if (user.password) {
      user.passwordHistory.push({
        password: user.password,
        changedAt: new Date()
      });
    }

    // Set new password (will be hashed in pre-save middleware)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.suspiciousActivityDetected = false;
    user.lastPasswordChangeAt = new Date();
    
    // Save the user (password will be hashed automatically)
    await user.save({ validateBeforeSave: false });

    // Clear reset-related fields after save
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Password reset successful for: ${user.email}`);

    // Log password reset
    logSecurityEvent('PASSWORD_RESET_SUCCESS', user._id, ip, { email: user.email });

    // Send confirmation email
    try {
      await EmailService.sendPasswordChangedEmail(user, ip);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
      // Don't fail the reset if email fails
    }
 const csrfToken = CSRFMiddleware.generateToken(req, res);

    // Return success WITHOUT tokens (user should login separately)
    res.json({
      success: true,
      message: 'Password reset successful! Please login with your new password.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
       csrfToken
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    // Handle specific errors
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
      message: 'Server error resetting password',
      code: 'RESET_ERROR'
    });
  }
});
const refreshCSRFToken = asyncHandler(async (req, res) => {
  try {
    // Only allow authenticated users to refresh CSRF token
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Generate new CSRF token
    const csrfToken = CSRFMiddleware.generateToken(req, res);
    
    res.json({
      success: true,
      csrfToken,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
  } catch (error) {
    console.error('CSRF token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh CSRF token'
    });
  }
});

const validateCSRF = (req) => {
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  return CSRFMiddleware.validateToken(req, token);
};

const logout = asyncHandler(async (req, res) => {
  try {
    console.log('🚪 Logout request');
    
    // Get current cookies to clear
    const cookiesToClear = [
      'token', 
      'refreshToken', 
      'csrfToken', 
      'isAuthenticated',
      'isAdmin'
    ];
    
    // Clear ALL cookies with multiple paths
    cookiesToClear.forEach(cookie => {
      res.clearCookie(cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      res.clearCookie(cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/admin'
      });
    });
    
    // Clear CSRF specifically
    CSRFMiddleware.clearCSRFCookie(res);
    
    // If we have a session, end it
    if (req.sessionID) {
      try {
        await SessionService.logoutSession(
          req.sessionID,
          req.user?._id,
          'manual'
        );
      } catch (sessionError) {
        console.error('Session logout error:', sessionError.message);
      }
    }
    
    console.log('✅ Logout completed - cookies cleared');
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      requiresReload: true
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies on error
    ['token', 'refreshToken', 'csrfToken', 'isAuthenticated'].forEach(cookie => {
      res.clearCookie(cookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
    });
    
    res.json({
      success: true,
      message: 'Logged out (cookies cleared)',
      requiresReload: true
    });
  }
});
const getActiveSessions = asyncHandler(async (req, res) => {
  try {
    const sessions = await SessionService.getUserSessions(req.user._id);
    
    // Mark current session
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.id === req.sessionID
    }));

    res.json({
      success: true,
      sessions: sessionsWithCurrent
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions'
    });
  }
});

// New: Terminate specific session
const terminateSession = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (sessionId === req.sessionID) {
      return res.status(400).json({
        success: false,
        message: 'Cannot terminate current session'
      });
    }

    const terminated = await SessionService.logoutSession(
      sessionId,
      req.user._id,
      'manual'
    );

    if (terminated) {
      res.json({
        success: true,
        message: 'Session terminated'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session'
    });
  }
});

// New: Terminate all other sessions
const terminateAllOtherSessions = asyncHandler(async (req, res) => {
  try {
    await SessionService.logoutAllUserSessions(req.user._id, req.sessionID);
    
    res.json({
      success: true,
      message: 'All other sessions terminated'
    });
  } catch (error) {
    console.error('Terminate all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate sessions'
    });
  }
});

const refreshSession = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    // CSRF validation (except for refresh token endpoint)
    if (req.path !== '/api/auth/refresh') {
      const csrfValidation = validateCSRF(req);
      if (!csrfValidation.valid) {
        return res.status(403).json({
          success: false,
          message: 'Security validation failed',
          code: 'CSRF_TOKEN_INVALID'
        });
      }
    }

    const refreshed = await SessionService.refreshSession(refreshToken);
    
    if (!refreshed) {
      throw new Error('Invalid refresh token');
    }

    // Generate new CSRF token
    const csrfToken = CSRFMiddleware.generateToken(req, res);

    res.json({
      success: true,
      message: 'Session refreshed successfully',
      expiresAt: refreshed.expiresAt,
      idleTimeout: 15 * 60 * 1000,
      csrfToken
    });
  } catch (error) {
    console.error('Refresh session error:', error.message);
    
    CSRFMiddleware.clearCSRFCookie(res);
    
    let errorCode = 'REFRESH_FAILED';
    let errorMessage = 'Session refresh failed';
    let statusCode = 401;

    if (error.message.includes('idle') || error.message.includes('timeout')) {
      errorCode = 'SESSION_IDLE_TIMEOUT';
      errorMessage = 'Session idle timeout. Please login again.';
    } else if (error.message.includes('Invalid')) {
      errorCode = 'INVALID_REFRESH_TOKEN';
      errorMessage = 'Invalid refresh token';
    } else if (error.message.includes('expired')) {
      errorCode = 'SESSION_EXPIRED';
      errorMessage = 'Session expired. Please login again.';
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: errorCode,
      requiresLogin: true,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin`
    });
  }
});



const checkSessionStatus = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;
    
    if (!token) {
      return res.json({
        authenticated: false,
        message: 'No active session'
      });
    }

    const sessionResult = await SessionService.validateSession(token, refreshToken);
    
    if (sessionResult.valid) {
      const user = await User.findById(sessionResult.userId).select('-password');
      
      return res.json({
        authenticated: true,
        user: user,
        session: {
          id: sessionResult.sessionId,
          lastActivity: sessionResult.lastActivity,
          idleTimeout: 3 * 60 * 60 * 1000,
          timeRemaining: 3 * 60 * 60 * 1000 - (Date.now() - sessionResult.lastActivity.getTime())
        }
      });
    } else {
      // Try to refresh if we have a refresh token
      if (refreshToken) {
        try {
          const refreshed = await SessionService.refreshSession(refreshToken);
          
          if (refreshed) {
            SessionMiddleware.setAuthCookies(res, refreshed.token, refreshed.refreshToken);
            
            const user = await User.findById(sessionResult.userId || refreshed.userId).select('-password');
            
            return res.json({
              authenticated: true,
              user: user,
              session: {
                id: refreshed.sessionId,
                refreshed: true,
                expiresAt: refreshed.expiresAt
              }
            });
          }
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError.message);
        }
      }
      
      SessionMiddleware.clearAuthCookies(res);
      return res.json({
        authenticated: false,
        message: 'Session expired or invalid',
        requiresLogin: true
      });
    }
  } catch (error) {
    console.error('Check session status error:', error);
    SessionMiddleware.clearAuthCookies(res);
    res.json({
      authenticated: false,
      message: 'Error checking session status'
    });
  }
});


// Refresh Token - Updated
const refreshToken = asyncHandler(async (req, res) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    const { deviceToken } = req.body;
    
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
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'User not found or account inactive'
      });
    }

    // Update device token if provided
    if (deviceToken) {
      await user.deviceTokens(deviceToken);
    }

    // Update last seen
    user.lastSeenAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Set new cookies
    setAuthCookies(res, newToken, newRefreshToken);

    // Log token refresh
    logSecurityEvent('TOKEN_REFRESHED', user._id, req.ip, { deviceTokenUpdated: !!deviceToken });

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    clearAuthCookies(res);
    
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
});

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
  SessionMiddleware.setAuthCookies(res, token, refreshToken);
  const csrfToken = CSRFMiddleware.generateToken(req, res);
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
       csrfToken,
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
const verifyEmailRedirect = asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!token || token.length !== 64) {
      logSecurityEvent('EMAIL_VERIFICATION_FAILED_REDIRECT', null, ip, { reason: 'invalid_token_format' });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token format',
        code: 'INVALID_TOKEN_FORMAT',
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resend-verification`
      });
    }

    const user = await User.findByVerificationToken(token);
    if (!user) {
      logSecurityEvent('EMAIL_VERIFICATION_FAILED_REDIRECT', null, ip, { reason: 'invalid_or_expired_token' });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN',
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resend-verification`
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED',
        email: user.email,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?verified=true&email=${encodeURIComponent(user.email)}`,
        autoLogin: false
      });
    }

    // Verify the email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.suspiciousActivityDetected = false;
    await user.save();
    
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Set cookies for immediate login
    SessionMiddleware.setAuthCookies(res, authToken, refreshToken);

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

    return res.json({
      success: true,
      message: 'Email verified successfully! You have been automatically logged in.',
      code: 'VERIFICATION_SUCCESS',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        emailVerified: true
      },
      tokens: {
        token: authToken,
        refreshToken: refreshToken
      },
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?verified=true`,
      autoLogin: true
    });

  } catch (error) {
    console.error('Verify email redirect error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error verifying email',
      code: 'VERIFICATION_ERROR',
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resend-verification`
    });
  }
});

const resetPasswordRedirect = asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!token || token.length !== 64) {
      logSecurityEvent('PASSWORD_RESET_INVALID_TOKEN_REDIRECT', null, ip, { token });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid password reset token format',
        code: 'INVALID_RESET_TOKEN_FORMAT',
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password`
      });
    }

    const user = await User.findByResetToken(token);
    if (!user) {
      logSecurityEvent('PASSWORD_RESET_EXPIRED_TOKEN_REDIRECT', null, ip, { token });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
        code: 'INVALID_RESET_TOKEN',
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password`
      });
    }

    // Check if token is expired
    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      logSecurityEvent('PASSWORD_RESET_EXPIRED_REDIRECT', user._id, ip, { email: user.email });
      
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired. Please request a new one.',
        code: 'RESET_TOKEN_EXPIRED',
        expiresAt: user.resetPasswordExpires,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password`
      });
    }

    // Valid token
    logSecurityEvent('PASSWORD_RESET_REDIRECT_SUCCESS', user._id, ip, { email: user.email });

    return res.json({
      success: true,
      message: 'Valid password reset token',
      code: 'VALID_RESET_TOKEN',
      token: token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name
      },
      expiresAt: user.resetPasswordExpires,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`,
      expiresIn: user.resetPasswordExpires ? Math.max(0, Math.floor((user.resetPasswordExpires - Date.now()) / 1000)) : null
    });

  } catch (error) {
    console.error('Reset password redirect error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error processing password reset token',
      code: 'RESET_TOKEN_ERROR',
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password`
    });
  }
});

module.exports = {
  register,
  login,
  logout,
  refreshToken: refreshSession,
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
  handleJSONErrors,
  checkVerificationStatus,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  refreshSession,
  checkSessionStatus,
  refreshCSRFToken,
  validateCSRF
};