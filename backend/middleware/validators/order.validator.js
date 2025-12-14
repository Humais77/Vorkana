const Joi = require('joi');
const mongoose = require('mongoose');
const { sanitizeHtml } = require('../../utils/sanitize.js');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'Invalid ID format'
});

// Requirement validation
const requirementSchema = Joi.object({
  question: Joi.string().required().max(200),
  answer: Joi.alternatives().conditional('type', {
    is: 'file',
    then: Joi.string().optional(),
    otherwise: Joi.string().required().max(5000)
  }),
  fileUrl: Joi.string().when('type', {
    is: 'file',
    then: Joi.string().required().pattern(/^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|txt|zip|rar)$/i),
    otherwise: Joi.string().optional()
  }),
  files: Joi.array().items(Joi.string().pattern(/^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|txt|zip|rar)$/i)),
  type: Joi.string().valid('text', 'file', 'choice', 'multiple').default('text'),
  options: Joi.array().items(Joi.string().max(100)),
  required: Joi.boolean().default(false)
});

// Extra validation
const extraSchema = Joi.object({
  title: Joi.string().required().max(100),
  description: Joi.string().max(500),
  price: Joi.number().required().min(0.01).max(10000),
  quantity: Joi.number().integer().min(1).max(99).default(1)
});

// Discount validation
const discountSchema = Joi.object({
  code: Joi.string().max(50),
  amount: Joi.number().min(0),
  percentage: Joi.number().min(0).max(100),
  type: Joi.string().valid('amount', 'percentage')
});

// Create order schema
const createOrderSchema = Joi.object({
  service: objectId.required().messages({
    'any.required': 'Service is required',
    'any.invalid': 'Invalid service ID'
  }),
  
  package: objectId.optional().allow(null).messages({
    'any.invalid': 'Invalid package ID'
  }),
  
  quantity: Joi.number().integer().min(1).max(99).default(1).messages({
    'number.base': 'Quantity must be a number',
    'number.min': 'Minimum quantity is 1',
    'number.max': 'Maximum quantity is 99'
  }),
  
  requirements: Joi.array().items(requirementSchema).max(20).optional().messages({
    'array.max': 'Cannot have more than 20 requirements'
  }),
  
  extras: Joi.array().items(extraSchema).max(10).optional().messages({
    'array.max': 'Cannot have more than 10 extras'
  }),
  
  discount: discountSchema.optional(),
  
  paymentMethod: Joi.string().valid('wallet', 'credit_card', 'bank_transfer', 'paypal', 'crypto', 'cash').default('wallet').messages({
    'any.only': 'Invalid payment method'
  }),
  
  notes: Joi.string().max(2000).optional().allow(''),
  
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR').default('USD').messages({
    'any.only': 'Invalid currency'
  })
}).options({
  stripUnknown: true,
  abortEarly: false
});

// Update order schema
const updateOrderSchema = Joi.object({
  status: Joi.string().valid(
    'accepted', 'in_progress', 'delivered', 'revision', 
    'completed', 'cancelled'
  ).optional().messages({
    'any.only': 'Invalid status'
  }),
  
  reason: Joi.string().max(500).optional().allow(''),
  
  notes: Joi.string().max(2000).optional().allow('')
}).min(1).options({
  stripUnknown: true,
  abortEarly: false
});

// Query validation schema
const querySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Sorting
  sort: Joi.string().valid('createdAt', 'updatedAt', 'totalAmount', 'deadlineAt', 'status').default('createdAt'),
  order: Joi.string().valid('asc', 'desc', '1', '-1').default('desc'),
  
  // Filtering
  status: Joi.string().valid(
    'pending', 'accepted', 'in_progress', 'delivered', 
    'revision', 'completed', 'cancelled', 'expired'
  ),
  service: objectId,
  seller: objectId,
  buyer: objectId,
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(0),
  createdAfter: Joi.date().iso(),
  createdBefore: Joi.date().iso(),
  
  // Search
  orderNumber: Joi.string().pattern(/^ORD-[0-9A-Z-]+$/i),
  
  // Data control
  includeService: Joi.boolean().default(true),
  includeSeller: Joi.boolean().default(false),
  includeBuyer: Joi.boolean().default(false),
  
  // Role-based filters
  role: Joi.string().valid('seller', 'buyer'),
  showAll: Joi.boolean().default(false)
}).options({
  stripUnknown: true,
  abortEarly: false,
  convert: true
});

// Validation middleware
const validateCreateOrder = (req, res, next) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body, {
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
        message: 'Order validation failed',
        errors: messages,
        code: 'ORDER_VALIDATION_ERROR',
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

const validateUpdateOrder = (req, res, next) => {
  try {
    const { error, value } = updateOrderSchema.validate(req.body, {
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
        message: 'Order update validation failed',
        errors: messages,
        code: 'UPDATE_VALIDATION_ERROR',
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

const validateOrderQuery = (req, res, next) => {
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
    if (value.order === 'asc' || value.order === '1') {
      value.order = 1;
    } else if (value.order === 'desc' || value.order === '-1') {
      value.order = -1;
    }
    
    // Security: Limit max results for non-admin users
    if (!req.user?.role === 'admin' && value.limit > 50) {
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
  createOrderSchema,
  updateOrderSchema,
  querySchema,
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderQuery,
  objectId
};