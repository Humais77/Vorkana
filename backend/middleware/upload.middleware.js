// middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadToCloudinary, cleanupLocalFiles } = require('../utils/cloudinary');
const fs = require('fs');

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../../temp_uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const sanitizedName = file.originalname
      .replace(path.extname(file.originalname), '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    const ext = path.extname(file.originalname).toLowerCase();
    
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif|svg/i;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
    
    if (file.size > maxSize) {
      return cb(new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`), false);
    }
    
    // Security checks
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return cb(new Error('Invalid filename'), false);
    }
    
    const executableExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.py'];
    const fileExtension = path.extname(originalName);
    if (executableExtensions.includes(fileExtension)) {
      return cb(new Error('Executable files are not allowed'), false);
    }
    
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only images (jpeg, jpg, png, webp, gif, svg) are allowed.'), false);
};

// Profile picture specific filter
// upload.middleware.js - Update the profile picture filter
const profilePictureFilter = (req, file, cb) => {
  console.log('Profile picture filter - File details:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Allow PNG, JPEG, JPG, WebP
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    const maxSize = 2 * 1024 * 1024; // 2MB for profile pictures
    
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return cb(new Error(`Profile picture size exceeds ${maxSize / (1024 * 1024)}MB limit`), false);
    }
    
    // Security checks
    const originalName = file.originalname.toLowerCase();
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      console.log('Invalid filename:', originalName);
      return cb(new Error('Invalid filename'), false);
    }
    
    console.log('File accepted:', file.originalname);
    return cb(null, true);
  }
  
  console.log('Invalid file type:', file.mimetype);
  cb(new Error(`Invalid file type. Only images (JPEG, JPG, PNG, WebP) are allowed for profile pictures. Received: ${file.mimetype}`));
};
// Create upload instances
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: profilePictureFilter
});

const storageMemory = multer.memoryStorage();
const thumbnailUpload = multer({
  storage: storageMemory,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter
});

const profilePicUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for profile pictures
    files: 1
  },
  fileFilter: profilePictureFilter
}).single('profilePicture'); // Use 'profilePicture' as field name

/**
 * Process uploaded files to Cloudinary
 * @param {Array} files - Multer files array
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<Array>} Array of Cloudinary URLs
 */
const processUploadToCloudinary = async (files, folder = 'services') => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }
  
  const uploadPromises = files.map(async (file) => {
    try {
      const result = await uploadToCloudinary(file.path, {
        folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`,
        public_id: `${folder}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });
      
      // Clean up local file
      await cleanupLocalFiles(file.path);
      
      if (result.success) {
        return {
          url: result.data.url,
          public_id: result.data.public_id,
          format: result.data.format,
          size: result.data.bytes
        };
      } else {
        console.error('Upload failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Upload processing error:', error);
      await cleanupLocalFiles(file.path);
      return null;
    }
  });
  
  const results = await Promise.allSettled(uploadPromises);
  const successfulUploads = results
    .filter(result => result.status === 'fulfilled' && result.value)
    .map(result => result.value);
  
  return successfulUploads;
};

/**
 * Process profile picture upload to Cloudinary
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID for unique naming
 * @returns {Promise<Object>} Upload result
 */
const processProfilePictureUpload = async (file, userId) => {
  if (!file) {
    throw new Error('No file provided');
  }
  
  try {
    // Generate a unique public ID using userId and timestamp
    const publicId = `profile_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const result = await uploadToCloudinary(file.path, {
  folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/profiles`,
  public_id: publicId,
  overwrite: true,
  invalidate: true, // 🔥 VERY IMPORTANT
  resource_type: 'image',
  transformation: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto:best', fetch_format: 'auto' }
  ]
});

    
    // Clean up local file
    await cleanupLocalFiles(file.path);
    
    if (result.success) {
      return {
        url: result.data.url,
        public_id: result.data.public_id,
        format: result.data.format,
        size: result.data.bytes,
        width: result.data.width,
        height: result.data.height
      };
    } else {
      throw new Error('Upload to Cloudinary failed');
    }
  } catch (error) {
    console.error('Profile picture upload error:', error);
    // Ensure local file cleanup even on error
    if (file.path) {
      await cleanupLocalFiles(file.path).catch(console.error);
    }
    throw error;
  }
};

/**
 * Handle multer errors
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
        code: 'TOO_MANY_FILES'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        code: 'UNEXPECTED_FILE_FIELD'
      });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  if (err.message.includes('File size exceeds')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'FILE_SIZE_EXCEEDED'
    });
  }
  
  next(err);
};

module.exports = {
  upload,
  thumbnailUpload,
  profilePicUpload,
  processUploadToCloudinary,
  processProfilePictureUpload,
  handleMulterError,
  cleanupLocalFiles
};