// middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadToCloudinary, cleanupLocalFiles } = require('../utils/cloudinary');

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../../temp_uploads');
    
    // Create temp directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
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

// Create upload instances
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 10
  },
  fileFilter: fileFilter
});

const thumbnailUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for thumbnails
    files: 1
  },
  fileFilter: fileFilter
});

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
  processUploadToCloudinary,
  handleMulterError,
  cleanupLocalFiles
};