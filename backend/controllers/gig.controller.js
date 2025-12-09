const mongoose = require('mongoose');
const crypto = require('crypto');
const Gig = require('../models/gig.model.js');
const Category = require('../models/category.model.js');
const { sanitizeHtml } = require('../utils/sanitize.js');

const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const sanitizeGigInput = (data) => {
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
    } else if (key === 'proposals' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(proposal => ({
        ...proposal,
        proposal: sanitizeHtml(proposal.proposal || '', { allowedTags: [], allowedAttributes: {} }).trim()
      }));
    } else if (key === 'milestones' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(milestone => ({
        ...milestone,
        title: sanitizeHtml(milestone.title || '', { allowedTags: [], allowedAttributes: {} }).trim(),
        description: sanitizeHtml(milestone.description || '', { allowedTags: [], allowedAttributes: {} }).trim()
      }));
    } else if (key === 'communicationHistory' && Array.isArray(data[key])) {
      sanitized[key] = data[key].map(msg => ({
        ...msg,
        message: sanitizeHtml(msg.message || '', { allowedTags: [], allowedAttributes: {} }).trim()
      }));
    } else {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
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

  if (showAll && userRole === 'admin') {
    if (status !== undefined) {
      filter.status = status;
    }
  } else if (userRole === 'seller' && userId) {
    filter.$or = [
      { assignedTo: userId },
      { createdBy: userId },
      { 
        status: 'open',
        visibility: 'public',
        isActive: true 
      }
    ];
  } else {
    filter.status = 'open';
    filter.visibility = 'public';
    filter.isActive = true;
  }

  if (search) {
    const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
    filter.$text = { $search: sanitizedSearch };
  }

  if (title) filter.title = { $regex: `^${sanitizeHtml(title, { allowedTags: [] })}`, $options: 'i' };
  if (slug) filter.slug = sanitizeHtml(slug, { allowedTags: [] });
  
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

  if (minBudget || maxBudget) {
    filter.budget = {};
    if (minBudget) filter.budget.$gte = parseFloat(minBudget);
    if (maxBudget) filter.budget.$lte = parseFloat(maxBudget);
  }

  if (currency) filter.currency = currency;
  if (urgency) filter.urgency = urgency;
  if (visibility) filter.visibility = visibility;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (disputeStatus) filter.disputeStatus = disputeStatus;
  
  if (hasAttachments === 'true') filter.attachments = { $exists: true, $ne: [] };
  if (hasProposals === 'true') filter.proposals = { $exists: true, $ne: [] };
  if (hasMilestones === 'true') filter.milestones = { $exists: true, $ne: [] };
  
  if (skillsRequired) {
    const skillsArray = skillsRequired.split(',').map(skill => 
      sanitizeHtml(skill.trim(), { allowedTags: [], allowedAttributes: {} })
    );
    filter.skillsRequired = { $all: skillsArray };
  }

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
  console.log(`[AUDIT:GIG] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};

const createGig = async (req, res, next) => {
  const requestId = generateRequestId();
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
    
    if (!sanitizedData.projectCategory) {
      return res.status(400).json({
        success: false,
        message: 'Project category is required',
        code: 'CATEGORY_REQUIRED',
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

    if (sanitizedData.subcategory) {
      const subcategory = await Category.findOne({ 
        _id: sanitizedData.subcategory, 
        isActive: true,
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
      fullName: req.user.fullName || sanitizedData.fullName,
      oauthEmail: req.user.email || sanitizedData.oauthEmail,
      createdBy: req.user._id,
      version: 1
    };

    if (req.files && req.files.length > 0) {
      gigData.attachments = req.files.map(file => `/uploads/${file.filename}`);
    }

    const gig = await Gig.create(gigData);

    logAudit('CREATE', 'GIG', gig._id, req.user._id, {
      title: gig.title,
      category: gig.projectCategory,
      budget: gig.budget
    });

    const safeGig = gig.toObject();
    delete safeGig.__v;
    delete safeGig.lastUpdatedBy;

    res.status(201).json({
      success: true,
      gig: safeGig,
      message: 'Gig created successfully',
      requestId,
      timestamp: new Date().toISOString()
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

const getGigs = async (req, res, next) => {
  const requestId = generateRequestId();
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
    const isSellerView = req.user?.role === 'seller';

    const filter = buildSecureGigQuery({
      search: search || q,
      title,
      slug,
      projectCategory,
      subcategory,
      createdBy: isSellerView ? req.user._id : createdBy,
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
    }, req.user?.role, req.user?._id);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    const allowedSortFields = ['budget', 'createdAt', 'updatedAt', 'deadline', 'urgency'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    const defaultExclude = ['__v', 'lastUpdatedBy', 'communicationHistory'];
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
          path: 'projectCategory',
          select: 'name slug icon',
          match: { isActive: true }
        });
        
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug',
          match: { isActive: true }
        });
      }
      
      if (includeClient) {
        populateOptions.push({
          path: 'createdBy',
          select: 'username fullName avatar rating',
          match: { isActive: true }
        });
      }
      
      if (includeSeller) {
        populateOptions.push({
          path: 'assignedTo',
          select: 'username fullName avatar rating level',
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

    const [gigs, total] = await Promise.all([
      Gig.find(filter, null, queryOptions),
      Gig.countDocuments(filter)
    ]);

    const safeGigs = gigs.map(gig => {
      const safeGig = { ...gig };
      
      if (safeGig.createdBy && safeGig.createdBy._id) {
        delete safeGig.createdBy.email;
        delete safeGig.createdBy.phone;
      }
      
      if (safeGig.assignedTo && safeGig.assignedTo._id) {
        delete safeGig.assignedTo.email;
        delete safeGig.assignedTo.phone;
      }
      
      delete safeGig.__v;
      delete safeGig.lastUpdatedBy;
      delete safeGig.communicationHistory;
      
      if (safeGig.description && safeGig.description.length > 200) {
        safeGig.description = safeGig.description.substring(0, 200) + '...';
      }
      
      return safeGig;
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
      'Cache-Control': cache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate'
    });

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
      timestamp: new Date().toISOString()
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

const getGigById = async (req, res, next) => {
  const requestId = generateRequestId();
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
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] });
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'seller') {
      query.visibility = 'public';
      query.isActive = true;
    } else if (req.user?.role === 'seller') {
      query.$or = [
        { _id: query._id || query.slug, assignedTo: req.user._id },
        { createdBy: req.user._id },
        { 
          ...query, 
          visibility: 'public',
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
          path: 'projectCategory',
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
          select: 'username fullName avatar rating joinDate',
          match: { isActive: true }
        },
        {
          path: 'assignedTo',
          select: 'username fullName avatar rating level totalSales',
          match: { isActive: true }
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

    if (gig.visibility !== 'public' && req.user?.role !== 'admin') {
      if (req.user?.role !== 'seller' && gig.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access to this gig is restricted',
          code: 'ACCESS_DENIED',
          requestId
        });
      }
    }

    if (gig.status !== 'open') {
      logAudit('VIEW_INACTIVE', 'GIG', gig._id, req.user?._id, {
        status: gig.status
      });
    }

    const safeGig = gig.toObject();
    
    if (safeGig.createdBy) {
      delete safeGig.createdBy.email;
      delete safeGig.createdBy.phone;
    }
    
    if (safeGig.assignedTo) {
      delete safeGig.assignedTo.email;
      delete safeGig.assignedTo.phone;
    }
    
    delete safeGig.__v;
    delete safeGig.lastUpdatedBy;

    res.json({
      success: true,
      gig: safeGig,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'GIG', 'GET_BY_ID', req.user?._id, { id: req.params.id, error: error.message });
    next(error);
  }
};

const updateGig = async (req, res, next) => {
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
    }

    if (sanitizedData.projectCategory && sanitizedData.projectCategory !== gig.projectCategory.toString()) {
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
    }

    if (sanitizedData.subcategory && sanitizedData.subcategory !== (gig.subcategory?.toString() || '')) {
      const subcategory = await Category.findOne({ 
        _id: sanitizedData.subcategory, 
        isActive: true,
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

    const currentVersion = sanitizedData.version;
    delete sanitizedData.version;

    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    if (req.files && req.files.length > 0) {
      updateData.attachments = req.files.map(file => `/uploads/${file.filename}`);
    }

    const updatedGig = await Gig.findOneAndUpdate(
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
    
    if (safeGig.createdBy) {
      delete safeGig.createdBy.email;
      delete safeGig.createdBy.phone;
    }

    res.json({
      success: true,
      gig: safeGig,
      message: 'Gig updated successfully',
      requestId,
      timestamp: new Date().toISOString()
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

const deleteGig = async (req, res, next) => {
  const requestId = generateRequestId();
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

    if (force !== 'true' && gig.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete gig that is in progress',
        code: 'GIG_IN_PROGRESS',
        requestId
      });
    }

    let result;
    
    if (permanent === 'true' && isAdmin) {
      result = await Gig.findByIdAndDelete(id);
      
      logAudit('PERMANENT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title,
        createdBy: gig.createdBy,
        force: force === 'true'
      });
      
      res.json({
        success: true,
        message: 'Gig permanently deleted',
        requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      gig.isActive = false;
      gig.lastUpdatedBy = req.user._id;
      await gig.save();
      
      logAudit('SOFT_DELETE', 'GIG', id, req.user._id, {
        title: gig.title,
        createdBy: gig.createdBy
      });
      
      res.json({
        success: true,
        message: 'Gig deactivated',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logAudit('ERROR', 'GIG', 'DELETE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

const submitProposal = async (req, res, next) => {
  const requestId = generateRequestId();
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
      isActive: true 
    });

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found or not open for proposals',
        code: 'GIG_NOT_FOUND',
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
      proposal: sanitizeHtml(proposal, { allowedTags: [], allowedAttributes: {} }).trim(),
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

    res.json({
      success: true,
      message: 'Proposal submitted successfully',
      proposal: newProposal,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'GIG', 'SUBMIT_PROPOSAL', req.user._id, { 
      id, 
      error: error.message 
    });
    next(error);
  }
};

const getGigStats = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    if (!['admin', 'seller'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access required for statistics',
        code: 'ACCESS_REQUIRED',
        requestId
      });
    }

    const filter = req.user.role === 'seller' 
      ? { 
          $or: [
            { createdBy: req.user._id },
            { assignedTo: req.user._id }
          ]
        }
      : {};

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
                totalProposals: { $sum: { $size: '$proposals' } }
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
    logAudit('ERROR', 'GIG', 'STATS', req.user?._id, { error: error.message });
    next(error);
  }
};

module.exports = {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig,
  submitProposal,
  getGigStats,
};