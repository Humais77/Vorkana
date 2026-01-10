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
  
  // List of fields that should be sanitized as text
  const textFields = [
    'title', 'fullName', 'oauthEmail', 'country', 'phone', 
    'description', 'timeline', 'clientReview', 'disputeReason',
    'slug', 'communication'
  ];
  
  // List of fields that should remain as-is (numbers, booleans, etc.)
  const preserveFields = ['budget', 'version', 'rating', 'paymentAmount', 'depositPaid'];
  
  // List of array fields that contain strings
  const stringArrayFields = ['skillsRequired', 'deliverables', 'removeImages'];
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    
    // Skip preserved fields
    if (preserveFields.includes(key)) {
      return;
    }
    
    // Handle string fields
    if (textFields.includes(key) && typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    }
    
    // Handle string array fields
    else if (stringArrayFields.includes(key) && Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'string') {
          return sanitizeText(item);
        }
        return item;
      }).filter(item => item !== null && item !== undefined);
    }
    
    // Handle object fields recursively
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeGigInput(value);
    }
  });
  
  // Special handling for email - lowercase and trim
  if (sanitized.oauthEmail && typeof sanitized.oauthEmail === 'string') {
    sanitized.oauthEmail = sanitized.oauthEmail.toLowerCase().trim();
  }
  
  // Special handling for currency - uppercase
  if (sanitized.currency && typeof sanitized.currency === 'string') {
    sanitized.currency = sanitized.currency.toUpperCase();
  }
  
  return sanitized;
};

const uploadGigImages = async (files, gigId) => {
  if (!files || files.length === 0) return [];

  const uploaded = await processUploadToCloudinary(files, 'gigs');

  return uploaded.map(img => ({
    url: img.url,
    public_id: img.public_id,
    width: img.width,
    height: img.height,
    size: img.size,
    format: img.format,
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
const invalidateGigCache = async (gigId) => {
  try {
    const cache = require('../utils/cache.js');
    
    // Get gig details for more targeted invalidation
    const gig = await Gig.findById(gigId).select('projectCategory subcategory status slug');
    
    if (gig) {
      // Invalidate specific gig cache
      await cache.del(`gig:${gigId}`);
      await cache.del(`gig:slug:${gig.slug}`);
      
      // Invalidate common list caches (without pattern matching)
      const cacheKeysToDelete = [
        `gigs:list:page:1:limit:10`, // Default pagination
        `gigs:list:page:1:limit:12`,
        `gigs:category:${gig.projectCategory}:page:1`,
        `gigs:status:${gig.status}:page:1`,
        `gigs:user:${gig.createdBy}:page:1`,
      ];
      
      // Add subcategory cache if exists
      if (gig.subcategory) {
        cacheKeysToDelete.push(`gigs:subcategory:${gig.subcategory}:page:1`);
      }
      
      // Delete specific cache keys
      for (const key of cacheKeysToDelete) {
        try {
          await cache.del(key);
        } catch (err) {
          // Ignore errors for non-existent keys
        }
      }
      
      // Invalidate stats cache
      await cache.del('gig_stats:*');
      
      console.log(`Cache invalidated for gig ${gigId}`);
    }
  } catch (err) {
    console.error('Error in cache invalidation:', err.message);
    // Don't throw - cache invalidation failure shouldn't break the request
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
 let createdByParam = createdBy;
  if (createdBy === 'me' && req.user && req.user._id) {
    createdByParam = req.user._id;
  }
  
  // Parse assignedTo before building query
  let assignedToParam = assignedTo;
  if (assignedTo === 'me' && req.user && req.user._id) {
    assignedToParam = req.user._id;
  }
  
    const filter = buildSecureGigQuery({
      search: search || q,
      title,
      slug,
      projectCategory,
      subcategory,
      createdBy: createdByParam,
    assignedTo: assignedToParam,
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
const parseFormDataValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  
  // If it's already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    
    if (trimmedValue === '') {
      return undefined;
    }
    
    // Handle version specifically - must be integer
    if (/^-?\d+$/.test(trimmedValue)) {
      return parseInt(trimmedValue, 10);
    }
    
    // Handle budget/float
    if (/^-?\d*\.?\d+$/.test(trimmedValue)) {
      return parseFloat(trimmedValue);
    }
    
    // Handle boolean
    if (trimmedValue.toLowerCase() === 'true') return true;
    if (trimmedValue.toLowerCase() === 'false') return false;
    
    return trimmedValue;
  }
  
  return value;
};

// Helper function to parse FormData with better handling
const parseFormData = (body, files) => {
  const parsed = {};
  
  // Parse simple fields first
  const simpleFields = [
    'title', 'fullName', 'oauthEmail', 'country', 'phone', 'projectCategory', 
    'subcategory', 'description', 'budget', 'currency', 'timeline', 'timelineUnit', 
    'communication', 'urgency', 'visibility', 'version'
  ];
  
  simpleFields.forEach(field => {
    if (body[field] !== undefined) {
      parsed[field] = parseFormDataValue(body[field]);
    }
  });
  
  // Handle array fields - check for indexed format first
  ['skillsRequired', 'deliverables'].forEach(field => {
    const arrayValues = [];
    
    // Check for indexed format: field[0], field[1], etc.
    const fieldRegex = new RegExp(`^${field}\\[\\d+\\]$`);
    Object.keys(body).forEach(key => {
      if (fieldRegex.test(key)) {
        const value = body[key];
        if (value && value.trim()) {
          arrayValues.push(value.trim());
        }
      }
    });
    
    // If we found indexed values, use them
    if (arrayValues.length > 0) {
      parsed[field] = arrayValues;
    } 
    // Otherwise check for regular field
    else if (body[field] !== undefined) {
      const value = parseFormDataValue(body[field]);
      if (Array.isArray(value)) {
        parsed[field] = value;
      } else if (typeof value === 'string') {
        // Try to split by commas
        parsed[field] = value.split(',').map(item => item.trim()).filter(item => item);
      } else if (value !== undefined) {
        parsed[field] = [value];
      }
    }
  });
  
  // Handle files
  if (files) {
    Object.keys(files).forEach(key => {
      parsed[key] = files[key];
    });
  }
  
  return parsed;
};
// Helper function to validate and clean gig ID
const validateGigId = (id) => {
  if (!id) {
    return { valid: false, message: 'Gig ID is required' };
  }
  
  let cleanId = id;
  
  // If it's an object, try to extract ID
  if (typeof cleanId === 'object') {
    if (cleanId._id) {
      cleanId = cleanId._id;
    } else if (cleanId.id) {
      cleanId = cleanId.id;
    } else {
      // Try to stringify and extract
      try {
        const str = JSON.stringify(cleanId);
        // Extract MongoDB-like ObjectId (24 hex chars)
        const match = str.match(/[a-f0-9]{24}/i);
        if (match) {
          cleanId = match[0];
        }
      } catch (e) {
        // Continue with original
      }
    }
  }
  
  // Convert to string and clean
  cleanId = String(cleanId).trim();
  
  // Remove any quotes or brackets
  cleanId = cleanId.replace(/^["'{(\[]+|["'})\]]+$/g, '');
  
  // Validate as MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(cleanId)) {
    return { 
      valid: false, 
      message: 'Invalid gig ID format',
      cleanedId: cleanId 
    };
  }
  
  return { valid: true, cleanedId: cleanId };
};
// gig.controller.js - Fixed and enhanced updateGig function
const updateGig = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log('=== UPDATE GIG STARTED ===', {
    requestId,
    gigId: req.params.id,
    user: req.user?._id,
    method: req.method,
    contentType: req.headers['content-type']
  });
  
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${requestId}] Invalid gig ID: ${id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    // Find the gig
    console.log(`[${requestId}] Finding gig: ${id}`);
    const gig = await Gig.findById(id)
      .populate('projectCategory', '_id name')
      .populate('subcategory', '_id name category');
    
    if (!gig) {
      console.error(`[${requestId}] Gig not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    // Check if gig is deleted
    if (gig.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a deleted gig',
        code: 'GIG_DELETED',
        requestId
      });
    }

    // Authorization check
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

    // Parse and validate version
    let clientVersion = gig.version;
    if (req.body.version !== undefined) {
      const parsedVersion = parseInt(req.body.version, 10);
      if (isNaN(parsedVersion)) {
        return res.status(400).json({
          success: false,
          message: 'Version must be a valid number',
          code: 'INVALID_VERSION',
          requestId
        });
      }
      clientVersion = parsedVersion;
    }

    // Version conflict check for non-admins
    if (!isAdmin && clientVersion !== gig.version) {
      console.warn(`[${requestId}] Version conflict: client=${clientVersion}, server=${gig.version}`);
      return res.status(409).json({
        success: false,
        message: 'Gig was modified by another user. Please refresh and try again.',
        code: 'VERSION_CONFLICT',
        currentVersion: gig.version,
        requestId
      });
    }

    // Parse request data based on content type
    let sanitizedData = {};
    console.log(`[${requestId}] Parsing request data, content-type: ${req.headers['content-type']}`);
    
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Handle multipart form data
      console.log(`[${requestId}] Processing multipart/form-data`);
      sanitizedData = await parseMultipartFormData(req);
    } else {
      // Handle JSON data
      console.log(`[${requestId}] Processing JSON data`);
      sanitizedData = sanitizeGigInput(req.body);
      
      // Convert specific fields
      if (sanitizedData.budget !== undefined) {
        const budgetNum = parseFloat(sanitizedData.budget);
        if (isNaN(budgetNum) || budgetNum < 0) {
          return res.status(400).json({
            success: false,
            message: 'Budget must be a valid positive number',
            code: 'INVALID_BUDGET',
            requestId
          });
        }
        sanitizedData.budget = budgetNum;
      }
    }

    // Validate required fields if they're being updated
    const validationErrors = [];
    if (sanitizedData.title !== undefined && (!sanitizedData.title || sanitizedData.title.trim().length === 0)) {
      validationErrors.push({ field: 'title', message: 'Title is required' });
    }
    
    if (sanitizedData.description !== undefined && (!sanitizedData.description || sanitizedData.description.trim().length === 0)) {
      validationErrors.push({ field: 'description', message: 'Description is required' });
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

    // Validate subcategory if being updated
    if (sanitizedData.subcategory !== undefined) {
      if (sanitizedData.subcategory === null || sanitizedData.subcategory === '') {
        sanitizedData.subcategory = null;
      } else {
        // Validate subcategory exists and belongs to category
        const subcategory = await Subcategory.findOne({
          _id: sanitizedData.subcategory,
          isActive: true
        });
        
        if (!subcategory) {
          return res.status(400).json({
            success: false,
            message: 'Subcategory not found or inactive',
            code: 'SUBCATEGORY_NOT_FOUND',
            requestId
          });
        }
        
        // Check if subcategory belongs to the selected category
        const categoryId = sanitizedData.projectCategory || gig.projectCategory._id.toString();
        if (subcategory.category.toString() !== categoryId) {
          return res.status(400).json({
            success: false,
            message: 'Subcategory does not belong to the selected category',
            code: 'SUBCATEGORY_MISMATCH',
            requestId
          });
        }
      }
    }

    // Handle image uploads using unified function
    let imageOperations = {};
    if (req.files && (req.files.images || req.files.thumbnail)) {
      console.log(`[${requestId}] Processing image uploads`);
      try {
        imageOperations = await handleImageOperations(req, gig);
        
        // Check if we need to delete old thumbnail
        if (imageOperations.thumbnail && gig.thumbnail && gig.thumbnail.public_id) {
          imageOperations.imagesToDelete.push({ public_id: gig.thumbnail.public_id });
        }
      } catch (error) {
        console.error(`[${requestId}] Image upload failed:`, error);
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'IMAGE_UPLOAD_FAILED',
          requestId
        });
      }
    }

    // Build update data
    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    // Handle images in update
    if (imageOperations.images && imageOperations.images.length > 0) {
      // Combine existing images with new ones, avoiding duplicates
      const existingImages = gig.images || [];
      const newImages = imageOperations.images.filter(newImg => 
        !existingImages.some(existing => existing.public_id === newImg.public_id)
      );
      
      updateData.$push = { images: { $each: newImages } };
    }

    // Handle thumbnail
    if (imageOperations.thumbnail) {
      updateData.thumbnail = imageOperations.thumbnail;
    }

    // Remove specified images if requested
    if (sanitizedData.removeImages && Array.isArray(sanitizedData.removeImages)) {
      updateData.$pull = { images: { public_id: { $in: sanitizedData.removeImages } } };
      
      // Also remove from thumbnail if it's in the list
      if (gig.thumbnail && sanitizedData.removeImages.includes(gig.thumbnail.public_id)) {
        updateData.thumbnail = null;
      }
    }

    console.log(`[${requestId}] Performing update with conditions:`, {
      id,
      version: gig.version,
      userIsAdmin: isAdmin
    });

    // Perform update with optimistic concurrency control
    const queryConditions = { 
      _id: id,
      deletedAt: null
    };
    
    // Add version condition for optimistic locking (except admin overrides)
    if (!isAdmin) {
      queryConditions.version = gig.version;
    }

    const updatedGig = await Gig.findOneAndUpdate(
      queryConditions,
      updateData,
      { 
        new: true,
        runValidators: true,
        context: 'query',
        populate: [
          { path: 'projectCategory', select: 'name slug icon' },
          { path: 'subcategory', select: 'name slug icon' },
          { path: 'createdBy', select: 'name picture' }
        ]
      }
    );

    if (!updatedGig) {
      // Check why update failed
      const currentGig = await Gig.findById(id);
      
      if (!currentGig) {
        return res.status(404).json({
          success: false,
          message: 'Gig not found during update',
          code: 'UPDATE_FAILED',
          requestId
        });
      }
      
      // Version conflict
      if (currentGig.version !== gig.version) {
        return res.status(409).json({
          success: false,
          message: 'Gig was modified by another user. Please refresh and try again.',
          code: 'VERSION_CONFLICT',
          currentVersion: currentGig.version,
          requestId
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Update failed. Please try again.',
        code: 'UPDATE_FAILED',
        requestId
      });
    }

    // Clean up old images from Cloudinary if needed
    if (imageOperations.imagesToDelete && imageOperations.imagesToDelete.length > 0) {
      try {
        await deleteCloudinaryImages(imageOperations.imagesToDelete);
        console.log(`[${requestId}] Deleted ${imageOperations.imagesToDelete.length} old images from Cloudinary`);
      } catch (error) {
        console.error(`[${requestId}] Failed to delete old images:`, error);
        // Don't fail the request, just log the error
      }
    }

    // Invalidate cache
    await invalidateGigCache(id);

    // Log audit
    logAudit('UPDATE', 'GIG', id, req.user._id, {
      fieldsUpdated: Object.keys(sanitizedData),
      hasImages: !!(req.files && (req.files.images || req.files.thumbnail)),
      newVersion: updatedGig.version
    });

    // Prepare response
    const safeGig = updatedGig.toObject ? updatedGig.toObject() : updatedGig;
    
    // Remove sensitive information
    delete safeGig.__v;
    delete safeGig.lastUpdatedBy;
    delete safeGig.deletedAt;
    delete safeGig.deletedBy;
    delete safeGig.communicationHistory;
    
    if (safeGig.createdBy && safeGig.createdBy.email) {
      delete safeGig.createdBy.email;
    }

    const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] Update completed in ${responseTime}ms`);
    
    res.json({
      success: true,
      data: safeGig,
      message: 'Gig updated successfully',
      newVersion: updatedGig.version,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error(`[${requestId}] Update gig error:`, error);
    
    // Clean up uploaded files if error occurred
    if (req.files && (req.files.images || req.files.thumbnail)) {
      try {
        const uploadedImages = [];
        if (req.files.images) uploadedImages.push(...req.files.images);
        if (req.files.thumbnail) uploadedImages.push(...req.files.thumbnail);
        
        if (uploadedImages.length > 0) {
          // Extract public_ids from uploaded files if they were uploaded to Cloudinary
          // This is a simplified version - you'd need to track which files were successfully uploaded
        }
      } catch (cleanupError) {
        console.error(`[${requestId}] Error during cleanup:`, cleanupError);
      }
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Gig with similar title already exists',
        code: 'DUPLICATE_GIG',
        requestId
      });
    }
    
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
    
    logAudit('ERROR', 'GIG', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message,
      stack: error.stack
    });
    
    next(error);
  }
};

// Helper function for parsing multipart form data
const parseMultipartFormData = async (req) => {
  const data = {};
  
  // Parse simple text fields
  const textFields = [
    'title', 'fullName', 'oauthEmail', 'country', 'phone', 'projectCategory', 
    'subcategory', 'description', 'currency', 'timeline', 'timelineUnit', 
    'communication', 'urgency', 'visibility', 'status', 'version',
    'removeImages'  // For removing specific images
  ];
  
  textFields.forEach(field => {
    if (req.body[field] !== undefined && req.body[field] !== '') {
      data[field] = req.body[field];
    }
  });
  
  // Parse budget
  if (req.body.budget !== undefined && req.body.budget !== '') {
    const budgetNum = parseFloat(req.body.budget);
    if (!isNaN(budgetNum)) {
      data.budget = budgetNum;
    }
  }
  
  // Parse array fields
  ['skillsRequired', 'deliverables', 'removeImages'].forEach(field => {
    const values = [];
    
    // Check for indexed format
    const arrayPattern = new RegExp(`^${field}\\[\\d+\\]$`);
    Object.keys(req.body).forEach(key => {
      if (arrayPattern.test(key)) {
        const value = req.body[key];
        if (value && value.trim()) {
          values.push(value.trim());
        }
      }
    });
    
    // If no indexed values, check direct field
    if (values.length === 0 && req.body[field]) {
      const value = req.body[field];
      if (Array.isArray(value)) {
        values.push(...value);
      } else if (typeof value === 'string') {
        values.push(...value.split(',').map(item => item.trim()).filter(item => item));
      }
    }
    
    if (values.length > 0) {
      data[field] = values;
    }
  });
  
  // Sanitize the data
  return sanitizeGigInput(data);
};

// Unified image operations handler
const handleImageOperations = async (req, gig) => {
  const operations = {
    images: [],
    thumbnail: null,
    imagesToDelete: []
  };
  
  const existingImages = gig.images || [];
  
  // Handle thumbnail upload
  if (req.files.thumbnail && req.files.thumbnail.length > 0) {
    console.log('Processing thumbnail upload');
    const thumbnailResult = await uploadGigThumbnail(req.files.thumbnail[0], gig._id);
    if (thumbnailResult) {
      operations.thumbnail = thumbnailResult;
      
      // Check if this image already exists
      const isDuplicate = existingImages.some(img => img.public_id === thumbnailResult.public_id);
      if (!isDuplicate) {
        operations.images.push(thumbnailResult);
      }
    }
  }
  
  // Handle regular image uploads
  if (req.files.images && req.files.images.length > 0) {
    console.log(`Processing ${req.files.images.length} image uploads`);
    const uploadedImages = await uploadGigImages(req.files.images, gig._id);
    
    // Filter out duplicates
    const newImages = uploadedImages.filter(newImg => 
      !existingImages.some(existing => existing.public_id === newImg.public_id)
    );
    
    operations.images.push(...newImages);
  }
  
  // Validate total images don't exceed limit
  const totalImages = existingImages.length + operations.images.length;
  if (totalImages > 10) {
    // Clean up uploaded images
    if (operations.images.length > 0) {
      await deleteCloudinaryImages(operations.images);
    }
    throw new Error('Cannot have more than 10 images. Current: ' + existingImages.length);
  }
  
  return operations;
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

const deleteGig = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  console.log('[DELETE GIG] Request:', {
    requestId,
    id: req.params.id,
    user: req.user?.email,
    role: req.user?.role,
    query: req.query
  });
  
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

    // Validate ID
    if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') {
      console.error('[DELETE GIG] Invalid ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID format',
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

    // Find the gig with necessary relations
    console.log(`[${requestId}] Finding gig: ${id}`);
    const gig = await Gig.findById(id)
      .populate('projectCategory', '_id name')
      .populate('subcategory', '_id name');
    
    if (!gig) {
      console.error(`[${requestId}] Gig not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    // Check if already deleted
    if (gig.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Gig is already deleted',
        code: 'ALREADY_DELETED',
        requestId
      });
    }

    // Authorization check
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

    // Check if gig can be deleted
    if (force !== 'true') {
      const cannotDeleteStatuses = ['in_progress', 'assigned', 'completed'];
      if (cannotDeleteStatuses.includes(gig.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete gig with status: ${gig.status}`,
          code: 'GIG_NOT_DELETABLE',
          requestId
        });
      }
    }

    let result;
    const now = new Date();
    
    // Permanent deletion (admin only)
    if (permanent === 'true' && isAdmin) {
      console.log(`[${requestId}] Permanent delete requested by admin`);
      
      // Decrement category counts if gig was open
      if (gig.status === 'open') {
        try {
          await mongoose.model('Category').decrementGigsCount(gig.projectCategory._id);
          console.log(`[${requestId}] Decremented category count: ${gig.projectCategory._id}`);
          
          if (gig.subcategory) {
            await mongoose.model('Subcategory').decrementGigsCount(gig.subcategory._id);
            console.log(`[${requestId}] Decremented subcategory count: ${gig.subcategory._id}`);
          }
        } catch (error) {
          console.error(`[${requestId}] Error decrementing counts:`, error);
          // Continue with deletion even if count decrement fails
        }
      }
      
      // Delete images from Cloudinary
      try {
        const imagesToDelete = [];
        
        if (gig.thumbnail && gig.thumbnail.public_id) {
          imagesToDelete.push({ public_id: gig.thumbnail.public_id });
        }
        
        if (gig.images && gig.images.length > 0) {
          gig.images.forEach(img => {
            if (img.public_id) {
              imagesToDelete.push({ public_id: img.public_id });
            }
          });
        }
        
        if (imagesToDelete.length > 0) {
          await deleteCloudinaryImages(imagesToDelete);
          console.log(`[${requestId}] Deleted ${imagesToDelete.length} images from Cloudinary`);
        }
      } catch (error) {
        console.error(`[${requestId}] Error deleting images:`, error);
        // Continue with deletion even if image deletion fails
      }
      
      // Perform hard delete
      result = await Gig.deleteOne({ _id: id });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Gig not found during deletion',
          code: 'DELETE_FAILED',
          requestId
        });
      }
      
      logAudit('PERMANENT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title,
        status: gig.status,
        force: force === 'true'
      });
      
    } else {
      // Soft delete
      console.log(`[${requestId}] Soft delete requested`);
      
      // Decrement category counts if gig was open
      if (gig.status === 'open') {
        try {
          await mongoose.model('Category').decrementGigsCount(gig.projectCategory._id);
          console.log(`[${requestId}] Decremented category count for soft delete`);
          
          if (gig.subcategory) {
            await mongoose.model('Subcategory').decrementGigsCount(gig.subcategory._id);
            console.log(`[${requestId}] Decremented subcategory count for soft delete`);
          }
        } catch (error) {
          console.error(`[${requestId}] Error decrementing counts for soft delete:`, error);
        }
      }
      
      // Update gig with soft delete fields
      result = await Gig.findByIdAndUpdate(
        id,
        {
          isActive: false,
          status: gig.status === 'open' ? 'closed' : gig.status,
          deletedAt: now,
          deletedBy: req.user._id,
          lastUpdatedBy: req.user._id,
          $inc: { version: 1 }
        },
        {
          runValidators: false,
          new: true,
          select: '_id title slug status isActive deletedAt'
        }
      );
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Gig not found during soft delete',
          code: 'SOFT_DELETE_FAILED',
          requestId
        });
      }
      
      logAudit('SOFT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title,
        status: gig.status
      });
    }
    
    // Invalidate cache
    await invalidateGigCache(id);
    
    const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] Delete completed in ${responseTime}ms`);
    
    res.json({
      success: true,
      message: permanent === 'true' ? 'Gig permanently deleted' : 'Gig deleted successfully',
      data: permanent === 'true' ? null : result,
      requestId,
      timestamp: now.toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error(`[${requestId}] Delete gig error:`, error);
    
    const errorResponse = {
      success: false,
      message: 'Failed to delete gig',
      code: 'DELETE_ERROR',
      requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error.name === 'CastError') {
      errorResponse.message = 'Invalid gig ID format';
      errorResponse.code = 'INVALID_ID';
      return res.status(400).json(errorResponse);
    }
    
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
const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || generateRequestId();
  
  console.error(`[ERROR_HANDLER] ${requestId}:`, {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?._id
  });
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      type: e.kind
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
      code: 'VALIDATION_ERROR',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      code: 'DUPLICATE_KEY',
      field,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      code: 'INVALID_ID',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Cloudinary errors
  if (err.http_code && err.http_code >= 400) {
    return res.status(400).json({
      success: false,
      message: 'Image upload failed',
      code: 'CLOUDINARY_ERROR',
      details: err.message,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Rate limit errors
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  return res.status(statusCode).json({
    success: false,
    message,
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
// Add this to gig.controller.js
const healthCheck = async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  const checks = {
    database: { status: 'unknown', latency: 0 },
    cache: { status: 'unknown', latency: 0 },
    cloudinary: { status: 'unknown', latency: 0 },
    storage: { status: 'unknown', latency: 0 }
  };
  
  try {
    // Check database connection
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
      connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
    
    // Check cache connection
    const cacheStart = Date.now();
    try {
      const cache = require('../utils/cache.js');
      const ping = await cache.ping();
      checks.cache = {
        status: ping === 'PONG' ? 'healthy' : 'unhealthy',
        latency: Date.now() - cacheStart
      };
    } catch (cacheErr) {
      checks.cache = {
        status: 'unhealthy',
        latency: Date.now() - cacheStart,
        error: cacheErr.message
      };
    }
    
    // Check Cloudinary configuration
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      checks.cloudinary = {
        status: 'configured',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      };
    } else {
      checks.cloudinary = {
        status: 'not_configured',
        warning: 'Cloudinary not configured'
      };
    }
    
    // Check file storage
    const storageDir = path.join(__dirname, '../../public/uploads/temp');
    const storageStart = Date.now();
    try {
      fs.accessSync(storageDir, fs.constants.W_OK);
      checks.storage = {
        status: 'healthy',
        latency: Date.now() - storageStart,
        writable: true
      };
    } catch (storageErr) {
      checks.storage = {
        status: 'unhealthy',
        latency: Date.now() - storageStart,
        error: storageErr.message,
        writable: false
      };
    }
    
    // Determine overall status
    const allHealthy = Object.values(checks).every(check => 
      check.status === 'healthy' || check.status === 'configured' || check.status === 'not_configured'
    );
    
    const status = allHealthy ? 'healthy' : 'degraded';
    const responseTime = Date.now() - startTime;
    
    res.status(allHealthy ? 200 : 503).json({
      status,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      responseTime: `${responseTime}ms`,
      requestId,
      version: process.env.npm_package_version || '1.0.0'
    });
    
  } catch (error) {
    console.error(`[HEALTH_CHECK_ERROR] ${requestId}:`, error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(503).json({
      status: 'unhealthy',
      checks,
      error: error.message,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      requestId
    });
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
  getGigsBySubcategory,
  errorHandler,
  healthCheck
};