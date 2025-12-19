const Joi = require('joi');
const mongoose = require('mongoose');
const { sanitizeHtml } = require('../../utils/sanitize');
const xssFilters = require('xss-filters');
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'Invalid ID format'
});

// XSS Prevention helper with safe HTML options
const sanitizeInput = (data, options = {}) => {
  if (typeof data === 'string') {
    const sanitizationOptions = {
      allowedTags: options.allowHtml ? ['b', 'i', 'em', 'strong', 'u', 'br', 'p'] : [],
      allowedAttributes: {},
      disallowedTagsMode: 'escape'
    };
    return sanitizeHtml(data.trim(), sanitizationOptions);
  }
  return data;
};
const advancedSanitization = (value, options = {}) => {
  if (typeof value !== 'string') return value;
  
  // Remove null bytes
  value = value.replace(/\0/g, '');
  
  // Normalize unicode
  value = value.normalize('NFKC');
  
  // Apply XSS filters
  value = xssFilters.inHTMLData(value);
  
  // Remove control characters (except newline and tab)
  value = value.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Truncate to prevent DoS
  const maxLength = options.maxLength || 1000;
  if (value.length > maxLength) {
    value = value.substring(0, maxLength);
  }
  
  return value.trim();
};
Joi.extend((joi) => ({
  type: 'secureString',
  base: joi.string(),
  messages: {
    'secureString.injection': '{{#label}} contains malicious content',
    'secureString.xss': '{{#label}} contains XSS attempt'
  },
  validate(value, helpers) {
    // Check for injections
    const injectionTests = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript\s*:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /@import/gi,
      /eval\s*\(/gi,
      /document\./gi,
      /window\./gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi
    ];
    
    for (const test of injectionTests) {
      if (test.test(value)) {
        return { value, errors: helpers.error('secureString.xss') };
      }
    }
    
    return { value };
  }
}));
// Common validation rules
const nameValidation = Joi.string()
  .min(2)
  .max(50)
  .custom((value, helpers) => {
    const sanitized = sanitizeInput(value);
    if (sanitized.length < 2) {
      return helpers.error('string.min');
    }
    // Prevent SQL/NoSQL injection patterns
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
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(sanitized)) {
        return helpers.error('any.invalid');
      }
    }
    
    return sanitized;
  }, 'XSS and injection prevention')
  .messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters',
    'string.max': 'Category name cannot exceed 50 characters',
    'any.invalid': 'Category name contains invalid characters',
  });

const descriptionValidation = Joi.string()
  .allow('')
  .max(1000)
  .custom((value) => sanitizeInput(value, { allowHtml: true }), 'XSS prevention')
  .optional();
const validateImagePath = (path) => {
  if (!path) return true;
  
  const invalidPatterns = [
    /\.\.\//,  // Directory traversal
    /\.\.\\/,  // Windows traversal
    /\/\//,    // Double slash
    /\\\./,    // Backslash dot
    /^\/?\.\.?(\/|$)/,  // Current/parent directory
    /^[a-zA-Z]:[\\\/]/, // Windows drive
    /%2e%2e/i,  // URL encoded ..
    /\.\.%2f/i,  // ../
    /%2e\./i,    // ./
    /\0/,        // Null byte
    /\|/,        // Pipe
    /\</,        // Less than
    /\>/,        // Greater than
    /\*/,        // Wildcard
    /\?/,        // Wildcard
    /\[/,        // Bracket
    /\]/,        // Bracket
    /\{/,        // Brace
    /\}/         // Brace
  ];
  
  // Decode URL encoding multiple times
  let decoded = path;
  for (let i = 0; i < 5; i++) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch (e) {
      break;
    }
  }
  
  // Check both original and decoded
  const pathsToCheck = [path, decoded];
  return !pathsToCheck.some(p => 
    invalidPatterns.some(pattern => pattern.test(p))
  );
};
const imageValidation = Joi.string()
  .pattern(/^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i)
  .custom((value, helpers) => {
    // Comprehensive path traversal checks
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /\/\//,
      /\\\\./,
      /^\.\//,
      /^\.\\/,
      /^[a-zA-Z]:[\\\/]/  // Windows drives
    ];
    
    if (traversalPatterns.some(pattern => pattern.test(value))) {
      return helpers.error('any.invalid');
    }
    
    // Also check URL encoding attempts
    const decoded = decodeURIComponent(value);
    if (traversalPatterns.some(pattern => pattern.test(decoded))) {
      return helpers.error('any.invalid');
    }
    
    return value;
  })
  .optional()
  .messages({
    'string.pattern.base': 'Invalid image URL format',
    'any.invalid': 'Invalid image path - path traversal detected'
  });

const metaKeywordsValidation = Joi.array()
  .items(
    Joi.string()
      .max(30)
      .custom((value) => sanitizeInput(value), 'XSS prevention')
      .messages({
        'string.max': 'Keyword cannot exceed 30 characters'
      })
  )
  .max(20)
  .optional()
  .messages({
    'array.max': 'Cannot have more than 20 keywords'
  });

// Create schema
const createSchema = Joi.object({
  name: nameValidation.required(),
  
  description: descriptionValidation,
  
  icon: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Icon can only contain letters, numbers, hyphens and underscores'
    }),
  
  image: imageValidation,
  
  parentCategory: objectId
    .optional()
    .allow(null)
    .messages({
      'any.invalid': 'Invalid parent category ID'
    }),
  
  featured: Joi.boolean().optional().default(false),
  
  popular: Joi.boolean().optional().default(false),
  
  order: Joi.number()
    .integer()
    .min(0)
    .max(1000)
    .optional()
    .default(0)
    .messages({
      'number.min': 'Order cannot be negative',
      'number.max': 'Order cannot exceed 1000'
    }),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaKeywords: metaKeywordsValidation,
  
  isActive: Joi.boolean().optional().default(true),
  
  createdBy: objectId.optional(), // Will be set by middleware
  
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Update schema
const updateSchema = Joi.object({
  name: nameValidation.optional(),
  
  description: descriptionValidation,
  
  icon: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .optional(),
  
  image: imageValidation,
  
  parentCategory: objectId
    .optional()
    .allow(null),
  
  featured: Joi.boolean().optional(),
  
  popular: Joi.boolean().optional(),
  
  order: Joi.number()
    .integer()
    .min(0)
    .max(1000)
    .optional(),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaKeywords: metaKeywordsValidation,
  
  isActive: Joi.boolean().optional(),
  
  version: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': 'Version must be at least 1'
    }),
    
  lastUpdatedBy: objectId.optional(), // Will be set by middleware
  
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Bulk operations schema
const bulkSchema = Joi.object({
  ids: Joi.array()
    .items(objectId)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.base': 'IDs must be an array',
      'array.min': 'At least one ID is required',
      'array.max': 'Cannot process more than 100 items at once',
      'any.invalid': 'Invalid ID format in array'
    }),
  
  operation: Joi.string()
    .valid('activate', 'deactivate', 'update', 'delete', 'feature', 'unfeature', 'popular', 'unpopular')
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

// Query validation schema
const querySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  offset: Joi.number().integer().min(0),
  
  // Sorting
  sort: Joi.string()
    .valid('name', 'order', 'createdAt', 'updatedAt', 'servicesCount', 'gigsCount', 'level', 'featured', 'popular')
    .default('createdAt'),
  order: Joi.string().valid('asc', 'desc', '1', '-1').default('desc'),
  sortBy: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  
  // Search
  search: Joi.string().trim().max(100).custom((value) => sanitizeInput(value), 'XSS prevention'),
  q: Joi.string().trim().max(100).custom((value) => sanitizeInput(value), 'XSS prevention'),
  
  // Filtering
  name: Joi.string().trim().max(100).custom((value) => sanitizeInput(value), 'XSS prevention'),
  slug: Joi.string().trim().max(100),
  parentCategory: objectId,
  featured: Joi.boolean(),
  popular: Joi.boolean(),
  isActive: Joi.boolean().default(true),
  level: Joi.number().integer().min(0).max(10),
  minServicesCount: Joi.number().integer().min(0),
  maxServicesCount: Joi.number().integer().min(0),
  minGigsCount: Joi.number().integer().min(0),
  maxGigsCount: Joi.number().integer().min(0),
  createdAfter: Joi.date().iso(),
  createdBefore: Joi.date().iso(),
  updatedAfter: Joi.date().iso(),
  updatedBefore: Joi.date().iso(),
  createdBy: objectId,
  hasImage: Joi.boolean(),
  hasParent: Joi.boolean(),
  deleted: Joi.boolean(),
  
  // Data control
  fields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  excludeFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  populate: Joi.boolean().default(true),
  populateFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  includeSubcategories: Joi.boolean(),
  includeCounts: Joi.boolean(),
  depth: Joi.number().integer().min(1).max(5).default(1),
  
  // Security
  showAll: Joi.boolean(),
  includeDeleted: Joi.boolean(),
  lean: Joi.boolean().default(true),
  cache: Joi.boolean().default(false),
  
  // Export
  format: Joi.string().valid('json', 'csv', 'excel'),
  
  // Performance
  timeout: Joi.number().integer().min(1000).max(30000),
  
}).options({ 
  stripUnknown: true,
  abortEarly: false,
  convert: true 
});

// Middleware functions with improved error handling
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
    
    // Add createdBy from auth middleware if not provided
    if (!value.createdBy && req.user) {
      value.createdBy = req.user._id;
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
    
    // Add lastUpdatedBy from auth middleware
    if (req.user) {
      value.lastUpdatedBy = req.user._id;
    }
    
    // Validate version if provided
    if (value.version !== undefined) {
      value.version = parseInt(value.version);
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
    
    // Validate all IDs are unique
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
    
    // Handle sorting
    if (value.sortBy) {
      value.sort = value.sortBy;
      delete value.sortBy;
    }
    
    // Convert order string to number for MongoDB
    if (value.order === 'asc' || value.order === '1') {
      value.order = 1;
    } else if (value.order === 'desc' || value.order === '-1') {
      value.order = -1;
    }
    
    // Set timeout if provided
    if (value.timeout) {
      req.queryTimeout = value.timeout;
      delete value.timeout;
    }
    
    // Security: Limit max results for non-admin users
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
  validateImagePath 
};