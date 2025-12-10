// controllers/user.controller.js
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// Switch user role
const switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: user, seller'
      });
    }
    
    // Prevent users from switching to admin
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot switch to admin role'
      });
    }
    
    // Update user role
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new token with updated role
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: `Role switched to ${role}`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture
      }
    });
    
  } catch (error) {
    console.error('Switch role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error switching role'
    });
  }
};

module.exports = {
  switchRole
};