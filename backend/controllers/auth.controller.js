const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Helper functions
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Fix seller password (run this once to fix existing seller)
const fixSellerPassword = async () => {
  try {
    const seller = await User.findOne({ email: 'seller@example.com' });
    if (seller && seller.password === 'seller123') {
      seller.password = await hashPassword('seller123');
      await seller.save();
      console.log('Seller password fixed');
    }
  } catch (error) {
    console.error('Error fixing seller password:', error);
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    console.log('Registration attempt:', { name, email, password, role });

    // Validation
    if (!name || !email || !password) {
      console.log('Missing fields:', { name, email, password });
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        required: ['name', 'email', 'password']
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create user - password will be auto-hashed by pre-save hook
    const user = await User.create({
      name,
      email,
      password,  // Raw password - will be hashed by pre-save hook
      role
    });

    console.log('User created:', user._id);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        picture: user.picture
      }
    });

  } catch (error) {
    console.error('Registration error details:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password - handle both plain text (legacy) and hashed passwords
    let isPasswordValid = false;
    
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // Password is hashed with bcrypt
      isPasswordValid = await comparePassword(password, user.password);
    } else {
      // Password is plain text (legacy) - hash and compare
      const hashedInput = await hashPassword(password);
      // This won't match, so we need to fix the password
      if (user.password === password) {
        // Fix the password by hashing it
        user.password = await hashPassword(password);
        await user.save();
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        picture: user.picture,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
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
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
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
    
    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already taken'
        });
      }
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (picture !== undefined) updateData.picture = picture;

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        isVerified: user.isVerified
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
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and set expiry (10 minutes)
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save();

    // In production, you would send an email here
    // For testing, we'll return the token
    console.log('Password reset token:', resetToken);
    console.log('Reset URL:', `http://localhost:3000/reset-password?token=${resetToken}`);

    res.json({
      success: true,
      message: 'Password reset email sent',
      // Only include token in development for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
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
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }

    // Hash the token to compare with stored token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

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
    
    await user.save();

    // Generate new token for automatic login
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      token: authToken,
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

// Create admin user (one-time setup)
const createAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Only allow in development or with special key
    if (process.env.NODE_ENV !== 'development' && req.query.secret !== process.env.ADMIN_CREATE_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    const hashedPassword = await hashPassword(password);

    const admin = await User.create({
      name: name || 'Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      isActive: true
    });

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      token,
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

// Fix existing seller password (run this endpoint once)
const fixExistingSeller = async (req, res) => {
  try {
    await fixSellerPassword();
    
    res.json({
      success: true,
      message: 'Seller password fixed. Try logging in again.'
    });
  } catch (error) {
    console.error('Fix seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing seller password'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  createAdmin,
  fixExistingSeller
};