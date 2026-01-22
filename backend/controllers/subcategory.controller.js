const mongoose = require('mongoose');
const crypto = require('crypto');
const Subcategory = require('../models/subcategory.model.js');
const Category = require('../models/category.model.js');
const { sanitizeHtml, sanitizeObject } = require('../utils/sanitize.js');
const cache = require('../utils/cache.js');

const generateRequestId = () => crypto.randomUUID();

// Cache helper
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

const invalidateSubcategoryCache = async (subcategoryId = null) => {
  try {
    // Clear all subcategory-related cache
    await cache.del('subcategories:*');
    await cache.del('subcategory:*');
    if (subcategoryId) {
      await cache.del(`subcategory:${subcategoryId}:*`);
    }
    // Also clear admin subcategory cache
    await cache.del('admin:subcategories:*');
    console.log('Subcategory cache invalidated globally');
  } catch (err) {
    console.warn('Error invalidating subcategory cache:', err.message);
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
const createSubcategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
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

    const { name, category, description, order = 0, metaTitle, metaDescription, metaKeywords } = req.body;

    // Validate parent category exists and is active
    const parentCategory = await Category.findOne({
      _id: category,
      isActive: true,
      deletedAt: null
    });

    if (!parentCategory) {
      return res.status(400).json({
        success: false,
        message: 'Parent category not found or inactive',
        code: 'PARENT_CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check for duplicate name within same category
    const existingSubcategory = await Subcategory.findOne({
      name: name.trim(),
      category: category,
      isActive: true,
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

    const subcategory = await Subcategory.create({
      name: name.trim(),
      category,
      description: description?.trim() || '',
      order,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
      metaKeywords: Array.isArray(metaKeywords) ? metaKeywords.map(k => k.trim()) : [],
      createdBy: req.user._id, // From cookies
      isActive: true
    });

    await invalidateSubcategoryCache();

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Request-ID': requestId,
      'X-Cache-Invalidated': 'true'
    });

    res.status(201).json({
      success: true,
      data: subcategory,
      message: 'Subcategory created successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cacheInvalidated: true
    });

  } catch (error) {
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
    
    next(error);
  }
};

// Get Subcategories
const getSubcategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      category,
      name,
      slug,
      search,
      isActive = true,
      page = 1,
      limit = 20,
      sort = 'order',
      order = 'asc',
      fields,
      populate = true,
      cache: useCache = true
    } = req.query;

    const filter = { deletedAt: null };
    
    // Filter by category (optional)
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }
    
    // Filter by name
    if (name) {
      filter.name = { $regex: `^${sanitizeHtml(name, { allowedTags: [] })}`, $options: 'i' };
    }
    
    // Filter by slug
    if (slug) {
      filter.slug = slug.toLowerCase();
    }
    
    // Search
    if (search) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { slug: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortField = ['name', 'order', 'createdAt', 'servicesCount', 'gigsCount'].includes(sort) ? sort : 'order';
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortField]: sortOrder };

    // Cache key
    const cacheKey = generateCacheKey('subcategories', {
      filter,
      page: pageNum,
      limit: limitNum,
      sort: sortObj,
      populate
    });

    let subcategories, total;
    
    if (useCache && pageNum === 1) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        subcategories = cached.subcategories;
        total = cached.total;
      }
    }

    if (!subcategories || !total) {
      const query = Subcategory.find(filter)
        .select('-__v -deletedAt -deletedBy -version')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      if (populate === 'true' || populate === true) {
        query.populate('category', 'name slug');
        query.populate('createdBy', 'name email');
      }

      [subcategories, total] = await Promise.all([
        query.lean(),
        Subcategory.countDocuments(filter)
      ]);

      if (useCache && pageNum === 1) {
        await cache.set(cacheKey, { subcategories, total }, 300); // 5 minutes
      }
    }

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: subcategories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cached: useCache && pageNum === 1 && subcategories !== undefined
    });

  } catch (error) {
    next(error);
  }
};

// Get Subcategory by ID
const getSubcategoryById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { populate = true } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const cacheKey = generateCacheKey(`subcategory:${id}`, { populate });

    let subcategory = await cache.get(cacheKey);
    
    if (!subcategory) {
      const query = Subcategory.findOne({
        _id: id,
        deletedAt: null
      }).select('-__v -deletedAt -deletedBy -version');

      if (populate === 'true' || populate === true) {
        query.populate('category', 'name slug');
        query.populate('createdBy', 'name email');
      }

      subcategory = await query.lean();

      if (!subcategory) {
        return res.status(404).json({
          success: false,
          message: 'Subcategory not found',
          code: 'SUBCATEGORY_NOT_FOUND',
          requestId
        });
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, subcategory, 600);
    }

    res.json({
      success: true,
      data: subcategory,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cached: subcategory !== undefined
    });

  } catch (error) {
    next(error);
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

// Update Subcategory
const updateSubcategory = async (req, res, next) => {
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
    const updateData = req.body;

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
      deletedAt: null
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }
if (updateData.category && updateData.category !== subcategory.category.toString()) {
  const newCategory = await Category.findOne({
    _id: updateData.category,
    isActive: true,
    deletedAt: null
  });

  if (!newCategory) {
    return res.status(400).json({
      success: false,
      message: 'New parent category not found or inactive',
      code: 'PARENT_CATEGORY_NOT_FOUND',
      requestId
    });
  }

  // Check for duplicate name in the NEW category (if name is also being changed)
  if (updateData.name) {
    const duplicateInNewCategory = await Subcategory.findOne({
      name: updateData.name.trim(),
      category: updateData.category,
      _id: { $ne: id },
      deletedAt: null
    });

    if (duplicateInNewCategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory with this name already exists in the new category',
        code: 'DUPLICATE_IN_NEW_CATEGORY',
        requestId
      });
    }
  }
}

    updateData.lastUpdatedBy = req.user._id; // From cookies

    const updatedSubcategory = await Subcategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    await invalidateSubcategoryCache(id);

  res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Request-ID': requestId,
      'X-Cache-Invalidated': 'true'
    });

    res.json({
      success: true,
      data: updatedSubcategory,
      message: 'Subcategory updated successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cacheInvalidated: true
    });

  } catch (error) {
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
    
    next(error);
  }
};

// Delete Subcategory
const deleteSubcategory = async (req, res, next) => {
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
    const { force = false } = req.query;

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
      deletedAt: null
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check for dependencies (services and gigs)
    if (!force) {
      const Service = mongoose.model('Service');
      const Gig = mongoose.model('Gig');
      
      const [serviceCount, gigCount] = await Promise.all([
        Service.countDocuments({ 
          subcategory: id,
          isActive: true,
          deletedAt: null 
        }),
        Gig.countDocuments({ 
          subcategory: id,
          isActive: true,
          deletedAt: null 
        })
      ]);

      if (serviceCount > 0 || gigCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete subcategory with active services or gigs',
          details: {
            services: serviceCount,
            gigs: gigCount
          },
          code: 'DEPENDENCIES_EXIST',
          requestId
        });
      }
    }

    // Soft delete
    subcategory.isActive = false;
    subcategory.deletedAt = new Date();
    subcategory.deletedBy = req.user._id; // From cookies
    subcategory.lastUpdatedBy = req.user._id; // From cookies
    
    await subcategory.save();

    await invalidateSubcategoryCache(id);

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Request-ID': requestId,
      'X-Cache-Invalidated': 'true'
    });

    res.json({
      success: true,
      message: 'Subcategory deleted successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cacheInvalidated: true
    });

  } catch (error) {
    next(error);
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
const bulkUpdateSubcategories = async (req, res, next) => {
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

    const { ids, operation, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required',
        code: 'IDS_REQUIRED',
        requestId
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 100 items at once',
        code: 'BATCH_SIZE_EXCEEDED',
        requestId
      });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IDs found in request',
        code: 'INVALID_IDS',
        requestId
      });
    }

    const allowedOperations = ['activate', 'deactivate', 'update', 'move'];
    
    if (!allowedOperations.includes(operation)) {
      return res.status(400).json({
        success: false,
        message: `Invalid operation. Allowed: ${allowedOperations.join(', ')}`,
        code: 'INVALID_OPERATION',
        requestId
      });
    }

    let updateData = {};
    const now = new Date();

    switch (operation) {
      case 'activate':
        updateData = { isActive: true };
        break;
      case 'deactivate':
        updateData = { isActive: false };
        break;
      case 'update':
        updateData = data || {};
        break;
      case 'move':
        if (!data || !data.category) {
          return res.status(400).json({
            success: false,
            message: 'Category ID is required for move operation',
            code: 'CATEGORY_REQUIRED',
            requestId
          });
        }
        updateData = { category: data.category };
        break;
    }

    updateData.lastUpdatedBy = req.user._id; // From cookies
    updateData.updatedAt = now;

    const result = await Subcategory.updateMany(
      { _id: { $in: validIds }, deletedAt: null },
      updateData,
      { runValidators: operation === 'update' || operation === 'move' }
    );

    await invalidateSubcategoryCache();
res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Request-ID': requestId,
      'X-Cache-Invalidated': 'true'
    });

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        total: ids.length,
        matched: result.matchedCount,
        modified: result.modifiedCount
      },
      requestId,
      timestamp: now.toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cacheInvalidated: true
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed in bulk update',
        errors: messages,
        code: 'BULK_VALIDATION_ERROR',
        requestId
      });
    }
    
    next(error);
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
  repairSubcategoryCounts
};