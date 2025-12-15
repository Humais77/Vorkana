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

// Order-specific rate limiting
const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => ipKeyGenerator(req.ip),  // Fixed: use helper
  message: {
    success: false,
    message: 'Too many orders created. Please try again later.',
    code: 'ORDER_CREATION_LIMIT'
  }
});
const orderUpdateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}-${req.params.id}`,  // Fixed: wrap req.ip
  message: {
    success: false,
    message: 'Too many order updates. Please try again later.',
    code: 'ORDER_UPDATE_LIMIT'
  }
});

// Input sanitization for orders
const sanitizeOrderInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential dangerous characters
        sanitized[key] = value.replace(/[<>'"/\\]/g, '');
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? item.replace(/[<>'"/\\]/g, '') : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  next();
};

// Validate order ownership
const validateOrderOwnership = async (req, res, next) => {
  try {
    const Order = require('../models/order.model');
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
        code: 'ORDER_ID_REQUIRED'
      });
    }

    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order',
        code: 'ORDER_ACCESS_DENIED'
      });
    }

    req.order = order;
    req.isBuyer = isBuyer;
    next();
  } catch (error) {
    console.error('Order ownership validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating order ownership',
      code: 'OWNERSHIP_VALIDATION_ERROR'
    });
  }
};

// Check if order can be modified
const validateOrderModifiable = (req, res, next) => {
  const modifiableStatuses = ['pending', 'accepted', 'in_progress', 'delivered', 'revision'];
  
  if (!modifiableStatuses.includes(req.order.status)) {
    return res.status(400).json({
      success: false,
      message: `Order cannot be modified in ${req.order.status} status`,
      code: 'ORDER_NOT_MODIFIABLE'
    });
  }
  
  next();
};

// File upload validation
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
        orderId: req.params?.id,
        orderNumber: req.order?.orderNumber
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
  orderCreationLimiter,
  orderUpdateLimiter,
  sanitizeOrderInput,
  validateOrderOwnership,
  validateOrderModifiable,
  validateFileUpload,
  auditLog
};