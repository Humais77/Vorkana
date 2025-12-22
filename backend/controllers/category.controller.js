const mongoose = require('mongoose');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');
const Gig = require('../models/gig.model.js');
const { sanitizeHtml, sanitizeObject } = require('../utils/sanitize.js');

// Security: Request ID for tracking
const crypto = require('crypto');
const generateRequestId = () => crypto.randomUUID();
// Security: Input sanitization for categories
const sanitizeCategoryInput = (data) => {
  const skipKeys = ['parentCategory', 'createdBy', 'lastUpdatedBy', 'order', 'level', 'version'];
  return sanitizeObject(data, skipKeys);
};

// Security: Build secure query
const buildSecureCategoryQuery = (queryParams, userRole, userId) => {
  const {
    search,
    name,
    slug,
    parentCategory,
    featured,
    popular,
    isActive,
    level,
    minServicesCount,
    maxServicesCount,
    minGigsCount,
    maxGigsCount,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    createdBy,
    hasImage,
    hasParent,
    ids,
    excludeIds,
    showAll = false
  } = queryParams;

  const filter = {};

  // Security: Only admin can see all categories
  if (showAll && userRole === 'admin') {
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
  } else {
    filter.isActive = true;
  }

  // Search with sanitization
  if (search) {
    const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
    const searchRegex = { $regex: sanitizedSearch, $options: 'i' };
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { slug: searchRegex },
      { metaKeywords: { $in: [new RegExp(sanitizedSearch, 'i')] } }
    ];
  }
// Add this helper function:
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Update the controller code:
if (name) {
  const sanitizedName = sanitizeHtml(name, { allowedTags: [] });
  const escapedName = escapeRegex(sanitizedName);
  filter.name = { $regex: `^${escapedName}`, $options: 'i' };
}
  
  if (slug) {
    filter.slug = sanitizeHtml(slug, { allowedTags: [] });
  }
  
  // Validate ObjectIds
  if (parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)) {
    filter.parentCategory = parentCategory;
  }
  
  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
  }

  // Boolean filters
  if (featured !== undefined) filter.featured = featured;
  if (popular !== undefined) filter.popular = popular;
  if (level !== undefined) filter.level = parseInt(level) || 0;
  
  if (hasImage === 'true' || hasImage === true) {
    filter.image = { $exists: true, $ne: '' };
  }
  
  if (hasParent === 'true' || hasParent === true) {
    filter.parentCategory = { $exists: true, $ne: null };
  }
  
  if (hasParent === 'false' || hasParent === false) {
    filter.parentCategory = { $in: [null, undefined] };
  }

  // Count filters with validation
  if (minServicesCount !== undefined) {
    filter.servicesCount = { ...filter.servicesCount, $gte: parseInt(minServicesCount) || 0 };
  }
  
  if (maxServicesCount !== undefined) {
    filter.servicesCount = { ...filter.servicesCount, $lte: parseInt(maxServicesCount) || 0 };
  }
  
  if (minGigsCount !== undefined) {
    filter.gigsCount = { ...filter.gigsCount, $gte: parseInt(minGigsCount) || 0 };
  }
  
  if (maxGigsCount !== undefined) {
    filter.gigsCount = { ...filter.gigsCount, $lte: parseInt(maxGigsCount) || 0 };
  }

  // Date filters with validation
  if (createdAfter) {
    const date = new Date(createdAfter);
    if (!isNaN(date.getTime())) {
      filter.createdAt = { ...filter.createdAt, $gte: date };
    }
  }
  
  if (createdBefore) {
    const date = new Date(createdBefore);
    if (!isNaN(date.getTime())) {
      filter.createdAt = { ...filter.createdAt, $lte: date };
    }
  }
  
  if (updatedAfter) {
    const date = new Date(updatedAfter);
    if (!isNaN(date.getTime())) {
      filter.updatedAt = { ...filter.updatedAt, $gte: date };
    }
  }
  
  if (updatedBefore) {
    const date = new Date(updatedBefore);
    if (!isNaN(date.getTime())) {
      filter.updatedAt = { ...filter.updatedAt, $lte: date };
    }
  }

  // ID filters with validation
  if (ids) {
    const idArray = Array.isArray(ids) ? ids : ids.split(',').map(id => id.trim());
    const validIds = idArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length > 0) {
      filter._id = { $in: validIds };
    }
  }

  if (excludeIds) {
    const excludeArray = Array.isArray(excludeIds) ? excludeIds : excludeIds.split(',').map(id => id.trim());
    const validExcludeIds = excludeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validExcludeIds.length > 0) {
      filter._id = { ...filter._id, $nin: validExcludeIds };
    }
  }

  return filter;
};

// Security: Add audit trail
const logAudit = (action, resource, resourceId, userId, details = {}) => {
  console.log(`[AUDIT] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};

// Create Category (Admin Only)
const createCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Security: Role check
    if (req.user.role !== 'admin') {
      logAudit('UNAUTHORIZED_ACCESS', 'CATEGORY', 'NONE', req.user._id, { ip: req.ip });
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const sanitizedData = sanitizeCategoryInput(req.body);
    
    // Security: Check for circular parent reference
    if (sanitizedData.parentCategory) {
      if (sanitizedData.parentCategory === req.body._id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
          code: 'CIRCULAR_REFERENCE',
          requestId
        });
      }
    }

    const category = await Category.create({
      ...sanitizedData,
      createdBy: req.user._id,
      version: 1
    });

    // Security: Audit log
    logAudit('CREATE', 'CATEGORY', category._id, req.user._id, {
      name: category.name,
      parentCategory: category.parentCategory
    });

    // Security: Remove sensitive data
    const safeCategory = category.toObject();
    delete safeCategory.__v;
    delete safeCategory.createdBy;
    delete safeCategory.deletedAt;
    delete safeCategory.deletedBy;

    const responseTime = Date.now() - startTime;
    
    res.status(201).json({
      success: true,
      data: safeCategory,
      message: 'Category created successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  } catch (error) {
    // Security: Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with that name already exists',
        code: 'DUPLICATE_CATEGORY',
        requestId
      });
    }
    
    // Security: Handle validation errors
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
    
    logAudit('ERROR', 'CATEGORY', 'CREATE', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Categories with Advanced Security
const getCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      search,
      q,
      name,
      slug,
      parentCategory,
      featured,
      popular,
      isActive,
      level,
      minServicesCount,
      maxServicesCount,
      minGigsCount,
      maxGigsCount,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      createdBy,
      hasImage,
      hasParent,
      ids,
      excludeIds,
      sort = 'createdAt',
      order = 'desc',
      sortBy,
      page = 1,
      limit = 10,
      offset,
      fields,
      excludeFields,
      populate = true,
      populateFields = 'name',
      showAll = false,
      includeSubcategories = false,
      includeCounts = false,
      lean = true,
      cache = false
    } = req.query;

    // Security: Validate user permissions
    const showAllFlag = showAll && req.user?.role === 'admin';

    // Build secure query
    const filter = buildSecureCategoryQuery({
      search: search || q,
      name,
      slug,
      parentCategory,
      featured,
      popular,
      isActive: showAllFlag ? isActive : undefined,
      level,
      minServicesCount,
      maxServicesCount,
      minGigsCount,
      maxGigsCount,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      createdBy,
      hasImage,
      hasParent,
      ids,
      excludeIds,
      showAll: showAllFlag
    }, req.user?.role, req.user?._id);

    // Security: Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;

    // Security: Validate sort field
    const allowedSortFields = ['name', 'order', 'createdAt', 'updatedAt', 'servicesCount', 'gigsCount', 'level', 'featured', 'popular'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // Security: Field selection
    const defaultExclude = ['__v', 'createdBy', 'deletedAt', 'deletedBy'];
    let select = {};
    
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      fieldArray.forEach(field => {
        if (!defaultExclude.includes(field)) {
          select[field] = 1;
        }
      });
    } else {
      // Default select all except excluded
      defaultExclude.forEach(field => {
        select[field] = 0;
      });
    }
    
    if (excludeFields) {
      const excludeArray = excludeFields.split(',').map(f => f.trim());
      excludeArray.forEach(field => {
        select[field] = 0;
      });
    }

    // Security: Populate configuration
    let populateOptions = [];
    if (populate) {
      const ALLOWED_POPULATE_FIELDS = ['parentCategory', 'subcategories', 'createdBy', 'lastUpdatedBy'];
const ALLOWED_SELECT_FIELDS = ['name', 'slug', 'icon', 'description', 'servicesCount', 'gigsCount'];

const validatePopulateFields = (requestedFields) => {
  const fields = requestedFields.split(',').map(f => f.trim());
  return fields.filter(field => ALLOWED_POPULATE_FIELDS.includes(field));
};

const validateSelectFields = (requestedFields) => {
  const fields = requestedFields.split(',').map(f => f.trim());
  return fields.filter(field => ALLOWED_SELECT_FIELDS.includes(field));
};

// In controller:
const safePopulateFields = validatePopulateFields(populateFields || '');
const safeSelectFields = validateSelectFields(fields || '');
      
      // Parent category populate
      populateOptions.push({
        path: 'parentCategory',
        select: 'name slug icon',
        match: { isActive: true }
      });

      // Subcategories if requested
      if (includeSubcategories) {
        populateOptions.push({
          path: 'subcategories',
          select: 'name slug icon servicesCount gigsCount',
          match: { isActive: true },
          options: { limit: 10 }
        });
      }
    }

    // Security: Execute queries in parallel with timeout
    const queryOptions = {
      select: Object.keys(select).length > 0 ? select : null,
      sort: sortObj,
      skip,
      limit: limitNum,
      populate: populateOptions.length > 0 ? populateOptions : null,
      lean: lean !== false,
      maxTimeMS: 5000 // 5 second timeout for security
    };

    const [categories, total] = await Promise.all([
      Category.find(filter, null, queryOptions),
      Category.countDocuments(filter)
    ]);

    // Security: Remove sensitive data
    const safeCategories = categories.map(cat => {
      if (lean) {
        // For lean documents
        const safeCat = { ...cat };
        delete safeCat.createdBy;
        delete safeCat.__v;
        delete safeCat.deletedAt;
        delete safeCat.deletedBy;
        delete safeCat.version;
        return safeCat;
      } else {
        // For mongoose documents
        const safeCat = cat.toObject();
        delete safeCat.createdBy;
        delete safeCat.__v;
        delete safeCat.deletedAt;
        delete safeCat.deletedBy;
        delete safeCat.version;
        return safeCat;
      }
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Response headers for security
    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'Cache-Control': cache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate'
    });

    // Include counts if requested
    let counts = {};
    if (includeCounts) {
      counts = {
        active: await Category.countDocuments({ ...filter, isActive: true }),
        featured: await Category.countDocuments({ ...filter, featured: true }),
        popular: await Category.countDocuments({ ...filter, popular: true }),
        withParent: await Category.countDocuments({ ...filter, parentCategory: { $exists: true, $ne: null } })
      };
    }

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: safeCategories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? pageNum + 1 : null,
        prevPage: hasPrev ? pageNum - 1 : null,
      },
      counts: Object.keys(counts).length > 0 ? counts : undefined,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    // Security: Handle query timeout
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
        requestId
      });
    }
    
    logAudit('ERROR', 'CATEGORY', 'GET_LIST', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Category by ID or Slug with Security
const getCategoryById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { fields, populate = true, includeSubcategories = false } = req.query;

    // Security: Validate input
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category identifier is required',
        code: 'MISSING_IDENTIFIER',
        requestId
      });
    }

    let query;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    // Security: Build query based on identifier type
    if (isObjectId) {
      query = { _id: id };
    } else {
      // Sanitize slug input
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] });
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    // Security: Check permissions
    if (req.user?.role !== 'admin') {
      query.isActive = true;
    }

    // Security: Field selection
    const defaultExclude = ['__v', 'createdBy', 'deletedAt', 'deletedBy', 'version'];
    let select = {};
    
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      fieldArray.forEach(field => {
        if (!defaultExclude.includes(field)) {
          select[field] = 1;
        }
      });
    } else {
      // Default exclude sensitive fields
      defaultExclude.forEach(field => {
        select[field] = 0;
      });
    }

    // Security: Populate configuration
    let populateOptions = [];
    if (populate) {
      populateOptions.push({
        path: 'parentCategory',
        select: 'name slug icon',
        match: { isActive: true }
      });

      if (includeSubcategories) {
        populateOptions.push({
          path: 'subcategories',
          select: 'name slug icon servicesCount gigsCount featured popular',
          match: { isActive: true },
          options: { sort: { order: 1, name: 1 } }
        });
      }
    }

    const category = await Category.findOne(query)
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(populateOptions);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Security: Check if user can view inactive category
    if (!category.isActive && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access to inactive category denied',
        code: 'ACCESS_DENIED',
        requestId
      });
    }

    // Security: Remove sensitive data
    const safeCategory = category.toObject();
    delete safeCategory.__v;
    delete safeCategory.createdBy;
    delete safeCategory.deletedAt;
    delete safeCategory.deletedBy;
    delete safeCategory.version;

    // Security: Audit log for sensitive access
    if (!category.isActive) {
      logAudit('VIEW_INACTIVE', 'CATEGORY', category._id, req.user?._id);
    }

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: safeCategory,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'GET_BY_ID', req.user?._id, { id: req.params.id, error: error.message });
    next(error);
  }
};

// Update Category with Security (Admin Only)
const updateCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Security: Role check
    if (req.user.role !== 'admin') {
      logAudit('UNAUTHORIZED_UPDATE', 'CATEGORY', req.params.id, req.user._id);
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { id } = req.params;
    
    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const sanitizedData = sanitizeCategoryInput(req.body);
    
    // Security: Check for circular parent reference
    if (sanitizedData.parentCategory) {
      if (sanitizedData.parentCategory === id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
          code: 'CIRCULAR_REFERENCE',
          requestId
        });
      }
      
      // Check if parent exists and is active
      const parentExists = await Category.findOne({
        _id: sanitizedData.parentCategory,
        isActive: true
      });
      
      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found or inactive',
          code: 'PARENT_NOT_FOUND',
          requestId
        });
      }
    }

    // Security: Optimistic concurrency control with version
    const currentVersion = sanitizedData.version;
    delete sanitizedData.version;

    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    // Security: Find and update with version check
    const category = await Category.findOneAndUpdate(
      { 
        _id: id,
        ...(currentVersion ? { version: currentVersion } : {})
      },
      updateData,
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('parentCategory', 'name slug');

    if (!category) {
      // Security: Handle version conflict
      if (currentVersion) {
        const currentDoc = await Category.findById(id);
        return res.status(409).json({
          success: false,
          message: 'Category was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          currentVersion: currentDoc?.version,
          requestId
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Security: Audit log
    logAudit('UPDATE', 'CATEGORY', category._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion || 1,
      newVersion: category.version
    });

    // Security: Remove sensitive data
    const safeCategory = category.toObject();
    delete safeCategory.__v;
    delete safeCategory.createdBy;
    delete safeCategory.lastUpdatedBy;
    delete safeCategory.deletedAt;
    delete safeCategory.deletedBy;
    delete safeCategory.version;

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: safeCategory,
      message: 'Category updated successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    // Security: Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with that name already exists',
        code: 'DUPLICATE_CATEGORY',
        requestId
      });
    }
    
    logAudit('ERROR', 'CATEGORY', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Delete Category with Security (Admin Only)
const deleteCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Security: Role check
    if (req.user.role !== 'admin') {
      logAudit('UNAUTHORIZED_DELETE', 'CATEGORY', req.params.id, req.user._id);
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    // Security: Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check if already deleted
    if (!category.isActive && category.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Category is already deleted',
        code: 'ALREADY_DELETED',
        requestId
      });
    }

    // Security: Check for dependencies if not forcing
    if (force !== 'true') {
      const [subcategories, services, gigs] = await Promise.all([
        Category.countDocuments({ parentCategory: id, isActive: true, deletedAt: null }),
        Service.countDocuments({ category: id, isActive: { $ne: false } }),
        Gig.countDocuments({ projectCategory: id, isActive: true })
      ]);

      if (subcategories > 0 || services > 0 || gigs > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with active dependencies',
          details: {
            subcategories,
            services,
            gigs
          },
          code: 'DEPENDENCIES_EXIST',
          requestId
        });
      }
    }

    let result;
    const now = new Date();
    
    // Security: Permanent delete (admin only)
    if (permanent === 'true' && req.user.role === 'admin') {
      result = await Category.findByIdAndDelete(id);
      
      // Security: Audit log for permanent delete
      logAudit('PERMANENT_DELETE', 'CATEGORY', id, req.user._id, {
        name: category.name,
        force: force === 'true'
      });
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Category permanently deleted',
        requestId,
        timestamp: now.toISOString(),
        responseTime: `${responseTime}ms`
      });
    } else {
      // Soft delete
      category.isActive = false;
      category.deletedAt = now;
      category.deletedBy = req.user._id;
      category.lastUpdatedBy = req.user._id;
      await category.save();
      
      // Security: Audit log for soft delete
      logAudit('SOFT_DELETE', 'CATEGORY', id, req.user._id, {
        name: category.name
      });
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Category soft deleted successfully',
        data: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
          deletedAt: category.deletedAt
        },
        requestId,
        timestamp: now.toISOString(),
        responseTime: `${responseTime}ms`
      });
    }

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'DELETE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Restore Category (Admin Only)
const restoreCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Check if already active
    if (category.isActive && !category.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Category is already active',
        code: 'ALREADY_ACTIVE',
        requestId
      });
    }

    // Security: Check if parent category is active
    if (category.parentCategory) {
      const parent = await Category.findById(category.parentCategory);
      if (parent && !parent.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot restore category with inactive parent',
          code: 'PARENT_INACTIVE',
          requestId
        });
      }
    }

    category.isActive = true;
    category.deletedAt = null;
    category.deletedBy = null;
    category.lastUpdatedBy = req.user._id;
    await category.save();

    // Security: Audit log
    logAudit('RESTORE', 'CATEGORY', id, req.user._id);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Category restored successfully',
      data: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        isActive: category.isActive
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'RESTORE', req.user._id, { error: error.message });
    next(error);
  }
};

// Get Category Statistics with Security
const getCategoryStats = async (req, res, next) => {
   const { startDate, endDate } = req.query;
  const now = new Date();
  const defaultStartDate = new Date(now.setMonth(now.getMonth() - 1)); // Last month
  
  const finalStartDate = startDate ? new Date(startDate) : defaultStartDate;
  const finalEndDate = endDate ? new Date(endDate) : new Date();
  
  // Limit date range to prevent excessive data processing
  const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year
  if ((finalEndDate - finalStartDate) > maxDateRange) {
    return res.status(400).json({
      success: false,
      message: 'Date range cannot exceed 1 year',
      code: 'DATE_RANGE_EXCEEDED'
    });
  }
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Security: Only admin can see detailed stats
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for statistics',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const stats = await Category.aggregate([
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalCategories: { $sum: 1 },
                activeCategories: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
                featuredCategories: { $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] } },
                popularCategories: { $sum: { $cond: [{ $eq: ['$popular', true] }, 1, 0] } },
                avgServicesPerCategory: { $avg: '$servicesCount' },
                avgGigsPerCategory: { $avg: '$gigsCount' },
                totalServices: { $sum: '$servicesCount' },
                totalGigs: { $sum: '$gigsCount' }
              }
            }
          ],
          byLevel: [
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          byParent: [
            { $match: { parentCategory: { $exists: true, $ne: null } } },
            { $group: { _id: '$parentCategory', childCount: { $sum: 1 } } },
            { $sort: { childCount: -1 } },
            { $limit: 10 }
          ],
          recentActivity: [
            { $sort: { updatedAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                name: 1,
                updatedAt: 1,
                servicesCount: 1,
                gigsCount: 1,
                isActive: 1
              }
            }
          ],
          growth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ],
          topCategories: [
            { $sort: { servicesCount: -1 } },
            { $limit: 10 },
            {
              $project: {
                name: 1,
                servicesCount: 1,
                gigsCount: 1,
                slug: 1
              }
            }
          ]
        }
      }
    ]);

    // Security: Sanitize output
    const sanitizedStats = stats[0];
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: sanitizedStats,
      requestId,
      timestamp: new Date().toISOString(),
      generatedAt: new Date(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'STATS', req.user?._id, { error: error.message });
    next(error);
  }
};

// Bulk Operations with Security
const bulkUpdateCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  // In bulkUpdateCategories controller, add:
const MAX_BULK_OPERATION_SIZE = 100;
const ALLOWED_BULK_OPERATIONS = ['activate', 'deactivate', 'update', 'delete', 'feature', 'unfeature', 'popular', 'unpopular'];

// Validate operation size
if (ids.length > MAX_BULK_OPERATION_SIZE) {
  return res.status(400).json({
    success: false,
    message: `Cannot process more than ${MAX_BULK_OPERATION_SIZE} items in bulk`,
    code: 'BULK_SIZE_EXCEEDED',
    requestId
  });
}

// Validate operation
if (!ALLOWED_BULK_OPERATIONS.includes(operation)) {
  return res.status(400).json({
    success: false,
    message: `Invalid operation. Allowed: ${ALLOWED_BULK_OPERATIONS.join(', ')}`,
    code: 'INVALID_BULK_OPERATION',
    requestId
  });
}
  
  try {
    // Security: Rate limiting check (implement separately)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for bulk operations',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { ids, operation, data } = req.body;

    // Security: Validate required fields
    if (!ids || !operation) {
      return res.status(400).json({
        success: false,
        message: 'IDs and operation are required',
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }

    // Security: Limit batch size
    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 100 items in bulk',
        code: 'BATCH_SIZE_EXCEEDED',
        requestId
      });
    }

    // Security: Validate all IDs
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IDs found in request',
        code: 'INVALID_IDS',
        requestId
      });
    }

    let result;
    let updateData = {};
    const now = new Date();

    // Security: Define allowed operations
    const allowedOperations = {
      activate: { isActive: true },
      deactivate: { isActive: false },
      feature: { featured: true },
      unfeature: { featured: false },
      popular: { popular: true },
      unpopular: { popular: false },
      update: data || {}
    };

    if (!allowedOperations[operation]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk operation',
        code: 'INVALID_OPERATION',
        requestId
      });
    }

    updateData = {
      ...allowedOperations[operation],
      lastUpdatedBy: req.user._id,
      updatedAt: now
    };

    // Add version increment for updates
    if (operation === 'update') {
      updateData.$inc = { version: 1 };
    }

    // Security: Execute bulk operation with timeout
    // Add ownership or scope filtering:
const filter = { 
  _id: { $in: validIds },
  // Add scope limitation for non-admin users
  ...(req.user.role !== 'admin' ? { createdBy: req.user._id } : {})
};

result = await Category.updateMany(
  filter,
  updateData,
  { 
    maxTimeMS: 10000,
    runValidators: operation === 'update'
  }
);

// Check if all IDs were processed
if (result.matchedCount < validIds.length) {
  // Some IDs were not authorized or not found
  const processedIds = await Category.find(filter).select('_id');
  const unauthorizedIds = validIds.filter(id => 
    !processedIds.some(processed => processed._id.toString() === id)
  );
  
  return res.status(403).json({
    success: false,
    message: 'Some categories could not be updated due to authorization',
    unauthorizedIds,
    requestId
  });
}

    // Security: Audit log
    logAudit('BULK_OPERATION', 'CATEGORY', 'MULTIPLE', req.user._id, {
      operation,
      affectedCount: result.modifiedCount,
      totalIds: ids.length
    });

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        total: ids.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        failed: ids.length - result.matchedCount
      },
      requestId,
      timestamp: now.toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    // Security: Handle bulk operation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed in bulk update',
        errors: Object.values(error.errors).map(err => err.message),
        code: 'BULK_VALIDATION_ERROR',
        requestId
      });
    }

    logAudit('ERROR', 'CATEGORY', 'BULK_UPDATE', req.user._id, {
      operation: req.body?.operation,
      error: error.message
    });
    next(error);
  }
};

// Export Categories with Security
const exportCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Security: Only admin can export
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for export',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { format = 'json', ...queryParams } = req.query;
    
    // Security: Build secure query
    const filter = buildSecureCategoryQuery(queryParams, 'admin', req.user._id);

    // Security: Limit export size
    const count = await Category.countDocuments(filter);
    if (count > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Export limit exceeded (max 10,000 records)',
        code: 'EXPORT_LIMIT_EXCEEDED',
        requestId
      });
    }

    const categories = await Category.find(filter)
      .select('-__v -createdBy -lastUpdatedBy -deletedAt -deletedBy -version')
      .populate('parentCategory', 'name slug')
      .lean();

    // Security: Format response based on requested format
    if (format === 'csv') {
      const headers = [
        'ID', 'Name', 'Slug', 'Description', 'Icon', 'Image', 
        'Parent Category', 'Featured', 'Popular', 'Order', 'Level',
        'Services Count', 'Gigs Count', 'Active', 'Created At', 'Updated At'
      ];

      const csvRows = categories.map(cat => [
        cat._id,
        `"${(cat.name || '').replace(/"/g, '""')}"`,
        cat.slug || '',
        `"${(cat.description || '').replace(/"/g, '""')}"`,
        cat.icon || '',
        cat.image || '',
        cat.parentCategory?.name || '',
        cat.featured ? 'Yes' : 'No',
        cat.popular ? 'Yes' : 'No',
        cat.order || 0,
        cat.level || 0,
        cat.servicesCount || 0,
        cat.gigsCount || 0,
        cat.isActive ? 'Yes' : 'No',
        new Date(cat.createdAt).toISOString(),
        new Date(cat.updatedAt).toISOString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Security: Set secure download headers
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="categories_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', count);
      res.header('X-Export-Timestamp', new Date().toISOString());
      res.header('X-Response-Time', `${Date.now() - startTime}ms`);
      
      return res.send(csvContent);
    }

    // Default JSON export
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      format: 'json',
      count,
      data: categories,
      exportedAt: new Date().toISOString(),
      requestId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'EXPORT', req.user?._id, { 
      format: req.query.format,
      error: error.message 
    });
    next(error);
  }
};

// Search Categories with Security
const searchCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { query, fuzzy = 'false', threshold = 0.3, limit = 20 } = req.query;

    // Security: Sanitize search query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        code: 'MISSING_QUERY',
        requestId
      });
    }

    const sanitizedQuery = sanitizeHtml(query, { 
      allowedTags: [], 
      allowedAttributes: {} 
    }).trim();

    if (sanitizedQuery.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
        code: 'QUERY_TOO_SHORT',
        requestId
      });
    }
    const MAX_FIELD_LENGTHS = {
  description: 500, // Truncate in projection
  metaDescription: 160,
  metaTitle: 60
};

const applyFieldLimits = (query, fields) => {
  if (fields && fields.includes('description')) {
    query.select('+description'); // Explicitly include
    // Or use aggregation to truncate
  }
};

    // Security: Limit search results
    const searchLimit = Math.min(parseInt(limit) || 20, 100);

    let results;
    
    if (fuzzy === 'true') {
      // Fuzzy search using regex (simplified)
      const searchRegex = new RegExp(sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      
      results = await Category.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { slug: searchRegex },
          { metaKeywords: { $in: [searchRegex] } }
        ],
        isActive: true
      })
      .select('name slug icon description servicesCount gigsCount')
      .limit(searchLimit)
      .lean();
    } else {
      // Exact or starts with search
      results = await Category.find({
        $or: [
          { name: new RegExp(`^${sanitizedQuery}`, 'i') },
          { slug: sanitizedQuery.toLowerCase() }
        ],
        isActive: true
      })
      .select('name slug icon description servicesCount gigsCount featured popular')
      .limit(searchLimit)
      .lean();
    }

    // Security: Remove any sensitive data
    const safeResults = results.map(result => ({
      _id: result._id,
      name: result.name,
      slug: result.slug,
      icon: result.icon,
      description: result.description ? result.description.substring(0, 100) + '...' : '',
      servicesCount: result.servicesCount || 0,
      gigsCount: result.gigsCount || 0,
      featured: result.featured || false,
      popular: result.popular || false
    }));

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      query: sanitizedQuery,
      data: safeResults,
      count: safeResults.length,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'SEARCH', req.user?._id, { 
      query: req.query.query,
      error: error.message 
    });
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getCategoryStats,
  bulkUpdateCategories,
  exportCategories,
  searchCategories,
};