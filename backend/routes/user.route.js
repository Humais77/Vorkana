// routes/user.route.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { switchRole } = require('../controllers/user.controller');
const { 
  profilePicUpload, 
  processProfilePictureUpload, 
  handleMulterError 
} = require('../middleware/upload.middleware');
const User = require('../models/user.model');

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`[USER ROUTE] ${req.method} ${req.path}`);
  next();
});

router.patch('/switch-role', protect, switchRole);

router.post('/upload-profile-picture', 
  protect,
  (req, res, next) => {
    console.log('=== UPLOAD REQUEST START ===');
    console.log('Headers:', req.headers);
    
    profilePicUpload(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message || 'Upload failed',
          code: 'UPLOAD_ERROR'
        });
      }
      console.log('Multer processing complete');
      next();
    });
  },
  async (req, res) => {
    try {
      console.log('Processing profile picture upload...');
      
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select an image.',
          code: 'NO_FILE'
        });
      }

      console.log('File received:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Process upload to Cloudinary
      console.log('Uploading to Cloudinary...');
      const uploadResult = await processProfilePictureUpload(req.file, req.user._id);
      console.log('Cloudinary upload successful:', uploadResult.url);
      
      // Update user's picture in database
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { 
          picture: uploadResult.url,
          $push: {
            pictureHistory: {
              url: uploadResult.url,
              public_id: uploadResult.public_id,
              uploadedAt: new Date()
            }
          }
        },
        { new: true, runValidators: true }
      ).select('-password -passwordHistory -resetPasswordToken -resetPasswordExpires -failedLoginAttempts -lockUntil -twoFactorSecret -emailVerificationToken -deviceTokens -loginHistory -suspiciousActivityDetected');
      
      console.log('Database updated successfully');
      
      // Return a CLEAN response with all needed data
      const userResponse = updatedUser.toObject();
      
      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        picture: uploadResult.url,
        user: {
          _id: userResponse._id,
          name: userResponse.name,
          email: userResponse.email,
          picture: uploadResult.url, // Use the new URL
          role: userResponse.role,
          emailVerified: userResponse.emailVerified,
          phoneNumber: userResponse.phoneNumber,
          country: userResponse.country,
          city: userResponse.city,
          bio: userResponse.bio,
          gender: userResponse.gender,
          dateOfBirth: userResponse.dateOfBirth,
          languages: userResponse.languages,
          occupation: userResponse.occupation,
          education: userResponse.education,
          privacySettings: userResponse.privacySettings,
          rating: userResponse.rating,
          completedOrders: userResponse.completedOrders,
          isOnline: userResponse.isOnline,
          lastSeenAt: userResponse.lastSeenAt,
          createdAt: userResponse.createdAt,
          updatedAt: userResponse.updatedAt
        }
      });
      
    } catch (error) {
      console.error('Profile picture upload error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'SERVER_ERROR'
      });
    } finally {
      console.log('=== UPLOAD REQUEST END ===');
    }
  }
);
module.exports = router;