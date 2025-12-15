const Joi = require('joi');
const mongoose = require('mongoose');
const { sanitizeHtml, sanitizeText } = require('../../utils/sanitize.js');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'Invalid ID format'
});

const sanitizeInput = (data, options = {}) => {
  if (typeof data === 'string') {
    const sanitizationOptions = {
      allowedTags: options.allowHtml ? ['b', 'i', 'em', 'strong', 'u', 'br', 'p'] : [],
      allowedAttributes: {},
      disallowedTagsMode: 'escape'
    };
    const sanitized = sanitizeHtml(data.trim(), sanitizationOptions);
    
    if (options.preventInjection) {
      const injectionPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$nin/i,
        /\$regex/i,
        /select.*from/i,
        /insert.*into/i,
        /update.*set/i,
        /delete.*from/i,
        /union.*select/i,
        /or.*=.*or/i,
        /'|"|`/,
        /--/,
        /;/,
        /\/\*.*\*\//,
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/
      ];
      
      if (injectionPatterns.some(pattern => pattern.test(sanitized))) {
        throw new Error('Input contains potentially dangerous content');
      }
    }
    
    return sanitized;
  }
  return data;
};

const imageUrlSchema = Joi.string().pattern(
  /^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i
).custom((value, helpers) => {
  if (value.includes('..') || value.includes('//')) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'Image URL validation').messages({
  'string.pattern.base': 'Invalid image URL format',
  'any.invalid': 'Invalid image path detected'
});

const packageSchema = Joi.object({
  name: Joi.string()
    .required()
    .max(50)
    .custom((value) => sanitizeText(value), 'XSS prevention')
    .messages({
      'string.empty': 'Package name is required',
      'string.max': 'Package name cannot exceed 50 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .custom((value) => sanitizeText(value || ''), 'XSS prevention')
    .allow('')
    .messages({
      'string.max': 'Package description cannot exceed 500 characters',
    }),
  
  price: Joi.number()
    .required()
    .min(1)
    .max(100000)
    .messages({
      'number.base': 'Package price must be a number',
      'number.min': 'Minimum package price is $1',
      'number.max': 'Maximum package price is $100,000',
    }),
  
  deliveryTime: Joi.number()
    .required()
    .min(1)
    .max(365)
    .messages({
      'number.base': 'Delivery time must be a number',
      'number.min': 'Minimum delivery time is 1 day',
      'number.max': 'Maximum delivery time is 365 days',
    }),
  
  revisions: Joi.number()
    .min(0)
    .max(99)
    .default(0)
    .messages({
      'number.min': 'Revisions cannot be negative',
      'number.max': 'Maximum revisions is 99',
    }),
  
  features: Joi.array()
    .items(Joi.string().max(100).custom((value) => sanitizeText(value), 'XSS prevention'))
    .messages({
      'string.max': 'Feature cannot exceed 100 characters',
    }),
  
  popular: Joi.boolean()
    .default(false),
}).options({ stripUnknown: true });

const featureSchema = Joi.object({
  title: Joi.string()
    .required()
    .max(100)
    .custom((value) => sanitizeText(value), 'XSS prevention')
    .messages({
      'string.empty': 'Feature title is required',
      'string.max': 'Feature title cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(200)
    .custom((value) => sanitizeText(value || ''), 'XSS prevention')
    .allow('')
    .messages({
      'string.max': 'Feature description cannot exceed 200 characters',
    }),
  
  included: Joi.boolean()
    .default(true),
}).options({ stripUnknown: true });

const requirementSchema = Joi.object({
  question: Joi.string()
    .required()
    .max(200)
    .custom((value) => sanitizeText(value), 'XSS prevention')
    .messages({
      'string.empty': 'Requirement question is required',
      'string.max': 'Requirement question cannot exceed 200 characters',
    }),
  
  type: Joi.string()
    .valid('text', 'file', 'choice', 'multiple')
    .default('text')
    .messages({
      'any.only': 'Invalid requirement type',
    }),
  
  required: Joi.boolean()
    .default(false),
  
  options: Joi.array()
    .items(Joi.string().max(50).custom((value) => sanitizeText(value), 'XSS prevention'))
    .messages({
      'string.max': 'Option cannot exceed 50 characters',
    }),
}).options({ stripUnknown: true });

const faqSchema = Joi.object({
  question: Joi.string()
    .required()
    .max(200)
    .custom((value) => sanitizeText(value), 'XSS prevention')
    .messages({
      'string.empty': 'FAQ question is required',
      'string.max': 'FAQ question cannot exceed 200 characters',
    }),
  
  answer: Joi.string()
    .required()
    .max(500)
    .custom((value) => sanitizeText(value), 'XSS prevention')
    .messages({
      'string.empty': 'FAQ answer is required',
      'string.max': 'FAQ answer cannot exceed 500 characters',
    }),
}).options({ stripUnknown: true });

const createSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(5)
    .max(200)
    .custom((value) => sanitizeInput(value, { preventInjection: true }), 'XSS and injection prevention')
    .messages({
      'string.empty': 'Service title is required',
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.custom': 'Title contains invalid characters',
    }),
  
  description: Joi.string()
    .required()
    .min(50)
    .max(5000)
    .custom((value) => sanitizeInput(value, { allowHtml: true }), 'XSS prevention')
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 5000 characters',
    }),
  
  shortDescription: Joi.string()
    .max(250)
    .custom((value) => sanitizeInput(value || ''), 'XSS prevention')
    .allow('')
    .messages({
      'string.max': 'Short description cannot exceed 250 characters',
    }),
  
  category: objectId
    .required()
    .messages({
      'any.required': 'Category is required',
      'any.invalid': 'Invalid category ID',
    }),
  
  subcategory: objectId
    .optional()
    .allow(null)
    .messages({
      'any.invalid': 'Invalid subcategory ID',
    }),
  
  price: Joi.number()
    .required()
    .min(1)
    .max(100000)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Minimum price is $1',
      'number.max': 'Maximum price is $100,000',
      'any.required': 'Price is required',
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR')
    .default('USD')
    .messages({
      'any.only': 'Invalid currency',
    }),
  
  deliveryTime: Joi.number()
    .required()
    .min(1)
    .max(365)
    .messages({
      'number.base': 'Delivery time must be a number',
      'number.min': 'Minimum delivery time is 1 day',
      'number.max': 'Maximum delivery time is 365 days',
      'any.required': 'Delivery time is required',
    }),
  
  deliveryTimeUnit: Joi.string()
    .valid('hours', 'days', 'weeks')
    .default('days')
    .messages({
      'any.only': 'Invalid delivery time unit',
    }),
  
  revisions: Joi.number()
    .min(0)
    .max(99)
    .default(1)
    .messages({
      'number.min': 'Revisions cannot be negative',
      'number.max': 'Maximum revisions is 99',
    }),
  
  images: Joi.array()
    .items(imageUrlSchema)
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot upload more than 10 images',
    }),
  
  thumbnail: imageUrlSchema
    .optional()
    .allow(null, ''),
  
  tags: Joi.array()
    .items(Joi.string().max(30).custom((value) => sanitizeText(value), 'XSS prevention'))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'string.max': 'Tag cannot exceed 30 characters',
    }),
  
  features: Joi.array()
    .items(featureSchema)
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 features',
    }),
  
  requirements: Joi.array()
    .items(requirementSchema)
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 requirements',
    }),
  
  faqs: Joi.array()
    .items(faqSchema)
    .max(15)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 15 FAQs',
    }),
  
  packages: Joi.array()
    .items(packageSchema)
    .max(3)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 3 packages',
    }),
  
  status: Joi.string()
    .valid('draft', 'pending', 'active', 'paused', 'denied', 'suspended')
    .default('draft')
    .messages({
      'any.only': 'Invalid status',
    }),
  
  searchKeywords: Joi.array()
    .items(Joi.string().max(30).custom((value) => sanitizeText(value), 'XSS prevention'))
    .max(30)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 30 search keywords',
      'string.max': 'Keyword cannot exceed 30 characters',
    }),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value || ''), 'XSS prevention')
    .allow('')
    .messages({
      'string.max': 'Meta title cannot exceed 60 characters',
    }),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value || ''), 'XSS prevention')
    .allow('')
    .messages({
      'string.max': 'Meta description cannot exceed 160 characters',
    }),
  
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

const updateSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .custom((value) => sanitizeInput(value, { preventInjection: true }), 'XSS and injection prevention')
    .optional()
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.custom': 'Title contains invalid characters',
    }),
  
  description: Joi.string()
    .min(50)
    .max(5000)
    .custom((value) => sanitizeInput(value, { allowHtml: true }), 'XSS prevention')
    .optional()
    .messages({
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 5000 characters',
    }),
  
  shortDescription: Joi.string()
    .max(250)
    .custom((value) => sanitizeInput(value || ''), 'XSS prevention')
    .allow('')
    .optional()
    .messages({
      'string.max': 'Short description cannot exceed 250 characters',
    }),
  
  category: objectId
    .optional()
    .messages({
      'any.invalid': 'Invalid category ID',
    }),
  
  subcategory: objectId
    .optional()
    .allow(null)
    .messages({
      'any.invalid': 'Invalid subcategory ID',
    }),
  
  price: Joi.number()
    .min(1)
    .max(100000)
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Minimum price is $1',
      'number.max': 'Maximum price is $100,000',
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR')
    .optional()
    .messages({
      'any.only': 'Invalid currency',
    }),
  
  deliveryTime: Joi.number()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.base': 'Delivery time must be a number',
      'number.min': 'Minimum delivery time is 1 day',
      'number.max': 'Maximum delivery time is 365 days',
    }),
  
  deliveryTimeUnit: Joi.string()
    .valid('hours', 'days', 'weeks')
    .optional()
    .messages({
      'any.only': 'Invalid delivery time unit',
    }),
  
  revisions: Joi.number()
    .min(0)
    .max(99)
    .optional()
    .messages({
      'number.min': 'Revisions cannot be negative',
      'number.max': 'Maximum revisions is 99',
    }),
  
  images: Joi.array()
    .items(imageUrlSchema)
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot upload more than 10 images',
    }),
  
  thumbnail: imageUrlSchema
    .optional()
    .allow(null, ''),
  
  tags: Joi.array()
    .items(Joi.string().max(30).custom((value) => sanitizeText(value), 'XSS prevention'))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'string.max': 'Tag cannot exceed 30 characters',
    }),
  
  features: Joi.array()
    .items(featureSchema)
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 features',
    }),
  
  requirements: Joi.array()
    .items(requirementSchema)
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 requirements',
    }),
  
  faqs: Joi.array()
    .items(faqSchema)
    .max(15)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 15 FAQs',
    }),
  
  packages: Joi.array()
    .items(packageSchema)
    .max(3)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 3 packages',
    }),
  
  status: Joi.string()
    .valid('draft', 'pending', 'active', 'paused', 'denied', 'suspended')
    .optional()
    .messages({
      'any.only': 'Invalid status',
    }),
  
  isFeatured: Joi.boolean()
    .optional(),
  
  isRecommended: Joi.boolean()
    .optional(),
  
  isPopular: Joi.boolean()
    .optional(),
  
  searchKeywords: Joi.array()
    .items(Joi.string().max(30).custom((value) => sanitizeText(value), 'XSS prevention'))
    .max(30)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 30 search keywords',
      'string.max': 'Keyword cannot exceed 30 characters',
    }),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value || ''), 'XSS prevention')
    .allow('')
    .optional()
    .messages({
      'string.max': 'Meta title cannot exceed 60 characters',
    }),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value || ''), 'XSS prevention')
    .allow('')
    .optional()
    .messages({
      'string.max': 'Meta description cannot exceed 160 characters',
    }),
  
  version: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Version must be a number',
      'number.min': 'Version must be at least 1',
    }),
  
}).min(1).options({ 
  stripUnknown: true,
  abortEarly: false 
});

const bulkSchema = Joi.object({
  ids: Joi.array()
    .items(objectId)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.base': 'IDs must be an array',
      'array.min': 'At least one ID is required',
      'array.max': 'Cannot process more than 50 items at once',
      'any.invalid': 'Invalid ID format in array',
    }),
  
  operation: Joi.string()
    .valid('activate', 'deactivate', 'pause', 'feature', 'unfeature', 'recommend', 'unrecommend', 'popular', 'unpopular', 'update', 'delete')
    .required()
    .messages({
      'any.only': 'Invalid operation',
      'string.empty': 'Operation is required',
    }),
  
  data: Joi.object()
    .when('operation', {
      is: 'update',
      then: updateSchema.required(),
      otherwise: Joi.object().optional(),
    }),
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  offset: Joi.number().integer().min(0),
  
  sort: Joi.string()
    .valid('price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes', 'relevance', 'title')
    .default('createdAt'),
  
  order: Joi.string().valid('asc', 'desc', '1', '-1').default('desc'),
  sortBy: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  
  search: Joi.string().trim().max(100).custom((value) => sanitizeText(value || ''), 'XSS prevention'),
  q: Joi.string().trim().max(100).custom((value) => sanitizeText(value || ''), 'XSS prevention'),
  
  title: Joi.string().trim().max(100).custom((value) => sanitizeText(value || ''), 'XSS prevention'),
  slug: Joi.string().trim().max(100),
  category: objectId,
  subcategory: objectId,
  createdBy: objectId,
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  minRating: Joi.number().min(0).max(5),
  maxRating: Joi.number().min(0).max(5),
  minDeliveryTime: Joi.number().min(1),
  maxDeliveryTime: Joi.number().min(1),
  deliveryTimeUnit: Joi.string().valid('hours', 'days', 'weeks'),
  currency: Joi.string(),
  status: Joi.string().valid('draft', 'pending', 'active', 'paused', 'denied', 'suspended'),
  isFeatured: Joi.boolean(),
  isRecommended: Joi.boolean(),
  isPopular: Joi.boolean(),
  hasImages: Joi.boolean(),
  hasPackages: Joi.boolean(),
  hasFaqs: Joi.boolean(),
  tags: Joi.string().custom((value) => sanitizeText(value || ''), 'XSS prevention'),
  createdAfter: Joi.date().iso(),
  createdBefore: Joi.date().iso(),
  updatedAfter: Joi.date().iso(),
  updatedBefore: Joi.date().iso(),
  publishedAfter: Joi.date().iso(),
  publishedBefore: Joi.date().iso(),
  ids: Joi.string().pattern(/^[a-f0-9,]{24,}$/),
  excludeIds: Joi.string().pattern(/^[a-f0-9,]{24,}$/),
  
  fields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  excludeFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  populate: Joi.boolean().default(true),
  populateFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  includeCreator: Joi.boolean().default(true),
  includeCategory: Joi.boolean().default(true),
  includeReviews: Joi.boolean(),
  includeStats: Joi.boolean(),
  
  showAll: Joi.boolean(),
  includeInactive: Joi.boolean(),
  lean: Joi.boolean().default(true),
  cache: Joi.boolean().default(false),
  
  format: Joi.string().valid('json', 'csv', 'excel'),
  
  timeout: Joi.number().integer().min(1000).max(30000),
  
}).options({ 
  stripUnknown: true,
  abortEarly: false,
  convert: true 
});

const validateCreate = (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: false 
    });
    
    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    req.body = value;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Validation server error',
      code: 'VALIDATION_SERVER_ERROR'
    });
  }
};

const validateUpdate = (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: false 
    });
    
    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    req.body = value;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Validation server error',
      code: 'VALIDATION_SERVER_ERROR'
    });
  }
};

const validateBulk = (req, res, next) => {
  try {
    const { error, value } = bulkSchema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: false 
    });
    
    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Bulk operation validation failed',
        errors: messages,
        code: 'BULK_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    const uniqueIds = [...new Set(value.ids)];
    if (uniqueIds.length !== value.ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate IDs found in bulk operation',
        code: 'DUPLICATE_IDS_ERROR'
      });
    }
    
    req.body = value;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Validation server error',
      code: 'VALIDATION_SERVER_ERROR'
    });
  }
};

const validateQuery = (req, res, next) => {
  try {
    const { error, value } = querySchema.validate(req.query, { 
      abortEarly: false,
      allowUnknown: false,
      convert: true 
    });
    
    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: messages,
        code: 'QUERY_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    if (value.sortBy) {
      value.sort = value.sortBy;
      delete value.sortBy;
    }
    
    if (value.order === 'asc' || value.order === '1') {
      value.order = 1;
    } else if (value.order === 'desc' || value.order === '-1') {
      value.order = -1;
    }
    
    if (value.timeout) {
      req.queryTimeout = value.timeout;
      delete value.timeout;
    }
    
    if (!req.user?.isAdmin && value.limit > 50) {
      value.limit = 50;
    }
    
    req.query = value;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Query validation server error',
      code: 'QUERY_VALIDATION_SERVER_ERROR'
    });
  }
};

module.exports = {
  createSchema,
  updateSchema,
  bulkSchema,
  querySchema,
  validateCreate,
  validateUpdate,
  validateBulk,
  validateQuery,
  objectId,
  sanitizeInput,
};