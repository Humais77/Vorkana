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

// Helper function to generate request ID
const generateRequestId = () => crypto.randomBytes(8).toString('hex');

// Helper function to generate cache key
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

// Enhanced sanitization with advanced SQL injection protection
const enhancedSanitizeSearchInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove all SQL injection patterns
  const sqlPatterns = [
    /'|"|`/g,
    /;/g,
    /--/g,
    /\b(?:OR|AND|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|JOIN|EXEC|EXECUTE|DECLARE|MERGE)\b/gi,
    /\(.*?\)/g,
    /\$\{.*?\}/g,
    /\\/g
  ];
  
  let sanitized = value;
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Advanced injection pattern detection
  const advancedInjectionPatterns = [
    /\bOR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
    /\bAND\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
    /'.*?'.*?'/,
    /\$\{.*\}/,
    /<.*>.*<\/.*>/,
    /javascript:/i,
    /data:/i,
    /eval\s*\(/i
  ];
  
  advancedInjectionPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      console.warn(`Advanced injection attempt detected: ${sanitized}`);
      return '';
    }
  });
  
  // Remove any remaining special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_+@.,&()]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length < 2) return '';
  if (sanitized.length > 200) sanitized = sanitized.substring(0, 200);
  
  return sanitized;
};

// Advanced query cleaning with semantic analysis
const cleanSearchParams = (params, user) => {
  const cleaned = {};
  
  const allowedParams = [
    'query', 'q', 'search', 'type', 'page', 'limit', 'offset',
    'min_price', 'max_price', 'minPrice', 'maxPrice',
    'min_rating', 'max_rating', 'minRating', 'maxRating',
    'category', 'category_id', 'categoryId',
    'subcategory', 'subcategory_id', 'subcategoryId',
    'seller', 'seller_id', 'sellerId', 'createdBy',
    'currency', 'urgency', 'budget', 'timeline',
    'skills', 'skills_required', 'tags', 'keywords',
    'featured', 'popular', 'recommended', 'trending',
    'has_images', 'has_attachments', 'has_packages', 'has_video',
    'status', 'visibility', 'is_active',
    'created_after', 'created_before',
    'updated_after', 'updated_before',
    'cache', 'populate', 'fields',
    'search_in', 'source', 'fuzzy', 'exact',
    'include_inactive', 'show_all', 'boost',
    'location', 'country', 'city',
    'delivery_time', 'deliveryTime',
    'revisions', 'min_reviews', 'max_reviews',
    'experience_level', 'pro_level',
    'language', 'timezone',
    'sort_by', 'sort_order'
  ];
  
  Object.keys(params).forEach(key => {
    if (!allowedParams.includes(key) && !key.startsWith('x-')) {
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
        return;
      }
      
      // Enhanced security validation
      if (key === 'query' || key === 'q' || key === 'search') {
        value = enhancedSanitizeSearchInput(value);
        if (!value || value.length < 2) {
          return;
        }
        
        // Detect search intent
        const intentKeywords = {
          urgent: /\b(urgent|asap|immediate|fast|quick|rush)\b/i,
          cheap: /\b(cheap|budget|low cost|affordable|inexpensive)\b/i,
          premium: /\b(premium|professional|expert|top|best|quality)\b/i,
          beginner: /\b(beginner|newbie|starter|basic|simple)\b/i,
          complex: /\b(complex|advanced|custom|enterprise|sophisticated)\b/i
        };
        
        for (const [intent, pattern] of Object.entries(intentKeywords)) {
          if (pattern.test(value)) {
            cleaned[`intent_${intent}`] = true;
          }
        }
        
      } else if (key === 'location' || key === 'country' || key === 'city') {
        // Sanitize location-based parameters
        value = sanitizeHtml(value, { allowedTags: [] }).trim();
        if (value.length > 100) value = value.substring(0, 100);
        
      } else if (key === 'skills' || key === 'tags' || key === 'keywords') {
        // Handle array parameters with advanced sanitization
        const items = typeof value === 'string' ? value.split(',').map(item => item.trim()) : value;
        const sanitizedItems = items.map(item => 
          enhancedSanitizeSearchInput(item)
        ).filter(item => item && item.length >= 2);
        
        if (sanitizedItems.length > 0) {
          cleaned[key] = sanitizedItems;
          
          // Add skill similarity boost if user has matching skills
          if (user && user.skills && key === 'skills') {
            const userSkills = Array.isArray(user.skills) ? user.skills : [user.skills];
            const matchingSkills = sanitizedItems.filter(skill => 
              userSkills.some(userSkill => 
                userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(userSkill.toLowerCase())
              )
            );
            if (matchingSkills.length > 0) {
              cleaned['skill_match_boost'] = true;
            }
          }
        }
        return;
      }
    }
    
    // Type conversion with validation
    if (value === 'true' || value === 'false') {
      cleaned[key] = value === 'true';
    } else if (!isNaN(value) && value !== '' && typeof value !== 'object') {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        // Additional validation based on parameter type
        if (key.includes('price') || key.includes('budget')) {
          if (num >= 0 && num <= 1000000) cleaned[key] = num;
        } else if (key.includes('rating')) {
          if (num >= 0 && num <= 5) cleaned[key] = num;
        } else if (key.includes('reviews')) {
          if (num >= 0 && num <= 100000) cleaned[key] = num;
        } else {
          cleaned[key] = num;
        }
      } else {
        cleaned[key] = value;
      }
    } else if (isValidObjectId(value)) {
      cleaned[key] = value;
    } else {
      cleaned[key] = value;
    }
  });
  
  // Add user-based preferences if user exists
  if (user) {
    if (!cleaned.country && user.country) {
      cleaned.user_country = user.country;
    }
    if (!cleaned.currency && user.currency) {
      cleaned.user_currency = user.currency;
    }
    if (user.role === 'admin') {
      cleaned.admin_view = true;
    }
  }
  
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

// Build advanced search filter
const buildSearchFilter = async (params, searchType, user) => {
  const filter = {};
  const { 
    query, q, search,
    min_price, max_price, minPrice, maxPrice,
    min_rating, max_rating, minRating, maxRating,
    category, category_id, categoryId,
    subcategory, subcategory_id, subcategoryId,
    seller, seller_id, sellerId, createdBy,
    currency, urgency, budget, timeline,
    skills, skills_required, tags, keywords,
    featured, popular, recommended, trending,
    has_images, has_attachments, has_packages, has_video,
    status, visibility, is_active,
    created_after, created_before,
    updated_after, updated_before,
    include_inactive, show_all,
    delivery_time, deliveryTime,
    revisions, min_reviews, max_reviews,
    experience_level, pro_level,
    language, timezone, location,
    country, city,
    intent_urgent, intent_cheap, intent_premium, 
    intent_beginner, intent_complex,
    skill_match_boost,
    user_country, user_currency,
    admin_view
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
    filter.visibility = 'public';
  }
  
  // Category filter with hierarchy support
  const categoryParam = category || category_id || categoryId;
  if (categoryParam && isValidObjectId(categoryParam)) {
    if (searchType === 'services') {
      filter.category = new mongoose.Types.ObjectId(categoryParam);
    } else if (searchType === 'gigs') {
      filter.projectCategory = new mongoose.Types.ObjectId(categoryParam);
    }
    
    // If user has preference for this category, boost results
    if (user && user.preferences && user.preferences.favoriteCategories) {
      if (user.preferences.favoriteCategories.includes(categoryParam)) {
        filter.category_boost = true;
      }
    }
  }
  
  // Subcategory filter
  const subcategoryParam = subcategory || subcategory_id || subcategoryId;
  if (subcategoryParam && isValidObjectId(subcategoryParam)) {
    filter.subcategory = new mongoose.Types.ObjectId(subcategoryParam);
  }
  
  // Seller/creator filter with rating consideration
  const sellerParam = seller || seller_id || sellerId || createdBy;
  if (sellerParam && isValidObjectId(sellerParam)) {
    filter.createdBy = new mongoose.Types.ObjectId(sellerParam);
    
    // If filtering by seller, optionally include their rating
    if (min_rating || max_rating) {
      // This would require a more complex aggregation
      // For now, we'll filter after query execution
    }
  }
  
  // Advanced price/budget filter with currency conversion
  const priceMin = min_price || minPrice;
  const priceMax = max_price || maxPrice;
  const priceField = searchType === 'services' ? 'price' : 'budget';
  
  if (priceMin !== undefined || priceMax !== undefined) {
    filter[priceField] = {};
    if (priceMin !== undefined) filter[priceField].$gte = parseFloat(priceMin);
    if (priceMax !== undefined) filter[priceField].$lte = parseFloat(priceMax);
  }
  
  // Apply intent-based filtering
  if (intent_urgent) {
    if (searchType === 'services') {
      filter.deliveryTime = { $lte: 3 }; // 3 days or less for urgent
    } else if (searchType === 'gigs') {
      filter.urgency = { $in: ['urgent', 'high'] };
    }
  }
  
  if (intent_cheap) {
    const cheapThreshold = searchType === 'services' ? 50 : 100;
    filter[priceField] = { ...filter[priceField], $lte: cheapThreshold };
  }
  
  if (intent_premium) {
    filter.$or = [
      { isFeatured: true },
      { rating: { $gte: 4.5 } },
      { 'createdBy.accountType': 'premium' }
    ];
  }
  
  // Rating filter with review count consideration
  const ratingMin = min_rating || minRating;
  const ratingMax = max_rating || maxRating;
  if (ratingMin !== undefined || ratingMax !== undefined) {
    filter.rating = {};
    if (ratingMin !== undefined) filter.rating.$gte = parseFloat(ratingMin);
    if (ratingMax !== undefined) filter.rating.$lte = parseFloat(ratingMax);
  }
  
  // Review count filter
  if (min_reviews !== undefined || max_reviews !== undefined) {
    filter.reviewsCount = {};
    if (min_reviews !== undefined) filter.reviewsCount.$gte = parseInt(min_reviews);
    if (max_reviews !== undefined) filter.reviewsCount.$lte = parseInt(max_reviews);
  }
  
  // Location-based filtering (if seller location is available)
  if (country || city || location) {
    // This requires seller location data in the model
    // For now, we'll implement this through aggregation
  }
  
  // Language filter
  if (language) {
    // This requires language data in the model
  }
  
  // Experience level filter
  if (experience_level) {
    const levels = Array.isArray(experience_level) ? experience_level : [experience_level];
    filter['createdBy.level'] = { $in: levels.map(l => l.toLowerCase()) };
  }
  
  // Pro level filter
  if (pro_level === true || pro_level === 'true') {
    filter['createdBy.accountType'] = { $in: ['premium', 'business', 'pro'] };
  }
  
  // Boolean filters
  if (featured !== undefined) filter.isFeatured = featured === true || featured === 'true';
  if (popular !== undefined) filter.isPopular = popular === true || popular === 'true';
  if (recommended !== undefined) filter.isRecommended = recommended === true || recommended === 'true';
  if (trending !== undefined) {
    // Trending items have high view/like ratio in recent period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.createdAt = { $gte: thirtyDaysAgo };
    filter.$expr = { 
      $gte: [
        { $divide: ['$views', { $add: [1, { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] }] }] },
        10 // Minimum views per day
      ]
    };
  }
  
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
  if (has_video === true || has_video === 'true') {
    filter.hasVideo = true;
  }
  
  // Revisions filter (for services)
  if (revisions !== undefined && searchType === 'services') {
    if (revisions === 'unlimited') {
      filter.revisions = { $gte: 99 };
    } else {
      const revNum = parseInt(revisions);
      if (!isNaN(revNum)) {
        filter.revisions = { $gte: revNum };
      }
    }
  }
  
  const deliveryParam = delivery_time || deliveryTime;
if (deliveryParam !== undefined && deliveryParam !== '') {
  if (searchType === 'services') {
    // Ensure deliveryParam is a string/number, not an object
    if (typeof deliveryParam === 'string') {
      if (deliveryParam.includes('-')) {
        const [min, max] = deliveryParam.split('-').map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          filter.deliveryTime = { $gte: min, $lte: max };
        }
      } else if (deliveryParam === 'express') {
        filter.deliveryTime = { $lte: 3 };
      } else if (deliveryParam === 'standard') {
        filter.deliveryTime = { $gte: 4, $lte: 14 };
      } else if (deliveryParam === 'extended') {
        filter.deliveryTime = { $gte: 15 };
      } else {
        // Parse as number
        const deliveryNumber = Number(deliveryParam);
        if (!isNaN(deliveryNumber)) {
          filter.deliveryTime = deliveryNumber;
        }
      }
    } else if (typeof deliveryParam === 'number') {
      filter.deliveryTime = deliveryParam;
    }
  }
}
  
  // Currency filter with user preference
  const currencyParam = currency || user_currency;
  if (currencyParam && typeof currencyParam === 'string') {
    filter.currency = currencyParam.toUpperCase();
  }
  
  // Urgency filter (for gigs)
  if (urgency && searchType === 'gigs') {
    filter.urgency = urgency.toLowerCase();
  }
  
  // Skills filter with similarity scoring
  const skillsParam = skills || skills_required;
  if (skillsParam) {
    const skillsArray = Array.isArray(skillsParam) ? skillsParam : skillsParam.split(',');
    const sanitizedSkills = skillsArray.map(skill => 
      sanitizeHtml(skill.trim().toLowerCase(), { allowedTags: [] })
    ).filter(skill => skill.length > 0);
    
    if (sanitizedSkills.length > 0) {
      if (searchType === 'services') {
        filter.tags = { $in: sanitizedSkills };
      } else if (searchType === 'gigs') {
        filter.skillsRequired = { $in: sanitizedSkills };
      }
      
      // Add skill match boost if requested
      if (skill_match_boost) {
        filter.skill_match_boost = true;
      }
    }
  }
  
  // Tags/keywords filter with fuzzy matching option
  const tagsParam = tags || keywords;
  if (tagsParam && searchType === 'services') {
    const tagsArray = Array.isArray(tagsParam) ? tagsParam : tagsParam.split(',');
    const sanitizedTags = tagsArray.map(tag => 
      sanitizeHtml(tag.trim().toLowerCase(), { allowedTags: [] })
    ).filter(tag => tag.length > 0);
    
    if (sanitizedTags.length > 0) {
      filter.tags = { $in: sanitizedTags };
    }
  }
  
  // Timeline filter (for gigs)
  if (timeline && searchType === 'gigs') {
    const timelineStr = timeline.toString().toLowerCase();
    if (timelineStr === 'short') {
      filter.timelineUnit = 'days';
      filter.$expr = { $lte: ['$timeline', 7] };
    } else if (timelineStr === 'medium') {
      filter.timeline = { $gte: 8, $lte: 30 };
    } else if (timelineStr === 'long') {
      filter.timeline = { $gt: 30 };
    }
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
  
  addDateFilter('createdAt', created_after, '$gte');
  addDateFilter('createdAt', created_before, '$lte');
  addDateFilter('updatedAt', updated_after, '$gte');
  addDateFilter('updatedAt', updated_before, '$lte');
  
  // Status filter (override defaults if specified)
  if (status && searchType === 'services') {
    filter.status = status;
  }
  
  // Visibility filter (for gigs)
  if (visibility && searchType === 'gigs') {
    filter.visibility = visibility;
  }
  
  // Include inactive items if requested (admin only)
  if ((include_inactive === true || include_inactive === 'true') && admin_view) {
    delete filter.isActive;
    delete filter.status;
  }
  
  return filter;
};

// Advanced sort options with user-based personalization
const getSortOptions = (sortParam, searchType, hasTextSearch, params, user) => {
  const sort = sortParam || 'relevance';
  const sortOrder = params.order || 'desc';
  const orderValue = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  
  // Base sort configuration
  let sortConfig = {};
  
  if (hasTextSearch && (sort.toLowerCase() === 'relevance' || !sort)) {
    // Text search relevance with additional factors
    sortConfig = { 
      score: { $meta: 'textScore' },
      isFeatured: -1,
      rating: -1,
      reviewsCount: -1,
      createdAt: -1 
    };
  } else {
    switch(sort.toLowerCase()) {
      case 'relevance':
        // Non-text relevance based on multiple factors
        sortConfig = { 
          isFeatured: -1,
          rating: -1,
          reviewsCount: -1,
          views: -1,
          likes: -1,
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
          rating: -1,
          isPopular: -1
        };
        break;
      
      case 'featured':
        sortConfig = { isFeatured: -1, rating: -1 };
        break;
      
      case 'trending':
        // Calculate trending score based on recent engagement
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        sortConfig = { 
          trendingScore: -1,
          views: -1,
          likes: -1
        };
        break;
      
      case 'recommended':
        if (user) {
          // Personalized recommendations based on user history
          sortConfig = {
            isRecommended: -1,
            'createdBy.rating': -1,
            'createdBy.completedOrders': -1,
            rating: -1
          };
        } else {
          sortConfig = { isRecommended: -1, rating: -1 };
        }
        break;
      
      case 'best_seller':
        sortConfig = { 
          'createdBy.rating': -1,
          'createdBy.completedOrders': -1,
          rating: -1,
          reviewsCount: -1
        };
        break;
      
      default:
        sortConfig = { 
          score: hasTextSearch ? { $meta: 'textScore' } : undefined,
          isFeatured: -1,
          rating: -1,
          reviewsCount: -1,
          createdAt: -1 
        };
    }
  }
  
  // Apply sort order to all fields
  if (orderValue === 1) {
    Object.keys(sortConfig).forEach(key => {
      if (typeof sortConfig[key] === 'number') {
        sortConfig[key] = Math.abs(sortConfig[key]);
      }
    });
  }
  
  // Remove undefined values
  Object.keys(sortConfig).forEach(key => {
    if (sortConfig[key] === undefined) {
      delete sortConfig[key];
    }
  });
  
  return sortConfig;
};

// Advanced text search query builder
const buildTextSearchQuery = (searchQuery, searchType, params) => {
  const { fuzzy = 'false', exact = 'false' } = params;
  const sanitizedQuery = searchQuery.trim();
  
  if (exact === 'true') {
    // Exact match search
    return {
      $text: { 
        $search: `"${sanitizedQuery}"`,
        $caseSensitive: false,
        $diacriticSensitive: false 
      }
    };
  }
  
  if (fuzzy === 'true' || sanitizedQuery.split(' ').length === 1) {
    // Fuzzy search for single words or when explicitly requested
    const escapedQuery = escapeRegex(sanitizedQuery);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    const searchFields = searchType === 'services' 
      ? ['title', 'description', 'shortDescription', 'tags', 'searchKeywords']
      : ['title', 'description', 'skillsRequired', 'deliverables'];
    
    return {
      $or: searchFields.map(field => ({
        [field]: searchRegex
      }))
    };
  }
  
  // Standard text search
  return {
    $text: { 
      $search: sanitizedQuery,
      $caseSensitive: false,
      $diacriticSensitive: false 
    }
  };
};

// Get user-based personalized recommendations
const getUserPersonalization = async (userId, searchType) => {
  if (!userId) return null;
  
  try {
    const user = await User.findById(userId)
      .select('preferences searchHistory favorites skills country currency')
      .lean();
    
    if (!user) return null;
    
    const personalization = {
      preferredCategories: [],
      preferredSkills: [],
      locationBias: null,
      currencyPreference: null,
      pastSearches: [],
      favoriteSellers: []
    };
    
    // Extract preferences
    if (user.preferences) {
      if (user.preferences.favoriteCategories) {
        personalization.preferredCategories = user.preferences.favoriteCategories;
      }
      if (user.preferences.favoriteSkills) {
        personalization.preferredSkills = user.preferences.favoriteSkills;
      }
    }
    
    // Extract skills
    if (user.skills && Array.isArray(user.skills)) {
      personalization.preferredSkills = [
        ...personalization.preferredSkills,
        ...user.skills
      ];
    }
    
    // Location bias
    if (user.country) {
      personalization.locationBias = user.country;
    }
    
    // Currency preference
    if (user.currency) {
      personalization.currencyPreference = user.currency;
    }
    
    // Search history (last 10 searches)
    if (user.searchHistory && Array.isArray(user.searchHistory)) {
      personalization.pastSearches = user.searchHistory
        .slice(-10)
        .map(history => history.query)
        .filter(Boolean);
    }
    
    return personalization;
  } catch (error) {
    console.error('Error getting user personalization:', error);
    return null;
  }
};

// Build personalized search boost
const buildPersonalizedBoost = (filter, personalization, searchType, searchQuery) => {
  const boostedFilter = { ...filter };
  const boostConditions = [];
  
  if (!personalization) return filter;
  
  // Category boost
  if (personalization.preferredCategories && personalization.preferredCategories.length > 0) {
    const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
    boostConditions.push({
      [categoryField]: { $in: personalization.preferredCategories }
    });
  }
  
  // Skill boost
  if (personalization.preferredSkills && personalization.preferredSkills.length > 0) {
    const skillField = searchType === 'services' ? 'tags' : 'skillsRequired';
    const skillConditions = personalization.preferredSkills.map(skill => ({
      [skillField]: { 
        $elemMatch: { 
          $regex: new RegExp(escapeRegex(skill), 'i') 
        } 
      }
    }));
    
    if (skillConditions.length > 0) {
      boostConditions.push({ $or: skillConditions });
    }
  }
  
  // Past search relevance boost
  if (personalization.pastSearches && personalization.pastSearches.length > 0) {
    const searchTerms = personalization.pastSearches.join(' ');
    const searchRegex = new RegExp(
      personalization.pastSearches.map(term => escapeRegex(term)).join('|'),
      'i'
    );
    
    boostConditions.push({
      $or: [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
      ]
    });
  }
  
  // If we have boost conditions, add them as $or to the filter
  if (boostConditions.length > 0) {
    if (!boostedFilter.$or) {
      boostedFilter.$or = [];
    }
    boostedFilter.$or.push(...boostConditions);
    
    // Ensure we don't have too many conditions
    if (boostedFilter.$or.length > 10) {
      boostedFilter.$or = boostedFilter.$or.slice(0, 10);
    }
  }
  
  return boostedFilter;
};

// Advanced aggregation pipeline for search
const buildAggregationPipeline = (filter, sortOptions, skip, limit, searchType, searchQuery, personalization) => {
  const pipeline = [];
  
  // Match stage
  pipeline.push({ $match: filter });
  
  // Lookup creator details
  const creatorLookup = {
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'creatorDetails'
    }
  };
  pipeline.push(creatorLookup);
  
  // Unwind creator
  pipeline.push({ $unwind: { path: '$creatorDetails', preserveNullAndEmptyArrays: true } });
  
  // Lookup category
  const categoryLookup = {
    $lookup: {
      from: 'categories',
      localField: searchType === 'services' ? 'category' : 'projectCategory',
      foreignField: '_id',
      as: 'categoryDetails'
    }
  };
  pipeline.push(categoryLookup);
  
  // Unwind category
  pipeline.push({ $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } });
  
  // Lookup subcategory if exists
  pipeline.push({
    $lookup: {
      from: 'subcategories',
      localField: 'subcategory',
      foreignField: '_id',
      as: 'subcategoryDetails'
    }
  });
  
  pipeline.push({ $unwind: { path: '$subcategoryDetails', preserveNullAndEmptyArrays: true } });
  
  // Add computed fields
  pipeline.push({
    $addFields: {
      // Calculate engagement score
      engagementScore: {
        $add: [
          { $multiply: ['$views', 0.1] },
          { $multiply: ['$likes', 0.5] },
          { $multiply: ['$reviewsCount', 1] },
          { $multiply: ['$rating', 10] }
        ]
      },
      
      // Calculate freshness score
      freshnessScore: {
        $divide: [
          { $subtract: [new Date(), '$createdAt'] },
          86400000 // milliseconds in a day
        ]
      },
      
      // Calculate seller reliability score
      sellerScore: {
        $cond: {
          if: { $gt: ['$creatorDetails.completedOrders', 0] },
          then: {
            $add: [
              { $multiply: ['$creatorDetails.rating', 20] },
              { $multiply: ['$creatorDetails.responseRate', 0.1] },
              { $multiply: [{ $divide: ['$creatorDetails.completedOrders', 100] }, 5] }
            ]
          },
          else: 0
        }
      },
      
      // Personalization score
      personalizationScore: personalization ? {
        $cond: [
          {
            $or: [
              { $in: ['$category', personalization.preferredCategories] },
              { $in: ['$projectCategory', personalization.preferredCategories] },
              {
                $gt: [
                  {
                    $size: {
                      $setIntersection: [
                        '$tags',
                        personalization.preferredSkills
                      ]
                    }
                  },
                  0
                ]
              }
            ]
          },
          100,
          0
        ]
      } : 0
    }
  });
  
  // Calculate relevance score
  if (searchQuery) {
    pipeline.push({
      $addFields: {
        textMatchScore: {
          $cond: {
            if: { $ifNull: ['$score', false] },
            then: '$score',
            else: {
              $add: [
                {
                  $cond: [
                    { $regexMatch: { input: '$title', regex: new RegExp(escapeRegex(searchQuery), 'i') } },
                    50,
                    0
                  ]
                },
                {
                  $cond: [
                    { $regexMatch: { input: '$description', regex: new RegExp(escapeRegex(searchQuery), 'i') } },
                    20,
                    0
                  ]
                },
                {
                  $cond: [
                    searchType === 'services' 
                      ? { $in: [searchQuery.toLowerCase(), '$tags'] }
                      : { $in: [searchQuery.toLowerCase(), '$skillsRequired'] },
                    30,
                    0
                  ]
                }
              ]
            }
          }
        }
      }
    });
  }
  
  // Calculate final relevance score
  pipeline.push({
    $addFields: {
      relevanceScore: {
        $add: [
          { $ifNull: ['$textMatchScore', 0] },
          { $multiply: ['$engagementScore', 0.3] },
          { $multiply: [{ $subtract: [100, { $min: ['$freshnessScore', 100] }] }, 0.2] },
          { $multiply: ['$sellerScore', 0.2] },
          { $multiply: ['$personalizationScore', 0.3] },
          { $cond: [{ $eq: ['$isFeatured', true] }, 50, 0] },
          { $cond: [{ $eq: ['$isRecommended', true] }, 30, 0] },
          { $cond: [{ $eq: ['$isPopular', true] }, 20, 0] }
        ]
      }
    }
  });
  
  // Sort stage
  if (sortOptions.relevanceScore) {
    pipeline.push({ $sort: { relevanceScore: -1 } });
  } else {
    // Convert sort options to aggregation sort format
    const sortStage = {};
    Object.keys(sortOptions).forEach(key => {
      sortStage[key] = sortOptions[key];
    });
    pipeline.push({ $sort: sortStage });
  }
  
  // Skip and limit
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });
  
  // Project final fields
  const projectStage = {
    $project: {
      // Basic fields
      _id: 1,
      title: 1,
      slug: 1,
      description: 1,
      shortDescription: 1,
      price: 1,
      budget: 1,
      currency: 1,
      rating: 1,
      reviewsCount: 1,
      views: 1,
      likes: 1,
      deliveryTime: 1,
      deliveryTimeUnit: 1,
      timeline: 1,
      timelineUnit: 1,
      images: 1,
      thumbnail: 1,
      tags: 1,
      skillsRequired: 1,
      isFeatured: 1,
      isRecommended: 1,
      isPopular: 1,
      status: 1,
      visibility: 1,
      urgency: 1,
      createdAt: 1,
      updatedAt: 1,
      type: { $literal: searchType },
      
      // Computed fields
      relevanceScore: 1,
      engagementScore: 1,
      sellerScore: 1,
      
      // Formatted fields
      priceFormatted: {
        $concat: [
          { $ifNull: ['$currency', 'USD'] },
          ' ',
          { $toString: { $round: [{ $ifNull: ['$price', '$budget', 0] }, 2] } }
        ]
      },
      deliveryFormatted: searchType === 'services' ? {
        $concat: [
          { $toString: { $ifNull: ['$deliveryTime', 0] } },
          ' ',
          { $ifNull: ['$deliveryTimeUnit', 'days'] }
        ]
      } : null,
      timelineFormatted: searchType === 'gigs' ? {
        $concat: [
          { $toString: { $ifNull: ['$timeline', 'N/A'] } },
          ' ',
          { $ifNull: ['$timelineUnit', 'days'] }
        ]
      } : null,
      
      // Creator details
      seller: {
        _id: '$creatorDetails._id',
        name: '$creatorDetails.name',
        username: '$creatorDetails.username',
        picture: {
          $cond: {
            if: '$creatorDetails.picture',
            then: '$creatorDetails.picture',
            else: {
              $concat: [
                'https://ui-avatars.com/api/?name=',
                { $substrCP: [{ $ifNull: ['$creatorDetails.name', 'Anonymous'] }, 0, 1] },
                '&background=random'
              ]
            }
          }
        },
        rating: '$creatorDetails.rating',
        completedOrders: '$creatorDetails.completedOrders',
        responseRate: '$creatorDetails.responseRate',
        responseTime: '$creatorDetails.responseTime',
        isPro: { $eq: ['$creatorDetails.accountType', 'pro'] },
        level: '$creatorDetails.level'
      },
      
      // Category details
      categoryInfo: {
        _id: '$categoryDetails._id',
        name: '$categoryDetails.name',
        slug: '$categoryDetails.slug',
        icon: '$categoryDetails.icon',
        description: '$categoryDetails.description'
      },
      
      // Subcategory details
      subcategoryInfo: {
        $cond: {
          if: '$subcategoryDetails',
          then: {
            _id: '$subcategoryDetails._id',
            name: '$subcategoryDetails.name',
            slug: '$subcategoryDetails.slug',
            icon: '$subcategoryDetails.icon',
            description: '$subcategoryDetails.description'
          },
          else: null
        }
      },
      
      // Short description
      descriptionShort: {
        $cond: {
          if: { $gt: [{ $strLenCP: { $ifNull: ['$description', ''] } }, 150] },
          then: { $concat: [{ $substrCP: ['$description', 0, 150] }, '...'] },
          else: '$description'
        }
      }
    }
  };
  
  pipeline.push(projectStage);
  
  return pipeline;
};

// Get related data with advanced analytics
const getRelatedData = async (searchQuery, searchType, categoryId, subcategoryId, userId) => {
  const relatedData = {
    categories: [],
    subcategories: [],
    suggestions: [],
    topSellers: [],
    trendingItems: [],
    frequentlyBought: [],
    analytics: {
      queryComplexity: 'simple',
      estimatedResults: 0,
      popularFilters: []
    }
  };
  
  try {
    // Analyze query complexity
    if (searchQuery) {
      const words = searchQuery.split(' ').filter(w => w.length > 2);
      relatedData.analytics.queryComplexity = 
        words.length === 1 ? 'simple' :
        words.length <= 3 ? 'moderate' : 'complex';
    }
    
    // Get related categories with popularity score
    if (searchQuery && searchQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
      
      relatedData.categories = await Category.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              { metaKeywords: { $regex: searchRegex } }
            ],
            isActive: true,
            deletedAt: null
          }
        },
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $multiply: ['$servicesCount', 0.5] },
                { $multiply: ['$gigsCount', 0.3] },
                { $cond: [{ $eq: ['$featured', true] }, 100, 0] },
                { $cond: [{ $eq: ['$popular', true] }, 50, 0] }
              ]
            }
          }
        },
        { $sort: { popularityScore: -1 } },
        { $limit: 8 },
        {
          $project: {
            name: 1,
            slug: 1,
            icon: 1,
            description: 1,
            servicesCount: 1,
            gigsCount: 1,
            featured: 1,
            popular: 1,
            popularityScore: 1
          }
        }
      ]);
    }
    
    // Get subcategories with hierarchical context
    if (categoryId && isValidObjectId(categoryId)) {
      relatedData.subcategories = await Subcategory.aggregate([
        {
          $match: {
            category: new mongoose.Types.ObjectId(categoryId),
            isActive: true,
            deletedAt: null
          }
        },
        {
          $lookup: {
            from: 'services',
            localField: '_id',
            foreignField: 'subcategory',
            as: 'serviceStats'
          }
        },
        {
          $lookup: {
            from: 'gigs',
            localField: '_id',
            foreignField: 'subcategory',
            as: 'gigStats'
          }
        },
        {
          $addFields: {
            activeServices: {
              $size: {
                $filter: {
                  input: '$serviceStats',
                  as: 'service',
                  cond: {
                    $and: [
                      { $eq: ['$$service.status', 'active'] },
                      { $eq: ['$$service.isActive', true] },
                      { $eq: ['$$service.deletedAt', null] }
                    ]
                  }
                }
              }
            },
            activeGigs: {
              $size: {
                $filter: {
                  input: '$gigStats',
                  as: 'gig',
                  cond: {
                    $and: [
                      { $eq: ['$$gig.status', 'open'] },
                      { $eq: ['$$gig.isActive', true] },
                      { $eq: ['$$gig.deletedAt', null] }
                    ]
                  }
                }
              }
            }
          }
        },
        { $sort: { order: 1, name: 1 } },
        { $limit: 10 },
        {
          $project: {
            name: 1,
            slug: 1,
            description: 1,
            icon: 1,
            order: 1,
            activeServices: 1,
            activeGigs: 1
          }
        }
      ]);
    }
    
    // Get personalized suggestions based on user history
    if (userId && searchQuery && searchQuery.length >= 2) {
      try {
        const user = await User.findById(userId)
          .select('searchHistory preferences')
          .lean();
        
        if (user && user.searchHistory && user.searchHistory.length > 0) {
          // Find similar past searches
          const pastQueries = user.searchHistory
            .map(h => h.query)
            .filter(q => q && q.length >= 3);
          
          if (pastQueries.length > 0) {
            const Model = searchType === 'services' ? Service : Gig;
            const searchRegex = new RegExp(
              pastQueries.map(q => escapeRegex(q)).join('|'),
              'i'
            );
            
            const personalizedSuggestions = await Model.find({
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
              ],
              isActive: true,
              deletedAt: null,
              status: searchType === 'services' ? 'active' : 'open'
            })
            .select('title slug price rating thumbnail')
            .sort({ rating: -1, createdAt: -1 })
            .limit(5)
            .lean();
            
            if (personalizedSuggestions.length > 0) {
              relatedData.personalizedSuggestions = personalizedSuggestions.map(item => ({
                ...item,
                reason: 'Based on your search history'
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error getting personalized suggestions:', error);
      }
    }
    
    // Get trending items in this category
    if (categoryId && isValidObjectId(categoryId)) {
      const Model = searchType === 'services' ? Service : Gig;
      const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      relatedData.trendingItems = await Model.find({
        [categoryField]: new mongoose.Types.ObjectId(categoryId),
        isActive: true,
        deletedAt: null,
        status: searchType === 'services' ? 'active' : 'open',
        createdAt: { $gte: thirtyDaysAgo }
      })
      .select('title slug price rating views likes thumbnail')
      .sort({ views: -1, likes: -1 })
      .limit(5)
      .lean();
    }
    
    // Get frequently bought together items (simplified)
    if (searchQuery && searchQuery.length >= 3) {
      const Model = searchType === 'services' ? Service : Gig;
      
      // Find items with similar tags/skills
      const similarItems = await Model.find({
        $or: [
          { title: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } },
          searchType === 'services' 
            ? { tags: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } }
            : { skillsRequired: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } }
        ],
        isActive: true,
        deletedAt: null,
        status: searchType === 'services' ? 'active' : 'open'
      })
      .select('tags skillsRequired')
      .limit(20)
      .lean();
      
      // Extract common tags/skills
      const allTags = similarItems.flatMap(item => 
        searchType === 'services' ? item.tags || [] : item.skillsRequired || []
      );
      
      const tagFrequency = {};
      allTags.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
      
      const commonTags = Object.entries(tagFrequency)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
      
      if (commonTags.length > 0) {
        const frequentlyBought = await Model.find({
          [searchType === 'services' ? 'tags' : 'skillsRequired']: { $in: commonTags },
          isActive: true,
          deletedAt: null,
          status: searchType === 'services' ? 'active' : 'open'
        })
        .select('title slug price rating thumbnail')
        .sort({ rating: -1, reviewsCount: -1 })
        .limit(5)
        .lean();
        
        if (frequentlyBought.length > 0) {
          relatedData.frequentlyBought = frequentlyBought;
        }
      }
    }
    
    // Get top sellers with advanced metrics
    if (searchQuery && searchQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
      const Model = searchType === 'services' ? Service : Gig;
      
      const matchingItems = await Model.find({
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
      
      const creatorIds = [...new Set(matchingItems.map(item => item.createdBy).filter(Boolean))];
      
      if (creatorIds.length > 0) {
        relatedData.topSellers = await User.aggregate([
          {
            $match: {
              _id: { $in: creatorIds },
              isActive: true,
              registrationStatus: 'verified'
            }
          },
          {
            $lookup: {
              from: searchType === 'services' ? 'services' : 'gigs',
              localField: '_id',
              foreignField: 'createdBy',
              as: 'items'
            }
          },
          {
            $addFields: {
              totalItems: { $size: '$items' },
              avgRating: { $avg: '$items.rating' },
              successRate: {
                $cond: {
                  if: { $gt: ['$completedOrders', 0] },
                  then: {
                    $multiply: [
                      { $divide: ['$completedOrders', { $add: ['$completedOrders', 5] }] },
                      100
                    ]
                  },
                  else: 0
                }
              },
              sellerScore: {
                $add: [
                  { $multiply: ['$rating', 20] },
                  { $multiply: ['$responseRate', 0.5] },
                  { $multiply: [{ $divide: ['$completedOrders', 10] }, 2] },
                  { $multiply: [{ $subtract: [100, { $min: ['$responseTime', 48] }] }, 0.5] }
                ]
              }
            }
          },
          { $sort: { sellerScore: -1 } },
          { $limit: 6 },
          {
            $project: {
              name: 1,
              username: 1,
              picture: 1,
              rating: 1,
              completedOrders: 1,
              responseRate: 1,
              responseTime: 1,
              accountType: 1,
              level: 1,
              bio: 1,
              totalItems: 1,
              avgRating: 1,
              successRate: 1,
              sellerScore: 1
            }
          }
        ]);
      }
    }
    
    // Get popular filters for this search
    if (searchQuery) {
      const Model = searchType === 'services' ? Service : Gig;
      
      // Get price distribution
      const priceStats = await Model.aggregate([
        {
          $match: {
            $or: [
              { title: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } },
              { description: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } }
            ],
            isActive: true,
            deletedAt: null,
            status: searchType === 'services' ? 'active' : 'open'
          }
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: searchType === 'services' ? '$price' : '$budget' },
            minPrice: { $min: searchType === 'services' ? '$price' : '$budget' },
            maxPrice: { $max: searchType === 'services' ? '$price' : '$budget' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      if (priceStats.length > 0) {
        relatedData.analytics.estimatedResults = priceStats[0].count;
        
        // Suggest price ranges
        const stats = priceStats[0];
        if (stats.count > 10) {
          const range = (stats.maxPrice - stats.minPrice) / 3;
          relatedData.analytics.popularFilters.push(
            `Under $${Math.round(stats.minPrice + range)}`,
            `$${Math.round(stats.minPrice + range)} - $${Math.round(stats.minPrice + range * 2)}`,
            `Over $${Math.round(stats.minPrice + range * 2)}`
          );
        }
      }
      
      // Get delivery time stats for services
      if (searchType === 'services') {
        const deliveryStats = await Service.aggregate([
          {
            $match: {
              $or: [
                { title: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } },
                { description: { $regex: new RegExp(escapeRegex(searchQuery), 'i') } }
              ],
              isActive: true,
              deletedAt: null,
              status: 'active'
            }
          },
          {
            $bucket: {
              groupBy: '$deliveryTime',
              boundaries: [0, 3, 7, 14, 30, 90],
              default: 'Other',
              output: {
                count: { $sum: 1 }
              }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        const deliveryLabels = {
          0: '1-3 days',
          3: '4-7 days',
          7: '1-2 weeks',
          14: '2-4 weeks',
          30: '1-3 months'
        };
        
        deliveryStats.forEach(stat => {
          if (stat._id !== 'Other' && stat.count > 0) {
            relatedData.analytics.popularFilters.push(
              `${deliveryLabels[stat._id] || `${stat._id}+ days`} delivery`
            );
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error getting related data:', error);
  }
  
  return relatedData;
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
            filters: filters,
            timestamp: new Date()
          }],
          $slice: -50 // Keep only last 50 searches
        }
      },
      $set: { lastSeenAt: new Date() }
    });
  } catch (error) {
    console.error('Error updating user search history:', error);
  }
};

// Main search endpoint with advanced features
router.get('/search', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Get user for personalization
    const user = req.user || null;
    
    // Clean and validate parameters with user context
    const params = cleanSearchParams(req.query, user);
    
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
      keywords,
      featured,
      popular,
      recommended,
      trending,
      has_images,
      has_attachments,
      has_packages,
      has_video,
      cache: useCacheParam = 'true',
      populate = 'true',
      fields,
      search_in = 'everywhere',
      source = 'top-bar',
      fuzzy = 'false',
      exact = 'false',
      include_inactive = 'false',
      show_all = 'false',
      boost,
      location,
      country,
      city,
      revisions,
      min_reviews,
      max_reviews,
      experience_level,
      pro_level,
      language,
      timezone
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
    
    // Security: Check for injection patterns
    const injectionPatternsAfterSanitization = [
      /\bOR\b.*\bOR\b/i,
      /\bAND\b.*\bAND\b/i,
      /'1'='1'/i,
      /'0'='0'/i,
      /=.*=.*=/i,
      /'.*'.*'.*'/i,
      /union.*select/i,
      /select.*from/i,
      /insert.*into/i
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
    const limitNum = Math.min(parseInt(limit) || 48, 200);
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;
    const useCache = useCacheParam === 'true';
    
    // Get user personalization
    const personalization = user ? await getUserPersonalization(user._id, searchType) : null;
    
    // Build cache key with personalization
    const cacheKey = generateCacheKey(`search_${searchType}_${user ? user._id : 'guest'}`, {
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
      keywords,
      featured,
      popular,
      recommended,
      trending,
      has_images,
      has_attachments,
      has_packages,
      has_video,
      fuzzy,
      exact,
      personalization: personalization ? 'yes' : 'no'
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
        'Cache-Control': 'public, max-age=300',
        'X-Personalized': personalization ? 'yes' : 'no'
      });
      
      return res.json({
        success: true,
        ...cachedResults,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        cached: true,
        personalized: !!personalization
      });
    }
    
    // Build search filter with personalization
    const baseFilter = await buildSearchFilter(params, searchType, user);
    
    // Add text search query
    let hasTextSearch = false;
    if (finalQuery && typeof finalQuery === 'string' && finalQuery.trim().length >= 2) {
      const textSearchQuery = buildTextSearchQuery(finalQuery, searchType, params);
      
      if (textSearchQuery.$text) {
        baseFilter.$text = textSearchQuery.$text;
        hasTextSearch = true;
      } else if (textSearchQuery.$or) {
        baseFilter.$or = textSearchQuery.$or;
      }
    }
    
    // Apply personalization boost
    const finalFilter = buildPersonalizedBoost(baseFilter, personalization, searchType, finalQuery);
    
    // Get sort options
    const sortOptions = getSortOptions(sort, searchType, hasTextSearch, params, user);
    
    // Build aggregation pipeline for advanced search
    const pipeline = buildAggregationPipeline(
      finalFilter,
      sortOptions,
      skip,
      limitNum,
      searchType,
      finalQuery,
      personalization
    );
    
    // Execute aggregation and count in parallel
    const Model = searchType === 'services' ? Service : Gig;
    const [results, totalCount] = await Promise.all([
      Model.aggregate(pipeline),
      Model.countDocuments(finalFilter)
    ]);
    
    // Get related data
    const relatedData = await getRelatedData(
      finalQuery,
      searchType,
      categoryParam,
      subcategoryParam,
      user ? user._id : null
    );
    
    // Update user search history
    if (user && user._id) {
      await updateUserSearchHistory(user._id, finalQuery, searchType, params);
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;
    
    // Prepare response
    const response = {
      success: true,
      data: {
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
          source,
          search_in,
          totalResults: totalCount,
          showing: `${skip + 1}-${Math.min(skip + limitNum, totalCount)} of ${totalCount}`,
          sort,
          order,
          filtersApplied: Object.keys(finalFilter).length - 3,
          personalized: !!personalization,
          queryComplexity: relatedData.analytics.queryComplexity,
          estimatedMatches: relatedData.analytics.estimatedResults || totalCount
        },
        relatedData,
        suggestions: {
          popularFilters: relatedData.analytics.popularFilters,
          trendingItems: relatedData.trendingItems,
          frequentlyBought: relatedData.frequentlyBought,
          personalized: relatedData.personalizedSuggestions
        }
      }
    };
    
    // Cache the response if enabled
    if (useCache && pageNum === 1) {
      await cache.set(cacheKey, response.data, 300);
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
      'X-Query-Length': finalQuery.length,
      'X-Personalized': personalization ? 'yes' : 'no',
      'X-Results-Count': results.length
    });
    
    // Send response
    res.json({
      ...response,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      cached: false,
      personalized: !!personalization
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
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error in search parameters',
        code: 'VALIDATION_ERROR',
        details: error.message,
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

// Advanced suggestions endpoint with semantic understanding
router.get('/suggestions', async (req, res) => {
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
      limit = 10,
      category: categoryParam,
      subcategory: subcategoryParam,
      intent
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
    
    // Detect intent for better suggestions
    const detectedIntent = intent || (
      finalQuery.includes('urgent') || finalQuery.includes('asap') ? 'urgent' :
      finalQuery.includes('cheap') || finalQuery.includes('budget') ? 'budget' :
      finalQuery.includes('premium') || finalQuery.includes('expert') ? 'premium' :
      finalQuery.includes('beginner') || finalQuery.includes('simple') ? 'beginner' :
      null
    );
    
    // Get service/gig suggestions with intent-based filtering
    const Model = searchType === 'services' ? Service : Gig;
    const statusFilter = searchType === 'services' ? 'active' : 'open';
    
    let modelFilter = {
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } },
        searchType === 'services' ? { searchKeywords: { $regex: searchRegex } } : {},
        { description: { $regex: searchRegex } }
      ],
      status: statusFilter,
      isActive: true,
      deletedAt: null
    };
    
    // Apply intent filters
    if (detectedIntent === 'urgent') {
      if (searchType === 'services') {
        modelFilter.deliveryTime = { $lte: 3 };
      } else {
        modelFilter.urgency = { $in: ['urgent', 'high'] };
      }
    } else if (detectedIntent === 'budget') {
      const priceField = searchType === 'services' ? 'price' : 'budget';
      modelFilter[priceField] = { $lte: 100 };
    } else if (detectedIntent === 'premium') {
      modelFilter.$or = [
        ...modelFilter.$or,
        { isFeatured: true },
        { rating: { $gte: 4.5 } }
      ];
    }
    
    const modelSuggestions = await Model.find(modelFilter)
      .select('title slug shortDescription price budget rating reviewsCount thumbnail deliveryTime urgency')
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
      thumbnail: item.thumbnail,
      deliveryTime: item.deliveryTime,
      urgency: item.urgency,
      relevance: 'high',
      entity: searchType === 'services' ? 'Service' : 'Project',
      matchType: 'direct'
    })));
    
    // Get category suggestions with popularity score
    const categorySuggestions = await Category.aggregate([
      {
        $match: {
          $or: [
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { metaKeywords: { $regex: searchRegex } }
          ],
          isActive: true,
          deletedAt: null,
          isSubcategory: false
        }
      },
      {
        $addFields: {
          matchScore: {
            $cond: [
              { $regexMatch: { input: '$name', regex: searchRegex } },
              10,
              { $cond: [
                { $regexMatch: { input: '$description', regex: searchRegex } },
                5,
                3
              ]}
            ]
          },
          popularityScore: {
            $add: [
              { $multiply: ['$servicesCount', 0.5] },
              { $multiply: ['$gigsCount', 0.3] },
              { $cond: [{ $eq: ['$featured', true] }, 50, 0] },
              { $cond: [{ $eq: ['$popular', true] }, 30, 0] }
            ]
          }
        }
      },
      { $sort: { matchScore: -1, popularityScore: -1 } },
      { $limit: 5 }
    ]);
    
    suggestions.push(...categorySuggestions.map(item => ({
      type: 'category',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      description: item.description || '',
      servicesCount: item.servicesCount || 0,
      gigsCount: item.gigsCount || 0,
      featured: item.featured,
      popular: item.popular,
      matchScore: item.matchScore,
      entity: 'Category',
      matchType: 'category'
    })));
    
    // Get subcategory suggestions
    const subcategorySuggestions = await Subcategory.aggregate([
      {
        $match: {
          $or: [
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } }
          ],
          isActive: true,
          deletedAt: null
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      { $sort: { order: 1, name: 1 } },
      { $limit: 5 }
    ]);
    
    suggestions.push(...subcategorySuggestions.map(item => ({
      type: 'subcategory',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      description: item.description || '',
      category: item.categoryDetails.name,
      categorySlug: item.categoryDetails.slug,
      servicesCount: item.servicesCount || 0,
      gigsCount: item.gigsCount || 0,
      entity: 'Subcategory',
      matchType: 'subcategory'
    })));
    
    // Get skill/tag suggestions
    if (searchType === 'services') {
      const tagSuggestions = await Service.aggregate([
        {
          $match: {
            tags: { $regex: searchRegex },
            isActive: true,
            deletedAt: null,
            status: 'active'
          }
        },
        { $unwind: '$tags' },
        {
          $match: {
            tags: { $regex: searchRegex }
          }
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgPrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      suggestions.push(...tagSuggestions.map(item => ({
        type: 'skill',
        title: item._id,
        count: item.count,
        avgRating: item.avgRating,
        avgPrice: item.avgPrice,
        entity: 'Skill',
        matchType: 'skill'
      })));
    } else {
      const skillSuggestions = await Gig.aggregate([
        {
          $match: {
            skillsRequired: { $regex: searchRegex },
            isActive: true,
            deletedAt: null,
            status: 'open'
          }
        },
        { $unwind: '$skillsRequired' },
        {
          $match: {
            skillsRequired: { $regex: searchRegex }
          }
        },
        {
          $group: {
            _id: '$skillsRequired',
            count: { $sum: 1 },
            avgBudget: { $avg: '$budget' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      suggestions.push(...skillSuggestions.map(item => ({
        type: 'skill',
        title: item._id,
        count: item.count,
        avgBudget: item.avgBudget,
        entity: 'Skill',
        matchType: 'skill'
      })));
    }
    
    // Remove duplicates and sort by relevance
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(item => [`${item.type}-${item.title}`, item])).values()
    )
    .sort((a, b) => {
      // Sort by type priority
      const typePriority = {
        'service': 5,
        'gig': 5,
        'category': 4,
        'subcategory': 3,
        'skill': 2
      };
      
      const priorityDiff = (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by match score if available
      if (a.matchScore && b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      
      // Then by count/rating
      const aScore = a.count || a.rating || a.reviewsCount || 0;
      const bScore = b.count || b.rating || b.reviewsCount || 0;
      return bScore - aScore;
    })
    .slice(0, limitNum);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: uniqueSuggestions,
      query: finalQuery,
      intent: detectedIntent,
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

// Enhanced quick search with semantic understanding
router.get('/quick', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const user = req.user || null;
    const params = cleanSearchParams(req.query, user);
    
    const {
      query: searchQuery,
      q,
      search,
      limit = 5,
      type
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
    
    // Search in services with relevance scoring
    const serviceResults = await Service.aggregate([
      {
        $match: {
          title: { $regex: searchRegex },
          status: 'active',
          isActive: true,
          deletedAt: null
        }
      },
      {
        $addFields: {
          matchQuality: {
            $cond: [
              { $eq: [{ $indexOfCP: ['$title', finalQuery] }, 0] },
              10, // Exact start match
              5   // Contains match
            ]
          },
          relevanceScore: {
            $add: [
              { $multiply: ['$rating', 2] },
              { $multiply: [{ $divide: ['$reviewsCount', 10] }, 1] },
              { $cond: [{ $eq: ['$isFeatured', true] }, 5, 0] },
              '$matchQuality'
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1 } },
      { $limit: limitNum },
      {
        $project: {
          title: 1,
          slug: 1,
          price: 1,
          thumbnail: 1,
          rating: 1,
          relevanceScore: 1
        }
      }
    ]);
    
    results.push(...serviceResults.map(item => ({
      type: 'service',
      title: item.title,
      slug: item.slug,
      price: item.price,
      thumbnail: item.thumbnail,
      rating: item.rating,
      relevanceScore: item.relevanceScore,
      url: `/services/${item.slug}`
    })));
    
    // Search in gigs if no type specified or type is gigs
    if (!type || type === 'gigs' || type === 'projects') {
      const gigResults = await Gig.aggregate([
        {
          $match: {
            title: { $regex: searchRegex },
            status: 'open',
            isActive: true,
            deletedAt: null,
            visibility: 'public'
          }
        },
        {
          $addFields: {
            matchQuality: {
              $cond: [
                { $eq: [{ $indexOfCP: ['$title', finalQuery] }, 0] },
                10,
                5
              ]
            },
            relevanceScore: {
              $add: [
                { $multiply: [{ $divide: [1000, { $ifNull: ['$budget', 1000] }] }, 0.5] },
                { $cond: [{ $eq: ['$urgency', 'urgent'] }, 3, 0] },
                '$matchQuality'
              ]
            }
          }
        },
        { $sort: { relevanceScore: -1 } },
        { $limit: limitNum },
        {
          $project: {
            title: 1,
            slug: 1,
            budget: 1,
            thumbnail: 1,
            urgency: 1,
            relevanceScore: 1
          }
        }
      ]);
      
      results.push(...gigResults.map(item => ({
        type: 'gig',
        title: item.title,
        slug: item.slug,
        price: item.budget,
        thumbnail: item.thumbnail,
        urgency: item.urgency,
        relevanceScore: item.relevanceScore,
        url: `/gigs/${item.slug}`
      })));
    }
    
    // Search in categories
    const categoryResults = await Category.aggregate([
      {
        $match: {
          name: { $regex: searchRegex },
          isActive: true,
          deletedAt: null,
          isSubcategory: false
        }
      },
      {
        $addFields: {
          matchQuality: {
            $cond: [
              { $eq: [{ $indexOfCP: ['$name', finalQuery] }, 0] },
              10,
              5
            ]
          },
          popularityScore: {
            $add: [
              { $multiply: ['$servicesCount', 0.5] },
              { $multiply: ['$gigsCount', 0.3] },
              { $cond: [{ $eq: ['$featured', true] }, 5, 0] }
            ]
          }
        }
      },
      { $sort: { matchQuality: -1, popularityScore: -1 } },
      { $limit: limitNum },
      {
        $project: {
          name: 1,
          slug: 1,
          icon: 1,
          servicesCount: 1,
          gigsCount: 1,
          matchQuality: 1
        }
      }
    ]);
    
    results.push(...categoryResults.map(item => ({
      type: 'category',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      servicesCount: item.servicesCount,
      gigsCount: item.gigsCount,
      matchQuality: item.matchQuality,
      url: `/categories/${item.slug}`
    })));
    
    // Search in subcategories
    const subcategoryResults = await Subcategory.aggregate([
      {
        $match: {
          name: { $regex: searchRegex },
          isActive: true,
          deletedAt: null
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $addFields: {
          matchQuality: {
            $cond: [
              { $eq: [{ $indexOfCP: ['$name', finalQuery] }, 0] },
              10,
              5
            ]
          }
        }
      },
      { $sort: { matchQuality: -1, order: 1 } },
      { $limit: limitNum },
      {
        $project: {
          name: 1,
          slug: 1,
          icon: 1,
          category: '$categoryDetails.name',
          categorySlug: '$categoryDetails.slug',
          matchQuality: 1
        }
      }
    ]);
    
    results.push(...subcategoryResults.map(item => ({
      type: 'subcategory',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      category: item.category,
      matchQuality: item.matchQuality,
      url: `/categories/${item.categorySlug}#${item.slug}`
    })));
    
    // Sort all results by relevance and remove duplicates
    const uniqueResults = Array.from(
      new Map(results.map(item => [`${item.type}-${item.title}`, item])).values()
    )
    .sort((a, b) => {
      // Sort by relevance score if available
      const aScore = a.relevanceScore || a.matchQuality || 0;
      const bScore = b.relevanceScore || b.matchQuality || 0;
      
      if (bScore !== aScore) return bScore - aScore;
      
      // Then by type priority
      const typePriority = {
        'service': 5,
        'gig': 5,
        'category': 4,
        'subcategory': 3
      };
      
      return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    })
    .slice(0, limitNum);
    
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

// Advanced search statistics with trends
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
    
    // Get recent activity (last 7 days)
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
    
    // Get popular search terms (you would typically get this from analytics)
    const popularSearches = [
      { term: 'web development', count: 1245, trend: 'up', category: 'Technology' },
      { term: 'logo design', count: 892, trend: 'steady', category: 'Design' },
      { term: 'content writing', count: 765, trend: 'up', category: 'Writing' },
      { term: 'video editing', count: 543, trend: 'steady', category: 'Video' },
      { term: 'social media marketing', count: 432, trend: 'up', category: 'Marketing' }
    ];
    
    // Get trending categories with growth rate
    const trendingCategories = await Category.aggregate([
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
                $expr: {
                  $and: [
                    { $eq: ['$category', '$$categoryId'] },
                    { $eq: ['$status', 'active'] },
                    { $eq: ['$isActive', true] },
                    { $eq: ['$deletedAt', null] },
                    { $gte: ['$createdAt', sevenDaysAgo] }
                  ]
                }
              }
            },
            { $count: 'recentCount' }
          ],
          as: 'recentServices'
        }
      },
      {
        $lookup: {
          from: 'gigs',
          let: { categoryId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$projectCategory', '$$categoryId'] },
                    { $eq: ['$status', 'open'] },
                    { $eq: ['$isActive', true] },
                    { $eq: ['$deletedAt', null] },
                    { $eq: ['$visibility', 'public'] },
                    { $gte: ['$createdAt', sevenDaysAgo] }
                  ]
                }
              }
            },
            { $count: 'recentGigs' }
          ],
          as: 'recentGigs'
        }
      },
      {
        $addFields: {
          recentServicesCount: { $ifNull: [{ $arrayElemAt: ['$recentServices.recentCount', 0] }, 0] },
          recentGigsCount: { $ifNull: [{ $arrayElemAt: ['$recentGigs.recentGigs', 0] }, 0] },
          growthRate: {
            $cond: [
              { $gt: ['$servicesCount', 0] },
              {
                $multiply: [
                  { $divide: [
                    { $add: ['$recentServicesCount', '$recentGigsCount'] },
                    { $add: ['$servicesCount', '$gigsCount'] }
                  ]},
                  100
                ]
              },
              0
            ]
          },
          engagementScore: {
            $add: [
              { $multiply: ['$servicesCount', 0.5] },
              { $multiply: ['$gigsCount', 0.3] },
              { $multiply: ['$recentServicesCount', 2] },
              { $multiply: ['$recentGigsCount', 1.5] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: 8 },
      {
        $project: {
          name: 1,
          slug: 1,
          icon: 1,
          servicesCount: 1,
          gigsCount: 1,
          recentServicesCount: 1,
          recentGigsCount: 1,
          growthRate: 1,
          engagementScore: 1
        }
      }
    ]);
    
    // Get platform statistics
    const platformStats = {
      totalUsers: await User.countDocuments({ 
        registrationStatus: 'verified',
        isActive: true 
      }),
      activeSellers: await User.countDocuments({
        registrationStatus: 'verified',
        isActive: true,
        role: 'user',
        $or: [
          { 'servicesCount': { $gt: 0 } },
          { 'completedOrders': { $gt: 0 } }
        ]
      }),
      newUsersThisWeek: await User.countDocuments({
        registrationStatus: 'verified',
        isActive: true,
        createdAt: { $gte: sevenDaysAgo }
      })
    };
    
    // Get price statistics
    const priceStats = await Service.aggregate([
      {
        $match: {
          status: 'active',
          isActive: true,
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          medianPrice: { $percentile: { input: '$price', p: [0.5] } }
        }
      }
    ]);
    
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
        recentActivity: {
          services: recentServices,
          gigs: recentGigs,
          period: '7 days'
        },
        popularSearches,
        trendingCategories,
        platformStats,
        priceStats: priceStats[0] || {},
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

// New endpoint: Search analytics for a specific query
router.get('/analytics', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const params = cleanSearchParams(req.query);
    const { query: searchQuery, q, search, type = 'services' } = params;
    
    const finalQuery = searchQuery || q || search;
    
    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required',
        code: 'QUERY_REQUIRED',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
    const Model = searchType === 'services' ? Service : Gig;
    
    // Get basic statistics for this query
    const searchRegex = new RegExp(escapeRegex(finalQuery), 'i');
    
    const [totalResults, priceStats, ratingStats] = await Promise.all([
      Model.countDocuments({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
        ],
        isActive: true,
        deletedAt: null,
        status: searchType === 'services' ? 'active' : 'open'
      }),
      
      Model.aggregate([
        {
          $match: {
            $or: [
              { title: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
            ],
            isActive: true,
            deletedAt: null,
            status: searchType === 'services' ? 'active' : 'open'
          }
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: searchType === 'services' ? '$price' : '$budget' },
            minPrice: { $min: searchType === 'services' ? '$price' : '$budget' },
            maxPrice: { $max: searchType === 'services' ? '$price' : '$budget' },
            priceRange: {
              $push: searchType === 'services' ? '$price' : '$budget'
            }
          }
        }
      ]),
      
      Model.aggregate([
        {
          $match: {
            $or: [
              { title: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
            ],
            isActive: true,
            deletedAt: null,
            status: searchType === 'services' ? 'active' : 'open',
            rating: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            minRating: { $min: '$rating' },
            maxRating: { $max: '$rating' },
            totalReviews: { $sum: '$reviewsCount' }
          }
        }
      ])
    ]);
    
    // Get category distribution
    const categoryDistribution = await Model.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
          ],
          isActive: true,
          deletedAt: null,
          status: searchType === 'services' ? 'active' : 'open'
        }
      },
      {
        $group: {
          _id: searchType === 'services' ? '$category' : '$projectCategory',
          count: { $sum: 1 },
          avgPrice: { $avg: searchType === 'services' ? '$price' : '$budget' },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get seller statistics
    const sellerStats = await Model.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
          ],
          isActive: true,
          deletedAt: null,
          status: searchType === 'services' ? 'active' : 'open'
        }
      },
      {
        $group: {
          _id: '$createdBy',
          itemCount: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgPrice: { $avg: searchType === 'services' ? '$price' : '$budget' }
        }
      },
      { $sort: { itemCount: -1 } },
      { $limit: 5 }
    ]);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        query: finalQuery,
        type: searchType,
        totalResults,
        priceStats: priceStats[0] || {},
        ratingStats: ratingStats[0] || {},
        categoryDistribution,
        sellerStats,
        queryComplexity: finalQuery.split(' ').length > 3 ? 'complex' : 'simple',
        timestamp: new Date().toISOString()
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Search analytics error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Error fetching search analytics',
      code: 'ANALYTICS_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});
// Filter options endpoint - FIXED VERSION
router.get('/filters', async (req, res) => {
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
    
    // Base filter options
    const filterOptions = {
      sort: [
        { value: 'relevance', label: 'Most Relevant', icon: 'Sparkles', description: 'Best matches for your search' },
        { value: 'newest', label: 'Newest Arrivals', icon: 'Clock', description: 'Recently posted services' },
        { value: 'rating', label: 'Highest Rated', icon: 'Star', description: 'Top-rated by clients' },
        { value: 'price_low', label: 'Price: Low to High', icon: 'DollarSign', order: 'asc', description: 'Budget-friendly first' },
        { value: 'price_high', label: 'Price: High to Low', icon: 'DollarSign', order: 'desc', description: 'Premium services first' },
        { value: 'delivery_fastest', label: 'Fastest Delivery', icon: 'Truck', description: 'Quickest turnaround' },
        { value: 'trending', label: 'Trending Now', icon: 'TrendingUp', description: 'Popular right now' },
        { value: 'recommended', label: 'Recommended', icon: 'BadgeCheck', description: 'Personalized for you' }
      ],
      budget: [
        { value: '', label: 'Any Budget', range: [0, 10000] },
        { value: '0-50', label: 'Under $50', range: [0, 50] },
        { value: '50-100', label: '$50 - $100', range: [50, 100] },
        { value: '100-200', label: '$100 - $200', range: [100, 200] },
        { value: '200-500', label: '$200 - $500', range: [200, 500] },
        { value: '500-1000', label: '$500 - $1,000', range: [500, 1000] },
        { value: '1000-10000', label: '$1,000+', range: [1000, 10000] }
      ],
      rating: [
        { value: '', label: 'Any Rating', min: 0 },
        { value: '4.5', label: '4.5+ Stars', min: 4.5 },
        { value: '4.0', label: '4.0+ Stars', min: 4.0 },
        { value: '3.5', label: '3.5+ Stars', min: 3.5 },
        { value: '3.0', label: '3.0+ Stars', min: 3.0 }
      ]
    };
    
    // Service-specific filters
    if (searchType === 'services') {
      filterOptions.deliveryTime = [
        { value: '', label: 'Any Delivery Time', days: null },
        { value: '1', label: '24 Hours', days: 1 },
        { value: '3', label: '1-3 Days', days: 3 },
        { value: '7', label: '3-7 Days', days: 7 },
        { value: '14', label: '1-2 Weeks', days: 14 },
        { value: '30', label: '1 Month', days: 30 },
        { value: '90', label: '3 Months', days: 90 }
      ];
      
      filterOptions.revisions = [
        { value: '', label: 'Any Revisions', count: null },
        { value: '1', label: '1 Revision', count: 1 },
        { value: '2', label: '2 Revisions', count: 2 },
        { value: '3', label: '3+ Revisions', count: 3 },
        { value: 'unlimited', label: 'Unlimited Revisions', count: 99 }
      ];
      
      filterOptions.sellerLevel = [
        { value: '', label: 'Any Seller Level' },
        { value: 'top_rated', label: 'Top Rated Sellers' },
        { value: 'level_one', label: 'Level 1 Sellers' },
        { value: 'level_two', label: 'Level 2 Sellers' },
        { value: 'new_seller', label: 'New Sellers' }
      ];
    }
    
    // Gig-specific filters
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
      
      filterOptions.experienceLevel = [
        { value: '', label: 'Any Experience' },
        { value: 'entry', label: 'Entry Level' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'expert', label: 'Expert' }
      ];
    }
    
    // Get category filters if query exists
    if (finalQuery && finalQuery.length >= 2) {
      try {
        const Model = searchType === 'services' ? Service : Gig;
        const searchRegex = new RegExp(escapeRegex(finalQuery), 'i');
        
        // Get total count for this search
        const totalCount = await Model.countDocuments({
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
          ],
          isActive: true,
          deletedAt: null,
          status: searchType === 'services' ? 'active' : 'open'
        });
        
        // Get price distribution
        const priceStats = await Model.aggregate([
          {
            $match: {
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
              ],
              isActive: true,
              deletedAt: null,
              status: searchType === 'services' ? 'active' : 'open'
            }
          },
          {
            $group: {
              _id: null,
              minPrice: { $min: searchType === 'services' ? '$price' : '$budget' },
              maxPrice: { $max: searchType === 'services' ? '$price' : '$budget' },
              avgPrice: { $avg: searchType === 'services' ? '$price' : '$budget' }
            }
          }
        ]);
        
        // Get category distribution
        const categoryStats = await Model.aggregate([
          {
            $match: {
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
              ],
              isActive: true,
              deletedAt: null,
              status: searchType === 'services' ? 'active' : 'open'
            }
          },
          {
            $group: {
              _id: searchType === 'services' ? '$category' : '$projectCategory',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        
        // Get delivery time distribution (for services)
        if (searchType === 'services') {
          const deliveryStats = await Service.aggregate([
            {
              $match: {
                $or: [
                  { title: { $regex: searchRegex } },
                  { description: { $regex: searchRegex } },
                  { tags: { $regex: searchRegex } }
                ],
                isActive: true,
                deletedAt: null,
                status: 'active',
                deliveryTime: { $exists: true, $ne: null }
              }
            },
            {
              $bucket: {
                groupBy: '$deliveryTime',
                boundaries: [0, 3, 7, 14, 30, 90, 180],
                default: 'Other',
                output: {
                  count: { $sum: 1 }
                }
              }
            },
            { $sort: { _id: 1 } }
          ]);
          
          // Update delivery time options with counts
          if (deliveryStats.length > 0) {
            filterOptions.deliveryTime = filterOptions.deliveryTime.map(option => {
              const stat = deliveryStats.find(s => s._id === parseInt(option.value) || 
                (option.value === '' && s._id === 'Other') ||
                (option.value === '1' && s._id === 0) ||
                (option.value === '3' && s._id === 3) ||
                (option.value === '7' && s._id === 7) ||
                (option.value === '14' && s._id === 14) ||
                (option.value === '30' && s._id === 30) ||
                (option.value === '90' && s._id === 90));
              
              return {
                ...option,
                count: stat?.count || 0
              };
            });
          }
        }
        
        // Update budget options with counts if we have price stats
        if (priceStats.length > 0 && totalCount > 0) {
          const stats = priceStats[0];
          const minPrice = stats.minPrice || 0;
          const maxPrice = stats.maxPrice || 10000;
          const range = Math.max(1, maxPrice - minPrice);
          
          // Calculate approximate counts for each budget range
          filterOptions.budget = await Promise.all(filterOptions.budget.map(async (option) => {
            if (option.value === '') {
              return { ...option, count: totalCount };
            }
            
            const [min, max] = option.range;
            // For specific ranges, do a count query
            const count = await Model.countDocuments({
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
              ],
              isActive: true,
              deletedAt: null,
              status: searchType === 'services' ? 'active' : 'open',
              [searchType === 'services' ? 'price' : 'budget']: {
                $gte: min,
                $lte: max
              }
            });
            
            return {
              ...option,
              count
            };
          }));
        } else {
          // If no price stats, use default counts based on total
          filterOptions.budget = filterOptions.budget.map(option => ({
            ...option,
            count: option.value === '' ? totalCount : Math.floor(totalCount * 0.15) // Rough estimate
          }));
        }
        
        // Get rating stats
        const ratingStats = await Model.aggregate([
          {
            $match: {
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
              ],
              isActive: true,
              deletedAt: null,
              status: searchType === 'services' ? 'active' : 'open',
              rating: { $exists: true, $ne: null }
            }
          },
          {
            $bucket: {
              groupBy: '$rating',
              boundaries: [0, 3.0, 3.5, 4.0, 4.5, 5.0],
              default: 'Other',
              output: {
                count: { $sum: 1 }
              }
            }
          }
        ]);
        
        // Update rating options with counts
        filterOptions.rating = await Promise.all(filterOptions.rating.map(async (option) => {
          if (option.value === '') {
            return { ...option, count: totalCount };
          }
          
          const minRating = parseFloat(option.value);
          
          // Count items with rating >= minRating
          const count = await Model.countDocuments({
            $or: [
              { title: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              searchType === 'services' ? { tags: { $regex: searchRegex } } : {}
            ],
            isActive: true,
            deletedAt: null,
            status: searchType === 'services' ? 'active' : 'open',
            rating: { $gte: minRating }
          });
          
          return {
            ...option,
            count
          };
        }));
        
        // Add category filters if we have category stats
        if (categoryStats.length > 0) {
          // Get category details
          const categoryIds = categoryStats.map(stat => stat._id).filter(Boolean);
          const categories = await Category.find({
            _id: { $in: categoryIds }
          }).select('name slug icon').lean();
          
          const categoryMap = categories.reduce((map, cat) => {
            map[cat._id.toString()] = cat;
            return map;
          }, {});
          
          filterOptions.category = categoryStats.map(stat => {
            const category = categoryMap[stat._id?.toString()];
            return {
              value: stat._id?.toString() || '',
              label: category?.name || 'Unknown',
              icon: category?.icon || 'Tag',
              count: stat.count
            };
          });
        }
        
      } catch (error) {
        console.error('Error calculating filter counts:', error);
        // Continue with default counts
        
        // Add default counts to all options
        filterOptions.budget = filterOptions.budget.map(opt => ({ ...opt, count: 0 }));
        filterOptions.rating = filterOptions.rating.map(opt => ({ ...opt, count: 0 }));
        if (filterOptions.deliveryTime) {
          filterOptions.deliveryTime = filterOptions.deliveryTime.map(opt => ({ ...opt, count: 0 }));
        }
      }
    } else {
      // If no query, set all counts to 0
      filterOptions.budget = filterOptions.budget.map(opt => ({ ...opt, count: 0 }));
      filterOptions.rating = filterOptions.rating.map(opt => ({ ...opt, count: 0 }));
      if (filterOptions.deliveryTime) {
        filterOptions.deliveryTime = filterOptions.deliveryTime.map(opt => ({ ...opt, count: 0 }));
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: filterOptions,
      meta: {
        query: finalQuery,
        type: searchType,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Filter options error:', error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options',
      code: 'FILTERS_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});
module.exports = router;