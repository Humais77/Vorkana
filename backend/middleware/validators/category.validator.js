const Joi = require('joi');

// Create schema
const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().allow('').max(1000),
});

// Update schema - all fields optional
const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  description: Joi.string().trim().allow('').max(1000),
});

// Middleware
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
