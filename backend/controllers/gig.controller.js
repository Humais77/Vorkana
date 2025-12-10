const mongoose = require('mongoose');
const crypto = require('crypto');
const Gig = require('../models/gig.model.js');
const Category = require('../models/category.model.js');
const User = require('../models/user.model.js');
const { sanitizeHtml, sanitizeObject, sanitizeText } = require('../utils/sanitize.js');

const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const sanitizeGigInput = (data) => {
  // If it's FormData, return it as is - we'll handle it separately
  if (data instanceof FormData) {
    return data;
  }
  
  const skipKeys = ['projectCategory', 'subcategory', 'assignedTo', 'selectedProposal', 
                   'createdBy', 'lastUpdatedBy', 'budget', 'price', 'amount', 
                   'paymentAmount', 'depositPaid', 'rating', 'deliveryTime', 'version'];
  
  // Use the safe sanitize function
  return safeSanitizeGigInput(data);
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
    hasAttachments,
    hasProposals,
    hasMilestones,
    skillsRequired,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    deadlineAfter,
    deadlineBefore,
    ids,
    excludeIds,
    showAll = false,
  } = queryParams;

  const filter = {};

  // Security: Apply appropriate filters based on user role
  if (showAll && userRole === 'admin') {
    // Admin can see everything
    if (status !== undefined) {
      filter.status = status;
    }
    filter.deletedAt = null;
  } else if (userRole === 'seller' && userId) {
    // Seller can see their assigned gigs, their own gigs, and public gigs
    filter.$or = [
      { assignedTo: userId, deletedAt: null },
      { createdBy: userId, deletedAt: null },
      { 
        status: 'open',
        visibility: 'public',
        deletedAt: null
      }
    ];
  } else if (userRole === 'user' && userId) {
    // Regular users can see their own gigs and public gigs
    filter.$or = [
      { createdBy: userId, deletedAt: null },
      { 
        status: 'open',
        visibility: 'public',
        deletedAt: null
      }
    ];
  } else {
    // Public/guest access
    filter.status = 'open';
    filter.visibility = 'public';
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
  
  // Boolean existence filters
  if (hasAttachments === true || hasAttachments === 'true') {
    filter.attachments = { $exists: true, $ne: [] };
  }
  
  if (hasProposals === true || hasProposals === 'true') {
    filter.proposals = { $exists: true, $ne: [] };
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
  addDateFilter('deadline', deadlineAfter, '$gte');
  addDateFilter('deadline', deadlineBefore, '$lte');

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


    let sanitizedData;
    if (req.body instanceof FormData || req.is('multipart/form-data')) {
      // For FormData, we need to extract fields manually
      const formData = {};
      if (req.body instanceof FormData) {
        // In Node.js, FormData might be parsed differently
        // You'll need to handle this based on your middleware
      } else if (req.body) {
        // If multer or similar middleware has already parsed it
        sanitizedData = req.body;
      }
    } else {
      sanitizedData = sanitizeGigInput(req.body);
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
      _id: sanitizedData.projectCategory 
      // Removed: , isActive: true 
    });
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Validate subcategory if provided
    if (sanitizedData.subcategory) {
      const subcategory = await Category.findOne({ 
        _id: sanitizedData.subcategory,
        parentCategory: sanitizedData.projectCategory 
      });
      
      if (!subcategory) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory not found or does not belong to the selected category',
          code: 'SUBCATEGORY_NOT_FOUND',
          requestId
        });
      }
    }

    const gigData = {
      ...sanitizedData,
      title: sanitizedData.title || `Project ${Date.now()}`,
      fullName: req.user.fullName || sanitizedData.fullName || req.user.username,
      oauthEmail: req.user.email || sanitizedData.oauthEmail,
      createdBy: req.user._id,
      version: 1
    };

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const attachments = [];
      const files = [];
      
      req.files.forEach(file => {
        const filePath = `/uploads/${file.filename}`;
        
        // Distinguish between attachments and other files
        if (file.fieldname === 'attachments') {
          attachments.push(filePath);
        } else {
          files.push(filePath);
        }
      });
      
      if (attachments.length > 0) {
        gigData.attachments = attachments;
      }
      
      if (files.length > 0) {
        gigData.files = files;
      }
    }

    const gig = await Gig.create(gigData);

    logAudit('CREATE', 'GIG', gig._id, req.user._id, {
      title: gig.title,
      category: gig.projectCategory,
      budget: gig.budget
    });

    // Populate category info for response
    await gig.populate([
      { path: 'projectCategory', select: 'name slug icon' },
      { path: 'subcategory', select: 'name slug' }
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

// Get Gigs with Advanced Security
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
      hasAttachments,
      hasProposals,
      hasMilestones,
      skillsRequired,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      deadlineAfter,
      deadlineBefore,
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
      includeClient = true,
      includeSeller = true,
      lean = true,
      cache = false
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
      hasAttachments,
      hasProposals,
      hasMilestones,
      skillsRequired,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      deadlineAfter,
      deadlineBefore,
      ids,
      excludeIds,
      showAll: showAllFlag
    }, userRole, req.user?._id);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;

    const allowedSortFields = ['budget', 'createdAt', 'updatedAt', 'deadline', 'urgency', 'title'];
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
      // Default exclude sensitive fields
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
        
        if (subcategory) {
          populateOptions.push({
            path: 'subcategory',
            select: 'name slug'
          });
        }
      }
      
      if (includeClient) {
        populateOptions.push({
          path: 'createdBy',
          select: 'username fullName avatar rating'
        });
      }
      
      if (includeSeller) {
        populateOptions.push({
          path: 'assignedTo',
          select: 'username fullName avatar rating level'
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

    const [gigs, total] = await Promise.all([
      Gig.find(filter, null, queryOptions),
      Gig.countDocuments(filter)
    ]);

    const safeGigs = gigs.map(gig => {
      if (lean) {
        // For lean documents
        const safeGig = { ...gig };
        
        // Remove sensitive data
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
        
        // Truncate description for list view
        if (safeGig.description && safeGig.description.length > 200) {
          safeGig.description = safeGig.description.substring(0, 200) + '...';
        }
        
        return safeGig;
      } else {
        // For mongoose documents
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
      'Cache-Control': cache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate'
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
      responseTime: `${responseTime}ms`
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
    const { query, fuzzy = 'false', threshold = 0.3, limit = 20 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        code: 'MISSING_QUERY',
        requestId
      });
    }

    const sanitizedQuery = sanitizeText(query);

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

// Get Gig by ID with Security
const getGigById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { fields, populate = true } = req.query;

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

    // Apply access controls
    if (userRole === 'admin') {
      query.deletedAt = null;
    } else if (userRole === 'seller' && userId) {
      query.$or = [
        { _id: query._id, assignedTo: userId, deletedAt: null },
        { _id: query._id, createdBy: userId, deletedAt: null },
        { 
          ...query, 
          visibility: 'public',
          deletedAt: null 
        }
      ];
    } else if (userRole === 'user' && userId) {
      query.$or = [
        { _id: query._id, createdBy: userId, deletedAt: null },
        { 
          ...query, 
          visibility: 'public',
          deletedAt: null 
        }
      ];
    } else {
      query.visibility = 'public';
      query.deletedAt = null;
    }

    const defaultExclude = ['__v', 'lastUpdatedBy', 'deletedAt', 'deletedBy', 'version'];
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

    let populateOptions = [];
    if (populate) {
      populateOptions = [
        {
          path: 'projectCategory',
          select: 'name slug icon description'
        },
        {
          path: 'subcategory',
          select: 'name slug'
        },
        {
          path: 'createdBy',
          select: 'username fullName avatar rating joinDate'
        },
        {
          path: 'assignedTo',
          select: 'username fullName avatar rating level totalSales'
        }
      ];
    }

    const gig = await Gig.findOne(query)
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(populateOptions);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    // Additional access checks
    if (gig.visibility !== 'public' && userRole !== 'admin') {
      if (userRole !== 'seller' && gig.createdBy._id.toString() !== userId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access to this gig is restricted',
          code: 'ACCESS_DENIED',
          requestId
        });
      }
    }

    // Log access to inactive gigs
    if (gig.status !== 'open') {
      logAudit('VIEW_INACTIVE', 'GIG', gig._id, userId, {
        status: gig.status
      });
    }

    const safeGig = gig.toObject();
    
    // Remove sensitive data
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

    // Limit communication history for non-participants
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
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'GIG', 'GET_BY_ID', req.user?._id, { id: req.params.id, error: error.message });
    next(error);
  }
};

// Update Gig with Security
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

    // Check if gig is deleted
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
    const isAssignedSeller = gig.assignedTo && gig.assignedTo.toString() === req.user._id.toString();
    
    if (!isOwner && !isAdmin && !isAssignedSeller) {
      logAudit('UNAUTHORIZED_UPDATE', 'GIG', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only update your own gigs',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    const sanitizedData = sanitizeGigInput(req.body);
    
    // Restrict field updates based on role
    if (!isAdmin) {
      delete sanitizedData.status;
      delete sanitizedData.assignedTo;
      delete sanitizedData.paymentStatus;
      delete sanitizedData.paymentAmount;
      delete sanitizedData.depositPaid;
      delete sanitizedData.rating;
      delete sanitizedData.clientReview;
      delete sanitizedData.sellerReview;
      delete sanitizedData.disputeStatus;
      delete sanitizedData.disputeReason;
      delete sanitizedData.selectedProposal;
    }

    // Validate category if changed
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

    // Validate subcategory if changed
    if (sanitizedData.subcategory && sanitizedData.subcategory !== (gig.subcategory?.toString() || '')) {
      const subcategory = await Category.findOne({ 
        _id: sanitizedData.subcategory,
        parentCategory: sanitizedData.projectCategory || gig.projectCategory 
      });
      
      if (!subcategory) {
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

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const attachments = gig.attachments || [];
      const files = gig.files || [];
      
      req.files.forEach(file => {
        const filePath = `/uploads/${file.filename}`;
        
        if (file.fieldname === 'attachments') {
          attachments.push(filePath);
        } else {
          files.push(filePath);
        }
      });
      
      updateData.attachments = attachments;
      updateData.files = files;
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
    ).populate('projectCategory', 'name slug').populate('createdBy', 'username fullName');

    if (!updatedGig) {
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

    logAudit('UPDATE', 'GIG', updatedGig._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion || gig.version,
      newVersion: updatedGig.version
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

// Delete Gig with Security
// Update the deleteGig function in gig.controller.js
const deleteGig = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

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
    
    if (!isOwner && !isAdmin) {
      logAudit('UNAUTHORIZED_DELETE', 'GIG', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own gigs',
        code: 'OWNERSHIP_REQUIRED',
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
      // Bypass validation for permanent delete
      result = await Gig.findByIdAndDelete(id, {
        runValidators: false, // Disable validation
        validateBeforeSave: false // Disable validation before save
      });
      
      logAudit('PERMANENT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title || 'Unknown',
        createdBy: gig.createdBy,
        force: force === 'true'
      });
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Gig permanently deleted',
        requestId,
        timestamp: now.toISOString(),
        responseTime: `${responseTime}ms`
      });
    } else {
      // Soft delete - update without validation
      await Gig.findByIdAndUpdate(id, {
        $set: {
          isActive: false,
          deletedAt: now,
          deletedBy: req.user._id,
          lastUpdatedBy: req.user._id
        }
      }, {
        runValidators: false, // Disable validation
        new: true
      });
      
      logAudit('SOFT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title || 'Unknown',
        createdBy: gig.createdBy
      });
      
      const responseTime = Date.now() - startTime;
      
      res.json({
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
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Unable to delete gig due to data integrity issues',
        code: 'DELETE_VALIDATION_ERROR',
        details: error.message,
        requestId
      });
    }
    
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

    // Check if category exists
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

// Submit Proposal
const submitProposal = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { proposal, price, deliveryTime, deliveryTimeUnit = 'days' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const gig = await Gig.findOne({ 
      _id: id, 
      status: 'open',
      deletedAt: null
    });

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found or not open for proposals',
        code: 'GIG_NOT_FOUND',
        requestId
      });
    }

    // Check gig visibility
    if (gig.visibility === 'private' && gig.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This gig is private',
        code: 'PRIVATE_GIG',
        requestId
      });
    }

    if (gig.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit proposal to your own gig',
        code: 'SELF_PROPOSAL',
        requestId
      });
    }

    // Check if seller has already submitted a proposal
    const existingProposal = gig.proposals.find(p => p.seller.toString() === req.user._id.toString());
    if (existingProposal) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a proposal for this gig',
        code: 'DUPLICATE_PROPOSAL',
        requestId
      });
    }

    const newProposal = {
      seller: req.user._id,
      proposal: sanitizeText(proposal),
      price: parseFloat(price),
      deliveryTime: parseInt(deliveryTime),
      deliveryTimeUnit,
      status: 'pending',
      submittedAt: new Date()
    };

    gig.proposals.push(newProposal);
    gig.lastUpdatedBy = req.user._id;
    await gig.save();

    logAudit('SUBMIT_PROPOSAL', 'GIG', id, req.user._id, {
      price: newProposal.price,
      deliveryTime: newProposal.deliveryTime
    });

    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Proposal submitted successfully',
      data: newProposal,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logAudit('ERROR', 'GIG', 'SUBMIT_PROPOSAL', req.user._id, { 
      id, 
      error: error.message 
    });
    next(error);
  }
};

// Get Gig Statistics
// In gig.controller.js - replace the entire getGigStats function with this:
const getGigStats = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    // Check if user has permission to view stats
    if (!['admin', 'seller', 'user'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access required for statistics',
        code: 'ACCESS_REQUIRED',
        requestId
      });
    }

    // Build filter based on user role
    let filter = { deletedAt: null };
    
    if (req.user.role === 'seller') {
      filter = {
        $or: [
          { createdBy: req.user._id, deletedAt: null },
          { assignedTo: req.user._id, deletedAt: null }
        ]
      };
    } else if (req.user.role === 'user') {
      filter = { createdBy: req.user._id, deletedAt: null };
    }
    // Admin can see all gigs (already set to { deletedAt: null })

    // Execute aggregation
    const stats = await Gig.aggregate([
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
                totalProposals: { $sum: { $size: '$proposals' } },
                avgProposalsPerGig: { $avg: { $size: '$proposals' } }
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
                totalProposals: { $sum: { $size: '$proposals' } },
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
                proposalsCount: { $size: '$proposals' },
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
                  avgProposals: { $avg: { $size: '$proposals' } }
                }
              }
            }
          ],
          proposalStats: [
            { $unwind: { path: '$proposals', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: '$proposals.status',
                count: { $sum: 1 },
                avgPrice: { $avg: '$proposals.price' },
                avgDeliveryTime: { $avg: '$proposals.deliveryTime' }
              }
            }
          ]
        }
      }
    ]);

    // Handle empty results - ensure we always return valid structure
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
        totalProposals: 0,
        avgProposalsPerGig: 0
      }],
      byCategory: [],
      byStatus: [],
      byUrgency: [],
      topGigs: [],
      growth: [],
      budgetDistribution: [],
      proposalStats: []
    };

    // Ensure overview array has at least one item
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
        totalProposals: 0,
        avgProposalsPerGig: 0
      }];
    }

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
    console.error('Error in getGigStats:', error);
    
    // Even on error, return empty stats structure
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
          totalProposals: 0,
          avgProposalsPerGig: 0
        }],
        byCategory: [],
        byStatus: [],
        byUrgency: [],
        topGigs: [],
        growth: [],
        budgetDistribution: [],
        proposalStats: []
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
      .populate('createdBy', 'username fullName')
      .lean();

    if (format === 'csv') {
      const headers = [
        'ID', 'Title', 'Slug', 'Description', 'Budget', 'Currency', 
        'Category', 'Status', 'Urgency', 'Visibility', 'Created By',
        'Assigned To', 'Created At', 'Updated At', 'Deadline',
        'Proposals Count', 'Skills Required', 'Deliverables'
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
        gig.createdBy?.username || '',
        gig.assignedTo?.username || '',
        new Date(gig.createdAt).toISOString(),
        new Date(gig.updatedAt).toISOString(),
        gig.deadline ? new Date(gig.deadline).toISOString() : '',
        gig.proposals?.length || 0,
        `"${(gig.skillsRequired || []).join(', ').replace(/"/g, '""')}"`,
        `"${(gig.deliverables || []).join(', ').replace(/"/g, '""')}"`
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="gigs_${Date.now()}.csv"`);
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
  submitProposal,
  getGigStats,
  exportGigs,
};