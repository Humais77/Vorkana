const Joi = require('joi');
const mongoose = require('mongoose');
const { sanitizeHtml } = require('../../utils/sanitize');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');

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

// Package schema
const packageSchema = Joi.object({
  name: Joi.string().required().max(50).custom(sanitizeInput),
  description: Joi.string().max(500).custom(sanitizeInput).allow(''),
  price: Joi.number().required().min(1).max(100000),
  deliveryTime: Joi.number().required().min(1).max(365),
  revisions: Joi.number().min(0).max(99).default(0),
  features: Joi.array().items(Joi.string().max(100).custom(sanitizeInput)),
  popular: Joi.boolean().default(false),
});

// Feature schema
const featureSchema = Joi.object({
  title: Joi.string().required().max(100).custom(sanitizeInput),
  description: Joi.string().max(200).custom(sanitizeInput).allow(''),
  included: Joi.boolean().default(true),
});

// Requirement schema
const requirementSchema = Joi.object({
  question: Joi.string().required().max(200).custom(sanitizeInput),
  type: Joi.string().valid('text', 'file', 'choice', 'multiple').default('text'),
  required: Joi.boolean().default(false),
  options: Joi.array().items(Joi.string().max(50).custom(sanitizeInput)),
});

// FAQ schema
const faqSchema = Joi.object({
  question: Joi.string().required().max(200).custom(sanitizeInput),
  answer: Joi.string().required().max(500).custom(sanitizeInput),
});

// Image URL validation
const imageUrlSchema = Joi.string().pattern(
  /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i
);

// Create service schema
const createSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(5)
    .max(200)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .messages({
      'string.empty': 'Service title is required',
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
    }),
  
  description: Joi.string()
    .required()
    .min(50)
    .max(5000)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 5000 characters',
    }),
  
  shortDescription: Joi.string()
    .max(250)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .allow(''),
  
  category: objectId
    .required()
    .messages({
      'any.required': 'Category is required',
    }),
  
  subcategory: objectId.optional(),
  
  price: Joi.number()
    .required()
    .min(1)
    .max(100000)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Minimum price is $1',
      'number.max': 'Maximum price is $100,000',
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR')
    .default('USD'),
  
  deliveryTime: Joi.number()
    .required()
    .min(1)
    .max(365)
    .messages({
      'number.base': 'Delivery time must be a number',
      'number.min': 'Minimum delivery time is 1 day',
      'number.max': 'Maximum delivery time is 365 days',
    }),
  
  deliveryTimeUnit: Joi.string()
    .valid('hours', 'days', 'weeks')
    .default('days'),
  
  revisions: Joi.number()
    .min(0)
    .max(99)
    .default(1),
  
  images: Joi.array()
    .items(imageUrlSchema)
    .max(10)
    .optional(),
  
  thumbnail: imageUrlSchema.optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(30).custom(sanitizeInput))
    .max(20)
    .optional(),
  
  features: Joi.array()
    .items(featureSchema)
    .max(20)
    .optional(),
  
  requirements: Joi.array()
    .items(requirementSchema)
    .max(10)
    .optional(),
  
  faqs: Joi.array()
    .items(faqSchema)
    .max(15)
    .optional(),
  
  packages: Joi.array()
    .items(packageSchema)
    .max(3)
    .optional(),
  
  gigType: Joi.string()
    .valid('basic', 'standard', 'premium', 'custom')
    .default('basic'),
  
  status: Joi.string()
    .valid('draft', 'pending', 'active', 'paused', 'denied', 'suspended')
    .default('draft'),
  
  searchKeywords: Joi.array()
    .items(Joi.string().max(30).custom(sanitizeInput))
    .max(30)
    .optional(),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .allow(''),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .allow(''),
}).options({ stripUnknown: true });

// Update service schema
const updateSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  description: Joi.string()
    .min(50)
    .max(5000)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .optional(),
  
  shortDescription: Joi.string()
    .max(250)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .allow(''),
  
  category: objectId.optional(),
  subcategory: objectId.optional(),
  
  price: Joi.number()
    .min(1)
    .max(100000)
    .optional(),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR')
    .optional(),
  
  deliveryTime: Joi.number()
    .min(1)
    .max(365)
    .optional(),
  
  deliveryTimeUnit: Joi.string()
    .valid('hours', 'days', 'weeks')
    .optional(),
  
  revisions: Joi.number()
    .min(0)
    .max(99)
    .optional(),
  
  images: Joi.array()
    .items(imageUrlSchema)
    .max(10)
    .optional(),
  
  thumbnail: imageUrlSchema.optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(30).custom(sanitizeInput))
    .max(20)
    .optional(),
  
  features: Joi.array()
    .items(featureSchema)
    .max(20)
    .optional(),
  
  requirements: Joi.array()
    .items(requirementSchema)
    .max(10)
    .optional(),
  
  faqs: Joi.array()
    .items(faqSchema)
    .max(15)
    .optional(),
  
  packages: Joi.array()
    .items(packageSchema)
    .max(3)
    .optional(),
  
  gigType: Joi.string()
    .valid('basic', 'standard', 'premium', 'custom')
    .optional(),
  
  status: Joi.string()
    .valid('draft', 'pending', 'active', 'paused', 'denied', 'suspended')
    .optional(),
  
  isFeatured: Joi.boolean().optional(),
  isRecommended: Joi.boolean().optional(),
  isPopular: Joi.boolean().optional(),
  
  searchKeywords: Joi.array()
    .items(Joi.string().max(30).custom(sanitizeInput))
    .max(30)
    .optional(),
  
  metaTitle: Joi.string()
    .max(60)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .allow(''),
  
  metaDescription: Joi.string()
    .max(160)
    .custom((value) => sanitizeInput(value), 'XSS prevention')
    .allow(''),
  
  version: Joi.number().integer().min(1).optional(),
}).options({ stripUnknown: true });

// Bulk operations schema
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
}).options({ stripUnknown: true });

// Query validation schema
const querySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0),
  
  // Sorting
  sort: Joi.string().valid('price', 'rating', 'createdAt', 'updatedAt', 'deliveryTime', 'ordersCount', 'views', 'likes').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  sortBy: Joi.string(),
  
  // Search
  search: Joi.string().trim().max(100),
  q: Joi.string().trim().max(100),
  
  // Filtering
  title: Joi.string().trim(),
  slug: Joi.string().trim(),
  category: objectId,
  subcategory: objectId,
  seller: objectId,
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  minRating: Joi.number().min(0).max(5),
  maxRating: Joi.number().min(0).max(5),
  minDeliveryTime: Joi.number().min(1),
  maxDeliveryTime: Joi.number().min(1),
  deliveryTimeUnit: Joi.string().valid('hours', 'days', 'weeks'),
  currency: Joi.string(),
  status: Joi.string().valid('draft', 'pending', 'active', 'paused', 'denied', 'suspended'),
  gigType: Joi.string().valid('basic', 'standard', 'premium', 'custom'),
  sellerLevel: Joi.string().valid('new', 'level1', 'level2', 'toprated'),
  isFeatured: Joi.boolean(),
  isRecommended: Joi.boolean(),
  isPopular: Joi.boolean(),
  hasImages: Joi.boolean(),
  hasPackages: Joi.boolean(),
  hasFaqs: Joi.boolean(),
  tags: Joi.string(),
  createdAfter: Joi.date().iso(),
  createdBefore: Joi.date().iso(),
  updatedAfter: Joi.date().iso(),
  updatedBefore: Joi.date().iso(),
  publishedAfter: Joi.date().iso(),
  publishedBefore: Joi.date().iso(),
  
  // Data control
  fields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  excludeFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  populate: Joi.boolean().default(true),
  populateFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  includeSeller: Joi.boolean(),
  includeCategory: Joi.boolean(),
  includeReviews: Joi.boolean(),
  includeStats: Joi.boolean(),
  
  // Security
  showAll: Joi.boolean(),
  includeInactive: Joi.boolean(),
  lean: Joi.boolean().default(true),
  cache: Joi.boolean().default(false),
  
  // Export
  format: Joi.string().valid('json', 'csv'),
}).options({ stripUnknown: true });

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
  validateCreate,
  validateUpdate,
  validateBulk,
  validateQuery,
};