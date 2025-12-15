const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { promisify } = require('util');
const blacklist = new Set(); // In production, use Redis

// ========== TOKEN FUNCTIONS ==========
const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '7d', // Short-lived access token
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
      expiresIn: '7d',
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

// ========== HELPER FUNCTIONS ==========
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

const validatePassword = (password) => {
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

const sendEmail = async (to, subject, text, html) => {
  // In production, implement actual email sending
  console.log(`📧 Email to ${to}: ${subject}`);
  console.log(`Text: ${text}`);
  console.log(`HTML: ${html}`);
  return true;
};

// ========== CONTROLLER FUNCTIONS ==========

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name: validator.escape(name),
      email: email.toLowerCase(),
      password,
      role: 'user',
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await sendEmail(
      user.email,
      'Verify Your Email Address',
      `Please verify your email by clicking: ${verificationUrl}`,
      `<h1>Verify Your Email</h1><p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`
    );

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
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
    console.error('Registration error:', error);
    
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

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +failedLoginAttempts +lockUntil');
    
    // Check account lock
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account is locked. Try again in ${remainingTime} minutes.`
      });
    }

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      if (user) {
        await user.incrementLoginAttempts();
      }
      
      // Constant-time delay to prevent timing attacks
      await bcrypt.compare(password, '$2b$10$fakeHashForTimingPrevention');
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Add to blacklist (in production, use Redis with TTL)
      blacklist.add(token);
    }
    
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

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account inactive'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
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

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, picture } = req.body;
    
    // Validate inputs
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (picture && !validator.isURL(picture, { protocols: ['http', 'https'] })) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid URL for the picture'
      });
    }

    // Check if email is being changed
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already taken'
        });
      }
      
      // If email is changed, require verification
      user.emailVerified = false;
      const verificationToken = user.createEmailVerificationToken();
      
      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
      await sendEmail(
        email,
        'Verify Your New Email Address',
        `Please verify your new email by clicking: ${verificationUrl}`,
        `<h1>Verify Your New Email</h1><p>Click <a href="${verificationUrl}">here</a> to verify your new email.</p>`
      );
    }

    // Build update object with sanitization
    const updateData = {};
    if (name) updateData.name = validator.escape(name);
    if (email) updateData.email = email.toLowerCase();
    if (picture !== undefined) updateData.picture = picture;

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: email && email !== req.user.email ? 
        'Profile updated. Please verify your new email.' : 
        'Profile updated successfully',
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

// Change password
// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
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
    const validatePasswordStrength = (password) => {
      const minLength = 8;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[@$!%*?&]/.test(password);
      
      if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
      }
      
      if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
      }
      
      if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
      }
      
      if (!hasNumbers) {
        return { valid: false, message: 'Password must contain at least one number' };
      }
      
      if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
      }
      
      return { valid: true, message: 'Password is strong' };
    };

    const validationResult = validatePasswordStrength(newPassword);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: validationResult.message
      });
    }

    // Check password history (optional - prevent reusing last 3 passwords)
    // You can implement this if needed

    // Set the new password (pre-save hook will hash it)
    user.password = newPassword;
    
    // Save without validating the password field (since we already validated)
    // Or use validateBeforeSave: false
    await user.save({ validateBeforeSave: false });

    // Invalidate current token (add to blacklist)
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Add to blacklist
      const { tokenBlacklist } = require('../middleware/auth.middleware');
      tokenBlacklist.add(token);
    }

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
      // Optional: Provide a logout hint
      requiresReauth: true
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    // Handle validation errors
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
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findByVerificationToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying email'
    });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a verification email'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await sendEmail(
      user.email,
      'Verify Your Email Address',
      `Please verify your email by clicking: ${verificationUrl}`,
      `<h1>Verify Your Email</h1><p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`
    );

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
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Security: Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      user.email,
      'Password Reset Request',
      `You requested a password reset. Click: ${resetUrl}\n\nThis link expires in 15 minutes.`,
      `<h1>Password Reset</h1><p>Click <a href="${resetUrl}">here</a> to reset your password.</p><p>This link expires in 15 minutes.</p>`
    );

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
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with uppercase, lowercase, number and special character'
      });
    }

    // Find user with valid token
    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Set new password
    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    // Generate new tokens
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      token: authToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// Create admin user (protected - one-time setup)
const createAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Only allow in development or with special key
    const secretKey = req.headers['x-admin-secret'] || req.query.secret;
    if (process.env.NODE_ENV === 'production' && secretKey !== process.env.ADMIN_CREATE_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
      });
    }

    const hashedPassword = await hashPassword(password);

    const admin = await User.create({
      name: validator.escape(name || 'Admin'),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      emailVerified: true
    });

    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    console.log(`✅ Admin created: ${admin.email}`);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      token,
      refreshToken,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating admin'
    });
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
  createAdmin,
  generateToken,
  generateRefreshToken
};