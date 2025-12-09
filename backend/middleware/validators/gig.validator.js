const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');

const secureAttachment = Joi.string().pattern(
  /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|pdf|doc|docx|zip|rar)$/i
);

const createSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).required(),
  fullName: Joi.string().trim().min(3).max(60).required(),
  oauthEmail: Joi.string().trim().email({ tlds: false }).max(100).required(),
  country: Joi.string().trim().max(80).required(),
  phone: Joi.string().trim().max(20).required(),
  projectCategory: objectId.required(),
  subcategory: objectId.optional(),
  description: Joi.string().trim().min(20).max(5000).required(),
  budget: Joi.number().min(5).max(100000).required(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR').default('USD'),
  timeline: Joi.string().trim().max(100).required(),
  timelineUnit: Joi.string().valid('days', 'weeks', 'months').default('days'),
  communication: Joi.string().valid('Email', 'Phone', 'Video Call', 'Any').default('Email'),
  attachments: Joi.array().max(5).items(secureAttachment),
  visibility: Joi.string().valid('public', 'private', 'invite_only').default('public'),
  urgency: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  skillsRequired: Joi.array().max(10).items(Joi.string().max(50)),
  deliverables: Joi.array().max(10).items(Joi.string().max(200)),
});

const updateSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200),
  fullName: Joi.string().trim().min(3).max(60),
  oauthEmail: Joi.string().trim().email({ tlds: false }).max(100),
  country: Joi.string().trim().max(80),
  phone: Joi.string().trim().max(20),
  projectCategory: objectId,
  subcategory: objectId,
  description: Joi.string().trim().min(20).max(5000),
  budget: Joi.number().min(5).max(100000),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR'),
  timeline: Joi.string().trim().max(100),
  timelineUnit: Joi.string().valid('days', 'weeks', 'months'),
  communication: Joi.string().valid('Email', 'Phone', 'Video Call', 'Any'),
  attachments: Joi.array().max(5).items(secureAttachment),
  status: Joi.string().valid('open', 'in_progress', 'assigned', 'completed', 'cancelled', 'closed'),
  visibility: Joi.string().valid('public', 'private', 'invite_only'),
  urgency: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  skillsRequired: Joi.array().max(10).items(Joi.string().max(50)),
  deliverables: Joi.array().max(10).items(Joi.string().max(200)),
  version: Joi.number().integer().min(1),
}).min(1);

const proposalSchema = Joi.object({
  proposal: Joi.string().trim().min(20).max(2000).required(),
  price: Joi.number().min(5).max(100000).required(),
  deliveryTime: Joi.number().min(1).max(365).required(),
  deliveryTimeUnit: Joi.string().valid('hours', 'days', 'weeks').default('days'),
});

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

const validateProposal = (req, res, next) => {
  const { error, value } = proposalSchema.validate(req.body, { abortEarly: false });
  
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

module.exports = {
  createSchema,
  updateSchema,
  proposalSchema,
  validateCreate,
  validateUpdate,
  validateProposal,
};