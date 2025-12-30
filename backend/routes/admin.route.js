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

// IMPORT MODELS
const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js');
const User = require('../models/user.model.js');

// Security: Admin-only rate limiting
const adminApiLimiter = adminDashboardLimiter;

// ============================================
// SUBCATEGORY MANAGEMENT ROUTES
// ============================================

// Get all subcategories with pagination and filtering
router.get('/subcategories', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORIES', 'categories'),
  async (req, res, next) => {
    try {
      // Create a clean query object for subcategories
      const cleanQuery = {};
      
      // Copy only non-empty parameters
      for (const [key, value] of Object.entries(req.query)) {
        // Skip empty strings
        if (value === '') {
          continue;
        }
        
        // Parse numeric values
        if (['page', 'limit', 'order'].includes(key)) {
          cleanQuery[key] = parseInt(value) || (key === 'page' ? 1 : key === 'limit' ? 20 : 0);
        }
        // Parse boolean values
        else if (['isActive'].includes(key)) {
          if (value === 'true' || value === true || value === '1') {
            cleanQuery[key] = true;
          } else if (value === 'false' || value === false || value === '0') {
            cleanQuery[key] = false;
          }
        }
        // Keep other values as-is
        else {
          cleanQuery[key] = value;
        }
      }
      
      // Ensure pagination defaults
      if (!cleanQuery.page) cleanQuery.page = 1;
      if (!cleanQuery.limit) cleanQuery.limit = 20;
      
      // Replace the req.query with clean version
      req.query = cleanQuery;
      
      console.log('[SUBCATEGORIES QUERY] Cleaned query:', cleanQuery);
      next();
    } catch (error) {
      console.error('[SUBCATEGORIES MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.getSubcategories
);
router.get('/subcategories/export', 
  verifyAdmin, 
  requirePermission('manage_categories'),
  auditLog('EXPORT_SUBCATEGORIES', 'categories'),
  adminController.exportSubcategories
);
router.get('/subcategories/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_SUBCATEGORY_STATS', 'categories'),
  adminController.getSubcategoryStats
);
router.post('/subcategories/bulk', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('BULK_SUBCATEGORY_ACTION', 'categories'),
  adminController.bulkUpdateSubcategories
);
router.get('/subcategories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  async (req, res) => {
    try {
      console.log('[SUBCATEGORIES DROPDOWN] Fetching subcategories...');
      console.log('[SUBCATEGORIES DROPDOWN] Admin user:', req.admin?.email);
      
      const { categoryId } = req.query;
      
      const filter = {
        isActive: true,
        deletedAt: null
      };
      
      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        filter.category = categoryId;
      }
      
      const subcategories = await Subcategory.find(filter)
        .select('name slug icon description category order')
        .populate('category', 'name slug')
        .sort({ order: 1, name: 1 })
        .lean();
      
      console.log(`[SUBCATEGORIES DROPDOWN] Found ${subcategories.length} subcategories`);
      
      res.json({
        success: true,
        data: subcategories
      });
    } catch (error) {
      console.error('[SUBCATEGORIES DROPDOWN ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subcategories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
router.get('/categories/:categoryId/subcategories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORIES_DROPDOWN', 'categories'),
  adminController.getSubcategoriesDropdown
);
// Get subcategory by ID - FIXED ROUTE
router.get('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORY', 'categories'),
  async (req, res, next) => {
    try {
      console.log('[GET SUBCATEGORY BY ID] Request:', {
        id: req.params.id,
        admin: req.admin?.email
      });
      
      // Fix the ID if it's wrapped in quotes
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
        console.log('[GET SUBCATEGORY BY ID] Fixed ID:', req.params.id);
      }
      
      next();
    } catch (error) {
      console.error('[GET SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.getSubcategoryById
);

// Create subcategory
router.post('/subcategories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('CREATE_SUBCATEGORY', 'categories'),
  async (req, res, next) => {
    try {
      console.log('[CREATE SUBCATEGORY] Request body:', req.body);
      next();
    } catch (error) {
      console.error('[CREATE SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.createSubcategory
);

// Update subcategory - FIXED ROUTE WITH BODY PARSER
router.put('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('UPDATE_SUBCATEGORY', 'categories'),
  // Add JSON body parser middleware specifically for this route
  express.json({ limit: '10mb' }),
  async (req, res, next) => {
    try {
      console.log('[UPDATE SUBCATEGORY] Incoming request:', {
        params: req.params,
        body: req.body,
        admin: req.admin?.email
      });
      
      // Fix the ID if it's wrapped in quotes
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
        console.log('[UPDATE SUBCATEGORY] Fixed ID:', req.params.id);
      }
      
      next();
    } catch (error) {
      console.error('[UPDATE SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.updateSubcategory
);

// Delete subcategory (soft or permanent)
router.delete('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('DELETE_SUBCATEGORY', 'categories'),
  async (req, res, next) => {
    try {
      console.log('[DELETE SUBCATEGORY] Request:', {
        id: req.params.id,
        query: req.query,
        admin: req.admin?.email
      });
      
      // Fix the ID if needed
      if (req.params.id === '[object Object]') {
        if (req.body && req.body.id) {
          req.params.id = req.body.id;
        } else if (req.query && req.query.id) {
          req.params.id = req.query.id;
        }
      }
      
      // Fix quoted ID
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      next();
    } catch (error) {
      console.error('[DELETE SUBCATEGORY MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.deleteSubcategory
);

// Bulk operations on subcategories


// Get subcategory statistics


// Export subcategories

// Subcategory dropdown for specific category


// ============================================
// EXISTING ROUTES (keep these as they are)
// ============================================

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

router.post('/users', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('CREATE_USER', 'users'),
  adminController.createUser
);

router.get('/users/export', 
  verifyAdmin, 
  requirePermission('manage_users'),
  auditLog('EXPORT_USERS', 'users'),
  adminController.exportUsers
);
// Add this route after the existing user routes in admin.route.js

// User bulk operations
router.post('/users/bulk-action', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('BULK_USER_ACTION', 'users'),
  async (req, res, next) => {
    try {
      console.log('[USERS BULK ACTION] Request:', {
        body: req.body,
        admin: req.admin?.email
      });
      next();
    } catch (error) {
      console.error('[USERS BULK ACTION MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.bulkUpdateUsers
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

// Category Management Routes
router.post('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('CREATE_CATEGORY', 'categories'),
  categoryController.createCategory
);

router.get('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('VIEW_CATEGORIES', 'categories'),
  async (req, res, next) => {
    try {
      // Create a clean query object
      const cleanQuery = {};
      
      // Copy only non-empty parameters
      for (const [key, value] of Object.entries(req.query)) {
        // Skip empty strings for boolean fields
        if (value === '' && ['featured', 'popular', 'isActive'].includes(key)) {
          continue;
        }
        
        // Parse numeric values
        if (['page', 'limit', 'sortOrder', 'order', 'level'].includes(key)) {
          cleanQuery[key] = parseInt(value) || (key === 'page' ? 1 : key === 'limit' ? 20 : 0);
        }
        // Parse boolean values
        else if (['featured', 'isActive', 'popular', 'showAll', 'isAdmin'].includes(key)) {
          if (value === 'true' || value === true || value === '1') {
            cleanQuery[key] = true;
          } else if (value === 'false' || value === false || value === '0') {
            cleanQuery[key] = false;
          }
        }
        // Keep other values as-is
        else {
          cleanQuery[key] = value;
        }
      }
      
      // Add admin defaults
      cleanQuery.showAll = true;
      cleanQuery.isAdmin = true;
      
      // Ensure pagination defaults
      if (!cleanQuery.page) cleanQuery.page = 1;
      if (!cleanQuery.limit) cleanQuery.limit = 20;
      
      // Replace the req.query with clean version
      req.query = cleanQuery;
      
      console.log('[CATEGORIES QUERY] Cleaned query:', cleanQuery);
      next();
    } catch (error) {
      console.error('[CATEGORIES MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  categoryController.getCategories
);

router.put('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('UPDATE_CATEGORY', 'categories'),
  categoryController.updateCategory
);

router.delete('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('DELETE_CATEGORY', 'categories'),
  categoryController.deleteCategory
);

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
    req.query.isAdmin = true;
    req.query.showAll = true;
    req.query.includeInactive = true;
    
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
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
router.delete('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('DELETE_SERVICE', 'services'),
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      next();
    } catch (error) {
      console.error('[ADMIN DELETE SERVICE ERROR]', error);
      next(error);
    }
  },
  serviceController.deleteService
);

router.get('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('VIEW_SERVICE', 'services'),
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      next();
    } catch (error) {
      console.error('[ADMIN GET SERVICE ERROR]', error);
      next(error);
    }
  },
  serviceController.getServiceById
);

router.put('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('UPDATE_SERVICE', 'services'),
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      next();
    } catch (error) {
      console.error('[ADMIN UPDATE SERVICE ERROR]', error);
      next(error);
    }
  },
  serviceController.updateService
);



// Gig Management Routes
router.get('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIGS', 'gigs'),
  async (req, res, next) => {
    req.query.isAdmin = true;
    req.query.showAll = true;
    req.query.includeInactive = true;
    
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
    if (req.query.status === '') delete req.query.status;
    if (req.query.urgency === '') delete req.query.urgency;
    
    if (req.query.minBudget) req.query.minBudget = parseFloat(req.query.minBudget);
    if (req.query.maxBudget) req.query.maxBudget = parseFloat(req.query.maxBudget);
    
    next();
  },
  adminController.getGigs
);
router.get('/gigs/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_GIG_STATS', 'gigs'),
  adminController.getGigStats
);
router.get('/gigs/export', 
  verifyAdmin, 
  requirePermission('manage_gigs'),
  auditLog('EXPORT_GIGS', 'gigs'),
  adminController.exportGigs
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
  express.json(),
  async (req, res, next) => {
    try {
      console.log('[ADMIN GIG DELETE] Request received:', {
        params: req.params,
        body: req.body,
        query: req.query,
        admin: req.admin?.email
      });
      
      if (req.params.id === '[object Object]') {
        console.log('[ADMIN GIG DELETE] Detected object ID, attempting to fix...');
        
        if (req.body && req.body.id) {
          req.params.id = req.body.id;
          console.log('[ADMIN GIG DELETE] Fixed ID from body:', req.params.id);
        } else if (req.query && req.query.id) {
          req.params.id = req.query.id;
          console.log('[ADMIN GIG DELETE] Fixed ID from query:', req.params.id);
        }
      }
      
      next();
    } catch (error) {
      console.error('[ADMIN GIG DELETE MIDDLEWARE ERROR]', error);
      next(error);
    }
  },
  adminController.deleteGig
);

router.post('/gigs/bulk', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('BULK_GIG_ACTION', 'gigs'),
  adminController.bulkUpdateGigs
);





// Dropdown routes
router.get('/categories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  async (req, res) => {
    try {
      console.log('[CATEGORIES DROPDOWN] Fetching categories...');
      console.log('[CATEGORIES DROPDOWN] Admin user:', req.admin?.email);
      
      const { includeSubcategories = false } = req.query;
      
      const categories = await Category.find({ 
        isActive: true,
        deletedAt: null,
        isSubcategory: false
      })
      .select('name slug icon parentCategory')
      .sort({ name: 1 })
      .lean();
      
      console.log(`[CATEGORIES DROPDOWN] Found ${categories.length} categories`);
      
      if (includeSubcategories === 'true') {
        const categoryIds = categories.map(cat => cat._id);
        
        const subcategories = await Subcategory.find({
          category: { $in: categoryIds },
          isActive: true,
          deletedAt: null
        })
        .select('name slug icon category order')
        .sort({ order: 1, name: 1 })
        .lean();
        
        const subcategoriesByCategory = {};
        subcategories.forEach(sub => {
          const catId = sub.category.toString();
          if (!subcategoriesByCategory[catId]) {
            subcategoriesByCategory[catId] = [];
          }
          subcategoriesByCategory[catId].push(sub);
        });
        
        categories.forEach(category => {
          category.subcategories = subcategoriesByCategory[category._id.toString()] || [];
        });
      }
      
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

module.exports = router;