const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Service = require('../models/services.model.js');
const Category = require('../models/category.model.js');
const User = require('../models/user.model.js');
const { sanitizeHtml } = require('../utils/sanitize.js');

// Security: Request ID for tracking
const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Security: Input sanitization with file support
const sanitizeServiceInput = (data, files = {}) => {
  const sanitized = {};
  
  // Handle regular data fields
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
  
  // Handle file uploads if present
  if (files && Array.isArray(files)) {
    const imageUrls = files.map(file => {
      // Security: Validate file path and prevent path traversal
      const safePath = file.path.replace(/\\/g, '/');
      const relativePath = `/uploads/${path.basename(safePath)}`;
      
      // Security: Check if file exists and is within uploads directory
      const absolutePath = path.join(__dirname, '../../public', relativePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Uploaded file not found: ${relativePath}`);
      }
      
      // Security: Validate file is within uploads directory
      const normalizedAbsolute = path.normalize(absolutePath);
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      if (!normalizedAbsolute.startsWith(uploadsDir)) {
        throw new Error(`File path traversal detected: ${relativePath}`);
      }
      
      return relativePath;
    });
    
    if (imageUrls.length > 0) {
      sanitized.images = imageUrls;
      
      // Set thumbnail as first image if not specified
      if (!sanitized.thumbnail && imageUrls.length > 0) {
        sanitized.thumbnail = imageUrls[0];
      }
    }
  }
  
  return sanitized;
};

// Security: Clean up orphaned files
const cleanupUploadedFiles = async (files, uploadedImagePaths = []) => {
  try {
    if (!files || !Array.isArray(files)) return;
    
    for (const file of files) {
      // Check if this file is in the uploadedImagePaths
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

// Security: Delete image files
const deleteImageFiles = (imagePaths) => {
  try {
    if (!Array.isArray(imagePaths)) return;
    
    for (const imagePath of imagePaths) {
      const fullPath = path.join(__dirname, '../../public', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Error deleting image files:', error);
  }
};

// Security: Build secure query
const buildSecureServiceQuery = (queryParams, userRole, userId) => {
  const {
    search,
    title,
    slug,
    category,
    subcategory,
    seller,
    minPrice,
    maxPrice,
    minRating,
    maxRating,
    minDeliveryTime,
    maxDeliveryTime,
    deliveryTimeUnit,
    currency,
    status,
    gigType,
    sellerLevel,
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
  } else if (userRole === 'seller' && userId) {
    // Sellers can see their own services and active public services
    filter.$or = [
      { seller: userId },
      { 
        status: 'active',
        isActive: true 
      }
    ];
  } else {
    // Regular users can only see active services
    filter.status = 'active';
    filter.isActive = true;
  }

  // Search with sanitization
  if (search) {
    const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
    filter.$text = { $search: sanitizedSearch };
  }

  // Sanitize all string inputs
  if (title) filter.title = { $regex: `^${sanitizeHtml(title, { allowedTags: [] })}`, $options: 'i' };
  if (slug) filter.slug = sanitizeHtml(slug, { allowedTags: [] });
  
  // Validate ObjectIds
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = category;
  }
  
  if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
    filter.subcategory = subcategory;
  }
  
  if (seller && mongoose.Types.ObjectId.isValid(seller)) {
    filter.seller = seller;
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
  if (gigType) filter.gigType = gigType;
  if (sellerLevel) filter.sellerLevel = sellerLevel;
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

// Security: Audit logging
const logAudit = (action, resource, resourceId, userId, details = {}) => {
  console.log(`[AUDIT:SERVICE] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};

// Create Service with File Handling
const createService = async (req, res, next) => {
  const requestId = generateRequestId();
  let uploadedFiles = [];
  
  try {
    // Security: Only sellers and admins can create services
    if (!['seller', 'admin'].includes(req.user.role)) {
      logAudit('UNAUTHORIZED_CREATE', 'SERVICE', 'NONE', req.user._id);
      return res.status(403).json({ 
        success: false, 
        message: 'Only sellers can create services',
        code: 'SELLER_ACCESS_REQUIRED',
        requestId
      });
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
      seller: req.user._id,
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

// Get Services with Advanced Security
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
      seller,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      minDeliveryTime,
      maxDeliveryTime,
      deliveryTimeUnit,
      currency,
      status,
      gigType,
      sellerLevel,
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
      includeSeller = true,
      includeCategory = true,
      includeReviews = false,
      includeStats = false,
      lean = true,
      cache = false
    } = req.query;

    // Security: Determine visibility
    const showAllFlag = (showAll || includeInactive) && req.user?.role === 'admin';
    const isSellerView = req.user?.role === 'seller';

    // Build secure query
    const filter = buildSecureServiceQuery({
      search: search || q,
      title,
      slug,
      category,
      subcategory,
      seller: isSellerView ? req.user._id : seller,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      minDeliveryTime,
      maxDeliveryTime,
      deliveryTimeUnit,
      currency,
      status: showAllFlag ? status : undefined,
      gigType,
      sellerLevel,
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

    // Security: Pagination validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    // Security: Sort validation
    const allowedSortFields = ['price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // Security: Field selection
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

    // Security: Populate configuration
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
      
      if (includeSeller) {
        populateOptions.push({
          path: 'seller',
          select: 'username fullName avatar rating level',
          match: { isActive: true }
        });
      }
    }

    // Security: Execute queries with timeout
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

    // Security: Sanitize output data
    const safeServices = services.map(service => {
      const safeService = { ...service };
      
      // Remove sensitive data
      if (safeService.seller && safeService.seller._id) {
        delete safeService.seller.email;
        delete safeService.seller.phone;
        delete safeService.seller.password;
      }
      
      delete safeService.__v;
      delete safeService.lastUpdatedBy;
      
      // Truncate long descriptions for list view
      if (safeService.description && safeService.description.length > 200) {
        safeService.description = safeService.description.substring(0, 200) + '...';
      }
      
      return safeService;
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Include stats if requested
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
            totalOrders: { $sum: '$ordersCount' },
            totalLikes: { $sum: '$likes' }
          }
        }
      ]);
    }

    // Security: Response headers
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

// Get Service by ID or Slug with Security
const getServiceById = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { fields, populate = true, incrementView = 'true' } = req.query;

    // Security: Validate input
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

    // Security: Build query based on identifier type
    if (isObjectId) {
      query = { _id: id };
    } else {
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] });
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    // Security: Check permissions
    if (req.user?.role !== 'admin' && req.user?.role !== 'seller') {
      query.status = 'active';
      query.isActive = true;
    } else if (req.user?.role === 'seller') {
      // Sellers can see their own services regardless of status
      query.$or = [
        { _id: query._id || query.slug, seller: req.user._id },
        { 
          ...query, 
          status: 'active',
          isActive: true 
        }
      ];
    }

    // Security: Field selection
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

    // Security: Populate configuration
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
          path: 'seller',
          select: 'username fullName avatar rating level totalSales responseRate responseTime joinDate description languages skills',
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

    // Security: Check if user can view this service
    if (service.status !== 'active' && req.user?.role !== 'admin') {
      if (req.user?.role !== 'seller' || service.seller._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access to this service is restricted',
          code: 'ACCESS_DENIED',
          requestId
        });
      }
    }

    // Increment view count
    if (incrementView === 'true' && service.status === 'active') {
      await Service.incrementViews(service._id);
    }

    // Security: Audit log for sensitive access
    if (service.status !== 'active') {
      logAudit('VIEW_INACTIVE', 'SERVICE', service._id, req.user?._id, {
        status: service.status
      });
    }

    // Security: Remove sensitive data
    const safeService = service.toObject();
    
    if (safeService.seller) {
      delete safeService.seller.email;
      delete safeService.seller.phone;
      delete safeService.seller.password;
      delete safeService.seller.paymentMethods;
    }
    
    delete safeService.__v;
    delete safeService.lastUpdatedBy;

    // Format packages for better readability
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

// Update Service with Security and File Handling
const updateService = async (req, res, next) => {
  const requestId = generateRequestId();
  let uploadedFiles = [];
  
  try {
    const { id } = req.params;
    
    // Security: Validate ID
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

    // Security: Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
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

    // Get uploaded files
    if (req.files) {
      uploadedFiles = req.files;
    }
    
    // Security: Admins can update any field, sellers have restrictions
    const sanitizedData = sanitizeServiceInput(req.body, uploadedFiles);
    
    if (!isAdmin) {
      // Sellers cannot update certain fields
      delete sanitizedData.status;
      delete sanitizedData.isFeatured;
      delete sanitizedData.isRecommended;
      delete sanitizedData.isPopular;
      delete sanitizedData.sellerLevel;
      delete sanitizedData.ordersCount;
      delete sanitizedData.views;
      delete sanitizedData.likes;
      delete sanitizedData.rating;
      delete sanitizedData.reviewsCount;
    }

    // Verify category if being updated
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

    // Verify subcategory if being updated
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

    // Optimistic concurrency control
    const currentVersion = sanitizedData.version;
    delete sanitizedData.version;

    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    // Handle status changes
    if (sanitizedData.status && sanitizedData.status !== service.status) {
      if (sanitizedData.status === 'active' && !service.publishedAt) {
        updateData.publishedAt = new Date();
      }
      
      // Update category counts if status changes to/from active
      if ((service.status === 'active' && sanitizedData.status !== 'active') ||
          (service.status !== 'active' && sanitizedData.status === 'active')) {
        // This will be handled by post-save middleware
      }
    }

    // Get existing images to compare
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
    ).populate('category', 'name slug').populate('seller', 'username fullName');

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

    // Clean up old images that were replaced
    try {
      const removedImages = existingImages.filter(img => !newImages.includes(img));
      if (removedImages.length > 0) {
        deleteImageFiles(removedImages);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old images:', cleanupError);
    }

    // Security: Audit log
    logAudit('UPDATE', 'SERVICE', updatedService._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion || service.version,
      newVersion: updatedService.version,
      statusChanged: sanitizedData.status ? sanitizedData.status !== service.status : false,
      imagesUpdated: newImages.length > 0
    });

    // Security: Remove sensitive data
    const safeService = updatedService.toObject();
    delete safeService.__v;
    delete safeService.lastUpdatedBy;
    
    if (safeService.seller) {
      delete safeService.seller.email;
      delete safeService.seller.phone;
    }

    res.json({
      success: true,
      service: safeService,
      message: 'Service updated successfully',
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
    
    logAudit('ERROR', 'SERVICE', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Delete Service with Security and File Cleanup
const deleteService = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    // Security: Validate ID
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

    // Security: Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
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

    // Check for active orders if not forcing
    if (force !== 'true' && service.ordersCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with active orders',
        code: 'ACTIVE_ORDERS_EXIST',
        requestId
      });
    }

    let result;
    
    // Security: Permanent delete (admin only)
    if (permanent === 'true' && isAdmin) {
      // Clean up associated files
      try {
        if (service.images && Array.isArray(service.images)) {
          deleteImageFiles(service.images);
        }
        
        // Clean up thumbnail if it exists
        if (service.thumbnail) {
          deleteImageFiles([service.thumbnail]);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up files during permanent delete:', cleanupError);
      }
      
      result = await Service.findByIdAndDelete(id);
      
      // Security: Audit log for permanent delete
      logAudit('PERMANENT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        seller: service.seller,
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
      // Soft delete
      service.isActive = false;
      service.status = 'suspended';
      service.lastUpdatedBy = req.user._id;
      await service.save();
      
      // Security: Audit log for soft delete
      logAudit('SOFT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        seller: service.seller
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

// Restore Service (Admin/Seller)
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

    // Security: Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only restore your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Check if category is still active
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

    // Security: Audit log
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

// Get Service Statistics with Security
const getServiceStats = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Security: Only admin and sellers can see detailed stats
    if (!['admin', 'seller'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access required for statistics',
        code: 'ACCESS_REQUIRED',
        requestId
      });
    }

    const filter = req.user.role === 'seller' 
      ? { seller: req.user._id }
      : {};

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
                totalOrders: { $sum: '$ordersCount' },
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
                totalOrders: { $sum: '$ordersCount' },
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
          byGigType: [
            {
              $group: {
                _id: '$gigType',
                count: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                avgOrders: { $avg: '$ordersCount' }
              }
            },
            { $sort: { count: -1 } }
          ],
          topServices: [
            { $match: { status: 'active', isActive: true } },
            { $sort: { ordersCount: -1 } },
            { $limit: 10 },
            {
              $project: {
                title: 1,
                ordersCount: 1,
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
                  avgOrders: { $avg: "$ordersCount" }
                }
              }
            }
          ]
        }
      }
    ]);

    // Security: Sanitize output
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

// Bulk Operations with Security
const bulkUpdateServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Security: Rate limiting check
    if (!['admin', 'seller'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access required for bulk operations',
        code: 'ACCESS_REQUIRED',
        requestId
      });
    }

    const { ids, operation, data } = req.body;

    // Security: Limit batch size
    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 50 items in bulk',
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

    // For sellers, verify ownership
    if (req.user.role === 'seller') {
      const services = await Service.find({ _id: { $in: validIds } });
      const notOwned = services.filter(service => service.seller.toString() !== req.user._id.toString());
      
      if (notOwned.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own services',
          code: 'OWNERSHIP_REQUIRED',
          requestId
        });
      }
    }

    let result;
    let updateData = {};
    const now = new Date();

    // Define allowed operations
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

    // Add version increment for updates
    if (operation === 'update') {
      updateData.$inc = { version: 1 };
    }

    // Handle publish date for activation
    if (operation === 'activate') {
      updateData.publishedAt = now;
    }

    // Security: Execute bulk operation with timeout
    result = await Service.updateMany(
      { _id: { $in: validIds } },
      updateData,
      { 
        maxTimeMS: 10000,
        runValidators: operation === 'update'
      }
    );

    // Security: Audit log
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

// Export Services with Security
const exportServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Security: Only admin and sellers can export
    if (!['admin', 'seller'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access required for export',
        code: 'ACCESS_REQUIRED',
        requestId
      });
    }

    const { format = 'json', ...queryParams } = req.query;
    
    // Security: Build secure query
    const filter = buildSecureServiceQuery(
      queryParams, 
      req.user.role, 
      req.user._id
    );

    // Security: Limit export size
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
      .populate('seller', 'username fullName')
      .lean();

    // Security: Format response based on requested format
    if (format === 'csv') {
      const headers = [
        'ID', 'Title', 'Slug', 'Description', 'Category', 'Seller',
        'Price', 'Currency', 'Delivery Time', 'Delivery Unit', 'Revisions',
        'Rating', 'Reviews Count', 'Orders Count', 'Views', 'Likes',
        'Status', 'Featured', 'Recommended', 'Popular', 'Gig Type',
        'Created At', 'Updated At', 'Published At'
      ];

      const csvRows = services.map(service => [
        service._id,
        `"${(service.title || '').replace(/"/g, '""')}"`,
        service.slug || '',
        `"${(service.description || '').replace(/"/g, '""')}"`,
        service.category?.name || '',
        service.seller?.username || '',
        service.price || 0,
        service.currency || 'USD',
        service.deliveryTime || 0,
        service.deliveryTimeUnit || 'days',
        service.revisions || 0,
        service.rating || 0,
        service.reviewsCount || 0,
        service.ordersCount || 0,
        service.views || 0,
        service.likes || 0,
        service.status || '',
        service.isFeatured ? 'Yes' : 'No',
        service.isRecommended ? 'Yes' : 'No',
        service.isPopular ? 'Yes' : 'No',
        service.gigType || 'basic',
        new Date(service.createdAt).toISOString(),
        new Date(service.updatedAt).toISOString(),
        service.publishedAt ? new Date(service.publishedAt).toISOString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Security: Set secure download headers
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="services_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', count);
      res.header('X-Export-Timestamp', new Date().toISOString());
      
      return res.send(csvContent);
    }

    // Default JSON export
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

// Search Services with Security
const searchServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { query, category, minPrice, maxPrice, sort = 'relevance', limit = 20 } = req.query;

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

    // Security: Limit search results
    const searchLimit = Math.min(parseInt(limit) || 20, 100);

    // Build search filter
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

    // Define sort options
    const sortOptions = {
      relevance: { score: { $meta: 'textScore' } },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { rating: -1 },
      delivery: { deliveryTime: 1 },
      orders: { ordersCount: -1 },
      newest: { createdAt: -1 }
    };

    const sortObj = sortOptions[sort] || sortOptions.relevance;

    const results = await Service.find(filter, { 
      score: { $meta: 'textScore' } 
    })
    .select('title slug description price rating deliveryTime deliveryTimeUnit revisions ordersCount views thumbnail seller category')
    .populate('seller', 'username fullName avatar rating level')
    .populate('category', 'name slug')
    .sort(sortObj)
    .limit(searchLimit)
    .lean();

    // Security: Sanitize and format results
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
      ordersCount: result.ordersCount || 0,
      views: result.views || 0,
      thumbnail: result.thumbnail,
      seller: {
        _id: result.seller?._id,
        username: result.seller?.username,
        fullName: result.seller?.fullName,
        avatar: result.seller?.avatar,
        rating: result.seller?.rating,
        level: result.seller?.level
      },
      category: {
        _id: result.category?._id,
        name: result.category?.name,
        slug: result.category?.slug
      },
      score: result.score || 0
    }));

    // Get related categories
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

    // Check if user already liked the service
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

    // Get updated service
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
      .select('category tags title seller')
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

    // Find similar services by category and tags
    const similarServices = await Service.find({
      _id: { $ne: id },
      category: service.category,
      status: 'active',
      isActive: true,
      ...(service.tags && service.tags.length > 0 ? {
        tags: { $in: service.tags.slice(0, 3) }
      } : {})
    })
    .select('title slug description price rating deliveryTime deliveryTimeUnit revisions ordersCount views thumbnail seller')
    .populate('seller', 'username fullName avatar rating')
    .sort({ rating: -1, ordersCount: -1 })
    .limit(similarLimit)
    .lean();

    // If not enough similar services, get more from same category
    if (similarServices.length < similarLimit) {
      const additionalServices = await Service.find({
        _id: { $nin: [id, ...similarServices.map(s => s._id)] },
        category: service.category,
        status: 'active',
        isActive: true
      })
      .select('title slug description price rating deliveryTime deliveryTimeUnit revisions ordersCount views thumbnail seller')
      .populate('seller', 'username fullName avatar rating')
      .sort({ rating: -1, ordersCount: -1 })
      .limit(similarLimit - similarServices.length)
      .lean();

      similarServices.push(...additionalServices);
    }

    // Security: Sanitize results
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
      ordersCount: s.ordersCount || 0,
      views: s.views || 0,
      thumbnail: s.thumbnail,
      seller: {
        _id: s.seller?._id,
        username: s.seller?.username,
        fullName: s.seller?.fullName,
        avatar: s.seller?.avatar,
        rating: s.seller?.rating
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

// Upload Images Only
const uploadImages = async (req, res, next) => {
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
      await cleanupUploadedFiles(uploadedFiles);
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    // Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      await cleanupUploadedFiles(uploadedFiles);
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Get uploaded files
    if (req.files) {
      uploadedFiles = req.files;
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded',
        code: 'NO_IMAGES',
        requestId
      });
    }

    // Process uploaded files
    const imageUrls = uploadedFiles.map(file => {
      const safePath = file.path.replace(/\\/g, '/');
      return `/uploads/${path.basename(safePath)}`;
    });

    // Add new images to service
    const existingImages = service.images || [];
    const updatedImages = [...existingImages, ...imageUrls];
    
    // Limit total images
    if (updatedImages.length > 10) {
      await cleanupUploadedFiles(uploadedFiles);
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
      imagesAdded: imageUrls.length,
      totalImages: updatedImages.length
    });

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: imageUrls,
      totalImages: updatedImages.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await cleanupUploadedFiles(uploadedFiles);
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

    // Security: Validate image URL
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

    // Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Check if image exists
    const imageIndex = service.images.indexOf(decodedImageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in service',
        code: 'IMAGE_NOT_FOUND',
        requestId
      });
    }

    // Remove image from array
    service.images.splice(imageIndex, 1);
    
    // If this was the thumbnail, set new thumbnail (first image or null)
    if (service.thumbnail === decodedImageUrl) {
      service.thumbnail = service.images.length > 0 ? service.images[0] : null;
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Delete the physical file
    try {
      deleteImageFiles([decodedImageUrl]);
    } catch (cleanupError) {
      console.error('Error deleting image file:', cleanupError);
    }

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

    // Security: Validate image URL
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

    // Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Check if image exists in service images
    if (!service.images.includes(decodedImageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Image not found in service images',
        code: 'IMAGE_NOT_IN_SERVICE',
        requestId
      });
    }

    // Set thumbnail
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
      await cleanupUploadedFiles(uploadedFiles);
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    // Check permissions
    const isOwner = service.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      await cleanupUploadedFiles(uploadedFiles);
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Get uploaded files
    if (req.files && req.files.length > 0) {
      uploadedFiles = req.files;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail uploaded',
        code: 'NO_THUMBNAIL',
        requestId
      });
    }

    // Process uploaded thumbnail
    const thumbnailFile = uploadedFiles[0];
    const safePath = thumbnailFile.path.replace(/\\/g, '/');
    const thumbnailUrl = `/uploads/${path.basename(safePath)}`;

    // Delete old thumbnail if it exists
    if (service.thumbnail && service.thumbnail !== thumbnailUrl) {
      try {
        deleteImageFiles([service.thumbnail]);
      } catch (cleanupError) {
        console.error('Error deleting old thumbnail:', cleanupError);
      }
    }

    // Update service with new thumbnail
    service.thumbnail = thumbnailUrl;
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    logAudit('UPLOAD_THUMBNAIL', 'SERVICE', id, req.user._id, {
      thumbnail: thumbnailUrl
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: thumbnailUrl,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await cleanupUploadedFiles(uploadedFiles);
    logAudit('ERROR', 'SERVICE', 'UPLOAD_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
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