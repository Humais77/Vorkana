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
    await cache.del(`service:*${serviceId}*`);
    await cache.del('services:*');
    await cache.del('service_stats:*');
    await cache.del('service_popular:*');
    await cache.del('service_similar:*');
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
    minRating,
    maxRating,
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

  // Security: Visibility based on user role
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

  // Search with sanitization
  if (search) {
  const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} }).trim();
  if (sanitizedSearch.length >= 2) {
    filter.$text = { $search: sanitizedSearch };
  }
}

  if (title) filter.title = { $regex: `^${sanitizeHtml(title, { allowedTags: [] })}`, $options: 'i' };
  if (slug) filter.slug = sanitizeHtml(slug, { allowedTags: [] });
  
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

  // Rating range
  if (minRating || maxRating) {
    filter.rating = {};
    if (minRating) filter.rating.$gte = parseFloat(minRating);
    if (maxRating) filter.rating.$lte = parseFloat(maxRating);
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
      service: safeService,
      message: 'Service created successfully',
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
      minRating,
      maxRating,
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
      search: search || q,
      title,
      slug,
      category,
      subcategory,
      createdBy,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
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

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;

    // Sort configuration
    const allowedSortFields = ['price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'views', 'likes', 'relevance'];
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
        rating: 1,
        reviewsCount: 1,
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
        views: 1,
        likes: 1
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
        services = cached.services;
        total = cached.total;
        console.log(`Cache hit for services: ${cacheKey}`);
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

// Fix the getServiceById function
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
      includeSubcategory = true
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

    // OPTIMIZATION: Generate cache key early
    const cacheKey = generateCacheKey('service_single', {
      id,
      isObjectId,
      fields,
      populate: populate === 'true',
      includeSubcategory,
      userRole: req.user?.role
    });

    let service;
    
    // Try cache first (if enabled and not admin)
    if (useCache && req.user?.role !== 'admin') {
      service = await cache.get(cacheKey);
      if (service) {
        console.log(`[PERF] Cache HIT for service: ${cacheKey} (${Date.now() - startTime}ms)`);
        
        // Handle view increment in background (non-blocking)
        if (incrementView === 'true' && service.status === 'active') {
          incrementViewCountAsync(service._id).catch(console.error);
        }
        
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

    // Select fields
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
    }

    // Build populate options
    let populateOptions = [];
    if (populate === 'true' || populate === true) {
      populateOptions = [
        {
          path: 'category',
          select: 'name slug icon',
          match: { isActive: true }
        },
        {
          path: 'createdBy',
          select: 'name email picture role createdAt'
        }
      ];
      
      // FIXED: Add subcategory population if requested
      if (includeSubcategory === 'true' || includeSubcategory === true) {
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon',
          match: { isActive: true }
        });
      }
    }

    // Execute query
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

    // Async view increment (non-blocking)
    if (incrementView === 'true' && service.status === 'active') {
      incrementViewCountAsync(service._id).catch(console.error);
    }

    // Process service data
    const processedService = processServiceData(service);
    
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
      rating: 1,
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
      rating: 1,
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

// Async view increment (non-blocking)
const incrementViewCountAsync = async (serviceId) => {
  try {
    await Service.updateOne(
      { _id: serviceId },
      { $inc: { views: 1 } }
    ).maxTimeMS(1000); // Quick update
  } catch (error) {
    console.error('Failed to increment view count:', error.message);
  }
};
const updateService = async (req, res, next) => {
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
      logAudit('UNAUTHORIZED_UPDATE', 'SERVICE', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Handle FormData parsing
    let bodyData = req.body;
    let newThumbnail = null;
    let newImages = [];
    
    console.log('Request headers:', req.headers['content-type']);
    console.log('Request has files:', !!req.files);
    console.log('Request files:', req.files);

    // Handle file uploads from multer - FIXED: Check FormData structure
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data');
      
      // Check if body contains JSON data
      if (req.body.data && typeof req.body.data === 'string') {
        try {
          bodyData = JSON.parse(req.body.data);
          console.log('Parsed JSON data from FormData');
        } catch (parseError) {
          console.error('Error parsing JSON from FormData:', parseError);
          // If parsing fails, use the body as-is
        }
      }
      
      // Handle thumbnail upload - FIXED: Proper file access
      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        console.log('Processing thumbnail upload');
        const thumbnailFile = req.files.thumbnail[0];
        console.log('Thumbnail file details:', {
          originalname: thumbnailFile.originalname,
          mimetype: thumbnailFile.mimetype,
          size: thumbnailFile.size
        });
        
        const thumbnailUpload = await processUploadToCloudinary([thumbnailFile], 'thumbnails');
        
        if (thumbnailUpload.length > 0) {
          newThumbnail = {
            url: thumbnailUpload[0].url,
            public_id: thumbnailUpload[0].public_id,
            width: thumbnailUpload[0].width,
            height: thumbnailUpload[0].height,
            size: thumbnailUpload[0].size,
            format: thumbnailUpload[0].format,
            uploadedAt: new Date()
          };
          
          console.log('New thumbnail uploaded successfully:', newThumbnail.url);
        }
      }
      
      // Handle images upload - FIXED: Proper file access
      if (req.files && req.files.images && Array.isArray(req.files.images)) {
        console.log(`Processing ${req.files.images.length} image uploads`);
        const imageUploads = await processUploadToCloudinary(req.files.images, 'services');
        
        newImages = imageUploads.map(img => ({
          url: img.url,
          public_id: img.public_id,
          width: img.width,
          height: img.height,
          size: img.size,
          format: img.format,
          uploadedAt: new Date()
        }));
        
        console.log(`${newImages.length} new images uploaded successfully`);
      }
    }

    // Sanitize input
    const sanitizedData = sanitizeServiceInput(bodyData);
    
    // Remove admin-only fields if not admin
    if (!isAdmin) {
      delete sanitizedData.status;
      delete sanitizedData.isFeatured;
      delete sanitizedData.isRecommended;
      delete sanitizedData.isPopular;
      delete sanitizedData.views;
      delete sanitizedData.likes;
      delete sanitizedData.rating;
      delete sanitizedData.reviewsCount;
    }

    // FIXED: Handle thumbnail from new upload first, then from JSON
    if (newThumbnail) {
      console.log('Using newly uploaded thumbnail');
      // Delete old thumbnail from Cloudinary if exists
      if (service.thumbnail && service.thumbnail.public_id) {
        try {
          await deleteCloudinaryImages([{ public_id: service.thumbnail.public_id }]);
          console.log('Old thumbnail deleted from Cloudinary');
        } catch (error) {
          console.error('Error deleting old thumbnail:', error);
        }
      }
      sanitizedData.thumbnail = newThumbnail;
    } else if (sanitizedData.thumbnail) {
      // Handle thumbnail from JSON data
      console.log('Processing thumbnail from JSON data');
      if (typeof sanitizedData.thumbnail === 'string') {
        // Convert string URL to thumbnail object
        sanitizedData.thumbnail = {
          url: sanitizedData.thumbnail.trim(),
          public_id: service.thumbnail?.public_id || `thumbnail-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          uploadedAt: new Date()
        };
      }
      // If it's already an object, keep it as is
      console.log('Thumbnail from JSON:', sanitizedData.thumbnail?.url?.substring(0, 50) || 'none');
    } else {
      // Preserve existing thumbnail if no new one provided
      sanitizedData.thumbnail = service.thumbnail;
      console.log('Preserving existing thumbnail');
    }

    // FIXED: Handle images from new upload first, then from JSON
    if (newImages.length > 0) {
      console.log('Processing newly uploaded images');
      const existingImages = service.images || [];
      const updatedImages = [...existingImages, ...newImages];
      
      if (updatedImages.length > 10) {
        // Delete newly uploaded images from Cloudinary
        await deleteCloudinaryImages(newImages.map(img => ({ public_id: img.public_id })));
        return res.status(400).json({
          success: false,
          message: 'Cannot have more than 10 images',
          code: 'MAX_IMAGES_EXCEEDED',
          requestId
        });
      }
      
      sanitizedData.images = updatedImages;
      console.log(`Added ${newImages.length} new images, total: ${updatedImages.length}`);
    } else if (sanitizedData.images && Array.isArray(sanitizedData.images)) {
      // Handle images from JSON data
      console.log('Processing images from JSON data');
      sanitizedData.images = sanitizedData.images.map((img, index) => {
        if (typeof img === 'string') {
          // Convert string URL to image object
          return {
            url: img.trim(),
            public_id: service.images?.[index]?.public_id || `image-${Date.now()}-${index}`,
            uploadedAt: new Date()
          };
        }
        // If it's already an object, keep it
        return img;
      });
      console.log(`Processed ${sanitizedData.images.length} images from JSON`);
    } else {
      // Preserve existing images if no new ones provided
      sanitizedData.images = service.images || [];
      console.log('Preserving existing images');
    }


    // Handle subcategory validation
    if (sanitizedData.subcategory === '' || sanitizedData.subcategory === null || sanitizedData.subcategory === undefined) {
  // If subcategory is empty but was previously set, keep the existing one
  if (service.subcategory) {
    sanitizedData.subcategory = service.subcategory;
    console.log('Using existing subcategory:', service.subcategory);
  } else {
    // If no existing subcategory, set to null
    sanitizedData.subcategory = null;
  }
}
if (!sanitizedData.shortDescription || sanitizedData.shortDescription.trim() === '') {
  // Generate short description from description if not provided
  if (sanitizedData.description) {
    sanitizedData.shortDescription = sanitizedData.description.substring(0, 150) + '...';
  } else if (service.description) {
    sanitizedData.shortDescription = service.description.substring(0, 150) + '...';
  } else {
    return res.status(400).json({
      success: false,
      message: 'Short description is required',
      code: 'SHORT_DESCRIPTION_REQUIRED',
      requestId
    });
  }
}

    // Handle category change
    if (sanitizedData.category && sanitizedData.category !== service.category.toString()) {
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
      
      if (sanitizedData.subcategory && sanitizedData.subcategory !== service.subcategory?.toString()) {
        const subcategory = await Subcategory.findOne({ 
          _id: sanitizedData.subcategory,
          category: sanitizedData.category,
          isActive: true
        });
        
        if (!subcategory) {
          return res.status(400).json({
            success: false,
            message: 'Subcategory does not belong to the new category',
            code: 'SUBCATEGORY_MISMATCH',
            requestId
          });
        }
      }
    }

    // Prepare update data
    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    console.log('Update data includes:', {
      hasThumbnail: !!updateData.thumbnail,
      thumbnailUrl: updateData.thumbnail?.url?.substring(0, 50) || 'none',
      imagesCount: updateData.images?.length || 0,
      totalKeys: Object.keys(updateData).length
    });

    if (sanitizedData.status && sanitizedData.status !== service.status) {
      if (sanitizedData.status === 'active' && !service.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const currentVersion = sanitizedData.version !== undefined ? sanitizedData.version : service.version;
    delete updateData.version;

    const queryConditions = { _id: id };
    if (bodyData.version !== undefined || sanitizedData.version !== undefined) {
      queryConditions.version = currentVersion;
    }

    console.log('Executing update with data keys:', Object.keys(updateData));
    
    const updatedService = await Service.findOneAndUpdate(
      queryConditions,
      updateData,
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('category', 'name slug').populate('subcategory', 'name slug').populate('createdBy', 'name picture');

    if (!updatedService) {
      // Check for version conflict
      const currentDoc = await Service.findById(id);
      if (currentDoc && (bodyData.version !== undefined || sanitizedData.version !== undefined)) {
        return res.status(409).json({
          success: false,
          message: 'Service was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          currentVersion: currentDoc.version,
          serviceTitle: currentDoc.title,
          updatedAt: currentDoc.updatedAt,
          requestId,
          suggestion: 'Refresh the page to get the latest version before making changes'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Service not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Invalidate cache
    await invalidateServiceCache(id);

    logAudit('UPDATE', 'SERVICE', updatedService._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion,
      newVersion: updatedService.version,
      statusChanged: sanitizedData.status ? sanitizedData.status !== service.status : false,
      imagesUpdated: newImages.length > 0,
      thumbnailUpdated: !!newThumbnail,
      versionChecked: (bodyData.version !== undefined || sanitizedData.version !== undefined),
      hasThumbnail: !!updatedService.thumbnail,
      hasImages: updatedService.images?.length > 0
    });

    const safeService = updatedService.toObject();
    delete safeService.__v;
    delete safeService.lastUpdatedBy;

    res.json({
      success: true,
      service: safeService,
      message: 'Service updated successfully',
      newVersion: updatedService.version,
      thumbnailUpdated: !!newThumbnail,
      imagesUpdated: newImages.length > 0,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update service error:', error);
    
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
    
    logAudit('ERROR', 'SERVICE', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
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

// Get Service Statistics
const getServiceStats = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for statistics',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const cacheKey = 'service_stats:admin';

    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for service stats: ${cacheKey}`);
      return res.json({
        success: true,
        stats: cached,
        requestId,
        timestamp: new Date().toISOString(),
        generatedAt: new Date(),
        cached: true
      });
    }

    const filter = {};

    const stats = await Service.aggregate([
      { $match: filter },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalServices: { $sum: 1 },
                activeServices: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $eq: ['$isActive', true] }] }, 1, 0] } },
                draftServices: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                pendingServices: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                pausedServices: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
                featuredServices: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
                recommendedServices: { $sum: { $cond: [{ $eq: ['$isRecommended', true] }, 1, 0] } },
                popularServices: { $sum: { $cond: [{ $eq: ['$isPopular', true] }, 1, 0] } },
                totalViews: { $sum: '$views' },
                totalLikes: { $sum: '$likes' },
                avgPrice: { $avg: '$price' },
                avgRating: { $avg: '$rating' },
                avgDeliveryTime: { $avg: '$deliveryTime' }
              }
            }
          ],
          byCategory: [
            { $match: { status: 'active', isActive: true } },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgRating: { $avg: '$rating' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgPrice: { $avg: '$price' }
              }
            },
            { $sort: { count: -1 } }
          ],
          topServices: [
            { $match: { status: 'active', isActive: true } },
            { $limit: 10 },
            {
              $project: {
                title: 1,
                rating: 1,
                price: 1,
                slug: 1
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
          priceDistribution: [
            {
              $bucket: {
                groupBy: "$price",
                boundaries: [0, 50, 100, 200, 500, 1000, 5000, 10000],
                default: "10000+",
                output: {
                  count: { $sum: 1 },
                  avgRating: { $avg: "$rating" },
                }
              }
            }
          ]
        }
      }
    ]);

    const sanitizedStats = stats[0];
    
    // Cache stats for 10 minutes
    await cache.set(cacheKey, sanitizedStats, 600);
    
    res.json({
      success: true,
      stats: sanitizedStats,
      requestId,
      timestamp: new Date().toISOString(),
      generatedAt: new Date(),
      cached: false
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'STATS', req.user?._id, { error: error.message });
    next(error);
  }
};

// Bulk Operations
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

    const { ids, operation, data } = req.body;

    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 50 items in bulk',
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
        requestId
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

    result = await Service.updateMany(
      { _id: { $in: validIds } },
      updateData,
      { 
        maxTimeMS: 10000,
        runValidators: operation === 'update'
      }
    );

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
    next(error);
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
        'Rating', 'Reviews Count',  'Views', 'Likes',
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
        service.rating || 0,
        service.reviewsCount || 0,
        service.views || 0,
        service.likes || 0,
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
        rating: { rating: -1 },
        delivery: { deliveryTime: 1 },
        newest: { createdAt: -1 },
        orders: { ordersCount: -1 }
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
        .select('title slug shortDescription description price rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images createdBy category tags')
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
          rating: result.rating || 0,
          reviewsCount: result.reviewsCount || 0,
          deliveryTime: result.deliveryTime,
          deliveryTimeUnit: result.deliveryTimeUnit,
          revisions: result.revisions || 0,
          views: result.views || 0,
          likes: result.likes || 0,
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

// Like/Unlike Service
const toggleLike = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { action = 'toggle' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const service = await Service.findOne({ 
      _id: id, 
      status: 'active',
      isActive: true 
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const userLike = await mongoose.model('UserLike').findOne({
      user: req.user._id,
      service: id
    });

    let result;
    let message;

    if (action === 'like' || (action === 'toggle' && !userLike)) {
      if (!userLike) {
        await mongoose.model('UserLike').create({
          user: req.user._id,
          service: id
        });
        
        await Service.incrementLikes(id);
        message = 'Service liked';
        
        // Invalidate cache for this service
        await invalidateServiceCache(id);
        
        logAudit('LIKE', 'SERVICE', id, req.user._id);
      } else {
        message = 'Service already liked';
      }
    } else if (action === 'unlike' || (action === 'toggle' && userLike)) {
      if (userLike) {
        await mongoose.model('UserLike').deleteOne({
          user: req.user._id,
          service: id
        });
        
        await Service.decrementLikes(id);
        message = 'Service unliked';
        
        // Invalidate cache for this service
        await invalidateServiceCache(id);
        
        logAudit('UNLIKE', 'SERVICE', id, req.user._id);
      } else {
        message = 'Service not liked yet';
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action',
        code: 'INVALID_ACTION',
        requestId
      });
    }

    const updatedService = await Service.findById(id)
      .select('likes title slug')
      .lean();

    res.json({
      success: true,
      message,
      likes: updatedService.likes,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'TOGGLE_LIKE', req.user._id, { 
      id, 
      action: req.body.action,
      error: error.message 
    });
    next(error);
  }
};

// Get Similar Services
const getSimilarServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { limit = 8, cache: useCacheParam = 'true' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const useCache = useCacheParam === 'true';
    const similarLimit = Math.min(parseInt(limit) || 8, 20);

    // Generate cache key
    const cacheKey = generateCacheKey('service_similar', {
      serviceId: id,
      limit: similarLimit
    });

    // Try to get from cache
    let safeServices;
    if (useCache) {
      safeServices = await cache.get(cacheKey);
      if (safeServices) {
        console.log(`Cache hit for similar services: ${cacheKey}`);
        return res.json({
          success: true,
          services: safeServices,
          count: safeServices.length,
          requestId,
          timestamp: new Date().toISOString(),
          cached: true
        });
      }
    }

    const service = await Service.findById(id)
      .select('category tags title createdBy')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const similarServices = await Service.find({
      _id: { $ne: id },
      category: service.category,
      status: 'active',
      isActive: true,
      ...(service.tags && service.tags.length > 0 ? {
        tags: { $in: service.tags.slice(0, 3) }
      } : {})
    })
    .select('title slug description price rating deliveryTime deliveryTimeUnit revisions  views thumbnail createdBy')
    .populate('createdBy', 'name picture')
    .sort({ rating: -1 })
    .limit(similarLimit)
    .lean();

    if (similarServices.length < similarLimit) {
      const additionalServices = await Service.find({
        _id: { $nin: [id, ...similarServices.map(s => s._id)] },
        category: service.category,
        status: 'active',
        isActive: true
      })
      .select('title slug description price rating deliveryTime deliveryTimeUnit revisions  views thumbnail createdBy')
      .populate('createdBy', 'name picture')
      .sort({ rating: -1,})
      .limit(similarLimit - similarServices.length)
      .lean();

      similarServices.push(...additionalServices);
    }

    safeServices = similarServices.map(s => ({
      _id: s._id,
      title: s.title,
      slug: s.slug,
      description: s.description ? s.description.substring(0, 100) + '...' : '',
      price: s.price,
      rating: s.rating || 0,
      deliveryTime: s.deliveryTime,
      deliveryTimeUnit: s.deliveryTimeUnit,
      revisions: s.revisions || 0,
      views: s.views || 0,
      thumbnail: s.thumbnail,
      createdBy: {
        _id: s.createdBy?._id,
        name: s.createdBy?.name,
        picture: s.createdBy?.picture
      }
    }));

    // Cache similar services for 10 minutes
    if (useCache) {
      await cache.set(cacheKey, safeServices, 600);
      console.log(`Cache set for similar services: ${cacheKey}`);
    }

    res.json({
      success: true,
      services: safeServices,
      count: safeServices.length,
      requestId,
      timestamp: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'SIMILAR', req.user?._id, { 
      id, 
      error: error.message 
    });
    next(error);
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
      const allowedSortFields = ['title', 'price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes', 'publishedAt'];
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
const getAllActiveServices = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc',
      search = '',
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      category,
      subcategory,
      includeSubcategory = true,
      cache: useCacheParam = 'true'
    } = req.query;

    const useCache = useCacheParam === 'true';

    // Simple filter for active services only
    const filter = {
      status: 'active',
      isActive: true
    };

    // Apply search if provided
    if (search && search.trim().length >= 2) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$text = { $search: sanitizedSearch };
    }

    // Category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    // Subcategory filter
    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Rating range
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = parseFloat(minRating);
      if (maxRating) filter.rating.$lte = parseFloat(maxRating);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {
      createdAt: order === 'asc' ? 1 : -1,
      rating: order === 'asc' ? 1 : -1,
      views: order === 'asc' ? 1 : -1,
      likes: order === 'asc' ? 1 : -1,
      price: order === 'asc' ? 1 : -1
    };

    const sortObj = sortOptions[sort] || sortOptions.createdAt;

    // Generate cache key
    const cacheKey = generateCacheKey('all_active_services', {
      filter,
      page: pageNum,
      limit: limitNum,
      sort: sortObj,
      includeSubcategory
    });

    let services, total;

    // Try to get from cache
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        total = cached.total;
        console.log(`Cache hit for all active services: ${cacheKey}`);
      }
    }

    if (!services || !total) {
      // Build populate options
      const populateOptions = [
        {
          path: 'category',
          select: 'name slug icon',
          match: { isActive: true }
        },
        {
          path: 'createdBy',
          select: 'name picture'
        }
      ];

      if (includeSubcategory === 'true' || includeSubcategory === true) {
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon',
          match: { isActive: true }
        });
      }

      [services, total] = await Promise.all([
        Service.find(filter)
          .select('title slug shortDescription description price currency rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images category subcategory createdBy tags status')
          .populate(populateOptions)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Service.countDocuments(filter)
      ]);

      // Cache the result if enabled
      if (useCache) {
        await cache.set(cacheKey, { services, total }, 300); // 5 minutes
        console.log(`Cache set for all active services: ${cacheKey}`);
      }
    }

    const totalPages = Math.ceil(total / limitNum);

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: services.map(service => {
        // Ensure category and subcategory are properly formatted
        const formattedService = {
          ...service,
          hasImages: service.images && service.images.length > 0,
          priceFormatted: `${service.currency || 'USD'} ${service.price || '0.00'}`,
          category: service.category ? {
            _id: service.category._id,
            name: service.category.name || 'Uncategorized',
            slug: service.category.slug,
            icon: service.category.icon
          } : null,
          subcategory: service.subcategory ? {
            _id: service.subcategory._id,
            name: service.subcategory.name,
            slug: service.subcategory.slug,
            icon: service.subcategory.icon
          } : null,
          createdBy: service.createdBy ? {
            _id: service.createdBy._id,
            name: service.createdBy.name,
            picture: service.createdBy.picture
          } : null
        };
        
        return formattedService;
      }),
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
      responseTime: `${responseTime}ms`,
      cached: useCache && services !== undefined
    });

  } catch (error) {
    console.error('Get all active services error:', error);
    const responseTime = Date.now() - startTime;
    
    // Return empty array on error
    res.json({
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
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      message: 'Error fetching services'
    });
  }
};
// Add this function to service.controller.js
const getServicesWithCategoryStats = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { 
      limit = 100,
      category,
      subcategory,
      cache: useCacheParam = 'true'
    } = req.query;

    const useCache = useCacheParam === 'true';
    const queryLimit = Math.min(parseInt(limit) || 100, 500);

    // Generate cache key
    const cacheKey = generateCacheKey('services_with_stats', {
      limit: queryLimit,
      category,
      subcategory
    });

    let result;

    // Try to get from cache
    if (useCache) {
      result = await cache.get(cacheKey);
      if (result) {
        console.log(`Cache hit for services with stats: ${cacheKey}`);
        return res.json({
          success: true,
          ...result,
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`,
          cached: true
        });
      }
    }

    // Build filter
    const filter = {
      status: 'active',
      isActive: true
    };

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    }

    // Get services with category and subcategory
    const services = await Service.find(filter)
      .select('title slug price rating thumbnail category subcategory')
      .populate('category', 'name slug icon')
      .populate('subcategory', 'name slug icon')
      .limit(queryLimit)
      .lean();

    // Get all categories with counts
    const categoryStats = await Service.aggregate([
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
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get all subcategories with counts
    const subcategoryStats = await Service.aggregate([
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
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get category details
    const categoryIds = [...new Set([
      ...categoryStats.map(stat => stat._id),
      ...services.map(s => s.category).filter(Boolean)
    ])];

    const categories = await Category.find({ 
      _id: { $in: categoryIds },
      isActive: true 
    })
    .select('name slug icon description')
    .lean();

    // Get subcategory details
    const subcategoryIds = [...new Set([
      ...subcategoryStats.map(stat => stat._id),
      ...services.map(s => s.subcategory).filter(Boolean)
    ])];

    const subcategories = await Subcategory.find({ 
      _id: { $in: subcategoryIds },
      isActive: true 
    })
    .select('name slug icon description category')
    .populate('category', 'name slug')
    .lean();

    // Format category stats
    const formattedCategoryStats = categoryStats.map(stat => {
      const category = categories.find(c => c._id.toString() === stat._id.toString());
      return {
        _id: stat._id,
        name: category?.name || 'Unknown',
        slug: category?.slug || '',
        icon: category?.icon || '',
        description: category?.description || '',
        count: stat.count,
        avgPrice: stat.avgPrice || 0,
        avgRating: stat.avgRating || 0
      };
    });

    // Format subcategory stats
    const formattedSubcategoryStats = subcategoryStats.map(stat => {
      const subcategory = subcategories.find(s => s._id.toString() === stat._id.toString());
      return {
        _id: stat._id,
        name: subcategory?.name || 'Unknown',
        slug: subcategory?.slug || '',
        icon: subcategory?.icon || '',
        description: subcategory?.description || '',
        category: subcategory?.category ? {
          _id: subcategory.category._id,
          name: subcategory.category.name,
          slug: subcategory.category.slug
        } : null,
        count: stat.count,
        avgPrice: stat.avgPrice || 0,
        avgRating: stat.avgRating || 0
      };
    });

    // Format services
    const formattedServices = services.map(service => ({
      _id: service._id,
      title: service.title,
      slug: service.slug,
      price: service.price,
      rating: service.rating,
      thumbnail: service.thumbnail,
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

    result = {
      services: formattedServices,
      categories: formattedCategoryStats,
      subcategories: formattedSubcategoryStats,
      totals: {
        services: formattedServices.length,
        categories: formattedCategoryStats.length,
        subcategories: formattedSubcategoryStats.length
      }
    };

    // Cache the result
    if (useCache) {
      await cache.set(cacheKey, result, 600); // 10 minutes
      console.log(`Cache set for services with stats: ${cacheKey}`);
    }

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      ...result,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      cached: false
    });

  } catch (error) {
    console.error('[SERVICES WITH STATS ERROR]', error);
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services with statistics',
      code: 'SERVICES_STATS_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
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
      rating,
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

    // Rating range
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
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
      const allowedSortFields = ['title', 'price', 'rating', 'createdAt', 'updatedAt', 'ordersCount', 'views'];
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
            avgRating: { $avg: '$rating' }
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
        avgRating: 0
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
      minRating = 4.0,
      minReviews = 5,
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
      rating: { $gte: parseFloat(minRating) },
      reviewsCount: { $gte: parseInt(minReviews) || 0 }
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
          rating: -1, 
          views: -1, 
          likes: -1,
          createdAt: -1 
        };
        
        services = await Service.find(filter)
          .select('title slug shortDescription description price currency rating reviewsCount deliveryTime deliveryTimeUnit revisions views likes thumbnail images')
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
              avgRating: { $avg: '$rating' }
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
      rating: service.rating || 0,
      reviewsCount: service.reviewsCount || 0,
      deliveryTime: service.deliveryTime,
      deliveryTimeUnit: service.deliveryTimeUnit,
      revisions: service.revisions || 0,
      views: service.views || 0,
      likes: service.likes || 0,
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
      minRating = 0,
      minReviews = 0,
      cache: useCacheParam = 'true',
      random = 'false',
      includeSubcategory = true
    } = req.query;

    const queryLimit = Math.min(parseInt(limit) || 12, 50);
    const useCache = useCacheParam === 'true';
    
    // Generate cache key
    const cacheKey = generateCacheKey('popular_services_by_category', {
      limit: queryLimit,
      minRating,
      minReviews,
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
        .select('title slug shortDescription description price currency rating reviewsCount deliveryTime deliveryTimeUnit revisions views likes thumbnail images tags features isPopular isFeatured category subcategory createdBy')
        .populate(populateOptions)
        .sort({ 
          createdAt: -1,
          rating: -1,
          views: -1
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
        rating: service.rating || 0,
        reviewsCount: service.reviewsCount || 0,
        deliveryTime: service.deliveryTime,
        deliveryTimeUnit: service.deliveryTimeUnit || 'days',
        revisions: service.revisions || 0,
        views: service.views || 0,
        likes: service.likes || 0,
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
const getServicesBySubcategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { subcategoryId } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      sort = 'createdAt', 
      order = 'desc',
      minPrice,
      maxPrice,
      minRating
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subcategory ID',
        code: 'INVALID_SUBCATEGORY_ID',
        requestId
      });
    }

    // Check subcategory exists and is active
    const subcategory = await Subcategory.findOne({
      _id: subcategoryId,
      isActive: true
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Build filter
    const filter = {
      subcategory: subcategoryId,
      status: 'active',
      isActive: true
    };

    // Add optional filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {
      createdAt: order === 'asc' ? 1 : -1,
      price: order === 'asc' ? 1 : -1,
      rating: -1,
      deliveryTime: 1
    };

    const [services, total] = await Promise.all([
      Service.find(filter)
        .select('title slug description price currency rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images category createdBy')
        .populate('category', 'name slug icon')
        .populate('subcategory', 'name slug icon')
        .populate('createdBy', 'name picture')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Service.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: services.map(service => ({
        ...service,
        hasImages: service.images && service.images.length > 0,
        priceFormatted: `${service.currency || 'USD'} ${service.price || '0.00'}`
      })),
      subcategory: {
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        icon: subcategory.icon,
        description: subcategory.description,
        category: subcategory.category
      },
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
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Get services by subcategory error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services by subcategory',
      code: 'SERVICES_BY_SUBCATEGORY_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
};
const getServicesByCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { categoryId } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      sort = 'createdAt', 
      order = 'desc',
      minPrice,
      maxPrice,
      minRating,
      includeSubcategory = true
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

    // Check category exists and is active
    const category = await Category.findOne({
      _id: categoryId,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Build filter
    const filter = {
      category: categoryId,
      status: 'active',
      isActive: true
    };

    // Add optional filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {
      createdAt: order === 'asc' ? 1 : -1,
      price: order === 'asc' ? 1 : -1,
      rating: -1,
      views: -1,
      likes: -1
    };

    // Build populate options
    const populateOptions = [
      {
        path: 'category',
        select: 'name slug icon',
        match: { isActive: true }
      },
      {
        path: 'createdBy',
        select: 'name picture'
      }
    ];

    if (includeSubcategory === 'true' || includeSubcategory === true) {
      populateOptions.push({
        path: 'subcategory',
        select: 'name slug icon',
        match: { isActive: true }
      });
    }

    const [services, total] = await Promise.all([
      Service.find(filter)
        .select('title slug shortDescription price rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images')
        .populate(populateOptions)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Service.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: services.map(service => ({
        ...service,
        hasImages: service.images && service.images.length > 0,
        priceFormatted: `${service.currency || 'USD'} ${service.price || '0.00'}`,
        category: service.category || null,
        subcategory: service.subcategory || null
      })),
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        servicesCount: total
      },
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
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Get services by category error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services by category',
      code: 'SERVICES_BY_CATEGORY_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
};
const getServicesBySubcategorySlug = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { slug } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      sort = 'createdAt', 
      order = 'desc',
      minPrice,
      maxPrice,
      minRating
    } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Subcategory slug is required',
        code: 'MISSING_SUBCATEGORY_SLUG',
        requestId
      });
    }

    // Find subcategory by slug
    const subcategory = await Subcategory.findOne({
      slug: slug.toLowerCase(),
      isActive: true
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Get the parent category
    const category = await Category.findById(subcategory.category);

    // Build filter
    const filter = {
      subcategory: subcategory._id,
      status: 'active',
      isActive: true
    };

    // Add optional filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {
      createdAt: order === 'asc' ? 1 : -1,
      price: order === 'asc' ? 1 : -1,
      rating: -1,
      deliveryTime: 1
    };

    const [services, total] = await Promise.all([
      Service.find(filter)
        .select('title slug shortDescription price rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images')
        .populate('category', 'name slug icon')
        .populate('subcategory', 'name slug icon')
        .populate('createdBy', 'name picture')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Service.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: services.map(service => ({
        ...service,
        hasImages: service.images && service.images.length > 0,
        priceFormatted: `${service.currency || 'USD'} ${service.price || '0.00'}`
      })),
      subcategory: {
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        icon: subcategory.icon,
        description: subcategory.description,
        category: category ? {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          icon: category.icon
        } : null,
        servicesCount: total
      },
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
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Get services by subcategory slug error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services by subcategory',
      code: 'SERVICES_BY_SUBCATEGORY_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
};

module.exports = {
  createService,
  getServices,
  getMyServices,
  getServiceById,
  getAllActiveServices,
  getAdminServices,
  updateService,
  deleteService,
  restoreService,
  getServiceStats,
  bulkUpdateServices,
  exportServices,
  searchServices,
  toggleLike,
  getSimilarServices,
  uploadImages,
  removeImage,
  setThumbnail,
  uploadThumbnail,
  getPopularServices,
  togglePopularStatus,
  getPopularServicesByCategory,getServicesBySubcategory, getServicesByCategory,getServicesBySubcategorySlug,getServicesWithCategoryStats
};