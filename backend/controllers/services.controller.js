const mongoose = require('mongoose');
const crypto = require('crypto');
const Service = require('../models/services.model.js');
const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js');
const { sanitizeHtml } = require('../utils/sanitize.js');
const { 
  processUploadToCloudinary, 
  deleteCloudinaryImages
} = require('../middleware/upload.middleware.js');
const cache = require('../utils/cache.js');
const EventEmitter = require('events');
const serviceEmitter = new EventEmitter();
const { v4: uuidv4 } = require('uuid');
const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Cache helper functions
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

const invalidateServiceCache = async (serviceId) => {
  try {
    // Clear specific service cache
    await cache.del(`service_single:*${serviceId}*`);
    await cache.del(`service:*${serviceId}*`);
    
    // Clear list caches (use exact patterns instead of wildcards)
    await cache.del('services_list:*');
    await cache.del('service_stats:*');
    await cache.del('service_popular:*');
    await cache.del('service_similar:*');
    await cache.del('my_services:*');
    await cache.del('admin_services:*');
    await cache.del('all_active_services:*');
    await cache.del('popular_services:*');
    await cache.del('popular_services_by_category:*');
    await cache.del('services_with_stats:*');
    
    console.log(`Cache invalidated for service: ${serviceId}`);
  } catch (err) {
    console.warn('Error invalidating service cache:', err.message);
  }
};

const invalidateAllServiceCache = async () => {
  try {
    await cache.del('services:*');
    await cache.del('service_stats:*');
    await cache.del('service_popular:*');
    await cache.del('service_similar:*');
    console.log('All service cache invalidated');
  } catch (err) {
    console.warn('Error invalidating all service cache:', err.message);
  }
};
const sanitizeServiceInput = (data) => {
  const sanitized = {};
  
  for (const key in data) {
    if (key === 'thumbnail') {
      // Handle thumbnail specially - keep it as is if it's an object
      if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = data[key];
      } else if (typeof data[key] === 'string' && data[key].trim() !== '') {
        // If it's a string URL, convert to object
        sanitized[key] = {
          url: data[key].trim(),
          public_id: `thumbnail-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          uploadedAt: new Date()
        };
      }
      // If thumbnail is empty string or null, skip it (don't add to sanitized)
      continue;
    }
    
    if (typeof data[key] === 'string') {
      // Try to parse JSON if it looks like JSON
      if (
        (key === 'tags' || key === 'features' || key === 'faqs' || key === 'searchKeywords'  || key === 'requirements') &&
        (data[key].startsWith('[') || data[key].startsWith('{'))
      ) {
        try {
          const parsed = JSON.parse(data[key]);
          if (Array.isArray(parsed)) {
            sanitized[key] = parsed.map(item => {
              if (typeof item === 'string') {
                return sanitizeHtml(item, {
                  allowedTags: [],
                  allowedAttributes: {},
                  disallowedTagsMode: 'escape'
                }).trim();
              }
              return item;
            });
          } else {
            sanitized[key] = data[key];
          }
        } catch (e) {
          sanitized[key] = sanitizeHtml(data[key], {
            allowedTags: [],
            allowedAttributes: {},
            disallowedTagsMode: 'escape'
          }).trim();
        }
      } else {
        sanitized[key] = sanitizeHtml(data[key], {
          allowedTags: [],
          allowedAttributes: {},
          disallowedTagsMode: 'escape'
        }).trim();
      }
    } else if (Array.isArray(data[key])) {
      // Keep Cloudinary image arrays as is
      if (key === 'images' && data[key].length > 0 && data[key][0] && data[key][0].url) {
        sanitized[key] = data[key];
      } else if (key === 'tags' || key === 'searchKeywords') {
        sanitized[key] = data[key].map(item => 
          sanitizeHtml(item.toString(), { 
            allowedTags: [], 
            allowedAttributes: {} 
          }).trim()
        );
      } else {
        sanitized[key] = data[key].map(item => {
          if (typeof item === 'object' && item !== null) {
            return sanitizeServiceInput(item);
          }
          return sanitizeHtml(item.toString(), { allowedTags: [], allowedAttributes: {} }).trim();
        });
      }
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // Handle nested objects
      sanitized[key] = sanitizeServiceInput(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }
  
  return sanitized;
};


const buildSecureServiceQuery = (queryParams, userRole, userId) => {
  const {
    search,
    title,
    slug,
    category,
    subcategory,
    createdBy,
    minPrice,
    maxPrice,
    minDeliveryTime,
    maxDeliveryTime,
    deliveryTimeUnit,
    currency,
    status,
    isFeatured,
    isRecommended,
    isPopular,
    hasImages,
    hasFaqs,
    tags,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    publishedAfter,
    publishedBefore,
    ids,
    excludeIds,
    showAll = false,
  } = queryParams;

  const filter = {};

  if (showAll && userRole === 'admin') {
    // Admin can see all services
    if (status !== undefined) {
      filter.status = status;
    }
  } else if (userRole === 'user' && userId) {
    // Users can see their own services and active public services
    filter.$or = [
      { createdBy: userId },
      { 
        status: 'active',
        isActive: true 
      }
    ];
  } else {
    // Non-authenticated users can only see active services
    filter.status = 'active';
    filter.isActive = true;
  }

 const escapeRegex = (str) => {
    if (!str) return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Search with sanitization and escape
  if (search) {
    const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} }).trim();
    const escapedSearch = escapeRegex(sanitizedSearch);
    if (escapedSearch.length >= 2) {
      filter.$text = { $search: escapedSearch };
    }
  }
if (title) {
    const sanitizedTitle = sanitizeHtml(title, { allowedTags: [] }).trim();
    const escapedTitle = escapeRegex(sanitizedTitle);
    // Use exact match or case-insensitive search
    filter.title = { 
      $regex: `^${escapedTitle}`,
      $options: 'i'
    };
  }
  if (slug) {
    const sanitizedSlug = sanitizeHtml(slug, { allowedTags: [] }).trim();
    // Ensure slug format is valid (alphanumeric, hyphens)
    if (/^[a-z0-9-]+$/.test(sanitizedSlug)) {
      filter.slug = sanitizedSlug;
    } else {
      // Invalid slug format - don't filter
      console.warn('Invalid slug format:', sanitizedSlug);
    }
  }
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = category;
  }
  
  if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
    filter.subcategory = subcategory;
  }
  
  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
  }

  // Price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }


  // Delivery time range
  if (minDeliveryTime || maxDeliveryTime) {
    filter.deliveryTime = {};
    if (minDeliveryTime) filter.deliveryTime.$gte = parseInt(minDeliveryTime);
    if (maxDeliveryTime) filter.deliveryTime.$lte = parseInt(maxDeliveryTime);
  }

  // Other filters
  if (deliveryTimeUnit) filter.deliveryTimeUnit = deliveryTimeUnit;
  if (currency) filter.currency = currency;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured;
  if (isRecommended !== undefined) filter.isRecommended = isRecommended;
  if (isPopular !== undefined) filter.isPopular = isPopular;
  
  if (hasImages === 'true') filter.images = { $exists: true, $ne: [] };
  if (hasFaqs === 'true') filter.faqs = { $exists: true, $ne: [] };
  
  if (tags) {
    const tagArray = tags.split(',').map(tag => 
      sanitizeHtml(tag.trim(), { allowedTags: [], allowedAttributes: {} })
    );
    filter.tags = { $all: tagArray };
  }

  // Date filters
  const addDateFilter = (field, date, operator) => {
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        filter[field] = { ...filter[field], [operator]: parsedDate };
      }
    }
  };

  addDateFilter('createdAt', createdAfter, '$gte');
  addDateFilter('createdAt', createdBefore, '$lte');
  addDateFilter('updatedAt', updatedAfter, '$gte');
  addDateFilter('updatedAt', updatedBefore, '$lte');
  addDateFilter('publishedAt', publishedAfter, '$gte');
  addDateFilter('publishedAt', publishedBefore, '$lte');

  // ID filters
  if (ids) {
    const idArray = ids.split(',').map(id => id.trim());
    const validIds = idArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length > 0) filter._id = { $in: validIds };
  }

  if (excludeIds) {
    const excludeArray = excludeIds.split(',').map(id => id.trim());
    const validExcludeIds = excludeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validExcludeIds.length > 0) {
      filter._id = { ...filter._id, $nin: validExcludeIds };
    }
  }

  return filter;
};

const logAudit = (action, resource, resourceId, userId, details = {}) => {
  console.log(`[AUDIT:SERVICE] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};
const parseFormDataArrays = (bodyData, arrayFields) => {
  const parsed = {};
  
  for (const key in bodyData) {
    if (arrayFields.includes(key)) {
      if (typeof bodyData[key] === 'string') {
        try {
          parsed[key] = JSON.parse(bodyData[key]);
        } catch (e) {
          if (bodyData[key].includes(',')) {
            parsed[key] = bodyData[key].split(',').map(item => item.trim()).filter(item => item);
          } else {
            parsed[key] = [bodyData[key]];
          }
        }
      } else if (Array.isArray(bodyData[key])) {
        parsed[key] = bodyData[key];
      } else {
        parsed[key] = [];
      }
    } else {
      parsed[key] = bodyData[key];
    }
  }
  
  return parsed;
};
const createService = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    let bodyData = req.body;
    
    // Handle multipart form data
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Parse arrays from form data
      const arrayFields = ['tags', 'features', 'faqs', 'searchKeywords', 'requirements'];
      bodyData = parseFormDataArrays(req.body, arrayFields);
      
      // Handle thumbnail upload if provided
      if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
        const thumbnailFile = req.files.thumbnail[0];
        const thumbnailUpload = await processUploadToCloudinary([thumbnailFile], 'thumbnails');
        
        if (thumbnailUpload.length > 0) {
          bodyData.thumbnail = {
            url: thumbnailUpload[0].url,
            public_id: thumbnailUpload[0].public_id,
            width: thumbnailUpload[0].width,
            height: thumbnailUpload[0].height,
            size: thumbnailUpload[0].size,
            format: thumbnailUpload[0].format,
            uploadedAt: new Date()
          };
        }
      }
      
      // Handle images upload if provided
      if (req.files && req.files.images && req.files.images.length > 0) {
        const imageUploads = await processUploadToCloudinary(req.files.images, 'services');
        bodyData.images = imageUploads.map(img => ({
          url: img.url,
          public_id: img.public_id,
          width: img.width,
          height: img.height,
          size: img.size,
          format: img.format,
          uploadedAt: new Date()
        }));
      }
    } else if (typeof req.body === 'string') {
      // Handle JSON string
      try {
        bodyData = JSON.parse(req.body);
      } catch (e) {
        bodyData = req.body;
      }
    }

    // Validate bodyData exists
    if (!bodyData || Object.keys(bodyData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Service data is required',
        code: 'DATA_REQUIRED',
        requestId
      });
    }

    // Sanitize input
    const sanitizedData = sanitizeServiceInput(bodyData);

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'subcategory', 'price', 'deliveryTime'];
    const missingFields = requiredFields.filter(field => !sanitizedData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }

    // Validate thumbnail
    if (!sanitizedData.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail is required',
        code: 'THUMBNAIL_REQUIRED',
        requestId
      });
    }

    // Validate thumbnail URL if provided as string
    if (typeof sanitizedData.thumbnail === 'string' && !/^https?:\/\//.test(sanitizedData.thumbnail)) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail must be a valid URL',
        code: 'INVALID_THUMBNAIL_URL',
        requestId
      });
    }

    // Validate images
    if (sanitizedData.images && sanitizedData.images.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 images allowed',
        code: 'MAX_IMAGES_EXCEEDED',
        requestId
      });
    }

    // Validate category
    const category = await Category.findOne({ 
      _id: sanitizedData.category,
      isActive: true
    });
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found or inactive',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Validate subcategory
    const subcategory = await Subcategory.findOne({ 
      _id: sanitizedData.subcategory,
      category: sanitizedData.category,
      isActive: true
    });

    if (!subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory not found, inactive, or does not belong to the selected category',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Prepare service data
    const serviceData = {
      ...sanitizedData,
      createdBy: req.user._id,
      version: 1,
      images: sanitizedData.images || [],
      thumbnail: typeof sanitizedData.thumbnail === 'string' ? {
        url: sanitizedData.thumbnail,
        public_id: `thumbnail-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        uploadedAt: new Date()
      } : sanitizedData.thumbnail
    };

    // Create service
    const service = await Service.create(serviceData);

    // Invalidate cache
    await invalidateAllServiceCache();

    // Audit log
    logAudit('CREATE', 'SERVICE', service._id, req.user._id, {
      title: service.title,
      category: service.category,
      subcategory: service.subcategory,
      status: service.status,
      imagesCount: service.images.length,
      hasThumbnail: !!service.thumbnail
    });

    // Populate for response
    await service.populate([
      { path: 'category', select: 'name slug icon' },
      { path: 'subcategory', select: 'name slug icon' }
    ]);

    const safeService = service.toObject();
    delete safeService.__v;
    delete safeService.lastUpdatedBy;

   res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service: safeService,
      serviceId: service._id,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create service error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service with similar title already exists',
        code: 'DUPLICATE_SERVICE',
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
    
    logAudit('ERROR', 'SERVICE', 'CREATE', req.user?._id, { error: error.message });
    next(error);
  }
};


const getServices = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      search,
      q,
      title,
      slug,
      category,
      subcategory,
      createdBy,
      minPrice,
      maxPrice,
      minDeliveryTime,
      maxDeliveryTime,
      deliveryTimeUnit,
      currency,
      status,
      isFeatured,
      isRecommended,
      isPopular,
      hasImages,
      hasFaqs,
      tags,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      publishedAfter,
      publishedBefore,
      ids,
      excludeIds,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 12, // Increased default limit for better UX
      offset,
      fields,
      excludeFields,
      populate = true,
      showAll = false,
      includeInactive = false,
      includeCategory = true,
      includeSubcategory = true,
      includeCreator = true,
      lean = true,
      cache: useCacheParam = 'false'
    } = req.query;

    const showAllFlag = (showAll || includeInactive) && req.user?.role === 'admin';
    const userRole = req.user?.role || 'guest';

    // Build secure query
    const filter = buildSecureServiceQuery({
      // Pass sanitized parameters
      search: search || q,
      title,
      slug,
      category,
      subcategory,
      createdBy,
      minPrice,
      maxPrice,
      minDeliveryTime,
      maxDeliveryTime,
      deliveryTimeUnit,
      currency,
      status: showAllFlag ? status : undefined,
      isFeatured,
      isRecommended,
      isPopular,
      hasImages,
      hasFaqs,
      tags,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      publishedAfter,
      publishedBefore,
      ids,
      excludeIds,
      showAll: showAllFlag
    }, userRole, req.user?._id);
const injectionPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /(\%3D)|(=)/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /(\%7C)/i,
      /((\%27)|(\'))union/i
    ];
    
    // Validate all string parameters
    const stringParams = { search, q, title, slug, sort, order, fields, excludeFields };
    for (const [key, value] of Object.entries(stringParams)) {
      if (value && typeof value === 'string') {
        // Check for injection patterns
        for (const pattern of injectionPatterns) {
          if (pattern.test(value)) {
            console.warn(`Potential injection attempt detected in ${key}:`, value);
            return res.status(400).json({
              success: false,
              message: 'Invalid query parameters detected',
              code: 'INVALID_PARAMETERS',
              requestId,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Validate length
        if (value.length > 500) {
          return res.status(400).json({
            success: false,
            message: 'Query parameter too long',
            code: 'PARAMETER_TOO_LONG',
            requestId
          });
        }
      }
    }
    const numericParams = { page, limit, minPrice, maxPrice};
    for (const [key, value] of Object.entries(numericParams)) {
      if (value && isNaN(parseFloat(value))) {
        return res.status(400).json({
          success: false,
          message: `Invalid numeric value for ${key}`,
          code: 'INVALID_NUMERIC_VALUE',
          requestId
        });
      }
    }
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;

    // Sort configuration
    const allowedSortFields = ['price','createdAt', 'updatedAt', 'deliveryTime','relevance'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = sortField === 'relevance' ? { score: { $meta: 'textScore' } } : { [sortField]: sortOrder };

    // Field selection
    const defaultExclude = ['__v', 'lastUpdatedBy', 'version', 'deletedAt', 'deletedBy'];
    let select = {};
    
    if (fields) {
      try {
        const fieldArray = fields.split(',').map(f => f.trim());
        fieldArray.forEach(field => {
          if (field && !defaultExclude.includes(field)) {
            select[field] = 1;
          }
        });
      } catch (err) {
        console.warn('Error parsing fields:', err);
      }
    } else {
      // Default selection - include essential fields
      select = {
        title: 1,
        slug: 1,
        shortDescription: 1,
        description: 1,
        price: 1,
        currency: 1,
        deliveryTime: 1,
        deliveryTimeUnit: 1,
        revisions: 1,
        images: 1,
        thumbnail: 1,
        tags: 1,
        status: 1,
        isActive: 1,
        isFeatured: 1,
        isRecommended: 1,
        isPopular: 1,
        category: 1,
        subcategory: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        publishedAt: 1,
      };
    }
    
    // Exclude specific fields if requested
    if (excludeFields) {
      try {
        const excludeArray = excludeFields.split(',').map(f => f.trim());
        excludeArray.forEach(field => {
          select[field] = 0;
        });
      } catch (err) {
        console.warn('Error parsing excludeFields:', err);
      }
    }

    // Build populate options - FIXED: Ensure category and subcategory are properly populated
    const populateOptions = [];
    
    if (populate && (includeCategory === 'true' || includeCategory === true || includeCategory === undefined)) {
      populateOptions.push({
        path: 'category',
        select: 'name slug icon description',
        match: { isActive: true }
      });
    }
    
    if (populate && (includeSubcategory === 'true' || includeSubcategory === true)) {
      populateOptions.push({
        path: 'subcategory',
        select: 'name slug icon description',
        match: { isActive: true }
      });
    }
    
    if (populate && (includeCreator === 'true' || includeCreator === true || includeCreator === undefined)) {
      populateOptions.push({
        path: 'createdBy',
        select: 'name email picture role',
        match: { isActive: true }
      });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('services_list', {
      filter: JSON.stringify(filter),
      page: pageNum,
      limit: limitNum,
      sort: sortField,
      order: sortOrder,
      populate: populateOptions,
      userRole
    });

    let services, total;
    const useCache = useCacheParam === 'true';
    const shouldUseCache = useCache && pageNum === 1 && !search && !q && Object.keys(filter).length <= 3;

if (shouldUseCache) {
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT] ${cacheKey.substring(0, 20)}...`);
    return res.json({ ...cached, cached: true });
  }
}

    if (!services || !total) {
      // Build query
      let query = Service.find(filter);
      
      // Add text score for search relevance
      if (search || q) {
        query = query.select({ ...select, score: { $meta: 'textScore' } });
      } else {
        query = query.select(select);
      }
      
      // Apply sorting, skipping, and limiting
      query = query.sort(sortObj).skip(skip).limit(limitNum);
      
      // Apply population
      if (populateOptions.length > 0) {
        query = query.populate(populateOptions);
      }
      
      // Apply lean if requested
      if (lean) {
        query = query.lean();
      }
      
      // Execute query with timeout
      query = query.maxTimeMS(5000);
      
      [services, total] = await Promise.all([
        query,
        Service.countDocuments(filter).maxTimeMS(2000)
      ]);

      if (shouldUseCache) {
        // Cache for 5 minutes
        await cache.set(cacheKey, { services, total }, 300);
        console.log(`Cache set for services: ${cacheKey}`);
      }
    }

    // Process services for response
    const safeServices = services.map(service => {
      let serviceObj;
      
      if (lean && typeof service === 'object') {
        serviceObj = { ...service };
      } else if (service && typeof service.toObject === 'function') {
        serviceObj = service.toObject();
      } else {
        serviceObj = service;
      }
      
      // Ensure category and subcategory are properly formatted
      if (serviceObj.category) {
        serviceObj.category = {
          _id: serviceObj.category._id || serviceObj.category,
          name: serviceObj.category.name || 'Uncategorized',
          slug: serviceObj.category.slug || '',
          icon: serviceObj.category.icon || '',
          description: serviceObj.category.description || ''
        };
      }
      
      if (serviceObj.subcategory) {
        serviceObj.subcategory = {
          _id: serviceObj.subcategory._id || serviceObj.subcategory,
          name: serviceObj.subcategory.name || '',
          slug: serviceObj.subcategory.slug || '',
          icon: serviceObj.subcategory.icon || '',
          description: serviceObj.subcategory.description || ''
        };
      }
      
      // Clean up creator data
      if (serviceObj.createdBy && serviceObj.createdBy._id) {
        const safeCreator = {
          _id: serviceObj.createdBy._id,
          name: serviceObj.createdBy.name || 'Unknown',
          picture: serviceObj.createdBy.picture || null,
          role: serviceObj.createdBy.role || 'user'
        };
        
        // Only include email for admin users
        if (req.user?.role === 'admin' && serviceObj.createdBy.email) {
          safeCreator.email = serviceObj.createdBy.email;
        }
        
        serviceObj.createdBy = safeCreator;
      }
      
      // Add computed fields
      serviceObj.hasImages = serviceObj.images && serviceObj.images.length > 0;
      serviceObj.hasThumbnail = !!serviceObj.thumbnail;
      serviceObj.priceFormatted = `${serviceObj.currency || 'USD'} ${serviceObj.price || '0.00'}`;
      
      // Truncate description for list view
      if (serviceObj.description && serviceObj.description.length > 150) {
        serviceObj.shortDescription = serviceObj.shortDescription || serviceObj.description.substring(0, 150) + '...';
      }
      
      // Remove sensitive fields
      delete serviceObj.__v;
      delete serviceObj.lastUpdatedBy;
      delete serviceObj.version;
      delete serviceObj.deletedAt;
      delete serviceObj.deletedBy;
      
      return serviceObj;
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Get category and subcategory counts for active services
    let categoryStats = [];
    let subcategoryStats = [];
    
    if (pageNum === 1 && !category && !subcategory) {
      try {
        // Get category distribution
        categoryStats = await Service.aggregate([
          { 
            $match: { 
              status: 'active',
              isActive: true,
              category: { $exists: true, $ne: null }
            } 
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);

        // Get subcategory distribution
        subcategoryStats = await Service.aggregate([
          { 
            $match: { 
              status: 'active',
              isActive: true,
              subcategory: { $exists: true, $ne: null }
            } 
          },
          {
            $group: {
              _id: '$subcategory',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 15 }
        ]);

        // Populate category and subcategory names
        if (categoryStats.length > 0) {
          const categoryIds = categoryStats.map(stat => stat._id);
          const categories = await Category.find({ _id: { $in: categoryIds } })
            .select('name slug icon')
            .lean();
          
          categoryStats = categoryStats.map(stat => {
            const cat = categories.find(c => c._id.toString() === stat._id.toString());
            return {
              ...stat,
              name: cat?.name || 'Unknown',
              slug: cat?.slug || '',
              icon: cat?.icon || ''
            };
          });
        }

        if (subcategoryStats.length > 0) {
          const subcategoryIds = subcategoryStats.map(stat => stat._id);
          const subcategories = await Subcategory.find({ _id: { $in: subcategoryIds } })
            .select('name slug icon category')
            .lean();
          
          // Get parent categories for subcategories
          const categoryIds = [...new Set(subcategories.map(s => s.category))];
          const categories = await Category.find({ _id: { $in: categoryIds } })
            .select('name slug')
            .lean();
          
          subcategoryStats = subcategoryStats.map(stat => {
            const subcat = subcategories.find(s => s._id.toString() === stat._id.toString());
            const parentCategory = categories.find(c => c._id.toString() === subcat?.category?.toString());
            
            return {
              ...stat,
              name: subcat?.name || 'Unknown',
              slug: subcat?.slug || '',
              icon: subcat?.icon || '',
              categoryName: parentCategory?.name || 'Unknown',
              categorySlug: parentCategory?.slug || ''
            };
          });
        }
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
        // Don't fail the request if stats fail
      }
    }

    const responseTime = Date.now() - startTime;
    
    // Set response headers
    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Response-Time': `${responseTime}ms`,
      'X-Cache': shouldUseCache && services !== undefined ? 'HIT' : 'MISS',
      'Cache-Control': shouldUseCache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate'
    });

    res.json({
      success: true,
      data: safeServices,
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
      stats: {
        categories: categoryStats,
        subcategories: subcategoryStats,
        totalServices: total
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      cached: shouldUseCache && services !== undefined
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[GET SERVICES ERROR]', error);
    
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout. Please try with fewer filters.',
        code: 'QUERY_TIMEOUT',
        requestId,
        responseTime: `${responseTime}ms`
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid filter parameter',
        code: 'INVALID_FILTER',
        requestId,
        responseTime: `${responseTime}ms`
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'GET_LIST', req.user?._id, { 
      error: error.message,
      responseTime,
      queryParams: req.query 
    });
    
    // Return empty response instead of crashing
    res.status(200).json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      stats: {
        categories: [],
        subcategories: [],
        totalServices: 0
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      message: 'No services found'
    });
  }
};

const getServiceById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { 
      fields, 
      populate = 'true', 
      incrementView = 'true',
      cache: useCacheParam = 'true',
      includeSubcategory = true,
      includeFullDetails = 'true'  // Add this parameter
    } = req.query;

    console.log(`[PERF] getServiceById called with id: ${id}`);
    
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Service identifier is required',
        code: 'MISSING_IDENTIFIER',
        requestId
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const useCache = useCacheParam === 'true';
    const includeFull = includeFullDetails === 'true';

    // OPTIMIZATION: Generate cache key
    const cacheKey = generateCacheKey('service_single', {
      id,
      isObjectId,
      fields,
      populate,
      includeSubcategory,
      includeFullDetails: includeFull,
      userRole: req.user?.role
    });

    let service;
    
    // Try cache first (if enabled and not admin)
    if (useCache && req.user?.role !== 'admin') {
      service = await cache.get(cacheKey);
      if (service) {
        console.log(`[PERF] Cache HIT for service: ${cacheKey} (${Date.now() - startTime}ms)`);
        
        
        
        return sendServiceResponse(res, service, requestId, startTime, true);
      }
    }

    // Build query
    let query;
    if (isObjectId) {
      query = { _id: id };
    } else {
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] }).trim();
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    // Build permission query
    const permissionQuery = buildPermissionQuery(query, req.user);

    // Select fields - Include ALL fields for admin or when includeFullDetails=true
    let select = {};
    if (fields) {
      try {
        const fieldArray = fields.split(',').map(f => f.trim());
        fieldArray.forEach(field => {
          if (field && field !== '__v' && field !== 'lastUpdatedBy') {
            select[field] = 1;
          }
        });
      } catch (err) {
        console.warn('Error parsing fields:', err);
      }
    } else if (req.user?.role === 'admin' || includeFull) {
      // Admin gets all fields except internal ones
      select = {
        __v: 0,
        lastUpdatedBy: 0,
        version: 0,
        deletedAt: 0,
        deletedBy: 0
      };
    }

    // Build populate options with ALL data for admin
    let populateOptions = [];
    if (populate === 'true' || populate === true) {
      populateOptions = [
        {
          path: 'category',
          select: 'name slug icon description parentCategory isActive featured popular',
          match: { isActive: true }
        },
        {
          path: 'createdBy',
          select: 'name email picture role createdAt isActive bio skills'
        },
        {
          path: 'lastUpdatedBy',
          select: 'name email picture role'
        }
      ];
      
      // FIXED: Add subcategory population if requested
      if (includeSubcategory === 'true' || includeSubcategory === true) {
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon description category order isActive',
          match: { isActive: true }
        });
      }
    }

    // Execute query with ALL data
    const queryStart = Date.now();
    service = await Service.findOne(permissionQuery)
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(populateOptions)
      .lean()
      .maxTimeMS(2000);

    console.log(`[PERF] Database query completed in ${Date.now() - queryStart}ms`);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId,
        details: {
          identifier: id,
          isObjectId: isObjectId,
          identifierType: isObjectId ? 'ObjectId' : 'slug'
        }
      });
    }

    // Quick permission check
    if (req.user?.role !== 'admin') {
      if (service.status !== 'active') {
        if (req.user?.role !== 'user' || service.createdBy?._id?.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access to this service is restricted',
            code: 'ACCESS_DENIED',
            requestId
          });
        }
      }
    }

    

    // Process service data - Ensure ALL fields are included
    const processedService = processServiceDataForResponse(service, req.user?.role === 'admin');
    
    // Cache for future requests (if not admin)
    if (useCache && req.user?.role !== 'admin') {
      await cache.set(cacheKey, processedService, 600);
      console.log(`[PERF] Cached service: ${cacheKey}`);
    }

    const totalTime = Date.now() - startTime;
    if (totalTime > 200) {
      console.warn(`[SLOW] getServiceById took ${totalTime}ms for service ${id}`);
    }

    return sendServiceResponse(res, processedService, requestId, startTime, false);

  } catch (error) {
    console.error(`[ERROR] getServiceById error after ${Date.now() - startTime}ms:`, error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid service identifier format',
        code: 'INVALID_IDENTIFIER_FORMAT',
        requestId,
        details: {
          identifier: req.params.id,
          expected: 'Either MongoDB ObjectId or service slug'
        }
      });
    }
    
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Service lookup timeout',
        code: 'QUERY_TIMEOUT',
        requestId,
        suggestion: 'Try using fewer populate options'
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'GET_BY_ID', req.user?._id, { 
      id: req.params.id, 
      error: error.message,
      responseTime: Date.now() - startTime
    });
    
    next(error);
  }
};

// NEW: Process service data for response with all fields
const processServiceDataForResponse = (service, isAdmin = false) => {
  const processed = { ...service };
  
  // Ensure all fields exist even if empty
  const requiredFields = [
    'title', 'description', 'shortDescription', 'price', 'currency',
    'deliveryTime', 'deliveryTimeUnit', 'revisions',
    'status', 'isFeatured', 'isRecommended', 'isPopular',
    'tags', 'features', 'faqs', 'requirements', 'searchKeywords',
    'metaTitle', 'metaDescription', 'isActive', 'createdAt', 'updatedAt',
    'publishedAt', 'slug', 'category', 'subcategory', 'createdBy', 'thumbnail', 'images'
  ];
  
  // Initialize missing fields
  requiredFields.forEach(field => {
    if (processed[field] === undefined) {
      if (field === 'tags' || field === 'features' || field === 'faqs' || 
          field === 'requirements' || field === 'searchKeywords') {
        processed[field] = [];
      } else if (field === 'images') {
        processed[field] = [];
      } else if (field === 'thumbnail') {
        processed[field] = null;
      } else if (field === 'price') {
        processed[field] = 0;
      } else if (field === 'deliveryTime') {
        processed[field] = 1;
      } else if (field === 'revisions') {
        processed[field] = 1;
      } else if (field === 'currency') {
        processed[field] = 'USD';
      } else if (field === 'deliveryTimeUnit') {
        processed[field] = 'days';
      } else if (field === 'status') {
        processed[field] = 'draft';
      } else if (field === 'isActive') {
        processed[field] = true;
      } else if (field === 'isFeatured' || field === 'isRecommended' || 
                 field === 'isPopular') {
        processed[field] = false;
      } else if (field === 'createdAt' || field === 'updatedAt') {
        processed[field] = new Date().toISOString();
      } else if (field === 'slug') {
        processed[field] = processed.title ? 
          processed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
      } else {
        processed[field] = null;
      }
    }
  });
  
  // Format category data
  if (processed.category) {
    if (typeof processed.category === 'string') {
      processed.category = {
        _id: processed.category,
        name: 'Unknown Category',
        slug: '',
        icon: '',
        description: ''
      };
    } else {
      processed.category = {
        _id: processed.category._id || processed.category,
        name: processed.category.name || 'Unknown Category',
        slug: processed.category.slug || '',
        icon: processed.category.icon || '',
        description: processed.category.description || '',
        isActive: processed.category.isActive !== undefined ? processed.category.isActive : true
      };
    }
  } else {
    processed.category = {
      _id: null,
      name: 'Unknown Category',
      slug: '',
      icon: '',
      description: '',
      isActive: false
    };
  }
  
  // Format subcategory data
  if (processed.subcategory) {
    if (typeof processed.subcategory === 'string') {
      processed.subcategory = {
        _id: processed.subcategory,
        name: 'Unknown Subcategory',
        slug: '',
        icon: '',
        description: '',
        category: processed.category._id
      };
    } else {
      processed.subcategory = {
        _id: processed.subcategory._id || processed.subcategory,
        name: processed.subcategory.name || 'Unknown Subcategory',
        slug: processed.subcategory.slug || '',
        icon: processed.subcategory.icon || '',
        description: processed.subcategory.description || '',
        category: processed.subcategory.category || processed.category._id,
        isActive: processed.subcategory.isActive !== undefined ? processed.subcategory.isActive : true
      };
    }
  } else {
    processed.subcategory = {
      _id: null,
      name: 'No Subcategory',
      slug: '',
      icon: '',
      description: '',
      category: processed.category._id,
      isActive: false
    };
  }
  
  // Format createdBy data
  if (processed.createdBy) {
    if (typeof processed.createdBy === 'string') {
      processed.createdBy = {
        _id: processed.createdBy,
        name: 'Unknown User',
        email: '',
        picture: null,
        role: 'user'
      };
    } else {
      processed.createdBy = {
        _id: processed.createdBy._id || processed.createdBy,
        name: processed.createdBy.name || 'Unknown User',
        email: processed.createdBy.email || '',
        picture: processed.createdBy.picture || null,
        role: processed.createdBy.role || 'user',
        isActive: processed.createdBy.isActive !== undefined ? processed.createdBy.isActive : true
      };
      
      // Only include sensitive fields for admin
      if (!isAdmin) {
        delete processed.createdBy.email;
      }
    }
  } else {
    processed.createdBy = {
      _id: null,
      name: 'Unknown User',
      email: '',
      picture: null,
      role: 'user',
      isActive: false
    };
  }
  
  // Format lastUpdatedBy if exists
  if (processed.lastUpdatedBy) {
    if (typeof processed.lastUpdatedBy === 'string') {
      processed.lastUpdatedBy = {
        _id: processed.lastUpdatedBy,
        name: 'System',
        picture: null
      };
    } else {
      processed.lastUpdatedBy = {
        _id: processed.lastUpdatedBy._id || processed.lastUpdatedBy,
        name: processed.lastUpdatedBy.name || 'System',
        email: processed.lastUpdatedBy.email || '',
        picture: processed.lastUpdatedBy.picture || null,
        role: processed.lastUpdatedBy.role || 'user'
      };
    }
  }
  
  // Ensure arrays are properly formatted
  ['tags', 'features', 'faqs', 'requirements', 'searchKeywords'].forEach(field => {
    if (!Array.isArray(processed[field])) {
      if (typeof processed[field] === 'string') {
        try {
          processed[field] = JSON.parse(processed[field]);
        } catch {
          processed[field] = [];
        }
      } else {
        processed[field] = [];
      }
    }
  });
  
  // Format features array
  if (Array.isArray(processed.features)) {
    processed.features = processed.features.map((feature, index) => {
      if (typeof feature === 'string') {
        return {
          title: `Feature ${index + 1}`,
          description: feature,
          included: true
        };
      }
      return {
        title: feature.title || `Feature ${index + 1}`,
        description: feature.description || '',
        included: feature.included !== undefined ? feature.included : true
      };
    });
  }
  
  // Format faqs array
  if (Array.isArray(processed.faqs)) {
    processed.faqs = processed.faqs.map((faq, index) => {
      if (typeof faq === 'string') {
        return {
          question: `Question ${index + 1}`,
          answer: faq
        };
      }
      return {
        question: faq.question || `Question ${index + 1}`,
        answer: faq.answer || ''
      };
    });
  }
  
  // Format thumbnail
  if (processed.thumbnail) {
    if (typeof processed.thumbnail === 'string') {
      processed.thumbnail = {
        url: processed.thumbnail,
        public_id: `thumbnail-${Date.now()}`,
        uploadedAt: new Date().toISOString()
      };
    } else if (!processed.thumbnail.url) {
      processed.thumbnail = null;
    }
  }
  
  // Format images array
  if (Array.isArray(processed.images)) {
    processed.images = processed.images.map((img, index) => {
      if (typeof img === 'string') {
        return {
          url: img,
          public_id: `image-${Date.now()}-${index}`,
          uploadedAt: new Date().toISOString()
        };
      }
      return {
        url: img.url || '',
        public_id: img.public_id || `image-${Date.now()}-${index}`,
        width: img.width || 0,
        height: img.height || 0,
        size: img.size || 0,
        format: img.format || 'jpg',
        uploadedAt: img.uploadedAt || new Date().toISOString()
      };
    });
  }
  
  // Add computed fields
  processed.hasImages = Array.isArray(processed.images) && processed.images.length > 0;
  processed.hasThumbnail = !!processed.thumbnail;
  processed.priceFormatted = `${processed.currency || 'USD'} ${(processed.price || 0).toFixed(2)}`;
  processed.deliveryFormatted = `${processed.deliveryTime || 0} ${processed.deliveryTimeUnit || 'days'}`;
  
  // Add status badge
  const statusColors = {
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    paused: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    suspended: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    denied: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
  };
  
  const status = processed.status || 'draft';
  const statusConfig = statusColors[status] || statusColors.draft;
  
  processed.statusBadge = {
    text: status.charAt(0).toUpperCase() + status.slice(1),
    color: statusConfig.bg,
    textColor: statusConfig.text,
    border: statusConfig.border
  };
  
  return processed;
};
const buildPermissionQuery = (query, user) => {
  if (user?.role === 'admin') {
    return query; // Admin can see everything
  }
  
  if (user?.role === 'user') {
    return {
      $or: [
        { ...query, createdBy: user._id },
        { 
          ...query, 
          status: 'active',
          isActive: true 
        }
      ]
    };
  }
  
  // Non-authenticated users
  return {
    ...query,
    status: 'active',
    isActive: true
  };
};

// Get optimized field selection
const getOptimizedSelect = (fields, isFastMode, skipImages, isMinimal) => {
  if (fields) {
    const fieldArray = fields.split(',').map(f => f.trim());
    const select = {};
    fieldArray.forEach(field => {
      if (field !== '__v' && field !== 'lastUpdatedBy') {
        select[field] = 1;
      }
    });
    return select;
  }
  
  // Pre-defined optimized selections
  if (isFastMode) {
    return {
      _id: 1,
      title: 1,
      slug: 1,
      shortDescription: 1,
      price: 1,
      currency: 1,
      deliveryTime: 1,
      deliveryTimeUnit: 1,
      revisions: 1,
      thumbnail: 1,
      status: 1,
      isActive: 1,
      category: 1,
      createdBy: 1,
      createdAt: 1
    };
  }
  
  if (isMinimal) {
    return {
      _id: 1,
      title: 1,
      slug: 1,
      price: 1,
      currency: 1,
      thumbnail: 1,
      status: 1
    };
  }
  
  // Default optimized selection
  const select = {
    __v: 0,
    lastUpdatedBy: 0,
    version: 0,
    deletedAt: 0,
    deletedBy: 0
  };
  
  if (skipImages) {
    select.images = 0;
  }
  
  return select;
};

// Get optimized populate options
const getOptimizedPopulateOptions = (isFastMode, isMinimal) => {
  if (isMinimal) {
    return []; // No population for minimal mode
  }
  
  if (isFastMode) {
    return [
      {
        path: 'category',
        select: 'name slug',
        match: { isActive: true }
      },
      {
        path: 'createdBy',
        select: 'name picture',
        match: { isActive: true }
      }
    ];
  }
  
  // Full populate (but optimized)
  return [
    {
      path: 'category',
      select: 'name slug icon description',
      match: { isActive: true }
    },
    {
      path: 'subcategory',
      select: 'name slug',
      match: { isActive: true }
    },
    {
      path: 'createdBy',
      select: 'name picture role createdAt',
      match: { isActive: true }
    }
  ];
};

// Process service data efficiently
const processServiceData = (service, isFastMode, isMinimal, skipImages) => {
  const processed = { ...service };
  
  // OPTIMIZATION: Only process creator info if needed
  if (processed.createdBy && !isMinimal) {
    processed.createdBy = {
      _id: processed.createdBy._id,
      name: processed.createdBy.name,
      picture: processed.createdBy.picture
    };
    
    if (!isFastMode) {
      processed.createdBy.accountAge = Date.now() - new Date(processed.createdBy.createdAt).getTime();
    }
  }
  
  // OPTIMIZATION: Limit images if skipImages is true
  if (skipImages && processed.images && Array.isArray(processed.images)) {
    processed.images = processed.images.slice(0, 1); // Keep only first image
  }
  
  return processed;
};

// Send optimized response
const sendServiceResponse = (res, service, requestId, startTime, cached) => {
  const responseTime = Date.now() - startTime;
  
  res.set({
    'X-Request-ID': requestId,
    'X-Response-Time': `${responseTime}ms`,
    'X-Cache': cached ? 'HIT' : 'MISS',
    'Cache-Control': cached ? 'public, max-age=600' : 'no-cache, no-store, must-revalidate'
  });
  
  return res.json({
    success: true,
    service,
    requestId,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    cached
  });
};

const updateService = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    // Check permissions
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    // Find service first to check ownership and get current version
    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    const currentDbVersion = service.version || 1;
    let clientVersion = currentDbVersion; // Default to current DB version
    let updateData = {};

    console.log(`[${requestId}] Service ${id} - DB Version: ${currentDbVersion}`);

    // Handle FormData
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log(`[${requestId}] Processing FormData update`);
      
      // Try to get client version from FormData
      if (req.body.version) {
        try {
          const versionNum = parseInt(req.body.version);
          if (!isNaN(versionNum)) {
            clientVersion = versionNum;
            console.log(`[${requestId}] Client version from FormData: ${clientVersion}`);
          }
        } catch (e) {
          console.warn(`[${requestId}] Could not parse version:`, req.body.version);
        }
      }
      
      // Parse JSON data from FormData
      if (req.body.data) {
        try {
          updateData = JSON.parse(req.body.data);
          console.log(`[${requestId}] Successfully parsed data from FormData`);
        } catch (error) {
          console.error(`[${requestId}] Error parsing JSON data:`, error);
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON data in FormData',
            code: 'INVALID_FORM_DATA',
            requestId
          });
        }
      } else {
        // If no data field, use all body fields except version
        updateData = { ...req.body };
        delete updateData.version;
      }
    } else {
      // Handle JSON request
      updateData = req.body;
      
      if (updateData.version !== undefined) {
        try {
          const versionNum = parseInt(updateData.version);
          if (!isNaN(versionNum)) {
            clientVersion = versionNum;
          }
        } catch (e) {
          console.warn(`[${requestId}] Could not parse version in JSON:`, updateData.version);
        }
        delete updateData.version;
      }
    }

    console.log(`[${requestId}] Version check - Client: ${clientVersion}, DB: ${currentDbVersion}`);

    // **IMPROVED VERSION CONFLICT HANDLING**
    // Only show conflict if client version is significantly behind
    if (clientVersion < currentDbVersion) {
      const versionDiff = currentDbVersion - clientVersion;
      
      if (versionDiff > 5) {
        // Significant conflict - require refresh
        console.warn(`[${requestId}] Significant version conflict: diff=${versionDiff}`);
        return res.status(409).json({
          success: false,
          message: 'This service has been modified multiple times. Please refresh and review changes.',
          code: 'VERSION_CONFLICT_SIGNIFICANT',
          currentVersion: currentDbVersion,
          requestId
        });
      } else if (versionDiff > 1) {
        // Minor conflict - warn but allow
        console.log(`[${requestId}] Minor version mismatch: diff=${versionDiff}. Allowing update.`);
        // Log this for audit but don't block
      }
      
      // Update client version to match DB version
      clientVersion = currentDbVersion;
    }

    // Sanitize input
    const sanitizedData = sanitizeServiceInput(updateData);
    
    // Remove admin-only fields if not admin
    if (!isAdmin) {
      delete sanitizedData.status;
      delete sanitizedData.isFeatured;
      delete sanitizedData.isRecommended;
      delete sanitizedData.isPopular;
    }

    // Validate subcategory if provided
    if (sanitizedData.subcategory) {
      const subcategory = await Subcategory.findOne({
        _id: sanitizedData.subcategory,
        category: sanitizedData.category || service.category,
        isActive: true
      });

      if (!subcategory) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory not found or does not belong to selected category',
          code: 'SUBCATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    // Prepare update
    const updateFields = {
      $set: {
        ...sanitizedData,
        lastUpdatedBy: req.user._id,
        updatedAt: new Date(),
      },
      $inc: { version: 1 }
    };

    // Clean up empty fields
    Object.keys(updateFields.$set).forEach(key => {
      const val = updateFields.$set[key];
      if (val === undefined || val === null || val === '') {
        delete updateFields.$set[key];
      }
    });

    // Handle file uploads
    if (req.files) {
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        const thumbnailFile = req.files.thumbnail[0];
        const thumbnailUpload = await processUploadToCloudinary([thumbnailFile], 'thumbnails');
        
        if (thumbnailUpload.length > 0) {
          updateFields.$set.thumbnail = {
            url: thumbnailUpload[0].url,
            public_id: thumbnailUpload[0].public_id,
            width: thumbnailUpload[0].width,
            height: thumbnailUpload[0].height,
            size: thumbnailUpload[0].size,
            format: thumbnailUpload[0].format,
            uploadedAt: new Date()
          };
          
          if (service.thumbnail && service.thumbnail.public_id) {
            await deleteCloudinaryImages([{ public_id: service.thumbnail.public_id }]);
          }
        }
      }
      
      if (req.files.images && req.files.images.length > 0) {
        const imageUploads = await processUploadToCloudinary(req.files.images, 'services');
        const newImages = imageUploads.map(img => ({
          url: img.url,
          public_id: img.public_id,
          width: img.width,
          height: img.height,
          size: img.size,
          format: img.format,
          uploadedAt: new Date()
        }));
        
        const existingImages = service.images || [];
        updateFields.$set.images = [...existingImages, ...newImages].slice(0, 10);
      }
    }

    // Manual validation
    const validationErrors = [];
    
    const title = sanitizedData.title || service.title;
    if (!title || title.trim().length < 5) {
      validationErrors.push({
        field: 'title',
        message: 'Title must be at least 5 characters',
        type: 'minlength'
      });
    }
    
    const description = sanitizedData.description || service.description;
    if (!description || description.trim().length < 50) {
      validationErrors.push({
        field: 'description',
        message: 'Description must be at least 50 characters',
        type: 'minlength'
      });
    }
    
    const price = sanitizedData.price !== undefined ? sanitizedData.price : service.price;
    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 1) {
      validationErrors.push({
        field: 'price',
        message: 'Price must be a number greater than 0',
        type: 'number.base'
      });
    }
    
    const category = sanitizedData.category || service.category;
    if (!category) {
      validationErrors.push({
        field: 'category',
        message: 'Category is required',
        type: 'required'
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }

    console.log(`[${requestId}] Performing update from version ${currentDbVersion} to ${currentDbVersion + 1}`);

    // Perform update WITHOUT Mongoose validators to avoid version field issues
    const updatedService = await Service.findOneAndUpdate(
      { _id: id },
      updateFields,
      {
        new: true,
        runValidators: false, // Critical: Disable Mongoose validators
        context: 'query',
        maxTimeMS: 5000
      }
    )
    .select('-__v -lastUpdatedBy -version -deletedAt -deletedBy')
    .populate('category', 'name slug icon')
    .populate('subcategory', 'name slug icon')
    .populate('createdBy', 'name picture')
    .lean();

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Invalidate cache
    await invalidateServiceCache(id);

    const responseTime = Date.now() - startTime;
    const newVersion = currentDbVersion + 1;
    
    // Log successful update
    console.log(`[${requestId}] Update successful - New version: ${newVersion}, Time: ${responseTime}ms`);
    
    // Return response with new version
    res.json({
      success: true,
      message: 'Service updated successfully',
      service: {
        ...updatedService,
        version: newVersion
      },
      version: newVersion,
      previousVersion: currentDbVersion,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] Update error after ${responseTime}ms:`, error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        type: err.kind
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        requestId
      });
    }
    
    // Handle other errors
    const errorResponse = {
      success: false,
      message: error.message || 'Failed to update service',
      code: 'UPDATE_ERROR',
      requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error.name === 'MongoError' && error.code === 11000) {
      errorResponse.message = 'Service with similar title already exists';
      errorResponse.code = 'DUPLICATE_SERVICE';
    }
    
    if (error.name === 'CastError') {
      errorResponse.message = 'Invalid data format';
      errorResponse.code = 'INVALID_DATA_FORMAT';
    }
    
    res.status(error.status || 500).json(errorResponse);
  }
};


// Update deleteService function
const deleteService = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      logAudit('UNAUTHORIZED_DELETE', 'SERVICE', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    if (permanent === 'true' && isAdmin) {
      // Delete from Cloudinary
      if (service.images && Array.isArray(service.images)) {
        try {
          await deleteCloudinaryImages(service.images.map(img => ({ public_id: img.public_id })));
        } catch (cleanupError) {
          console.error('Error deleting Cloudinary images:', cleanupError);
        }
      }
      
      if (service.thumbnail && service.thumbnail.public_id) {
        try {
          await deleteCloudinaryImages([{ public_id: service.thumbnail.public_id }]);
        } catch (cleanupError) {
          console.error('Error deleting Cloudinary thumbnail:', cleanupError);
        }
      }
      
      // Permanent delete
      await Service.deleteOne({ _id: id });
      
      logAudit('PERMANENT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        createdBy: service.createdBy,
        force: force === 'true'
      });
      
      await invalidateServiceCache(id);
      
      return res.json({
        success: true,
        message: 'Service permanently deleted',
        requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Soft delete
      const wasOpen = service.status === 'open';
      
      const result = await Service.updateOne(
        { _id: id },
        { 
          $set: {
            isActive: false,
            status: 'suspended',
            deletedAt: new Date(),
            deletedBy: req.user._id,
            lastUpdatedBy: req.user._id
          }
        }
      );

      if (!result.modifiedCount) {
        return res.status(404).json({
          success: false,
          message: 'Service not found during deletion',
          code: 'DELETE_FAILED',
          requestId
        });
      }

      if (wasOpen && service.category) {
        await Category.findByIdAndUpdate(service.category, {
          $inc: { servicesCount: -1 }
        });
      }

      await invalidateServiceCache(id);

      logAudit('SOFT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        createdBy: service.createdBy
      });
      
      return res.json({
        success: true,
        message: 'Service deactivated',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[DELETE SERVICE ERROR]', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service due to validation constraints',
        code: 'VALIDATION_ERROR_ON_DELETE',
        details: Object.values(error.errors).map(err => err.message),
        requestId
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'DELETE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};


// Restore Service
const restoreService = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only restore your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    const category = await Category.findById(service.category);
    if (!category || !category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Category is no longer active',
        code: 'CATEGORY_INACTIVE',
        requestId
      });
    }

    service.isActive = true;
    service.status = 'active';
    service.lastUpdatedBy = req.user._id;
    await service.save();

    // Invalidate cache after restoration
    await invalidateServiceCache(id);

    logAudit('RESTORE', 'SERVICE', id, req.user._id);

    res.json({
      success: true,
      message: 'Service restored successfully',
      service: {
        _id: service._id,
        title: service.title,
        slug: service.slug,
        status: service.status,
        isActive: service.isActive
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'RESTORE', req.user._id, { error: error.message });
    next(error);
  }
};

const getServiceStats = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    console.log('[SERVICE STATS] Starting stats aggregation');
    
    // Generate cache key
    const cacheKey = generateCacheKey('admin:stats:services', {
      timestamp: Math.floor(Date.now() / 60000) // Cache per minute
    });
    
    // Try to get from cache
    const cachedStats = await cache.get(cacheKey);
    if (cachedStats) {
      console.log('Cache HIT admin:stats:services');
      return res.json({
        ...cachedStats,
        cached: true,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Simplify the aggregation for better performance
    const stats = await Service.aggregate([
      {
        $facet: {
          // Overview stats - simplified
          overview: [
            {
              $group: {
                _id: null,
                totalServices: { $sum: 1 },
                activeServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'active'] },
                      1,
                      0
                    ]
                  } 
                },
                draftServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'draft'] },
                      1,
                      0
                    ]
                  } 
                },
                pendingServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'pending'] },
                      1,
                      0
                    ]
                  } 
                },
                pausedServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'paused'] },
                      1,
                      0
                    ]
                  } 
                },
                suspendedServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$status', 'suspended'] },
                      1,
                      0
                    ]
                  } 
                },
                featuredServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$isFeatured', true] },
                      1,
                      0
                    ]
                  } 
                },
                recommendedServices: { 
                  $sum: { 
                    $cond: [
                      { $eq: ['$isRecommended', true] },
                      1,
                      0
                    ]
                  } 
                },
                // Use $ifNull to handle null values
                totalViews: { $sum: { $ifNull: ['$views', 0] } },
                totalLikes: { $sum: { $ifNull: ['$likes', 0] } },
                avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                avgRating: { $avg: { $ifNull: ['$rating', 0] } },
                avgDeliveryTime: { $avg: { $ifNull: ['$deliveryTime', 0] } },
                // Calculate revenue safely
                totalRevenue: { 
                  $sum: { 
                    $multiply: [
                      { $ifNull: ['$price', 0] },
                      { $ifNull: ['$ordersCount', 0] }
                    ]
                  } 
                }
              }
            }
          ],
          
          // Category stats - simplified
          byCategory: [
            { 
              $match: { 
                status: { $in: ['active', 'published'] },
                isActive: true,
                category: { $exists: true, $ne: null }
              } 
            },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgRating: { $avg: { $ifNull: ['$rating', 0] } },
                avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                totalRevenue: { 
                  $sum: { 
                    $multiply: [
                      { $ifNull: ['$price', 0] },
                      { $ifNull: ['$ordersCount', 0] }
                    ]
                  } 
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          
          // Status breakdown
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                avgOrders: { $avg: { $ifNull: ['$ordersCount', 0] } }
              }
            },
            { $sort: { count: -1 } }
          ],
          
          // Monthly growth
          growth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                revenue: { 
                  $sum: { 
                    $multiply: [
                      { $ifNull: ['$price', 0] },
                      { $ifNull: ['$ordersCount', 0] }
                    ]
                  } 
                }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    console.log('[SERVICE STATS] Aggregation completed:', stats.length);

    // Handle empty results
    const result = stats[0] || {
      overview: [{
        totalServices: 0,
        activeServices: 0,
        draftServices: 0,
        pendingServices: 0,
        pausedServices: 0,
        suspendedServices: 0,
        featuredServices: 0,
        recommendedServices: 0,
        totalViews: 0,
        totalLikes: 0,
        avgPrice: 0,
        avgRating: 0,
        avgDeliveryTime: 0,
        totalRevenue: 0
      }],
      byCategory: [],
      byStatus: [],
      growth: []
    };

    // Get category names for byCategory
    const byCategory = result.byCategory || [];
    const categoryIds = byCategory.map(item => item._id).filter(id => id);
    
    let categories = [];
    if (categoryIds.length > 0) {
      categories = await Category.find({ _id: { $in: categoryIds } })
        .select('name slug')
        .lean();
    }
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });
    
    // Replace category IDs with names
    const byCategoryWithNames = byCategory.map(item => ({
      ...item,
      category: categoryMap[item._id?.toString()] || { name: 'Unknown', slug: '' }
    }));

    // Format dates in growth data
    const formattedGrowth = (result.growth || []).map(item => ({
      ...item,
      period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
    }));

    const response = {
      success: true,
      data: {
        overview: result.overview[0] || result.overview,
        byCategory: byCategoryWithNames,
        byStatus: result.byStatus || [],
        growth: formattedGrowth
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // Cache for 5 minutes

    res.json(response);

  } catch (error) {
    console.error('[SERVICE STATS ERROR]', error);
    console.error('[SERVICE STATS ERROR DETAILS]', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service statistics: ' + error.message,
      code: 'SERVICE_STATS_ERROR',
      requestId
    });
  }
};

const bulkUpdateServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for bulk operations',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    // Fix: Get ids from request body - ensure it's an array
    const { ids = [], operation, data } = req.body;

    console.log('Bulk operation received:', { ids, operation, data }); // Add logging for debugging

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'IDs must be provided as an array',
        code: 'INVALID_IDS_FORMAT',
        requestId
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No service IDs provided',
        code: 'NO_IDS_PROVIDED',
        requestId
      });
    }

    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 50 items in bulk',
        code: 'BATCH_SIZE_EXCEEDED',
        requestId
      });
    }

    // Validate each ID
    const validIds = ids.filter(id => {
      const isValid = mongoose.Types.ObjectId.isValid(id);
      if (!isValid) {
        console.log('Invalid ID found:', id);
      }
      return isValid;
    });
    
    if (validIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IDs found in request',
        code: 'INVALID_IDS',
        details: {
          totalProvided: ids.length,
          validCount: validIds.length,
          invalidCount: ids.length - validIds.length
        },
        requestId
      });
    }

    let result;
    let updateData = {};
    const now = new Date();

    const allowedOperations = {
      activate: { status: 'active', isActive: true },
      deactivate: { isActive: false },
      pause: { status: 'paused' },
      feature: { isFeatured: true },
      unfeature: { isFeatured: false },
      recommend: { isRecommended: true },
      unrecommend: { isRecommended: false },
      popular: { isPopular: true },
      unpopular: { isPopular: false },
      update: data || {}
    };

    if (!allowedOperations[operation]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk operation',
        code: 'INVALID_OPERATION',
        requestId,
        allowedOperations: Object.keys(allowedOperations)
      });
    }

    updateData = {
      ...allowedOperations[operation],
      lastUpdatedBy: req.user._id,
      updatedAt: now
    };

    if (operation === 'update') {
      updateData.$inc = { version: 1 };
    }

    if (operation === 'activate') {
      updateData.publishedAt = now;
    }

    console.log('Executing bulk update with:', { 
      filter: { _id: { $in: validIds } },
      updateData 
    });

    result = await Service.updateMany(
      { _id: { $in: validIds } },
      updateData,
      { 
        maxTimeMS: 10000,
        runValidators: operation === 'update'
      }
    );

    console.log('Bulk update result:', result);

    // Invalidate cache for all affected services
    await invalidateAllServiceCache();

    logAudit('BULK_OPERATION', 'SERVICE', 'MULTIPLE', req.user._id, {
      operation,
      affectedCount: result.modifiedCount,
      totalIds: ids.length,
      userRole: req.user.role
    });

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      result: {
        total: ids.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        failed: ids.length - result.matchedCount
      },
      requestId,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed in bulk update',
        errors: Object.values(error.errors).map(err => err.message),
        code: 'BULK_VALIDATION_ERROR',
        requestId
      });
    }

    logAudit('ERROR', 'SERVICE', 'BULK_UPDATE', req.user._id, {
      operation: req.body?.operation,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      error: error.message,
      code: 'BULK_OPERATION_FAILED',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
};

// Export Services
const exportServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for export',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { format = 'json', ...queryParams } = req.query;
    
    const filter = buildSecureServiceQuery(
      queryParams, 
      req.user.role, 
      req.user._id
    );

    const count = await Service.countDocuments(filter);
    if (count > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Export limit exceeded (max 5,000 records',
        code: 'EXPORT_LIMIT_EXCEEDED',
        requestId
      });
    }

    const services = await Service.find(filter)
      .select('-__v -lastUpdatedBy')
      .populate('category', 'name slug')
      .populate('createdBy', 'name email')
      .lean();

    if (format === 'csv') {
      const headers = [
        'ID', 'Title', 'Slug', 'Description', 'Category', 'Creator',
        'Price', 'Currency', 'Delivery Time', 'Delivery Unit', 'Revisions',
       
        'Status', 'Featured', 'Recommended', 'Popular',
        'Created At', 'Updated At', 'Published At'
      ];

      const csvRows = services.map(service => [
        service._id,
        `"${(service.title || '').replace(/"/g, '""')}"`,
        service.slug || '',
        `"${(service.description || '').replace(/"/g, '""')}"`,
        service.category?.name || '',
        service.createdBy?.name || '',
        service.price || 0,
        service.currency || 'USD',
        service.deliveryTime || 0,
        service.deliveryTimeUnit || 'days',
        service.revisions || 0,
        service.status || '',
        service.isFeatured ? 'Yes' : 'No',
        service.isRecommended ? 'Yes' : 'No',
        service.isPopular ? 'Yes' : 'No',
        new Date(service.createdAt).toISOString(),
        new Date(service.updatedAt).toISOString(),
        service.publishedAt ? new Date(service.publishedAt).toISOString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="services_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', count);
      res.header('X-Export-Timestamp', new Date().toISOString());
      
      return res.send(csvContent);
    }

    res.json({
      success: true,
      format: 'json',
      count,
      data: services,
      exportedAt: new Date().toISOString(),
      requestId
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'EXPORT', req.user?._id, { 
      format: req.query.format,
      error: error.message 
    });
    next(error);
  }
};

// Update the searchServices function at the beginning:
const searchServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Accept both 'query' and 'q' parameters for better compatibility
    const { 
      query: searchQuery, 
      q, 
      category, 
      minPrice, 
      maxPrice, 
      sort = 'relevance', 
      limit = 20, 
      cache: useCacheParam = 'true' 
    } = req.query;

    // Use either 'query' or 'q' parameter
    const query = searchQuery || q;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(200).json({
        success: true,
        query: '',
        results: [],
        count: 0,
        requestId,
        timestamp: new Date().toISOString(),
        message: 'No search query provided'
      });
    }

    const sanitizedQuery = sanitizeHtml(query, { 
      allowedTags: [], 
      allowedAttributes: {} 
    }).trim();

    if (sanitizedQuery.length < 2) {
      return res.status(200).json({
        success: true,
        query: sanitizedQuery,
        results: [],
        count: 0,
        requestId,
        timestamp: new Date().toISOString(),
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchLimit = Math.min(parseInt(limit) || 20, 100);
    const useCache = useCacheParam === 'true';

    // Generate cache key
    const cacheKey = generateCacheKey('service_search', {
      query: sanitizedQuery,
      category,
      minPrice,
      maxPrice,
      sort,
      limit: searchLimit
    });

    // Try to get from cache
    let safeResults, relatedCategories;
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        safeResults = cached.results;
        relatedCategories = cached.relatedCategories;
        console.log(`Cache hit for search: ${cacheKey}`);
      }
    }

    if (!safeResults) {
      const filter = {
        $text: { $search: sanitizedQuery },
        status: 'active',
        isActive: true
      };

      // Add category filter if provided
      if (category && category !== 'All' && mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      }

      // Price range filter
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      // Sort options
      const sortOptions = {
        relevance: { score: { $meta: 'textScore' } },
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        delivery: { deliveryTime: 1 },
        newest: { createdAt: -1 },
      };

      const sortObj = sortOptions[sort] || sortOptions.relevance;

      // Build query with text score
      const findQuery = Service.find(filter, { 
        score: { $meta: 'textScore' } 
      });

      // Apply text search only if we have search query
      if (sanitizedQuery.length > 0) {
        findQuery.select('+score');
      }

      const results = await findQuery
        .select('title slug shortDescription description price deliveryTime deliveryTimeUnit revisions thumbnail images createdBy category tags')
        .populate('createdBy', 'name picture')
        .populate('category', 'name slug icon')
        .sort(sortObj)
        .limit(searchLimit)
        .lean();

      // Format results
      safeResults = results.map(result => {
        const service = {
          _id: result._id,
          title: result.title,
          slug: result.slug,
          shortDescription: result.shortDescription || '',
          description: result.description ? result.description.substring(0, 150) + '...' : '',
          price: result.price,
          currency: result.currency || 'USD',
          deliveryTime: result.deliveryTime,
          deliveryTimeUnit: result.deliveryTimeUnit,
          revisions: result.revisions || 0,
          thumbnail: result.thumbnail,
          images: result.images || [],
          tags: result.tags || [],
          score: result.score || 0,
          createdBy: {
            _id: result.createdBy?._id,
            name: result.createdBy?.name || 'Unknown',
            picture: result.createdBy?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'
          },
          category: {
            _id: result.category?._id,
            name: result.category?.name || 'Uncategorized',
            slug: result.category?.slug,
            icon: result.category?.icon
          }
        };
        
        // Add computed fields
        service.hasImages = service.images && service.images.length > 0;
        service.priceFormatted = `${service.currency} ${service.price?.toFixed(2) || '0.00'}`;
        
        return service;
      });

      // Get related categories
      const categoryIds = [...new Set(safeResults.map(r => r.category?._id).filter(Boolean))];
      relatedCategories = await Category.find({ 
        _id: { $in: categoryIds },
        isActive: true 
      }).select('name slug icon servicesCount').lean();

      // Cache search results for 5 minutes
      if (useCache) {
        await cache.set(cacheKey, { results: safeResults, relatedCategories }, 300);
        console.log(`Cache set for search: ${cacheKey}`);
      }
    }

    res.json({
      success: true,
      query: sanitizedQuery,
      results: safeResults,
      relatedCategories,
      count: safeResults.length,
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && safeResults !== undefined
    });

  } catch (error) {
    console.error('[SEARCH SERVICES ERROR]', error);
    
    // Return empty results on error instead of 500
    res.status(200).json({
      success: true,
      query: req.query.query || req.query.q || '',
      results: [],
      count: 0,
      requestId,
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    
    logAudit('ERROR', 'SERVICE', 'SEARCH', req.user?._id, { 
      query: req.query.query,
      error: error.message 
    });
  }
};

const uploadImages = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded',
        code: 'NO_IMAGES',
        requestId
      });
    }

    // Upload to Cloudinary
    const uploadedImages = await processUploadToCloudinary(req.files, 'services');
    
    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload images',
        code: 'UPLOAD_FAILED',
        requestId
      });
    }

    const formattedImages = uploadedImages.map(img => ({
      url: img.url,
      public_id: img.public_id,
      width: img.width,
      height: img.height,
      size: img.size,
      format: img.format,
      uploadedAt: new Date()
    }));

    const existingImages = service.images || [];
    const updatedImages = [...existingImages, ...formattedImages];
    
    if (updatedImages.length > 10) {
      // Delete newly uploaded images from Cloudinary
      await deleteCloudinaryImages(formattedImages.map(img => ({ public_id: img.public_id })));
      return res.status(400).json({
        success: false,
        message: 'Cannot have more than 10 images',
        code: 'MAX_IMAGES_EXCEEDED',
        requestId
      });
    }

    service.images = updatedImages;
    
    // Set thumbnail if not already set
    if (!service.thumbnail && formattedImages.length > 0) {
      service.thumbnail = {
        url: formattedImages[0].url,
        public_id: formattedImages[0].public_id,
        width: formattedImages[0].width,
        height: formattedImages[0].height,
        size: formattedImages[0].size,
        format: formattedImages[0].format,
        uploadedAt: new Date()
      };
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    await invalidateServiceCache(id);

    logAudit('UPLOAD_IMAGES', 'SERVICE', id, req.user._id, {
      imagesAdded: formattedImages.length,
      totalImages: updatedImages.length
    });

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: formattedImages,
      totalImages: updatedImages.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload images error:', error);
    logAudit('ERROR', 'SERVICE', 'UPLOAD_IMAGES', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Update removeImage function
const removeImage = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id, publicId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Find image by public_id
    const imageIndex = service.images.findIndex(img => img.public_id === publicId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in service',
        code: 'IMAGE_NOT_FOUND',
        requestId
      });
    }

    const imageToRemove = service.images[imageIndex];
    
    // Remove image from array
    service.images.splice(imageIndex, 1);
    
    // If this was the thumbnail, set a new one or null
    if (service.thumbnail && service.thumbnail.public_id === publicId) {
      service.thumbnail = service.images.length > 0 ? {
        url: service.images[0].url,
        public_id: service.images[0].public_id,
        width: service.images[0].width,
        height: service.images[0].height,
        size: service.images[0].size,
        format: service.images[0].format,
        uploadedAt: service.images[0].uploadedAt || new Date()
      } : null;
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Delete image from Cloudinary
    await deleteCloudinaryImages([{ public_id: publicId }]);

    await invalidateServiceCache(id);

    logAudit('REMOVE_IMAGE', 'SERVICE', id, req.user._id, {
      imagePublicId: publicId,
      remainingImages: service.images.length
    });

    res.json({
      success: true,
      message: 'Image removed successfully',
      remainingImages: service.images.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Remove image error:', error);
    logAudit('ERROR', 'SERVICE', 'REMOVE_IMAGE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};
// Set Thumbnail
const setThumbnail = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id, publicId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Find image by public_id
    const image = service.images.find(img => img.public_id === publicId);
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image not found in service images',
        code: 'IMAGE_NOT_IN_SERVICE',
        requestId
      });
    }

    // Update thumbnail
    service.thumbnail = {
      url: image.url,
      public_id: image.public_id,
      width: image.width,
      height: image.height,
      size: image.size,
      format: image.format,
      uploadedAt: image.uploadedAt || new Date()
    };
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Invalidate cache after thumbnail change
    await invalidateServiceCache(id);

    logAudit('SET_THUMBNAIL', 'SERVICE', id, req.user._id, {
      thumbnail: image.url
    });

    res.json({
      success: true,
      message: 'Thumbnail set successfully',
      thumbnail: image,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Set thumbnail error:', error);
    logAudit('ERROR', 'SERVICE', 'SET_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

const uploadThumbnail = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail uploaded',
        code: 'NO_THUMBNAIL',
        requestId
      });
    }

    // Upload to Cloudinary
    const uploadedImage = await processUploadToCloudinary([req.file], 'thumbnails', {
      transformation: [
        { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:best', fetch_format: 'auto' }
      ]
    });
    
    if (uploadedImage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload thumbnail',
        code: 'UPLOAD_FAILED',
        requestId
      });
    }

    const newThumbnail = {
      url: uploadedImage[0].url,
      public_id: uploadedImage[0].public_id,
      width: uploadedImage[0].width,
      height: uploadedImage[0].height,
      size: uploadedImage[0].size,
      format: uploadedImage[0].format,
      uploadedAt: new Date()
    };
    
    // Delete old thumbnail from Cloudinary if exists
    if (service.thumbnail && service.thumbnail.public_id) {
      await deleteCloudinaryImages([{ public_id: service.thumbnail.public_id }]);
    }
    
    // Update service
    service.thumbnail = newThumbnail;
    
    // Add to images array if not already there
    const isAlreadyInImages = service.images.some(img => img.public_id === newThumbnail.public_id);
    if (!isAlreadyInImages) {
      service.images.push(newThumbnail);
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    await invalidateServiceCache(id);

    logAudit('UPLOAD_THUMBNAIL', 'SERVICE', id, req.user._id, {
      thumbnail: newThumbnail.url
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: newThumbnail,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload thumbnail error:', error);
    logAudit('ERROR', 'SERVICE', 'UPLOAD_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};
// Get My Services
const getMyServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Only authenticated users can access this endpoint
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    const { 
      status, 
      page = 1, 
      limit = 50, 
      sort = 'createdAt', 
      order = 'desc',
      search,
      title,
      category,
      subcategory,
      isFeatured,
      isRecommended,
      isPopular,
      minPrice,
      maxPrice,
      includeDrafts = 'true',
      includeInactive = 'false',
      cache: useCacheParam = 'false'
    } = req.query;

    const useCache = useCacheParam === 'true';
    const filter = { createdBy: req.user._id };
    
    // For admin, respect createdBy parameter if provided
    if (req.user.role === 'admin' && req.query.createdBy && mongoose.Types.ObjectId.isValid(req.query.createdBy)) {
      filter.createdBy = req.query.createdBy;
    }

    if (status && status !== 'undefined' && status !== 'all') {
      filter.status = status;
    } else {
      filter.status = { $nin: ['deleted'] };
    }

    if (includeDrafts === 'false') {
      if (filter.status && filter.status.$nin) {
        filter.status.$nin.push('draft');
      } else if (filter.status === 'draft') {
        delete filter.status;
      }
    }

    if (includeInactive === 'false') {
      filter.isActive = true;
    }

    if (search) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$text = { $search: sanitizedSearch };
    }

    if (title) {
      filter.title = { $regex: `^${sanitizeHtml(title, { allowedTags: [] })}`, $options: 'i' };
    }
    
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    
    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    }
    
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true';
    }
    
    if (isRecommended !== undefined) {
      filter.isRecommended = isRecommended === 'true';
    }
    
    if (isPopular !== undefined) {
      filter.isPopular = isPopular === 'true';
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key for my services
    const cacheKey = generateCacheKey('my_services', {
      userId: req.user._id,
      filter,
      page: pageNum,
      limit: limitNum,
      sort,
      order,
      includeDrafts,
      includeInactive
    });

    let services, total, statusCounts;

    // Try to get from cache
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        total = cached.total;
        statusCounts = cached.statusCounts;
        console.log(`Cache hit for my services: ${cacheKey}`);
      }
    }

    if (!services || !total) {
      const allowedSortFields = ['title', 'price','createdAt', 'updatedAt', 'deliveryTime','publishedAt'];
      const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortObj = { [sortField]: sortOrder };

      [services, total] = await Promise.all([
        Service.find(filter)
          .select('-__v -lastUpdatedBy -version')
          .populate('category', 'name slug icon')
          .populate('subcategory', 'name slug')
          .populate('createdBy', 'name picture')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Service.countDocuments(filter)
      ]);

      // Get status counts
      statusCounts = await Service.aggregate([
        { $match: { createdBy: filter.createdBy } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Cache the result if enabled
      if (useCache) {
        await cache.set(cacheKey, { services, total, statusCounts }, 300); // 5 minutes
        console.log(`Cache set for my services: ${cacheKey}`);
      }
    }

    const formattedServices = services.map(service => {
      const safeService = { ...service };

      safeService.hasImages = Boolean(service.images && service.images.length > 0);
      safeService.hasFaqs = Boolean(service.faqs && service.faqs.length > 0);

      safeService.priceFormatted = `${service.currency || 'USD'} ${service.price}`;
      safeService.deliveryFormatted = `${service.deliveryTime} ${service.deliveryTimeUnit || 'days'}`;

      const statusColors = {
        active: 'success',
        draft: 'warning',
        pending: 'info',
        paused: 'secondary',
        denied: 'danger',
        suspended: 'danger'
      };

      // FIXED: Safe handling of missing/invalid status
      const statusKey = service.status || 'draft';
      const statusText = statusKey 
        ? statusKey.charAt(0).toUpperCase() + statusKey.slice(1)
        : 'Unknown';

      safeService.statusBadge = {
        text: statusText,
        color: statusColors[statusKey] || 'secondary'
      };

      if (safeService.description && safeService.description.length > 150) {
        safeService.descriptionShort = safeService.description.substring(0, 150) + '...';
      }

      return safeService;
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const statusSummary = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Cache': useCache ? 'HIT' : 'MISS'
    });

    res.json({
      success: true,
      data: formattedServices,
      summary: {
        total,
        ...statusSummary
      },
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
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && services !== undefined
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'GET_MY_SERVICES', req.user?._id, { 
      error: error.message,
      params: req.query 
    });
    
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
        requestId
      });
    }
    
    next(error);
  }
};


// Get Admin Services
const getAdminServices = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    // Security: Verify admin access
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const {
      page = 1,
      limit = 12,
      search = '',
      status = '',
      featured = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      category,
      createdBy,
      isActive = '',
      cache: useCacheParam = 'false'
    } = req.query;

    const useCache = useCacheParam === 'true';

    // Build filter for admin - can see all services
    const filter = {};

    if (search) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { slug: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    if (status && status !== '') {
      filter.status = status;
    }

    if (featured && featured !== '') {
      filter.isFeatured = featured === 'true';
    }

    if (isActive && isActive !== '') {
      filter.isActive = isActive === 'true';
    } else {
      // If not specified, only show active services by default
      filter.isActive = true;
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      filter.createdBy = createdBy;
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key
    const cacheKey = generateCacheKey('admin_services', {
      filter,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder
    });

    let services, total, stats;

    // Try to get from cache
    if (useCache && pageNum === 1) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        total = cached.total;
        stats = cached.stats;
        console.log(`Cache hit for admin services: ${cacheKey}`);
      }
    }

    if (!services || !total) {
      // Sort options
      const allowedSortFields = ['title', 'price','createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      const sortOptions = { [sortField]: sortDirection };

      // Execute query
      [services, total] = await Promise.all([
        Service.find(filter)
          .select('-__v -lastUpdatedBy -version')
          .populate('category', 'name slug icon')
          .populate('subcategory', 'name slug')
          .populate('createdBy', 'name email picture role')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Service.countDocuments(filter)
      ]);

      // Get statistics
      stats = await Service.aggregate([
        { $match: {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $eq: ['$isActive', true] }] }, 1, 0] } },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
            suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
            featured: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
            avgPrice: { $avg: '$price' },
          }
        }
      ]);

      // Cache the result if enabled and first page
      if (useCache && pageNum === 1) {
        await cache.set(cacheKey, { services, total, stats }, 300); // 5 minutes
        console.log(`Cache set for admin services: ${cacheKey}`);
      }
    }

    // Format response
    const formattedServices = services.map(service => ({
      ...service,
      priceFormatted: `${service.currency || 'USD'} ${service.price}`,
      deliveryFormatted: `${service.deliveryTime} ${service.deliveryTimeUnit || 'days'}`,
      statusBadge: {
        text: service.status ? service.status.charAt(0).toUpperCase() + service.status.slice(1) : 'Unknown',
        color: service.status === 'active' ? 'success' : 
               service.status === 'draft' ? 'warning' : 
               service.status === 'pending' ? 'info' : 
               service.status === 'paused' ? 'secondary' : 
               service.status === 'suspended' ? 'danger' : 'secondary'
      },
      createdBy: service.createdBy ? {
        _id: service.createdBy._id,
        name: service.createdBy.name,
        email: service.createdBy.email,
        picture: service.createdBy.picture,
        role: service.createdBy.role
      } : null,
      category: service.category ? {
        _id: service.category._id,
        name: service.category.name,
        slug: service.category.slug,
        icon: service.category.icon
      } : null
    }));

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: formattedServices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      stats: stats[0] || {
        total: 0,
        active: 0,
        draft: 0,
        pending: 0,
        paused: 0,
        suspended: 0,
        featured: 0,
        avgPrice: 0,
      },
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && pageNum === 1 && services !== undefined
    });

  } catch (error) {
    console.error('[GET ADMIN SERVICES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      code: 'SERVICES_FETCH_ERROR',
      requestId,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Popular Services
const getPopularServices = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { 
      limit = 12, 
      category, 
      random = 'false',
      maxPrice,
      cache: useCacheParam = 'true',
      includeSubcategory = true
    } = req.query;

    const useCache = useCacheParam === 'true';
    
    // Parse limit with maximum constraint
    const queryLimit = Math.min(parseInt(limit) || 12, 50);
    
    // Build filter for popular services
    const filter = {
      status: 'active',
      isActive: true,
      isPopular: true,
    };

    // Optional category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    // Optional price filter
    if (maxPrice) {
      filter.price = { $lte: parseFloat(maxPrice) };
    }

    // Generate cache key
    const cacheKey = generateCacheKey('popular_services', {
      filter,
      random,
      queryLimit,
      includeSubcategory
    });

    let services = [];
    let categoryStats = [];

    // Try to get from cache
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        categoryStats = cached.categoryStats;
        console.log(`Cache hit for popular services: ${cacheKey}`);
      }
    }

    if (!services.length) {
      // Build populate options
      const populateOptions = [
        {
          path: 'category',
          select: 'name slug icon',
          match: { isActive: true }
        },
        {
          path: 'createdBy',
          select: 'name picture',
          match: { isActive: true }
        }
      ];

      if (includeSubcategory === 'true' || includeSubcategory === true) {
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon',
          match: { isActive: true }
        });
      }

      if (random === 'true') {
        // Use aggregation for random sampling
        services = await Service.aggregate([
          { $match: filter },
          { $sample: { size: queryLimit } }
        ]);

        // Manually populate references
        const serviceIds = services.map(s => s._id);
        const populatedServices = await Service.find({ _id: { $in: serviceIds } })
          .populate(populateOptions)
          .lean();
        
        // Merge results
        services = services.map(s => {
          const populated = populatedServices.find(ps => ps._id.toString() === s._id.toString());
          return populated || s;
        });
      } else {
        // Normal query with populate
        const sortOptions = { 
          createdAt: -1 
        };
        
        services = await Service.find(filter)
          .select('title slug shortDescription description price currency  deliveryTime deliveryTimeUnit revisions   thumbnail images')
          .populate(populateOptions)
          .sort(sortOptions)
          .limit(queryLimit)
          .lean();
      }

      // Get category statistics if no specific category filter
      if (!category) {
        categoryStats = await Service.aggregate([
          { $match: { ...filter } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            }
          },
          { $sort: { count: -1 } },
          { $limit: 6 }
        ]);

        // Populate category names
        if (categoryStats.length > 0) {
          const categoryIds = categoryStats.map(stat => stat._id);
          const categories = await Category.find({ _id: { $in: categoryIds } })
            .select('name slug icon')
            .lean();

          categoryStats = categoryStats.map(stat => {
            const categoryInfo = categories.find(cat => cat._id.toString() === stat._id.toString());
            return {
              ...stat,
              name: categoryInfo?.name,
              slug: categoryInfo?.slug,
              icon: categoryInfo?.icon
            };
          });
        }
      }

      // Cache the result
      if (useCache) {
        await cache.set(cacheKey, { services, categoryStats }, 300);
        console.log(`Cache set for popular services: ${cacheKey}`);
      }
    }

    // Format response
    const formattedServices = services.map(service => ({
      _id: service._id,
      title: service.title,
      slug: service.slug,
      shortDescription: service.shortDescription || 
        (service.description ? service.description.substring(0, 120) + '...' : ''),
      price: service.price,
      currency: service.currency || 'USD',
      deliveryTime: service.deliveryTime,
      deliveryTimeUnit: service.deliveryTimeUnit,
      revisions: service.revisions || 0,
      thumbnail: service.thumbnail,
      firstImage: service.images && service.images.length > 0 ? service.images[0] : null,
      createdBy: {
        _id: service.createdBy?._id,
        name: service.createdBy?.name,
        picture: service.createdBy?.picture
      },
      category: service.category ? {
        _id: service.category._id,
        name: service.category.name,
        slug: service.category.slug,
        icon: service.category.icon
      } : null,
      subcategory: service.subcategory ? {
        _id: service.subcategory._id,
        name: service.subcategory.name,
        slug: service.subcategory.slug,
        icon: service.subcategory.icon
      } : null
    }));

    res.json({
      success: true,
      services: formattedServices,
      count: formattedServices.length,
      categoryStats,
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && services !== undefined
    });

  } catch (error) {
    console.error('[POPULAR SERVICES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular services',
      code: 'POPULAR_SERVICES_ERROR',
      requestId
    });
  }
};

// Toggle Service Popular Status (Admin only)
const togglePopularStatus = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    const { isPopular } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    if (isPopular === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isPopular field is required',
        code: 'MISSING_FIELD',
        requestId
      });
    }

    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    // Update popular status
    service.isPopular = isPopular;
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    
    await service.save();

    // Invalidate cache for this service and popular services cache
    await invalidateServiceCache(id);
    await cache.del('popular_services:*');

    // Log audit
    logAudit('TOGGLE_POPULAR', 'SERVICE', id, req.user._id, {
      isPopular,
      serviceTitle: service.title,
      serviceCategory: service.category
    });

    res.json({
      success: true,
      message: `Service ${isPopular ? 'marked as popular' : 'removed from popular'}`,
      service: {
        _id: service._id,
        title: service.title,
        isPopular: service.isPopular,
        updatedAt: service.updatedAt
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TOGGLE POPULAR ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service popular status',
      code: 'UPDATE_POPULAR_ERROR',
      requestId
    });
  }
};

const getPopularServicesByCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { 
      limit = 12, 
      cache: useCacheParam = 'true',
      random = 'false',
      includeSubcategory = true
    } = req.query;

    const queryLimit = Math.min(parseInt(limit) || 12, 50);
    const useCache = useCacheParam === 'true';
    
    // Generate cache key
    const cacheKey = generateCacheKey('popular_services_by_category', {
      limit: queryLimit,
      random,
      includeSubcategory
    });

    // Try to get from cache
    let result;
    if (useCache) {
      result = await cache.get(cacheKey);
      if (result) {
        console.log(`Cache hit for popular services by category: ${cacheKey}`);
        return res.json({
          success: true,
          data: result.data || result,
          count: result.count || (Array.isArray(result) ? result.length : 0),
          requestId,
          timestamp: new Date().toISOString(),
          cached: true
        });
      }
    }

    // Filter for popular services
    const filter = {
      isPopular: true,
      status: 'active',
      isActive: true
    };

    console.log(`Fetching popular services with filter:`, filter);
    
    let services = [];
    let totalCount = 0;

    // Get total count first
    totalCount = await Service.countDocuments(filter);
    console.log(`Found ${totalCount} popular services in database`);

    // Build populate options
    const populateOptions = [
      {
        path: 'category',
        select: 'name slug icon',
        match: { isActive: true }
      },
      {
        path: 'createdBy',
        select: 'name picture',
        match: { isActive: true }
      }
    ];

    if (includeSubcategory === 'true' || includeSubcategory === true) {
      populateOptions.push({
        path: 'subcategory',
        select: 'name slug icon',
        match: { isActive: true }
      });
    }

    if (random === 'true') {
      // Use aggregation for random sampling
      services = await Service.aggregate([
        { $match: filter },
        { $sample: { size: queryLimit } }
      ]);

      // Manually populate references
      const serviceIds = services.map(s => s._id);
      const populatedServices = await Service.find({ _id: { $in: serviceIds } })
        .populate(populateOptions)
        .lean();
      
      // Merge results
      services = services.map(s => {
        const populated = populatedServices.find(ps => ps._id.toString() === s._id.toString());
        return populated || s;
      });
    } else {
      // Normal query with sort
      services = await Service.find(filter)
        .select('title slug shortDescription description price currency deliveryTime deliveryTimeUnit revisions thumbnail images tags features isPopular isFeatured category subcategory createdBy')
        .populate(populateOptions)
        .sort({ 
          createdAt: -1,
        })
        .limit(queryLimit)
        .lean();
    }

    console.log(`Retrieved ${services.length} popular services from database`);

    // If no popular services found, return empty array
    if (services.length === 0) {
      console.log('No popular services found, returning empty array');
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No popular services found',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Format the services for response
    const formattedServices = services.map(service => {
      // Get category name
      let categoryName = 'Creative Services';
      let categoryIcon = null;
      if (service.category && service.category.name) {
        categoryName = service.category.name;
        categoryIcon = service.category.icon;
      }

      // Get subcategory name
      let subcategoryName = null;
      let subcategoryIcon = null;
      if (service.subcategory && service.subcategory.name) {
        subcategoryName = service.subcategory.name;
        subcategoryIcon = service.subcategory.icon;
      }

      // Get image URL
      let imageUrl = null;
      if (service.thumbnail && service.thumbnail.url) {
        imageUrl = service.thumbnail.url;
      } else if (service.images && service.images.length > 0) {
        const firstImage = service.images[0];
        imageUrl = typeof firstImage === 'object' ? firstImage.url : firstImage;
      }

      return {
        _id: service._id,
        id: service._id.toString(),
        title: service.title,
        name: service.title,
        slug: service.slug,
        shortDescription: service.shortDescription || 
          (service.description ? service.description.substring(0, 120) + '...' : 'Professional service'),
        description: service.description,
        price: service.price,
        currency: service.currency || 'USD',
        deliveryTime: service.deliveryTime,
        deliveryTimeUnit: service.deliveryTimeUnit || 'days',
        revisions: service.revisions || 0,
        tags: service.tags || [],
        features: service.features || [],
        thumbnail: service.thumbnail,
        images: service.images || [],
        imageUrl: imageUrl,
        category: categoryName,
        categoryId: service.category?._id || service.category,
        categoryIcon: categoryIcon,
        subcategory: subcategoryName,
        subcategoryId: service.subcategory?._id || service.subcategory,
        subcategoryIcon: subcategoryIcon,
        searchQuery: service.title ? service.title.toLowerCase().replace(/\s+/g, '-') : '',
        createdBy: {
          _id: service.createdBy?._id || service.createdBy,
          name: service.createdBy?.name || 'Unknown',
          picture: service.createdBy?.picture || null
        },
        isPopular: service.isPopular || false,
        isFeatured: service.isFeatured || false,
        status: service.status || 'active',
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
      };
    });

    // Cache the result
    if (useCache) {
      await cache.set(cacheKey, {
        data: formattedServices,
        count: formattedServices.length,
        total: totalCount
      }, 600);
      console.log(`Cache set for popular services by category: ${cacheKey}`);
    }

    res.json({
      success: true,
      data: formattedServices,
      count: formattedServices.length,
      total: totalCount,
      requestId,
      timestamp: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('[POPULAR BY CATEGORY ERROR]', error);
    
    // Return empty array on error
    res.json({
      success: false,
      data: [],
      count: 0,
      message: 'Error fetching popular services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  createService,
  getServices,
  getMyServices,
  getServiceById,
  getAdminServices,
  updateService,
  deleteService,
  restoreService,
  getServiceStats,
  bulkUpdateServices,
  exportServices,
  searchServices,
  uploadImages,
  removeImage,
  setThumbnail,
  uploadThumbnail,
  getPopularServices,
  togglePopularStatus,
  getPopularServicesByCategory,
};