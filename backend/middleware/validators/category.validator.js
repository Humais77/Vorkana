const Joi = require('joi');
const mongoose = require('mongoose');
const { sanitizeHtml } = require('../../utils/sanitize');


const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');

// XSS Prevention helper
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return sanitizeHtml(data, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'escape'
    }).trim();
  }
  return data;
};

// Create schema
const createSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(50)
    .custom((value, helpers) => {
      const sanitized = sanitizeInput(value);
      if (sanitized.length < 2) {
        return helpers.error('string.min');
      }
      return sanitized;
    }, 'XSS prevention')
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name cannot exceed 50 characters',
    }),
  
  description: Joi.string()
    .allow('')
    .max(1000)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  icon: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9\-]+$/)
    .optional(),
  
  image: Joi.string()
    .uri({ allowRelative: true })
    .pattern(/^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i)
    .optional(),
  
  parentCategory: objectId
    .optional()
    .allow(null),
  
  featured: Joi.boolean().optional(),
  
  popular: Joi.boolean().optional(),
  
  order: Joi.number()
    .integer()
    .min(0)
    .optional(),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaKeywords: Joi.array()
    .items(
      Joi.string()
        .max(30)
        .custom((value) => sanitizeInput(value), 'XSS prevention')
    )
    .max(20)
    .optional(),
  
  isActive: Joi.boolean().optional(),
}).options({ stripUnknown: true });

// Update schema
const updateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .custom((value, helpers) => {
      const sanitized = sanitizeInput(value);
      if (sanitized.length < 2) {
        return helpers.error('string.min');
      }
      return sanitized;
    }, 'XSS prevention')
    .optional(),
  
  description: Joi.string()
    .allow('')
    .max(1000)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  icon: Joi.string()
    .max(50)
    .pattern(/^[a-zA-Z0-9\-]+$/)
    .optional(),
  
  image: Joi.string()
    .uri({ allowRelative: true })
    .pattern(/^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i)
    .optional(),
  
  parentCategory: objectId
    .optional()
    .allow(null),
  
  featured: Joi.boolean().optional(),
  
  popular: Joi.boolean().optional(),
  
  order: Joi.number()
    .integer()
    .min(0)
    .optional(),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  metaKeywords: Joi.array()
    .items(
      Joi.string()
        .max(30)
        .custom((value) => sanitizeInput(value), 'XSS prevention')
    )
    .max(20)
    .optional(),
  
  isActive: Joi.boolean().optional(),
  
  version: Joi.number().integer().min(1).optional(),
}).options({ stripUnknown: true });

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
}).options({ stripUnknown: true });

// Query validation schema
const querySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0),
  
  // Sorting
  sort: Joi.string().valid('name', 'order', 'createdAt', 'updatedAt', 'servicesCount', 'gigsCount').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  sortBy: Joi.string(),
  
  // Search
  search: Joi.string().trim().max(100),
  q: Joi.string().trim().max(100),
  
  // Filtering
  name: Joi.string().trim(),
  slug: Joi.string().trim(),
  parentCategory: objectId,
  featured: Joi.boolean(),
  popular: Joi.boolean(),
  isActive: Joi.boolean(),
  level: Joi.number().integer().min(0).max(5),
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
  
  // Data control
  fields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  excludeFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  populate: Joi.boolean().default(true),
  populateFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  includeSubcategories: Joi.boolean(),
  includeCounts: Joi.boolean(),
  
  // Security
  showAll: Joi.boolean(),
  includeDeleted: Joi.boolean(),
  lean: Joi.boolean().default(true),
  cache: Joi.boolean().default(false),
  
  // Export
  format: Joi.string().valid('json', 'csv'),
}).options({ stripUnknown: true });

// Rate limiting for bulk operations
const rateLimitSchema = Joi.object({
  windowMs: Joi.number().integer().min(60000).max(3600000).default(900000),
  max: Joi.number().integer().min(1).max(50).default(10),
}).optional();

// Middleware functions
const validateCreate = (req, res, next) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
      code: 'VALIDATION_ERROR',
    });
  }
  
  // Sanitize all inputs
  req.body = value;
  next();
};

const validateUpdate = (req, res, next) => {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
      code: 'VALIDATION_ERROR',
    });
  }
  
  req.body = value;
  next();
};

const validateBulk = (req, res, next) => {
  const { error, value } = bulkSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
      code: 'VALIDATION_ERROR',
    });
  }
  
  req.body = value;
  next();
};

const validateQuery = (req, res, next) => {
  const { error, value } = querySchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: messages,
      code: 'QUERY_VALIDATION_ERROR',
    });
  }
  
  req.query = value;
  next();
};

module.exports = {
  createSchema,
  updateSchema,
  bulkSchema,
  querySchema,
  rateLimitSchema,
  validateCreate,
  validateUpdate,
  validateBulk,
  validateQuery,
  objectId,
};