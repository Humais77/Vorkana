const mongoose = require('mongoose');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');
const Gig = require('../models/gig.model.js');
const { sanitizeHtml, sanitizeObject } = require('../utils/sanitize.js');
const cache = require('../utils/cache.js');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
// Security: Request ID for tracking
const crypto = require('crypto');

const generateRequestId = () => crypto.randomUUID();

// Security: Input sanitization for categories
const sanitizeCategoryInput = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const skipKeys = ['parentCategory', 'createdBy', 'lastUpdatedBy', 'order', 'level', 'version', 'servicesCount', 'gigsCount', 'isActive', 'featured', 'popular'];
  
  Object.keys(sanitized).forEach(key => {
    if (skipKeys.includes(key)) return;
    
    if (typeof sanitized[key] === 'string') {
      // Remove all script tags and event handlers
      sanitized[key] = sanitized[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/url\s*\(/gi, '')
        .replace(/@import/gi, '')
        .trim();
      
      // Additional sanitization for specific fields
      if (['name', 'slug'].includes(key)) {
        // Remove all HTML tags for name and slug
        sanitized[key] = sanitized[key].replace(/<[^>]*>/g, '');
      } else if (['description', 'metaTitle', 'metaDescription'].includes(key)) {
        // Allow limited safe HTML
        sanitized[key] = sanitizeHtmlStrict(sanitized[key]);
      }
      
      // Remove dangerous characters
      const dangerousPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$nin/i,
        /\$regex/i,
        /select.*from/i,
        /insert.*into/i,
        /update.*set/i,
        /delete.*from/i,
        /union.*select/i,
        /or.*=.*or/i,
        /--/,
        /;/,
        /\/\*.*\*\//,
        /eval\s*\(/i,
        /document\./i,
        /window\./i,
        /alert\s*\(/i,
        /confirm\s*\(/i,
        /prompt\s*\(/i,
        /\x00/, // null bytes
        /\x1a/, // substitute character
        /\x0d/, // carriage return
        /\x0c/, // form feed
        /\x0b/  // vertical tab
      ];
      
      dangerousPatterns.forEach(pattern => {
        sanitized[key] = sanitized[key].replace(pattern, '');
      });
    } else if (Array.isArray(sanitized[key]) && key === 'metaKeywords') {
      // Sanitize each keyword in the array
      sanitized[key] = sanitized[key].map(keyword => {
        if (typeof keyword === 'string') {
          return keyword
            .replace(/<[^>]*>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
        }
        return keyword;
      }).filter(keyword => keyword && keyword.length > 0);
    }
  });
  
  return sanitized;
};
const sanitizeHtmlStrict = (html, options = {}) => {
  if (!html || typeof html !== 'string') return html;
  
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel'],
    KEEP_CONTENT: false
  };
  
  return DOMPurify.sanitize(html, { ...defaultOptions, ...options });
};


// Cache helper functions
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

const invalidateCategoryCache = async () => {
  try {
    await cache.del('categories:*');
    await cache.del('category:*');
    await cache.del('category_stats:*');
    await cache.del('category_search:*');
    console.log('Category cache invalidated successfully');
  } catch (err) {
    console.warn('Error invalidating category cache:', err.message);
  }
};

const invalidateSpecificCategoryCache = async (categoryId) => {
  try {
    await cache.del(`category:single:*${categoryId}*`);
    await cache.del(`category:*${categoryId}*`);
    console.log(`Cache invalidated for category: ${categoryId}`);
  } catch (err) {
    console.warn('Error invalidating specific category cache:', err.message);
  }
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
    hasParent,
    ids,
    excludeIds,
    showAll = false
  } = queryParams;

  const filter = {};

  
  // Reject any query parameter that contains MongoDB operators
  const rejectMongoOperators = (value, paramName) => {
    if (!value || typeof value !== 'object') return value;
    
    const mongoOperators = [
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
      '$exists', '$type', '$mod', '$regex', '$text', '$where',
      '$all', '$elemMatch', '$size', '$bitsAllSet', '$bitsAnySet',
      '$bitsAllClear', '$bitsAnyClear', '$and', '$or', '$not', '$nor'
    ];
    
    const keys = Object.keys(value);
    for (const key of keys) {
      if (mongoOperators.includes(key.toLowerCase())) {
        throw new Error(`Invalid query parameter: ${paramName} contains MongoDB operator '${key}'`);
      }
    }
    
    return value;
  };

  // Security: Only admin can see all categories
  if (showAll && userRole === 'admin') {
    // Handle isActive with empty string check
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true;
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

  // Safe boolean query param handling
  const parseBooleanParam = (param) => {
    if (param === undefined || param === '' || param === null) return undefined;
    if (typeof param === 'boolean') return param;
    if (typeof param === 'string') {
      const lower = param.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    return undefined; // invalid → ignore
  };

  const parsedFeatured = parseBooleanParam(featured);
  if (parsedFeatured !== undefined) {
    filter.featured = parsedFeatured;
  }

  const parsedPopular = parseBooleanParam(popular);
  if (parsedPopular !== undefined) {
    filter.popular = parsedPopular;
  }

  // Add this helper function:
  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // SECURITY: Prevent operator injection in name parameter
  if (name) {
    // Check if name contains MongoDB operators
    if (typeof name === 'object') {
      // This is dangerous - reject it
      console.warn('Potential NoSQL injection attempt in name parameter:', name);
      // Instead of throwing, treat it as a string
      const nameStr = JSON.stringify(name);
      const sanitizedName = sanitizeHtml(nameStr, { allowedTags: [] });
      const escapedName = escapeRegex(sanitizedName);
      filter.name = { $regex: `^${escapedName}`, $options: 'i' };
    } else {
      const sanitizedName = sanitizeHtml(name, { allowedTags: [] });
      const escapedName = escapeRegex(sanitizedName);
      filter.name = { $regex: `^${escapedName}`, $options: 'i' };
    }
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
  if (level !== undefined) filter.level = parseInt(level) || 0;
  
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
    
    // *** FIX: Handle empty parentCategory string ***
    if (sanitizedData.parentCategory === '') {
      sanitizedData.parentCategory = null;
    }
    
    // Validate parentCategory if provided
    if (sanitizedData.parentCategory && sanitizedData.parentCategory !== null) {
      // Check if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(sanitizedData.parentCategory)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent category ID format',
          code: 'INVALID_PARENT_CATEGORY_ID',
          requestId
        });
      }
      
      // Check if parent category exists and is not deleted
      const parentCategory = await Category.findOne({
        _id: sanitizedData.parentCategory,
        deletedAt: null
      });
      
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found or is deleted',
          code: 'PARENT_CATEGORY_NOT_FOUND',
          requestId
        });
      }
      
      // Check for circular reference (category cannot be its own parent)
      // This check is mostly for updates, but kept here for safety
    }

    // Additional manual validation for XSS
    const validateForXSS = (fieldName, value) => {
      if (!value) return true;
      
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /alert\s*\(/i,
        /confirm\s*\(/i,
        /prompt\s*\(/i
      ];
      
      const hasXSS = xssPatterns.some(pattern => pattern.test(value));
      if (hasXSS) {
        throw new Error(`Field '${fieldName}' contains XSS attempt`);
      }
      return true;
    };
    
    // Validate each field
    if (sanitizedData.name) validateForXSS('name', sanitizedData.name);
    if (sanitizedData.description) validateForXSS('description', sanitizedData.description);
    if (sanitizedData.metaTitle) validateForXSS('metaTitle', sanitizedData.metaTitle);
    if (sanitizedData.metaDescription) validateForXSS('metaDescription', sanitizedData.metaDescription);
    
    // Check for duplicate name
    const existingCategory = await Category.findOne({
      name: sanitizedData.name.trim(),
      deletedAt: null
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists',
        code: 'DUPLICATE_CATEGORY',
        requestId
      });
    }

    // Check for duplicate slug
    const existingSlug = await Category.findOne({
      slug: sanitizedData.slug?.toLowerCase(),
      deletedAt: null
    });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: 'Category with this slug already exists',
        code: 'DUPLICATE_SLUG',
        requestId
      });
    }

    const category = await Category.create({
      ...sanitizedData,
      // Ensure parentCategory is null if empty, not empty string
      parentCategory: sanitizedData.parentCategory || null,
      createdBy: req.user._id,
      version: 1
    });

    // Invalidate cache after creating new category
    await invalidateCategoryCache();

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
    // Security: Handle XSS validation errors
    if (error.message.includes('XSS attempt')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'XSS_ATTEMPT_DETECTED',
        requestId
      });
    }
    
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
    
    // Handle CastError specifically (for ObjectId casting)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid value for field ${error.path}: ${error.value}`,
        code: 'INVALID_FIELD_VALUE',
        requestId
      });
    }
    
    console.error('[CREATE CATEGORY ERROR]', error);
    logAudit('ERROR', 'CATEGORY', 'CREATE', req.user?._id, { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      code: 'CATEGORY_CREATE_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Get Categories with Advanced Security
const getCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const {
      search, q, name, slug, parentCategory, featured, popular, isActive, level,
      minServicesCount, maxServicesCount, minGigsCount, maxGigsCount,
      createdAfter, createdBefore, updatedAfter, updatedBefore, createdBy,
      hasParent, ids, excludeIds,
      sort = 'createdAt', order = 'desc', page = 1, limit = 10, offset,
      fields, excludeFields, populate = true, populateFields = 'name',
      showAll = false, includeCounts = false,
      includeServicesCount = false, includeGigsCount = false, // Add these
      cache: useCacheParam = false
    } = req.query;

    const showAllFlag = showAll === 'true' && req.user?.role === 'admin';
    const useCache = useCacheParam === 'true';

    // Build secure query with subcategory support
    const filter = buildSecureCategoryQuery({
      search: search || q, name, slug, parentCategory,
       featured, popular,
      isActive: showAllFlag ? isActive : undefined, level,
      minServicesCount, maxServicesCount, minGigsCount, maxGigsCount,
      createdAfter, createdBefore, updatedAfter, updatedBefore, createdBy,
      hasParent, ids, excludeIds, showAll: showAllFlag
    }, req.user?.role, req.user?._id);

   
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset !== undefined ? Math.max(0, parseInt(offset) || 0) : (pageNum - 1) * limitNum;

    const allowedSortFields = ['name', 'order', 'createdAt', 'updatedAt', 'servicesCount', 'gigsCount', 'level', 'featured', 'popular'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // Generate cache key with all relevant parameters
    const cacheKey = generateCacheKey('categories', {
      filter: JSON.stringify(filter), // Stringify for consistent key
      page: pageNum, 
      limit: limitNum, 
      sort: sortField, 
      order: sortOrder,
      populate: populate === 'true', 
      includeCounts: includeCounts === 'true',
      includeServicesCount: includeServicesCount === 'true',
      includeGigsCount: includeGigsCount === 'true',
      showAll: showAllFlag,
      userRole: req.user?.role,
      timestamp: Math.floor(Date.now() / 60000) // Cache key changes every minute
    });

    // Cache handling
    if (useCache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log('Cache HIT:', cacheKey);
        res.set({
          'X-Request-ID': requestId,
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': 'public, max-age=300'
        });
        return res.json({
          ...cachedResult,
          cached: true,
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`
        });
      }
    }

    // Build populate options
    let populateOptions = [];
    if (populate === 'true') {
      // Always populate parentCategory for hierarchy
      populateOptions.push({
        path: 'parentCategory',
        select: 'name slug',
        match: { isActive: true }
      });
      
     
    }

    // Build select fields
    let selectFields = '-__v -createdBy -deletedAt -deletedBy -version -lastUpdatedBy';
    
    // Add specific fields if requested
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      const validFields = fieldArray.filter(field => 
        !['__v', 'createdBy', 'deletedAt', 'deletedBy', 'version', 'lastUpdatedBy'].includes(field)
      );
      if (validFields.length > 0) {
        selectFields = validFields.join(' ');
      }
    }
    
    // Exclude specific fields if requested
    if (excludeFields) {
      const excludeArray = excludeFields.split(',').map(f => f.trim());
      const excludeSelect = excludeArray
        .filter(field => !selectFields.includes(`-${field}`))
        .map(field => `-${field}`)
        .join(' ');
      if (excludeSelect) {
        selectFields += ` ${excludeSelect}`;
      }
    }

    // Execute queries in parallel
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .select(selectFields)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate(populateOptions.length > 0 ? populateOptions : null)
        .lean({ virtuals: true }),
      Category.countDocuments(filter)
    ]);

    // Process categories to add dynamic counts if needed
    let processedCategories = categories;
    
    // Add dynamic counts for services and gigs if requested
    if ((includeServicesCount === 'true' || includeGigsCount === 'true') && categories.length > 0) {
      const categoryIds = categories.map(cat => cat._id);
      
      // Get counts in parallel
      const countPromises = [];
      
      if (includeServicesCount === 'true') {
        countPromises.push(
          Service.aggregate([
            { $match: { 
              category: { $in: categoryIds },
              status: 'active',
              isActive: true,
              deletedAt: null
            }},
            { $group: {
              _id: '$category',
              count: { $sum: 1 }
            }}
          ])
        );
      }
      
      if (includeGigsCount === 'true') {
        countPromises.push(
          Gig.aggregate([
            { $match: { 
              category: { $in: categoryIds },
              isActive: true,
              deletedAt: null
            }},
            { $group: {
              _id: '$category',
              count: { $sum: 1 }
            }}
          ])
        );
      }
      
      const [serviceCounts = [], gigCounts = []] = await Promise.all(countPromises);
      
      // Create lookup maps
      const serviceCountMap = serviceCounts.reduce((map, item) => {
        map[item._id.toString()] = item.count;
        return map;
      }, {});
      
      const gigCountMap = gigCounts.reduce((map, item) => {
        map[item._id.toString()] = item.count;
        return map;
      }, {});
      
      // Add counts to categories
      processedCategories = categories.map(category => {
        const catId = category._id.toString();
        const updatedCategory = { ...category };
        
        if (includeServicesCount === 'true') {
          updatedCategory.servicesCount = serviceCountMap[catId] || 0;
        }
        
        if (includeGigsCount === 'true') {
          updatedCategory.gigsCount = gigCountMap[catId] || 0;
        }
        
        return updatedCategory;
      });
    }

    // Get additional counts if requested
    let counts = undefined;
    if (includeCounts === 'true') {
      const countStats = await Category.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            featured: { $sum: { $cond: ['$featured', 1, 0] } },
            popular: { $sum: { $cond: ['$popular', 1, 0] } },
           
            withParent: { $sum: { $cond: [{ $ne: ['$parentCategory', null] }, 1, 0] } },
            withoutParent: { $sum: { $cond: [{ $eq: ['$parentCategory', null] }, 1, 0] } }
          }
        }
      ]);
      counts = countStats[0] || { 
        total: 0, 
        active: 0, 
        featured: 0, 
        popular: 0, 
        withParent: 0,
        withoutParent: 0
      };
    }

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Build response data
    const responseData = {
      success: true,
      data: processedCategories,
      pagination: { 
        page: pageNum, 
        limit: limitNum, 
        total, 
        totalPages, 
        hasNext, 
        hasPrev, 
        nextPage: hasNext ? pageNum + 1 : null, 
        prevPage: hasPrev ? pageNum - 1 : null 
      },
      counts: counts || undefined,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    };

    // Cache the response if enabled
    if (useCache) {
      // Only cache successful responses with data
      if (responseData.success) {
        const cacheDuration = pageNum === 1 ? 300 : 180; // Cache first page longer (5 min vs 3 min)
        await cache.set(cacheKey, responseData, cacheDuration);
        console.log('Cache MISS → stored:', cacheKey);
      }
      res.set('X-Cache', 'MISS');
    } else {
      res.set('X-Cache', 'BYPASSED');
    }

    // Set response headers
    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'Cache-Control': useCache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate',
    });

    res.json(responseData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'MongoError' || (error.name === 'MongooseError' && error.message.includes('timed out'))) {
      return res.status(408).json({ 
        success: false, 
        message: 'Query timeout - try with fewer filters or smaller page size', 
        code: 'QUERY_TIMEOUT',
        suggestion: 'Try reducing the number of filters or setting a lower limit',
        requestId,
        responseTime: `${responseTime}ms`
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid filter parameter', 
        code: 'INVALID_FILTER',
        details: error.message,
        requestId,
        responseTime: `${responseTime}ms`
      });
    }
    
    console.error('Error in getCategories:', error.message);
    logAudit('ERROR', 'CATEGORY', 'GET_LIST', req.user?._id, { 
      error: error.message,
      responseTime,
      queryParams: req.query 
    });
    
    next(error);
  }
};

// Get Category by ID or Slug with Security
const getCategoryById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { fields, populate = true} = req.query;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category identifier is required', 
        code: 'MISSING_IDENTIFIER', 
        requestId 
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('category_single', {
      id,
      populate: populate === 'true',
      fields,
      userRole: req.user?.role
    });

    if (populate === 'true') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log('Cache HIT single:', cacheKey);
        res.set({ 'X-Cache': 'HIT' });
        return res.json({ 
          success: true, 
          data: cached, 
          requestId, 
          timestamp: new Date().toISOString(), 
          responseTime: `${Date.now() - startTime}ms`,
          cached: true
        });
      }
    }

    let query;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    if (isObjectId) {
      query = { _id: id };
    } else {
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] });
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    if (req.user?.role !== 'admin') {
      query.isActive = true;
    }

    const defaultExclude = ['__v', 'createdBy', 'deletedAt', 'deletedBy', 'version'];
    let select = {};
    if (fields) {
      fields.split(',').map(f => f.trim()).forEach(field => {
        if (!defaultExclude.includes(field)) select[field] = 1;
      });
    } else {
      defaultExclude.forEach(field => select[field] = 0);
    }

    let populateOptions = [];
    if (populate === 'true') {
      populateOptions.push({ 
        path: 'parentCategory', 
        select: 'name slug ', 
        match: { isActive: true } 
      });
      
    }

    const category = await Category.findOne(query)
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(populateOptions.length > 0 ? populateOptions : null);

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found', 
        code: 'CATEGORY_NOT_FOUND', 
        requestId 
      });
    }

    if (!category.isActive && req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access to inactive category denied', 
        code: 'ACCESS_DENIED', 
        requestId 
      });
    }

    const safeCategory = category.toObject();
    delete safeCategory.__v;
    delete safeCategory.createdBy;
    delete safeCategory.deletedAt;
    delete safeCategory.deletedBy;
    delete safeCategory.version;

    if (!category.isActive) {
      logAudit('VIEW_INACTIVE', 'CATEGORY', category._id, req.user?._id);
    }

    // Cache single category if populated
    if (populate === 'true') {
      await cache.set(cacheKey, safeCategory, 600); // 10 minutes for single item
    }

    res.json({
      success: true,
      data: safeCategory,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cached: false
    });

  } catch (error) {
    logAudit('ERROR', 'CATEGORY', 'GET_BY_ID', req.user?._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Update Category with Security (Admin Only) - FIXED VERSION
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
      console.error('[UPDATE CATEGORY] Invalid ID:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
        code: 'INVALID_ID',
        requestId,
        receivedId: id
      });
    }

    const sanitizedData = sanitizeCategoryInput(req.body);
    
    // Validate for XSS in update as well
    const validateForXSS = (fieldName, value) => {
      if (!value) return true;
      
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /alert\s*\(/i,
        /confirm\s*\(/i,
        /prompt\s*\(/i
      ];
      
      const hasXSS = xssPatterns.some(pattern => pattern.test(value));
      if (hasXSS) {
        throw new Error(`Field '${fieldName}' contains XSS attempt`);
      }
      return true;
    };
    
    // Validate each field
    if (sanitizedData.name) validateForXSS('name', sanitizedData.name);
    if (sanitizedData.description) validateForXSS('description', sanitizedData.description);
    if (sanitizedData.metaTitle) validateForXSS('metaTitle', sanitizedData.metaTitle);
    if (sanitizedData.metaDescription) validateForXSS('metaDescription', sanitizedData.metaDescription);
    
    // Find the existing category first
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

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
    }

    // **CRITICAL FIX: Check for duplicate name, but exclude current category**
    if (sanitizedData.name && sanitizedData.name !== existingCategory.name) {
      const duplicate = await Category.findOne({
        name: sanitizedData.name.trim(),
        _id: { $ne: id }, // EXCLUDE CURRENT CATEGORY FROM DUPLICATE CHECK
        deletedAt: null
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists',
          code: 'DUPLICATE_CATEGORY',
          requestId,
          existingCategoryId: duplicate._id
        });
      }
    }

    // **ALSO FIX: Check for duplicate slug, but exclude current category**
    if (sanitizedData.slug && sanitizedData.slug !== existingCategory.slug) {
      const duplicateSlug = await Category.findOne({
        slug: sanitizedData.slug.toLowerCase(),
        _id: { $ne: id }, // EXCLUDE CURRENT CATEGORY FROM DUPLICATE CHECK
        deletedAt: null
      });

      if (duplicateSlug) {
        return res.status(400).json({
          success: false,
          message: 'Category with this slug already exists',
          code: 'DUPLICATE_SLUG',
          requestId,
          existingCategoryId: duplicateSlug._id
        });
      }
    }

    // *** CRITICAL FIX: Remove version from sanitizedData if present ***
    // MongoDB cannot have both direct version update and $inc version update
    delete sanitizedData.version;
    
    // Prepare update data - only increment version using $inc operator
    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 } // Use only $inc operator for version
    };

    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).populate('parentCategory', 'name slug');

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Security: Remove sensitive data from response
    const safeCategory = updatedCategory.toObject();
    delete safeCategory.__v;
    delete safeCategory.createdBy;
    delete safeCategory.deletedAt;
    delete safeCategory.deletedBy;
    delete safeCategory.version;
    delete safeCategory.lastUpdatedBy;

    // Security: Audit log
    logAudit('UPDATE', 'CATEGORY', id, req.user._id, {
      oldName: existingCategory.name,
      newName: updatedCategory.name,
      changedFields: Object.keys(sanitizedData),
      newVersion: updatedCategory.version
    });

    // Invalidate cache after update
    await invalidateCategoryCache();
    await invalidateSpecificCategoryCache(id);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: safeCategory,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    // Security: Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with that name or slug already exists',
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
    
    // Security: Handle XSS validation errors
    if (error.message.includes('XSS attempt')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'XSS_ATTEMPT_DETECTED',
        requestId
      });
    }
    
    // Handle MongoDB conflicting update error
    if (error.code === 40 || error.codeName === 'ConflictingUpdateOperators') {
      return res.status(400).json({
        success: false,
        message: 'Update conflict detected. Version field cannot be updated directly.',
        code: 'UPDATE_CONFLICT',
        requestId
      });
    }
    
    console.error('[UPDATE CATEGORY ERROR]', error);
    logAudit('ERROR', 'CATEGORY', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message,
      code: error.code
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      code: 'CATEGORY_UPDATE_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      const [services, gigs] = await Promise.all([
        Category.countDocuments({ parentCategory: id, isActive: true, deletedAt: null }),
        Service.countDocuments({ category: id, isActive: { $ne: false } }),
        Gig.countDocuments({ projectCategory: id, isActive: true })
      ]);

      
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
      
      // Invalidate cache after permanent delete
      await invalidateCategoryCache();
      await invalidateSpecificCategoryCache(id);
      
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
      
      // Invalidate cache after soft delete
      await invalidateCategoryCache();
      await invalidateSpecificCategoryCache(id);
      
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

const restoreCategory = async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log(`[RESTORE CATEGORY] Request started - ID: ${requestId}`);
    console.log('[RESTORE CATEGORY] Request:', {
      params: req.params,
      body: req.body,
      query: req.query,
      admin: req.admin?.email
    });

    // ===== ID EXTRACTION AND VALIDATION =====
    let categoryId = req.params.id;
    const { searchBy = 'id', searchValue = '', force = 'false' } = req.body;

    // FIX: Handle [object Object] and various ID formats
    if (!categoryId || categoryId === '[object Object]' || categoryId === 'undefined' || categoryId === 'null') {
      console.log('[RESTORE CATEGORY] Invalid ID in params, checking body/query...');
      
      // Try to get from body
      if (req.body && req.body.id) {
        categoryId = req.body.id;
        console.log('[RESTORE CATEGORY] Using ID from body:', categoryId);
      } 
      // Try to get from query
      else if (req.query && req.query.id) {
        categoryId = req.query.id;
        console.log('[RESTORE CATEGORY] Using ID from query:', categoryId);
      }
      // Try alternative search methods if no ID found
      else if (searchBy && searchValue) {
        console.log('[RESTORE CATEGORY] Using search method:', searchBy, searchValue);
        
        let category = null;
        
        switch (searchBy.toLowerCase()) {
          case 'slug':
            category = await Category.findOne({ 
              slug: searchValue.trim().toLowerCase(),
              deletedAt: { $ne: null } // Only find deleted categories
            });
            break;
            
          case 'name':
            category = await Category.findOne({ 
              name: { $regex: new RegExp(`^${searchValue.trim()}$`, 'i') },
              deletedAt: { $ne: null }
            });
            break;
            
          case 'id':
          default:
            category = await Category.findOne({ 
              _id: searchValue.trim(),
              deletedAt: { $ne: null }
            });
            break;
        }
        
        if (category) {
          categoryId = category._id;
          console.log('[RESTORE CATEGORY] Found category via search:', categoryId);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Category not found or not deleted',
            code: 'CATEGORY_NOT_FOUND',
            requestId,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // ===== VALIDATE FINAL ID =====
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required',
        code: 'MISSING_CATEGORY_ID',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Clean up the ID
    if (typeof categoryId === 'object') {
      categoryId = categoryId._id || categoryId.id || JSON.stringify(categoryId);
    }
    
    // Remove quotes if present
    if (categoryId.startsWith('"') && categoryId.endsWith('"')) {
      categoryId = categoryId.slice(1, -1);
    }
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error('[RESTORE CATEGORY] Invalid MongoDB ID format:', categoryId);
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format. Must be a valid MongoDB ObjectId',
        code: 'INVALID_CATEGORY_ID_FORMAT',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // ===== FIND CATEGORY =====
    console.log('[RESTORE CATEGORY] Searching for category:', categoryId);
    
    const category = await Category.findOne({ 
      _id: categoryId,
      deletedAt: { $ne: null } // Only find deleted categories
    }).populate('parentCategory', 'name slug');

    if (!category) {
      // Check if category exists but is not deleted
      const existingCategory = await Category.findById(categoryId);
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category is not deleted. No restoration needed.',
          code: 'CATEGORY_NOT_DELETED',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // ===== CHECK DEPENDENCIES =====
    const forceRestore = force === 'true';
    
    if (!forceRestore) {
      // Check if category has active services
      const activeServicesCount = await Service.countDocuments({
        category: categoryId,
        deletedAt: null,
        status: 'active'
      });
      
      // Check if category has active gigs
      const activeGigsCount = await Gig.countDocuments({
        projectCategory: categoryId,
        deletedAt: null,
        status: { $in: ['open', 'in_progress'] }
      });
      
      if (activeServicesCount > 0 || activeGigsCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot restore category with active services or gigs. Use force=true to override.',
          code: 'ACTIVE_DEPENDENCIES',
          details: {
            activeServicesCount,
            activeGigsCount
          },
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ===== RESTORE CATEGORY =====
    console.log('[RESTORE CATEGORY] Restoring category:', categoryId);
    
    const now = new Date();
    
    // Restore category
    const restoredCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $set: {
          isActive: true,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          lastUpdatedBy: req.admin._id,
          updatedAt: now
        },
        $unset: {
          deletedBy: "",
          deletionReason: ""
        }
      },
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('parentCategory', 'name slug').populate('createdBy', 'name email');

    if (!restoredCategory) {
      console.error('[RESTORE CATEGORY] Failed to restore category:', categoryId);
      return res.status(500).json({
        success: false,
        message: 'Failed to restore category',
        code: 'RESTORE_FAILED',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // ===== UPDATE PARENT CATEGORY COUNTS =====
    if (restoredCategory.parentCategory) {
      await Category.findByIdAndUpdate(
        restoredCategory.parentCategory,
        {
          
        }
      );
    }

    // ===== PREPARE RESPONSE =====
    const responseData = {
      _id: restoredCategory._id,
      name: restoredCategory.name,
      slug: restoredCategory.slug,
      description: restoredCategory.description,
      isActive: restoredCategory.isActive,
      featured: restoredCategory.featured,
      popular: restoredCategory.popular,
      parentCategory: restoredCategory.parentCategory,
      servicesCount: restoredCategory.servicesCount || 0,
      gigsCount: restoredCategory.gigsCount || 0,
      createdAt: restoredCategory.createdAt.toISOString(),
      updatedAt: restoredCategory.updatedAt.toISOString(),
      deletedAt: null,
      createdBy: restoredCategory.createdBy,
      lastUpdatedBy: {
        _id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email
      }
    };

    // ===== LOG ADMIN ACTION =====
    await logAdminAction(req.admin._id, 'RESTORE_CATEGORY', `category:${categoryId}`, {
      categoryName: category.name,
      force: forceRestore,
      ip: req.ip,
      timestamp: now.toISOString()
    });

    // ===== SEND RESPONSE =====
    const responseTime = Date.now() - startTime;
    
    console.log(`[RESTORE CATEGORY] Successfully restored: ${categoryId}`);
    
    res.json({
      success: true,
      message: 'Category restored successfully',
      data: responseData,
      meta: {
        requestId,
        timestamp: now.toISOString(),
        executionTime: `${responseTime}ms`,
        restoredBy: {
          id: req.admin._id,
          name: req.admin.name,
          email: req.admin.email
        },
        forceUsed: forceRestore
      }
    });

  } catch (error) {
    console.error(`[RESTORE CATEGORY ERROR] Request ID: ${requestId}`, error);
    console.error('[RESTORE CATEGORY ERROR DETAILS]', error.stack);
    
    const responseTime = Date.now() - startTime;
    
    // Handle specific error types
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
        code: 'INVALID_ID_FORMAT',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Category with this slug already exists. Cannot restore duplicate.',
        code: 'DUPLICATE_CATEGORY',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        executionTime: `${responseTime}ms`
      });
    }
    
    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Failed to restore category',
      code: 'CATEGORY_RESTORE_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      executionTime: `${responseTime}ms`,
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// Get Category Statistics with Security
const getCategoryStats = async (req, res, next) => {
  const { startDate, endDate } = req.query;
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
        code: 'DATE_RANGE_EXCEEDED',
        requestId
      });
    }

    // Generate cache key with date range
    const cacheKey = generateCacheKey('category_stats', {
      startDate: finalStartDate.toISOString(),
      endDate: finalEndDate.toISOString(),
      userRole: req.user.role
    });

    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('Cache HIT stats:', cacheKey);
      res.set({ 'X-Cache': 'HIT' });
      return res.json({ 
        success: true, 
        data: cached, 
        requestId, 
        timestamp: new Date().toISOString(), 
        responseTime: `${Date.now() - startTime}ms`,
        cached: true 
      });
    }

    // Build date filter if dates are provided
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = finalStartDate;
      if (endDate) dateFilter.createdAt.$lte = finalEndDate;
    }

    const stats = await Category.aggregate([
      { $match: dateFilter }, // Apply date filter if any
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalCategories: { $sum: 1 },
                activeCategories: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
                inactiveCategories: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
                featuredCategories: { $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] } },
                popularCategories: { $sum: { $cond: [{ $eq: ['$popular', true] }, 1, 0] } },
                categoriesWithParent: { $sum: { $cond: [{ $ne: ['$parentCategory', null] }, 1, 0] } },
                categoriesWithoutParent: { $sum: { $cond: [{ $eq: ['$parentCategory', null] }, 1, 0] } },
                avgServicesPerCategory: { $avg: '$servicesCount' },
                avgGigsPerCategory: { $avg: '$gigsCount' },
                totalServices: { $sum: '$servicesCount' },
                totalGigs: { $sum: '$gigsCount' },
                maxServices: { $max: '$servicesCount' },
                maxGigs: { $max: '$gigsCount' },
                minServices: { $min: '$servicesCount' },
                minGigs: { $min: '$gigsCount' }
              }
            }
          ],
          byLevel: [
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          byParent: [
            { $match: { parentCategory: { $exists: true, $ne: null } } },
            {
              $group: {
                _id: '$parentCategory',
                childCount: { $sum: 1 },
                childNames: { $push: '$name' }
              }
            },
            { $sort: { childCount: -1 } },
            { $limit: 10 }
          ],
          recentActivity: [
            { $sort: { updatedAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                updatedAt: 1,
                servicesCount: 1,
                gigsCount: 1,
                isActive: 1,
                featured: 1,
                popular: 1
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
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 }
          ],
          topCategories: [
            { $sort: { servicesCount: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                servicesCount: 1,
                gigsCount: 1,
                featured: 1,
                popular: 1,
                isActive: 1
              }
            }
          ],
          statusDistribution: [
            {
              $group: {
                _id: {
                  isActive: '$isActive',
                  hasParent: { $cond: [{ $ne: ['$parentCategory', null] }, 'withParent', 'withoutParent'] }
                },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Format the response - handle empty database
    const formattedStats = {
      overview: stats[0]?.overview[0] || {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        featuredCategories: 0,
        popularCategories: 0,
        categoriesWithParent: 0,
        categoriesWithoutParent: 0,
        avgServicesPerCategory: 0,
        avgGigsPerCategory: 0,
        totalServices: 0,
        totalGigs: 0,
        maxServices: 0,
        maxGigs: 0,
        minServices: 0,
        minGigs: 0
      },
      byLevel: stats[0]?.byLevel || [],
      byParent: stats[0]?.byParent || [],
      recentActivity: stats[0]?.recentActivity || [],
      growth: stats[0]?.growth || [],
      topCategories: stats[0]?.topCategories || [],
      statusDistribution: stats[0]?.statusDistribution || [],
      metadata: {
        dateRange: {
          startDate: finalStartDate.toISOString(),
          endDate: finalEndDate.toISOString()
        },
        generatedAt: new Date().toISOString()
      }
    };

    // Populate parent category names for byParent section
    if (formattedStats.byParent.length > 0) {
      const parentIds = formattedStats.byParent.map(item => item._id);
      const parentCategories = await Category.find({ _id: { $in: parentIds } })
        .select('name slug')
        .lean();
      
      const parentMap = parentCategories.reduce((map, cat) => {
        map[cat._id.toString()] = cat;
        return map;
      }, {});

      formattedStats.byParent = formattedStats.byParent.map(item => ({
        ...item,
        parentName: parentMap[item._id.toString()]?.name || 'Unknown',
        parentSlug: parentMap[item._id.toString()]?.slug || ''
      }));
    }

    // Cache stats for 10 minutes
    await cache.set(cacheKey, formattedStats, 600);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: formattedStats,
      requestId,
      timestamp: new Date().toISOString(),
      generatedAt: new Date(),
      responseTime: `${responseTime}ms`,
      cached: false
    });

  } catch (error) {
    console.error('Category stats error:', error);
    
    // Return empty stats on error instead of failing
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCategories: 0,
          activeCategories: 0,
          inactiveCategories: 0,
          featuredCategories: 0,
          popularCategories: 0,
          categoriesWithParent: 0,
          categoriesWithoutParent: 0,
          avgServicesPerCategory: 0,
          avgGigsPerCategory: 0,
          totalServices: 0,
          totalGigs: 0
        },
        byLevel: [],
        byParent: [],
        recentActivity: [],
        growth: [],
        topCategories: [],
        statusDistribution: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          error: error.message
        }
      },
      message: 'Statistics generated (empty database)',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
    logAudit('ERROR', 'CATEGORY', 'STATS', req.user?._id, { error: error.message });
  }
};

const bulkUpdateCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
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

    updateData = {
      ...allowedOperations[operation],
      lastUpdatedBy: req.user._id,
      updatedAt: now
    };

    // *** FIX: Remove version from data if it exists ***
    if (operation === 'update' && data && data.version) {
      delete updateData.version;
    }

    // Add version increment for updates - but only if not already in data
    if (operation === 'update') {
      updateData.$inc = { version: 1 };
    }

    // *** FIX: For admins, no need to check createdBy ownership ***
    const filter = { 
      _id: { $in: validIds },
      deletedAt: null // Only update non-deleted categories
    };

    // Only apply ownership filter for non-admin users
    // if (req.user.role !== 'admin') {
    //   filter.createdBy = req.user._id;
    // }

    result = await Category.updateMany(
      filter,
      updateData,
      { 
        maxTimeMS: 10000,
        runValidators: operation === 'update'
      }
    );

    // *** FIX: Check if categories exist, not if user created them ***
    if (result.matchedCount < validIds.length) {
      // Find which IDs don't exist or are deleted
      const existingCategories = await Category.find({ 
        _id: { $in: validIds },
        deletedAt: null 
      }).select('_id');
      
      const existingIds = existingCategories.map(cat => cat._id.toString());
      const notFoundIds = validIds.filter(id => !existingIds.includes(id));
      
      return res.status(404).json({
        success: false,
        message: 'Some categories not found or are deleted',
        notFoundIds,
        matched: result.matchedCount,
        total: validIds.length,
        code: 'CATEGORIES_NOT_FOUND',
        requestId
      });
    }

    // Security: Audit log
    logAudit('BULK_OPERATION', 'CATEGORY', 'MULTIPLE', req.user._id, {
      operation,
      affectedCount: result.modifiedCount,
      totalIds: ids.length
    });

    // Invalidate cache after bulk operation
    await invalidateCategoryCache();

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
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed in bulk update',
        errors: messages,
        code: 'BULK_VALIDATION_ERROR',
        requestId
      });
    }

    // Handle MongoDB conflicting update error
    if (error.code === 40 || error.codeName === 'ConflictingUpdateOperators') {
      return res.status(400).json({
        success: false,
        message: 'Update conflict detected. Remove version field from update data.',
        code: 'UPDATE_CONFLICT',
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
        'ID', 'Name', 'Slug', 'Description', 
        'Parent Category', 'Featured', 'Popular', 'Order', 'Level',
        'Services Count', 'Gigs Count', 'Active', 'Created At', 'Updated At'
      ];

      const csvRows = categories.map(cat => [
        cat._id,
        `"${(cat.name || '').replace(/"/g, '""')}"`,
        cat.slug || '',
        `"${(cat.description || '').replace(/"/g, '""')}"`,
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


      res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="categories_${Date.now()}.csv"`);
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Export-Records', count);
    res.setHeader('X-Export-Timestamp', new Date().toISOString());
    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
    
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

const searchCategories = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { 
      query: searchQuery, 
      q, 
      limit = 20,
      category,
      minServicesCount,
      maxServicesCount
    } = req.query;

    const query = searchQuery || q;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(200).json({
        success: true,
        query: '',
        data: [],
        count: 0,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        message: 'No search query provided'
      });
    }

    const sanitizedQuery = sanitizeHtml(query, { allowedTags: [], allowedAttributes: {} }).trim();

    if (sanitizedQuery.length < 2) {
      return res.status(200).json({
        success: true,
        query: sanitizedQuery,
        data: [],
        count: 0,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        message: 'Search query must be at least 2 characters'
      });
    }

    const cacheKey = generateCacheKey('category_search', {
      query: sanitizedQuery,
      limit,
      category,
      minServicesCount,
      maxServicesCount
    });

    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('Cache HIT search:', cacheKey);
      res.set({ 'X-Cache': 'HIT' });
      return res.json({
        success: true,
        query: sanitizedQuery,
        data: cached,
        count: cached.length,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        cached: true
      });
    }

    const searchLimit = Math.min(parseInt(limit) || 20, 100);

    // Build filter with text search
    const filter = {
      $text: { $search: sanitizedQuery },
      isActive: true,
      deletedAt: null
    };

    // Additional filters
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (minServicesCount !== undefined) {
      filter.servicesCount = { ...filter.servicesCount, $gte: parseInt(minServicesCount) || 0 };
    }

    if (maxServicesCount !== undefined) {
      filter.servicesCount = { ...filter.servicesCount, $lte: parseInt(maxServicesCount) || 0 };
    }

    // Execute text search with score projection
    const results = await Category.find(filter, { 
      score: { $meta: "textScore" } 
    })
    .select('name slug description servicesCount gigsCount featured popular')
    .sort({ 
      score: { $meta: "textScore" }, // Sort by relevance score
      featured: -1,
      popular: -1 
    })
    .limit(searchLimit)
    .lean();

    const safeResults = results.map(result => ({
      _id: result._id,
      name: result.name,
      slug: result.slug,
      description: result.description ? result.description.substring(0, 100) + '...' : '',
      servicesCount: result.servicesCount || 0,
      gigsCount: result.gigsCount || 0,
      featured: result.featured || false,
      popular: result.popular || false,
      score: result.score || 0
    }));

    await cache.set(cacheKey, safeResults, 300);

    res.json({
      success: true,
      query: sanitizedQuery,
      data: safeResults,
      count: safeResults.length,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      cached: false
    });

  } catch (error) {
    console.error('Search categories error:', error);
    res.status(200).json({
      success: true,
      query: req.query.query || req.query.q || '',
      data: [],
      count: 0,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const repairCategoryCounts = async (req, res, next) => {
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

    const result = await Category.repairCategoryCounts();
    
    // Invalidate all category cache
    await invalidateCategoryCache();
    
    res.json({
      success: true,
      message: 'Category counts repaired successfully',
      result,
      requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Repair category counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to repair category counts',
      code: 'REPAIR_FAILED',
      requestId
    });
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
  repairCategoryCounts
};