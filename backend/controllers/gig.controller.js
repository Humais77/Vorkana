const mongoose = require('mongoose');
const crypto = require('crypto');
const Gig = require('../models/gig.model.js');
const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js'); 
const { 
  processUploadToCloudinary, 
  deleteCloudinaryImages
} = require('../middleware/upload.middleware.js');
const { sanitizeHtml, sanitizeText } = require('../utils/sanitize.js');
const cache = require('../utils/cache.js'); // Import the cache utility

const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const sanitizeGigInput = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const sanitizeTextFields = (value) => {
    if (typeof value === 'string') {
      return sanitizeText(value);
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value.map(sanitizeText);
    }
    return value;
  };
  
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' || 
        (Array.isArray(sanitized[key]) && typeof sanitized[key][0] === 'string')) {
      sanitized[key] = sanitizeTextFields(sanitized[key]);
    }
  });
  
  return sanitized;
};

const uploadGigImages = async (files, gigId) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }
  
  const uploadedImages = await processUploadToCloudinary(files, 'gigs');
  
  return uploadedImages.map(image => ({
    url: image.url,
    public_id: image.public_id,
    width: image.width,
    height: image.height,
    size: image.size,
    format: image.format,
    uploadedAt: new Date()
  }));
};

const uploadGigThumbnail = async (file, gigId) => {
  if (!file) {
    return null;
  }
  
  const uploadedImage = await processUploadToCloudinary([file], 'gigs/thumbnails', {
    transformation: [
      { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:best', fetch_format: 'auto' }
    ]
  });
  
  if (uploadedImage.length === 0) {
    return null;
  }
  
  return {
    url: uploadedImage[0].url,
    public_id: uploadedImage[0].public_id,
    width: uploadedImage[0].width,
    height: uploadedImage[0].height,
    size: uploadedImage[0].size,
    format: uploadedImage[0].format,
    uploadedAt: new Date()
  };
};

const buildSecureGigQuery = (queryParams, userRole, userId) => {
  const {
    search,
    title,
    slug,
    projectCategory,
    subcategory,
    createdBy,
    assignedTo,
    minBudget,
    maxBudget,
    currency,
    status,
    urgency,
    visibility,
    paymentStatus,
    disputeStatus,
    hasImages,
    hasMilestones,
    skillsRequired,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    ids,
    excludeIds,
    showAll = false,
  } = queryParams;

  const filter = {};

  // Security: Apply appropriate filters based on user role
  if (showAll && userRole === 'admin') {
    if (status !== undefined) {
      filter.status = status;
    }
    filter.deletedAt = null;
  } else if (userRole === 'user' && userId) {
    // Users can see their created gigs, assigned gigs, and public ACTIVE gigs
    filter.$or = [
      { createdBy: userId, deletedAt: null },
      { assignedTo: userId, deletedAt: null },
      { 
        status: 'open',
        visibility: 'public',
        isActive: true,
        deletedAt: null
      }
    ];
  } else {
    // Public/guest access - only ACTIVE public gigs
    filter.status = 'open';
    filter.visibility = 'public';
    filter.isActive = true;
    filter.deletedAt = null;
  }

  // Search with text index
  if (search) {
    const sanitizedSearch = sanitizeText(search);
    filter.$text = { $search: sanitizedSearch };
  }

  // Sanitize and apply string filters
  if (title) {
    const sanitizedName = sanitizeText(title);
    filter.title = { $regex: `^${sanitizedName}`, $options: 'i' };
  }
  
  if (slug) {
    filter.slug = sanitizeText(slug);
  }
  
  // Validate and apply ObjectId filters
  if (projectCategory && mongoose.Types.ObjectId.isValid(projectCategory)) {
    filter.projectCategory = projectCategory;
  }
  
  if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
    filter.subcategory = subcategory;
  }
  
  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
  }
  
  if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
    filter.assignedTo = assignedTo;
  }

  // Numeric filters
  if (minBudget !== undefined || maxBudget !== undefined) {
    filter.budget = {};
    if (minBudget !== undefined) filter.budget.$gte = parseFloat(minBudget) || 0;
    if (maxBudget !== undefined) filter.budget.$lte = parseFloat(maxBudget) || 100000;
  }

  // Enum filters
  if (currency) filter.currency = currency;
  if (urgency) filter.urgency = urgency;
  if (visibility) filter.visibility = visibility;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (disputeStatus) filter.disputeStatus = disputeStatus;

  
  if (hasImages === true || hasImages === 'true') {
    filter.images = { $exists: true, $ne: [] };
  }
  
  if (hasMilestones === true || hasMilestones === 'true') {
    filter.milestones = { $exists: true, $ne: [] };
  }
  
  // Array filters
  if (skillsRequired) {
    const skillsArray = (Array.isArray(skillsRequired) ? skillsRequired : skillsRequired.split(','))
      .map(skill => sanitizeText(skill.trim()));
    filter.skillsRequired = { $all: skillsArray };
  }

  // Date filters
  const addDateFilter = (field, date, operator) => {
    if (date) {
      let parsedDate;
      
      if (date instanceof Date) {
        parsedDate = date;
      } else if (typeof date === 'string') {
        parsedDate = new Date(date);
      } else if (typeof date === 'number') {
        parsedDate = new Date(date);
      } else {
        console.warn(`Invalid date format for ${field}:`, date);
        return;
      }
      
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        if (!filter[field]) {
          filter[field] = {};
        }
        filter[field][operator] = parsedDate;
      }
    }
  };

  addDateFilter('createdAt', createdAfter, '$gte');
  addDateFilter('createdAt', createdBefore, '$lte');
  addDateFilter('updatedAt', updatedAfter, '$gte');
  addDateFilter('updatedAt', updatedBefore, '$lte');

  // ID array filters
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

const logAudit = (action, resource, resourceId, userId, details = {}) => {
  console.log(`[AUDIT:GIG] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};

// Helper function to generate cache key
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

// Helper function to invalidate related cache
const invalidateGigCache = async (gigId) => {
  try {
    // Invalidate all cache related to this gig
    await cache.del(`gig:*${gigId}*`);
    await cache.del('gigs:*');
    await cache.del('gig_stats:*');
    console.log(`Cache invalidated for gig: ${gigId}`);
  } catch (err) {
    console.warn('Error invalidating cache:', err.message);
  }
};

// Create Gig
const createGig = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        requestId
      });
    }

    const sanitizedData = sanitizeGigInput(req.body);
     if (!sanitizedData.subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is required',
        code: 'SUBCATEGORY_REQUIRED',
        requestId
      });
    }    
    if (!mongoose.Types.ObjectId.isValid(sanitizedData.projectCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
        code: 'INVALID_CATEGORY_ID',
        requestId
      });
    }

     const category = await Category.findOne({ 
      _id: sanitizedData.projectCategory,
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

    // Validate subcategory exists, is active, and belongs to the selected category
    const subcategory = await Subcategory.findOne({ 
  _id: sanitizedData.subcategory,
  category: sanitizedData.projectCategory,
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

    const gigData = {
      ...sanitizedData,
      title: sanitizedData.title || `Project ${Date.now()}`,
      fullName: req.user.name || sanitizedData.fullName || 'User',
      oauthEmail: req.user.email || sanitizedData.oauthEmail,
      createdBy: req.user._id,
      version: 1,
      images: [],
      thumbnail: null
    };

    // Process uploaded images
    const uploadedImages = [];
    const uploadedThumbnail = [];
    
    // Check for thumbnail
    if (req.files && req.files.thumbnail) {
      uploadedThumbnail.push(...req.files.thumbnail);
    }
    
    // Check for other images
    if (req.files && req.files.images) {
      uploadedImages.push(...req.files.images);
    }

    // Upload thumbnail first
    if (uploadedThumbnail.length > 0) {
      const thumbnailUpload = await uploadGigThumbnail(uploadedThumbnail[0], req.user._id);
      
      if (thumbnailUpload) {
        gigData.thumbnail = thumbnailUpload;
        gigData.images.push({
          url: thumbnailUpload.url,
          public_id: thumbnailUpload.public_id,
          width: thumbnailUpload.width,
          height: thumbnailUpload.height,
          size: thumbnailUpload.size,
          format: thumbnailUpload.format,
          uploadedAt: thumbnailUpload.uploadedAt
        });
      }
    }

    // Upload other images
    if (uploadedImages.length > 0) {
      const images = await uploadGigImages(uploadedImages, req.user._id);
      
      if (images.length > 0) {
        // Add images to array, avoiding duplicates
        images.forEach(image => {
          const exists = gigData.images.some(img => img.public_id === image.public_id);
          if (!exists) {
            gigData.images.push(image);
          }
        });
        
        // Set thumbnail if not already set
        if (!gigData.thumbnail && images.length > 0) {
          gigData.thumbnail = {
            url: images[0].url,
            public_id: images[0].public_id,
            width: images[0].width,
            height: images[0].height,
            size: images[0].size,
            format: images[0].format,
            uploadedAt: images[0].uploadedAt
          };
        }
      }
    }


    const gig = await Gig.create(gigData);

    // Invalidate cache after creating a new gig
    await invalidateGigCache(gig._id);

    logAudit('CREATE', 'GIG', gig._id, req.user._id, {
      title: gig.title,
      category: gig.projectCategory,
      subcategory: gig.subcategory,
      budget: gig.budget,
      imagesCount: gig.images.length,
      hasThumbnail: !!gig.thumbnail
    });
     await gig.populate([
      { path: 'projectCategory', select: 'name slug icon' },
      { path: 'subcategory', select: 'name slug icon' }
    ]);
    const safeGig = gig.toObject();
    delete safeGig.__v;
    delete safeGig.lastUpdatedBy;
    delete safeGig.deletedAt;
    delete safeGig.deletedBy;
    delete safeGig.version;
    delete safeGig.communicationHistory;

    const responseTime = Date.now() - startTime;
    
    res.status(201).json({
      success: true,
      data: safeGig,
      message: 'Gig created successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Gig with similar title already exists',
        code: 'DUPLICATE_GIG',
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
    
    logAudit('ERROR', 'GIG', 'CREATE', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Gigs
const getGigs = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      search,
      q,
      title,
      slug,
      projectCategory,
      subcategory,
      includeSubcategory = true,
      createdBy,
      assignedTo,
      minBudget,
      maxBudget,
      currency,
      status,
      urgency,
      visibility,
      paymentStatus,
      disputeStatus,
      hasMilestones,
      skillsRequired,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
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
      includeCategory = true,
      includeCreator = true,
      includeAssignee = true,
      lean = true,
      cache: useCache = 'true'
    } = req.query;

    const showAllFlag = (showAll || includeInactive) && req.user?.role === 'admin';
    const userRole = req.user?.role || 'guest';

    const filter = buildSecureGigQuery({
      search: search || q,
      title,
      slug,
      projectCategory,
      subcategory,
      createdBy,
      assignedTo,
      minBudget,
      maxBudget,
      currency,
      status: showAllFlag ? status : undefined,
      urgency,
      visibility,
      paymentStatus,
      disputeStatus,
      hasMilestones,
      skillsRequired,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      ids,
      excludeIds,
      showAll: showAllFlag
    }, userRole, req.user?._id);
    
    if (!showAllFlag && !filter.isActive) {
      filter.isActive = true;
    }
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;

    const allowedSortFields = ['budget', 'createdAt', 'updatedAt','urgency', 'title'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    const defaultExclude = ['__v', 'lastUpdatedBy', 'deletedAt', 'deletedBy', 'version', 'communicationHistory'];
    let select = {};
    
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      fieldArray.forEach(field => {
        if (!defaultExclude.includes(field)) {
          select[field] = 1;
        }
      });
    } else {
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

    let populateOptions = [];
    
    if (populate) {
      const populateArray = populateFields.split(',').map(f => f.trim());
      
      if (includeCategory) {
        populateOptions.push({
          path: 'projectCategory',
          select: 'name slug icon'
        });
        
        if (includeSubcategory === 'true' || includeSubcategory === true) {
          populateOptions.push({
            path: 'subcategory',
            select: 'name slug icon order'
          });
        }
      }
      
      if (includeCreator) {
        populateOptions.push({
          path: 'createdBy',
          select: 'name email picture role'
        });
      }
      
      if (includeAssignee) {
        populateOptions.push({
          path: 'assignedTo',
          select: 'name email picture role'
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

    // Generate cache key
    const cacheKey = generateCacheKey('gigs', {
      filter,
      page: pageNum,
      limit: limitNum,
      sort: sortObj,
      skip,
      populate: populateOptions,
      userRole
    });

    let gigs, total;
    const shouldUseCache = useCache === 'true' && pageNum === 1 && !search && !q;

    if (shouldUseCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        gigs = cached.gigs;
        total = cached.total;
        console.log(`Cache hit for key: ${cacheKey}`);
      }
    }

    if (!gigs || !total) {
      [gigs, total] = await Promise.all([
        Gig.find(filter, null, queryOptions),
        Gig.countDocuments(filter)
      ]);

      if (shouldUseCache) {
        // Cache for 5 minutes
        await cache.set(cacheKey, { gigs, total }, 300);
        console.log(`Cache set for key: ${cacheKey}`);
      }
    }

    const safeGigs = gigs.map(gig => {
      if (lean) {
        const safeGig = { ...gig };
        
        if (safeGig.createdBy && safeGig.createdBy._id) {
          delete safeGig.createdBy.email;
          delete safeGig.createdBy.phone;
          delete safeGig.createdBy.password;
        }
        
        if (safeGig.assignedTo && safeGig.assignedTo._id) {
          delete safeGig.assignedTo.email;
          delete safeGig.assignedTo.phone;
          delete safeGig.assignedTo.password;
        }
        
        delete safeGig.__v;
        delete safeGig.lastUpdatedBy;
        delete safeGig.deletedAt;
        delete safeGig.deletedBy;
        delete safeGig.version;
        delete safeGig.communicationHistory;
        
        if (safeGig.description && safeGig.description.length > 200) {
          safeGig.description = safeGig.description.substring(0, 200) + '...';
        }
        
        return safeGig;
      } else {
        const safeGig = gig.toObject();
        
        if (safeGig.createdBy) {
          delete safeGig.createdBy.email;
          delete safeGig.createdBy.phone;
          delete safeGig.createdBy.password;
        }
        
        if (safeGig.assignedTo) {
          delete safeGig.assignedTo.email;
          delete safeGig.assignedTo.phone;
          delete safeGig.assignedTo.password;
        }
        
        delete safeGig.__v;
        delete safeGig.lastUpdatedBy;
        delete safeGig.deletedAt;
        delete safeGig.deletedBy;
        delete safeGig.version;
        delete safeGig.communicationHistory;
        
        if (safeGig.description && safeGig.description.length > 200) {
          safeGig.description = safeGig.description.substring(0, 200) + '...';
        }
        
        return safeGig;
      }
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'Cache-Control': shouldUseCache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate'
    });

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: safeGigs,
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
      responseTime: `${responseTime}ms`,
      cached: shouldUseCache && gigs !== undefined
    });

  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
        requestId
      });
    }
    
    logAudit('ERROR', 'GIG', 'GET_LIST', req.user?._id, { error: error.message });
    next(error);
  }
};

// Search Gigs
const searchGigs = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { q: searchQuery, fuzzy = 'false', threshold = 0.3, limit = 20 } = req.query;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        code: 'MISSING_QUERY',
        requestId
      });
    }
const sanitizedQuery = sanitizeText(searchQuery.trim());

    if (sanitizedQuery.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
        code: 'QUERY_TOO_SHORT',
        requestId
      });
    }

    const searchLimit = Math.min(parseInt(limit) || 20, 100);

    let results;
    
    if (fuzzy === 'true') {
      const searchRegex = new RegExp(sanitizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      
      results = await Gig.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { slug: searchRegex },
          { skillsRequired: { $in: [searchRegex] } }
        ],
        status: 'open',
        visibility: 'public',
        deletedAt: null
      })
      .select('title slug description budget currency projectCategory skillsRequired deliverables')
      .limit(searchLimit)
      .populate('projectCategory', 'name slug icon')
      .lean();
    } else {
      results = await Gig.find({
        $or: [
          { title: new RegExp(`^${sanitizedQuery}`, 'i') },
          { slug: sanitizedQuery.toLowerCase() }
        ],
        status: 'open',
        visibility: 'public',
        deletedAt: null
      })
      .select('title slug description budget currency projectCategory skillsRequired deliverables urgency')
      .limit(searchLimit)
      .populate('projectCategory', 'name slug icon')
      .lean();
    }

    const safeResults = results.map(result => ({
      _id: result._id,
      title: result.title,
      slug: result.slug,
      description: result.description ? result.description.substring(0, 100) + '...' : '',
      budget: result.budget || 0,
      currency: result.currency || 'USD',
      category: result.projectCategory,
      skillsRequired: result.skillsRequired || [],
      deliverables: result.deliverables || [],
      urgency: result.urgency || 'medium'
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
    logAudit('ERROR', 'GIG', 'SEARCH', req.user?._id, { 
      query: req.query.query,
      error: error.message 
    });
    next(error);
  }
};

// Get Gig by ID
const getGigById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { fields, populate = true, cache: useCache = 'true' ,includeSubcategory = true} = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Gig identifier is required',
        code: 'MISSING_IDENTIFIER',
        requestId
      });
    }

    let query;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    if (isObjectId) {
      query = { _id: id };
    } else {
      const sanitizedSlug = sanitizeText(id);
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    const userRole = req.user?.role || 'guest';
    const userId = req.user?._id;

    query.deletedAt = null;
    
    if (userRole !== 'admin') {
      if (userId) {
        query.$or = [
          { createdBy: userId },
          { assignedTo: userId },
          { 
            visibility: 'public',
            status: 'open'
          }
        ];
      } else {
        query.visibility = 'public';
        query.status = 'open';
      }
    }

    let selectFields = {};
    
    if (fields) {
      try {
        const fieldArray = fields.split(',').map(f => f.trim());
        fieldArray.forEach(field => {
          if (field && field !== '__v' && field !== 'lastUpdatedBy' && 
              field !== 'deletedAt' && field !== 'deletedBy' && 
              field !== 'version' && field !== 'communicationHistory') {
            selectFields[field] = 1;
          }
        });
      } catch (err) {
        console.warn('Error parsing fields:', err);
      }
    }

    let populateOptions = [];
    if (populate === 'true' || populate === true) {
      populateOptions = [
        {
          path: 'projectCategory',
          select: 'name slug icon',
          match: { isActive: true }
        },
        {
          path: 'createdBy',
          select: 'name email picture role createdAt'
        },
        {
          path: 'assignedTo',
          select: 'name email picture role'
        }
      ];
       if (includeSubcategory === 'true' || includeSubcategory === true) {
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon',
          match: { isActive: true }
        });
      }
      
    }

    // Generate cache key
    const cacheKey = generateCacheKey('gig', {
      id,
      fields,
      populate: populateOptions,
      userRole,
      userId
    });

    let gig;
    const shouldUseCache = useCache === 'true' && userRole === 'guest';

    if (shouldUseCache) {
      gig = await cache.get(cacheKey);
      if (gig) {
        console.log(`Cache hit for gig: ${id}`);
      }
    }

    if (!gig) {
      gig = await Gig.findOne(query)
        .select(Object.keys(selectFields).length > 0 ? selectFields : null)
        .populate(populateOptions);

      if (shouldUseCache && gig) {
        // Cache for 10 minutes for public gigs
        await cache.set(cacheKey, gig, 600);
        console.log(`Cache set for gig: ${id}`);
      }
    }

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    if (gig.visibility !== 'public' && userRole !== 'admin') {
      const isOwner = gig.createdBy._id.toString() === userId?.toString();
      const isAssigned = gig.assignedTo && gig.assignedTo._id.toString() === userId?.toString();
      
      if (!isOwner && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access to this gig is restricted',
          code: 'ACCESS_DENIED',
          requestId
        });
      }
    }

    if (gig.status !== 'open') {
      logAudit('VIEW_INACTIVE', 'GIG', gig._id, userId, {
        status: gig.status
      });
    }

    const safeGig = gig.toObject ? gig.toObject() : gig;
    
    if (safeGig.createdBy) {
      delete safeGig.createdBy.email;
      delete safeGig.createdBy.phone;
      delete safeGig.createdBy.password;
    }
    
    if (safeGig.assignedTo) {
      delete safeGig.assignedTo.email;
      delete safeGig.assignedTo.phone;
      delete safeGig.assignedTo.password;
    }
    
    delete safeGig.__v;
    delete safeGig.lastUpdatedBy;
    delete safeGig.deletedAt;
    delete safeGig.deletedBy;
    delete safeGig.version;

    ['createdAt', 'updatedAt'].forEach(dateField => {
      if (safeGig[dateField]) {
        try {
          if (safeGig[dateField] instanceof Date) {
            safeGig[dateField] = safeGig[dateField].toISOString();
          } else if (typeof safeGig[dateField] === 'string') {
          } else if (safeGig[dateField].toISOString) {
            safeGig[dateField] = safeGig[dateField].toISOString();
          }
        } catch (err) {
          console.warn(`Error processing date field ${dateField}:`, err);
          safeGig[dateField] = new Date().toISOString();
        }
      }
    });

    if (safeGig.communicationHistory && 
        userId !== safeGig.createdBy._id.toString() && 
        userId !== safeGig.assignedTo?._id?.toString() && 
        userRole !== 'admin') {
      delete safeGig.communicationHistory;
    }

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: safeGig,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      cached: shouldUseCache && gig !== undefined
    });

  } catch (error) {
    console.error('Error in getGigById:', error);
    
    const errorMessage = error.message || 'Internal server error';
    const errorCode = error.name === 'CastError' ? 'INVALID_ID_FORMAT' : 'SERVER_ERROR';
    
    res.status(500).json({
      success: false,
      message: `Error fetching gig: ${errorMessage}`,
      code: errorCode,
      requestId,
      timestamp: new Date().toISOString()
    });
    
    logAudit('ERROR', 'GIG', 'GET_BY_ID', req.user?._id, { 
      id: req.params.id, 
      error: error.message,
      stack: error.stack
    });
  }
};

// Update Gig
const updateGig = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    if (gig.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a deleted gig',
        code: 'GIG_DELETED',
        requestId
      });
    }

    const isOwner = gig.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssigned = gig.assignedTo && gig.assignedTo.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin && !isAssigned) {
      logAudit('UNAUTHORIZED_UPDATE', 'GIG', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    const sanitizedData = sanitizeGigInput(req.body);
    if (sanitizedData.subcategory !== undefined && 
        (sanitizedData.subcategory === '' || sanitizedData.subcategory === null)) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is required',
        code: 'SUBCATEGORY_REQUIRED',
        requestId
      });
    }
    // Handle empty assignedTo - set to null instead of empty string
    if (sanitizedData.assignedTo === '' || sanitizedData.assignedTo === null) {
      sanitizedData.assignedTo = null;
    }
    
    // Handle empty subcategory
    if (sanitizedData.subcategory === '' || sanitizedData.subcategory === null) {
      sanitizedData.subcategory = null;
    }
    
   
    if (!isAdmin) {
  const restrictedFields = [
    'status',
    'assignedTo',
    'paymentStatus',
    'paymentAmount',
    'depositPaid',
    'rating',
    'clientReview',
    'disputeStatus',
    'disputeReason'
  ];
  
  restrictedFields.forEach(field => {
    if (sanitizedData[field] !== undefined) {
      // Instead of just deleting, throw an error or ignore the field
      delete sanitizedData[field];
      // OR better: Log unauthorized attempt
      console.warn(`Non-admin attempted to update restricted field: ${field}`);
    }
  });
}

    if (sanitizedData.projectCategory && sanitizedData.projectCategory !== gig.projectCategory.toString()) {
      const category = await Category.findOne({ 
        _id: sanitizedData.projectCategory 
      });
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }
    }
if (sanitizedData.subcategory !== undefined) {
  if (sanitizedData.subcategory === '' || sanitizedData.subcategory === null) {
    // Allow clearing subcategory if needed
    sanitizedData.subcategory = null;
  } else {
    // Validate subcategory exists and belongs to the correct category
    const subcategory = await Subcategory.findOne({ 
      _id: sanitizedData.subcategory,
      category: sanitizedData.projectCategory || gig.projectCategory,
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
  }
} else if (!gig.subcategory) {
  // If subcategory is not being updated but gig doesn't have one
  return res.status(400).json({
    success: false,
    message: 'Subcategory is required',
    code: 'SUBCATEGORY_REQUIRED',
    requestId
  });
}

    const currentVersion = sanitizedData.version;
    delete sanitizedData.version;

    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    // Process uploaded images
    const existingImages = gig.images || [];
    let newImages = [];
    
    // Check for thumbnail
    if (req.files && req.files.thumbnail) {
      const thumbnailUpload = await uploadGigThumbnail(req.files.thumbnail[0], gig._id);
      if (thumbnailUpload) {
        updateData.thumbnail = thumbnailUpload;
        newImages.push(thumbnailUpload);
      }
    }
    
    // Check for other images
    if (req.files && req.files.images) {
      const images = await uploadGigImages(req.files.images, gig._id);
      newImages = [...newImages, ...images];
    }
    
    // Combine images if new ones were uploaded
    if (newImages.length > 0) {
      const combinedImages = [...existingImages];
      newImages.forEach(image => {
        const exists = combinedImages.some(img => img.public_id === image.public_id);
        if (!exists) {
          combinedImages.push(image);
        }
      });
      
      updateData.images = combinedImages;
      
      // Set thumbnail if not already set
      if (!updateData.thumbnail && newImages.length > 0) {
        updateData.thumbnail = {
          url: newImages[0].url,
          public_id: newImages[0].public_id,
          width: newImages[0].width,
          height: newImages[0].height,
          size: newImages[0].size,
          format: newImages[0].format,
          uploadedAt: newImages[0].uploadedAt
        };
      }
    }

    const updatedGig = await Gig.findOneAndUpdate(
      { 
        _id: id,
        deletedAt: null,
        ...(currentVersion ? { version: currentVersion } : {})
      },
      updateData,
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('projectCategory', 'name slug').populate('createdBy', 'name email');

    if (!updatedGig) {
      // Clean up uploaded images if update failed
      if (newImages.length > 0) {
        await deleteCloudinaryImages(newImages);
      }
      
      if (currentVersion) {
        const currentDoc = await Gig.findById(id);
        return res.status(409).json({
          success: false,
          message: 'Gig was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          currentVersion: currentDoc?.version,
          requestId
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Gig not found during update',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Invalidate cache after update
    await invalidateGigCache(id);

    logAudit('UPDATE', 'GIG', updatedGig._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion || gig.version,
      newVersion: updatedGig.version,
      imagesUpdated: newImages.length > 0
    });

    const safeGig = updatedGig.toObject();
    delete safeGig.__v;
    delete safeGig.lastUpdatedBy;
    delete safeGig.deletedAt;
    delete safeGig.deletedBy;
    delete safeGig.version;
    
    if (safeGig.createdBy) {
      delete safeGig.createdBy.email;
      delete safeGig.createdBy.phone;
      delete safeGig.createdBy.password;
    }

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: safeGig,
      message: 'Gig updated successfully',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Gig with similar title already exists',
        code: 'DUPLICATE_GIG',
        requestId
      });
    }
    
    logAudit('ERROR', 'GIG', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};
const getGigsBySubcategory = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { subcategoryId } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      sort = 'createdAt', 
      order = 'desc',
      minBudget,
      maxBudget,
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
      status: 'open',
      isActive: true
    };

    // Add optional filters
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = parseFloat(minBudget);
      if (maxBudget) filter.budget.$lte = parseFloat(maxBudget);
    }

    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {
      createdAt: -1,
      budget: order === 'asc' ? 1 : -1,
      rating: -1,
      deliveryTime: 1
    };

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .select('title slug description budget currency timeline timelineUnit skillsRequired deliverables images thumbnail createdBy')
        .populate('projectCategory', 'name slug icon')
        .populate('subcategory', 'name slug icon')
        .populate('createdBy', 'name picture')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Gig.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: gigs.map(gig => ({
        ...gig,
        hasImages: gig.images && gig.images.length > 0,
        priceFormatted: `${gig.currency || 'USD'} ${gig.budget || '0.00'}`
      })),
      subcategory: {
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        icon: subcategory.icon,
        description: subcategory.description,
        servicesCount: subcategory.servicesCount,
        gigsCount: subcategory.gigsCount
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
    console.error('Get gigs by subcategory error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gigs by subcategory',
      code: 'GIGS_BY_SUBCATEGORY_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
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
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    const isOwner = gig.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssigned = gig.assignedTo && gig.assignedTo.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs',
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

    // Upload images to Cloudinary
    const uploadedImages = await uploadGigImages(req.files, id);
    
    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload images',
        code: 'UPLOAD_FAILED',
        requestId
      });
    }

    const existingImages = gig.images || [];
    const updatedImages = [...existingImages, ...uploadedImages];
    
    if (updatedImages.length > 10) {
      // Delete newly uploaded images from Cloudinary
      await deleteCloudinaryImages(uploadedImages);
      return res.status(400).json({
        success: false,
        message: 'Cannot have more than 10 images',
        code: 'MAX_IMAGES_EXCEEDED',
        requestId
      });
    }

    // Update gig
    gig.images = updatedImages;
    
    // Set thumbnail if not already set
    if (!gig.thumbnail && uploadedImages.length > 0) {
      gig.thumbnail = {
        url: uploadedImages[0].url,
        public_id: uploadedImages[0].public_id,
        width: uploadedImages[0].width,
        height: uploadedImages[0].height,
        size: uploadedImages[0].size,
        format: uploadedImages[0].format,
        uploadedAt: uploadedImages[0].uploadedAt
      };
    }
    
    gig.lastUpdatedBy = req.user._id;
    gig.version += 1;
    await gig.save();

    // Invalidate cache after image upload
    await invalidateGigCache(id);

    logAudit('UPLOAD_IMAGES', 'GIG', id, req.user._id, {
      imagesAdded: uploadedImages.length,
      totalImages: updatedImages.length
    });

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: uploadedImages,
      totalImages: updatedImages.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload images error:', error);
    logAudit('ERROR', 'GIG', 'UPLOAD_IMAGES', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Remove Image from Gig
const removeImage = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id, publicId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    const isOwner = gig.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssigned = gig.assignedTo && gig.assignedTo.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Find image by public_id
    const imageIndex = gig.images.findIndex(img => img.public_id === publicId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in gig',
        code: 'IMAGE_NOT_FOUND',
        requestId
      });
    }

    const imageToRemove = gig.images[imageIndex];
    
    // Remove image from array
    gig.images.splice(imageIndex, 1);
    
    // If this was the thumbnail, set a new one or null
    if (gig.thumbnail && gig.thumbnail.public_id === publicId) {
      gig.thumbnail = gig.images.length > 0 ? {
        url: gig.images[0].url,
        public_id: gig.images[0].public_id,
        width: gig.images[0].width,
        height: gig.images[0].height,
        size: gig.images[0].size,
        format: gig.images[0].format,
        uploadedAt: gig.images[0].uploadedAt || new Date()
      } : null;
    }
    
    gig.lastUpdatedBy = req.user._id;
    gig.version += 1;
    await gig.save();

    // Delete image from Cloudinary
    await deleteCloudinaryImages([imageToRemove]);

    // Invalidate cache after image removal
    await invalidateGigCache(id);

    logAudit('REMOVE_IMAGE', 'GIG', id, req.user._id, {
      imagePublicId: publicId,
      remainingImages: gig.images.length
    });

    res.json({
      success: true,
      message: 'Image removed successfully',
      remainingImages: gig.images.length,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Remove image error:', error);
    logAudit('ERROR', 'GIG', 'REMOVE_IMAGE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Set Thumbnail for Gig
const setThumbnail = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id, publicId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    const isOwner = gig.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssigned = gig.assignedTo && gig.assignedTo.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Find image by public_id
    const image = gig.images.find(img => img.public_id === publicId);
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image not found in gig images',
        code: 'IMAGE_NOT_IN_GIG',
        requestId
      });
    }

    // Update thumbnail
    gig.thumbnail = {
      url: image.url,
      public_id: image.public_id,
      width: image.width,
      height: image.height,
      size: image.size,
      format: image.format,
      uploadedAt: image.uploadedAt || new Date()
    };
    
    gig.lastUpdatedBy = req.user._id;
    gig.version += 1;
    await gig.save();

    // Invalidate cache after thumbnail change
    await invalidateGigCache(id);

    logAudit('SET_THUMBNAIL', 'GIG', id, req.user._id, {
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
    logAudit('ERROR', 'GIG', 'SET_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Upload Thumbnail for Gig
const uploadThumbnail = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    const isOwner = gig.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssigned = gig.assignedTo && gig.assignedTo.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs',
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

    // Upload thumbnail to Cloudinary with optimized settings
    const uploadedImage = await uploadGigThumbnail(req.file, id);
    
    if (!uploadedImage) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload thumbnail',
        code: 'UPLOAD_FAILED',
        requestId
      });
    }

    // Delete old thumbnail from Cloudinary if exists
    if (gig.thumbnail && gig.thumbnail.public_id) {
      await deleteCloudinaryImages([{ public_id: gig.thumbnail.public_id }]);
    }
    
    // Update gig
    gig.thumbnail = {
      url: uploadedImage.url,
      public_id: uploadedImage.public_id,
      width: uploadedImage.width,
      height: uploadedImage.height,
      size: uploadedImage.size,
      format: uploadedImage.format,
      uploadedAt: uploadedImage.uploadedAt
    };
    
    // Add to images array if not already there
    const isAlreadyInImages = gig.images.some(img => img.public_id === uploadedImage.public_id);
    if (!isAlreadyInImages) {
      gig.images.push({
        url: uploadedImage.url,
        public_id: uploadedImage.public_id,
        width: uploadedImage.width,
        height: uploadedImage.height,
        size: uploadedImage.size,
        format: uploadedImage.format,
        uploadedAt: uploadedImage.uploadedAt
      });
    }
    
    gig.lastUpdatedBy = req.user._id;
    gig.version += 1;
    await gig.save();

    // Invalidate cache after thumbnail upload
    await invalidateGigCache(id);

    logAudit('UPLOAD_THUMBNAIL', 'GIG', id, req.user._id, {
      thumbnail: uploadedImage.url
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: uploadedImage,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload thumbnail error:', error);
    logAudit('ERROR', 'GIG', 'UPLOAD_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Delete Gig
const deleteGig = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  console.log('[DELETE GIG] Received request:', {
    id: req.params.id,
    params: req.params,
    query: req.query,
    user: req.user?.email
  });
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    console.log('[DELETE GIG] Validating ID:', id);
    
    // Improved ID validation
    if (!id || id === '[object Object]' || id === 'undefined' || id === 'null') {
      console.error('[DELETE GIG] Invalid ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }
 console.log('[DELETE GIG] Looking for gig with ID:', id);
    const gig = await Gig.findById(id);
    
    if (!gig) {
      console.error('[DELETE GIG] Gig not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    if (gig.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Gig is already deleted',
        code: 'ALREADY_DELETED',
        requestId
      });
    }

    const isOwner = gig.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      logAudit('UNAUTHORIZED_DELETE', 'GIG', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own gigs',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    if (force !== 'true' && gig.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete gig that is in progress',
        code: 'GIG_IN_PROGRESS',
        requestId
      });
    }

    let result;
    const now = new Date();
    
    if (permanent === 'true' && isAdmin) {
      if (gig.status === 'open') {
        await mongoose.model('Category').decrementGigsCount(gig.projectCategory);
      }
      // Removed Bid and Message deletion as requested
      
      result = await Gig.deleteOne({ _id: id });
      
      logAudit('PERMANENT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title || 'Unknown',
        createdBy: gig.createdBy,
        force: force === 'true'
      });
      
      const responseTime = Date.now() - startTime;
      
      return res.json({
        success: true,
        message: 'Gig permanently deleted',
        requestId,
        timestamp: now.toISOString(),
        responseTime: `${responseTime}ms`
      });
    } else {
      result = await Gig.findByIdAndUpdate(
        id,
        {
          isActive: false,
          deletedAt: now,
          deletedBy: req.user._id,
          lastUpdatedBy: req.user._id
        },
        {
          runValidators: false,
          new: true
        }
      );
      
      if (gig.status === 'open') {
        await mongoose.model('Category').decrementGigsCount(gig.projectCategory);
      }
      
      logAudit('SOFT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title || 'Unknown',
        createdBy: gig.createdBy
      });
      
      // Invalidate cache after deletion
      await invalidateGigCache(id);
      
      const responseTime = Date.now() - startTime;
      
      return res.json({
        success: true,
        message: 'Gig deleted successfully',
        data: {
          _id: gig._id,
          title: gig.title || 'Unknown',
          slug: gig.slug,
          isActive: false,
          deletedAt: now
        },
        requestId,
        timestamp: now.toISOString(),
        responseTime: `${responseTime}ms`
      });
    }

  } catch (error) {
    console.error('Delete gig error:', error);
    logAudit('ERROR', 'GIG', 'DELETE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    
    next(error);
  }
};

// Restore Gig (Admin Only)
const restoreGig = async (req, res, next) => {
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
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findById(id);
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    if (!gig.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Gig is not deleted',
        code: 'NOT_DELETED',
        requestId
      });
    }

    if (gig.projectCategory) {
      const category = await Category.findById(gig.projectCategory);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Cannot restore gig with non-existent category',
          code: 'CATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    gig.isActive = true;
    gig.deletedAt = null;
    gig.deletedBy = null;
    gig.lastUpdatedBy = req.user._id;
    await gig.save();

    // Invalidate cache after restoration
    await invalidateGigCache(id);

    logAudit('RESTORE', 'GIG', id, req.user._id);

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Gig restored successfully',
      data: {
        _id: gig._id,
        title: gig.title,
        slug: gig.slug,
        isActive: gig.isActive,
        status: gig.status
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'GIG', 'RESTORE', req.user._id, { error: error.message });
    next(error);
  }
};


// Get Gig Statistics
const getGigStats = async (req, res, next) => {
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

    if (!['admin', 'user'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access required for statistics',
        code: 'ACCESS_REQUIRED',
        requestId
      });
    }

    let filter = { deletedAt: null };
    
    if (req.user.role === 'user') {
      filter = {
        $or: [
          { createdBy: req.user._id, deletedAt: null },
          { assignedTo: req.user._id, deletedAt: null }
        ]
      };
    }

    // Generate cache key for stats
    const cacheKey = generateCacheKey('gig_stats', {
      userId: req.user._id,
      role: req.user.role
    });

    let stats;
    const shouldUseCache = true; // Always cache stats for 5 minutes

    if (shouldUseCache) {
      stats = await cache.get(cacheKey);
      if (stats) {
        console.log(`Cache hit for stats: ${cacheKey}`);
      }
    }

    if (!stats) {
      stats = await Gig.aggregate([
        { $match: filter },
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  totalGigs: { $sum: 1 },
                  openGigs: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                  inProgressGigs: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                  completedGigs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                  cancelledGigs: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                  assignedGigs: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
                  closedGigs: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                  totalBudget: { $sum: '$budget' },
                  avgBudget: { $avg: '$budget' },
                }
              }
            ],
            byCategory: [
              { $match: { status: 'open' } },
              {
                $group: {
                  _id: '$projectCategory',
                  count: { $sum: 1 },
                  avgBudget: { $avg: '$budget' },
                  maxBudget: { $max: '$budget' },
                  minBudget: { $min: '$budget' }
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
                  avgBudget: { $avg: '$budget' }
                }
              },
              { $sort: { count: -1 } }
            ],
            byUrgency: [
              {
                $group: {
                  _id: '$urgency',
                  count: { $sum: 1 },
                  avgBudget: { $avg: '$budget' }
                }
              },
              { $sort: { count: -1 } }
            ],
            topGigs: [
              { $match: { status: 'open' } },
              { $sort: { budget: -1 } },
              { $limit: 10 },
              {
                $project: {
                  title: 1,
                  budget: 1,
                  slug: 1,
                  projectCategory: 1
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
            budgetDistribution: [
              {
                $bucket: {
                  groupBy: "$budget",
                  boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, 100000],
                  default: "100000+",
                  output: {
                    count: { $sum: 1 },
                  }
                }
              }
            ],
          }
        }
      ]);

      if (shouldUseCache) {
        // Cache stats for 5 minutes
        await cache.set(cacheKey, stats, 300);
        console.log(`Cache set for stats: ${cacheKey}`);
      }
    }

    const sanitizedStats = stats[0] || {
      overview: [{
        totalGigs: 0,
        openGigs: 0,
        inProgressGigs: 0,
        completedGigs: 0,
        cancelledGigs: 0,
        assignedGigs: 0,
        closedGigs: 0,
        totalBudget: 0,
        avgBudget: 0,
      }],
      byCategory: [],
      byStatus: [],
      byUrgency: [],
      topGigs: [],
      growth: [],
      budgetDistribution: [],
    };

    if (!sanitizedStats.overview || sanitizedStats.overview.length === 0) {
      sanitizedStats.overview = [{
        totalGigs: 0,
        openGigs: 0,
        inProgressGigs: 0,
        completedGigs: 0,
        cancelledGigs: 0,
        assignedGigs: 0,
        closedGigs: 0,
        totalBudget: 0,
        avgBudget: 0,
      }];
    }

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: sanitizedStats,
      requestId,
      timestamp: new Date().toISOString(),
      generatedAt: new Date(),
      responseTime: `${responseTime}ms`,
      cached: shouldUseCache && stats !== undefined
    });

  } catch (error) {
    console.error('Error in getGigStats:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      data: {
        overview: [{
          totalGigs: 0,
          openGigs: 0,
          inProgressGigs: 0,
          completedGigs: 0,
          cancelledGigs: 0,
          assignedGigs: 0,
          closedGigs: 0,
          totalBudget: 0,
          avgBudget: 0,
        }],
        byCategory: [],
        byStatus: [],
        byUrgency: [],
        topGigs: [],
        growth: [],
        budgetDistribution: [],
      },
      message: 'Error fetching statistics',
      error: error.message,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
};

// Export Gigs
const exportGigs = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
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
    
    const filter = buildSecureGigQuery(queryParams, 'admin', req.user._id);

    const count = await Gig.countDocuments(filter);
    if (count > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Export limit exceeded (max 10,000 records)',
        code: 'EXPORT_LIMIT_EXCEEDED',
        requestId
      });
    }

    const gigs = await Gig.find(filter)
      .select('-__v -lastUpdatedBy -deletedAt -deletedBy -version -communicationHistory')
      .populate('projectCategory', 'name slug')
      .populate('createdBy', 'name email')
      .lean();

    if (format === 'csv') {
      const headers = [
        'ID', 'Title', 'Slug', 'Description', 'Budget', 'Currency', 
        'Category', 'Status', 'Urgency', 'Visibility', 'Created By',
        'Assigned To', 'Created At', 'Updated At',
        'Skills Required', 'Deliverables'
      ];

      const csvRows = gigs.map(gig => [
        gig._id,
        `"${(gig.title || '').replace(/"/g, '""')}"`,
        gig.slug || '',
        `"${(gig.description || '').replace(/"/g, '""')}"`,
        gig.budget || 0,
        gig.currency || 'USD',
        gig.projectCategory?.name || '',
        gig.status || 'open',
        gig.urgency || 'medium',
        gig.visibility || 'public',
        gig.createdBy?.name || '',
        gig.assignedTo?.name || '',
        new Date(gig.createdAt).toISOString(),
        new Date(gig.updatedAt).toISOString(),
        `"${(gig.skillsRequired || []).join(', ').replace(/"/g, '""')}"`,
        `"${(gig.deliverables || []).join(', ').replace(/"/g, '""')}"`
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', count);
      res.header('X-Export-Timestamp', new Date().toISOString());
      res.header('X-Response-Time', `${Date.now() - startTime}ms`);
      
      return res.send(csvContent);
    }

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      format: 'json',
      count,
      data: gigs,
      exportedAt: new Date().toISOString(),
      requestId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'GIG', 'EXPORT', req.user?._id, { 
      format: req.query.format,
      error: error.message 
    });
    next(error);
  }
};

module.exports = {
  createGig,
  getGigs,
  searchGigs,
  getGigById,
  updateGig,
  deleteGig,
  restoreGig,
  getGigStats,
  exportGigs,
  uploadImages,
  removeImage,
  setThumbnail,
  uploadThumbnail,
  getGigsBySubcategory
};