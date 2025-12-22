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

// routes/user.route.js - Add more detailed logging
router.post('/upload-profile-picture', 
  protect,
  (req, res, next) => {
    console.log('=== UPLOAD REQUEST START ===');
    console.log('Headers:', req.headers);
    console.log('User ID:', req.user._id);
    
    profilePicUpload(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message || 'Upload failed',
          code: 'UPLOAD_ERROR'
        });
      }
      console.log('Multer processing complete. File exists:', !!req.file);
      if (req.file) {
        console.log('File buffer length:', req.file.buffer?.length);
        console.log('File path:', req.file.path);
      }
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

      console.log('File details:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferType: typeof req.file.buffer,
        bufferLength: req.file.buffer?.length,
        hasPath: !!req.file.path,
        path: req.file.path
      });

      // Process upload to Cloudinary
      console.log('Calling processProfilePictureUpload...');
      const uploadResult = await processProfilePictureUpload(req.file, req.user._id);
      
      console.log('Cloudinary upload result:', {
        hasUrl: !!uploadResult.url,
        urlType: typeof uploadResult.url,
        urlFirst100: uploadResult.url?.substring(0, 100),
        hasPublicId: !!uploadResult.public_id,
        success: uploadResult.success
      });
      
      if (!uploadResult.url) {
        throw new Error('No URL returned from Cloudinary upload');
      }
      
      if (uploadResult.url.startsWith('data:')) {
        console.error('ERROR: Cloudinary returned base64 instead of URL!');
        throw new Error('Invalid response from Cloudinary - got base64 data');
      }
      
      // Update user's picture in database
      console.log('Updating user in database...');
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
      
      console.log('Database update successful. Updated user picture:', updatedUser.picture);
      
      // Return response
      const responseData = {
        success: true,
        message: 'Profile picture uploaded successfully',
        picture: uploadResult.url,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          picture: uploadResult.url,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified,
          phoneNumber: updatedUser.phoneNumber,
          country: updatedUser.country,
          city: updatedUser.city,
          bio: updatedUser.bio,
          gender: updatedUser.gender,
          dateOfBirth: updatedUser.dateOfBirth,
          languages: updatedUser.languages,
          occupation: updatedUser.occupation,
          education: updatedUser.education,
          privacySettings: updatedUser.privacySettings,
          rating: updatedUser.rating,
          completedOrders: updatedUser.completedOrders,
          isOnline: updatedUser.isOnline,
          lastSeenAt: updatedUser.lastSeenAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };
      
      console.log('Sending response. Picture URL in response:', responseData.picture);
      console.log('Response data structure:', JSON.stringify(responseData).substring(0, 200) + '...');
      
      res.json(responseData);
      
    } catch (error) {
      console.error('Profile picture upload error:', error);
      console.error('Error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture: ' + error.message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'SERVER_ERROR'
      });
    } finally {
      console.log('=== UPLOAD REQUEST END ===\n');
    }
  }
);
module.exports = router;