const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Service = require('../models/services.model');
const Gig = require('../models/gig.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');

// Helper function to clean query parameters
const cleanParams = (params) => {
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    let value = params[key];
    
    // Skip null, undefined, empty strings, and the string "null"
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return;
    }
    
    // Decode URI components
    if (typeof value === 'string') {
      try {
        value = decodeURIComponent(value);
      } catch (e) {
        // If decoding fails, use the original value
      }
    }
    
    // Convert to proper types
    if (value === 'true') cleaned[key] = true;
    else if (value === 'false') cleaned[key] = false;
    else if (!isNaN(value) && value !== '') cleaned[key] = parseFloat(value);
    else cleaned[key] = value;
  });
  
  return cleaned;
};

// Helper to validate ObjectId
const isValidObjectId = (id) => {
  return id && id.match(/^[0-9a-fA-F]{24}$/);
};

// Helper to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Fiverr-style search endpoint
router.get('/search', async (req, res) => {
  try {
    const rawParams = req.query;
    
    // Clean all parameters
    const params = cleanParams(rawParams);
    
    const { 
      query,
      type = 'services',
      page = 1,
      limit = 48,
      min_price: minPrice,
      max_price: maxPrice,
      delivery_time: deliveryTime,
      sort = 'relevance',
      category_id: categoryId,
      subcategory_id: subcategoryId,
      seller_details: sellerDetails,
      budget,
      search_in = 'everywhere',
      source = 'top-bar'
    } = params;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit) || 48, 100);
    const skip = (pageNum - 1) * limitNum;
    
    // Clean and prepare search query
    const sanitizedQuery = query.trim();
    const escapedQuery = escapeRegex(sanitizedQuery);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    // Main search logic
    let searchFilter = {};
    let searchModel = Service;
    let populateFields = ['createdBy', 'category', 'subcategory'];
    
    // Determine what to search based on type
    if (type === 'services') {
      searchModel = Service;
      
      // Build search filter for services
      searchFilter = {
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { shortDescription: { $regex: searchRegex } },
          { tags: { $regex: searchRegex } },
          { searchKeywords: { $regex: searchRegex } }
        ],
        status: 'active',
        isActive: true,
        deletedAt: null
      };
      
    } else if (type === 'gigs') {
      searchModel = Gig;
      
      // Build search filter for gigs
      searchFilter = {
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { skillsRequired: { $regex: searchRegex } },
          { deliverables: { $regex: searchRegex } }
        ],
        status: 'open',
        isActive: true,
        deletedAt: null,
        visibility: 'public'
      };
      populateFields = ['createdBy', 'projectCategory', 'assignedUser'];
    }
    
    // Apply category filter - only if valid ObjectId
    if (categoryId && isValidObjectId(categoryId)) {
      if (type === 'services') {
        searchFilter.category = new mongoose.Types.ObjectId(categoryId);
      } else if (type === 'gigs') {
        searchFilter.projectCategory = new mongoose.Types.ObjectId(categoryId);
      }
    }
    
    // Apply subcategory filter - only if valid ObjectId
    if (subcategoryId && isValidObjectId(subcategoryId)) {
      searchFilter.subcategory = new mongoose.Types.ObjectId(subcategoryId);
    }
    
    // Apply seller details filter - only if valid ObjectId
    if (sellerDetails && isValidObjectId(sellerDetails)) {
      searchFilter.createdBy = new mongoose.Types.ObjectId(sellerDetails);
    }
    
    // Apply price/budget filter
    if (minPrice || maxPrice) {
      const priceField = type === 'services' ? 'price' : 'budget';
      searchFilter[priceField] = {};
      if (minPrice) searchFilter[priceField].$gte = parseFloat(minPrice);
      if (maxPrice) searchFilter[priceField].$lte = parseFloat(maxPrice);
    }
    
    // Apply budget filter specifically
    if (budget && typeof budget === 'string') {
      const budgets = budget.split('-');
      if (budgets.length === 2) {
        const priceField = type === 'services' ? 'price' : 'budget';
        const min = parseFloat(budgets[0]);
        const max = parseFloat(budgets[1]);
        if (!isNaN(min) && !isNaN(max)) {
          searchFilter[priceField] = {
            $gte: min,
            $lte: max
          };
        }
      }
    }
    
    // Apply delivery time filter
    if (deliveryTime && typeof deliveryTime === 'string') {
      const deliveryTimes = deliveryTime.split('-');
      if (deliveryTimes.length === 2) {
        const min = parseInt(deliveryTimes[0]);
        const max = parseInt(deliveryTimes[1]);
        if (!isNaN(min) && !isNaN(max)) {
          searchFilter.deliveryTime = {
            $gte: min,
            $lte: max
          };
        }
      } else if (!isNaN(deliveryTime)) {
        searchFilter.deliveryTime = parseInt(deliveryTime);
      }
    }
    
    // Log the filter for debugging
    console.log('Search query:', sanitizedQuery);
    console.log('Search filter simplified:', {
      query: sanitizedQuery,
      type,
      hasCategoryFilter: !!categoryId,
      hasPriceFilter: !!(minPrice || maxPrice),
      totalConditions: searchFilter.$or ? searchFilter.$or.length : 0
    });
    
    // Get total count
    let totalCount;
    try {
      totalCount = await searchModel.countDocuments(searchFilter);
      console.log('Total count found:', totalCount);
    } catch (countError) {
      console.error('Error counting documents:', countError);
      // If count fails, try a simplified filter
      const simpleFilter = { 
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ],
        status: type === 'services' ? 'active' : 'open',
        isActive: true,
        deletedAt: null 
      };
      totalCount = await searchModel.countDocuments(simpleFilter);
    }
    
    // Get sort options
    const sortOptions = getSortOptions(sort, type, sanitizedQuery);
    
    // Get results with pagination
    let results;
    try {
      const query = searchModel.find(searchFilter)
        .select(`
          title 
          slug 
          description 
          shortDescription
          thumbnail 
          images 
          price 
          budget 
          rating 
          reviewsCount 
          deliveryTime 
          deliveryTimeUnit 
          isFeatured 
          isRecommended 
          isPopular 
          tags 
          createdAt 
          updatedAt 
          ${type === 'services' ? 'category subcategory' : 'projectCategory'}
          createdBy
        `);
      
      // Apply population
      if (populateFields.includes('createdBy')) {
        query.populate({
          path: 'createdBy',
          select: 'name username picture rating completedOrders accountType isTopRated level',
          match: { isActive: true }
        });
      }
      
      if (populateFields.includes('category')) {
        query.populate({
          path: 'category',
          select: 'name slug',
          match: { isActive: true }
        });
      }
      
      if (populateFields.includes('projectCategory')) {
        query.populate({
          path: 'projectCategory',
          select: 'name slug',
          match: { isActive: true }
        });
      }
      
      // Apply sorting
      if (sortOptions) {
        query.sort(sortOptions);
      }
      
      // Apply pagination
      query.skip(skip).limit(limitNum);
      
      results = await query.lean();
      console.log('Results found:', results.length);
      
    } catch (findError) {
      console.error('Error finding documents:', findError);
      // Fallback to simple search
      const simpleFilter = { 
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ],
        status: type === 'services' ? 'active' : 'open',
        isActive: true,
        deletedAt: null 
      };
      
      results = await searchModel.find(simpleFilter)
        .select('title slug description thumbnail price rating reviewsCount deliveryTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
    }
    
    // Format results in Fiverr-style
    const formattedResults = results.map((item) => {
      let seller = null;
      
      // Handle seller population
      if (item.createdBy) {
        if (typeof item.createdBy === 'object' && item.createdBy._id) {
          seller = item.createdBy;
        } else if (typeof item.createdBy === 'string') {
          seller = {
            _id: item.createdBy,
            name: 'Anonymous',
            rating: 0,
            completedOrders: 0
          };
        }
      }
      
      // Ensure seller object exists
      const sellerObj = seller || {
        name: 'Anonymous',
        rating: 0,
        completedOrders: 0,
        isTopRated: false,
        isPro: false,
        level: 'Level 1'
      };
      
      // Get thumbnail or default
      let thumbnail = item.thumbnail || (item.images && item.images[0]);
      if (!thumbnail || !thumbnail.startsWith('http')) {
        // Default service images based on category
        const defaultImages = {
          'web': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
          'design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
          'marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
          'writing': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
          'default': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'
        };
        
        const queryLower = sanitizedQuery.toLowerCase();
        if (queryLower.includes('web') || queryLower.includes('development')) {
          thumbnail = defaultImages.web;
        } else if (queryLower.includes('design')) {
          thumbnail = defaultImages.design;
        } else if (queryLower.includes('market') || queryLower.includes('seo')) {
          thumbnail = defaultImages.marketing;
        } else if (queryLower.includes('write') || queryLower.includes('content')) {
          thumbnail = defaultImages.writing;
        } else {
          thumbnail = defaultImages.default;
        }
      }
      const cleanTitle = item.title.replace(/\s*\(\d+\)\s*$/, '').replace(/\s*\d+\s*$/, '').trim();
      return {
        _id: item._id,
        type: type,
        title: cleanTitle,
        slug: item.slug || item._id.toString(),
        description: item.shortDescription || (item.description ? (item.description.substring(0, 150) + '...') : 'No description available'),
        price: item.price || item.budget || 0,
        currency: item.currency || 'USD',
        rating: item.rating || 0,
        reviewsCount: item.reviewsCount || 0,
        deliveryTime: item.deliveryTime || 3,
        deliveryTimeUnit: item.deliveryTimeUnit || 'days',
        isFeatured: item.isFeatured || false,
        isRecommended: item.isRecommended || false,
        isPopular: item.isPopular || false,
        thumbnail: thumbnail,
        seller: {
          _id: sellerObj._id,
          name: sellerObj.name || 'Anonymous',
          username: sellerObj.username,
          picture: sellerObj.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerObj.name || 'Anonymous')}&background=random`,
          rating: sellerObj.rating || 0,
          completedOrders: sellerObj.completedOrders || 0,
          isTopRated: sellerObj.isTopRated || false,
          isPro: sellerObj.accountType === 'pro',
          level: sellerObj.level || 'Level 1'
        },
        category: type === 'services' ? item.category : item.projectCategory,
        tags: item.tags || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });
    
    // Get top freelancers/sellers for the search query
    const topFreelancers = await getTopFreelancersForQuery(sanitizedQuery, 6);
    
    // Get related categories
    const relatedCategories = await getRelatedCategories(sanitizedQuery, 5);
    
    // Get search suggestions
    const searchSuggestions = await getSearchSuggestions(sanitizedQuery, 10);
    
    res.json({
      success: true,
      data: {
        results: formattedResults,
        totalCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrev: pageNum > 1
        },
        meta: {
          query: sanitizedQuery,
          type,
          source,
          search_in,
          totalResults: totalCount,
          showing: `${skip + 1}-${Math.min(skip + limitNum, totalCount)} of ${totalCount}`
        },
        topFreelancers,
        relatedCategories,
        searchSuggestions
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Search suggestions endpoint
router.get('/suggestions', async (req, res) => {
  try {
    const rawParams = req.query;
    const params = cleanParams(rawParams);
    
    const { 
      query,
      type = 'services',
      search_autocomplete_type = 'recent-gigs-suggest',
      limit = 10
    } = params;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }
    
    const sanitizedQuery = query.trim();
    const escapedQuery = escapeRegex(sanitizedQuery);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    let suggestions = [];
    
    // Get service/gig suggestions
    const serviceSuggestions = await Service.find({
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } },
        { searchKeywords: { $regex: searchRegex } }
      ],
      status: 'active',
      isActive: true
    })
    .select('title slug price rating reviewsCount shortDescription')
    .sort({ rating: -1, reviewsCount: -1 })
    .limit(parseInt(limit))
    .lean();
    
    suggestions.push(...serviceSuggestions.map(item => ({
      type: 'service',
      title: item.title.replace(/\s*\(\d+\)\s*$/, '').replace(/\s*\d+\s*$/, '').trim(),
      slug: item.slug,
      price: item.price,
      rating: item.rating,
      reviewsCount: item.reviewsCount,
      description: item.shortDescription || 'Service description'
    })));
    
    // Get category suggestions
    const categorySuggestions = await Category.find({
      $or: [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ],
      isActive: true
    })
    .select('name slug icon description')
    .limit(5)
    .lean();
    
    suggestions.push(...categorySuggestions.map(item => ({
      type: 'category',
      title: item.name,
      slug: item.slug,
      icon: item.icon,
      description: item.description
    })));
    
    res.json({
      success: true,
      suggestions: suggestions.slice(0, parseInt(limit))
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({
      success: true,
      suggestions: []
    });
  }
});

// Helper functions
const getTopFreelancersForQuery = async (query, limit = 6) => {
  try {
    const escapedQuery = escapeRegex(query);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    const freelancers = await User.find({
      $or: [
        { name: { $regex: searchRegex } },
        { skills: { $regex: searchRegex } },
        { bio: { $regex: searchRegex } }
      ],
      isActive: true,
      role: 'user'
    })
    .select(`
      name 
      username 
      picture 
      bio 
      rating 
      completedOrders 
      accountType 
      isTopRated 
      level 
      skills
      responseRate
      responseTime
    `)
    .sort({ 
      isTopRated: -1,
      rating: -1, 
      completedOrders: -1
    })
    .limit(limit)
    .lean();
    
    return freelancers.map(freelancer => ({
      _id: freelancer._id,
      name: freelancer.name,
      username: freelancer.username,
      picture: freelancer.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(freelancer.name)}&background=random`,
      bio: freelancer.bio ? (freelancer.bio.substring(0, 100) + '...') : 'No bio available',
      rating: freelancer.rating || 0,
      completedOrders: freelancer.completedOrders || 0,
      isTopRated: freelancer.isTopRated || false,
      isPro: freelancer.accountType === 'pro',
      level: freelancer.level || 'Level 1',
      skills: freelancer.skills?.slice(0, 3) || [],
      responseRate: freelancer.responseRate || 0,
      responseTime: freelancer.responseTime || 0
    }));
    
  } catch (error) {
    console.error('Error getting top freelancers:', error);
    return [];
  }
};

const getRelatedCategories = async (query, limit = 5) => {
  try {
    const escapedQuery = escapeRegex(query);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    const categories = await Category.find({
      $or: [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } }
      ],
      isActive: true,
      deletedAt: null
    })
    .select('name slug icon description servicesCount gigsCount featured popular')
    .sort({ 
      featured: -1,
      popular: -1,
      servicesCount: -1 
    })
    .limit(limit)
    .lean();
    
    return categories;
    
  } catch (error) {
    console.error('Error getting related categories:', error);
    return [];
  }
};

const getSearchSuggestions = async (query, limit = 10) => {
  try {
    const escapedQuery = escapeRegex(query);
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    // Get from services
    const services = await Service.find({
      $or: [
        { title: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } }
      ],
      status: 'active',
      isActive: true
    })
    .select('title slug')
    .limit(limit)
    .lean();
    
    // Get from categories
    const categories = await Category.find({
      name: { $regex: searchRegex },
      isActive: true
    })
    .select('name slug')
    .limit(5)
    .lean();
    
    // Get from gigs
    const gigs = await Gig.find({
      $or: [
        { title: { $regex: searchRegex } },
        { skillsRequired: { $regex: searchRegex } }
      ],
      status: 'open',
      isActive: true
    })
    .select('title slug')
    .limit(5)
    .lean();
    
    const suggestions = [
      ...services.map(s => ({ text: s.title, type: 'service', slug: s.slug })),
      ...categories.map(c => ({ text: c.name, type: 'category', slug: c.slug })),
      ...gigs.map(g => ({ text: g.title, type: 'gig', slug: g.slug }))
    ];
    
    // Remove duplicates
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(item => [item.text.toLowerCase(), item])).values()
    );
    
    return uniqueSuggestions.slice(0, limit);
    
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
};

const getSortOptions = (sort, type, query = '') => {
  // For text search, we need to check if text index exists
  // If not, fall back to regex-based relevance
  
  switch(sort) {
    case 'relevance':
      // Try to use text search if available, otherwise use multiple criteria
      return { 
        isFeatured: -1,
        rating: -1,
        reviewsCount: -1,
        createdAt: -1 
      };
    case 'best_selling':
      return { 
        ordersCount: -1, 
        rating: -1, 
        reviewsCount: -1 
      };
    case 'newest':
      return { createdAt: -1 };
    case 'price_low':
      return type === 'services' ? { price: 1 } : { budget: 1 };
    case 'price_high':
      return type === 'services' ? { price: -1 } : { budget: -1 };
    case 'rating':
      return { rating: -1, reviewsCount: -1 };
    case 'delivery_time':
      return { deliveryTime: 1 };
    default:
      return { 
        isFeatured: -1,
        rating: -1,
        reviewsCount: -1,
        createdAt: -1 
      };
  }
};

module.exports = router;