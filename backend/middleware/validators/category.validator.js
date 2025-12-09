const Joi = require('joi');

// Create schema
const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().allow('').max(1000),
}).unknown(false); 

// Update schema
const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  description: Joi.string().trim().allow('').max(1000),
}).unknown(false); 

const validateCreate = (req, res, next) => {
  const { error } = createSchema.validate(req.body);
  if (error)
    return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};

const validateUpdate = (req, res, next) => {
  const { error } = updateSchema.validate(req.body);
  if (error)
    return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};

const validateBulk = (req, res, next) => {
  const schema = Joi.object({
    ids: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .required()
      .messages({
        'array.base': 'IDs must be an array',
        'array.min': 'At least one ID is required',
        'string.pattern.base': 'Invalid ID format',
      }),
    operation: Joi.string()
      .valid('activate', 'deactivate', 'update', 'delete')
      .required()
      .messages({
        'any.only': 'Operation must be one of: activate, deactivate, update, delete',
        'string.empty': 'Operation is required',
      }),
    data: Joi.object()
      .when('operation', {
        is: 'update',
        then: Joi.object({
          name: Joi.string().trim().min(2).max(50).optional(),
          description: Joi.string().trim().max(1000).allow('').optional(),
          isActive: Joi.boolean().optional(),
        }).min(1).required(),
        otherwise: Joi.object().optional(),
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  next();
};

// Query parameters validation
const validateQuery = (req, res, next) => {
  const schema = Joi.object({
    // Pagination
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0),
    
    // Sorting
    sort: Joi.string().valid('name', 'createdAt', 'updatedAt').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string(),
    
    // Search
    search: Joi.string().trim().max(100),
    q: Joi.string().trim().max(100),
    
    // Filtering
    name: Joi.string().trim(),
    slug: Joi.string().trim(),
    isActive: Joi.boolean(),
    createdAfter: Joi.date().iso(),
    createdBefore: Joi.date().iso(),
    updatedAfter: Joi.date().iso(),
    updatedBefore: Joi.date().iso(),
    createdBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    minNameLength: Joi.number().integer().min(1).max(100),
    maxNameLength: Joi.number().integer().min(1).max(100),
    hasDescription: Joi.boolean(),
    ids: Joi.string(),
    excludeIds: Joi.string(),
    nameStartsWith: Joi.string().trim(),
    nameEndsWith: Joi.string().trim(),
    descriptionContains: Joi.string().trim(),
    
    // Data control
    fields: Joi.string(),
    excludeFields: Joi.string(),
    populate: Joi.boolean(),
    populateFields: Joi.string(),
    
    // Admin features
    showAll: Joi.boolean(),
    includeDeleted: Joi.boolean(),
    
    // Performance
    lean: Joi.boolean(),
    cache: Joi.boolean(),
    
    // Export
    format: Joi.string().valid('json', 'csv'),
    
    // Search
    query: Joi.string().trim(),
    fuzzy: Joi.boolean(),
    threshold: Joi.number().min(0).max(1),
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      details: error.details.map(d => d.message),
    });
  }

  next();
};

module.exports = { validateCreate, validateUpdate ,validateBulk,validateQuery};
