const Joi = require('joi');

const createSchema = Joi.object({
  fullName: Joi.string().trim().min(3).required(),
  oauthEmail: Joi.string().trim().email().required(),
  country: Joi.string().trim().required(),
  phone: Joi.string().trim().required(),
  projectCategory: Joi.string().required(),
  description: Joi.string().trim().min(20).required(),
  budget: Joi.number().min(5).required(),
  timeline: Joi.string().trim().required(),
  communication: Joi.string().valid('Email', 'Phone', 'Video Call').optional(),
  attachments: Joi.array().items(Joi.string().uri()).optional(),
});

const updateSchema = Joi.object({
  fullName: Joi.string().trim().min(3),
  oauthEmail: Joi.string().trim().email(),
  country: Joi.string().trim(),
  phone: Joi.string().trim(),
  projectCategory: Joi.string(),
  description: Joi.string().trim().min(20),
  budget: Joi.number().min(5),
  timeline: Joi.string().trim(),
  communication: Joi.string().valid('Email', 'Phone', 'Video Call'),
  attachments: Joi.array().items(Joi.string().uri()),
});

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

module.exports = { validateCreate, validateUpdate };
