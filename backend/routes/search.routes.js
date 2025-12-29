const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { sanitizeHtml } = require('../utils/sanitize.js');
const cache = require('../utils/cache.js');
const crypto = require('crypto');
const Service = require('../models/services.model');
const Gig = require('../models/gig.model');
const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');

// Helper function to generate request ID
const generateRequestId = () => crypto.randomBytes(8).toString('hex');

// Helper function to generate cache key
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

const enhancedSanitizeSearchInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove all SQL injection patterns
  const sqlPatterns = [
    /'|"|`/g, // Remove quotes
    /;/g, // Remove semicolons
    /--/g, // Remove SQL comments
    /\b(?:OR|AND|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|JOIN)\b/gi, // Remove SQL keywords
    /\(.*?\)/g, // Remove parentheses
    /\$\{.*?\}/g, // Remove template literals
    /\\/g // Remove backslashes
  ];
  
  let sanitized = value;
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove common injection patterns
  const injectionPatterns = [
    /' OR '/i,
    /' AND '/i,
    /' UNION '/i,
    /' SELECT '/i,
    /' INSERT '/i,
    /' UPDATE '/i,
    /' DELETE '/i,
    /' DROP '/i,
    /' CREATE '/i,
    /' ALTER '/i,
    /=.*=/i, // Matches patterns like '1'='1'
    /'.*'.*'/i // Matches patterns with multiple quotes
  ];
  
  injectionPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      // If injection pattern is detected, return empty string
      sanitized = '';
    }
  });
  
  // Remove any remaining special characters that could be used in injection
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_+@.]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length < 2) return '';
  if (sanitized.length > 100) sanitized = sanitized.substring(0, 100);
  
  return sanitized;
};

// Update the cleanSearchParams function
const cleanSearchParams = (params) => {
  const cleaned = {};
  
  // List of allowed parameters for security
  const allowedParams = [
    'query', 'q', 'search', 'type', 'page', 'limit', 'offset',
    'min_price', 'max_price', 'minPrice', 'maxPrice',
    'delivery_time', 'deliveryTime', 'sort', 'order',
    'category', 'category_id', 'categoryId',
    'subcategory', 'subcategory_id', 'subcategoryId',
    'seller', 'seller_id', 'sellerId', 'createdBy',
    'min_rating', 'max_rating', 'minRating', 'maxRating',
    'currency', 'urgency', 'budget', 'timeline',
    'skills', 'skills_required', 'tags',
    'featured', 'popular', 'recommended',
    'has_images', 'has_attachments', 'has_packages',
    'status', 'visibility', 'is_active',
    'created_after', 'created_before',
    'updated_after', 'updated_before',
    'cache', 'populate', 'fields',
    'search_in', 'source', 'fuzzy',
    'include_inactive', 'show_all'
  ];
  
  Object.keys(params).forEach(key => {
    // Only process allowed parameters
    if (!allowedParams.includes(key) && !key.startsWith('x-')) {
      return;
    }
    
    let value = params[key];
    
    // Skip null, undefined, empty strings
    if (value === null || value === undefined || value === '' || 
        value === 'null' || value === 'undefined') {
      return;
    }
    
    // Enhanced security validation for string values
    if (typeof value === 'string') {
      // Decode URI components safely
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        // If decoding fails, skip this parameter
        return;
      }
      
      // Apply different sanitization based on parameter type
      if (key === 'query' || key === 'q' || key === 'search') {
        // Apply enhanced sanitization for search queries
        value = enhancedSanitizeSearchInput(value);
        if (!value || value.length < 2) {
          return; // Skip if invalid after sanitization
        }
      } else if (key === 'sort' || key === 'order') {
        // Validate sort parameters against allowed values
        const allowedSorts = ['relevance', 'newest', 'oldest', 'price_low', 'price_high', 
                              'price_asc', 'price_desc', 'rating', 'rating_desc', 'rating_asc',
                              'delivery_time', 'delivery_fastest', 'delivery_slowest',
                              'popular', 'featured'];
        const allowedOrders = ['asc', 'desc'];
        
        if (key === 'sort' && !allowedSorts.includes(value.toLowerCase())) {
          value = 'relevance'; // Default to relevance
        }
        if (key === 'order' && !allowedOrders.includes(value.toLowerCase())) {
          value = 'desc'; // Default to desc
        }
      } else if (key.includes('price') || key.includes('rating') || key.includes('budget')) {
        // Validate numeric parameters
        if (isNaN(value) || !isFinite(value)) {
          return; // Skip invalid numbers
        }
        // Ensure reasonable limits
        const numValue = parseFloat(value);
        if (key.includes('price') || key.includes('budget')) {
          if (numValue < 0 || numValue > 1000000) return;
        }
        if (key.includes('rating')) {
          if (numValue < 0 || numValue > 5) return;
        }
        value = numValue;
      } else if (key === 'category' || key === 'subcategory' || key === 'seller' || 
                 key.includes('category_id') || key.includes('subcategory_id') || 
                 key.includes('seller_id') || key === 'createdBy') {
        // Validate ObjectId format
        if (!isValidObjectId(value)) {
          return; // Skip invalid IDs
        }
      } else if (key === 'skills' || key === 'tags' || key === 'skills_required') {
        // Sanitize array parameters
        if (Array.isArray(value)) {
          value = value.map(item => enhancedSanitizeSearchInput(item)).filter(item => item);
        } else if (typeof value === 'string') {
          const items = value.split(',').map(item => enhancedSanitizeSearchInput(item.trim())).filter(item => item);
          value = items;
        }
      } else {
        // General sanitization for other string parameters
        value = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
        
        // Remove dangerous patterns
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /['"`;]/,
          /--/,
          /\$where/i,
          /\$ne/i,
          /\$regex/i,
          /select.*from/i,
          /insert.*into/i,
          /delete.*from/i,
          /union.*select/i,
          /'.*'.*'/i, // Multiple quotes
          /=.*=/i // Multiple equals
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            console.warn(`Dangerous pattern detected in parameter ${key}: ${value}`);
            return; // Skip this parameter entirely if dangerous pattern found
          }
        }
      }
    }
    
    // Convert to proper types
    if (value === 'true' || value === 'false') {
      cleaned[key] = value === 'true';
    } else if (!isNaN(value) && value !== '' && typeof value !== 'object') {
      // Convert to number if it's a valid number
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        cleaned[key] = num;
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  });
  
  return cleaned;
};


// Validate ObjectId
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id) && 
         id.match(/^[0-9a-fA-F]{24}$/);
};

// Escape regex special characters
const escapeRegex = (string) => {
  if (typeof string !== 'string') return string;
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Build search filter based on type
const buildSearchFilter = async (params, searchType) => {
  const filter = {};
  const { 
    query, q, search,
    min_price, max_price, minPrice, maxPrice,
    min_rating, max_rating, minRating, maxRating,
    category, category_id, categoryId,
    subcategory, subcategory_id, subcategoryId,
    seller, seller_id, sellerId, createdBy,
    currency, urgency, budget, timeline,
    skills, skills_required, tags,
    featured, popular, recommended,
    has_images, has_attachments, has_packages,
    status, visibility, is_active,
    created_after, created_before,
    updated_after, updated_before,
    include_inactive, show_all,
    delivery_time, deliveryTime
  } = params;
  
  const searchQuery = query || q || search;
  
  // Base filter for active items
  if (searchType === 'services') {
    filter.status = 'active';
    filter.isActive = true;
    filter.deletedAt = null;
  } else if (searchType === 'gigs') {
    filter.status = 'open';
    filter.isActive = true;
    filter.deletedAt = null;
    filter.visibility = 'public'; // Only show public gigs
  }
  
  // Category filter
  const categoryParam = category || category_id || categoryId;
  if (categoryParam && isValidObjectId(categoryParam)) {
    if (searchType === 'services') {
      filter.category = new mongoose.Types.ObjectId(categoryParam);
    } else if (searchType === 'gigs') {
      filter.projectCategory = new mongoose.Types.ObjectId(categoryParam);
    }
  }
  
  // Subcategory filter
  const subcategoryParam = subcategory || subcategory_id || subcategoryId;
  if (subcategoryParam && isValidObjectId(subcategoryParam)) {
    filter.subcategory = new mongoose.Types.ObjectId(subcategoryParam);
  }
  
  // Seller/creator filter
  const sellerParam = seller || seller_id || sellerId || createdBy;
  if (sellerParam && isValidObjectId(sellerParam)) {
    filter.createdBy = new mongoose.Types.ObjectId(sellerParam);
  }
  
  // Price/budget filter
  const priceMin = min_price || minPrice;
  const priceMax = max_price || maxPrice;
  const priceField = searchType === 'services' ? 'price' : 'budget';
  
  if (priceMin !== undefined || priceMax !== undefined) {
    filter[priceField] = {};
    if (priceMin !== undefined) filter[priceField].$gte = parseFloat(priceMin);
    if (priceMax !== undefined) filter[priceField].$lte = parseFloat(priceMax);
  }
  
  // Rating filter
  const ratingMin = min_rating || minRating;
  const ratingMax = max_rating || maxRating;
  if (ratingMin !== undefined || ratingMax !== undefined) {
    filter.rating = {};
    if (ratingMin !== undefined) filter.rating.$gte = parseFloat(ratingMin);
    if (ratingMax !== undefined) filter.rating.$lte = parseFloat(ratingMax);
  }
  
  // Delivery time filter
  const deliveryParam = delivery_time || deliveryTime;
  if (deliveryParam !== undefined) {
    if (searchType === 'services') {
      filter.deliveryTime = {};
      if (typeof deliveryParam === 'string' && deliveryParam.includes('-')) {
        const [min, max] = deliveryParam.split('-').map(Number);
        if (!isNaN(min)) filter.deliveryTime.$gte = min;
        if (!isNaN(max)) filter.deliveryTime.$lte = max;
      } else if (!isNaN(deliveryParam)) {
        filter.deliveryTime = Number(deliveryParam);
      }
    }
  }
  
  // Currency filter
  if (currency && typeof currency === 'string') {
    filter.currency = currency.toUpperCase();
  }
  
  // Urgency filter (for gigs)
  if (urgency && searchType === 'gigs') {
    filter.urgency = urgency.toLowerCase();
  }
  
  // Skills filter
  const skillsParam = skills || skills_required;
  if (skillsParam) {
    const skillsArray = Array.isArray(skillsParam) ? skillsParam : skillsParam.split(',');
    const sanitizedSkills = skillsArray.map(skill => 
      sanitizeHtml(skill.trim(), { allowedTags: [] })
    ).filter(skill => skill.length > 0);
    
    if (sanitizedSkills.length > 0) {
      if (searchType === 'services') {
        filter.tags = { $in: sanitizedSkills };
      } else if (searchType === 'gigs') {
        filter.skillsRequired = { $in: sanitizedSkills };
      }
    }
  }
  
  // Tags filter (for services)
  if (tags && searchType === 'services') {
    const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
    const sanitizedTags = tagsArray.map(tag => 
      sanitizeHtml(tag.trim(), { allowedTags: [] })
    ).filter(tag => tag.length > 0);
    
    if (sanitizedTags.length > 0) {
      filter.tags = { $in: sanitizedTags };
    }
  }
  
  // Boolean filters
  if (featured !== undefined) filter.isFeatured = featured === true || featured === 'true';
  if (popular !== undefined) filter.isPopular = popular === true || popular === 'true';
  if (recommended !== undefined) filter.isRecommended = recommended === true || recommended === 'true';
  
  // Existence filters
  if (has_images === true || has_images === 'true') {
    filter.images = { $exists: true, $ne: [] };
  }
  if (has_attachments === true || has_attachments === 'true' && searchType === 'gigs') {
    filter.attachments = { $exists: true, $ne: [] };
  }
  if (has_packages === true || has_packages === 'true' && searchType === 'services') {
    filter.packages = { $exists: true, $ne: [] };
  }
  
  // Date filters
  const addDateFilter = (field, date, operator) => {
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        filter[field] = filter[field] || {};
        filter[field][operator] = parsedDate;
      }
    }
  };
  
  addDateFilter('createdAt', created_after || created_after, '$gte');
  addDateFilter('createdAt', created_before || created_before, '$lte');
  addDateFilter('updatedAt', updated_after || updated_after, '$gte');
  addDateFilter('updatedAt', updated_before || updated_before, '$lte');
  
  // Status filter (override defaults if specified)
  if (status && searchType === 'services') {
    filter.status = status;
  }
  
  // Visibility filter (for gigs)
  if (visibility && searchType === 'gigs') {
    filter.visibility = visibility;
  }
  
  return filter;
};

// Get sort options
const getSortOptions = (sortParam, searchType,hasTextSearch) => {
  const sort = sortParam || 'relevance';
  if (hasTextSearch && sort.toLowerCase() === 'relevance') {
    // Only include score if we have text search
    return { 
      score: { $meta: 'textScore' },
      isFeatured: -1,
      rating: -1,
      reviewsCount: -1,
      createdAt: -1 
    };
  }
  
  switch(sort.toLowerCase()) {
    case 'relevance':
      // Fallback for non-text search
      return { 
        isFeatured: -1,
        rating: -1,
        reviewsCount: -1,
        createdAt: -1 
      };
    
    case 'newest':
    case 'latest':
      return { createdAt: -1 };
    
    case 'oldest':
      return { createdAt: 1 };
    
    case 'price_low':
    case 'price_asc':
      return searchType === 'services' ? { price: 1 } : { budget: 1 };
    
    case 'price_high':
    case 'price_desc':
      return searchType === 'services' ? { price: -1 } : { budget: -1 };
    
    case 'rating':
    case 'rating_desc':
      return { rating: -1, reviewsCount: -1 };
    
    case 'rating_asc':
      return { rating: 1 };
    
    case 'delivery_time':
    case 'delivery_fastest':
      return { deliveryTime: 1 };
    
    case 'delivery_slowest':
      return { deliveryTime: -1 };
    
    case 'popular':
      return { 
        isPopular: -1,
        views: -1,
        likes: -1,
        rating: -1 
      };
    
    case 'featured':
      return { isFeatured: -1, rating: -1 };
    
    default:
      return { 
        score: { $meta: 'textScore' },
        isFeatured: -1,
        rating: -1,
        reviewsCount: -1,
        createdAt: -1 
      };
  }
};

// Get related data (categories, freelancers, suggestions)
const getRelatedData = async (searchQuery, searchType, categoryId, subcategoryId) => {
  const relatedData = {
    categories: [],
    subcategories: [],
    suggestions: [],
    topSellers: []
  };
  
  try {
    // Get related categories based on search query
    if (searchQuery && searchQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
      
      // Find categories matching the search
      relatedData.categories = await Category.find({
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { metaKeywords: { $regex: searchRegex } }
        ],
        isActive: true,
        deletedAt: null,
        isSubcategory: false
      })
      .select('name slug icon description servicesCount gigsCount featured popular')
      .sort({ servicesCount: -1, gigsCount: -1 })
      .limit(6)
      .lean();
    }
    
    // If we have a category, get its subcategories
    if (categoryId && isValidObjectId(categoryId)) {
      relatedData.subcategories = await Subcategory.find({
        category: new mongoose.Types.ObjectId(categoryId),
        isActive: true,
        deletedAt: null
      })
      .select('name slug description icon order servicesCount gigsCount')
      .sort({ order: 1, name: 1 })
      .limit(10)
      .lean();
    }
    
    // If we have a subcategory, get sibling subcategories
    if (subcategoryId && isValidObjectId(subcategoryId)) {
      const subcategory = await Subcategory.findById(subcategoryId)
        .select('category')
        .lean();
      
      if (subcategory && subcategory.category) {
        relatedData.subcategories = await Subcategory.find({
          category: subcategory.category,
          _id: { $ne: subcategoryId },
          isActive: true,
          deletedAt: null
        })
        .select('name slug description icon order servicesCount gigsCount')
        .sort({ order: 1, name: 1 })
        .limit(8)
        .lean();
      }
    }
    
    // Get search suggestions
    if (searchQuery && searchQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
      
      const model = searchType === 'services' ? Service : Gig;
      const titleField = searchType === 'services' ? 'title' : 'title';
      
      relatedData.suggestions = await model.find({
        [titleField]: { $regex: searchRegex },
        isActive: true,
        deletedAt: null,
        status: searchType === 'services' ? 'active' : 'open'
      })
      .select('title slug shortDescription price rating')
      .sort({ rating: -1, createdAt: -1 })
      .limit(8)
      .lean();
    }
    
    // Get top sellers for this search
    if (searchQuery && searchQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
      const model = searchType === 'services' ? Service : Gig;
      
      // First, find items matching the search
      const matchingItems = await model.find({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ],
        isActive: true,
        deletedAt: null,
        status: searchType === 'services' ? 'active' : 'open'
      })
      .select('createdBy')
      .limit(100)
      .lean();
      
      // Get unique creator IDs
      const creatorIds = [...new Set(matchingItems.map(item => item.createdBy).filter(Boolean))];
      
      if (creatorIds.length > 0) {
        const User = mongoose.model('User');
        relatedData.topSellers = await User.find({
          _id: { $in: creatorIds },
          isActive: true
        })
        .select('name username picture rating completedOrders responseRate responseTime accountType level bio')
        .sort({ rating: -1, completedOrders: -1 })
        .limit(6)
        .lean();
      }
    }
    
  } catch (error) {
    console.error('Error getting related data:', error);
    // Don't fail the whole request if related data fails
  }
  
  return relatedData;
};

// Main search endpoint
router.get('/search', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Clean and validate parameters
    const params = cleanSearchParams(req.query);
    
    // Extract main parameters
    const {
      query: searchQuery,
      q,
      search,
      type = 'services',
      page = 1,
      limit = 48,
      offset,
      sort = 'relevance',
      order = 'desc',
      category: categoryParam,
      subcategory: subcategoryParam,
      seller: sellerParam,
      min_price,
      max_price,
      min_rating,
      max_rating,
      delivery_time,
      currency,
      skills,
      tags,
      featured,
      popular,
      recommended,
      has_images,
      has_attachments,
      has_packages,
      cache: useCacheParam = 'true',
      populate = 'true',
      fields,
      search_in = 'everywhere',
      source = 'top-bar',
      fuzzy = 'false',
      include_inactive = 'false',
      show_all = 'false'
    } = params;
    
    // Determine search type
    const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
    
    // Use query from various possible parameters
    const finalQuery = searchQuery || q || search;
    
    // Validate query
    if (!finalQuery || typeof finalQuery !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        code: 'QUERY_REQUIRED',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
     const injectionPatternsAfterSanitization = [
      /\bOR\b/i,
      /\bAND\b/i,
      /'1'='1'/i,
      /=.*=/i,
      /'.*'/i
    ];
    
    for (const pattern of injectionPatternsAfterSanitization) {
      if (pattern.test(finalQuery)) {
        console.warn(`SQL injection attempt detected and blocked: ${finalQuery}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid search query',
          code: 'INVALID_QUERY_FORMAT',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }
    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(parseInt(limit) || 48, 100);
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;
    const useCache = useCacheParam === 'true';
    
    // Build cache key
    const cacheKey = generateCacheKey(`search_${searchType}`, {
      query: finalQuery,
      page: pageNum,
      limit: limitNum,
      sort,
      order,
      category: categoryParam,
      subcategory: subcategoryParam,
      seller: sellerParam,
      min_price,
      max_price,
      min_rating,
      max_rating,
      delivery_time,
      currency,
      skills,
      tags,
      featured,
      popular,
      recommended,
      has_images,
      has_attachments,
      has_packages,
      userRole: req.user?.role || 'guest'
    });
    
    // Try to get from cache
    let cachedResults = null;
    if (useCache && pageNum === 1) {
      cachedResults = await cache.get(cacheKey);
      if (cachedResults) {
        console.log(`Cache hit for search: ${cacheKey}`);
      }
    }
    
    if (cachedResults) {
      // Return cached results
      const responseTime = Date.now() - startTime;
      
      res.set({
        'X-Request-ID': requestId,
        'X-Cache': 'HIT',
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'public, max-age=300'
      });
      
      return res.json({
        success: true,
        ...cachedResults,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        cached: true
      });
    }
    
    // Build search filter
    const filter = await buildSearchFilter(params, searchType);
    let hasTextSearch = false;
    if (finalQuery && typeof finalQuery === 'string' && finalQuery.trim().length >= 2) {
      const sanitizedQuery = finalQuery.trim();
      
      if (searchType === 'services') {
        // For services, use text search if available
        try {
          // Check if text index exists by trying to use it
          filter.$text = { $search: sanitizedQuery };
          hasTextSearch = true;
        } catch (error) {
          // If text search fails, fall back to regex
          console.log('Text search not available, falling back to regex');
          delete filter.$text;
          const searchRegex = new RegExp(escapeRegex(sanitizedQuery), 'i');
          filter.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { shortDescription: searchRegex },
            { tags: searchRegex },
            { searchKeywords: searchRegex }
          ];
          hasTextSearch = false;
        }
      } else if (searchType === 'gigs') {
        // For gigs, always use regex (gigs model might not have text index)
        const searchRegex = new RegExp(escapeRegex(sanitizedQuery), 'i');
        filter.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { skillsRequired: { $in: [searchRegex] } },
          { deliverables: { $in: [searchRegex] } }
        ];
        hasTextSearch = false;
      }
    }
    // Get sort options
   const sortOptions = getSortOptions(sort, searchType, hasTextSearch);
    
    // Select fields
    let selectFields = '';
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      const validFields = fieldArray.filter(f => 
        !['__v', 'deletedAt', 'deletedBy', 'version', 'lastUpdatedBy'].includes(f)
      );
      if (validFields.length > 0) {
        selectFields = validFields.join(' ');
      }
    } else {
      // Default fields based on search type
      if (searchType === 'services') {
        selectFields = 'title slug shortDescription description price currency rating reviewsCount deliveryTime deliveryTimeUnit revisions views likes thumbnail images tags isFeatured isRecommended isPopular searchKeywords category subcategory createdBy createdAt updatedAt';
      } else {
        selectFields = 'title slug description budget currency timeline timelineUnit skillsRequired deliverables images thumbnail urgency visibility status assignedTo createdBy createdAt updatedAt';
      }
    }
    
    // Build query
    const Model = searchType === 'services' ? Service : Gig;
    let query = Model.find(filter).select(selectFields);
    
    
    // Add text score for text search
    if (searchType === 'services' && finalQuery && finalQuery.trim().length >= 2) {
      query = query.select({ score: { $meta: 'textScore' } });
    }
     if (hasTextSearch) {
      query = query.select({ score: { $meta: 'textScore' } });
    }
    // Apply sorting
    query = query.sort(sortOptions);
    
    // Apply pagination
    query = query.skip(skip).limit(limitNum);
    
    // Apply population if requested
    if (populate === 'true' || populate === true) {
      const populateOptions = [];
      
      // Always populate createdBy
      populateOptions.push({
        path: 'createdBy',
        select: 'name username picture rating completedOrders responseRate responseTime accountType level',
        match: { isActive: true }
      });
      
      // Populate category based on search type
      if (searchType === 'services') {
        populateOptions.push({
          path: 'category',
          select: 'name slug icon description',
          match: { isActive: true }
        });
        
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon description',
          match: { isActive: true }
        });
      } else {
        populateOptions.push({
          path: 'projectCategory',
          select: 'name slug icon description',
          match: { isActive: true }
        });
        
        populateOptions.push({
          path: 'subcategory',
          select: 'name slug icon description',
          match: { isActive: true }
        });
        
        if (req.user?.role === 'admin' || req.user?.role === 'user') {
          populateOptions.push({
            path: 'assignedTo',
            select: 'name username picture',
            match: { isActive: true }
          });
        }
      }
      
      query = query.populate(populateOptions);
    }
    
    // Execute query and count in parallel
    const [results, totalCount] = await Promise.all([
      query.lean(),
      Model.countDocuments(filter)
    ]);
    
    // Get related data
    const relatedData = await getRelatedData(
      finalQuery,
      searchType,
      categoryParam,
      subcategoryParam
    );
    
    // Format results
    const formattedResults = results.map(item => {
      const result = { ...item };
      
      // Format price/budget
      if (searchType === 'services') {
        result.priceFormatted = `${result.currency || 'USD'} ${result.price?.toFixed(2) || '0.00'}`;
        result.deliveryFormatted = `${result.deliveryTime || 0} ${result.deliveryTimeUnit || 'days'}`;
      } else {
        result.budgetFormatted = `${result.currency || 'USD'} ${result.budget?.toFixed(2) || '0.00'}`;
        result.timelineFormatted = `${result.timeline || 'N/A'} ${result.timelineUnit || 'days'}`;
      }
      
      // Format seller/creator
      if (result.createdBy && typeof result.createdBy === 'object') {
        result.seller = {
          _id: result.createdBy._id,
          name: result.createdBy.name || 'Anonymous',
          username: result.createdBy.username,
          picture: result.createdBy.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.createdBy.name || 'Anonymous')}&background=random`,
          rating: result.createdBy.rating || 0,
          completedOrders: result.createdBy.completedOrders || 0,
          responseRate: result.createdBy.responseRate || 0,
          responseTime: result.createdBy.responseTime || 0,
          isPro: result.createdBy.accountType === 'pro',
          level: result.createdBy.level || 'Level 1'
        };
      }
      
      // Format category
      if (searchType === 'services' && result.category) {
        result.categoryInfo = {
          _id: result.category._id,
          name: result.category.name,
          slug: result.category.slug,
          icon: result.category.icon,
          description: result.category.description
        };
      } else if (searchType === 'gigs' && result.projectCategory) {
        result.categoryInfo = {
          _id: result.projectCategory._id,
          name: result.projectCategory.name,
          slug: result.projectCategory.slug,
          icon: result.projectCategory.icon,
          description: result.projectCategory.description
        };
      }
      
      // Format subcategory
      if (result.subcategory) {
        result.subcategoryInfo = {
          _id: result.subcategory._id,
          name: result.subcategory.name,
          slug: result.subcategory.slug,
          icon: result.subcategory.icon,
          description: result.subcategory.description
        };
      }
      
      // Clean up description
      if (result.description && result.description.length > 150) {
        result.descriptionShort = result.description.substring(0, 150) + '...';
      }
      
      // Ensure thumbnail exists
      if (!result.thumbnail && result.images && result.images.length > 0) {
        result.thumbnail = result.images[0];
      }
      
      // Add type
      result.type = searchType;
      
      return result;
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;
    
    // Prepare response
    const response = {
      success: true,
      data: {
        results: formattedResults,
        totalCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext,
          hasPrev,
          nextPage: hasNext ? pageNum + 1 : null,
          prevPage: hasPrev ? pageNum - 1 : null
        },
        meta: {
          query: finalQuery,
          type: searchType,
          source,
          search_in,
          totalResults: totalCount,
          showing: `${skip + 1}-${Math.min(skip + limitNum, totalCount)} of ${totalCount}`,
          sort,
          order,
          filtersApplied: Object.keys(filter).length - 3 // Subtract status, isActive, deletedAt
        },
        relatedData
      }
    };
    
    // Cache the response if enabled (first page only)
    if (useCache && pageNum === 1) {
      await cache.set(cacheKey, response.data, 300); // 5 minutes
      console.log(`Cache set for search: ${cacheKey}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    // Set response headers
    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': totalCount,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Response-Time': `${responseTime}ms`,
      'X-Cache': useCache && pageNum === 1 ? 'MISS' : 'BYPASSED',
      'Cache-Control': useCache ? 'public, max-age=300' : 'no-cache, no-store, must-revalidate',
      'X-Search-Type': searchType,
      'X-Query-Length': finalQuery.length
    });
    
    // Send response
    res.json({
      ...response,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      cached: false
    });
    
  } catch (error) {
    console.error('Search error:', error);
    
    const responseTime = Date.now() - startTime;
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter format',
        code: 'INVALID_PARAMETER',
        details: error.message,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
    
    if (error.name === 'MongoError' && error.message.includes('text index')) {
      return res.status(400).json({
        success: false,
        message: 'Text search not available. Please use simpler search terms.',
        code: 'TEXT_SEARCH_UNAVAILABLE',
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
    
    // Default error response
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      code: 'SEARCH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});

// Search suggestions endpoint
router.get('/suggestions', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const params = cleanSearchParams(req.query);
    
    const {
      query: searchQuery,
      q,
      search,
      type = 'services',
      limit = 10,
      category: categoryParam,
      subcategory: subcategoryParam
    } = params;
    
    const finalQuery = searchQuery || q || search;
    
    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`
      });
    }
    
    const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
    const searchRegex = new RegExp(escapeRegex(finalQuery), 'i');
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    
    let suggestions = [];
    
    // Get service/gig suggestions
    const Model = searchType === 'services' ? Service : Gig;
    const statusFilter = searchType === 'services' ? 'active' : 'open';
    
    const modelSuggestions = await Model.find({
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } },
        searchType === 'services' ? { searchKeywords: { $regex: searchRegex } } : {}
      ],
      status: statusFilter,
      isActive: true,
      deletedAt: null
    })
    .select('title slug shortDescription price rating reviewsCount')
    .sort({ rating: -1, reviewsCount: -1 })
    .limit(limitNum)
    .lean();
    
    suggestions.push(...modelSuggestions.map(item => ({
      type: searchType,
      title: item.title,
      slug: item.slug,
      price: item.price || item.budget,
      rating: item.rating || 0,
      reviewsCount: item.reviewsCount || 0,
      description: item.shortDescription || (item.description ? item.description.substring(0, 80) + '...' : ''),
      entity: searchType === 'services' ? 'Service' : 'Project'
    })));
    
    // Get category suggestions
    const categorySuggestions = await Category.find({
      name: { $regex: searchRegex },
      isActive: true,
      deletedAt: null,
      isSubcategory: false
    })
    .select('name slug icon description servicesCount gigsCount')
    .limit(5)
    .lean();
    
    suggestions.push(...categorySuggestions.map(item => ({
      type: 'category',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      description: item.description || '',
      servicesCount: item.servicesCount || 0,
      gigsCount: item.gigsCount || 0,
      entity: 'Category'
    })));
    
    // Get subcategory suggestions
    const subcategorySuggestions = await Subcategory.find({
      name: { $regex: searchRegex },
      isActive: true,
      deletedAt: null
    })
    .select('name slug icon description category servicesCount gigsCount')
    .limit(5)
    .lean();
    
    // Populate category names for subcategories
    if (subcategorySuggestions.length > 0) {
      const categoryIds = subcategorySuggestions.map(s => s.category);
      const categories = await Category.find({
        _id: { $in: categoryIds },
        isActive: true
      })
      .select('name slug')
      .lean();
      
      const categoryMap = categories.reduce((map, cat) => {
        map[cat._id.toString()] = cat;
        return map;
      }, {});
      
      suggestions.push(...subcategorySuggestions.map(item => ({
        type: 'subcategory',
        title: item.name,
        slug: item.slug,
        icon: item.icon,
        description: item.description || '',
        category: categoryMap[item.category?.toString()]?.name || 'Unknown',
        categorySlug: categoryMap[item.category?.toString()]?.slug || '',
        servicesCount: item.servicesCount || 0,
        gigsCount: item.gigsCount || 0,
        entity: 'Subcategory'
      })));
    }
    
    // Remove duplicates and limit
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(item => [`${item.type}-${item.title}`, item])).values()
    ).slice(0, limitNum);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: uniqueSuggestions,
      query: finalQuery,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: [],
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});

// Quick search endpoint (for autocomplete)
router.get('/quick', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const params = cleanSearchParams(req.query);
    
    const {
      query: searchQuery,
      q,
      search,
      limit = 5
    } = params;
    
    const finalQuery = searchQuery || q || search;
    
    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`
      });
    }
    
    const searchRegex = new RegExp(`^${escapeRegex(finalQuery)}`, 'i');
    const limitNum = Math.min(parseInt(limit) || 5, 20);
    
    const results = [];
    
    // Search in services
    const serviceResults = await Service.find({
      title: { $regex: searchRegex },
      status: 'active',
      isActive: true,
      deletedAt: null
    })
    .select('title slug price thumbnail')
    .limit(limitNum)
    .lean();
    
    results.push(...serviceResults.map(item => ({
      type: 'service',
      title: item.title,
      slug: item.slug,
      price: item.price,
      thumbnail: item.thumbnail,
      url: `/services/${item.slug}`
    })));
    
    // Search in gigs
    const gigResults = await Gig.find({
      title: { $regex: searchRegex },
      status: 'open',
      isActive: true,
      deletedAt: null,
      visibility: 'public'
    })
    .select('title slug budget thumbnail')
    .limit(limitNum)
    .lean();
    
    results.push(...gigResults.map(item => ({
      type: 'gig',
      title: item.title,
      slug: item.slug,
      price: item.budget,
      thumbnail: item.thumbnail,
      url: `/gigs/${item.slug}`
    })));
    
    // Search in categories
    const categoryResults = await Category.find({
      name: { $regex: searchRegex },
      isActive: true,
      deletedAt: null,
      isSubcategory: false
    })
    .select('name slug icon')
    .limit(limitNum)
    .lean();
    
    results.push(...categoryResults.map(item => ({
      type: 'category',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      url: `/categories/${item.slug}`
    })));
    
    // Search in subcategories
    const subcategoryResults = await Subcategory.find({
      name: { $regex: searchRegex },
      isActive: true,
      deletedAt: null
    })
    .select('name slug icon category')
    .limit(limitNum)
    .lean();
    
    // Get parent categories for subcategories
    if (subcategoryResults.length > 0) {
      const categoryIds = subcategoryResults.map(s => s.category);
      const categories = await Category.find({
        _id: { $in: categoryIds },
        isActive: true
      })
      .select('name slug')
      .lean();
      
      const categoryMap = categories.reduce((map, cat) => {
        map[cat._id.toString()] = cat;
        return map;
      }, {});
      
      results.push(...subcategoryResults.map(item => ({
        type: 'subcategory',
        title: item.name,
        slug: item.slug,
        icon: item.icon,
        category: categoryMap[item.category?.toString()]?.name || 'Unknown',
        url: `/categories/${categoryMap[item.category?.toString()]?.slug || ''}#${item.slug}`
      })));
    }
    
    // Remove duplicates and limit
    const uniqueResults = Array.from(
      new Map(results.map(item => [`${item.type}-${item.title}`, item])).values()
    ).slice(0, limitNum);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: uniqueResults,
      query: finalQuery,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Quick search error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: [],
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});

// Search statistics endpoint
router.get('/stats', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Get total counts
    const [totalServices, totalGigs, totalCategories, totalSubcategories] = await Promise.all([
      Service.countDocuments({ status: 'active', isActive: true, deletedAt: null }),
      Gig.countDocuments({ status: 'open', isActive: true, deletedAt: null, visibility: 'public' }),
      Category.countDocuments({ isActive: true, deletedAt: null, isSubcategory: false }),
      Subcategory.countDocuments({ isActive: true, deletedAt: null })
    ]);
    
    // Get popular search terms (you'd need to implement this with analytics)
    const popularSearches = [
      { term: 'web development', count: 1245 },
      { term: 'logo design', count: 892 },
      { term: 'content writing', count: 765 },
      { term: 'video editing', count: 543 },
      { term: 'social media marketing', count: 432 }
    ];
    
    // Get trending categories
    const trendingCategories = await Category.find({
      isActive: true,
      deletedAt: null,
      isSubcategory: false
    })
    .select('name slug icon servicesCount gigsCount')
    .sort({ servicesCount: -1, gigsCount: -1 })
    .limit(6)
    .lean();
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        totals: {
          services: totalServices,
          gigs: totalGigs,
          categories: totalCategories,
          subcategories: totalSubcategories
        },
        popularSearches,
        trendingCategories,
        lastUpdated: new Date().toISOString()
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Search stats error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Error fetching search statistics',
      code: 'STATS_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});

module.exports = router;