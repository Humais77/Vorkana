const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');
const { 
  verifyAdmin, 
  requirePermission, 
  adminDashboardLimiter,
  auditLog 
} = require('../middleware/admin.middleware.js');
const serviceController = require('../controllers/services.controller.js');
const categoryController = require('../controllers/category.controller.js');
const mongoose = require('mongoose');

// IMPORT MODELS - Add this at the top
const Category = require('../models/category.model.js');
const User = require('../models/user.model.js');

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

// Category Management
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

// Service Management
router.get('/services', 
  verifyAdmin,  
  adminApiLimiter,
  requirePermission('manage_services'),
  auditLog('VIEW_SERVICES', 'services'),
  async (req, res, next) => {
    // Add admin-specific query parameters
    req.query.isAdmin = true;
    req.query.showAll = true;
    req.query.includeInactive = true;
    
    // Parse numeric values
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
    // Fix boolean cast issues
    if (req.query.featured === '') delete req.query.featured;
    if (req.query.status === '') delete req.query.status;
    
    next();
  },
  serviceController.getAdminServices
);

router.get('/services/stats', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('view_analytics'),
  auditLog('VIEW_SERVICE_STATS', 'services'),
  serviceController.getServiceStats
);

// Gig Management Routes
router.get('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIGS', 'gigs'),
  async (req, res, next) => {
    // Add admin-specific query parameters
    req.query.isAdmin = true;
    req.query.showAll = true;
    req.query.includeInactive = true;
    
    // Parse numeric values
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
    // Fix boolean cast issues
    if (req.query.status === '') delete req.query.status;
    if (req.query.urgency === '') delete req.query.urgency;
    
    // Parse budget ranges
    if (req.query.minBudget) req.query.minBudget = parseFloat(req.query.minBudget);
    if (req.query.maxBudget) req.query.maxBudget = parseFloat(req.query.maxBudget);
    
    next();
  },
  adminController.getGigs
);

router.get('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIG', 'gigs'),
  adminController.getGigById
);

router.post('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('CREATE_GIG', 'gigs'),
  adminController.createGig
);

router.put('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('UPDATE_GIG', 'gigs'),
  adminController.updateGig
);

router.delete('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('DELETE_GIG', 'gigs'),
  adminController.deleteGig
);

router.post('/gigs/bulk', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('BULK_GIG_ACTION', 'gigs'),
  adminController.bulkUpdateGigs
);

router.get('/gigs/export', 
  verifyAdmin, 
  requirePermission('manage_gigs'),
  auditLog('EXPORT_GIGS', 'gigs'),
  adminController.exportGigs
);

router.get('/gigs/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_GIG_STATS', 'gigs'),
  adminController.getGigStats
);

// Utility endpoints for dropdowns - SIMPLIFIED VERSION
router.get('/categories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  async (req, res) => {
    try {
      console.log('[CATEGORIES DROPDOWN] Fetching categories...');
      console.log('[CATEGORIES DROPDOWN] Admin user:', req.admin?.email);
      
      const categories = await Category.find({ 
        isActive: true,
        deletedAt: null 
      })
      .select('name slug icon parentCategory')
      .sort({ name: 1 })
      .lean();
      
      console.log(`[CATEGORIES DROPDOWN] Found ${categories.length} categories`);
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('[CATEGORIES DROPDOWN ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

router.get('/users/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  async (req, res) => {
    try {
      console.log('[USERS DROPDOWN] Fetching users...');
      console.log('[USERS DROPDOWN] Admin user:', req.admin?.email);
      
      const { role = '' } = req.query;
      
      const query = { 
        isActive: true,
        deletedAt: null 
      };
      
      if (role) {
        query.role = role;
      }
      
      const users = await User.find(query)
        .select('name email picture role')
        .sort({ name: 1 })
        .limit(100)
        .lean();
      
      console.log(`[USERS DROPDOWN] Found ${users.length} users`);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('[USERS DROPDOWN ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// System Management
router.get('/system/health', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('system_settings'),
  auditLog('VIEW_SYSTEM_HEALTH', 'system'),
  adminController.getSystemHealthHandler
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
    io.on('admin:gig_created', sendUpdate);
    io.on('admin:gig_updated', sendUpdate);
    io.on('admin:order_created', sendUpdate);
    
    // Cleanup on client disconnect
    req.on('close', () => {
      io.off('admin:user_updated', sendUpdate);
      io.off('admin:category_updated', sendUpdate);
      io.off('admin:gig_created', sendUpdate);
      io.off('admin:gig_updated', sendUpdate);
      io.off('admin:order_created', sendUpdate);
    });
  }
);

module.exports = router;