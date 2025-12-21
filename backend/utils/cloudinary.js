// utils/cloudinary.js
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      ...options
    });
    
    return {
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height
      }
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Delete result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: result.result === 'ok',
      data: result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clean up local temporary files
 * @param {string|Array} filePaths - File path or array of paths
 * @returns {Promise<void>}
 */
const cleanupLocalFiles = async (filePaths) => {
  try {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    
    for (const filePath of paths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Error cleaning up local files:', error);
  }
};

/**
 * Delete old profile pictures from Cloudinary
 * @param {Array} pictureHistory - User's picture history
 * @param {number} keepCount - Number of recent pictures to keep
 * @returns {Promise<Array>} Deleted pictures info
 */
const cleanupOldProfilePictures = async (pictureHistory, keepCount = 3) => {
  if (!pictureHistory || pictureHistory.length <= keepCount) {
    return [];
  }
  
  const picturesToDelete = pictureHistory
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(keepCount);
  
  const deleteResults = [];
  
  for (const picture of picturesToDelete) {
    if (picture.public_id) {
      try {
        const result = await deleteFromCloudinary(picture.public_id);
        deleteResults.push({
          public_id: picture.public_id,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        console.error(`Failed to delete picture ${picture.public_id}:`, error);
        deleteResults.push({
          public_id: picture.public_id,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return deleteResults;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  cleanupLocalFiles,
  cleanupOldProfilePictures
};