const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');
const { 
  verifyAdmin,
  requirePermission,
  adminDashboardLimiter,
  auditLog,
} = require('../middleware/admin.middleware.js');
const serviceController = require('../controllers/services.controller.js');
const categoryController = require('../controllers/category.controller.js');
const subcategoryController = require('../controllers/subcategory.controller.js');
const gigController = require('../controllers/gig.controller.js');
const {logout} = require('../controllers/auth.controller.js');
const mongoose = require('mongoose');

const { 
  createCacheMiddleware, 
  createClearCacheMiddleware,
  cacheStatsMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES 
} = require('../middleware/cacheMiddleware');

const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js');
const User = require('../models/user.model.js');

const CSRFMiddleware = require('../middleware/csrf.middleware');
const SessionMiddleware = require('../middleware/session.middleware');
const categoryValidator = require('../middleware/validators/category.validator.js');

const ADMIN_CACHE_CONFIG = {
  DASHBOARD: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.ADMIN,
    checkUserRole: true,
    rolesToBypass: ['admin'],
    tags: ['admin', 'dashboard']
  },
  STATS: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.ADMIN,
    tags: ['admin', 'stats']
  },
  LIST: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.ADMIN,
    tags: ['admin', 'list']
  },
  DETAIL: {
    ttl: CACHE_TTL.PRIVATE.MEDIUM,
    namespace: NAMESPACES.ADMIN,
    tags: ['admin', 'detail']
  },
  DROPDOWN: {
    ttl: CACHE_TTL.PRIVATE.LONG,
    namespace: NAMESPACES.ADMIN,
    tags: ['admin', 'dropdown']
  },
  SESSION: {
    ttl: CACHE_TTL.PRIVATE.SHORT,
    namespace: NAMESPACES.ADMIN,
    tags: ['admin', 'session']
  }
};

const cacheDashboard = createCacheMiddleware(ADMIN_CACHE_CONFIG.DASHBOARD);
const cacheStats = createCacheMiddleware(ADMIN_CACHE_CONFIG.STATS);
const cacheList = createCacheMiddleware(ADMIN_CACHE_CONFIG.LIST);
const cacheDetail = createCacheMiddleware(ADMIN_CACHE_CONFIG.DETAIL);
const cacheDropdown = createCacheMiddleware(ADMIN_CACHE_CONFIG.DROPDOWN);
const cacheSession = createCacheMiddleware(ADMIN_CACHE_CONFIG.SESSION);

const clearAdminCache = createClearCacheMiddleware({
  patterns: [
    'admin:*',
    '*:tags:*admin*'
  ],
  tags: ['admin'],
  namespace: NAMESPACES.ADMIN,
  clearAllOnWrite: false
});

const adminApiLimiter = adminDashboardLimiter;

router.get('/session',
  verifyAdmin,
  cacheControlMiddleware({ public: false, maxAge: 60 }),
  cacheSession,
  adminController.checkAdminSession
);

router.get('/dashboard', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('view_dashboard'),
  auditLog('VIEW_DASHBOARD', 'dashboard'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheDashboard,
  adminController.getDashboardStats
);

router.get('/categories/analytics', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_CATEGORY_ANALYTICS', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 180 }),
  cacheStats,
  categoryController.getCategoryStats
);

router.get('/subcategories/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_SUBCATEGORY_STATS', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 180 }),
  cacheStats,
  subcategoryController.getSubcategoryStats
);

router.get('/services/stats', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('view_analytics'),
  auditLog('VIEW_SERVICE_STATS', 'services'),
  cacheControlMiddleware({ public: false, maxAge: 180 }),
  cacheStats,
  serviceController.getServiceStats
);

router.get('/gigs/stats', 
  verifyAdmin, 
  requirePermission('view_analytics'),
  auditLog('VIEW_GIG_STATS', 'gigs'),
  cacheControlMiddleware({ public: false, maxAge: 180 }),
  cacheStats,
  async (req, res, next) => {
    req.user = { role: 'admin', _id: req.admin._id };
    next();
  },
  gigController.getGigStats
);

router.get('/categories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  cacheControlMiddleware({ public: false, maxAge: 600 }),
  cacheDropdown,
  async (req, res) => {
    try {
      const { 
        includeSubcategories = false, 
        showAll = false,
        onlyWithSubcategories = false,
        allowSubcategories = true
      } = req.query;
      
      const filter = { 
        isActive: true,
        deletedAt: null
      };
      
      if (allowSubcategories === 'true') {
        filter.$or = [
          { allowSubcategories: true },
          { allowSubcategories: { $exists: false } }
        ];
      } else if (allowSubcategories === 'false') {
        filter.allowSubcategories = false;
      }
      
      if (onlyWithSubcategories === 'true') {
        filter.allowSubcategories = true;
      } else if (showAll === 'true') {
        delete filter.$or;
        delete filter.allowSubcategories;
      }
      
      const categories = await Category.find(filter)
        .select('name slug icon parentCategory order isActive featured popular servicesCount gigsCount allowSubcategories')
        .sort({ order: 1, name: 1 })
        .lean();
      
      if (includeSubcategories === 'true') {
        const categoryIds = categories.map(cat => cat._id);
        
        const subcategories = await Subcategory.find({
          category: { $in: categoryIds },
          isActive: true,
          deletedAt: null
        })
        .select('name slug icon category order isActive description servicesCount gigsCount')
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
          const catId = category._id.toString();
          category.subcategories = subcategoriesByCategory[catId] || [];
          category.subcategoriesCount = category.subcategories.length;
        });
      }
      
      res.json({
        success: true,
        data: categories,
        count: categories.length,
        cached: false
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

router.get('/categories/:categoryId/subcategories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORIES_DROPDOWN', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 600 }),
  cacheDropdown,
  subcategoryController.getSubcategoriesDropdown
);

router.get('/subcategories/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  cacheControlMiddleware({ public: false, maxAge: 600 }),
  cacheDropdown,
  async (req, res) => {
    try {
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
      
      res.json({
        success: true,
        data: subcategories,
        cached: false
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

router.get('/users/dropdown', 
  verifyAdmin, 
  adminApiLimiter,
  cacheControlMiddleware({ public: false, maxAge: 600 }),
  cacheDropdown,
  async (req, res) => {
    try {
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
      
      res.json({
        success: true,
        data: users,
        cached: false
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

router.get('/subcategories', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORIES', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheList,
  async (req, res, next) => {
    try {
      const cleanQuery = {};
      
      for (const [key, value] of Object.entries(req.query)) {
        if (value === '') continue;
        
        if (['page', 'limit', 'order'].includes(key)) {
          cleanQuery[key] = parseInt(value) || (key === 'page' ? 1 : key === 'limit' ? 20 : 0);
        }
        else if (['isActive'].includes(key)) {
          if (value === 'true' || value === true || value === '1') {
            cleanQuery[key] = true;
          } else if (value === 'false' || value === false || value === '0') {
            cleanQuery[key] = false;
          }
        }
        else {
          cleanQuery[key] = value;
        }
      }
      
      if (!cleanQuery.page) cleanQuery.page = 1;
      if (!cleanQuery.limit) cleanQuery.limit = 20;
      
      cleanQuery.populateCategory = 'true';
      cleanQuery.includeCategoryDetails = 'true';
      
      req.query = cleanQuery;
      
      next();
    } catch (error) {
      next(error);
    }
  },
  subcategoryController.getSubcategories
);

router.post('/subcategories/bulk', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('BULK_SUBCATEGORY_ACTION', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  subcategoryController.bulkUpdateSubcategories
);

router.get('/subcategories/export', 
  verifyAdmin, 
  requirePermission('manage_categories'),
  auditLog('EXPORT_SUBCATEGORIES', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  subcategoryController.exportSubcategories
);


router.get('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('manage_categories'),
  auditLog('VIEW_SUBCATEGORY', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 300 }),
  cacheDetail,
  async (req, res, next) => {
    try {
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      req.query.populateCategory = true;
      req.query.includeCategoryDetails = true;
      req.query.populate = 'true';
      
      next();
    } catch (error) {
      next(error);
    }
  },
  subcategoryController.getSubcategoryById
);

router.post('/subcategories', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('CREATE_SUBCATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  subcategoryController.createSubcategory
);

router.put('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('UPDATE_SUBCATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  express.json({ limit: '10mb' }),
  subcategoryController.updateSubcategory
);

router.delete('/subcategories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('DELETE_SUBCATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  subcategoryController.deleteSubcategory
);

router.get('/users', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_users'),
  auditLog('VIEW_USERS', 'users'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheList,
  adminController.getUsers
);

router.post('/users/bulk-action', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_users'),
  auditLog('BULK_USER_ACTION', 'users'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  adminController.bulkUpdateUsers
);

router.get('/users/export', 
  verifyAdmin, 
  requirePermission('manage_users'),
  auditLog('EXPORT_USERS', 'users'),
  cacheControlMiddleware({ noStore: true }),
  adminController.exportUsers
);

router.post('/users', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_users'),
  auditLog('CREATE_USER', 'users'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  adminController.createUser
);

router.put('/users/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_users'),
  auditLog('UPDATE_USER', 'users'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  adminController.updateUser
);

router.delete('/users/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_users'),
  auditLog('DELETE_USER', 'users'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  adminController.deleteUser
);

router.get('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('VIEW_CATEGORIES', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheList,
  async (req, res, next) => {
    try {
      const cleanQuery = {};
      
      for (const [key, value] of Object.entries(req.query)) {
        if (value === '' && ['featured', 'popular', 'isActive'].includes(key)) {
          continue;
        }
        
        if (['page', 'limit', 'sortOrder', 'order', 'level'].includes(key)) {
          cleanQuery[key] = parseInt(value) || (key === 'page' ? 1 : key === 'limit' ? 20 : 0);
        }
        else if (['featured', 'isActive', 'popular', 'showAll', 'isAdmin'].includes(key)) {
          if (value === 'true' || value === true || value === '1') {
            cleanQuery[key] = true;
          } else if (value === 'false' || value === false || value === '0') {
            cleanQuery[key] = false;
          }
        }
        else {
          cleanQuery[key] = value;
        }
      }
      
      cleanQuery.showAll = true;
      cleanQuery.isAdmin = true;
      
      if (!cleanQuery.page) cleanQuery.page = 1;
      if (!cleanQuery.limit) cleanQuery.limit = 20;
      
      req.query = cleanQuery;
      
      next();
    } catch (error) {
      next(error);
    }
  },
  categoryController.getCategories
);

router.post('/categories/bulk-action', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('BULK_CATEGORY_ACTION', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  categoryController.bulkUpdateCategories
);

router.get('/categories/export', 
  verifyAdmin, 
  requirePermission('manage_categories'),
  auditLog('EXPORT_CATEGORIES', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  categoryController.exportCategories
);

router.post('/categories', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('CREATE_CATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  categoryValidator.validateCreate,
  categoryController.createCategory
);

router.put('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('UPDATE_CATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  categoryValidator.validateUpdate,
  categoryController.updateCategory
);

router.get('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_categories'),
  auditLog('VIEW_CATEGORY', 'categories'),
  cacheControlMiddleware({ public: false, maxAge: 300 }),
  cacheDetail,
  async (req, res, next) => {
    try {
      if (req.params.id && req.params.id.startsWith('"') && req.params.id.endsWith('"')) {
        req.params.id = req.params.id.slice(1, -1);
      }
      
      req.query.showAll = true;
      req.query.includeDeleted = true;
      req.query.populate = 'true';
      
      next();
    } catch (error) {
      next(error);
    }
  },
  categoryController.getCategoryById
);

router.delete('/categories/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('DELETE_CATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  categoryController.deleteCategory
);

router.post('/categories/:id/restore', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_categories'),
  auditLog('RESTORE_CATEGORY', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  express.json({ limit: '10mb' }),
  categoryController.restoreCategory
);

router.post('/categories/repair-counts', 
  verifyAdmin,
  CSRFMiddleware.requireCSRF,
  requirePermission('system_settings'),
  auditLog('REPAIR_CATEGORY_COUNTS', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  categoryController.repairCategoryCounts
);

router.post('/subcategories/repair-counts', 
  verifyAdmin,
  CSRFMiddleware.requireCSRF,
  requirePermission('system_settings'),
  auditLog('REPAIR_SUBCATEGORY_COUNTS', 'categories'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  subcategoryController.repairSubcategoryCounts
);

router.get('/services', 
  verifyAdmin,  
  adminApiLimiter,
  requirePermission('manage_services'),
  auditLog('VIEW_SERVICES', 'services'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheList,
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
router.get('/services/export', 
  verifyAdmin, 
  requirePermission('manage_services'),
  auditLog('EXPORT_SERVICES', 'services'),
  cacheControlMiddleware({ noStore: true }),
  serviceController.exportServices
);
router.get('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_services'),
  auditLog('VIEW_SERVICE', 'services'),
  cacheControlMiddleware({ public: false, maxAge: 300 }),
  cacheDetail,
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      req.query.includeFullDetails = 'true';
      req.query.includeSubcategory = 'true';
      req.query.populate = 'true';
      next();
    } catch (error) {
      next(error);
    }
  },
  serviceController.getServiceById
);

router.put('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_services'),
  auditLog('UPDATE_SERVICE', 'services'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      next();
    } catch (error) {
      next(error);
    }
  },
  serviceController.updateService
);

router.delete('/services/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_services'),
  auditLog('DELETE_SERVICE', 'services'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  async (req, res, next) => {
    try {
      req.isAdmin = true;
      
      if (req.query.permanent) {
        req.query.permanent = String(req.query.permanent).toLowerCase();
      }
      
      if (req.query.force) {
        req.query.force = String(req.query.force).toLowerCase();
      }
      
      next();
    } catch (error) {
      next(error);
    }
  },
  serviceController.deleteService
);

router.get('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIGS', 'gigs'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheList,
  async (req, res, next) => {
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    req.query.showAll = true;
    req.query.includeInactive = true;
    req.query.isAdmin = true;
    
    if (req.query.page) req.query.page = parseInt(req.query.page);
    if (req.query.limit) req.query.limit = parseInt(req.query.limit);
    
    if (req.query.status === '') delete req.query.status;
    if (req.query.urgency === '') delete req.query.urgency;
    
    if (req.query.minBudget) req.query.minBudget = parseFloat(req.query.minBudget);
    if (req.query.maxBudget) req.query.maxBudget = parseFloat(req.query.maxBudget);
    
    next();
  },
  gigController.getGigs
);

router.get('/gigs/export', 
  verifyAdmin, 
  requirePermission('manage_gigs'),
  auditLog('EXPORT_GIGS', 'gigs'),
  cacheControlMiddleware({ noStore: true }),
  async (req, res, next) => {
    req.user = { role: 'admin', _id: req.admin._id };
    next();
  },
  gigController.exportGigs
);

router.get('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  requirePermission('manage_gigs'),
  auditLog('VIEW_GIG', 'gigs'),
  cacheControlMiddleware({ public: false, maxAge: 300 }),
  cacheDetail,
  async (req, res, next) => {
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    req.query.populateSubcategory = true;
    req.query.populateCategory = true;
    req.query.includeCommunication = true;
    next();
  },
  gigController.getGigById
);

router.post('/gigs', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_gigs'),
  auditLog('CREATE_GIG', 'gigs'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  async (req, res, next) => {
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    
    if (req.body.clientId) {
      req.body.createdBy = req.body.clientId;
    } else {
      req.body.createdBy = req.admin._id;
    }
    
    delete req.body.clientId;
    next();
  },
  gigController.createGig
);

router.put('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_gigs'),
  auditLog('UPDATE_GIG', 'gigs'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  express.json({ limit: '10mb' }),
  async (req, res, next) => {
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    next();
  },
  gigController.updateGig
);

router.delete('/gigs/:id', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_gigs'),
  auditLog('DELETE_GIG', 'gigs'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  express.json(),
  async (req, res, next) => {
    req.user = { 
      role: 'admin', 
      _id: req.admin._id,
      ...req.admin 
    };
    
    if (req.params.id === '[object Object]') {
      if (req.body && req.body.id) {
        req.params.id = req.body.id;
      } else if (req.query && req.query.id) {
        req.params.id = req.query.id;
      }
    }
    
    if (req.query.permanent) {
      req.query.permanent = String(req.query.permanent).toLowerCase();
    }
    
    if (req.query.force) {
      req.query.force = String(req.query.force).toLowerCase();
    }
    
    next();
  },
  gigController.deleteGig
);

router.post('/gigs/:id/restore', 
  verifyAdmin, 
  adminApiLimiter, 
  CSRFMiddleware.requireCSRF,
  requirePermission('manage_gigs'),
  auditLog('RESTORE_GIG', 'gigs'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  async (req, res, next) => {
    req.user = { role: 'admin', _id: req.admin._id };
    next();
  },
  gigController.restoreGig
);

router.get('/system/health', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('system_settings'),
  auditLog('VIEW_SYSTEM_HEALTH', 'system'),
  cacheControlMiddleware({ public: false, maxAge: 30 }),
  cacheStats,
  adminController.getSystemHealthHandler
);

router.get('/activity/recent', 
  verifyAdmin, 
  adminApiLimiter,
  requirePermission('view_dashboard'),
  auditLog('VIEW_RECENT_ACTIVITY', 'dashboard'),
  cacheControlMiddleware({ public: false, maxAge: 120 }),
  cacheStats,
  adminController.getRecentActivity
);

router.get('/cache/stats', 
  verifyAdmin,
  requirePermission('system_settings'),
  cacheControlMiddleware({ public: false, maxAge: 30 }),
  cacheStatsMiddleware,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: req.cacheStats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get cache stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

router.post('/cache/clear', 
  verifyAdmin,
  CSRFMiddleware.requireCSRF,
  requirePermission('system_settings'),
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  async (req, res) => {
    try {
      const { type } = req.body;
      const cache = require('../utils/cache');
      
      if (type === 'all') {
        await cache.del('admin:*');
      } else if (type) {
        await cache.del(`admin:${type}:*`);
      } else {
        await cache.del('admin:*');
      }
      
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        clearedType: type || 'all'
      });
    } catch (error) {
      console.error('[CACHE CLEAR ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

router.post('/logout', 
  verifyAdmin,
  cacheControlMiddleware({ noStore: true }),
  clearAdminCache,
  (req, res, next) => {
    req.isAdminLogout = true;
    next();
  },
  logout
);

router.get('/health', 
  verifyAdmin,
  cacheControlMiddleware({ maxAge: 30 }),
  async (req, res) => {
    try {
      const cache = require('../utils/cache');
      const health = await cache.health();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        admin: req.admin?.email,
        cache: {
          redis: health.redis.healthy,
          memory: health.memory.healthy,
          overall: health.overall
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
);

module.exports = router;