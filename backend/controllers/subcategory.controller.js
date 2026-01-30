const mongoose = require('mongoose');
const crypto = require('crypto');
const Subcategory = require('../models/subcategory.model.js');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');
const Gig = require('../models/gig.model.js');
const { sanitizeHtml, sanitizeObject } = require('../utils/sanitize.js');
const cache = require('../utils/cache.js');
const { v4: uuidv4 } = require('uuid');
const generateRequestId = () => crypto.randomUUID();

// Cache helper
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};
const invalidateAdminCache = async (type = 'all') => {
  try {
    switch(type) {
      case 'users':
        await cache.del('admin:users:*');
        await cache.del('admin:user:*');
        await cache.del('admin:stats:users:*');
        break;
      case 'gigs':
        await cache.del('admin:gigs:*');
        await cache.del('admin:gig:*');
        await cache.del('admin:stats:gigs:*');
        break;
      case 'services':
        await cache.del('admin:services:*');
        await cache.del('admin:service:*');
        await cache.del('admin:stats:services:*');
        break;
      case 'subcategories':
        await cache.del('admin:subcategories:*');
        await cache.del('admin:subcategory:*');
        await cache.del('admin:stats:subcategories:*');
        break;
      case 'dashboard':
        await cache.del('admin:dashboard:*');
        await cache.del('admin:stats:*');
        await cache.del('admin:activity:*');
        break;
      case 'all':
      default:
        await cache.del('admin:*');
        break;
    }
    console.log(`Admin cache invalidated for: ${type}`);
  } catch (err) {
    console.warn('Error invalidating admin cache:', err.message);
  }
};

const invalidateSubcategoryCache = async () => {
  try {
    await cache.del('subcategories:*');
    await cache.del('subcategory:*');
    await cache.del('category:*'); // Also clear categories cache
    await cache.del('admin:subcategories:*');
    await cache.del('admin:dashboard:*');
    console.log('Subcategory cache invalidated globally');
  } catch (err) {
    console.warn('Error invalidating subcategory cache:', err.message);
  }
};

const invalidateSpecificSubcategoryCache = async (subcategoryId) => {
  try {
    await cache.del(`subcategory:single:*${subcategoryId}*`);
    await cache.del(`subcategory:*${subcategoryId}*`);
    await cache.del(`admin:subcategories:*${subcategoryId}*`);
    console.log(`Cache invalidated for subcategory: ${subcategoryId}`);
  } catch (err) {
    console.warn('Error invalidating specific subcategory cache:', err.message);
  }
};
const invalidateSpecificCache = async (resource, id) => {
  try {
    await cache.del(`admin:${resource}:single:*${id}*`);
    await cache.del(`admin:${resource}:*${id}*`);
    console.log(`Cache invalidated for ${resource}: ${id}`);
  } catch (err) {
    console.warn('Error invalidating specific admin cache:', err.message);
  }
};
// Add cache control headers to all responses
const setCacheHeaders = (res, cached = false) => {
  if (cached) {
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Cache': 'HIT'
    });
  } else {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Cache': 'MISS'
    });
  }
};
// Create Subcategory
const createSubcategory = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const subcategoryData = {
      ...req.body,
      createdBy: req.admin._id,
      lastUpdatedBy: req.admin._id,
      version: 1
    };

    // Validate required fields
    if (!subcategoryData.name || !subcategoryData.category) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required',
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }

    // Validate category exists
    if (!mongoose.Types.ObjectId.isValid(subcategoryData.category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    const category = await Category.findById(subcategoryData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check for duplicate name in same category
    const existingSubcategory = await Subcategory.findOne({
      name: subcategoryData.name.trim(),
      category: subcategoryData.category,
      deletedAt: null
    });

    if (existingSubcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this name already exists in this category',
        code: 'DUPLICATE_SUBCATEGORY',
        requestId
      });
    }

    // Create subcategory
    const subcategory = await Subcategory.create(subcategoryData);

    // Populate for response
    const populatedSubcategory = await Subcategory.findById(subcategory._id)
      .populate('category', 'name slug')
      .lean();

    // Remove sensitive fields
    delete populatedSubcategory.__v;
    delete populatedSubcategory.deletedAt;
    delete populatedSubcategory.deletedBy;
    delete populatedSubcategory.version;
    delete populatedSubcategory.lastUpdatedBy;

    // ===== INVALIDATE CACHE =====
    await invalidateAdminCache('subcategories');
    await invalidateAdminCache('categories');

    // Update category stats
    await Category.findByIdAndUpdate(subcategoryData.category, {
      $inc: { servicesCount: 0, gigsCount: 0 } // Initialize counts
    });

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: populatedSubcategory,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CREATE SUBCATEGORY ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this slug already exists',
        code: 'DUPLICATE_SLUG',
        requestId
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create subcategory',
      code: 'SUBCATEGORY_CREATE_ERROR',
      requestId
    });
  }
};

// Get Subcategories
const getSubcategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      isActive = '',
      sortBy = 'order',
      sortOrder = 'asc',
      cache: useCacheParam = 'false'
    } = req.query;

    // Build filter
    const filter = { deletedAt: null };
    
    if (search) {
  const sanitizedSearch = validator.escape(search.trim());
  filter.$or = [
    { name: { $regex: sanitizedSearch, $options: 'i' } },
    { description: { $regex: sanitizedSearch, $options: 'i' } },
    { slug: { $regex: sanitizedSearch, $options: 'i' } }
  ];
}
    
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const allowedSortFields = ['name', 'order', 'createdAt', 'updatedAt', 'servicesCount', 'gigsCount'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'order';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Generate cache key
    const cacheKey = generateCacheKey('admin:subcategories', {
      filter: JSON.stringify(filter),
      page: pageNum,
      limit: limitNum,
      sortField,
      sortDirection,
      skip
    });

    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log('Cache HIT admin:subcategories:', cacheKey);
        return res.json({
          ...cachedResult,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Execute query
    const [subcategories, total] = await Promise.all([
      Subcategory.find(filter)
        .populate('category', 'name slug')
        .populate('createdBy', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Subcategory.countDocuments(filter)
    ]);

    // Sanitize response
    const safeSubcategories = subcategories.map(sub => {
      const safeSub = { ...sub };
      delete safeSub.__v;
      delete safeSub.deletedAt;
      delete safeSub.deletedBy;
      delete safeSub.version;
      delete safeSub.lastUpdatedBy;
      if (safeSub.createdBy) {
        delete safeSub.createdBy.password;
        delete safeSub.createdBy.resetPasswordToken;
        delete safeSub.createdBy.resetPasswordExpires;
      }
      return safeSub;
    });

    const totalPages = Math.ceil(total / limitNum);

    const response = {
      success: true,
      data: safeSubcategories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 300); // Cache for 5 minutes
    }

    res.json(response);

  } catch (error) {
    console.error('[GET SUBCATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      code: 'SUBCATEGORIES_FETCH_ERROR',
      requestId
    });
  }
};

// Get Subcategory by ID
const getSubcategoryById = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const { cache: useCacheParam = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('admin:subcategory:single', { id });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedSubcategory = await cache.get(cacheKey);
      if (cachedSubcategory) {
        console.log('Cache HIT admin:subcategory:single:', cacheKey);
        return res.json({
          ...cachedSubcategory,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

    const subcategory = await Subcategory.findOne({ _id: id, deletedAt: null })
      .populate('category', 'name slug description')
      .populate('createdBy', 'name email')
      .lean();

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Remove sensitive fields
    delete subcategory.__v;
    delete subcategory.deletedAt;
    delete subcategory.deletedBy;
    delete subcategory.version;
    delete subcategory.lastUpdatedBy;
    if (subcategory.createdBy) {
      delete subcategory.createdBy.password;
      delete subcategory.createdBy.resetPasswordToken;
      delete subcategory.createdBy.resetPasswordExpires;
    }

    const response = {
      success: true,
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 600); // Cache for 10 minutes
    }

    res.json(response);

  } catch (error) {
    console.error('[GET SUBCATEGORY BY ID ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategory',
      code: 'SUBCATEGORY_FETCH_ERROR',
      requestId
    });
  }
};

// Get Subcategories by Category
const getSubcategoriesByCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { categoryId } = req.params;
    const { activeOnly = true, includeStats = false } = req.query;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    const cacheKey = generateCacheKey(`subcategories:category:${categoryId}`, {
      activeOnly,
      includeStats
    });

    let result = await cache.get(cacheKey);
    
    if (!result) {
      const filter = {
        category: categoryId,
        deletedAt: null
      };

      if (activeOnly === 'true' || activeOnly === true) {
        filter.isActive = true;
      }

      const subcategories = await Subcategory.find(filter)
        .select('name slug description order servicesCount gigsCount isActive')
        .sort({ order: 1, name: 1 })
        .lean();

      result = { subcategories };

      if (includeStats === 'true' || includeStats === true) {
        const stats = await Subcategory.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
              totalServices: { $sum: '$servicesCount' },
              totalGigs: { $sum: '$gigsCount' }
            }
          }
        ]);
        
        result.stats = stats[0] || {
          total: 0,
          active: 0,
          totalServices: 0,
          totalGigs: 0
        };
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, result, 300);
    }

    res.json({
      success: true,
      data: result.subcategories,
      stats: result.stats,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cached: result !== undefined
    });

  } catch (error) {
    next(error);
  }
};
const getSubcategoriesDropdown = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { categoryId } = req.params; // Changed from req.query to req.params
    const { activeOnly = true, cache: useCacheParam = 'false' } = req.query;

    console.log('[GET SUBCATEGORIES DROPDOWN] Request:', {
      categoryId,
      activeOnly,
      admin: req.admin?.email
    });

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('admin:subcategories:dropdown', {
      categoryId,
      activeOnly
    });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedSubcategories = await cache.get(cacheKey);
      if (cachedSubcategories) {
        console.log('Cache HIT admin:subcategories:dropdown:', cacheKey);
        return res.json({
          ...cachedSubcategories,
          cached: true,
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Build filter
    const filter = {
      category: categoryId,
      deletedAt: null
    };

    if (activeOnly === 'true' || activeOnly === true) {
      filter.isActive = true;
    }

    // Get subcategories WITH category population
    const subcategories = await Subcategory.find(filter)
      .populate('category', 'name slug description') // ADD THIS
      .select('name slug description icon order servicesCount gigsCount')
      .sort({ order: 1, name: 1 })
      .lean();

    console.log(`[GET SUBCATEGORIES DROPDOWN] Found ${subcategories.length} subcategories for category ${categoryId}`);

    const response = {
      success: true,
      data: subcategories,
      count: subcategories.length,
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result if enabled
    if (useCache) {
      await cache.set(cacheKey, response, 600); // Cache for 10 minutes
    }

    res.json(response);

  } catch (error) {
    console.error('[GET SUBCATEGORIES DROPDOWN ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      code: 'SUBCATEGORIES_FETCH_ERROR',
      requestId
    });
  }
};
// Get Subcategory by Slug
const getSubcategoryBySlug = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { slug } = req.params;
    
    const subcategory = await Subcategory.findOne({ 
      slug,
      isActive: true 
    }).populate('category', 'name slug');
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'NOT_FOUND',
        requestId
      });
    }
    
    res.json({
      success: true,
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      code: 'SERVER_ERROR',
      requestId
    });
  }
};

// Update Subcategory (Admin)
const updateSubcategory = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('[UPDATE SUBCATEGORY] Request:', { id, updates });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    // Find existing subcategory
    const existingSubcategory = await Subcategory.findById(id);
    if (!existingSubcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check for version conflict
    if (updates.version && updates.version !== existingSubcategory.version) {
      return res.status(409).json({
        success: false,
        message: 'Subcategory was modified by another user. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
        currentVersion: existingSubcategory.version,
        requestId
      });
    }

    // Prepare update data
    const updateData = {
      ...updates,
      lastUpdatedBy: req.admin._id,
      $inc: { version: 1 }
    };

    // Remove version from update data
    delete updateData.version;

    // If changing category, validate new category
    if (updates.category && updates.category !== existingSubcategory.category.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updates.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
          code: 'INVALID_CATEGORY_ID',
          requestId
        });
      }

      const newCategory = await Category.findById(updates.category);
      if (!newCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }

      // Check for duplicate name in new category
      const duplicate = await Subcategory.findOne({
        name: updates.name || existingSubcategory.name,
        category: updates.category,
        _id: { $ne: id },
        deletedAt: null
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory with this name already exists in the new category',
          code: 'DUPLICATE_IN_NEW_CATEGORY',
          requestId
        });
      }
    }

    // If changing name, check for duplicates in same category
    if (updates.name && updates.name !== existingSubcategory.name) {
      const duplicate = await Subcategory.findOne({
        name: updates.name,
        category: updates.category || existingSubcategory.category,
        _id: { $ne: id },
        deletedAt: null
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory with this name already exists',
          code: 'DUPLICATE_NAME',
          requestId
        });
      }
    }

    // Update subcategory
    const subcategory = await Subcategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('category', 'name slug')
    .lean();

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Remove sensitive fields
    delete subcategory.__v;
    delete subcategory.deletedAt;
    delete subcategory.deletedBy;
    delete subcategory.version;
    delete subcategory.lastUpdatedBy;

    // ===== INVALIDATE CACHE =====
    await invalidateSpecificCache('subcategory', id);
    await invalidateAdminCache('subcategories');

    res.json({
      success: true,
      message: 'Subcategory updated successfully',
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[UPDATE SUBCATEGORY ERROR]', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this slug already exists',
        code: 'DUPLICATE_SLUG',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update subcategory',
      code: 'SUBCATEGORY_UPDATE_ERROR',
      requestId
    });
  }
};

// Delete Subcategory (Admin)
const deleteSubcategory = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    console.log('[DELETE SUBCATEGORY] Request:', { id, permanent, force });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    const subcategory = await Subcategory.findById(id);
    
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    if (subcategory.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is already deleted',
        code: 'ALREADY_DELETED',
        requestId
      });
    }

    let result;
    const now = new Date();
    
    if (permanent === 'true') {
      // Check for dependencies if not forcing
      if (force !== 'true') {
        if (subcategory.servicesCount > 0 || subcategory.gigsCount > 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete subcategory with active services or gigs',
            code: 'DEPENDENCIES_EXIST',
            requestId
          });
        }
      }
      
      // Permanent delete
      result = await Subcategory.deleteOne({ _id: id });
      
      console.log('[DELETE SUBCATEGORY] Permanent deletion successful:', id);
      
    } else {
      // Soft delete
      result = await Subcategory.findByIdAndUpdate(
        id,
        {
          isActive: false,
          deletedAt: now,
          deletedBy: req.admin._id,
          lastUpdatedBy: req.admin._id
        },
        { new: true }
      );
      
      console.log('[DELETE SUBCATEGORY] Soft deletion successful:', id);
    }

    // ===== INVALIDATE CACHE =====
    await invalidateSpecificCache('subcategory', id);
    await invalidateAdminCache('subcategories');
    await invalidateAdminCache('categories');

    res.json({
      success: true,
      message: permanent === 'true' ? 'Subcategory permanently deleted' : 'Subcategory deleted successfully',
      data: {
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        isActive: false,
        deletedAt: now
      },
      requestId,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('[DELETE SUBCATEGORY ERROR]', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID format',
        code: 'INVALID_ID_FORMAT',
        requestId
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcategory',
      code: 'DELETE_SUBCATEGORY_ERROR',
      requestId
    });
  }
};

// Restore Subcategory
const restoreSubcategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Authentication from cookies
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const subcategory = await Subcategory.findOne({
      _id: id,
      deletedAt: { $ne: null }
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found or not deleted',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check if parent category is still active
    const parentCategory = await Category.findOne({
      _id: subcategory.category,
      isActive: true,
      deletedAt: null
    });

    if (!parentCategory) {
      return res.status(400).json({
        success: false,
        message: 'Parent category is inactive or deleted',
        code: 'PARENT_CATEGORY_INACTIVE',
        requestId
      });
    }

    subcategory.isActive = true;
    subcategory.deletedAt = null;
    subcategory.deletedBy = null;
    subcategory.lastUpdatedBy = req.user._id; // From cookies
    
    await subcategory.save();

    await invalidateSubcategoryCache(id);

    res.json({
      success: true,
      data: subcategory,
      message: 'Subcategory restored successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    next(error);
  }
};

// Bulk operations
const bulkUpdateSubcategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { ids, operation, data = {} } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No subcategories selected',
        code: 'NO_SUBCATEGORIES_SELECTED',
        requestId
      });
    }

    // Validate IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid subcategory IDs provided',
        code: 'INVALID_IDS',
        requestId
      });
    }

    let updateData = {};
    let message = 'Subcategories updated successfully';

    switch (operation) {
      case 'activate':
        updateData = { isActive: true };
        message = 'Subcategories activated successfully';
        break;
        
      case 'deactivate':
        updateData = { isActive: false };
        message = 'Subcategories deactivated successfully';
        break;
        
      default:
        updateData = data;
    }

    updateData.lastUpdatedBy = req.admin._id;
    updateData.$inc = { version: 1 };

    // Perform bulk update
    const result = await Subcategory.updateMany(
      { _id: { $in: validIds } },
      { $set: updateData }
    );

    // ===== INVALIDATE CACHE =====
    await invalidateAdminCache('subcategories');
    await invalidateAdminCache('categories');

    res.json({
      success: true,
      message,
      modifiedCount: result.modifiedCount,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BULK UPDATE SUBCATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      code: 'BULK_OPERATION_ERROR',
      requestId
    });
  }
};
const repairSubcategoryCounts = async (req, res) => {
  const requestId = generateRequestId();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    console.log('[REPAIR SUBCATEGORY COUNTS] Starting repair process...');
    
    // Get all subcategories
    const subcategories = await Subcategory.find({ deletedAt: null }).lean();
    console.log(`[REPAIR SUBCATEGORY COUNTS] Found ${subcategories.length} subcategories to repair`);
    
    let repairedCount = 0;
    const results = [];
    
    for (const subcategory of subcategories) {
      try {
        // Get actual count of active gigs for this subcategory
        const actualGigsCount = await Gig.countDocuments({
          subcategory: subcategory._id,
          status: 'open',
          isActive: true,
          deletedAt: null
        });
        
        // Get actual count of active services for this subcategory
        const actualServicesCount = await Service.countDocuments({
          subcategory: subcategory._id,
          status: 'active',
          isActive: true,
          deletedAt: null
        });
        
        // Only update if counts are different
        if (actualGigsCount !== subcategory.gigsCount || actualServicesCount !== subcategory.servicesCount) {
          await Subcategory.findByIdAndUpdate(subcategory._id, {
            gigsCount: Math.max(0, actualGigsCount), // Ensure non-negative
            servicesCount: Math.max(0, actualServicesCount) // Ensure non-negative
          });
          
          repairedCount++;
          results.push({
            subcategoryId: subcategory._id,
            subcategoryName: subcategory.name,
            oldGigsCount: subcategory.gigsCount,
            newGigsCount: actualGigsCount,
            oldServicesCount: subcategory.servicesCount,
            newServicesCount: actualServicesCount,
            repaired: true
          });
          
          console.log(`[REPAIR] Subcategory "${subcategory.name}" repaired: gigs ${subcategory.gigsCount} → ${actualGigsCount}, services ${subcategory.servicesCount} → ${actualServicesCount}`);
        } else {
          results.push({
            subcategoryId: subcategory._id,
            subcategoryName: subcategory.name,
            status: 'already_correct',
            gigsCount: actualGigsCount,
            servicesCount: actualServicesCount
          });
        }
      } catch (error) {
        console.error(`[REPAIR ERROR] Failed to repair subcategory ${subcategory._id}:`, error);
        results.push({
          subcategoryId: subcategory._id,
          subcategoryName: subcategory.name,
          error: error.message,
          repaired: false
        });
      }
    }
    
    // Invalidate cache after repair
    await invalidateSubcategoryCache();
    
    res.json({
      success: true,
      message: `Repaired ${repairedCount} out of ${subcategories.length} subcategories`,
      result: {
        totalSubcategories: subcategories.length,
        repairedCount,
        failedCount: subcategories.length - repairedCount,
        details: results
      },
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[REPAIR SUBCATEGORY COUNTS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to repair subcategory counts',
      code: 'REPAIR_FAILED',
      requestId
    });
  }
};
// Updated getSubcategoryStats function
const getSubcategoryStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    // Generate cache key
    const cacheKey = generateCacheKey('admin:stats:subcategories', {
      timestamp: Math.floor(Date.now() / 60000)
    });
    
    // Try to get from cache
    const cachedStats = await cache.get(cacheKey);
    if (cachedStats) {
      console.log('Cache HIT admin:stats:subcategories');
      return res.json({
        ...cachedStats,
        cached: true,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // FIXED AGGREGATION: Use direct counts from services and gigs
    const [subcategories, categoryStats] = await Promise.all([
      Subcategory.find({ deletedAt: null })
        .populate('category', 'name slug')
        .select('name slug category servicesCount gigsCount isActive')
        .lean(),
      
      // Get actual counts from services and gigs grouped by subcategory
      Promise.all([
        Service.aggregate([
          { $match: { status: 'active', isActive: true, deletedAt: null } },
          { $group: { _id: '$subcategory', count: { $sum: 1 } } }
        ]),
        Gig.aggregate([
          { $match: { status: 'open', isActive: true, deletedAt: null } },
          { $group: { _id: '$subcategory', count: { $sum: 1 } } }
        ])
      ])
    ]);

    // Create maps for actual counts
    const serviceCountMap = {};
    const gigCountMap = {};
    
    // Process service counts
    if (categoryStats[0]) {
      categoryStats[0].forEach(item => {
        if (item._id) {
          serviceCountMap[item._id.toString()] = item.count;
        }
      });
    }
    
    // Process gig counts
    if (categoryStats[1]) {
      categoryStats[1].forEach(item => {
        if (item._id) {
          gigCountMap[item._id.toString()] = item.count;
        }
      });
    }

    // Update subcategories with actual counts
    const updatedSubcategories = subcategories.map(sub => {
      const subId = sub._id.toString();
      const actualServices = serviceCountMap[subId] || 0;
      const actualGigs = gigCountMap[subId] || 0;
      
      // Fix negative counts
      const fixedServices = Math.max(0, actualServices);
      const fixedGigs = Math.max(0, actualGigs);
      
      return {
        ...sub,
        servicesCount: fixedServices,
        gigsCount: fixedGigs
      };
    });

    // Calculate overview
    const overview = {
      totalSubcategories: updatedSubcategories.length,
      activeSubcategories: updatedSubcategories.filter(s => s.isActive).length,
      totalServices: updatedSubcategories.reduce((sum, sub) => sum + sub.servicesCount, 0),
      totalGigs: updatedSubcategories.reduce((sum, sub) => sum + sub.gigsCount, 0),
      avgServices: updatedSubcategories.length > 0 
        ? updatedSubcategories.reduce((sum, sub) => sum + sub.servicesCount, 0) / updatedSubcategories.length
        : 0,
      avgGigs: updatedSubcategories.length > 0 
        ? updatedSubcategories.reduce((sum, sub) => sum + sub.gigsCount, 0) / updatedSubcategories.length
        : 0
    };

    // Group by category
    const byCategoryMap = {};
    updatedSubcategories.forEach(sub => {
      const catId = sub.category?._id?.toString() || 'unknown';
      
      if (!byCategoryMap[catId]) {
        byCategoryMap[catId] = {
          _id: sub.category?._id || null,
          count: 0,
          totalServices: 0,
          totalGigs: 0,
          category: sub.category || { name: 'Unknown', slug: '' }
        };
      }
      
      byCategoryMap[catId].count += 1;
      byCategoryMap[catId].totalServices += sub.servicesCount;
      byCategoryMap[catId].totalGigs += sub.gigsCount;
    });

    const byCategory = Object.values(byCategoryMap).sort((a, b) => b.count - a.count);

    // Get growth data
    const growth = await Subcategory.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Update database with corrected counts
    for (const sub of updatedSubcategories) {
      if (sub.servicesCount !== sub.servicesCount || sub.gigsCount !== sub.gigsCount) {
        await Subcategory.findByIdAndUpdate(sub._id, {
          servicesCount: Math.max(0, sub.servicesCount),
          gigsCount: Math.max(0, sub.gigsCount)
        });
      }
    }

    const response = {
      success: true,
      data: {
        overview: [overview],
        byCategory,
        growth
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // Cache for 5 minutes

    res.json(response);

  } catch (error) {
    console.error('[SUBCATEGORY STATS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategory statistics',
      code: 'SUBCATEGORY_STATS_ERROR',
      requestId
    });
  }
};

// Export Subcategories
const exportSubcategories = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { format = 'json', cache: useCacheParam = 'false' } = req.query;

    // Generate cache key
    const cacheKey = generateCacheKey('admin:export:subcategories', { format });
    
    // Try cache if enabled
    const useCache = useCacheParam === 'true';
    if (useCache) {
      const cachedExport = await cache.get(cacheKey);
      if (cachedExport) {
        console.log('Cache HIT admin:export:subcategories:', cacheKey);
        
        if (format === 'csv') {
          res.header('Content-Type', 'text/csv');
          res.header('Content-Disposition', `attachment; filename="subcategories_export_${Date.now()}.csv"`);
          res.header('X-Request-ID', requestId);
          res.header('X-Export-Records', cachedExport.count);
          res.header('X-Export-Timestamp', new Date().toISOString());
          res.header('X-Cache', 'HIT');
          
          return res.send(cachedExport.csvContent);
        }
        
        return res.json({
          success: true,
          format: 'json',
          count: cachedExport.count,
          data: cachedExport.data,
          exportedAt: cachedExport.exportedAt,
          requestId,
          cached: true
        });
      }
    }

    // Get subcategories with populated data
    const subcategories = await Subcategory.find({ deletedAt: null })
      .populate('category', 'name slug')
      .populate('createdBy', 'name email')
      .select('-__v -lastUpdatedBy -deletedAt -deletedBy -version')
      .lean();

    if (format === 'csv') {
      const headers = [
        'ID', 'Name', 'Slug', 'Description', 'Category', 
        'Order', 'Active', 'Services Count', 'Gigs Count',
        'Created At', 'Updated At'
      ];

      const csvRows = subcategories.map(sub => [
        sub._id,
        `"${(sub.name || '').replace(/"/g, '""')}"`,
        sub.slug || '',
        `"${(sub.description || '').replace(/"/g, '""')}"`,
        sub.category?.name || '',
        sub.order || 0,
        sub.isActive ? 'Yes' : 'No',
        sub.servicesCount || 0,
        sub.gigsCount || 0,
        new Date(sub.createdAt).toISOString(),
        new Date(sub.updatedAt).toISOString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Cache the export if enabled
      if (useCache) {
        await cache.set(cacheKey, {
          csvContent,
          count: subcategories.length,
          exportedAt: new Date().toISOString()
        }, 3600); // Cache exports for 1 hour
      }

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="subcategories_export_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', subcategories.length);
      res.header('X-Export-Timestamp', new Date().toISOString());
      res.header('X-Cache', useCache ? 'MISS' : 'BYPASSED');
      
      return res.send(csvContent);
    }

    // Default to JSON
    const exportData = {
      success: true,
      format: 'json',
      count: subcategories.length,
      data: subcategories,
      exportedAt: new Date().toISOString(),
      requestId
    };
    
    // Cache the JSON export if enabled
    if (useCache) {
      await cache.set(cacheKey, exportData, 3600); // Cache exports for 1 hour
    }
    
    res.json(exportData);

  } catch (error) {
    console.error('[EXPORT SUBCATEGORIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subcategories',
      code: 'EXPORT_ERROR',
      requestId
    });
  }
};
module.exports = {
  createSubcategory,
  getSubcategories,
  getSubcategoryById,
  getSubcategoriesByCategory,
  updateSubcategory,
  deleteSubcategory,
  restoreSubcategory,
  bulkUpdateSubcategories,
  getSubcategoryBySlug,
  repairSubcategoryCounts,
  exportSubcategories,
  getSubcategoryStats,
  getSubcategoriesDropdown
};