const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');
const { 
  verifyAdmin, 
  requirePermission, 
  adminDashboardLimiter,
  auditLog 
} = require('../middleware/admin.middleware.js');

// Security: Admin-only rate limiting
const adminApiLimiter = adminDashboardLimiter;

// Admin Authentication
router.post('/login', adminApiLimiter, auditLog('ADMIN_LOGIN', 'auth'), (req, res) => {
  // Special admin login logic here
});

// Dashboard Routes
router.get('/dashboard', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('view_dashboard'),
  auditLog('VIEW_DASHBOARD', 'dashboard'),
  adminController.getDashboardStats
);

// User Management Routes
router.get('/users', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('VIEW_USERS', 'users'),
  adminController.getUsers
);

router.get('/users/export', 
  verifyAdmin, 
  requirePermission('manage_users'),
  auditLog('EXPORT_USERS', 'users'),
  adminController.exportUsers
);

router.put('/users/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('UPDATE_USER', 'users'),
  adminController.updateUser
);

router.delete('/users/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('DELETE_USER', 'users'),
  adminController.deleteUser
);

// Category Management (using existing category controller)
const categoryController = require('../controllers/category.controller.js');
router.get('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('VIEW_CATEGORIES', 'categories'),
  async (req, res, next) => {
    // Fix boolean cast issues by parsing query parameters
    if (req.query.featured === '') delete req.query.featured;
    if (req.query.isActive === '') delete req.query.isActive;
    
    req.query.showAll = true;
    req.query.isAdmin = true; // Add flag to distinguish admin requests
    
    // Parse numeric values
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    if (req.query.sortOrder) req.query.sortOrder = parseInt(req.query.sortOrder);
    
    next();
  },
 adminController.getCategories
);

// Admin-specific category endpoints
router.post('/categories/bulk-action', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('BULK_CATEGORY_ACTION', 'categories'),
  categoryController.bulkUpdateCategories
);

router.get('/categories/analytics', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_CATEGORY_ANALYTICS', 'categories'),
  categoryController.getCategoryStats
);

// System Management
router.get('/system/health', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('system_settings'),
  auditLog('VIEW_SYSTEM_HEALTH', 'system'),
  async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        redis: 'connected', // Add your Redis check
        env: process.env.NODE_ENV
      };
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'System health check failed'
      });
    }
  }
);

// Real-time updates endpoint for Socket.io
router.get('/updates', 
  verifyAdmin, 
  (req, res) => {
    // Setup Server-Sent Events for real-time updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Send initial data
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    
    // Listen for updates from Socket.io
    const io = req.app.get('io');
    const sendUpdate = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Subscribe to admin events
    io.on('admin:user_updated', sendUpdate);
    io.on('admin:category_updated', sendUpdate);
    io.on('admin:order_created', sendUpdate);
    
    // Cleanup on client disconnect
    req.on('close', () => {
      io.off('admin:user_updated', sendUpdate);
      io.off('admin:category_updated', sendUpdate);
      io.off('admin:order_created', sendUpdate);
    });
  }
);
// System health endpoint - FIXED VERSION
router.get('/system/health', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('system_settings'),
  auditLog('VIEW_SYSTEM_HEALTH', 'system'),
  adminController.getSystemHealthHandler // Use the handler
);
module.exports = router;