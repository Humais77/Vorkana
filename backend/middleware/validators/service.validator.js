const Joi = require('joi');
const mongoose = require('mongoose');

const createSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  description: Joi.string().allow('').max(2000),
  category: Joi.string().required().custom((value, helper) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helper.message('Invalid category ID');
    }
    return value;
  }),
  price: Joi.number().min(0).default(0),
  deliveryTime: Joi.number().min(1).default(3),
});

const updateSchema = Joi.object({
  title: Joi.string().min(3).max(150),
  description: Joi.string().allow('').max(2000),
  category: Joi.string().custom((value, helper) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helper.message('Invalid category ID');
    }
    return value;
  }),
  price: Joi.number().min(0),
  deliveryTime: Joi.number().min(1),
});

const validateCreate = (req, res, next) => {
  const { error } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};

const validateUpdate = (req, res, next) => {
  const { error } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  next();
};

module.exports = { validateCreate, validateUpdate };
