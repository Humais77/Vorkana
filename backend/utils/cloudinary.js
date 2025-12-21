// utils/cloudinary.js
const { v2: cloudinary } = require('cloudinary');
const path = require('path');
const fs = require('fs').promises;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload file to Cloudinary
 * @param {string|Buffer} file - File path, buffer, or base64 string
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadToCloudinary = async (file, options = {}) => {
  try {
    const uploadOptions = {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...options,
    };

    let result;
    
    if (typeof file === 'string' && (file.startsWith('/') || file.includes('\\'))) {
      // Local file path
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      // Base64 string
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else if (Buffer.isBuffer(file)) {
      // File buffer
      result = await cloudinary.uploader.upload_stream(uploadOptions, (error, res) => {
        if (error) throw error;
        result = res;
      }).end(file);
    } else {
      throw new Error('Invalid file type');
    }

    return {
      success: true,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width || null,
        height: result.height || null,
        created_at: result.created_at,
        original_filename: result.original_filename,
        signature: result.signature,
        version: result.version,
        etag: result.etag,
        placeholder: result.placeholder,
        tags: result.tags || [],
      },
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.http_code || 'UPLOAD_ERROR'
    };
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - File's public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<object>} Deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType,
      invalidate: true 
    });
    
    return { 
      success: result.result === 'ok', 
      result: result.result,
      details: result
    };
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.http_code || 'DELETE_ERROR'
    };
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // Match Cloudinary URL pattern
    const regex = /\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|webp|gif|svg)/i;
    const match = url.match(regex);
    
    if (match && match[1]) {
      // Remove folder path if present
      return match[1].split('/').pop();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file objects
 * @param {object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, options));
    const results = await Promise.allSettled(uploadPromises);
    
    const successfulUploads = [];
    const failedUploads = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successfulUploads.push({
          index,
          ...result.value.data
        });
      } else {
        failedUploads.push({
          index,
          error: result.reason?.error || result.value?.error || 'Unknown error'
        });
      }
    });
    
    return {
      success: successfulUploads.length > 0,
      successful: successfulUploads,
      failed: failedUploads,
      total: files.length,
      successfulCount: successfulUploads.length,
      failedCount: failedUploads.length
    };
  } catch (error) {
    console.error('Multiple upload error:', error);
    return { 
      success: false, 
      error: error.message,
      successful: [],
      failed: []
    };
  }
};

/**
 * Clean up local files after upload
 * @param {Array} filePaths - Array of local file paths
 */
const cleanupLocalFiles = async (filePaths) => {
  try {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    
    const deletePromises = filePaths.map(async (filePath) => {
      try {
        if (filePath && typeof filePath === 'string') {
          await fs.unlink(filePath);
        }
      } catch (unlinkError) {
        console.warn(`Could not delete local file ${filePath}:`, unlinkError.message);
      }
    });
    
    await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  extractPublicIdFromUrl,
  cleanupLocalFiles,
};