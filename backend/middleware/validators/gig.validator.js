const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'Invalid ID format'
});

const secureAttachment = Joi.string().pattern(
  /^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|pdf|doc|docx|zip|rar)$/i
).messages({
  'string.pattern.base': 'Invalid attachment filename format'
});

const secureDocument = Joi.string().pattern(
  /^\/uploads\/[a-f0-9-]{20,64}\.(pdf|doc|docx)$/i
).messages({
  'string.pattern.base': 'Invalid document filename format'
});

const cloudinaryImage = Joi.object({
  url: Joi.string().uri().required(),
  public_id: Joi.string().required(),
  width: Joi.number().integer().min(1),
  height: Joi.number().integer().min(1),
  size: Joi.number().integer().min(1),
  format: Joi.string(),
  uploadedAt: Joi.date()
});

const thumbnailSchema = Joi.object({
  url: Joi.string().uri(),
  public_id: Joi.string(),
  width: Joi.number().integer().min(1),
  height: Joi.number().integer().min(1),
  size: Joi.number().integer().min(1),
  format: Joi.string(),
  uploadedAt: Joi.date()
});

// Create schema
const createSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
    }),
    
  fullName: Joi.string().trim().min(3).max(60).required()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 3 characters',
      'string.max': 'Full name cannot exceed 60 characters',
    }),
    
  oauthEmail: Joi.string().trim().email({ tlds: false }).max(100).required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format',
      'string.max': 'Email cannot exceed 100 characters',
    }),
    
  country: Joi.string().trim().max(80).required()
    .messages({
      'string.empty': 'Country is required',
      'string.max': 'Country cannot exceed 80 characters',
    }),
    
  phone: Joi.string().trim().max(20).required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.max': 'Phone cannot exceed 20 characters',
    }),
    
  projectCategory: objectId.required()
    .messages({
      'any.required': 'Project category is required',
      'any.invalid': 'Invalid category ID',
    }),
    
  subcategory: objectId.optional()
    .messages({
      'any.invalid': 'Invalid subcategory ID',
    }),
    
  description: Joi.string().trim().min(20).max(5000).required()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 20 characters',
      'string.max': 'Description cannot exceed 5000 characters',
    }),
    
  budget: Joi.number().min(5).max(100000).required()
    .messages({
      'number.base': 'Budget must be a number',
      'number.min': 'Minimum budget is $5',
      'number.max': 'Maximum budget is $100,000',
      'any.required': 'Budget is required',
    }),
    
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR').default('USD')
    .messages({
      'any.only': 'Invalid currency',
    }),
    
  timeline: Joi.string().trim().max(100).required()
    .messages({
      'string.empty': 'Timeline is required',
      'string.max': 'Timeline cannot exceed 100 characters',
    }),
    
  timelineUnit: Joi.string().valid('days', 'weeks', 'months').default('days')
    .messages({
      'any.only': 'Invalid timeline unit',
    }),
    
  communication: Joi.string().valid('Email', 'Phone', 'Video Call', 'Any').default('Email')
    .messages({
      'any.only': 'Invalid communication method',
    }),
    
  // Image fields
  images: Joi.array().max(10).items(cloudinaryImage)
    .messages({
      'array.max': 'Cannot upload more than 10 images',
    }),
    
  thumbnail: thumbnailSchema.optional(),
    
  attachments: Joi.array().max(5).items(secureAttachment)
    .messages({
      'array.max': 'Cannot upload more than 5 attachments',
    }),
    
  visibility: Joi.string().valid('public', 'private', 'invite_only').default('public')
    .messages({
      'any.only': 'Invalid visibility setting',
    }),
    
  urgency: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
    .messages({
      'any.only': 'Invalid urgency level',
    }),
    
  skillsRequired: Joi.array().max(10).items(Joi.string().max(50))
    .messages({
      'array.max': 'Cannot have more than 10 skills',
      'string.max': 'Skill cannot exceed 50 characters',
    }),
    
  deliverables: Joi.array().max(10).items(Joi.string().max(200))
    .messages({
      'array.max': 'Cannot have more than 10 deliverables',
      'string.max': 'Deliverable cannot exceed 200 characters',
    }),
    
  files: Joi.array().max(10).items(secureAttachment)
    .messages({
      'array.max': 'Cannot upload more than 10 files',
    }),
    
  requirementsDocument: secureDocument.optional(),
    
  deadline: Joi.date().greater('now').optional()
    .messages({
      'date.greater': 'Deadline must be in the future',
    }),
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Update schema
const updateSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200)
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
    }),
    
  fullName: Joi.string().trim().min(3).max(60)
    .messages({
      'string.min': 'Full name must be at least 3 characters',
      'string.max': 'Full name cannot exceed 60 characters',
    }),
    
  oauthEmail: Joi.string().trim().email({ tlds: false }).max(100)
    .messages({
      'string.email': 'Invalid email format',
      'string.max': 'Email cannot exceed 100 characters',
    }),
    
  country: Joi.string().trim().max(80)
    .messages({
      'string.max': 'Country cannot exceed 80 characters',
    }),
    
  phone: Joi.string().trim().max(20)
    .messages({
      'string.max': 'Phone cannot exceed 20 characters',
    }),
    
  projectCategory: objectId
    .messages({
      'any.invalid': 'Invalid category ID',
    }),
    
  subcategory: objectId
    .messages({
      'any.invalid': 'Invalid subcategory ID',
    }),
    
  description: Joi.string().trim().min(20).max(5000)
    .messages({
      'string.min': 'Description must be at least 20 characters',
      'string.max': 'Description cannot exceed 5000 characters',
    }),
    
  budget: Joi.number().min(5).max(100000)
    .messages({
      'number.base': 'Budget must be a number',
      'number.min': 'Minimum budget is $5',
      'number.max': 'Maximum budget is $100,000',
    }),
    
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR')
    .messages({
      'any.only': 'Invalid currency',
    }),
    
  timeline: Joi.string().trim().max(100)
    .messages({
      'string.max': 'Timeline cannot exceed 100 characters',
    }),
    
  timelineUnit: Joi.string().valid('days', 'weeks', 'months')
    .messages({
      'any.only': 'Invalid timeline unit',
    }),
    
  communication: Joi.string().valid('Email', 'Phone', 'Video Call', 'Any')
    .messages({
      'any.only': 'Invalid communication method',
    }),
    
  // Image fields for update
  images: Joi.array().max(10).items(cloudinaryImage)
    .messages({
      'array.max': 'Cannot upload more than 10 images',
    }),
    
  thumbnail: thumbnailSchema,
    
  attachments: Joi.array().max(5).items(secureAttachment)
    .messages({
      'array.max': 'Cannot upload more than 5 attachments',
    }),
    
  status: Joi.string().valid('open', 'in_progress', 'assigned', 'completed', 'cancelled', 'closed')
    .messages({
      'any.only': 'Invalid status',
    }),
    
  visibility: Joi.string().valid('public', 'private', 'invite_only')
    .messages({
      'any.only': 'Invalid visibility setting',
    }),
    
  urgency: Joi.string().valid('low', 'medium', 'high', 'urgent')
    .messages({
      'any.only': 'Invalid urgency level',
    }),
    
  skillsRequired: Joi.array().max(10).items(Joi.string().max(50))
    .messages({
      'array.max': 'Cannot have more than 10 skills',
      'string.max': 'Skill cannot exceed 50 characters',
    }),
    
  deliverables: Joi.array().max(10).items(Joi.string().max(200))
    .messages({
      'array.max': 'Cannot have more than 10 deliverables',
      'string.max': 'Deliverable cannot exceed 200 characters',
    }),
    
  files: Joi.array().max(10).items(secureAttachment)
    .messages({
      'array.max': 'Cannot upload more than 10 files',
    }),
    
  requirementsDocument: secureDocument,
    
  deadline: Joi.date().greater('now')
    .messages({
      'date.greater': 'Deadline must be in the future',
    }),
    
  version: Joi.number().integer().min(1)
    .messages({
      'number.base': 'Version must be a number',
      'number.min': 'Version must be at least 1',
    }),
}).min(1).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Query schema
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0),
  
  sort: Joi.string().valid('budget', 'createdAt', 'updatedAt', 'deadline', 'urgency', 'title').default('createdAt'),
  order: Joi.string().valid('asc', 'desc', '1', '-1').default('desc'),
  sortBy: Joi.string(),
  
  search: Joi.string().trim().max(100),
  q: Joi.string().trim().max(100),
  
  title: Joi.string().trim().max(100),
  slug: Joi.string().trim().max(100),
  projectCategory: objectId,
  subcategory: objectId,
  createdBy: objectId,
  assignedTo: objectId,
  minBudget: Joi.number().min(0),
  maxBudget: Joi.number().min(0),
  currency: Joi.string(),
  status: Joi.string().valid('open', 'in_progress', 'assigned', 'completed', 'cancelled', 'closed'),
  urgency: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  visibility: Joi.string().valid('public', 'private', 'invite_only'),
  paymentStatus: Joi.string().valid('pending', 'partial', 'completed', 'refunded', 'disputed'),
  disputeStatus: Joi.string().valid('none', 'open', 'resolved', 'escalated'),
  hasImages: Joi.boolean(),
  hasAttachments: Joi.boolean(),
  hasMilestones: Joi.boolean(),
  skillsRequired: Joi.string().max(500),
  createdAfter: Joi.date().iso(),
  createdBefore: Joi.date().iso(),
  updatedAfter: Joi.date().iso(),
  updatedBefore: Joi.date().iso(),
  deadlineAfter: Joi.date().iso(),
  deadlineBefore: Joi.date().iso(),
  ids: Joi.string().pattern(/^[a-f0-9,]{24,}$/),
  excludeIds: Joi.string().pattern(/^[a-f0-9,]{24,}$/),
  
  fields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  excludeFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  populate: Joi.boolean().default(true),
  populateFields: Joi.string().pattern(/^[a-zA-Z0-9_,\s]+$/),
  showAll: Joi.boolean(),
  includeCategory: Joi.boolean().default(true),
  includeCreator: Joi.boolean().default(true),
  includeAssignee: Joi.boolean().default(true),
  lean: Joi.boolean().default(true),
  cache: Joi.boolean().default(false),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
  convert: true 
});

// Middleware functions
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
  querySchema,
  validateCreate,
  validateUpdate,
  validateQuery,
  objectId,
};