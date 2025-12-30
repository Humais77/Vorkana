const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Service = require('../models/services.model.js');
const Category = require('../models/category.model.js');
const Subcategory = require('../models/subcategory.model.js');
const { sanitizeHtml } = require('../utils/sanitize.js');
const { 
  processUploadToCloudinary, 
  deleteCloudinaryImages,
  processProfilePictureUpload 
} = require('../middleware/upload.middleware.js');
const cache = require('../utils/cache.js'); // Import cache utility

const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Cache helper functions
const generateCacheKey = (prefix, params) => {
  const key = `${prefix}:${JSON.stringify(params)}`;
  return crypto.createHash('md5').update(key).digest('hex');
};

const invalidateServiceCache = async (serviceId) => {
  try {
    await cache.del(`service:*${serviceId}*`);
    await cache.del('services:*');
    await cache.del('service_stats:*');
    await cache.del('service_popular:*');
    await cache.del('service_similar:*');
    console.log(`Cache invalidated for service: ${serviceId}`);
  } catch (err) {
    console.warn('Error invalidating service cache:', err.message);
  }
};

const invalidateAllServiceCache = async () => {
  try {
    await cache.del('services:*');
    await cache.del('service_stats:*');
    await cache.del('service_popular:*');
    await cache.del('service_similar:*');
    console.log('All service cache invalidated');
  } catch (err) {
    console.warn('Error invalidating all service cache:', err.message);
  }
};

const sanitizeServiceInput = (data, files = {}) => {
  const sanitized = {};
  
  for (const key in data) {
    if (typeof data[key] === 'string') {
      // Try to parse JSON if it looks like JSON
      if (
        (key === 'tags' || key === 'features' || key === 'faqs' || key === 'searchKeywords' || key === 'packages' || key === 'requirements') &&
        (data[key].startsWith('[') || data[key].startsWith('{'))
      ) {
        try {
          const parsed = JSON.parse(data[key]);
          if (Array.isArray(parsed)) {
            sanitized[key] = parsed.map(item => {
              if (typeof item === 'string') {
                return sanitizeHtml(item, {
                  allowedTags: [],
                  allowedAttributes: {},
                  disallowedTagsMode: 'escape'
                }).trim();
              }
              return item;
            });
          } else {
            sanitized[key] = data[key];
          }
        } catch (e) {
          // If not valid JSON, treat as string
          sanitized[key] = sanitizeHtml(data[key], {
            allowedTags: [],
            allowedAttributes: {},
            disallowedTagsMode: 'escape'
          }).trim();
        }
      } else {
        sanitized[key] = sanitizeHtml(data[key], {
          allowedTags: [],
          allowedAttributes: {},
          disallowedTagsMode: 'escape'
        }).trim();
      }
    } else if (Array.isArray(data[key])) {
      // If it's already an array
      if (key === 'tags' || key === 'searchKeywords') {
        sanitized[key] = data[key].map(item => 
          sanitizeHtml(item.toString(), { 
            allowedTags: [], 
            allowedAttributes: {} 
          }).trim()
        );
      } else if (key === 'features') {
        sanitized[key] = data[key].map(feature => {
          if (typeof feature === 'string') {
            return { 
              title: sanitizeHtml(feature, { allowedTags: [], allowedAttributes: {} }).trim(),
              description: '' 
            };
          }
          return {
            title: sanitizeHtml(feature.title || '', { allowedTags: [], allowedAttributes: {} }).trim(),
            description: sanitizeHtml(feature.description || '', { allowedTags: [], allowedAttributes: {} }).trim()
          };
        });
      } else if (key === 'faqs') {
        sanitized[key] = data[key].map(faq => {
          if (typeof faq === 'string') {
            return { 
              question: sanitizeHtml(faq, { allowedTags: [], allowedAttributes: {} }).trim(),
              answer: '' 
            };
          }
          return {
            question: sanitizeHtml(faq.question || '', { allowedTags: [], allowedAttributes: {} }).trim(),
            answer: sanitizeHtml(faq.answer || '', { allowedTags: [], allowedAttributes: {} }).trim()
          };
        });
      } else if (key === 'requirements') {
        sanitized[key] = data[key].map(req => {
          if (typeof req === 'string') {
            return { 
              question: sanitizeHtml(req, { allowedTags: [], allowedAttributes: {} }).trim(),
              options: [] 
            };
          }
          return {
            question: sanitizeHtml(req.question || '', { allowedTags: [], allowedAttributes: {} }).trim(),
            options: req.options ? req.options.map(opt => 
              sanitizeHtml(opt.toString(), { allowedTags: [], allowedAttributes: {} }).trim()
            ) : []
          };
        });
      } else if (key === 'packages') {
        sanitized[key] = data[key].map(pkg => {
          if (typeof pkg === 'string') {
            try {
              const parsed = JSON.parse(pkg);
              return {
                name: sanitizeHtml(parsed.name || '', { allowedTags: [], allowedAttributes: {} }).trim(),
                description: sanitizeHtml(parsed.description || '', { allowedTags: [], allowedAttributes: {} }).trim(),
                price: parsed.price || 0,
                deliveryTime: parsed.deliveryTime || 0,
                features: (parsed.features || []).map(f => 
                  sanitizeHtml(f.toString(), { allowedTags: [], allowedAttributes: {} }).trim()
                )
              };
            } catch (e) {
              return {
                name: sanitizeHtml(pkg, { allowedTags: [], allowedAttributes: {} }).trim(),
                description: '',
                price: 0,
                deliveryTime: 0,
                features: []
              };
            }
          }
          return {
            name: sanitizeHtml(pkg.name || '', { allowedTags: [], allowedAttributes: {} }).trim(),
            description: sanitizeHtml(pkg.description || '', { allowedTags: [], allowedAttributes: {} }).trim(),
            price: pkg.price || 0,
            deliveryTime: pkg.deliveryTime || 0,
            features: pkg.features ? pkg.features.map(f => 
              sanitizeHtml(f.toString(), { allowedTags: [], allowedAttributes: {} }).trim()
            ) : []
          };
        });
      } else if (typeof data[key][0] === 'string') {
        sanitized[key] = data[key].map(item => 
          sanitizeHtml(item.toString(), { 
            allowedTags: [], 
            allowedAttributes: {} 
          }).trim()
        );
      } else {
        sanitized[key] = data[key];
      }
    } else {
      sanitized[key] = data[key];
    }
  }
  
  // Handle files if present
  if (files && Array.isArray(files)) {
    const imageUrls = files.map(file => {
      const safePath = file.path.replace(/\\/g, '/');
      const relativePath = `/uploads/${path.basename(safePath)}`;
      
      const absolutePath = path.join(__dirname, '../../public', relativePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Uploaded file not found: ${relativePath}`);
      }
      
      const normalizedAbsolute = path.normalize(absolutePath);
      const uploadsDir = path.join(__dirname, '../../public/uploads');
      if (!normalizedAbsolute.startsWith(uploadsDir)) {
        throw new Error(`File path traversal detected: ${relativePath}`);
      }
      
      return relativePath;
    });
    
    if (imageUrls.length > 0) {
      sanitized.images = imageUrls;
      
      if (!sanitized.thumbnail && imageUrls.length > 0) {
        sanitized.thumbnail = imageUrls[0];
      }
    }
  }
  
  return sanitized;
};

const cleanupUploadedFiles = async (files, uploadedImagePaths = []) => {
  try {
    if (!files || !Array.isArray(files)) return;
    
    for (const file of files) {
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

const buildSecureServiceQuery = (queryParams, userRole, userId) => {
  const {
    search,
    title,
    slug,
    category,
    subcategory,
    createdBy,
    minPrice,
    maxPrice,
    minRating,
    maxRating,
    minDeliveryTime,
    maxDeliveryTime,
    deliveryTimeUnit,
    currency,
    status,
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
  } else if (userRole === 'user' && userId) {
    // Users can see their own services and active public services
    filter.$or = [
      { createdBy: userId },
      { 
        status: 'active',
        isActive: true 
      }
    ];
  } else {
    // Non-authenticated users can only see active services
    filter.status = 'active';
    filter.isActive = true;
  }

  // Search with sanitization
  if (search) {
  const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} }).trim();
  if (sanitizedSearch.length >= 2) {
    filter.$text = { $search: sanitizedSearch };
  }
}

  if (title) filter.title = { $regex: `^${sanitizeHtml(title, { allowedTags: [] })}`, $options: 'i' };
  if (slug) filter.slug = sanitizeHtml(slug, { allowedTags: [] });
  
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = category;
  }
  
  if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
    filter.subcategory = subcategory;
  }
  
  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
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

const logAudit = (action, resource, resourceId, userId, details = {}) => {
  console.log(`[AUDIT:SERVICE] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};
const parseFormDataArrays = (bodyData, arrayFields) => {
  const parsed = {};
  
  for (const key in bodyData) {
    if (arrayFields.includes(key)) {
      // Handle arrays sent as FormData
      if (typeof bodyData[key] === 'string') {
        try {
          parsed[key] = JSON.parse(bodyData[key]);
        } catch (e) {
          // If it's a comma-separated string
          if (bodyData[key].includes(',')) {
            parsed[key] = bodyData[key].split(',').map(item => item.trim()).filter(item => item);
          } else {
            parsed[key] = [bodyData[key]];
          }
        }
      } else if (Array.isArray(bodyData[key])) {
        parsed[key] = bodyData[key];
      } else {
        parsed[key] = [];
      }
    } else {
      parsed[key] = bodyData[key];
    }
  }
  
  return parsed;
};
// Create Service
const createService = async (req, res, next) => {
  const requestId = generateRequestId();
  let serviceData;
  
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }
let bodyData = req.body;
    if (typeof req.body === 'string') {
      try {
        bodyData = JSON.parse(req.body);
      } catch (e) {
        bodyData = req.body;
      }
    }
    
    // Check if data is nested in a 'data' field (common with FormData)
    if (bodyData.data && typeof bodyData.data === 'string') {
      try {
        bodyData = JSON.parse(bodyData.data);
      } catch (e) {
        // Keep as is
      }
    }
   const arrayFields = ['tags', 'features', 'faqs', 'searchKeywords', 'packages', 'requirements'];
let sanitizedData = req.body;

// Check if it's FormData (multipart)
if (req.headers['content-type']?.includes('multipart/form-data')) {
  sanitizedData = parseFormDataArrays(req.body, arrayFields);
}

// Then sanitize
sanitizedData = sanitizeServiceInput(sanitizedData);

// Ensure all array fields exist as arrays
arrayFields.forEach(field => {
  if (!Array.isArray(sanitizedData[field])) {
    sanitizedData[field] = [];
  }
});
    // Verify category is provided
    if (!sanitizedData.category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
        code: 'CATEGORY_REQUIRED',
        requestId
      });
    }

    // Verify subcategory is provided
    if (!sanitizedData.subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is required',
        code: 'SUBCATEGORY_REQUIRED',
        requestId
      });
    }

    // Verify short description is provided
    if (!sanitizedData.shortDescription || sanitizedData.shortDescription.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Short description is required and must be at least 20 characters',
        code: 'SHORT_DESCRIPTION_REQUIRED',
        requestId
      });
    }

    // Verify category
    const category = await Category.findOne({ 
      _id: sanitizedData.category, 
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

    // Verify subcategory belongs to category
    const subcategory = await Subcategory.findOne({ 
  _id: sanitizedData.subcategory, 
  isActive: true,
  category: sanitizedData.category 
});
    if (!subcategory) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory not found or does not belong to the selected category',
        code: 'SUBCATEGORY_NOT_FOUND',
        requestId
      });
    }

    // Create service data
    serviceData = {
      ...sanitizedData,
      createdBy: req.user._id,
      version: 1,
      images: [],
      thumbnail: null,
      // Ensure short description is trimmed
      shortDescription: sanitizedData.shortDescription.trim()
    };
    
    // Handle uploaded files
    const uploadedFiles = [];
    const uploadedThumbnail = [];
    
    // Check for thumbnail
    if (req.files && req.files.thumbnail) {
      uploadedThumbnail.push(...req.files.thumbnail);
    } else if (req.body.thumbnail) {
      // If thumbnail comes as a string URL (from client-side upload)
      serviceData.thumbnail = {
        url: req.body.thumbnail,
        public_id: `thumbnail-${Date.now()}`,
        uploadedAt: new Date()
      };
    } else {
      // Thumbnail is now required
      return res.status(400).json({
        success: false,
        message: 'Thumbnail is required',
        code: 'THUMBNAIL_REQUIRED',
        requestId
      });
    }
    
    // Check for other images
    if (req.files && req.files.images) {
      uploadedFiles.push(...req.files.images);
    }

    // Upload thumbnail first
    if (uploadedThumbnail.length > 0) {
      const thumbnailUpload = await processUploadToCloudinary(uploadedThumbnail, 'services/thumbnails', {
        transformation: [
          { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
          { quality: 'auto:best', fetch_format: 'auto' }
        ]
      });
      
      if (thumbnailUpload.length > 0) {
        serviceData.thumbnail = {
          url: thumbnailUpload[0].url,
          public_id: thumbnailUpload[0].public_id,
          width: thumbnailUpload[0].width,
          height: thumbnailUpload[0].height,
          size: thumbnailUpload[0].size,
          format: thumbnailUpload[0].format,
          uploadedAt: new Date()
        };
        
        // Add thumbnail to images array
        serviceData.images.push(thumbnailUpload[0]);
      }
    }
    if (!serviceData.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail is required. Please upload a thumbnail image.',
        code: 'THUMBNAIL_MISSING',
        requestId
      });
    }
    
    // Upload other images
    if (uploadedFiles.length > 0) {
      const uploadedImages = await processUploadToCloudinary(uploadedFiles, 'services');
      
      if (uploadedImages.length > 0) {
        // Add images to array, avoiding duplicates
        uploadedImages.forEach(image => {
          const exists = serviceData.images.some(img => img.public_id === image.public_id);
          if (!exists) {
            serviceData.images.push(image);
          }
        });
        
        // Set thumbnail if not already set
        if (!serviceData.thumbnail && uploadedImages.length > 0) {
          serviceData.thumbnail = {
            url: uploadedImages[0].url,
            public_id: uploadedImages[0].public_id,
            width: uploadedImages[0].width,
            height: uploadedImages[0].height,
            size: uploadedImages[0].size,
            format: uploadedImages[0].format,
            uploadedAt: new Date()
          };
        }
      }
    }

    // Validate we don't exceed image limit
    if (serviceData.images.length > 10) {
      // Delete uploaded images
      await deleteCloudinaryImages(serviceData.images);
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 images allowed',
        code: 'MAX_IMAGES_EXCEEDED',
        requestId
      });
    }

    const service = await Service.create(serviceData);

    // Invalidate cache after creating new service
    await invalidateAllServiceCache();

    // Security: Audit log
    logAudit('CREATE', 'SERVICE', service._id, req.user._id, {
      title: service.title,
      category: service.category,
      status: service.status,
      imagesCount: service.images.length,
      hasThumbnail: !!service.thumbnail
    });

    // Remove sensitive data
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
    console.error('Create service error:', error);
    
    // Clean up any uploaded images on error
    if (serviceData?.images?.length > 0) {
      await deleteCloudinaryImages(serviceData.images);
    }
    
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

// Get Services
// Get Services - OPTIMIZED VERSION
const getServices = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      search,
      q,
      title,
      slug,
      category,
      subcategory,
      createdBy,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      minDeliveryTime,
      maxDeliveryTime,
      deliveryTimeUnit,
      currency,
      status,
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
      includeCreator = true,
      includeCategory = true,
      includeReviews = false,
      includeStats = false,
      lean = true,
      cache: useCacheParam = 'false',
      // NEW: Performance optimization parameters
      optimize = 'true', // Enable performance optimizations
      batchSize = 10, // Number of services to process at once
      projection = 'basic' // 'basic', 'detailed', or 'minimal'
    } = req.query;

    const showAllFlag = (showAll || includeInactive) && req.user?.role === 'admin';
    const isUserView = req.user?.role === 'user' || req.user?.role === 'admin';
    const useCache = useCacheParam === 'true';
    const shouldOptimize = optimize === 'true';

    // OPTIMIZATION: Use simpler filter for common cases
    const filter = buildSecureServiceQuery({
      search: search || q,
      title,
      slug,
      category,
      subcategory,
      createdBy: isUserView ? req.user._id : createdBy,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      minDeliveryTime,
      maxDeliveryTime,
      deliveryTimeUnit,
      currency,
      status: showAllFlag ? status : undefined,
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

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    // OPTIMIZATION: Pre-calculate sort options
    const sortMapping = {
      'price': 'price',
      'rating': 'rating',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt',
      'deliveryTime': 'deliveryTime',
      'ordersCount': 'ordersCount',
      'views': 'views',
      'likes': 'likes',
      'popular': 'rating', // Map popular to rating for better UX
      'featured': 'isFeatured',
      'recommended': 'isRecommended'
    };

    const sortField = sortMapping[sort] || 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // OPTIMIZATION: Select only needed fields based on projection
    let select = {};
    if (fields) {
      const fieldArray = fields.split(',').map(f => f.trim());
      fieldArray.forEach(field => {
        if (field !== '__v' && field !== 'lastUpdatedBy') {
          select[field] = 1;
        }
      });
    } else {
      // Default projection optimization
      if (projection === 'minimal') {
        select = {
          _id: 1,
          title: 1,
          slug: 1,
          price: 1,
          currency: 1,
          rating: 1,
          deliveryTime: 1,
          thumbnail: 1,
          status: 1,
          isActive: 1
        };
      } else if (projection === 'basic') {
        select = {
          _id: 1,
          title: 1,
          slug: 1,
          shortDescription: 1,
          price: 1,
          currency: 1,
          rating: 1,
          reviewsCount: 1,
          deliveryTime: 1,
          deliveryTimeUnit: 1,
          revisions: 1,
          views: 1,
          likes: 1,
          thumbnail: 1,
          images: 1,
          status: 1,
          isActive: 1,
          isFeatured: 1,
          isPopular: 1,
          isRecommended: 1,
          category: 1,
          subcategory: 1,
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1
        };
      } else {
        // 'detailed' - include all fields except metadata
        select = {
          __v: 0,
          lastUpdatedBy: 0,
          version: 0,
          deletedAt: 0,
          deletedBy: 0
        };
      }
    }

    // OPTIMIZATION: Smart population based on needs
    let populateOptions = [];
    if (populate === 'true' && populate !== 'false') {
      const populateArray = populateFields.split(',').map(f => f.trim());
      
      if (includeCategory) {
        populateOptions.push({
          path: 'category',
          select: 'name slug icon',
          match: { isActive: true }
        });
        
        if (subcategory) {
          populateOptions.push({
            path: 'subcategory',
            select: 'name slug',
            match: { isActive: true }
          });
        }
      }
      
      if (includeCreator) {
        populateOptions.push({
          path: 'createdBy',
          select: 'name picture', // Only get name and picture
          match: { isActive: true }
        });
      }
    }

    // OPTIMIZATION: Create cache key
    const cacheKey = generateCacheKey('services', {
      filter: JSON.stringify(filter), // Stringify for consistent key
      page: pageNum,
      limit: limitNum,
      sort: sortField,
      order: sortOrder,
      populate: populate === 'true',
      projection,
      userRole: req.user?.role,
      userId: req.user?._id
    });

    let services, total, cachedStats;

    // OPTIMIZATION: Use cache for first 3 pages only
    if (useCache && pageNum <= 3 && !search && !q) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        total = cached.total;
        cachedStats = cached.stats;
        console.log(`Cache hit for services: ${cacheKey} in ${Date.now() - startTime}ms`);
      }
    }

    if (!services || !total) {
      const queryOptions = {
        select,
        sort: sortObj,
        skip,
        limit: limitNum,
        populate: populateOptions.length > 0 ? populateOptions : null,
        lean: lean !== false,
        maxTimeMS: shouldOptimize ? 3000 : 5000, // Shorter timeout for optimized queries
        readPreference: 'secondaryPreferred' // Use secondary nodes for reads if available
      };

      // OPTIMIZATION: Parallel execution of queries
      try {
        [services, total] = await Promise.all([
          Service.find(filter, null, queryOptions),
          Service.countDocuments(filter).maxTimeMS(2000) // Faster count
        ]);

        console.log(`Database query completed in ${Date.now() - startTime}ms, found ${services.length} services`);
      } catch (queryError) {
        // Fallback: Execute sequentially if parallel fails
        console.warn('Parallel query failed, falling back to sequential:', queryError.message);
        services = await Service.find(filter, null, queryOptions);
        total = await Service.countDocuments(filter);
      }

      // Cache the result if enabled (first 3 pages only)
      if (useCache && pageNum <= 3 && !search && !q) {
        await cache.set(cacheKey, { services, total, stats: cachedStats }, 180); // 3 minutes for listings
      }
    }

    // OPTIMIZATION: Process services in batches for large datasets
    const processServiceBatch = (batch) => {
      return batch.map(service => {
        const safeService = { ...service };
        
        if (safeService.createdBy && safeService.createdBy._id) {
          safeService.createdBy = {
            _id: safeService.createdBy._id,
            name: safeService.createdBy.name,
            picture: safeService.createdBy.picture
          };
        }
        
        // Only process description if needed
        if (projection !== 'minimal' && safeService.description && safeService.description.length > 200) {
          safeService.description = safeService.description.substring(0, 200) + '...';
        }
        
        return safeService;
      });
    };

    let safeServices;
    if (services.length > 50 && shouldOptimize) {
      // Process in batches for large datasets
      const batchSizeNum = parseInt(batchSize) || 10;
      safeServices = [];
      for (let i = 0; i < services.length; i += batchSizeNum) {
        const batch = services.slice(i, i + batchSizeNum);
        safeServices.push(...processServiceBatch(batch));
      }
    } else {
      safeServices = processServiceBatch(services);
    }

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    let stats = cachedStats || {};
    if (includeStats && !cachedStats) {
      // OPTIMIZATION: Only calculate stats if explicitly requested
      try {
        stats = await Service.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$price' },
              avgRating: { $avg: '$rating' },
              avgDeliveryTime: { $avg: '$deliveryTime' },
              totalViews: { $sum: '$views' },
              totalLikes: { $sum: '$likes' }
            }
          }
        ]).maxTimeMS(2000);
      } catch (statsError) {
        console.warn('Stats aggregation failed:', statsError.message);
        stats = [];
      }
    }

    const responseTime = Date.now() - startTime;
    
    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Response-Time': `${responseTime}ms`,
      'X-Cache': (useCache && pageNum <= 3 && !search && !q && services !== undefined) ? 'HIT' : 'MISS',
      'Cache-Control': useCache ? 'public, max-age=180' : 'no-cache, no-store, must-revalidate'
    });

    const response = {
  success: true,
  data: safeServices || [], // Always ensure array
  pagination: {
    page: pageNum,
    limit: limitNum,
    total: total || 0,
    totalPages: totalPages || 0,
    hasNext: hasNext || false,
    hasPrev: hasPrev || false,
    nextPage: hasNext ? pageNum + 1 : null,
    prevPage: hasPrev ? pageNum - 1 : null,
  },
  requestId,
  timestamp: new Date().toISOString(),
  responseTime: `${responseTime}ms`,
  cached: (useCache && pageNum <= 3 && !search && !q && services !== undefined)
};

    if (includeStats && stats.length > 0) {
      response.stats = stats[0];
    }

    // Log performance metrics
    if (responseTime > 500) {
      console.warn(`SLOW ENDPOINT: GET /api/services - ${responseTime}ms (Page: ${pageNum}, Limit: ${limitNum})`);
    }

    res.json(response);

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`GET /api/services ERROR after ${errorTime}ms:`, error.message);
    
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout - please try with fewer filters',
        code: 'QUERY_TIMEOUT',
        requestId,
        suggestion: 'Try using projection=minimal or reduce filter criteria'
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'GET_LIST', req.user?._id, { 
      error: error.message,
      responseTime: errorTime 
    });
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { 
      fields, 
      populate = 'true', 
      incrementView = 'true',
      cache: useCacheParam = 'true',
      // NEW: Performance parameters
      fast = 'false', // Fast mode with minimal data
      noImages = 'false', // Skip images for faster loading
      minimal = 'false' // Minimal data mode
    } = req.query;

    console.log(`[PERF] getServiceById called with id: ${id}`);
    
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Service identifier is required',
        code: 'MISSING_IDENTIFIER',
        requestId
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const useCache = useCacheParam === 'true';
    const isFastMode = fast === 'true';
    const skipImages = noImages === 'true';
    const isMinimal = minimal === 'true';

    // OPTIMIZATION: Generate cache key early
    const cacheKey = generateCacheKey('service_single', {
      id,
      isObjectId,
      fields,
      populate: populate === 'true',
      isFastMode,
      skipImages,
      isMinimal,
      userRole: req.user?.role
    });

    let service;
    
    // OPTIMIZATION: Try cache first (if enabled and not admin)
    if (useCache && req.user?.role !== 'admin') {
      service = await cache.get(cacheKey);
      if (service) {
        console.log(`[PERF] Cache HIT for service: ${cacheKey} (${Date.now() - startTime}ms)`);
        
        // Handle view increment in background (non-blocking)
        if (incrementView === 'true' && service.status === 'active') {
          incrementViewCountAsync(service._id).catch(console.error);
        }
        
        return sendServiceResponse(res, service, requestId, startTime, true);
      }
    }

    // Build optimized query
    let query;
    if (isObjectId) {
      query = { _id: id };
    } else {
      const sanitizedSlug = sanitizeHtml(id, { allowedTags: [] }).trim();
      query = { slug: sanitizedSlug.toLowerCase() };
    }

    // OPTIMIZATION: Simplified permission logic
    const permissionQuery = buildPermissionQuery(query, req.user);
    
    console.log(`[PERF] Query built in ${Date.now() - startTime}ms`);

    // OPTIMIZATION: Select only needed fields based on mode
    let select = getOptimizedSelect(fields, isFastMode, skipImages, isMinimal);
    
    // OPTIMIZATION: Smart population - only populate what's needed
    let populateOptions = [];
    if (populate === 'true' || populate === true) {
      populateOptions = getOptimizedPopulateOptions(isFastMode, isMinimal);
    }

    // OPTIMIZATION: Use lean for faster queries and less memory
    const queryStart = Date.now();
    service = await Service.findOne(permissionQuery)
      .select(select)
      .populate(populateOptions)
      .lean()
      .maxTimeMS(2000); // 2 second timeout for single document

    console.log(`[PERF] Database query completed in ${Date.now() - queryStart}ms`);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId,
        details: {
          identifier: id,
          isObjectId: isObjectId,
          identifierType: isObjectId ? 'ObjectId' : 'slug'
        }
      });
    }

    // OPTIMIZATION: Quick permission check (admin can see everything)
    if (req.user?.role !== 'admin') {
      if (service.status !== 'active') {
        if (req.user?.role !== 'user' || service.createdBy?._id?.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access to this service is restricted',
            code: 'ACCESS_DENIED',
            requestId
          });
        }
      }
    }

    // OPTIMIZATION: Async view increment (non-blocking)
    if (incrementView === 'true' && service.status === 'active') {
      incrementViewCountAsync(service._id).catch(console.error);
    }

    // OPTIMIZATION: Process service data
    const processedService = processServiceData(service, isFastMode, isMinimal, skipImages);
    
    // OPTIMIZATION: Cache for future requests (if not admin)
    if (useCache && req.user?.role !== 'admin') {
      const cacheTime = isFastMode ? 300 : 600; // 5-10 minutes
      await cache.set(cacheKey, processedService, cacheTime);
      console.log(`[PERF] Cached service: ${cacheKey}`);
    }

    const totalTime = Date.now() - startTime;
    if (totalTime > 200) {
      console.warn(`[SLOW] getServiceById took ${totalTime}ms for service ${id}`);
    }

    return sendServiceResponse(res, processedService, requestId, startTime, false);

  } catch (error) {
    console.error(`[ERROR] getServiceById error after ${Date.now() - startTime}ms:`, error);
    
    // Handle specific error types
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid service identifier format',
        code: 'INVALID_IDENTIFIER_FORMAT',
        requestId,
        details: {
          identifier: req.params.id,
          expected: 'Either MongoDB ObjectId or service slug'
        }
      });
    }
    
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Service lookup timeout',
        code: 'QUERY_TIMEOUT',
        requestId,
        suggestion: 'Try using fast=true parameter for quicker response'
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'GET_BY_ID', req.user?._id, { 
      id: req.params.id, 
      error: error.message,
      responseTime: Date.now() - startTime
    });
    
    next(error);
  }
};
const buildPermissionQuery = (query, user) => {
  if (user?.role === 'admin') {
    return query; // Admin can see everything
  }
  
  if (user?.role === 'user') {
    return {
      $or: [
        { ...query, createdBy: user._id },
        { 
          ...query, 
          status: 'active',
          isActive: true 
        }
      ]
    };
  }
  
  // Non-authenticated users
  return {
    ...query,
    status: 'active',
    isActive: true
  };
};

// Get optimized field selection
const getOptimizedSelect = (fields, isFastMode, skipImages, isMinimal) => {
  if (fields) {
    const fieldArray = fields.split(',').map(f => f.trim());
    const select = {};
    fieldArray.forEach(field => {
      if (field !== '__v' && field !== 'lastUpdatedBy') {
        select[field] = 1;
      }
    });
    return select;
  }
  
  // Pre-defined optimized selections
  if (isFastMode) {
    return {
      _id: 1,
      title: 1,
      slug: 1,
      shortDescription: 1,
      price: 1,
      currency: 1,
      rating: 1,
      deliveryTime: 1,
      deliveryTimeUnit: 1,
      revisions: 1,
      thumbnail: 1,
      status: 1,
      isActive: 1,
      category: 1,
      createdBy: 1,
      createdAt: 1
    };
  }
  
  if (isMinimal) {
    return {
      _id: 1,
      title: 1,
      slug: 1,
      price: 1,
      currency: 1,
      rating: 1,
      thumbnail: 1,
      status: 1
    };
  }
  
  // Default optimized selection
  const select = {
    __v: 0,
    lastUpdatedBy: 0,
    version: 0,
    deletedAt: 0,
    deletedBy: 0
  };
  
  if (skipImages) {
    select.images = 0;
  }
  
  return select;
};

// Get optimized populate options
const getOptimizedPopulateOptions = (isFastMode, isMinimal) => {
  if (isMinimal) {
    return []; // No population for minimal mode
  }
  
  if (isFastMode) {
    return [
      {
        path: 'category',
        select: 'name slug',
        match: { isActive: true }
      },
      {
        path: 'createdBy',
        select: 'name picture',
        match: { isActive: true }
      }
    ];
  }
  
  // Full populate (but optimized)
  return [
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
      path: 'createdBy',
      select: 'name picture role createdAt',
      match: { isActive: true }
    }
  ];
};

// Process service data efficiently
const processServiceData = (service, isFastMode, isMinimal, skipImages) => {
  const processed = { ...service };
  
  // OPTIMIZATION: Only process creator info if needed
  if (processed.createdBy && !isMinimal) {
    processed.createdBy = {
      _id: processed.createdBy._id,
      name: processed.createdBy.name,
      picture: processed.createdBy.picture
    };
    
    if (!isFastMode) {
      processed.createdBy.accountAge = Date.now() - new Date(processed.createdBy.createdAt).getTime();
    }
  }
  
  // OPTIMIZATION: Process packages only in full mode
  if (!isFastMode && !isMinimal && processed.packages && Array.isArray(processed.packages)) {
    processed.packages = processed.packages.map(pkg => ({
      ...pkg,
      deliveryText: `${pkg.deliveryTime} ${service.deliveryTimeUnit}`,
      priceText: `${service.currency} ${pkg.price}`
    }));
  }
  
  // OPTIMIZATION: Limit images if skipImages is true
  if (skipImages && processed.images && Array.isArray(processed.images)) {
    processed.images = processed.images.slice(0, 1); // Keep only first image
  }
  
  return processed;
};

// Send optimized response
const sendServiceResponse = (res, service, requestId, startTime, cached) => {
  const responseTime = Date.now() - startTime;
  
  res.set({
    'X-Request-ID': requestId,
    'X-Response-Time': `${responseTime}ms`,
    'X-Cache': cached ? 'HIT' : 'MISS',
    'Cache-Control': cached ? 'public, max-age=600' : 'no-cache, no-store, must-revalidate'
  });
  
  return res.json({
    success: true,
    service,
    requestId,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    cached
  });
};

// Async view increment (non-blocking)
const incrementViewCountAsync = async (serviceId) => {
  try {
    await Service.updateOne(
      { _id: serviceId },
      { $inc: { views: 1 } }
    ).maxTimeMS(1000); // Quick update
  } catch (error) {
    console.error('Failed to increment view count:', error.message);
  }
};
// Update Service
const updateService = async (req, res, next) => {
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
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const isOwner = service.createdBy.toString() === req.user._id.toString();
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

    if (req.files) {
      uploadedFiles = req.files;
    }
    
    const sanitizedData = sanitizeServiceInput(req.body, uploadedFiles);
    
    // Handle empty subcategory - set to null instead of empty string
    if (sanitizedData.subcategory === '') {
      sanitizedData.subcategory = null;
    }
    
    if (!isAdmin) {
      // Regular users cannot update certain fields
      delete sanitizedData.status;
      delete sanitizedData.isFeatured;
      delete sanitizedData.isRecommended;
      delete sanitizedData.isPopular;
      delete sanitizedData.views;
      delete sanitizedData.likes;
      delete sanitizedData.rating;
      delete sanitizedData.reviewsCount;
    }

    // Only validate subcategory if it's being changed and not null
    if (sanitizedData.subcategory && sanitizedData.subcategory !== (service.subcategory?.toString() || '')) {
      // Validate subcategory belongs to category
      const subcategory = await Subcategory.findOne({ 
  _id: sanitizedData.subcategory, 
  isActive: true,
  category: sanitizedData.category || service.category 
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

    // Handle category change validation
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

    const currentVersion = sanitizedData.version;
    delete sanitizedData.version;

    const updateData = {
      ...sanitizedData,
      lastUpdatedBy: req.user._id,
      $inc: { version: 1 }
    };

    if (sanitizedData.status && sanitizedData.status !== service.status) {
      if (sanitizedData.status === 'active' && !service.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

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
    ).populate('category', 'name slug').populate('createdBy', 'name picture');

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

    try {
      const removedImages = existingImages.filter(img => !newImages.includes(img));
      if (removedImages.length > 0) {
        deleteImageFiles(removedImages);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old images:', cleanupError);
    }

    // Invalidate cache after update
    await invalidateServiceCache(id);

    logAudit('UPDATE', 'SERVICE', updatedService._id, req.user._id, {
      updatedFields: Object.keys(sanitizedData),
      oldVersion: currentVersion || service.version,
      newVersion: updatedService.version,
      statusChanged: sanitizedData.status ? sanitizedData.status !== service.status : false,
      imagesUpdated: newImages.length > 0
    });

    const safeService = updatedService.toObject();
    delete safeService.__v;
    delete safeService.lastUpdatedBy;

    res.json({
      success: true,
      service: safeService,
      message: 'Service updated successfully',
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
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
    
    logAudit('ERROR', 'SERVICE', 'UPDATE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Delete Service
const deleteService = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    const { id } = req.params;
    const { permanent = 'false', force = 'false' } = req.query;

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

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      logAudit('UNAUTHORIZED_DELETE', 'SERVICE', id, req.user._id);
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    let result;
    
    if (permanent === 'true' && isAdmin) {
      // Permanent delete - bypass validation
      try {
        if (service.images && Array.isArray(service.images)) {
          deleteImageFiles(service.images);
        }
        
        if (service.thumbnail) {
          deleteImageFiles([service.thumbnail]);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up files during permanent delete:', cleanupError);
      }
      
      // Use deleteOne instead of findByIdAndDelete to avoid hooks
      await Service.deleteOne({ _id: id });
      
      logAudit('PERMANENT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        createdBy: service.createdBy,
        force: force === 'true',
        imagesCleaned: service.images?.length || 0
      });
      
      // Invalidate cache after permanent delete
      await invalidateServiceCache(id);
      
      return res.json({
        success: true,
        message: 'Service permanently deleted',
        requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Soft delete - update without validation
      const wasOpen = service.status === 'open';
      
      // Update using updateOne to bypass validation
      result = await Service.updateOne(
        { _id: id },
        { 
          $set: {
            isActive: false,
            status: 'suspended',
            deletedAt: new Date(),
            deletedBy: req.user._id,
            lastUpdatedBy: req.user._id
          }
        }
      );

      if (!result.modifiedCount) {
        return res.status(404).json({
          success: false,
          message: 'Service not found during deletion',
          code: 'DELETE_FAILED',
          requestId
        });
      }

      // Update category count if service was open
      if (wasOpen && service.category) {
        await Category.findByIdAndUpdate(service.category, {
          $inc: { servicesCount: -1 }
        });
      }

      // Invalidate cache after soft delete
      await invalidateServiceCache(id);

      logAudit('SOFT_DELETE', 'SERVICE', id, req.user._id, {
        title: service.title,
        createdBy: service.createdBy
      });
      
      return res.json({
        success: true,
        message: 'Service deactivated',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[DELETE SERVICE ERROR]', error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service due to validation constraints',
        code: 'VALIDATION_ERROR_ON_DELETE',
        details: Object.values(error.errors).map(err => err.message),
        requestId
      });
    }
    
    logAudit('ERROR', 'SERVICE', 'DELETE', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Restore Service
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

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only restore your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

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

    // Invalidate cache after restoration
    await invalidateServiceCache(id);

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

// Get Service Statistics
const getServiceStats = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for statistics',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const cacheKey = 'service_stats:admin';

    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for service stats: ${cacheKey}`);
      return res.json({
        success: true,
        stats: cached,
        requestId,
        timestamp: new Date().toISOString(),
        generatedAt: new Date(),
        cached: true
      });
    }

    const filter = {};

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
          topServices: [
            { $match: { status: 'active', isActive: true } },
            { $limit: 10 },
            {
              $project: {
                title: 1,
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
                }
              }
            }
          ]
        }
      }
    ]);

    const sanitizedStats = stats[0];
    
    // Cache stats for 10 minutes
    await cache.set(cacheKey, sanitizedStats, 600);
    
    res.json({
      success: true,
      stats: sanitizedStats,
      requestId,
      timestamp: new Date().toISOString(),
      generatedAt: new Date(),
      cached: false
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'STATS', req.user?._id, { error: error.message });
    next(error);
  }
};

// Bulk Operations
const bulkUpdateServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for bulk operations',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const { ids, operation, data } = req.body;

    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 50 items in bulk',
        code: 'BATCH_SIZE_EXCEEDED',
        requestId
      });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IDs found in request',
        code: 'INVALID_IDS',
        requestId
      });
    }

    let result;
    let updateData = {};
    const now = new Date();

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

    if (operation === 'update') {
      updateData.$inc = { version: 1 };
    }

    if (operation === 'activate') {
      updateData.publishedAt = now;
    }

    result = await Service.updateMany(
      { _id: { $in: validIds } },
      updateData,
      { 
        maxTimeMS: 10000,
        runValidators: operation === 'update'
      }
    );

    // Invalidate cache for all affected services
    await invalidateAllServiceCache();

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

// Export Services
const exportServices = async (req, res, next) => {
  const requestId = generateRequestId();
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
    
    const filter = buildSecureServiceQuery(
      queryParams, 
      req.user.role, 
      req.user._id
    );

    const count = await Service.countDocuments(filter);
    if (count > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Export limit exceeded (max 5,000 records',
        code: 'EXPORT_LIMIT_EXCEEDED',
        requestId
      });
    }

    const services = await Service.find(filter)
      .select('-__v -lastUpdatedBy')
      .populate('category', 'name slug')
      .populate('createdBy', 'name email')
      .lean();

    if (format === 'csv') {
      const headers = [
        'ID', 'Title', 'Slug', 'Description', 'Category', 'Creator',
        'Price', 'Currency', 'Delivery Time', 'Delivery Unit', 'Revisions',
        'Rating', 'Reviews Count',  'Views', 'Likes',
        'Status', 'Featured', 'Recommended', 'Popular',
        'Created At', 'Updated At', 'Published At'
      ];

      const csvRows = services.map(service => [
        service._id,
        `"${(service.title || '').replace(/"/g, '""')}"`,
        service.slug || '',
        `"${(service.description || '').replace(/"/g, '""')}"`,
        service.category?.name || '',
        service.createdBy?.name || '',
        service.price || 0,
        service.currency || 'USD',
        service.deliveryTime || 0,
        service.deliveryTimeUnit || 'days',
        service.revisions || 0,
        service.rating || 0,
        service.reviewsCount || 0,
        service.views || 0,
        service.likes || 0,
        service.status || '',
        service.isFeatured ? 'Yes' : 'No',
        service.isRecommended ? 'Yes' : 'No',
        service.isPopular ? 'Yes' : 'No',
        new Date(service.createdAt).toISOString(),
        new Date(service.updatedAt).toISOString(),
        service.publishedAt ? new Date(service.publishedAt).toISOString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="services_${Date.now()}.csv"`);
      res.header('X-Request-ID', requestId);
      res.header('X-Export-Records', count);
      res.header('X-Export-Timestamp', new Date().toISOString());
      
      return res.send(csvContent);
    }

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

// Update the searchServices function at the beginning:
const searchServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Accept both 'query' and 'q' parameters for better compatibility
    const { 
      query: searchQuery, 
      q, 
      category, 
      minPrice, 
      maxPrice, 
      sort = 'relevance', 
      limit = 20, 
      cache: useCacheParam = 'true' 
    } = req.query;

    // Use either 'query' or 'q' parameter
    const query = searchQuery || q;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(200).json({
        success: true,
        query: '',
        results: [],
        count: 0,
        requestId,
        timestamp: new Date().toISOString(),
        message: 'No search query provided'
      });
    }

    const sanitizedQuery = sanitizeHtml(query, { 
      allowedTags: [], 
      allowedAttributes: {} 
    }).trim();

    if (sanitizedQuery.length < 2) {
      return res.status(200).json({
        success: true,
        query: sanitizedQuery,
        results: [],
        count: 0,
        requestId,
        timestamp: new Date().toISOString(),
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchLimit = Math.min(parseInt(limit) || 20, 100);
    const useCache = useCacheParam === 'true';

    // Generate cache key
    const cacheKey = generateCacheKey('service_search', {
      query: sanitizedQuery,
      category,
      minPrice,
      maxPrice,
      sort,
      limit: searchLimit
    });

    // Try to get from cache
    let safeResults, relatedCategories;
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        safeResults = cached.results;
        relatedCategories = cached.relatedCategories;
        console.log(`Cache hit for search: ${cacheKey}`);
      }
    }

    if (!safeResults) {
      const filter = {
        $text: { $search: sanitizedQuery },
        status: 'active',
        isActive: true
      };

      // Add category filter if provided
      if (category && category !== 'All' && mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      }

      // Price range filter
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      // Sort options
      const sortOptions = {
        relevance: { score: { $meta: 'textScore' } },
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        rating: { rating: -1 },
        delivery: { deliveryTime: 1 },
        newest: { createdAt: -1 },
        orders: { ordersCount: -1 }
      };

      const sortObj = sortOptions[sort] || sortOptions.relevance;

      // Build query with text score
      const findQuery = Service.find(filter, { 
        score: { $meta: 'textScore' } 
      });

      // Apply text search only if we have search query
      if (sanitizedQuery.length > 0) {
        findQuery.select('+score');
      }

      const results = await findQuery
        .select('title slug shortDescription description price rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images createdBy category tags')
        .populate('createdBy', 'name picture')
        .populate('category', 'name slug icon')
        .sort(sortObj)
        .limit(searchLimit)
        .lean();

      // Format results
      safeResults = results.map(result => {
        const service = {
          _id: result._id,
          title: result.title,
          slug: result.slug,
          shortDescription: result.shortDescription || '',
          description: result.description ? result.description.substring(0, 150) + '...' : '',
          price: result.price,
          currency: result.currency || 'USD',
          rating: result.rating || 0,
          reviewsCount: result.reviewsCount || 0,
          deliveryTime: result.deliveryTime,
          deliveryTimeUnit: result.deliveryTimeUnit,
          revisions: result.revisions || 0,
          views: result.views || 0,
          likes: result.likes || 0,
          thumbnail: result.thumbnail,
          images: result.images || [],
          tags: result.tags || [],
          score: result.score || 0,
          createdBy: {
            _id: result.createdBy?._id,
            name: result.createdBy?.name || 'Unknown',
            picture: result.createdBy?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'
          },
          category: {
            _id: result.category?._id,
            name: result.category?.name || 'Uncategorized',
            slug: result.category?.slug,
            icon: result.category?.icon
          }
        };
        
        // Add computed fields
        service.hasImages = service.images && service.images.length > 0;
        service.priceFormatted = `${service.currency} ${service.price?.toFixed(2) || '0.00'}`;
        
        return service;
      });

      // Get related categories
      const categoryIds = [...new Set(safeResults.map(r => r.category?._id).filter(Boolean))];
      relatedCategories = await Category.find({ 
        _id: { $in: categoryIds },
        isActive: true 
      }).select('name slug icon servicesCount').lean();

      // Cache search results for 5 minutes
      if (useCache) {
        await cache.set(cacheKey, { results: safeResults, relatedCategories }, 300);
        console.log(`Cache set for search: ${cacheKey}`);
      }
    }

    res.json({
      success: true,
      query: sanitizedQuery,
      results: safeResults,
      relatedCategories,
      count: safeResults.length,
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && safeResults !== undefined
    });

  } catch (error) {
    console.error('[SEARCH SERVICES ERROR]', error);
    
    // Return empty results on error instead of 500
    res.status(200).json({
      success: true,
      query: req.query.query || req.query.q || '',
      results: [],
      count: 0,
      requestId,
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    
    logAudit('ERROR', 'SERVICE', 'SEARCH', req.user?._id, { 
      query: req.query.query,
      error: error.message 
    });
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
        
        // Invalidate cache for this service
        await invalidateServiceCache(id);
        
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
        
        // Invalidate cache for this service
        await invalidateServiceCache(id);
        
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
    const { limit = 8, cache: useCacheParam = 'true' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const useCache = useCacheParam === 'true';
    const similarLimit = Math.min(parseInt(limit) || 8, 20);

    // Generate cache key
    const cacheKey = generateCacheKey('service_similar', {
      serviceId: id,
      limit: similarLimit
    });

    // Try to get from cache
    let safeServices;
    if (useCache) {
      safeServices = await cache.get(cacheKey);
      if (safeServices) {
        console.log(`Cache hit for similar services: ${cacheKey}`);
        return res.json({
          success: true,
          services: safeServices,
          count: safeServices.length,
          requestId,
          timestamp: new Date().toISOString(),
          cached: true
        });
      }
    }

    const service = await Service.findById(id)
      .select('category tags title createdBy')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        code: 'SERVICE_NOT_FOUND',
        requestId
      });
    }

    const similarServices = await Service.find({
      _id: { $ne: id },
      category: service.category,
      status: 'active',
      isActive: true,
      ...(service.tags && service.tags.length > 0 ? {
        tags: { $in: service.tags.slice(0, 3) }
      } : {})
    })
    .select('title slug description price rating deliveryTime deliveryTimeUnit revisions  views thumbnail createdBy')
    .populate('createdBy', 'name picture')
    .sort({ rating: -1 })
    .limit(similarLimit)
    .lean();

    if (similarServices.length < similarLimit) {
      const additionalServices = await Service.find({
        _id: { $nin: [id, ...similarServices.map(s => s._id)] },
        category: service.category,
        status: 'active',
        isActive: true
      })
      .select('title slug description price rating deliveryTime deliveryTimeUnit revisions  views thumbnail createdBy')
      .populate('createdBy', 'name picture')
      .sort({ rating: -1,})
      .limit(similarLimit - similarServices.length)
      .lean();

      similarServices.push(...additionalServices);
    }

    safeServices = similarServices.map(s => ({
      _id: s._id,
      title: s.title,
      slug: s.slug,
      description: s.description ? s.description.substring(0, 100) + '...' : '',
      price: s.price,
      rating: s.rating || 0,
      deliveryTime: s.deliveryTime,
      deliveryTimeUnit: s.deliveryTimeUnit,
      revisions: s.revisions || 0,
      views: s.views || 0,
      thumbnail: s.thumbnail,
      createdBy: {
        _id: s.createdBy?._id,
        name: s.createdBy?.name,
        picture: s.createdBy?.picture
      }
    }));

    // Cache similar services for 10 minutes
    if (useCache) {
      await cache.set(cacheKey, safeServices, 600);
      console.log(`Cache set for similar services: ${cacheKey}`);
    }

    res.json({
      success: true,
      services: safeServices,
      count: safeServices.length,
      requestId,
      timestamp: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'SIMILAR', req.user?._id, { 
      id, 
      error: error.message 
    });
    next(error);
  }
};

// Upload Images
const uploadImages = async (req, res, next) => {
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

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
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
    const uploadedImages = await processUploadToCloudinary(req.files, 'services');
    
    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload images',
        code: 'UPLOAD_FAILED',
        requestId
      });
    }

    const existingImages = service.images || [];
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

    // Update service
    service.images = updatedImages;
    
    // Set thumbnail if not already set
    if (!service.thumbnail && uploadedImages.length > 0) {
      service.thumbnail = {
        url: uploadedImages[0].url,
        public_id: uploadedImages[0].public_id,
        width: uploadedImages[0].width,
        height: uploadedImages[0].height,
        size: uploadedImages[0].size,
        format: uploadedImages[0].format,
        uploadedAt: new Date()
      };
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Invalidate cache after image upload
    await invalidateServiceCache(id);

    logAudit('UPLOAD_IMAGES', 'SERVICE', id, req.user._id, {
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
    const { id, publicId } = req.params;
    
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

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Find image by public_id
    const imageIndex = service.images.findIndex(img => img.public_id === publicId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in service',
        code: 'IMAGE_NOT_FOUND',
        requestId
      });
    }

    const imageToRemove = service.images[imageIndex];
    
    // Remove image from array
    service.images.splice(imageIndex, 1);
    
    // If this was the thumbnail, set a new one or null
    if (service.thumbnail && service.thumbnail.public_id === publicId) {
      service.thumbnail = service.images.length > 0 ? {
        url: service.images[0].url,
        public_id: service.images[0].public_id,
        width: service.images[0].width,
        height: service.images[0].height,
        size: service.images[0].size,
        format: service.images[0].format,
        uploadedAt: service.images[0].uploadedAt || new Date()
      } : null;
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Delete image from Cloudinary
    await deleteCloudinaryImages([imageToRemove]);

    // Invalidate cache after image removal
    await invalidateServiceCache(id);

    logAudit('REMOVE_IMAGE', 'SERVICE', id, req.user._id, {
      imagePublicId: publicId,
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
    console.error('Remove image error:', error);
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
    const { id, publicId } = req.params;
    
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

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
        code: 'OWNERSHIP_REQUIRED',
        requestId
      });
    }

    // Find image by public_id
    const image = service.images.find(img => img.public_id === publicId);
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image not found in service images',
        code: 'IMAGE_NOT_IN_SERVICE',
        requestId
      });
    }

    // Update thumbnail
    service.thumbnail = {
      url: image.url,
      public_id: image.public_id,
      width: image.width,
      height: image.height,
      size: image.size,
      format: image.format,
      uploadedAt: image.uploadedAt || new Date()
    };
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Invalidate cache after thumbnail change
    await invalidateServiceCache(id);

    logAudit('SET_THUMBNAIL', 'SERVICE', id, req.user._id, {
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

    const isOwner = service.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own services',
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
    const uploadedImage = await processUploadToCloudinary([req.file], 'services/thumbnails', {
      transformation: [
        { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:best', fetch_format: 'auto' }
      ]
    });
    
    if (uploadedImage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload thumbnail',
        code: 'UPLOAD_FAILED',
        requestId
      });
    }

    const newThumbnail = uploadedImage[0];
    
    // Delete old thumbnail from Cloudinary if exists
    if (service.thumbnail && service.thumbnail.public_id) {
      await deleteCloudinaryImages([{ public_id: service.thumbnail.public_id }]);
    }
    
    // Update service
    service.thumbnail = {
      url: newThumbnail.url,
      public_id: newThumbnail.public_id,
      width: newThumbnail.width,
      height: newThumbnail.height,
      size: newThumbnail.size,
      format: newThumbnail.format,
      uploadedAt: new Date()
    };
    
    // Add to images array if not already there
    const isAlreadyInImages = service.images.some(img => img.public_id === newThumbnail.public_id);
    if (!isAlreadyInImages) {
      service.images.push(newThumbnail);
    }
    
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    await service.save();

    // Invalidate cache after thumbnail upload
    await invalidateServiceCache(id);

    logAudit('UPLOAD_THUMBNAIL', 'SERVICE', id, req.user._id, {
      thumbnail: newThumbnail.url
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: newThumbnail,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload thumbnail error:', error);
    logAudit('ERROR', 'SERVICE', 'UPLOAD_THUMBNAIL', req.user._id, { 
      id: req.params.id, 
      error: error.message 
    });
    next(error);
  }
};

// Get My Services
const getMyServices = async (req, res, next) => {
  const requestId = generateRequestId();
  try {
    // Only authenticated users can access this endpoint
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    const { 
      status, 
      page = 1, 
      limit = 50, 
      sort = 'createdAt', 
      order = 'desc',
      search,
      title,
      category,
      subcategory,
      isFeatured,
      isRecommended,
      isPopular,
      minPrice,
      maxPrice,
      includeDrafts = 'true',
      includeInactive = 'false',
      cache: useCacheParam = 'false'
    } = req.query;

    const useCache = useCacheParam === 'true';
    const filter = { createdBy: req.user._id };
    
    // For admin, respect createdBy parameter if provided
    if (req.user.role === 'admin' && req.query.createdBy && mongoose.Types.ObjectId.isValid(req.query.createdBy)) {
      filter.createdBy = req.query.createdBy;
    }

    if (status && status !== 'undefined' && status !== 'all') {
      filter.status = status;
    } else {
      filter.status = { $nin: ['deleted'] };
    }

    if (includeDrafts === 'false') {
      if (filter.status && filter.status.$nin) {
        filter.status.$nin.push('draft');
      } else if (filter.status === 'draft') {
        delete filter.status;
      }
    }

    if (includeInactive === 'false') {
      filter.isActive = true;
    }

    if (search) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$text = { $search: sanitizedSearch };
    }

    if (title) {
      filter.title = { $regex: `^${sanitizeHtml(title, { allowedTags: [] })}`, $options: 'i' };
    }
    
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    
    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
      filter.subcategory = subcategory;
    }
    
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true';
    }
    
    if (isRecommended !== undefined) {
      filter.isRecommended = isRecommended === 'true';
    }
    
    if (isPopular !== undefined) {
      filter.isPopular = isPopular === 'true';
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key for my services
    const cacheKey = generateCacheKey('my_services', {
      userId: req.user._id,
      filter,
      page: pageNum,
      limit: limitNum,
      sort,
      order,
      includeDrafts,
      includeInactive
    });

    let services, total, statusCounts;

    // Try to get from cache
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        total = cached.total;
        statusCounts = cached.statusCounts;
        console.log(`Cache hit for my services: ${cacheKey}`);
      }
    }

    if (!services || !total) {
      const allowedSortFields = ['title', 'price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes', 'publishedAt'];
      const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortObj = { [sortField]: sortOrder };

      [services, total] = await Promise.all([
        Service.find(filter)
          .select('-__v -lastUpdatedBy -version')
          .populate('category', 'name slug icon')
          .populate('subcategory', 'name slug')
          .populate('createdBy', 'name picture')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Service.countDocuments(filter)
      ]);

      // Get status counts
      statusCounts = await Service.aggregate([
        { $match: { createdBy: filter.createdBy } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Cache the result if enabled
      if (useCache) {
        await cache.set(cacheKey, { services, total, statusCounts }, 300); // 5 minutes
        console.log(`Cache set for my services: ${cacheKey}`);
      }
    }

    const formattedServices = services.map(service => {
      const safeService = { ...service };

      safeService.hasImages = Boolean(service.images && service.images.length > 0);
      safeService.hasPackages = Boolean(service.packages && service.packages.length > 0);
      safeService.hasFaqs = Boolean(service.faqs && service.faqs.length > 0);

      safeService.priceFormatted = `${service.currency || 'USD'} ${service.price}`;
      safeService.deliveryFormatted = `${service.deliveryTime} ${service.deliveryTimeUnit || 'days'}`;

      const statusColors = {
        active: 'success',
        draft: 'warning',
        pending: 'info',
        paused: 'secondary',
        denied: 'danger',
        suspended: 'danger'
      };

      // FIXED: Safe handling of missing/invalid status
      const statusKey = service.status || 'draft';
      const statusText = statusKey 
        ? statusKey.charAt(0).toUpperCase() + statusKey.slice(1)
        : 'Unknown';

      safeService.statusBadge = {
        text: statusText,
        color: statusColors[statusKey] || 'secondary'
      };

      if (safeService.description && safeService.description.length > 150) {
        safeService.descriptionShort = safeService.description.substring(0, 150) + '...';
      }

      return safeService;
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const statusSummary = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum,
      'X-Cache': useCache ? 'HIT' : 'MISS'
    });

    res.json({
      success: true,
      data: formattedServices,
      summary: {
        total,
        ...statusSummary
      },
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
      cached: useCache && services !== undefined
    });

  } catch (error) {
    logAudit('ERROR', 'SERVICE', 'GET_MY_SERVICES', req.user?._id, { 
      error: error.message,
      params: req.query 
    });
    
    if (error.name === 'MongooseError' && error.message.includes('operation timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
        requestId
      });
    }
    
    next(error);
  }
};
// Update getAllActiveServices function:
const getAllActiveServices = async (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc',
      search = '',
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      cache: useCacheParam = 'true'
    } = req.query;

    // Simple filter for active services only
    const filter = {
      status: 'active',
      isActive: true
    };

    // Apply search if provided
    if (search && search.trim().length >= 2) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$text = { $search: sanitizedSearch };
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

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {
      createdAt: -1,
      rating: -1,
      views: -1,
      likes: -1
    };

    const [services, total] = await Promise.all([
      Service.find(filter)
        .select('title slug shortDescription description price rating deliveryTime deliveryTimeUnit revisions views likes thumbnail images category createdBy tags status')
        .populate('category', 'name slug icon')
        .populate('createdBy', 'name picture')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Service.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: services.map(service => ({
        ...service,
        hasImages: service.images && service.images.length > 0,
        priceFormatted: `${service.currency || 'USD'} ${service.price || '0.00'}`
      })),
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
      responseTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('Get all active services error:', error);
    
    // Return empty array on error
    res.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      requestId,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
};
// Get Admin Services
const getAdminServices = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    // Security: Verify admin access
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
        requestId
      });
    }

    const {
      page = 1,
      limit = 12,
      search = '',
      status = '',
      featured = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      category,
      rating,
      createdBy,
      isActive = '',
      cache: useCacheParam = 'false'
    } = req.query;

    const useCache = useCacheParam === 'true';

    // Build filter for admin - can see all services
    const filter = {};

    if (search) {
      const sanitizedSearch = sanitizeHtml(search, { allowedTags: [], allowedAttributes: {} });
      filter.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { slug: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    if (status && status !== '') {
      filter.status = status;
    }

    if (featured && featured !== '') {
      filter.isFeatured = featured === 'true';
    }

    if (isActive && isActive !== '') {
      filter.isActive = isActive === 'true';
    } else {
      // If not specified, only show active services by default
      filter.isActive = true;
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      filter.createdBy = createdBy;
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Rating range
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key
    const cacheKey = generateCacheKey('admin_services', {
      filter,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder
    });

    let services, total, stats;

    // Try to get from cache
    if (useCache && pageNum === 1) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        total = cached.total;
        stats = cached.stats;
        console.log(`Cache hit for admin services: ${cacheKey}`);
      }
    }

    if (!services || !total) {
      // Sort options
      const allowedSortFields = ['title', 'price', 'rating', 'createdAt', 'updatedAt', 'ordersCount', 'views'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      const sortOptions = { [sortField]: sortDirection };

      // Execute query
      [services, total] = await Promise.all([
        Service.find(filter)
          .select('-__v -lastUpdatedBy -version')
          .populate('category', 'name slug icon')
          .populate('subcategory', 'name slug')
          .populate('createdBy', 'name email picture role')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Service.countDocuments(filter)
      ]);

      // Get statistics
      stats = await Service.aggregate([
        { $match: {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $eq: ['$isActive', true] }] }, 1, 0] } },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
            suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
            featured: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
            avgPrice: { $avg: '$price' },
            avgRating: { $avg: '$rating' }
          }
        }
      ]);

      // Cache the result if enabled and first page
      if (useCache && pageNum === 1) {
        await cache.set(cacheKey, { services, total, stats }, 300); // 5 minutes
        console.log(`Cache set for admin services: ${cacheKey}`);
      }
    }

    // Format response
    const formattedServices = services.map(service => ({
      ...service,
      priceFormatted: `${service.currency || 'USD'} ${service.price}`,
      deliveryFormatted: `${service.deliveryTime} ${service.deliveryTimeUnit || 'days'}`,
      statusBadge: {
        text: service.status ? service.status.charAt(0).toUpperCase() + service.status.slice(1) : 'Unknown',
        color: service.status === 'active' ? 'success' : 
               service.status === 'draft' ? 'warning' : 
               service.status === 'pending' ? 'info' : 
               service.status === 'paused' ? 'secondary' : 
               service.status === 'suspended' ? 'danger' : 'secondary'
      },
      createdBy: service.createdBy ? {
        _id: service.createdBy._id,
        name: service.createdBy.name,
        email: service.createdBy.email,
        picture: service.createdBy.picture,
        role: service.createdBy.role
      } : null,
      category: service.category ? {
        _id: service.category._id,
        name: service.category.name,
        slug: service.category.slug,
        icon: service.category.icon
      } : null
    }));

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: formattedServices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      stats: stats[0] || {
        total: 0,
        active: 0,
        draft: 0,
        pending: 0,
        paused: 0,
        suspended: 0,
        featured: 0,
        avgPrice: 0,
        avgRating: 0
      },
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && pageNum === 1 && services !== undefined
    });

  } catch (error) {
    console.error('[GET ADMIN SERVICES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      code: 'SERVICES_FETCH_ERROR',
      requestId,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Popular Services
const getPopularServices = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { 
      limit = 12, 
      category, 
      random = 'false',
      minRating = 4.0,
      minReviews = 5, // Use reviewsCount instead of ordersCount
      maxPrice,
      cache: useCacheParam = 'true'
    } = req.query;

    const useCache = useCacheParam === 'true';
    
    // Parse limit with maximum constraint
    const queryLimit = Math.min(parseInt(limit) || 12, 50);
    
    // Build filter for popular services
    const filter = {
      status: 'active',
      isActive: true,
      isPopular: true,
      rating: { $gte: parseFloat(minRating) },
      reviewsCount: { $gte: parseInt(minReviews) || 0 } // Use reviewsCount
    };

    // Optional category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    // Optional price filter
    if (maxPrice) {
      filter.price = { $lte: parseFloat(maxPrice) };
    }

    // Generate cache key
    const cacheKey = generateCacheKey('popular_services', {
      filter,
      random,
      queryLimit
    });

    let services = [];
    let categoryStats = [];

    // Try to get from cache
    if (useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        services = cached.services;
        categoryStats = cached.categoryStats;
        console.log(`Cache hit for popular services: ${cacheKey}`);
      }
    }

    if (!services.length) {
      // Optional random ordering
      if (random === 'true') {
        // Use aggregation for random sampling
        services = await Service.aggregate([
          { $match: filter },
          { $sample: { size: queryLimit } },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy'
            }
          },
          { $unwind: '$createdBy' },
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'category'
            }
          },
          { $unwind: '$category' },
          {
            $project: {
              _id: 1,
              title: 1,
              slug: 1,
              shortDescription: 1,
              description: 1,
              price: 1,
              currency: 1,
              rating: 1,
              reviewsCount: 1,
              deliveryTime: 1,
              deliveryTimeUnit: 1,
              revisions: 1,
              views: 1,
              likes: 1,
              thumbnail: 1,
              images: { $slice: ['$images', 1] }, // Just first image
              'createdBy._id': 1,
              'createdBy.name': 1,
              'createdBy.picture': 1,
              'category._id': 1,
              'category.name': 1,
              'category.slug': 1,
              'category.icon': 1
            }
          }
        ]);
      } else {
        // Normal query with populate - FIXED: removed ordersCount from sort
        const sortOptions = { 
          rating: -1, 
          views: -1, 
          likes: -1,
          createdAt: -1 
        };
        
        services = await Service.find(filter)
          .select('title slug shortDescription description price currency rating reviewsCount deliveryTime deliveryTimeUnit revisions views likes thumbnail images')
          .populate('createdBy', 'name picture')
          .populate('category', 'name slug icon')
          .sort(sortOptions)
          .limit(queryLimit)
          .lean();
      }

      // Get category statistics if no specific category filter
      if (!category) {
        categoryStats = await Service.aggregate([
          { $match: { ...filter } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              avgRating: { $avg: '$rating' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 6 }
        ]);

        // Populate category names
        if (categoryStats.length > 0) {
          const categoryIds = categoryStats.map(stat => stat._id);
          const categories = await Category.find({ _id: { $in: categoryIds } })
            .select('name slug icon')
            .lean();

          categoryStats = categoryStats.map(stat => {
            const categoryInfo = categories.find(cat => cat._id.toString() === stat._id.toString());
            return {
              ...stat,
              name: categoryInfo?.name,
              slug: categoryInfo?.slug,
              icon: categoryInfo?.icon
            };
          });
        }
      }

      // Cache the result
      if (useCache) {
        await cache.set(cacheKey, { services, categoryStats }, 300); // 5 minutes
        console.log(`Cache set for popular services: ${cacheKey}`);
      }
    }

    // Format response
    const formattedServices = services.map(service => ({
      _id: service._id,
      title: service.title,
      slug: service.slug,
      shortDescription: service.shortDescription || 
        (service.description ? service.description.substring(0, 120) + '...' : ''),
      price: service.price,
      currency: service.currency || 'USD',
      rating: service.rating || 0,
      reviewsCount: service.reviewsCount || 0,
      deliveryTime: service.deliveryTime,
      deliveryTimeUnit: service.deliveryTimeUnit,
      revisions: service.revisions || 0,
      views: service.views || 0,
      likes: service.likes || 0,
      thumbnail: service.thumbnail,
      firstImage: service.images && service.images.length > 0 ? service.images[0] : null,
      createdBy: {
        _id: service.createdBy?._id,
        name: service.createdBy?.name,
        picture: service.createdBy?.picture
      },
      category: {
        _id: service.category?._id,
        name: service.category?.name,
        slug: service.category?.slug,
        icon: service.category?.icon
      }
    }));

    res.json({
      success: true,
      services: formattedServices,
      count: formattedServices.length,
      categoryStats,
      requestId,
      timestamp: new Date().toISOString(),
      cached: useCache && services !== undefined
    });

  } catch (error) {
    console.error('[POPULAR SERVICES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular services',
      code: 'POPULAR_SERVICES_ERROR',
      requestId
    });
  }
};

// Toggle Service Popular Status (Admin only)
const togglePopularStatus = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    const { isPopular } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    if (isPopular === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isPopular field is required',
        code: 'MISSING_FIELD',
        requestId
      });
    }

    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
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

    // Update popular status
    service.isPopular = isPopular;
    service.lastUpdatedBy = req.user._id;
    service.version += 1;
    
    await service.save();

    // Invalidate cache for this service and popular services cache
    await invalidateServiceCache(id);
    await cache.del('popular_services:*');

    // Log audit
    logAudit('TOGGLE_POPULAR', 'SERVICE', id, req.user._id, {
      isPopular,
      serviceTitle: service.title,
      serviceCategory: service.category
    });

    res.json({
      success: true,
      message: `Service ${isPopular ? 'marked as popular' : 'removed from popular'}`,
      service: {
        _id: service._id,
        title: service.title,
        isPopular: service.isPopular,
        updatedAt: service.updatedAt
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TOGGLE POPULAR ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service popular status',
      code: 'UPDATE_POPULAR_ERROR',
      requestId
    });
  }
};

const getPopularServicesByCategory = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    // Get query parameters
    const { 
      limit = 12, 
      minRating = 0,  // Changed from 4.0 to 0 to include all popular services
      minReviews = 0, // Changed from 5 to 0
      cache: useCacheParam = 'true',
      random = 'false'
    } = req.query;

    const queryLimit = Math.min(parseInt(limit) || 12, 50);
    const useCache = useCacheParam === 'true';
    
    // Generate cache key
    const cacheKey = generateCacheKey('popular_services_by_category', {
      limit: queryLimit,
      minRating,
      minReviews,
      random
    });

    // Try to get from cache
    let result;
    if (useCache) {
      result = await cache.get(cacheKey);
      if (result) {
        console.log(`Cache hit for popular services by category: ${cacheKey}`);
        return res.json({
          success: true,
          data: result.data || result,
          count: result.count || (Array.isArray(result) ? result.length : 0),
          requestId,
          timestamp: new Date().toISOString(),
          cached: true
        });
      }
    }

    // FIXED: Simplified filter - just get services where isPopular = true
    const filter = {
      isPopular: true,  // CRITICAL: Filter for popular services
      status: 'active',
      isActive: true
    };

    console.log(`Fetching popular services with filter:`, filter);
    
    let services = [];
    let totalCount = 0;

    // Get total count first
    totalCount = await Service.countDocuments(filter);
    console.log(`Found ${totalCount} popular services in database`);

    if (random === 'true') {
      // Use aggregation for random sampling
      const aggregation = [
        { $match: filter },
        { $sample: { size: queryLimit } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creatorDetails'
          }
        },
        { $unwind: { path: '$creatorDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            title: 1,
            slug: 1,
            shortDescription: 1,
            description: 1,
            price: 1,
            currency: 1,
            rating: 1,
            reviewsCount: 1,
            deliveryTime: 1,
            deliveryTimeUnit: 1,
            revisions: 1,
            views: 1,
            likes: 1,
            thumbnail: 1,
            images: 1,
            tags: 1,
            features: 1,
            isPopular: 1,
            isFeatured: 1,
            category: '$categoryDetails',
            createdBy: '$creatorDetails',
            createdAt: 1,
            updatedAt: 1
          }
        }
      ];

      services = await Service.aggregate(aggregation);
    } else {
      // Normal query with sort
      services = await Service.find(filter)
        .select('title slug shortDescription description price currency rating reviewsCount deliveryTime deliveryTimeUnit revisions views likes thumbnail images tags features isPopular isFeatured category createdBy')
        .populate('category', 'name slug icon')
        .populate('createdBy', 'name picture')
        .sort({ 
          createdAt: -1,
          rating: -1,
          views: -1
        })
        .limit(queryLimit)
        .lean();
    }

    console.log(`Retrieved ${services.length} popular services from database`);

    // If no popular services found, return empty array
    if (services.length === 0) {
      console.log('No popular services found, returning empty array');
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No popular services found',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Format the services for response
    const formattedServices = services.map(service => {
      // Get category name
      let categoryName = 'Creative Services';
      if (service.category && service.category.name) {
        categoryName = service.category.name;
      }

      // Get image URL
      let imageUrl = null;
      if (service.thumbnail && service.thumbnail.url) {
        imageUrl = service.thumbnail.url;
      } else if (service.images && service.images.length > 0) {
        const firstImage = service.images[0];
        imageUrl = typeof firstImage === 'object' ? firstImage.url : firstImage;
      }

      // Get search query
      let searchQuery = service.title || '';
      if (service.tags && service.tags.length > 0) {
        searchQuery = service.tags[0];
      }

      return {
        _id: service._id,
        id: service._id.toString(),
        title: service.title,
        name: service.title,
        slug: service.slug,
        shortDescription: service.shortDescription || 
          (service.description ? service.description.substring(0, 120) + '...' : 'Professional service'),
        description: service.description,
        price: service.price,
        currency: service.currency || 'USD',
        rating: service.rating || 0,
        reviewsCount: service.reviewsCount || 0,
        deliveryTime: service.deliveryTime,
        deliveryTimeUnit: service.deliveryTimeUnit || 'days',
        revisions: service.revisions || 0,
        views: service.views || 0,
        likes: service.likes || 0,
        tags: service.tags || [],
        features: service.features || [],
        thumbnail: service.thumbnail,
        images: service.images || [],
        imageUrl: imageUrl,
        category: categoryName,
        categoryId: service.category?._id || service.category,
        searchQuery: searchQuery.toLowerCase().replace(/\s+/g, '-'),
        createdBy: {
          _id: service.createdBy?._id || service.createdBy,
          name: service.createdBy?.name || 'Unknown',
          picture: service.createdBy?.picture || null
        },
        isPopular: service.isPopular || false,
        isFeatured: service.isFeatured || false,
        status: service.status || 'active',
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
      };
    });

    // Cache the result
    if (useCache) {
      await cache.set(cacheKey, {
        data: formattedServices,
        count: formattedServices.length,
        total: totalCount
      }, 600);
      console.log(`Cache set for popular services by category: ${cacheKey}`);
    }

    res.json({
      success: true,
      data: formattedServices,
      count: formattedServices.length,
      total: totalCount,
      requestId,
      timestamp: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('[POPULAR BY CATEGORY ERROR]', error);
    
    // Return empty array on error
    res.json({
      success: false,
      data: [],
      count: 0,
      message: 'Error fetching popular services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  createService,
  getServices,
  getMyServices,
  getServiceById,
  getAllActiveServices,
  getAdminServices,
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
  uploadThumbnail,
  getPopularServices,
  togglePopularStatus,
  getPopularServicesByCategory
};