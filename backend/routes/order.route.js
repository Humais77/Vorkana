const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const controller = require('../controllers/order.controller');
const { 
  protect, 
  adminOnly 
} = require('../middleware/auth.middleware');
const {
  requestIdMiddleware,
  securityHeaders,
  orderCreationLimiter,
  orderUpdateLimiter,
  sanitizeOrderInput,
  validateOrderOwnership,
  validateOrderModifiable,
  validateFileUpload,
  auditLog
} = require('../middleware/security.middleware');

const {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderQuery
} = require('../middleware/validators/order.validator');

router.use(requestIdMiddleware);
router.use(securityHeaders);
router.use(sanitizeOrderInput);

// Rate limiting
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many order requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const statusUpdateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many status updates, please try again later.',
    code: 'STATUS_UPDATE_LIMIT'
  }
});

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/order-files');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const originalName = file.originalname.replace(path.extname(file.originalname), '');
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    
    const filename = `order-${req.params.id || 'temp'}-${sanitizedName}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      return cb(new Error('File size exceeds 10MB limit'), false);
    }
    
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
  
  cb(new Error('Invalid file type. Allowed: images, PDF, DOC, TXT, ZIP, RAR'), false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: fileFilter
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB per file.',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.',
        code: 'TOO_MANY_FILES'
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
  
  next(err);
};

// ============================================
// ORDER ROUTES
// ============================================

// Create Order (Any authenticated user can create order)
router.post('/',
  protect,
  orderCreationLimiter,
  validateCreateOrder,
  auditLog('CREATE_ORDER'),
  controller.createOrder
);

// Cancel Order
router.post('/:id/cancel',
  protect,
  validateOrderOwnership,
  validateOrderModifiable,
  auditLog('CANCEL_ORDER'),
  async (req, res) => {
    try {
      // Check if order can be cancelled
      if (!req.order.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage',
          code: 'ORDER_NOT_CANCELLABLE'
        });
      }

      // Update order status
      const order = await Order.findById(req.order._id);
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.statusHistory.push({
        status: 'cancelled',
        changedBy: req.user._id,
        reason: req.body.reason || 'Cancelled by user',
        timestamp: new Date()
      });

      await order.save();

      // Emit cancellation event
      await emitOrderStatusChange(order._id, req.order.status, 'cancelled', req.user._id);

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order'
      });
    }
  }
);

// Get Orders (All roles, based on permissions)
router.get('/',
  protect,
  validateOrderQuery,
  controller.getOrders
);

// Get Order by ID
router.get('/:id',
  protect,
  validateOrderOwnership,
  auditLog('VIEW_ORDER'),
  controller.getOrderById
);

// Update Order Status
router.patch('/:id/status',
  protect,
  orderUpdateLimiter,
  validateUpdateOrder,
  validateOrderOwnership,
  validateOrderModifiable,
  auditLog('UPDATE_ORDER_STATUS'),
  controller.updateOrderStatus
);

// Add Deliverables (Service provider delivers work)
router.post('/:id/deliverables',
  protect,
  validateOrderOwnership,
  validateOrderModifiable,
  upload.array('files', 10),
  validateFileUpload,
  auditLog('ADD_DELIVERABLES'),
  controller.addDeliverables
);

// Accept Delivery (Buyer accepts delivered work)
router.post('/:id/accept-delivery',
  protect,
  controller.acceptDelivery
);

// Request Revision (Buyer requests revision)
router.post('/:id/request-revision',
  protect,
  controller.requestRevision
);

// ============================================
// BUYER-SPECIFIC ROUTES
// ============================================

// Get Buyer Active Orders
router.get('/buyer/active',
  protect,
  controller.getBuyerActiveOrders
);

// Get Buyer Orders (All buyer orders)
router.get('/buyer/orders',
  protect,
  (req, res, next) => {
    req.query.role = 'buyer';
    next();
  },
  validateOrderQuery,
  controller.getOrders
);

// ============================================
// ADMIN ROUTES
// ============================================

// Get All Orders (Admin)
router.get('/admin/all',
  protect,
  adminOnly,
  (req, res, next) => {
    req.query.showAll = true;
    next();
  },
  validateOrderQuery,
  controller.getOrders
);

// Update Any Order (Admin)
router.patch('/admin/:id/status',
  protect,
  adminOnly,
  validateUpdateOrder,
  controller.updateOrderStatus
);

// ============================================
// FILE UPLOAD ROUTES
// ============================================

// Upload requirement files
router.post('/:id/requirements/upload',
  protect,
  upload.array('files', 10),
  handleMulterError,
  async (req, res) => {
    try {
      const files = req.files.map(file => `/uploads/order-files/${file.filename}`);
      
      res.json({
        success: true,
        files,
        message: 'Files uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading files'
      });
    }
  }
);

// Download order file
router.get('/files/:filename',
  protect,
  (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../public/uploads/order-files', filename);
    
    // Security: Check if file exists and is within uploads directory
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.download(filePath);
  }
);

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes are operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;