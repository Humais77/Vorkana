const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Service = require('../models/services.model.js');
const Category = require('../models/category.model.js');
const User = require('../models/user.model.js');
const { sanitizeHtml } = require('../utils/sanitize.js');
const { 
  deleteFromCloudinary, 
  extractPublicIdFromUrl 
} = require('../utils/cloudinary.js');

const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const sanitizeServiceInput = (data, files = {}) => {
  const sanitized = {};
  
  for (const key in data) {
    if (typeof data[key] === 'string') {
      sanitized[key] = sanitizeHtml(data[key], {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'escape'
      }).trim();
    } else if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'string') {
      sanitized[key] = data[key].map(item => sanitizeHtml(item, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'escape'
      }).trim());
    } else if (key === 'features' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(feature => ({
        ...feature,
        title: sanitizeHtml(feature.title || '', { allowedTags: [], allowedAttributes: {} }).trim(),
        description: sanitizeHtml(feature.description || '', { allowedTags: [], allowedAttributes: {} }).trim()
      }));
    } else if (key === 'faqs' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(faq => ({
        ...faq,
        question: sanitizeHtml(faq.question || '', { allowedTags: [], allowedAttributes: {} }).trim(),
        answer: sanitizeHtml(faq.answer || '', { allowedTags: [], allowedAttributes: {} }).trim()
      }));
    } else if (key === 'requirements' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(req => ({
        ...req,
        question: sanitizeHtml(req.question || '', { allowedTags: [], allowedAttributes: {} }).trim(),
        options: req.options ? req.options.map(opt => sanitizeHtml(opt || '', { allowedTags: [], allowedAttributes: {} }).trim()) : []
      }));
    } else if (key === 'packages' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(pkg => ({
        ...pkg,
        name: sanitizeHtml(pkg.name || '', { allowedTags: [], allowedAttributes: {} }).trim(),
        description: sanitizeHtml(pkg.description || '', { allowedTags: [], allowedAttributes: {} }).trim(),
        features: pkg.features ? pkg.features.map(f => sanitizeHtml(f || '', { allowedTags: [], allowedAttributes: {} }).trim()) : []
      }));
    } else {
      sanitized[key] = data[key];
    }
  }
  
  if (files && Array.isArray(files)) {
    const imageUrls = files.map(file => {
      const safePath = file.path.replace(/\\/g, '/');
      const relativePath = `/uploads/${path.basename(safePath)}`;
      
      const absolutePath = path.join(__dirname, '../../public', relativePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Uploaded file not found: ${relativePath}`);
      }
      
      const normalizedAbsolute = path.normalize(absolutePath);
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      if (!normalizedAbsolute.startsWith(uploadsDir)) {
        throw new Error(`File path traversal detected: ${relativePath}`);
      }
      
      return relativePath;
    });
    
    if (imageUrls.length > 0) {
      sanitized.images = imageUrls;
      
      if (!sanitized.thumbnail && imageUrls.length > 0) {
        sanitized.thumbnail = imageUrls[0];
      }
    }
  }
  
  return sanitized;
};

const cleanupUploadedFiles = async (files, uploadedImagePaths = []) => {
  try {
    if (!files || !Array.isArray(files)) return;
    
    for (const file of files) {
      const isUsed = uploadedImagePaths.some(imgPath => 
        file.path.includes(path.basename(imgPath))
      );
      
      if (!isUsed && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  } catch (error) {
    console.error('Error cleaning up uploaded files:', error);
  }
};

const deleteImageFiles = async (imageUrls) => {
  try {
    if (!Array.isArray(imageUrls)) return;
    
    const deletePromises = imageUrls.map(async (imageUrl) => {
      if (!imageUrl) return;
      
      const publicId = extractPublicIdFromUrl(imageUrl);
      if (publicId) {
        const result = await deleteFromCloudinary(publicId);
        if (!result.success) {
          console.error('Failed to delete image from Cloudinary:', imageUrl, result.error);
        }
        return result;
      }
      return null;
    });
    
    await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Error deleting images from Cloudinary:', error);
  }
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
    hasPackages,
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
    const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
    filter.$text = { $search: sanitizedSearch };
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
  if (hasPackages === 'true') filter.packages = { $exists: true, $ne: [] };
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

// Create Service
const createService = async (req, res, next) => {
  const requestId = generateRequestId();
  let uploadedFiles = [];
  
  try {
    // Security: Only authenticated users can create services
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }
    let serviceData = req.body;

    // === ADD THIS BLOCK ===
    if (req.body.data) {
      try {
        serviceData = JSON.parse(req.body.data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format',
          code: 'INVALID_JSON_DATA',
          requestId
        });
      }
    }
    // Get uploaded files
    if (req.files) {
      uploadedFiles = req.files;
    }
    
    const sanitizedData = sanitizeServiceInput(req.body, uploadedFiles);
    
    // Verify category exists and is active
    if (sanitizedData.category) {
      const category = await Category.findOne({ 
        _id: sanitizedData.category, 
        isActive: true 
      });
      
      if (!category) {
        await cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({
          success: false,
          message: 'Category not found or inactive',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    // Verify subcategory if provided
    if (sanitizedData.subcategory) {
      const subcategory = await Category.findOne({ 
        _id: sanitizedData.subcategory, 
        isActive: true,
        parentCategory: sanitizedData.category 
      });
      
      if (!subcategory) {
        await cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({
          success: false,
          message: 'Subcategory not found or does not belong to the selected category',
          code: 'SUBCATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    const service = await Service.create({
      ...sanitizedData,
      createdBy: req.user._id,
      version: 1
    });

    // Security: Audit log
    logAudit('CREATE', 'SERVICE', service._id, req.user._id, {
      title: service.title,
      category: service.category,
      status: service.status,
      imagesCount: sanitizedData.images?.length || 0
    });

    // Security: Remove sensitive data
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
    // Clean up uploaded files on error
    await cleanupUploadedFiles(uploadedFiles);
    
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

// Get Services
const getServices = async (req, res, next) => {
  const requestId = generateRequestId();
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
      hasPackages,
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
      sortBy,
      page = 1,
      limit = 10,
      offset,
      fields,
      excludeFields,
      populate = true,
      populateFields = 'name',
      showAll = false,
      includeInactive = false,
      includeCreator = true,
      includeCategory = true,
      includeReviews = false,
      includeStats = false,
      lean = true,
      cache = false
    } = req.query;

    const showAllFlag = (showAll || includeInactive) && req.user?.role === 'admin';
    const isUserView = req.user?.role === 'user' || req.user?.role === 'admin';

    const filter = buildSecureServiceQuery({
      search: search || q,
      title,
      slug,
      category,
      subcategory,
      createdBy: isUserView ? req.user._id : createdBy,
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
      hasPackages,
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
    }, req.user?.role, req.user?._id);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    const allowedSortFields = ['price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    const defaultExclude = ['__v', 'lastUpdatedBy'];
    let select = {};
    
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      fieldArray.forEach(field => {
        if (!defaultExclude.includes(field)) {
          select[field] = 1;
        }
      });
    }
    
    if (excludeFields) {
      const excludeArray = excludeFields.split(',').map(f => f.trim());
      excludeArray.forEach(field => {
        select[field] = 0;
      });
    }

    let populateOptions = [];
    
    if (populate) {
      const populateArray = populateFields.split(',').map(f => f.trim());
      
      if (includeCategory) {
        populateOptions.push({
          path: 'category',
          select: 'name slug icon',
          match: { isActive: true }
        });
        
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug',
          match: { isActive: true }
        });
      }
      
      if (includeCreator) {
        populateOptions.push({
          path: 'createdBy',
          select: 'name email picture role',
          match: { isActive: true }
        });
      }
    }

    const queryOptions = {
      select: Object.keys(select).length > 0 ? select : null,
      sort: sortObj,
      skip,
      limit: limitNum,
      populate: populateOptions.length > 0 ? populateOptions : null,
      lean: lean !== false,
      maxTimeMS: 5000
    };

    const [services, total] = await Promise.all([
      Service.find(filter, null, queryOptions),
      Service.countDocuments(filter)
    ]);

    const safeServices = services.map(service => {
      const safeService = { ...service };
      
      if (safeService.createdBy && safeService.createdBy._id) {
        // Only show limited creator info
        safeService.createdBy = {
          _id: safeService.createdBy._id,
          name: safeService.createdBy.name,
          picture: safeService.createdBy.picture
        };
      }
      
      delete safeService.__v;
      delete safeService.lastUpdatedBy;
      
      if (safeService.description && safeService.description.length > 200) {
        safeService.description = safeService.description.substring(0, 200) + '...';
      }
      
      return safeService;
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    let stats = {};
    if (includeStats) {
      stats = await Service.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            avgRating: { $avg: '$rating' },
            avgDeliveryTime: { $avg: '$deliveryTime' },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' }
          }
        }
      ]);
    }

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'Cache-Control': cache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate'
    });

    const response = {
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
      requestId,
      timestamp: new Date().toISOString()
    };

    if (includeStats && stats.length > 0) {
      response.stats = stats[0];
    }

    res.json(response);

  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
        requestId
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'GET_LIST', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Service by ID or Slug
const getServiceById = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { fields, populate = true, incrementView = 'true' } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service identifier is required',
        code: 'MISSING_IDENTIFIER',
        requestId
      });
    }

    let query;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    if (isObjectId) {
      query = { _id: id };
    } else {
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] });
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    // Check permissions
    if (req.user?.role !== 'admin') {
      query.status = 'active';
      query.isActive = true;
    } else if (req.user?.role === 'user' || req.user?.role === 'admin') {
      // Users can see their own services regardless of status
      query.$or = [
        { _id: query._id || query.slug, createdBy: req.user._id },
        { 
          ...query, 
          status: 'active',
          isActive: true 
        }
      ];
    }

    const defaultExclude = ['__v', 'lastUpdatedBy'];
    let select = {};
    
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      fieldArray.forEach(field => {
        if (!defaultExclude.includes(field)) {
          select[field] = 1;
        }
      });
    }

    let populateOptions = [];
    if (populate) {
      populateOptions = [
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
    }

    const service = await Service.findOne(query)
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(populateOptions);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    if (service.status !== 'active' && req.user?.role !== 'admin') {
      if (req.user?.role !== 'user' || service.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access to this service is restricted',
          code: 'ACCESS_DENIED',
          requestId
        });
      }
    }

    if (incrementView === 'true' && service.status === 'active') {
      await Service.incrementViews(service._id);
    }

    if (service.status !== 'active') {
      logAudit('VIEW_INACTIVE', 'SERVICE', service._id, req.user?._id, {
        status: service.status
      });
    }

    const safeService = service.toObject();
    
    if (safeService.createdBy) {
      // Limit creator info shown
      safeService.createdBy = {
        _id: safeService.createdBy._id,
        name: safeService.createdBy.name,
        picture: safeService.createdBy.picture,
        accountAge: Date.now() - new Date(safeService.createdBy.createdAt).getTime()
      };
    }
    
    delete safeService.__v;
    delete safeService.lastUpdatedBy;

    if (safeService.packages && Array.isArray(safeService.packages)) {
      safeService.packages = safeService.packages.map(pkg => ({
        ...pkg,
        deliveryText: `${pkg.deliveryTime} ${service.deliveryTimeUnit}`,
        priceText: `${service.currency} ${pkg.price}`
      }));
    }

    res.json({
      success: true,
      service: safeService,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'GET_BY_ID', req.user?._id, { id: req.params.id, error: error.message });
    next(error);
  }
};

// Update Service
const updateService = async (req, res, next) => {
  const requestId = generateRequestId();
  let uploadedFiles = [];
  
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
    let serviceData = req.body;

    // === ADD THIS BLOCK ===
    if (req.body.data) {
      try {
        serviceData = JSON.parse(req.body.data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format',
          code: 'INVALID_JSON_DATA',
          requestId
        });
      }
    }

    if (req.files) {
      uploadedFiles = req.files;
    }
    
    const sanitizedData = sanitizeServiceInput(req.body, uploadedFiles);
    
    if (!isAdmin) {
      // Regular users cannot update certain fields
      delete sanitizedData.status;
      delete sanitizedData.isFeatured;
      delete sanitizedData.isRecommended;
      delete sanitizedData.isPopular;
      delete sanitizedData.views;
      delete sanitizedData.likes;
      delete sanitizedData.rating;
      delete sanitizedData.reviewsCount;
    }

    if (sanitizedData.category && sanitizedData.category !== service.category.toString()) {
      const category = await Category.findOne({ 
        _id: sanitizedData.category, 
        isActive: true 
      });
      
      if (!category) {
        await cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({
          success: false,
          message: 'Category not found or inactive',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    if (sanitizedData.subcategory && sanitizedData.subcategory !== (service.subcategory?.toString() || '')) {
      const subcategory = await Category.findOne({ 
        _id: sanitizedData.subcategory, 
        isActive: true,
        parentCategory: sanitizedData.category || service.category 
      });
      
      if (!subcategory) {
        await cleanupUploadedFiles(uploadedFiles);
        return res.status(400).json({
          success: false,
          message: 'Subcategory not found or does not belong to the category',
          code: 'SUBCATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    const currentVersion = sanitizedData.version;
    delete sanitizedData.version;

    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    if (sanitizedData.status && sanitizedData.status !== service.status) {
      if (sanitizedData.status === 'active' && !service.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const existingImages = service.images || [];
    const newImages = sanitizedData.images || [];
    
    const updatedService = await Service.findOneAndUpdate(
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
    ).populate('category', 'name slug').populate('createdBy', 'name picture');

    if (!updatedService) {
      await cleanupUploadedFiles(uploadedFiles, newImages);
      
      if (currentVersion) {
        const currentDoc = await Service.findById(id);
        return res.status(409).json({
          success: false,
          message: 'Service was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          currentVersion: currentDoc?.version,
          requestId
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Service not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    try {
      const removedImages = existingImages.filter(img => !newImages.includes(img));
      if (removedImages.length > 0) {
        deleteImageFiles(removedImages);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old images:', cleanupError);
    }

    logAudit('UPDATE', 'SERVICE', updatedService._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion || service.version,
      newVersion: updatedService.version,
      statusChanged: sanitizedData.status ? sanitizedData.status !== service.status : false,
      imagesUpdated: newImages.length > 0
    });

    const safeService = updatedService.toObject();
    delete safeService.__v;
    delete safeService.lastUpdatedBy;

    res.json({
      success: true,
      service: safeService,
      message: 'Service updated successfully',
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await cleanupUploadedFiles(uploadedFiles);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service with similar title already exists',
        code: 'DUPLICATE_SERVICE',
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

// Delete Service
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
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      logAudit('UNAUTHORIZED_DELETE', 'SERVICE', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    let result;
    
    if (permanent === 'true' && isAdmin) {
      try {
        // Delete all images from Cloudinary
        if (service.images && Array.isArray(service.images)) {
          await deleteImageFiles(service.images);
        }
        
        if (service.thumbnail) {
          await deleteImageFiles([service.thumbnail]);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up files during permanent delete:', cleanupError);
      }
      
      result = await Service.findByIdAndDelete(id);
      
      logAudit('PERMANENT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        createdBy: service.createdBy,
        force: force === 'true',
        imagesCleaned: service.images?.length || 0
      });
      
      res.json({
        success: true,
        message: 'Service permanently deleted',
        requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      service.isActive = false;
      service.status = 'suspended';
      service.lastUpdatedBy = req.user._id;
      await service.save();
      
      logAudit('SOFT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        createdBy: service.createdBy
      });
      
      res.json({
        success: true,
        message: 'Service deactivated',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
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
    
    res.json({
      success: true,
      stats: sanitizedStats,
      requestId,
      timestamp: new Date().toISOString(),
      generatedAt: new Date()
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
        message: 'Export limit exceeded (max 5,000 records)',
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

// Search Services
const searchServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { query, category, minPrice, maxPrice, sort = 'relevance', limit = 20 } = req.query;

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

    const searchLimit = Math.min(parseInt(limit) || 20, 100);

    const filter = {
      $text: { $search: sanitizedQuery },
      status: 'active',
      isActive: true
    };

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const sortOptions = {
      relevance: { score: { $meta: 'textScore' } },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { rating: -1 },
      delivery: { deliveryTime: 1 },
      newest: { createdAt: -1 }
    };

    const sortObj = sortOptions[sort] || sortOptions.relevance;

    const results = await Service.find(filter, { 
      score: { $meta: 'textScore' } 
    })
    .select('title slug description price rating deliveryTime deliveryTimeUnit revisions  views thumbnail createdBy category')
    .populate('createdBy', 'name picture')
    .populate('category', 'name slug')
    .sort(sortObj)
    .limit(searchLimit)
    .lean();

    const safeResults = results.map(result => ({
      _id: result._id,
      title: result.title,
      slug: result.slug,
      description: result.description ? result.description.substring(0, 150) + '...' : '',
      price: result.price,
      currency: result.currency || 'USD',
      rating: result.rating || 0,
      reviewsCount: result.reviewsCount || 0,
      deliveryTime: result.deliveryTime,
      deliveryTimeUnit: result.deliveryTimeUnit,
      revisions: result.revisions || 0,
      views: result.views || 0,
      thumbnail: result.thumbnail,
      createdBy: {
        _id: result.createdBy?._id,
        name: result.createdBy?.name,
        picture: result.createdBy?.picture
      },
      category: {
        _id: result.category?._id,
        name: result.category?.name,
        slug: result.category?.slug
      },
      score: result.score || 0
    }));

    const categoryIds = [...new Set(safeResults.map(r => r.category?._id).filter(Boolean))];
    const relatedCategories = await Category.find({ 
      _id: { $in: categoryIds },
      isActive: true 
    }).select('name slug icon servicesCount').lean();

    res.json({
      success: true,
      query: sanitizedQuery,
      results: safeResults,
      relatedCategories,
      count: safeResults.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'SEARCH', req.user?._id, { 
      query: req.query.query,
      error: error.message 
    });
    next(error);
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
    const { limit = 8 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
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

    const similarLimit = Math.min(parseInt(limit) || 8, 20);

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

    const safeServices = similarServices.map(s => ({
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

    res.json({
      success: true,
      services: safeServices,
      count: safeServices.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'SIMILAR', req.user?._id, { 
      id, 
      error: error.message 
    });
    next(error);
  }
};

// Upload Images
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

    if (!req.cloudinaryUrls || req.cloudinaryUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded',
        code: 'NO_IMAGES',
        requestId
      });
    }

    const existingImages = service.images || [];
    const newImageUrls = req.cloudinaryUrls.map(item => item.url);
    const updatedImages = [...existingImages, ...newImageUrls];
    
    if (updatedImages.length > 10) {
      // Delete newly uploaded images since we can't use them
      await deleteImageFiles(newImageUrls);
      
      return res.status(400).json({
        success: false,
        message: 'Cannot have more than 10 images',
        code: 'MAX_IMAGES_EXCEEDED',
        requestId
      });
    }

    service.images = updatedImages;
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    logAudit('UPLOAD_IMAGES', 'SERVICE', id, req.user._id, {
      imagesAdded: newImageUrls.length,
      totalImages: updatedImages.length
    });

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: newImageUrls,
      totalImages: updatedImages.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Clean up uploaded images on error
    if (req.cloudinaryUrls) {
      await deleteImageFiles(req.cloudinaryUrls.map(item => item.url));
    }
    
    logAudit('ERROR', 'SERVICE', 'UPLOAD_IMAGES', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Remove Image
const removeImage = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id, imageUrl } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const decodedImageUrl = decodeURIComponent(imageUrl);
    
    // Validate it's a Cloudinary URL
    if (!decodedImageUrl.includes('res.cloudinary.com')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL format',
        code: 'INVALID_IMAGE_URL',
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

    const imageIndex = service.images.indexOf(decodedImageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in service',
        code: 'IMAGE_NOT_FOUND',
        requestId
      });
    }

    // Remove from array
    service.images.splice(imageIndex, 1);
    
    // Update thumbnail if this was the thumbnail
    if (service.thumbnail === decodedImageUrl) {
      service.thumbnail = service.images.length > 0 ? service.images[0] : null;
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Delete from Cloudinary
    await deleteImageFiles([decodedImageUrl]);

    logAudit('REMOVE_IMAGE', 'SERVICE', id, req.user._id, {
      imageUrl: decodedImageUrl,
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
    const { id, imageUrl } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const decodedImageUrl = decodeURIComponent(imageUrl);
    if (!decodedImageUrl.startsWith('/uploads/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL',
        code: 'INVALID_IMAGE_URL',
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

    if (!service.images.includes(decodedImageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Image not found in service images',
        code: 'IMAGE_NOT_IN_SERVICE',
        requestId
      });
    }

    service.thumbnail = decodedImageUrl;
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    logAudit('SET_THUMBNAIL', 'SERVICE', id, req.user._id, {
      thumbnail: decodedImageUrl
    });

    res.json({
      success: true,
      message: 'Thumbnail set successfully',
      thumbnail: decodedImageUrl,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'SET_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Upload Thumbnail
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

    if (!req.cloudinaryThumbnail) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail uploaded',
        code: 'NO_THUMBNAIL',
        requestId
      });
    }

    // Delete old thumbnail if it exists
    if (service.thumbnail && service.thumbnail !== req.cloudinaryThumbnail) {
      await deleteImageFiles([service.thumbnail]);
    }

    service.thumbnail = req.cloudinaryThumbnail;
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    logAudit('UPLOAD_THUMBNAIL', 'SERVICE', id, req.user._id, {
      thumbnail: req.cloudinaryThumbnail
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: req.cloudinaryThumbnail,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Clean up uploaded thumbnail on error
    if (req.cloudinaryThumbnail) {
      await deleteImageFiles([req.cloudinaryThumbnail]);
    }
    
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
      includeInactive = 'false'
    } = req.query;

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

    const allowedSortFields = ['title', 'price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes', 'publishedAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    const [services, total] = await Promise.all([
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

    const formattedServices = services.map(service => {
  const safeService = { ...service };

  safeService.hasImages = Boolean(service.images && service.images.length > 0);
  safeService.hasPackages = Boolean(service.packages && service.packages.length > 0);
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

    const statusCounts = await Service.aggregate([
      { $match: { createdBy: filter.createdBy } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusSummary = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum
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
      timestamp: new Date().toISOString()
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
// Add to service.controller.js
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
      isActive
    } = req.query;

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

    // Sort options
    const allowedSortFields = ['title', 'price', 'rating', 'createdAt', 'updatedAt', 'ordersCount', 'views'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortDirection };

    // Execute query
    const [services, total] = await Promise.all([
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

    // Format response
    const formattedServices = services.map(service => ({
      ...service,
      priceFormatted: `${service.currency || 'USD'} ${service.price}`,
      deliveryFormatted: `${service.deliveryTime} ${service.deliveryTimeUnit || 'days'}`,
      statusBadge: {
        text: service.status ? service.status.charAt(0).toUpperCase() + service.status.slice(1) : 'Unknown',
        color: service.status === 'active' ? 'success' : 
               service.status === 'draft' ? 'warning' : 
               service.status === 'pending' ? 'info' : 'secondary'
      },
      createdBy: service.createdBy ? {
        _id: service.createdBy._id,
        name: service.createdBy.name,
        email: service.createdBy.email,
        picture: service.createdBy.picture
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
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GET ADMIN SERVICES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      code: 'SERVICES_FETCH_ERROR',
      requestId
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
  toggleLike,
  getSimilarServices,
  uploadImages,
  removeImage,
  setThumbnail,
  uploadThumbnail
};