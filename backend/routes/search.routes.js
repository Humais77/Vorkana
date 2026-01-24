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

// Enhanced sanitization with security layers
const enhancedSanitizeSearchInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Primary security: Remove all dangerous patterns
  const dangerousPatterns = [
    // SQL injection
    /'|"|`/g,
    /;/g,
    /--/g,
    /\b(?:OR|AND|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|JOIN|EXEC|EXECUTE|DECLARE|MERGE|TRUNCATE)\b/gi,
    /\(.*?\)/g,
    
    // NoSQL injection
    /\$.*\(/g,
    /\{\s*\"\$.*\"/g,
    
    // XSS patterns
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<\s*script/gi,
    /<\/\s*script/gi,
    /<\s*iframe/gi,
    /<\/\s*iframe/gi,
    /<\s*object/gi,
    /<\/\s*object/gi,
    /<\s*embed/gi,
    /<\/\s*embed/gi,
    /<\s*applet/gi,
    /<\s*style/gi,
    /<\/\s*style/gi,
    /expression\s*\(/gi,
    
    // Command injection
    /\|\|/g,
    /&&/g,
    /\|\s*\w+/g,
    /\$\s*\(/g,
    /`.*`/g,
    
    // Path traversal
    /\.\.\//g,
    /\.\.\\/g,
    /\/etc\/passwd/gi,
    /\/proc\//gi,
    /C:\\/gi,
    
    // Special characters that could cause issues
    /\\/g,
    /\$\{.*?\}/g,
    /%[0-9a-fA-F]{2}/g
  ];
  
  let sanitized = value;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove any remaining special characters (keep only safe ones)
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_+@.,&()!?:/\\[\]\u0600-\u06FF\u4e00-\u9fff\uac00-\ud7af]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length < 1) return '';
  if (sanitized.length > 500) sanitized = sanitized.substring(0, 500);
  
  return sanitized;
};

// Advanced query cleaning with multiple security layers
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
    'sort_by', 'sort_order', 'order',
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
    'business_size', 'company_type'
  ];
  
  // Rate limiting check (simplified - you'd want a proper rate limiter)
  if (params && Object.keys(params).length > 50) {
    throw new Error('Too many parameters');
  }
  
  Object.keys(params).forEach(key => {
    // Check if parameter is allowed
    if (!allowedParams.includes(key) && !key.startsWith('filter_') && !key.startsWith('x-')) {
      return;
    }
    
    let value = params[key];
    
    // Handle null/undefined/empty values
    if (value === null || value === undefined || value === '' || 
        value === 'null' || value === 'undefined') {
      return;
    }
    
    // Decode URI components safely
    if (typeof value === 'string') {
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        console.warn(`Failed to decode URI component for key ${key}: ${e.message}`);
        return;
      }
      
      // Enhanced security validation based on parameter type
      if (key === 'query' || key === 'q' || key === 'search') {
        const originalValue = value;
        value = enhancedSanitizeSearchInput(value);
        
        // Check if sanitization removed too much (possible attack)
        if (value.length === 0 && originalValue.length > 2) {
          console.warn(`Possible attack detected in search query: ${originalValue}`);
          return;
        }
        
        if (!value || value.length < 1) {
          return;
        }
        
        // Detect search intent with improved patterns
        const intentKeywords = {
          urgent: /\b(urgent|asap|immediate|fast|quick|rush|emergency|instant|soon|today)\b/i,
          cheap: /\b(cheap|budget|low[-\s]?cost|affordable|inexpensive|economical|discount|deal|bargain)\b/i,
          premium: /\b(premium|professional|expert|top|best|quality|elite|advanced|master|specialist)\b/i,
          beginner: /\b(beginner|newbie|starter|basic|simple|easy|entry[-\s]?level|novice)\b/i,
          complex: /\b(complex|advanced|custom|enterprise|sophisticated|detailed|comprehensive|extensive)\b/i,
          bulk: /\b(bulk|multiple|package|bundle|volume|wholesale|recurring|subscription)\b/i,
          custom: /\b(custom|personalized|tailored|bespoke|made[-\s]?to[-\s]?order|unique)\b/i,
          fix: /\b(fix|repair|debug|troubleshoot|solve|resolve|correct|improve|optimize)\b/i,
          create: /\b(create|build|develop|design|make|produce|generate|craft)\b/i
        };
        
        for (const [intent, pattern] of Object.entries(intentKeywords)) {
          if (pattern.test(value)) {
            cleaned[`intent_${intent}`] = true;
          }
        }
        
        // Detect search modifiers
        if (/\bnot\b|\bwithout\b|\b-\b/i.test(value)) {
          cleaned.has_exclusions = true;
        }
        
        if (/\bor\b|\beither\b|\balternative\b/i.test(value)) {
          cleaned.has_alternatives = true;
        }
        
      } else if (key.includes('location') || key.includes('country') || key.includes('city')) {
        // Sanitize location-based parameters
        value = sanitizeHtml(value, { allowedTags: [] }).trim();
        if (value.length > 100) value = value.substring(0, 100);
        
      } else if (key.includes('email') || key.includes('url') || key.includes('website')) {
        // Extra sanitization for sensitive fields
        value = sanitizeHtml(value, { allowedTags: [] }).trim();
        value = value.replace(/[^a-zA-Z0-9@.\-_:/?#\[\]@!$&'()*+,;=\s]/g, '');
        
      } else if (key.includes('script') || key.includes('code') || key.includes('html')) {
        // Extra sanitization for code-related fields
        value = sanitizeHtml(value, { allowedTags: [] }).trim();
        value = value.replace(/[<>]/g, '');
        
      } else if (key.includes('phone') || key.includes('mobile') || key.includes('tel')) {
        // Phone number validation
        value = value.replace(/[^0-9+\-()\s]/g, '');
        if (value.length > 20) value = value.substring(0, 20);
        
      } else if (key === 'skills' || key === 'tags' || key === 'keywords' || 
                 key === 'tools' || key === 'technologies' || key === 'languages') {
        // Handle array parameters with advanced sanitization
        const items = typeof value === 'string' ? value.split(',').map(item => item.trim()) : 
                     Array.isArray(value) ? value : [value];
        
        const sanitizedItems = items.map(item => {
          const sanitized = enhancedSanitizeSearchInput(item.toString());
          return sanitized && sanitized.length >= 1 ? sanitized : null;
        }).filter(item => item !== null);
        
        if (sanitizedItems.length > 0) {
          cleaned[key] = sanitizedItems;
          
          // Add skill similarity boost if user has matching skills
          if (user && user.skills && (key === 'skills' || key === 'technologies')) {
            const userSkills = Array.isArray(user.skills) ? user.skills : [user.skills];
            const matchingSkills = sanitizedItems.filter(skill => 
              userSkills.some(userSkill => {
                const userSkillLower = userSkill.toLowerCase();
                const searchSkillLower = skill.toLowerCase();
                return userSkillLower.includes(searchSkillLower) ||
                       searchSkillLower.includes(userSkillLower) ||
                       userSkillLower === searchSkillLower;
              })
            );
            if (matchingSkills.length > 0) {
              cleaned['skill_match_boost'] = true;
              cleaned['matching_skills_count'] = matchingSkills.length;
            }
          }
        }
        return;
      }
    }
    
    // Type conversion with validation and bounds checking
    if (value === 'true' || value === 'false') {
      cleaned[key] = value === 'true';
    } else if (!isNaN(value) && value !== '' && typeof value !== 'object') {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        // Additional validation based on parameter type
        if (key.includes('price') || key.includes('budget') || key.includes('cost')) {
          if (num >= 0 && num <= 10000000) cleaned[key] = num; // $10M max
        } else if (key.includes('rating')) {
          if (num >= 0 && num <= 5) cleaned[key] = num;
        } else if (key.includes('reviews') || key.includes('orders')) {
          if (num >= 0 && num <= 1000000) cleaned[key] = Math.floor(num); // Must be integer
        } else if (key.includes('time') || key.includes('days') || key.includes('hours')) {
          if (num >= 0 && num <= 3650) cleaned[key] = num; // 10 years max
        } else if (key.includes('percentage') || key.includes('rate')) {
          if (num >= 0 && num <= 100) cleaned[key] = num;
        } else if (key.includes('count') || key.includes('quantity') || key.includes('number')) {
          if (num >= 0 && num <= 10000) cleaned[key] = Math.floor(num);
        } else {
          cleaned[key] = num;
        }
      } else {
        cleaned[key] = value;
      }
    } else if (isValidObjectId(value)) {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      // Handle array values
      const sanitizedArray = value.map(item => {
        if (typeof item === 'string') {
          return enhancedSanitizeSearchInput(item);
        }
        return item;
      }).filter(item => item !== null && item !== undefined && item !== '');
      
      if (sanitizedArray.length > 0) {
        cleaned[key] = sanitizedArray;
      }
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
    if (!cleaned.language && user.language) {
      cleaned.user_language = user.language;
    }
    if (user.role === 'admin' || user.role === 'moderator') {
      cleaned.admin_view = true;
    }
    
    // Add user preferences for personalization
    if (user.preferences) {
      if (user.preferences.defaultSort && !cleaned.sort_by) {
        cleaned.sort_by = user.preferences.defaultSort;
      }
      if (user.preferences.resultsPerPage && !cleaned.limit) {
        cleaned.limit = user.preferences.resultsPerPage;
      }
    }
  }
  
  // Set defaults for missing required parameters
  if (!cleaned.page) cleaned.page = 1;
  if (!cleaned.limit) cleaned.limit = 48;
  if (!cleaned.sort_by) cleaned.sort_by = 'relevance';
  if (!cleaned.order) cleaned.order = 'desc';
  
  return cleaned;
};

// Validate ObjectId with enhanced checks
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  
  // Check format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) return false;
  
  // Additional check for invalid ObjectIds
  try {
    const objectId = new mongoose.Types.ObjectId(id);
    return objectId.toString() === id;
  } catch (error) {
    return false;
  }
};

// Escape regex special characters with enhanced handling
const escapeRegex = (string) => {
  if (typeof string !== 'string') return string;
  
  // First, escape special regex characters
  let escaped = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Additional security: limit length
  if (escaped.length > 200) {
    escaped = escaped.substring(0, 200);
  }
  
  return escaped;
};

const buildSearchFilter = async (params, searchType, user) => {
  const filter = {};
  
  // Base filter conditions
  const conditions = [];
  
  // Status condition
  if (searchType === 'services') {
    conditions.push({ status: 'active' });
    conditions.push({ isActive: true });
    conditions.push({ deletedAt: null });
  } else if (searchType === 'gigs') {
    conditions.push({ status: 'open' });
    conditions.push({ isActive: true });
    conditions.push({ deletedAt: null });
    conditions.push({ visibility: 'public' });
  }
  
  // Category filter
  const categoryParam = params.category || params.category_id || params.categoryId;
  if (categoryParam && isValidObjectId(categoryParam)) {
    const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
    conditions.push({ [categoryField]: new mongoose.Types.ObjectId(categoryParam) });
  }
  
  // Subcategory filter
  const subcategoryParam = params.subcategory || params.subcategory_id || params.subcategoryId;
  if (subcategoryParam && isValidObjectId(subcategoryParam)) {
    conditions.push({ subcategory: new mongoose.Types.ObjectId(subcategoryParam) });
  }
  
  // Price filter
  const priceMin = params.min_price || params.minPrice;
  const priceMax = params.max_price || params.maxPrice;
  const priceField = searchType === 'services' ? 'price' : 'budget';
  
  if (priceMin !== undefined || priceMax !== undefined) {
    const priceCondition = {};
    if (priceMin !== undefined) priceCondition.$gte = parseFloat(priceMin);
    if (priceMax !== undefined) priceCondition.$lte = parseFloat(priceMax);
    conditions.push({ [priceField]: priceCondition });
  }
  
  // Rating filter
  const ratingMin = params.min_rating || params.minRating;
  const ratingMax = params.max_rating || params.maxRating;
  if (ratingMin !== undefined || ratingMax !== undefined) {
    const ratingCondition = {};
    if (ratingMin !== undefined) ratingCondition.$gte = parseFloat(ratingMin);
    if (ratingMax !== undefined) ratingCondition.$lte = parseFloat(ratingMax);
    conditions.push({ rating: ratingCondition });
  }
  
  // Delivery time filter
  const deliveryParam = params.delivery_time || params.deliveryTime;
  if (deliveryParam !== undefined && deliveryParam !== '' && searchType === 'services') {
    const deliveryNumber = Number(deliveryParam);
    if (!isNaN(deliveryNumber)) {
      conditions.push({ deliveryTime: { $lte: deliveryNumber } });
    }
  }
  
  // Currency filter
  const currencyParam = params.currency;
  if (currencyParam && typeof currencyParam === 'string') {
    conditions.push({ currency: currencyParam.toUpperCase() });
  }
  
  // Skills filter
  const skillsParam = params.skills || params.skills_required;
  if (skillsParam) {
    const skillsArray = Array.isArray(skillsParam) ? skillsParam : skillsParam.split(',');
    const sanitizedSkills = skillsArray.map(skill => 
      skill.trim().toLowerCase()
    ).filter(skill => skill.length > 0);
    
    if (sanitizedSkills.length > 0) {
      const skillField = searchType === 'services' ? 'tags' : 'skillsRequired';
      conditions.push({ [skillField]: { $in: sanitizedSkills } });
    }
  }
  
  // Tags/keywords filter
  const tagsParam = params.tags || params.keywords;
  if (tagsParam && searchType === 'services') {
    const tagsArray = Array.isArray(tagsParam) ? tagsParam : tagsParam.split(',');
    const sanitizedTags = tagsArray.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    
    if (sanitizedTags.length > 0) {
      conditions.push({ tags: { $in: sanitizedTags } });
    }
  }
  
  // Boolean filters
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
  
  // Seller filter
  const sellerParam = params.seller || params.seller_id || params.sellerId || params.createdBy;
  if (sellerParam && isValidObjectId(sellerParam)) {
    conditions.push({ createdBy: new mongoose.Types.ObjectId(sellerParam) });
  }
  
  // Combine all conditions
  if (conditions.length === 1) {
    Object.assign(filter, conditions[0]);
  } else if (conditions.length > 1) {
    filter.$and = conditions;
  }
  
  return filter;
};

// Advanced sort options with performance optimizations
const getSortOptions = (sortParam, searchType, hasTextSearch, params, user) => {
  const sort = sortParam || 'relevance';
  const sortOrder = params.order || 'desc';
  const orderValue = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  
  // Base sort configuration
  let sortConfig = {};
  
  if (hasTextSearch && (sort.toLowerCase() === 'relevance' || !sort)) {
    // Text search relevance - MongoDB will handle this
    sortConfig = { 
      score: { $meta: 'textScore' }
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
      
      case 'featured':
        sortConfig = { isFeatured: -1, rating: -1 };
        break;
      
      case 'trending':
        // Simple trending based on views and recency
        sortConfig = { 
          views: -1,
          likes: -1,
          createdAt: -1
        };
        break;
      
      case 'recommended':
        if (user) {
          // Personalized recommendations
          sortConfig = {
            isRecommended: -1,
            'createdBy.rating': -1,
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
          rating: -1
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
  
  // Apply sort order
  if (orderValue === 1) {
    Object.keys(sortConfig).forEach(key => {
      if (typeof sortConfig[key] === 'number') {
        sortConfig[key] = Math.abs(sortConfig[key]);
      }
    });
  }
  
  return sortConfig;
};

// Text search query builder with performance optimizations
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
    // Use regex for fuzzy matching
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
  
  // Standard text search
  return {
    $text: { 
      $search: sanitizedQuery,
      $caseSensitive: false,
      $diacriticSensitive: false 
    }
  };
};

// Get user personalization data
const getUserPersonalization = async (userId, searchType) => {
  if (!userId) return null;
  
  try {
    const user = await User.findById(userId)
      .select('preferences searchHistory favorites skills country currency language')
      .lean();
    
    if (!user) return null;
    
    return {
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
  } catch (error) {
    console.error('Error getting user personalization:', error);
    return null;
  }
};

// Build aggregation pipeline with performance optimizations
const buildAggregationPipeline = (filter, sortOptions, skip, limit, searchType, searchQuery, personalization) => {
  const pipeline = [];
  
  // Match stage - handle $and array properly
  let matchStage = {};
  if (filter.$and && filter.$and.length > 0) {
    matchStage = { $and: filter.$and };
  } else {
    matchStage = filter;
  }
  
  // Remove any empty conditions
  if (matchStage.$and) {
    matchStage.$and = matchStage.$and.filter(cond => 
      cond && Object.keys(cond).length > 0 && !(cond.$and && cond.$and.length === 0)
    );
    if (matchStage.$and.length === 0) {
      delete matchStage.$and;
    }
  }
  
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }
  
  // Lookup creator details with performance optimizations
  pipeline.push({
    $lookup: {
      from: 'users',
      let: { creatorId: '$createdBy' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$creatorId'] },
            isActive: true,
            registrationStatus: 'verified'
          }
        },
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
            country: 1,
            languages: 1,
            skills: 1,
            joinedAt: 1,
            lastSeenAt: 1
          }
        }
      ],
      as: 'creatorDetails'
    }
  });
  
  pipeline.push({ 
    $unwind: { 
      path: '$creatorDetails',
      preserveNullAndEmptyArrays: true 
    } 
  });
  
  // Lookup category
  const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
  pipeline.push({
    $lookup: {
      from: 'categories',
      let: { categoryId: `$${categoryField}` },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$categoryId'] },
            isActive: true,
            deletedAt: null
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            icon: 1,
            description: 1,
            isSubcategory: 1
          }
        }
      ],
      as: 'categoryDetails'
    }
  });
  
  pipeline.push({ 
    $unwind: { 
      path: '$categoryDetails',
      preserveNullAndEmptyArrays: true 
    } 
  });
  
  // Lookup subcategory if exists
  pipeline.push({
    $lookup: {
      from: 'subcategories',
      let: { subcategoryId: '$subcategory' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$subcategoryId'] },
            isActive: true,
            deletedAt: null
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            icon: 1,
            description: 1
          }
        }
      ],
      as: 'subcategoryDetails'
    }
  });
  
  pipeline.push({ 
    $unwind: { 
      path: '$subcategoryDetails',
      preserveNullAndEmptyArrays: true 
    } 
  });
  
  // Add computed scores
  pipeline.push({
    $addFields: {
      // Calculate engagement score
      engagementScore: {
        $add: [
          { $multiply: ['$views', 0.1] },
          { $multiply: ['$likes', 0.5] },
          { $multiply: ['$reviewsCount', 1] },
          { $multiply: [{ $ifNull: ['$rating', 0] }, 10] }
        ]
      },
      
      // Calculate seller reliability score
      sellerScore: {
        $cond: {
          if: { $and: [
            { $ifNull: ['$creatorDetails.rating', false] },
            { $gt: ['$creatorDetails.completedOrders', 0] }
          ]},
          then: {
            $add: [
              { $multiply: ['$creatorDetails.rating', 20] },
              { $multiply: [{ $ifNull: ['$creatorDetails.responseRate', 0] }, 0.1] },
              { $multiply: [{ $divide: ['$creatorDetails.completedOrders', 100] }, 5] }
            ]
          },
          else: 0
        }
      },
      
      // Calculate freshness score (higher for newer items)
      freshnessScore: {
        $divide: [
          { $subtract: [new Date(), { $ifNull: ['$createdAt', new Date()] }] },
          86400000 // milliseconds in a day
        ]
      }
    }
  });
  
  // Add text match score if we have a search query
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
                    { 
                      $regexMatch: { 
                        input: '$title', 
                        regex: new RegExp(escapeRegex(searchQuery), 'i') 
                      } 
                    },
                    50,
                    0
                  ]
                },
                {
                  $cond: [
                    { 
                      $regexMatch: { 
                        input: '$description', 
                        regex: new RegExp(escapeRegex(searchQuery), 'i') 
                      } 
                    },
                    20,
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
  
  // Add personalization score if available
  if (personalization) {
    pipeline.push({
      $addFields: {
        personalizationScore: {
          $cond: [
            {
              $or: [
                { $in: [`$${categoryField}`, personalization.preferredCategories] },
                {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: [
                          { $ifNull: ['$tags', []] },
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
        }
      }
    });
  }
  
  // Calculate final relevance score
  const relevanceScoreFields = [
    { $ifNull: ['$textMatchScore', 0] },
    { $multiply: ['$engagementScore', 0.3] },
    { $multiply: [{ $subtract: [100, { $min: ['$freshnessScore', 100] }] }, 0.2] },
    { $multiply: ['$sellerScore', 0.2] },
    { $cond: [{ $eq: ['$isFeatured', true] }, 50, 0] },
    { $cond: [{ $eq: ['$isRecommended', true] }, 30, 0] },
    { $cond: [{ $eq: ['$isPopular', true] }, 20, 0] }
  ];
  
  if (personalization) {
    relevanceScoreFields.push({ $multiply: ['$personalizationScore', 0.3] });
  }
  
  pipeline.push({
    $addFields: {
      relevanceScore: {
        $add: relevanceScoreFields
      }
    }
  });
  
  // Sort stage - prioritize relevance score if available in sort options
  if (sortOptions.score || sortOptions.relevanceScore) {
    pipeline.push({ $sort: { relevanceScore: -1 } });
  } else if (Object.keys(sortOptions).length > 0) {
    pipeline.push({ $sort: sortOptions });
  } else {
    // Default sort by relevance
    pipeline.push({ $sort: { relevanceScore: -1 } });
  }
  
  // Skip and limit
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });
  
  // Project final fields with optimizations
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
        $cond: {
          if: { $or: [{ $ifNull: ['$price', false] }, { $ifNull: ['$budget', false] }] },
          then: {
            $concat: [
              { $ifNull: ['$currency', 'USD'] },
              ' ',
              { 
                $toString: { 
                  $round: [
                    { $ifNull: ['$price', '$budget', 0] }, 
                    2
                  ] 
                } 
              }
            ]
          },
          else: 'Price on request'
        }
      },
      
      // Creator details
      seller: {
        _id: '$creatorDetails._id',
        name: '$creatorDetails.name',
        username: '$creatorDetails.username',
        picture: {
          $cond: {
            if: '$creatorDetails.picture',
            then: '$creatorDetails.picture',
            else: null
          }
        },
        rating: '$creatorDetails.rating',
        completedOrders: '$creatorDetails.completedOrders',
        responseRate: '$creatorDetails.responseRate',
        responseTime: '$creatorDetails.responseTime',
        isPro: { 
          $in: [
            '$creatorDetails.accountType', 
            ['premium', 'business', 'pro']
          ] 
        },
        level: '$creatorDetails.level',
        country: '$creatorDetails.country',
        joinedAt: '$creatorDetails.joinedAt',
        lastSeenAt: '$creatorDetails.lastSeenAt'
      },
      
      // Category details
      categoryInfo: {
        _id: '$categoryDetails._id',
        name: '$categoryDetails.name',
        slug: '$categoryDetails.slug',
        icon: '$categoryDetails.icon',
        description: '$categoryDetails.description',
        isSubcategory: '$categoryDetails.isSubcategory'
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
          if: { $and: [
            { $ifNull: ['$description', false] },
            { $gt: [{ $strLenCP: '$description' }, 150] }
          ]},
          then: { $concat: [{ $substrCP: ['$description', 0, 150] }, '...'] },
          else: '$description'
        }
      },
      
      // Delivery info
      deliveryInfo: {
        $cond: {
          if: { $and: [
            { $ifNull: ['$deliveryTime', false] },
            { $ifNull: ['$deliveryTimeUnit', false] }
          ]},
          then: {
            $concat: [
              { $toString: '$deliveryTime' },
              ' ',
              '$deliveryTimeUnit'
            ]
          },
          else: null
        }
      }
    }
  };
  
  pipeline.push(projectStage);
  
  return pipeline;
};

// Get related search data
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
    // Analyze query complexity
    if (searchQuery) {
      const words = searchQuery.split(' ').filter(w => w.length > 2);
      relatedData.analytics.queryComplexity = 
        words.length === 1 ? 'simple' :
        words.length <= 3 ? 'moderate' : 'complex';
    }
    
    // Get related categories
    if (searchQuery && searchQuery.length >= 2) {
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
            description: 1,
            servicesCount: 1,
            gigsCount: 1,
            totalItems: 1
          }
        }
      ]);
    }
    
    // Get subcategories for the category
    if (categoryId && isValidObjectId(categoryId)) {
      relatedData.subcategories = await Subcategory.find({
        category: new mongoose.Types.ObjectId(categoryId),
        isActive: true,
        deletedAt: null
      })
      .select('name slug icon description order')
      .sort({ order: 1, name: 1 })
      .limit(10)
      .lean();
    }
    
    // Get trending items
    const Model = searchType === 'services' ? Service : Gig;
    const statusFilter = searchType === 'services' ? 'active' : 'open';
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (categoryId && isValidObjectId(categoryId)) {
      const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
      
      relatedData.trendingItems = await Model.find({
        [categoryField]: new mongoose.Types.ObjectId(categoryId),
        isActive: true,
        deletedAt: null,
        status: statusFilter,
        createdAt: { $gte: thirtyDaysAgo }
      })
      .select('title slug price budget rating views likes thumbnail')
      .sort({ views: -1, likes: -1 })
      .limit(5)
      .lean();
    }
    
    // Get top sellers for this search
    if (searchQuery && searchQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(searchQuery), 'i');
      
      const matchingItems = await Model.find({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ],
        isActive: true,
        deletedAt: null,
        status: statusFilter
      })
      .select('createdBy')
      .limit(50)
      .lean();
      
      const creatorIds = [...new Set(matchingItems.map(item => item.createdBy).filter(Boolean))];
      
      if (creatorIds.length > 0) {
        relatedData.topSellers = await User.find({
          _id: { $in: creatorIds },
          isActive: true,
          registrationStatus: 'verified'
        })
        .select('name username picture rating completedOrders responseRate responseTime accountType level country')
        .sort({ rating: -1, completedOrders: -1 })
        .limit(6)
        .lean();
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
            filters: Object.keys(filters || {}).slice(0, 10), // Limit stored filters
            timestamp: new Date(),
            resultCount: 0 // Will be updated when search completes
          }],
          $slice: -100 // Keep last 100 searches
        }
      }
    });
  } catch (error) {
    console.error('Error updating user search history:', error);
  }
};

router.get('/search', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Get user for personalization
    const user = req.user || null;
    
    // Clean and validate parameters
    const params = cleanSearchParams(req.query, user);
    
    // Extract main parameters with defaults
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
      has_video,
      cache: useCacheParam = 'true'
    } = params;
    
    // Determine search type
    const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
    
    // Use query from various possible parameters
    const finalQuery = searchQuery || q || search;
    
    // Validate query
    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required and must be at least 1 character',
        code: 'QUERY_REQUIRED',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Additional security checks
    if (finalQuery.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Search query is too long',
        code: 'QUERY_TOO_LONG',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /'.*'.*'.*'/i,
      /union.*select/i,
      /select.*from/i,
      /insert.*into/i,
      /<script/i,
      /javascript:/i,
      /\.\.\//i,
      /\/etc\/passwd/i,
      /\\x/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(finalQuery)) {
        console.warn(`Suspicious search attempt detected and blocked: ${finalQuery}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid search query',
          code: 'INVALID_QUERY',
          requestId,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(parseInt(limit) || 48, 200);
    const skip = offset !== undefined ? parseInt(offset) : (pageNum - 1) * limitNum;
    const useCache = useCacheParam === 'true' && pageNum === 1;
    
    // Validate pagination
    if (skip < 0 || skip > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        code: 'INVALID_PAGINATION',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get user personalization
    const personalization = user ? await getUserPersonalization(user._id, searchType) : null;
    
    // Build cache key
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
      delivery_time,
      skills
    });
    
    // Try to get from cache
    let cachedResults = null;
    if (useCache) {
      try {
        cachedResults = await cache.get(cacheKey);
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
        'Cache-Control': 'public, max-age=300',
        'X-Personalized': personalization ? 'yes' : 'no'
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
    const baseFilter = await buildSearchFilter(params, searchType, user);
    
    // Add text search query
    let hasTextSearch = false;
    if (finalQuery && finalQuery.trim().length >= 1) {
      const textSearchQuery = buildTextSearchQuery(finalQuery, searchType, params);
      
      if (textSearchQuery.$text) {
        // Use text search
        baseFilter.$text = textSearchQuery.$text;
        hasTextSearch = true;
      } else if (textSearchQuery.$or) {
        // Use regex search
        if (!baseFilter.$or) baseFilter.$or = [];
        baseFilter.$or.push(...textSearchQuery.$or);
      }
    }
    
    // Get sort options
    const sortOptions = getSortOptions(sort, searchType, hasTextSearch, params, user);
    
    // Execute search with optimized approach
    const Model = searchType === 'services' ? Service : Gig;
    
    // Get total count
    let totalCount = 0;
    try {
      totalCount = await Model.countDocuments(baseFilter);
    } catch (countError) {
      console.error('Count error:', countError);
      // If count fails, estimate based on simpler filter
      const simpleFilter = { ...baseFilter };
      delete simpleFilter.$text;
      delete simpleFilter.$or;
      totalCount = await Model.countDocuments(simpleFilter);
    }
    
    // Build query with sort
    let query = Model.find(baseFilter);
    
    // Apply text score sorting if using text search
    if (hasTextSearch && sort === 'relevance') {
      query = query.select({ score: { $meta: 'textScore' } });
      query = query.sort({ score: { $meta: 'textScore' } });
    } else {
      // Apply regular sort
      query = query.sort(sortOptions);
    }
    
    // Apply pagination
    query = query.skip(skip).limit(limitNum);
    
    // Select fields to return
    query = query.select('title slug description shortDescription price budget currency rating reviewsCount views likes deliveryTime deliveryTimeUnit images thumbnail tags skillsRequired isFeatured isRecommended isPopular status visibility urgency createdAt updatedAt createdBy category subcategory projectCategory');
    
    // Execute query
    let results = [];
    try {
      results = await query.lean();
    } catch (queryError) {
      console.error('Query error:', queryError);
      
      // Fallback to simpler query
      results = await Model.find(baseFilter)
        .select('title slug description price budget rating thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
    }
    
    // If we have results, populate creator and category info
    if (results.length > 0) {
      try {
        // Get creator IDs
        const creatorIds = results.map(r => r.createdBy).filter(Boolean);
        const creators = await User.find({ _id: { $in: creatorIds } })
          .select('name username picture rating completedOrders responseRate responseTime accountType level country joinedAt lastSeenAt')
          .lean();
        
        const creatorMap = creators.reduce((map, creator) => {
          map[creator._id.toString()] = creator;
          return map;
        }, {});
        
        // Get category IDs
        const categoryIds = results.map(r => r.category || r.projectCategory).filter(Boolean);
        const categories = await Category.find({ _id: { $in: categoryIds } })
          .select('name slug icon description isSubcategory')
          .lean();
        
        const categoryMap = categories.reduce((map, category) => {
          map[category._id.toString()] = category;
          return map;
        }, {});
        
        // Get subcategory IDs
        const subcategoryIds = results.map(r => r.subcategory).filter(Boolean);
        const subcategories = await Subcategory.find({ _id: { $in: subcategoryIds } })
          .select('name slug icon description')
          .lean();
        
        const subcategoryMap = subcategories.reduce((map, subcategory) => {
          map[subcategory._id.toString()] = subcategory;
          return map;
        }, {});
        
        // Enrich results with related data
        results = results.map(item => {
          const enriched = {
            ...item,
            type: searchType,
            priceFormatted: item.currency 
              ? `${item.currency} ${(item.price || item.budget || 0).toFixed(2)}`
              : `USD ${(item.price || item.budget || 0).toFixed(2)}`,
            descriptionShort: item.description && item.description.length > 150
              ? item.description.substring(0, 150) + '...'
              : item.description || '',
            seller: item.createdBy && creatorMap[item.createdBy.toString()]
              ? {
                  _id: creatorMap[item.createdBy.toString()]._id,
                  name: creatorMap[item.createdBy.toString()].name,
                  username: creatorMap[item.createdBy.toString()].username,
                  picture: creatorMap[item.createdBy.toString()].picture,
                  rating: creatorMap[item.createdBy.toString()].rating,
                  completedOrders: creatorMap[item.createdBy.toString()].completedOrders,
                  responseRate: creatorMap[item.createdBy.toString()].responseRate,
                  responseTime: creatorMap[item.createdBy.toString()].responseTime,
                  isPro: ['premium', 'business', 'pro'].includes(creatorMap[item.createdBy.toString()].accountType),
                  level: creatorMap[item.createdBy.toString()].level,
                  country: creatorMap[item.createdBy.toString()].country
                }
              : null,
            categoryInfo: (item.category || item.projectCategory) && categoryMap[(item.category || item.projectCategory).toString()]
              ? {
                  _id: categoryMap[(item.category || item.projectCategory).toString()]._id,
                  name: categoryMap[(item.category || item.projectCategory).toString()].name,
                  slug: categoryMap[(item.category || item.projectCategory).toString()].slug,
                  icon: categoryMap[(item.category || item.projectCategory).toString()].icon,
                  description: categoryMap[(item.category || item.projectCategory).toString()].description,
                  isSubcategory: categoryMap[(item.category || item.projectCategory).toString()].isSubcategory
                }
              : null,
            subcategoryInfo: item.subcategory && subcategoryMap[item.subcategory.toString()]
              ? {
                  _id: subcategoryMap[item.subcategory.toString()]._id,
                  name: subcategoryMap[item.subcategory.toString()].name,
                  slug: subcategoryMap[item.subcategory.toString()].slug,
                  icon: subcategoryMap[item.subcategory.toString()].icon,
                  description: subcategoryMap[item.subcategory.toString()].description
                }
              : null
          };
          
          // Calculate some scores for sorting
          enriched.relevanceScore = calculateRelevanceScore(enriched, finalQuery, personalization);
          
          return enriched;
        });
        
        // Re-sort by relevance score if needed
        if (sort === 'relevance' && !hasTextSearch) {
          results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
        
      } catch (enrichError) {
        console.error('Error enriching results:', enrichError);
        // Continue with basic results
      }
    }
    
    // Get related data (non-blocking)
    let relatedData = {};
    try {
      relatedData = await getRelatedData(
        finalQuery,
        searchType,
        categoryParam,
        subcategoryParam,
        user ? user._id : null
      );
    } catch (relatedError) {
      console.error('Related data error:', relatedError);
    }
    
    // Update user search history (non-blocking)
    if (user && user._id) {
      updateUserSearchHistory(user._id, finalQuery, searchType, params).catch(err => {
        console.error('Search history update error:', err);
      });
    }
    
    // Calculate pagination info
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;
    
    // Prepare response
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
      }
    };
    
    // Add related data if available
    if (Object.keys(relatedData).length > 0) {
      responseData.related = relatedData;
    }
    
    // Cache the response if enabled
    if (useCache && results.length > 0) {
      try {
        await cache.set(cacheKey, responseData, 300);
      } catch (cacheError) {
        console.error('Cache set error:', cacheError);
      }
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
      'X-Cache': useCache ? 'MISS' : 'BYPASS',
      'Cache-Control': useCache ? 'public, max-age=300' : 'no-cache',
      'X-Search-Type': searchType,
      'X-Results-Count': results.length,
      'X-Personalized': personalization ? 'yes' : 'no'
    });
    
    // Send response
    res.json({
      success: true,
      data: responseData,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Search error:', error);
    
    const responseTime = Date.now() - startTime;
    
    // Handle specific errors
    let statusCode = 500;
    let errorCode = 'SEARCH_ERROR';
    let errorMessage = 'Error performing search';
    
    if (error.name === 'CastError') {
      statusCode = 400;
      errorCode = 'INVALID_PARAMETER';
      errorMessage = 'Invalid parameter format';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Validation error in search parameters';
    } else if (error.message && error.message.includes('Too many parameters')) {
      statusCode = 400;
      errorCode = 'TOO_MANY_PARAMETERS';
      errorMessage = 'Too many search parameters provided';
    } else if (error.message && error.message.includes('text index')) {
      statusCode = 400;
      errorCode = 'TEXT_SEARCH_UNAVAILABLE';
      errorMessage = 'Text search is not available for this query';
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: errorCode,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`
    });
  }
});

// Add this helper function for relevance scoring
const calculateRelevanceScore = (item, searchQuery, personalization) => {
  let score = 0;
  
  // Base score from item properties
  if (item.isFeatured) score += 50;
  if (item.isRecommended) score += 30;
  if (item.isPopular) score += 20;
  
  // Rating score
  if (item.rating) score += item.rating * 10;
  
  // Reviews score
  if (item.reviewsCount) score += Math.min(item.reviewsCount * 0.5, 50);
  
  // Engagement score
  if (item.views) score += item.views * 0.01;
  if (item.likes) score += item.likes * 0.5;
  
  // Text match score
  if (searchQuery && item.title) {
    const searchLower = searchQuery.toLowerCase();
    const titleLower = item.title.toLowerCase();
    
    if (titleLower.includes(searchLower)) {
      score += 30;
    }
    
    // Check for individual words
    const searchWords = searchLower.split(' ');
    const titleWords = titleLower.split(' ');
    const matchingWords = searchWords.filter(word => 
      titleWords.some(titleWord => titleWord.includes(word))
    );
    
    score += matchingWords.length * 10;
  }
  
  // Description match
  if (searchQuery && item.description) {
    const descLower = item.description.toLowerCase();
    if (descLower.includes(searchQuery.toLowerCase())) {
      score += 10;
    }
  }
  
  // Personalization score
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
  
  // Freshness score (newer items get higher score)
  if (item.createdAt) {
    const ageInDays = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 100 - ageInDays);
    score += freshnessScore * 0.1;
  }
  
  return Math.round(score * 100) / 100;
};

// Suggestions endpoint with improved performance
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
      limit = 10
    } = params;
    
    const finalQuery = searchQuery || q || search;
    
    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim().length < 1) {
      return res.json({
        success: true,
        data: [],
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`
      });
    }
    
    const searchType = (type === 'gigs' || type === 'projects') ? 'gigs' : 'services';
    const searchRegex = new RegExp(`^${escapeRegex(finalQuery)}`, 'i');
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    
    const suggestions = [];
    
    // Search in services
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
    
    // Search in gigs
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
    
    // Search in categories
    const categorySuggestions = await Category.find({
      name: searchRegex,
      isActive: true,
      deletedAt: null,
      isSubcategory: false
    })
    .select('name slug icon servicesCount gigsCount')
    .sort({ servicesCount: -1, gigsCount: -1 })
    .limit(5)
    .lean();
    
    suggestions.push(...categorySuggestions.map(item => ({
      type: 'category',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      count: (item.servicesCount || 0) + (item.gigsCount || 0),
      url: `/categories/${item.slug}`
    })));
    
    // Remove duplicates and sort by type priority
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(item => [`${item.type}-${item.slug}`, item])).values()
    )
    .sort((a, b) => {
      const typePriority = { service: 3, gig: 3, category: 2 };
      return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    })
    .slice(0, limitNum);
    
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

// Quick search endpoint
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
    
    if (!finalQuery || typeof finalQuery !== 'string' || finalQuery.trim().length < 1) {
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
    
    // Search in categories
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
    
    // Sort and limit
    const sortedResults = results
      .sort((a, b) => a.type.localeCompare(b.type))
      .slice(0, limitNum);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: sortedResults,
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
    const Model = searchType === 'services' ? Service : Gig;
    
    // Base filter for counting
    const baseFilter = {
      isActive: true,
      deletedAt: null,
      status: searchType === 'services' ? 'active' : 'open'
    };
    
    if (searchType === 'gigs') {
      baseFilter.visibility = 'public';
    }
    
    // Add category filter if provided
    if (categoryParam && isValidObjectId(categoryParam)) {
      const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
      baseFilter[categoryField] = new mongoose.Types.ObjectId(categoryParam);
    }
    
    // Add subcategory filter if provided
    if (subcategoryParam && isValidObjectId(subcategoryParam)) {
      baseFilter.subcategory = new mongoose.Types.ObjectId(subcategoryParam);
    }
    
    // Add text search if query exists
    if (finalQuery && finalQuery.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(finalQuery), 'i');
      baseFilter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        searchType === 'services' ? { tags: { $regex: searchRegex } } : {},
        searchType === 'gigs' ? { skillsRequired: { $regex: searchRegex } } : {}
      ];
    }
    
    // Get total count for this search
    const totalCount = await Model.countDocuments(baseFilter);
    
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
    
    // Service-specific filters
    if (searchType === 'services') {
      filterOptions.deliveryTime = [
        { value: '', label: 'Any Delivery Time', days: null, count: totalCount },
        { value: '1', label: '24 Hours', days: 1, count: 0 },
        { value: '3', label: '1-3 Days', days: 3, count: 0 },
        { value: '7', label: '3-7 Days', days: 7, count: 0 },
        { value: '14', label: '1-2 Weeks', days: 14, count: 0 },
        { value: '30', label: '1 Month', days: 30, count: 0 },
        { value: '90', label: '3 Months', days: 90, count: 0 }
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
    
    // Get price distribution if we have results
    if (totalCount > 0) {
      const priceField = searchType === 'services' ? 'price' : 'budget';
      
      // Get price stats
      const priceStats = await Model.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            minPrice: { $min: `$${priceField}` },
            maxPrice: { $max: `$${priceField}` },
            avgPrice: { $avg: `$${priceField}` },
            totalCount: { $sum: 1 }
          }
        }
      ]);
      
      if (priceStats.length > 0) {
        const stats = priceStats[0];
        
        // Calculate counts for budget ranges
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
      }
    }
    
    // Get rating distribution
    if (totalCount > 0) {
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
    }
    
    // Get delivery time distribution for services
    if (searchType === 'services' && totalCount > 0) {
      const deliveryCountPromises = filterOptions.deliveryTime.map(async (option) => {
        if (option.value === '') {
          return { ...option, count: totalCount };
        }
        
        const days = option.days;
        const countFilter = { ...baseFilter };
        
        if (days !== null) {
          if (option.value === '90') {
            countFilter.deliveryTime = { $gte: days };
          } else {
            countFilter.deliveryTime = days;
          }
        }
        
        const count = await Model.countDocuments(countFilter);
        return { ...option, count };
      });
      
      filterOptions.deliveryTime = await Promise.all(deliveryCountPromises);
    }
    
    // Get category distribution
    if (totalCount > 0) {
      const categoryField = searchType === 'services' ? 'category' : 'projectCategory';
      
      const categoryStats = await Model.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: `$${categoryField}`,
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      if (categoryStats.length > 0) {
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
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: filterOptions,
      meta: {
        query: finalQuery,
        type: searchType,
        totalResults: totalCount,
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

// Search statistics endpoint
router.get('/stats', async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Get total counts
    const [totalServices, totalGigs, totalCategories] = await Promise.all([
      Service.countDocuments({ status: 'active', isActive: true, deletedAt: null }),
      Gig.countDocuments({ status: 'open', isActive: true, deletedAt: null, visibility: 'public' }),
      Category.countDocuments({ isActive: true, deletedAt: null, isSubcategory: false })
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
    
    // Get top categories
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
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
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