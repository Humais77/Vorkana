// search.route.js - Production Ready with CSRF Protection and Redis Caching
// FIXED VERSION - All headers sent errors resolved
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
const User = require('../models/user.model');

// CSRF Protection
const CSRFMiddleware = require('../middleware/csrf.middleware');

// Session Middleware
const SessionMiddleware = require('../middleware/session.middleware');

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Search rate limiter


// Helper functions
const generateRequestId = () => crypto.randomBytes(8).toString('hex');

const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

// Enhanced sanitization
const sanitizeSearchInput = (value) => {
  if (typeof value !== 'string') return value;
  
  const dangerousPatterns = [
        /<script[^>]*>/i,  // Script tags
        /javascript:/i,     // JavaScript protocol
        /on\w+\s*=/,        // Event handlers
        /eval\(/,           // eval function
        /alert\(/,          // alert function
        /document\./,       // Document access
        /window\./,         // Window access
        /\.\.\/\.\.\//,     // Directory traversal
        /null.*null/i,      // Null byte injection attempts
      ];
  
  let sanitized = value;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_+@.,&()!?:/\\[\]\u0600-\u06FF\u4e00-\u9fff\uac00-\ud7af]/g, '');
  
  sanitized = sanitized.trim();
  if (sanitized.length < 1) return '';
  if (sanitized.length > 500) sanitized = sanitized.substring(0, 500);
  
  return sanitized;
};

// Parameter cleaning
const cleanSearchParams = (params, user) => {
  const cleaned = {};
  
  const allowedParams = [
    'query', 'q', 'search', 'type', 'page', 'limit',
    'min_price', 'max_price', 'minPrice', 'maxPrice',
    'min_budget', 'max_budget', 'minBudget', 'maxBudget',
    'min_rating', 'max_rating', 'minRating', 'maxRating',
    'category', 'category_id', 'categoryId',
    'subcategory', 'subcategory_id', 'subcategoryId',
    'seller', 'seller_id', 'sellerId', 'createdBy',
    'currency', 'urgency', 'budget', 'timeline',
    'skills', 'skills_required', 'tags', 'keywords',
    'featured', 'popular', 'recommended', 'trending',
    'has_images', 'has_attachments', 'has_packages', 'has_video',
    'status', 'visibility', 'is_active',
    'delivery_time', 'deliveryTime',
    'revisions', 'min_reviews', 'max_reviews',
    'experience_level', 'pro_level',
    'language', 'timezone',
    'sort_by', 'sort', 'order',
    'min_orders', 'max_orders',
    'response_time', 'min_response_time', 'max_response_time',
    'completion_rate', 'min_completion', 'max_completion',
    'online_status', 'availability',
    'level', 'tier', 'badge',
    'with_offers', 'with_extras',
    'min_views', 'max_views',
    'min_likes', 'max_likes',
    'last_active', 'active_within',
    'video_call', 'phone_support', 'file_support',
    'source_language', 'target_language',
    'file_format', 'output_format',
    'platform', 'software', 'tool',
    'color', 'style', 'theme',
    'format', 'size', 'duration',
    'resolution', 'aspect_ratio',
    'file_size', 'word_count',
    'pages', 'slides',
    'industry', 'niche', 'audience',
    'age_group', 'gender',
    'frequency', 'schedule',
    'timeframe', 'deadline',
    'project_size', 'complexity',
    'team_size', 'collaboration',
    'privacy', 'confidentiality',
    'license', 'rights', 'ownership',
    'support_duration', 'warranty',
    'refund_policy', 'revision_policy',
    'communication', 'updates',
    'milestones', 'phases',
    'deposit', 'payment_plan',
    'escrow', 'payment_method',
    'verified', 'certified', 'accredited',
    'awards', 'recognition',
    'portfolio', 'samples',
    'testimonials', 'case_studies',
    'education', 'certification',
    'experience_years', 'min_experience',
    'client_types', 'project_types',
    'business_size', 'company_type',
    'location', 'country', 'city',
    'fuzzy', 'exact', 'cache'
  ];
  
  if (params && Object.keys(params).length > 50) {
    throw new Error('Too many parameters');
  }
  
  Object.keys(params).forEach(key => {
    if (!allowedParams.includes(key) && !key.startsWith('filter_')) {
      return;
    }
    
    let value = params[key];
    
    if (value === null || value === undefined || value === '' || 
        value === 'null' || value === 'undefined') {
      return;
    }
    
    if (typeof value === 'string') {
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        console.warn(`Failed to decode URI component: ${e.message}`);
        return;
      }
      
      if (key === 'query' || key === 'q' || key === 'search') {
        value = sanitizeSearchInput(value);
        if (!value || value.length < 1) return;
      } else if (key.includes('email') || key.includes('url')) {
        value = sanitizeHtml(value, { allowedTags: [] }).trim();
      }
    }
    
    if (value === 'true' || value === 'false') {
      cleaned[key] = value === 'true';
    } else if (!isNaN(value) && value !== '' && typeof value !== 'object') {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        if (key.includes('price') || key.includes('budget')) {
          if (num >= 0 && num <= 1000000) cleaned[key] = num;
        } else if (key.includes('rating')) {
          if (num >= 0 && num <= 5) cleaned[key] = num;
        } else if (key.includes('time') || key.includes('days')) {
          if (num >= 0 && num <= 365) cleaned[key] = num;
        } else {
          cleaned[key] = num;
        }
      }
    } else if (mongoose.Types.ObjectId.isValid(value)) {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      const sanitizedArray = value.map(item => {
        if (typeof item === 'string') {
          return sanitizeSearchInput(item);
        }
        return item;
      }).filter(item => item);
      
      if (sanitizedArray.length > 0) {
        cleaned[key] = sanitizedArray;
      }
    } else {
      cleaned[key] = value;
    }
  });
  
  if (user) {
    if (!cleaned.country && user.country) {
      cleaned.user_country = user.country;
    }
    if (!cleaned.currency && user.currency) {
      cleaned.user_currency = user.currency;
    }
    if (user.role === 'admin' || user.role === 'moderator') {
      cleaned.admin_view = true;
    }
  }
  
  if (!cleaned.page) cleaned.page = 1;
  if (!cleaned.limit) cleaned.limit = 24;
  if (!cleaned.sort) cleaned.sort = 'relevance';
  if (!cleaned.order) cleaned.order = 'desc';
  
  return cleaned;
};

// ObjectId validation
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id);
};

// Escape regex
const escapeRegex = (string) => {
  if (typeof string !== 'string') return string;
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Build search filter
const buildSearchFilter = (params, searchType, user) => {
  const filter = {};
  const conditions = [];
  
  if (searchType === 'services') {
    conditions.push({ status: 'active' });
    conditions.push({ isActive: true });
    conditions.push({ deletedAt: null });
    conditions.push({ visibility: 'public' });
  } else if (searchType === 'gigs') {
    conditions.push({ status: 'open' });
    conditions.push({ isActive: true });
    conditions.push({ deletedAt: null });
    conditions.push({ visibility: 'public' });
  }
  
  const categoryParam = params.category || params.category_id || params.categoryId;
  if (categoryParam && isValidObjectId(categoryParam)) {
    const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
    conditions.push({ [categoryField]: new mongoose.Types.ObjectId(categoryParam) });
  }
  
  const subcategoryParam = params.subcategory || params.subcategory_id || params.subcategoryId;
  if (subcategoryParam && isValidObjectId(subcategoryParam)) {
    conditions.push({ subcategory: new mongoose.Types.ObjectId(subcategoryParam) });
  }
  
  const priceMin = params.min_price || params.minPrice || params.min_budget || params.minBudget;
  const priceMax = params.max_price || params.maxPrice || params.max_budget || params.maxBudget;
  
  if (priceMin !== undefined || priceMax !== undefined) {
    const priceCondition = {};
    if (priceMin !== undefined && !isNaN(priceMin)) priceCondition.$gte = parseFloat(priceMin);
    if (priceMax !== undefined && !isNaN(priceMax)) priceCondition.$lte = parseFloat(priceMax);
    
    if (Object.keys(priceCondition).length > 0) {
      if (searchType === 'services') {
        conditions.push({ price: priceCondition });
      } else {
        conditions.push({ budget: priceCondition });
      }
    }
  }
  
  const ratingMin = params.min_rating || params.minRating;
  const ratingMax = params.max_rating || params.maxRating;
  if ((ratingMin !== undefined && !isNaN(ratingMin)) || 
      (ratingMax !== undefined && !isNaN(ratingMax))) {
    const ratingCondition = {};
    if (ratingMin !== undefined) ratingCondition.$gte = parseFloat(ratingMin);
    if (ratingMax !== undefined) ratingCondition.$lte = parseFloat(ratingMax);
    conditions.push({ rating: ratingCondition });
  }
  
  const deliveryParam = params.delivery_time || params.deliveryTime;
  if (deliveryParam !== undefined && searchType === 'services') {
    const deliveryNumber = Number(deliveryParam);
    if (!isNaN(deliveryNumber) && deliveryNumber > 0) {
      conditions.push({ deliveryTime: { $lte: deliveryNumber } });
    }
  }
  
  const currencyParam = params.currency;
  if (currencyParam && typeof currencyParam === 'string') {
    conditions.push({ currency: currencyParam.toUpperCase() });
  }
  
  const skillsParam = params.skills || params.skills_required;
  if (skillsParam) {
    const skillsArray = Array.isArray(skillsParam) ? skillsParam : skillsParam.split(',');
    const sanitizedSkills = skillsArray
      .map(skill => skill.trim().toLowerCase())
      .filter(skill => skill.length > 0);
    
    if (sanitizedSkills.length > 0) {
      const skillField = searchType === 'services' ? 'tags' : 'skillsRequired';
      conditions.push({ 
        [skillField]: { 
          $in: sanitizedSkills.map(skill => new RegExp(`^${escapeRegex(skill)}$`, 'i'))
        } 
      });
    }
  }
  
  const tagsParam = params.tags || params.keywords;
  if (tagsParam && searchType === 'services') {
    const tagsArray = Array.isArray(tagsParam) ? tagsParam : tagsParam.split(',');
    const sanitizedTags = tagsArray
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
    
    if (sanitizedTags.length > 0) {
      conditions.push({ 
        tags: { 
          $in: sanitizedTags.map(tag => new RegExp(`^${escapeRegex(tag)}$`, 'i'))
        } 
      });
    }
  }
  
  if (params.featured === true || params.featured === 'true') {
    conditions.push({ isFeatured: true });
  }
  
  if (params.has_video === true || params.has_video === 'true') {
    conditions.push({ 
      $or: [
        { videoUrl: { $exists: true, $ne: null } },
        { hasVideo: true }
      ]
    });
  }
  
  if (params.has_images === true || params.has_images === 'true') {
    conditions.push({ 
      images: { $exists: true, $ne: [] }
    });
  }
  
  const sellerParam = params.seller || params.seller_id || params.sellerId || params.createdBy;
  if (sellerParam && isValidObjectId(sellerParam)) {
    conditions.push({ createdBy: new mongoose.Types.ObjectId(sellerParam) });
  }
  
  if (searchType === 'gigs') {
    const urgencyParam = params.urgency;
    if (urgencyParam && ['low', 'medium', 'high', 'urgent'].includes(urgencyParam)) {
      conditions.push({ urgency: urgencyParam });
    }
  }
  
  if (conditions.length === 1) {
    Object.assign(filter, conditions[0]);
  } else if (conditions.length > 1) {
    filter.$and = conditions;
  }
  
  return filter;
};

// Build text search query
const buildTextSearchQuery = (searchQuery, searchType, params) => {
  const { fuzzy = 'false', exact = 'false' } = params;
  const sanitizedQuery = searchQuery.trim();
  
  if (!sanitizedQuery || sanitizedQuery.length < 1) {
    return {};
  }
  
  if (exact === 'true') {
    return {
      $text: { 
        $search: `"${sanitizedQuery}"`,
        $caseSensitive: false,
        $diacriticSensitive: false 
      }
    };
  }
  
  if (fuzzy === 'true' || sanitizedQuery.split(' ').length === 1) {
    const escapedQuery = escapeRegex(sanitizedQuery);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    const searchFields = searchType === 'services' 
      ? ['title', 'description', 'shortDescription', 'tags']
      : ['title', 'description', 'skillsRequired'];
    
    return {
      $or: searchFields.map(field => ({
        [field]: searchRegex
      }))
    };
  }
  
  return {
    $text: { 
      $search: sanitizedQuery,
      $caseSensitive: false,
      $diacriticSensitive: false 
    }
  };
};

// Get sort options
const getSortOptions = (sortParam, searchType, hasTextSearch, params, user) => {
  const sort = sortParam || 'relevance';
  const sortOrder = params.order || 'desc';
  const orderValue = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  
  let sortConfig = {};
  
  if (hasTextSearch && (sort.toLowerCase() === 'relevance' || !sort)) {
    sortConfig = { 
      score: { $meta: 'textScore' }
    };
  } else {
    switch(sort.toLowerCase()) {
      case 'relevance':
        sortConfig = { 
          isFeatured: -1,
          rating: -1,
          reviewsCount: -1,
          views: -1,
          createdAt: -1 
        };
        break;
      
      case 'newest':
      case 'latest':
        sortConfig = { createdAt: -1 };
        break;
      
      case 'oldest':
        sortConfig = { createdAt: 1 };
        break;
      
      case 'price_low':
      case 'price_asc':
        sortConfig = searchType === 'services' ? { price: 1 } : { budget: 1 };
        break;
      
      case 'price_high':
      case 'price_desc':
        sortConfig = searchType === 'services' ? { price: -1 } : { budget: -1 };
        break;
      
      case 'rating':
      case 'rating_desc':
        sortConfig = { rating: -1, reviewsCount: -1 };
        break;
      
      case 'rating_asc':
        sortConfig = { rating: 1 };
        break;
      
      case 'delivery_time':
      case 'delivery_fastest':
        sortConfig = { deliveryTime: 1 };
        break;
      
      case 'delivery_slowest':
        sortConfig = { deliveryTime: -1 };
        break;
      
      case 'popular':
        sortConfig = { 
          views: -1,
          likes: -1,
          rating: -1
        };
        break;
      
      case 'trending':
        sortConfig = { 
          views: -1,
          likes: -1,
          createdAt: -1
        };
        break;
      
      default:
        sortConfig = { 
          isFeatured: -1,
          rating: -1,
          reviewsCount: -1,
          createdAt: -1 
        };
    }
  }
  
  if (orderValue === 1) {
    Object.keys(sortConfig).forEach(key => {
      if (typeof sortConfig[key] === 'number') {
        sortConfig[key] = Math.abs(sortConfig[key]);
      }
    });
  }
  
  return sortConfig;
};

// Get user personalization
const getUserPersonalization = async (userId, searchType) => {
  if (!userId) return null;
  
  try {
    const cacheKey = `user:${userId}:personalization`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const user = await User.findById(userId)
      .select('preferences searchHistory favorites skills country currency language')
      .lean();
    
    if (!user) return null;
    
    const personalization = {
      preferredCategories: user.preferences?.favoriteCategories || [],
      preferredSkills: [
        ...(user.preferences?.favoriteSkills || []),
        ...(Array.isArray(user.skills) ? user.skills : [user.skills]).filter(Boolean)
      ],
      locationBias: user.country,
      currencyPreference: user.currency,
      languagePreference: user.language,
      pastSearches: user.searchHistory?.slice(-10).map(h => h.query).filter(Boolean) || []
    };
    
    // Cache for 5 minutes
    await cache.set(cacheKey, personalization, 300);
    
    return personalization;
  } catch (error) {
    console.error('Error getting user personalization:', error);
    return null;
  }
};

// Update user search history
const updateUserSearchHistory = async (userId, searchQuery, searchType, filters) => {
  if (!userId) return;
  
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        searchHistory: {
          $each: [{
            query: searchQuery,
            type: searchType,
            filters: Object.keys(filters || {}).slice(0, 10),
            timestamp: new Date(),
          }],
          $slice: -100
        }
      }
    });
    
    // Invalidate personalization cache
    await cache.del(`user:${userId}:personalization`);
  } catch (error) {
    console.error('Error updating user search history:', error);
  }
};

// Calculate relevance score
const calculateRelevanceScore = (item, searchQuery, personalization) => {
  let score = 0;
  
  if (item.isFeatured) score += 50;
  if (item.isRecommended) score += 30;
  if (item.isPopular) score += 20;
  
  if (item.rating) score += item.rating * 10;
  
  if (item.reviewsCount) score += Math.min(item.reviewsCount * 0.5, 50);
  
  if (item.views) score += item.views * 0.01;
  if (item.likes) score += item.likes * 0.5;
  
  if (searchQuery && item.title) {
    const searchLower = searchQuery.toLowerCase();
    const titleLower = item.title.toLowerCase();
    
    if (titleLower.includes(searchLower)) {
      score += 30;
    }
    
    const searchWords = searchLower.split(' ');
    const titleWords = titleLower.split(' ');
    const matchingWords = searchWords.filter(word => 
      titleWords.some(titleWord => titleWord.includes(word))
    );
    
    score += matchingWords.length * 10;
  }
  
  if (searchQuery && item.description) {
    const descLower = item.description.toLowerCase();
    if (descLower.includes(searchQuery.toLowerCase())) {
      score += 10;
    }
  }
  
  if (personalization) {
    if (item.categoryInfo && personalization.preferredCategories.includes(item.categoryInfo._id.toString())) {
      score += 40;
    }
    
    if (item.tags && Array.isArray(item.tags)) {
      const matchingSkills = item.tags.filter(tag => 
        personalization.preferredSkills.includes(tag.toLowerCase())
      );
      score += matchingSkills.length * 15;
    }
  }
  
  if (item.createdAt) {
    const ageInDays = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 100 - ageInDays);
    score += freshnessScore * 0.1;
  }
  
  return Math.round(score * 100) / 100;
};

// Get related data
const getRelatedData = async (searchQuery, searchType, categoryId, subcategoryId, userId) => {
  const relatedData = {
    categories: [],
    subcategories: [],
    suggestions: [],
    topSellers: [],
    trendingItems: [],
    analytics: {
      queryComplexity: 'simple',
      estimatedResults: 0
    }
  };
  
  try {
    if (searchQuery) {
      const words = searchQuery.split(' ').filter(w => w.length > 2);
      relatedData.analytics.queryComplexity = 
        words.length === 1 ? 'simple' :
        words.length <= 3 ? 'moderate' : 'complex';
    }
    
    if (searchQuery && searchQuery.length >= 2) {
      const cacheKey = generateCacheKey('related_categories', { query: searchQuery });
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        relatedData.categories = cached;
      } else {
        const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
        
        relatedData.categories = await Category.aggregate([
          {
            $match: {
              $or: [
                { name: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
              ],
              isActive: true,
              deletedAt: null,
              isSubcategory: false
            }
          },
          { $sort: { name: 1 } },
          { $limit: 6 },
          {
            $project: {
              name: 1,
              slug: 1,
              icon: 1,
              description: 1
            }
          }
        ]);
        
        // Cache for 10 minutes
        await cache.set(cacheKey, relatedData.categories, 600);
      }
    }
    
    if (categoryId && isValidObjectId(categoryId)) {
      const cacheKey = `category:${categoryId}:subcategories`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        relatedData.subcategories = cached;
      } else {
        relatedData.subcategories = await Subcategory.find({
          category: new mongoose.Types.ObjectId(categoryId),
          isActive: true,
          deletedAt: null
        })
        .select('name slug icon description')
        .sort({ name: 1 })
        .limit(8)
        .lean();
        
        // Cache for 15 minutes
        await cache.set(cacheKey, relatedData.subcategories, 900);
      }
    }
    
  } catch (error) {
    console.error('Error getting related data:', error);
  }
  
  return relatedData;
};

// Cache or fetch users
const cacheOrFetchUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  
  const uniqueIds = [...new Set(userIds)];
  const cachedUsers = {};
  const uncachedIds = [];
  
  // Try to get from cache first
  await Promise.all(uniqueIds.map(async (id) => {
    const cacheKey = `user:${id}:basic`;
    const cached = await cache.get(cacheKey, { 
      namespace: 'user',
      useMemory: true 
    });
    
    if (cached) {
      cachedUsers[id] = cached;
    } else {
      uncachedIds.push(id);
    }
  }));
  
  // Fetch uncached users
  if (uncachedIds.length > 0) {
    const users = await User.find({ _id: { $in: uncachedIds } })
      .select('name username picture rating completedOrders responseRate responseTime accountType level country joinedAt lastSeenAt')
      .lean();
    
    // Cache fetched users
    await Promise.all(users.map(async (user) => {
      const cacheKey = `user:${user._id}:basic`;
      await cache.set(cacheKey, user, 300, { 
        namespace: 'user',
        useMemory: true 
      });
      cachedUsers[user._id] = user;
    }));
  }
  
  return Object.values(cachedUsers);
};

// Cache or fetch categories
const cacheOrFetchCategories = async (categoryIds) => {
  if (!categoryIds || categoryIds.length === 0) return [];
  
  const uniqueIds = [...new Set(categoryIds)];
  const cachedCategories = {};
  const uncachedIds = [];
  
  // Try to get from cache first
  await Promise.all(uniqueIds.map(async (id) => {
    const cacheKey = `category:${id}:basic`;
    const cached = await cache.get(cacheKey, { 
      namespace: 'category',
      useMemory: true 
    });
    
    if (cached) {
      cachedCategories[id] = cached;
    } else {
      uncachedIds.push(id);
    }
  }));
  
  // Fetch uncached categories
  if (uncachedIds.length > 0) {
    const categories = await Category.find({ _id: { $in: uncachedIds } })
      .select('name slug icon description')
      .lean();
    
    // Cache fetched categories
    await Promise.all(categories.map(async (category) => {
      const cacheKey = `category:${category._id}:basic`;
      await cache.set(cacheKey, category, 300, { 
        namespace: 'category',
        useMemory: true 
      });
      cachedCategories[category._id] = category;
    }));
  }
  
  return Object.values(cachedCategories);
};

// ==================== MAIN SEARCH ENDPOINTS ====================

// MAIN SEARCH ENDPOINT
router.get('/search', 
  SessionMiddleware.optionalAuth,
  async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const user = req.user || null;
      const params = cleanSearchParams(req.query, user);
      
      const {
        query: searchQuery,
        q,
        search,
        type = 'services',
        page = 1,
        limit = 24,
        sort = 'relevance',
        order = 'desc',
        category: categoryParam,
        subcategory: subcategoryParam,
        min_price,
        max_price,
        min_rating,
        max_rating,
        delivery_time,
        currency,
        skills,
        tags,
        featured,
        has_images,
        has_video,
        urgency,
        cache: useCacheParam = 'true'
      } = params;
      
      const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
      const finalQuery = searchQuery || q || search;
      
      if (!finalQuery || finalQuery.trim().length < 1) {
        const responseTime = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          code: 'QUERY_REQUIRED',
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        });
      }
      
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(parseInt(limit) || 24, 100);
      const skip = (pageNum - 1) * limitNum;
      const useCache = useCacheParam === 'true' && pageNum === 1;
      
      const personalization = user ? await getUserPersonalization(user._id, searchType) : null;
      
      const cacheKey = generateCacheKey(`search_${searchType}_${user ? user._id : 'guest'}`, {
        query: finalQuery,
        page: pageNum,
        limit: limitNum,
        sort,
        order,
        category: categoryParam,
        subcategory: subcategoryParam,
        min_price,
        max_price,
        min_rating,
        max_rating,
        delivery_time,
        urgency,
        skills,
        tags,
        featured,
        has_images,
        has_video,
        currency
      });
      
      let cachedResults = null;
      if (useCache) {
        try {
          cachedResults = await cache.get(cacheKey, { 
            namespace: 'search',
            useMemory: true 
          });
        } catch (cacheError) {
          console.error('Cache error:', cacheError);
        }
      }
      
      if (cachedResults) {
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
      
      const baseFilter = buildSearchFilter(params, searchType, user);
      
      let hasTextSearch = false;
      if (finalQuery && finalQuery.trim().length >= 1) {
        const textSearchQuery = buildTextSearchQuery(finalQuery, searchType, params);
        
        if (textSearchQuery.$text) {
          baseFilter.$text = textSearchQuery.$text;
          hasTextSearch = true;
        } else if (textSearchQuery.$or) {
          if (!baseFilter.$or) baseFilter.$or = [];
          baseFilter.$or.push(...textSearchQuery.$or);
        }
      }
      
      const sortOptions = getSortOptions(sort, searchType, hasTextSearch, params, user);
      
      const Model = searchType === 'services' ? Service : Gig;
      
      const totalCount = await Model.countDocuments(baseFilter);
      
      let query = Model.find(baseFilter);
      
      if (hasTextSearch && sort === 'relevance') {
        query = query.select({ score: { $meta: 'textScore' } });
        query = query.sort({ score: { $meta: 'textScore' } });
      } else {
        query = query.sort(sortOptions);
      }
      
      query = query.skip(skip).limit(limitNum);
      
      const selectFields = searchType === 'services' 
        ? 'title slug description shortDescription price currency rating reviewsCount views likes deliveryTime deliveryTimeUnit images thumbnail tags isFeatured isRecommended isPopular status visibility urgency createdAt updatedAt createdBy category subcategory'
        : 'title slug description budget currency status urgency timeline timelineUnit images thumbnail skillsRequired isActive visibility createdAt updatedAt createdBy projectCategory';
      
      query = query.select(selectFields);
      
      let results = await query.lean();
      
      if (results.length > 0) {
        const creatorIds = results.map(r => r.createdBy).filter(Boolean);
        const categoryIds = results.map(r => r.category || r.projectCategory).filter(Boolean);
        
        const [creators, categories] = await Promise.all([
          cacheOrFetchUsers(creatorIds),
          cacheOrFetchCategories(categoryIds)
        ]);
        
        const creatorMap = creators.reduce((map, creator) => {
          map[creator._id.toString()] = creator;
          return map;
        }, {});
        
        const categoryMap = categories.reduce((map, category) => {
          map[category._id.toString()] = category;
          return map;
        }, {});
        
        results = await Promise.all(results.map(async (item) => {
          const seller = creatorMap[item.createdBy?.toString()];
          const category = categoryMap[(item.category || item.projectCategory)?.toString()];
          
          return {
            ...item,
            type: searchType,
            priceFormatted: item.currency 
              ? `${item.currency} ${(item.price || item.budget || 0).toFixed(2)}`
              : `$${(item.price || item.budget || 0).toFixed(2)}`,
            descriptionShort: item.description && item.description.length > 150
              ? item.description.substring(0, 150) + '...'
              : item.description || '',
            seller: seller ? {
              _id: seller._id,
              name: seller.name,
              username: seller.username,
              picture: seller.picture,
              rating: seller.rating,
              completedOrders: seller.completedOrders,
              responseRate: seller.responseRate,
              responseTime: seller.responseTime,
              isPro: ['premium', 'business', 'pro'].includes(seller.accountType),
              level: seller.level,
              country: seller.country
            } : null,
            categoryInfo: category ? {
              _id: category._id,
              name: category.name,
              slug: category.slug,
              icon: category.icon,
              description: category.description
            } : null,
            relevanceScore: calculateRelevanceScore(item, finalQuery, personalization)
          };
        }));
        
        if (sort === 'relevance' && !hasTextSearch) {
          results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
      }
      
      const relatedData = await getRelatedData(
        finalQuery,
        searchType,
        categoryParam,
        subcategoryParam,
        user ? user._id : null
      );
      
      if (user && user._id) {
        updateUserSearchHistory(user._id, finalQuery, searchType, params).catch(console.error);
      }
      
      const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      const responseData = {
        results: results,
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
          totalResults: totalCount,
          showing: results.length,
          sort,
          order,
          personalized: !!personalization,
          queryComplexity: relatedData.analytics?.queryComplexity || 'simple'
        },
        related: relatedData
      };
      
      if (useCache && results.length > 0) {
        try {
          await cache.set(cacheKey, responseData, 300, { 
            namespace: 'search',
            useMemory: true 
          });
        } catch (cacheError) {
          console.error('Cache set error:', cacheError);
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      res.set({
        'X-Request-ID': requestId,
        'X-Total-Count': totalCount,
        'X-Total-Pages': totalPages,
        'X-Page-Size': limitNum,
        'X-Current-Page': pageNum,
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache': useCache ? 'MISS' : 'BYPASS',
        'Cache-Control': useCache ? 'public, max-age=300' : 'no-cache',
        'X-Search-Type': searchType,
        'X-Results-Count': results.length
      });
      
      return res.json({
        success: true,
        data: responseData,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
      
    } catch (error) {
      console.error('Search error:', error);
      
      const responseTime = Date.now() - startTime;
      
      let statusCode = 500;
      let errorCode = 'SEARCH_ERROR';
      let errorMessage = 'Error performing search';
      
      if (error.name === 'CastError') {
        statusCode = 400;
        errorCode = 'INVALID_PARAMETER';
        errorMessage = 'Invalid parameter format';
      } else if (error.message && error.message.includes('Too many parameters')) {
        statusCode = 400;
        errorCode = 'TOO_MANY_PARAMETERS';
        errorMessage = 'Too many search parameters provided';
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        code: errorCode,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
  }
);

// SUGGESTIONS ENDPOINT
router.get('/suggestions', 
  SessionMiddleware.optionalAuth,
  async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const user = req.user || null;
      const params = cleanSearchParams(req.query, user);
      
      const {
        query: searchQuery,
        q,
        search,
        type = 'services',
        limit = 10
      } = params;
      
      const finalQuery = searchQuery || q || search;
      
      if (!finalQuery || finalQuery.trim().length < 2) {
        const responseTime = Date.now() - startTime;
        return res.json({
          success: true,
          data: [],
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        });
      }
      
      const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
      const searchRegex = new RegExp(`^${escapeRegex(finalQuery)}`, 'i');
      const limitNum = Math.min(parseInt(limit) || 10, 50);
      
      const cacheKey = generateCacheKey(`suggestions_${searchType}_${user ? user._id : 'guest'}`, {
        query: finalQuery,
        limit: limitNum,
        type: searchType
      });
      
      const cachedSuggestions = await cache.get(cacheKey, { 
        namespace: 'search',
        useMemory: true 
      });
      
      if (cachedSuggestions) {
        const responseTime = Date.now() - startTime;
        res.set('X-Cache', 'HIT');
        return res.json({
          success: true,
          data: cachedSuggestions,
          query: finalQuery,
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
          cached: true
        });
      }
      
      const suggestions = [];
      
      if (searchType === 'services' || !type) {
        const serviceSuggestions = await Service.find({
          title: searchRegex,
          status: 'active',
          isActive: true,
          deletedAt: null
        })
        .select('title slug price rating thumbnail')
        .sort({ rating: -1, reviewsCount: -1 })
        .limit(Math.ceil(limitNum / 2))
        .lean();
        
        suggestions.push(...serviceSuggestions.map(item => ({
          type: 'service',
          title: item.title,
          slug: item.slug,
          price: item.price,
          rating: item.rating,
          thumbnail: item.thumbnail,
          url: `/services/${item.slug}`
        })));
      }
      
      if (searchType === 'gigs' || !type) {
        const gigSuggestions = await Gig.find({
          title: searchRegex,
          status: 'open',
          isActive: true,
          deletedAt: null,
          visibility: 'public'
        })
        .select('title slug budget thumbnail urgency')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(limitNum / 2))
        .lean();
        
        suggestions.push(...gigSuggestions.map(item => ({
          type: 'gig',
          title: item.title,
          slug: item.slug,
          price: item.budget,
          thumbnail: item.thumbnail,
          urgency: item.urgency,
          url: `/gigs/${item.slug}`
        })));
      }
      
      const categorySuggestions = await Category.find({
        name: searchRegex,
        isActive: true,
        deletedAt: null,
        isSubcategory: false
      })
      .select('name slug icon')
      .sort({ name: 1 })
      .limit(5)
      .lean();
      
      suggestions.push(...categorySuggestions.map(item => ({
        type: 'category',
        title: item.name,
        slug: item.slug,
        icon: item.icon,
        url: `/categories/${item.slug}`
      })));
      
      const uniqueSuggestions = Array.from(
        new Map(suggestions.map(item => [`${item.type}-${item.slug}`, item])).values()
      ).slice(0, limitNum);
      
      await cache.set(cacheKey, uniqueSuggestions, 300, { 
        namespace: 'search',
        useMemory: true 
      });
      
      const responseTime = Date.now() - startTime;
      res.set('X-Cache', 'MISS');
      
      return res.json({
        success: true,
        data: uniqueSuggestions,
        query: finalQuery,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        cached: false
      });
      
    } catch (error) {
      console.error('Suggestions error:', error);
      
      const responseTime = Date.now() - startTime;
      
      return res.status(500).json({
        success: false,
        message: 'Error fetching suggestions',
        code: 'SUGGESTIONS_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
  }
);

// QUICK SEARCH ENDPOINT - FIXED VERSION
router.get('/quick', 
  async (req, res) => {
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
      
      if (!finalQuery || finalQuery.trim().length < 2) {
        const responseTime = Date.now() - startTime;
        return res.json({
          success: true,
          data: [],
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        });
      }
      
      const searchRegex = new RegExp(`^${escapeRegex(finalQuery)}`, 'i');
      const limitNum = Math.min(parseInt(limit) || 5, 20);
      
      const cacheKey = generateCacheKey('quick_search', {
        query: finalQuery,
        limit: limitNum
      });
      
      const cachedResults = await cache.get(cacheKey, { 
        namespace: 'search',
        useMemory: true 
      });
      
      if (cachedResults) {
        const responseTime = Date.now() - startTime;
        res.set('X-Cache', 'HIT');
        return res.json({
          success: true,
          data: cachedResults,
          query: finalQuery,
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
          cached: true
        });
      }
      
      const results = [];
      
      const serviceResults = await Service.find({
        title: searchRegex,
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
      
      const categoryResults = await Category.find({
        name: searchRegex,
        isActive: true,
        deletedAt: null,
        isSubcategory: false
      })
      .select('name slug icon')
      .limit(Math.ceil(limitNum / 2))
      .lean();
      
      results.push(...categoryResults.map(item => ({
        type: 'category',
        title: item.name,
        slug: item.slug,
        icon: item.icon,
        url: `/categories/${item.slug}`
      })));
      
      const sortedResults = results
        .sort((a, b) => a.type.localeCompare(b.type))
        .slice(0, limitNum);
      
      await cache.set(cacheKey, sortedResults, 300, { 
        namespace: 'search',
        useMemory: true 
      });
      
      const responseTime = Date.now() - startTime;
      res.set('X-Cache', 'MISS');
      
      return res.json({
        success: true,
        data: sortedResults,
        query: finalQuery,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        cached: false
      });
      
    } catch (error) {
      console.error('Quick search error:', error);
      
      const responseTime = Date.now() - startTime;
      
      return res.status(500).json({
        success: false,
        message: 'Error performing quick search',
        code: 'QUICK_SEARCH_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
  }
);

// FILTER OPTIONS ENDPOINT
router.get('/filters', 
  SessionMiddleware.optionalAuth,
  async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const params = cleanSearchParams(req.query);
      
      const {
        query: searchQuery,
        q,
        search,
        type = 'services',
        category: categoryParam,
        subcategory: subcategoryParam
      } = params;
      
      const finalQuery = searchQuery || q || search;
      const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
      const Model = searchType === 'services' ? Service : Gig;
      
      const cacheKey = generateCacheKey(`filters_${searchType}`, {
        query: finalQuery,
        category: categoryParam,
        subcategory: subcategoryParam
      });
      
      const cachedFilters = await cache.get(cacheKey, { 
        namespace: 'search',
        useMemory: true 
      });
      
      if (cachedFilters) {
        const responseTime = Date.now() - startTime;
        res.set('X-Cache', 'HIT');
        
        return res.json({
          success: true,
          data: cachedFilters,
          meta: {
            query: finalQuery,
            type: searchType,
            timestamp: new Date().toISOString()
          },
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
          cached: true
        });
      }
      
      const baseFilter = {
        isActive: true,
        deletedAt: null,
        status: searchType === 'services' ? 'active' : 'open',
        visibility: 'public'
      };
      
      if (categoryParam && isValidObjectId(categoryParam)) {
        const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
        baseFilter[categoryField] = new mongoose.Types.ObjectId(categoryParam);
      }
      
      if (subcategoryParam && isValidObjectId(subcategoryParam)) {
        baseFilter.subcategory = new mongoose.Types.ObjectId(subcategoryParam);
      }
      
      if (finalQuery && finalQuery.length >= 2) {
        const searchRegex = new RegExp(escapeRegex(finalQuery), 'i');
        baseFilter.$or = [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ];
      }
      
      const totalCount = await Model.countDocuments(baseFilter);
      
      const filterOptions = {
        sort: [
          { value: 'relevance', label: 'Most Relevant', icon: 'Sparkles' },
          { value: 'newest', label: 'Newest Arrivals', icon: 'Clock' },
          { value: 'rating', label: 'Highest Rated', icon: 'Star' },
          { value: 'price_low', label: 'Price: Low to High', icon: 'DollarSign' },
          { value: 'price_high', label: 'Price: High to Low', icon: 'DollarSign' },
          { value: 'delivery_fastest', label: 'Fastest Delivery', icon: 'Truck' },
          { value: 'trending', label: 'Trending Now', icon: 'TrendingUp' }
        ],
        budget: [
          { value: '', label: 'Any Budget', range: [0, 10000], count: totalCount },
          { value: '0-50', label: 'Under $50', range: [0, 50], count: 0 },
          { value: '50-100', label: '$50 - $100', range: [50, 100], count: 0 },
          { value: '100-200', label: '$100 - $200', range: [100, 200], count: 0 },
          { value: '200-500', label: '$200 - $500', range: [200, 500], count: 0 },
          { value: '500-1000', label: '$500 - $1,000', range: [500, 1000], count: 0 },
          { value: '1000-10000', label: '$1,000+', range: [1000, 10000], count: 0 }
        ],
        rating: [
          { value: '', label: 'Any Rating', min: 0, count: totalCount },
          { value: '4.5', label: '4.5+ Stars', min: 4.5, count: 0 },
          { value: '4.0', label: '4.0+ Stars', min: 4.0, count: 0 },
          { value: '3.5', label: '3.5+ Stars', min: 3.5, count: 0 },
          { value: '3.0', label: '3.0+ Stars', min: 3.0, count: 0 }
        ]
      };
      
      if (searchType === 'services') {
        filterOptions.deliveryTime = [
          { value: '', label: 'Any Delivery Time', days: null, count: totalCount },
          { value: '1', label: '24 Hours', days: 1, count: 0 },
          { value: '3', label: '1-3 Days', days: 3, count: 0 },
          { value: '7', label: '3-7 Days', days: 7, count: 0 },
          { value: '14', label: '1-2 Weeks', days: 14, count: 0 },
          { value: '30', label: '1 Month', days: 30, count: 0 }
        ];
      }
      
      if (searchType === 'gigs') {
        filterOptions.urgency = [
          { value: '', label: 'Any Urgency', priority: null },
          { value: 'low', label: 'Low Priority', priority: 1 },
          { value: 'medium', label: 'Medium Priority', priority: 2 },
          { value: 'high', label: 'High Priority', priority: 3 },
          { value: 'urgent', label: 'Urgent', priority: 4 }
        ];
        
        filterOptions.timeline = [
          { value: '', label: 'Any Timeline' },
          { value: 'short', label: 'Short-term (1-7 days)' },
          { value: 'medium', label: 'Medium-term (1-4 weeks)' },
          { value: 'long', label: 'Long-term (1-3 months)' }
        ];
      }
      
      if (totalCount > 0) {
        const priceField = searchType === 'services' ? 'price' : 'budget';
        
        const budgetCountPromises = filterOptions.budget.map(async (option) => {
          if (option.value === '') {
            return { ...option, count: totalCount };
          }
          
          const [min, max] = option.range;
          const countFilter = { ...baseFilter };
          
          if (min !== undefined) {
            countFilter[priceField] = { ...countFilter[priceField], $gte: min };
          }
          if (max !== undefined) {
            countFilter[priceField] = { ...countFilter[priceField], $lte: max };
          }
          
          const count = await Model.countDocuments(countFilter);
          return { ...option, count };
        });
        
        filterOptions.budget = await Promise.all(budgetCountPromises);
        
        const ratingCountPromises = filterOptions.rating.map(async (option) => {
          if (option.value === '') {
            return { ...option, count: totalCount };
          }
          
          const minRating = parseFloat(option.value);
          const countFilter = { ...baseFilter, rating: { $gte: minRating } };
          const count = await Model.countDocuments(countFilter);
          return { ...option, count };
        });
        
        filterOptions.rating = await Promise.all(ratingCountPromises);
        
        if (searchType === 'services') {
          const deliveryCountPromises = filterOptions.deliveryTime.map(async (option) => {
            if (option.value === '') {
              return { ...option, count: totalCount };
            }
            
            const days = option.days;
            const countFilter = { ...baseFilter };
            
            if (days !== null) {
              countFilter.deliveryTime = { $lte: days };
            }
            
            const count = await Model.countDocuments(countFilter);
            return { ...option, count };
          });
          
          filterOptions.deliveryTime = await Promise.all(deliveryCountPromises);
        }
      }
      
      await cache.set(cacheKey, filterOptions, 600, { 
        namespace: 'search',
        useMemory: true 
      });
      
      const responseTime = Date.now() - startTime;
      res.set('X-Cache', 'MISS');
      
      return res.json({
        success: true,
        data: filterOptions,
        meta: {
          query: finalQuery,
          type: searchType,
          totalResults: totalCount,
          timestamp: new Date().toISOString()
        },
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        cached: false
      });
      
    } catch (error) {
      console.error('Filter options error:', error);
      
      const responseTime = Date.now() - startTime;
      
      return res.status(500).json({
        success: false,
        message: 'Error fetching filter options',
        code: 'FILTERS_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
  }
);

// SEARCH HISTORY ENDPOINTS
router.get('/history', 
  SessionMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      
      const limit = parseInt(req.query.limit) || 20;
      
      const cacheKey = `user:${user._id}:search_history`;
      const cachedHistory = await cache.get(cacheKey, { 
        namespace: 'user',
        useMemory: true 
      });
      
      if (cachedHistory) {
        return res.json({
          success: true,
          data: cachedHistory.slice(-limit).reverse(),
          total: cachedHistory.length,
          cached: true
        });
      }
      
      const userWithHistory = await User.findById(user._id)
        .select('searchHistory')
        .lean();
      
      const history = userWithHistory?.searchHistory || [];
      
      await cache.set(cacheKey, history, 300, { 
        namespace: 'user',
        useMemory: true 
      });
      
      return res.json({
        success: true,
        data: history.slice(-limit).reverse(),
        total: history.length,
        cached: false
      });
      
    } catch (error) {
      console.error('Get search history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching search history',
        code: 'HISTORY_ERROR'
      });
    }
  }
);

router.post('/history', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  async (req, res) => {
    try {
      const user = req.user;
      
      const { query, type = 'search', filters = {} } = req.body;
      
      if (!query || query.trim().length < 1) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          code: 'QUERY_REQUIRED'
        });
      }
      
      await User.findByIdAndUpdate(user._id, {
        $push: {
          searchHistory: {
            $each: [{
              query: query.trim(),
              type,
              filters: Object.keys(filters).slice(0, 5),
              timestamp: new Date()
            }],
            $slice: -50
          }
        }
      });
      
      await cache.del(`user:${user._id}:search_history`);
      await cache.del(`user:${user._id}:personalization`);
      
      return res.json({
        success: true,
        message: 'Search history updated'
      });
      
    } catch (error) {
      console.error('Save search history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error saving search history',
        code: 'HISTORY_SAVE_ERROR'
      });
    }
  }
);

router.delete('/history', 
  SessionMiddleware.authenticate,
  CSRFMiddleware.requireCSRF,
  async (req, res) => {
    try {
      const user = req.user;
      
      await User.findByIdAndUpdate(user._id, {
        $set: {
          searchHistory: []
        }
      });
      
      await cache.del(`user:${user._id}:search_history`);
      await cache.del(`user:${user._id}:personalization`);
      
      return res.json({
        success: true,
        message: 'Search history cleared'
      });
      
    } catch (error) {
      console.error('Clear search history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error clearing search history',
        code: 'HISTORY_CLEAR_ERROR'
      });
    }
  }
);

// SEARCH STATISTICS ENDPOINT
router.get('/stats', 
  SessionMiddleware.optionalAuth,
  async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const cacheKey = 'search_stats';
      const cachedStats = await cache.get(cacheKey, { 
        namespace: 'search',
        useMemory: true 
      });
      
      if (cachedStats) {
        const responseTime = Date.now() - startTime;
        res.set('X-Cache', 'HIT');
        
        return res.json({
          success: true,
          data: cachedStats,
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`,
          cached: true
        });
      }
      
      const [totalServices, totalGigs, totalCategories] = await Promise.all([
        Service.countDocuments({ status: 'active', isActive: true, deletedAt: null }),
        Gig.countDocuments({ status: 'open', isActive: true, deletedAt: null, visibility: 'public' }),
        Category.countDocuments({ isActive: true, deletedAt: null, isSubcategory: false })
      ]);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const [recentServices, recentGigs] = await Promise.all([
        Service.countDocuments({
          status: 'active',
          isActive: true,
          deletedAt: null,
          createdAt: { $gte: sevenDaysAgo }
        }),
        Gig.countDocuments({
          status: 'open',
          isActive: true,
          deletedAt: null,
          visibility: 'public',
          createdAt: { $gte: sevenDaysAgo }
        })
      ]);
      
      const topCategories = await Category.aggregate([
        {
          $match: {
            isActive: true,
            deletedAt: null,
            isSubcategory: false
          }
        },
        {
          $lookup: {
            from: 'services',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$category', '$$categoryId'] },
                  status: 'active',
                  isActive: true,
                  deletedAt: null
                }
              },
              { $count: 'serviceCount' }
            ],
            as: 'serviceStats'
          }
        },
        {
          $lookup: {
            from: 'gigs',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$projectCategory', '$$categoryId'] },
                  status: 'open',
                  isActive: true,
                  deletedAt: null,
                  visibility: 'public'
                }
              },
              { $count: 'gigCount' }
            ],
            as: 'gigStats'
          }
        },
        {
          $addFields: {
            servicesCount: { $ifNull: [{ $arrayElemAt: ['$serviceStats.serviceCount', 0] }, 0] },
            gigsCount: { $ifNull: [{ $arrayElemAt: ['$gigStats.gigCount', 0] }, 0] },
            totalItems: { $add: ['$servicesCount', '$gigsCount'] }
          }
        },
        { $sort: { totalItems: -1 } },
        { $limit: 8 },
        {
          $project: {
            name: 1,
            slug: 1,
            icon: 1,
            servicesCount: 1,
            gigsCount: 1,
            totalItems: 1
          }
        }
      ]);
      
      const statsData = {
        totals: {
          services: totalServices,
          gigs: totalGigs,
          categories: totalCategories
        },
        recentActivity: {
          services: recentServices,
          gigs: recentGigs,
          period: '7 days'
        },
        topCategories
      };
      
      await cache.set(cacheKey, statsData, 900, { 
        namespace: 'search',
        useMemory: true 
      });
      
      const responseTime = Date.now() - startTime;
      res.set('X-Cache', 'MISS');
      
      return res.json({
        success: true,
        data: statsData,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        cached: false
      });
      
    } catch (error) {
      console.error('Search stats error:', error);
      
      const responseTime = Date.now() - startTime;
      
      return res.status(500).json({
        success: false,
        message: 'Error fetching search statistics',
        code: 'STATS_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
  }
);

// ADVANCED SEARCH ENDPOINT (POST) - Requires CSRF
router.post('/advanced', 
  SessionMiddleware.optionalAuth,
  CSRFMiddleware.requireCSRF,
  async (req, res) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      const user = req.user || null;
      const params = cleanSearchParams(req.body, user);
      
      const {
        query: searchQuery,
        q,
        search,
        type = 'services',
        page = 1,
        limit = 24,
        sort = 'relevance',
        order = 'desc'
      } = params;
      
      const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
      const finalQuery = searchQuery || q || search;
      
      if (!finalQuery || finalQuery.trim().length < 1) {
        const responseTime = Date.now() - startTime;
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          code: 'QUERY_REQUIRED',
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: `${responseTime}ms`
        });
      }
      
      const baseFilter = buildSearchFilter(params, searchType, user);
      
      let hasTextSearch = false;
      if (finalQuery && finalQuery.trim().length >= 1) {
        const textSearchQuery = buildTextSearchQuery(finalQuery, searchType, params);
        
        if (textSearchQuery.$text) {
          baseFilter.$text = textSearchQuery.$text;
          hasTextSearch = true;
        } else if (textSearchQuery.$or) {
          if (!baseFilter.$or) baseFilter.$or = [];
          baseFilter.$or.push(...textSearchQuery.$or);
        }
      }
      
      const sortOptions = getSortOptions(sort, searchType, hasTextSearch, params, user);
      const Model = searchType === 'services' ? Service : Gig;
      
      const totalCount = await Model.countDocuments(baseFilter);
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(parseInt(limit) || 24, 100);
      const skip = (pageNum - 1) * limitNum;
      
      let query = Model.find(baseFilter);
      
      if (hasTextSearch && sort === 'relevance') {
        query = query.select({ score: { $meta: 'textScore' } });
        query = query.sort({ score: { $meta: 'textScore' } });
      } else {
        query = query.sort(sortOptions);
      }
      
      query = query.skip(skip).limit(limitNum);
      
      const selectFields = searchType === 'services' 
        ? 'title slug description shortDescription price currency rating reviewsCount views likes deliveryTime deliveryTimeUnit images thumbnail tags isFeatured isRecommended isPopular status visibility urgency createdAt updatedAt createdBy category subcategory'
        : 'title slug description budget currency status urgency timeline timelineUnit images thumbnail skillsRequired isActive visibility createdAt updatedAt createdBy projectCategory';
      
      query = query.select(selectFields);
      
      let results = await query.lean();
      
      const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      const responseTime = Date.now() - startTime;
      
      return res.json({
        success: true,
        data: {
          results,
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
            totalResults: totalCount,
            showing: results.length,
            sort,
            order
          }
        },
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
      
    } catch (error) {
      console.error('Advanced search error:', error);
      
      const responseTime = Date.now() - startTime;
      
      return res.status(500).json({
        success: false,
        message: 'Error performing advanced search',
        code: 'ADVANCED_SEARCH_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
    }
  }
);

// SEARCH CACHE MANAGEMENT (Admin only)
router.post('/cache/clear', 
  SessionMiddleware.authenticate,
  SessionMiddleware.authorize(['admin', 'moderator']),
  CSRFMiddleware.requireCSRF,
  async (req, res) => {
    try {
      const { pattern = 'search:*' } = req.body;
      
      const cleared = await cache.del(pattern);
      
      return res.json({
        success: true,
        message: `Cache cleared: ${cleared} keys`,
        cleared
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error clearing cache'
      });
    }
  }
);

// HEALTH CHECK ENDPOINT
router.get('/health', 
  async (req, res) => {
    try {
      const [serviceCount, gigCount, categoryCount] = await Promise.all([
        Service.countDocuments({}),
        Gig.countDocuments({}),
        Category.countDocuments({})
      ]);
      
      const cacheStats = cache.stats();
      const cacheHealth = await cache.health();
      
      return res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          counts: {
            services: serviceCount,
            gigs: gigCount,
            categories: categoryCount
          },
          cache: cacheStats,
          cacheHealth: cacheHealth,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        }
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Search service unhealthy',
        error: error.message
      });
    }
  }
);

// CSRF Token endpoint for search page
router.get('/csrf-token',
  SessionMiddleware.optionalAuth,
  (req, res) => {
    const token = CSRFMiddleware.generateToken(req, res);
    
    return res.json({
      success: true,
      csrfToken: token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
  }
);

// DEBUG ENDPOINT (Development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/cache', async (req, res) => {
    try {
      const pattern = req.query.pattern || 'search:*';
      const keys = await cache.keys(pattern, { namespace: 'search' });
      
      return res.json({
        success: true,
        pattern,
        keys,
        count: keys.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Cache debug error',
        error: error.message
      });
    }
  });
}

module.exports = router;