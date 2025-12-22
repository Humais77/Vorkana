const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
// Request ID middleware
const requestIdMiddleware = (req, res, next) => {
  req.requestId = crypto.randomBytes(8).toString('hex');
  res.set('X-Request-ID', req.requestId);
  next();
};

// XSS protection headers
const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  });
  next();
};

const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  for (const file of req.files) {
    // Check file size
    if (file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `File ${file.originalname} exceeds 10MB limit`,
        code: 'FILE_SIZE_EXCEEDED'
      });
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type ${file.mimetype} is not allowed`,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Check filename for malicious patterns
    const maliciousPatterns = [
      /\.\.\//, /\.\.\\/, // Directory traversal
      /\.php$/, /\.js$/, /\.exe$/, /\.sh$/, /\.bat$/, /\.cmd$/ // Executable extensions
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(file.originalname.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename detected',
          code: 'MALICIOUS_FILENAME'
        });
      }
    }
  }

  next();
};

// Audit logging middleware
const auditLog = (action) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Log after response is sent
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        userId: req.user?._id,
        action,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      console.log('[ORDER_AUDIT]', JSON.stringify(logData));
      
      // In production, you might want to save to a database or external logging service
    });

    next();
  };
};

module.exports = {
  requestIdMiddleware,
  securityHeaders,
  validateFileUpload,
  auditLog
};