const Joi = require('joi');

const schema = Joi.object({
    title: Joi.string().min(3).max(150).required(),
  description: Joi.string().allow('').max(2000),
  category: Joi.string().hex().length(24).required(),
  price: Joi.number().min(0).required(),
  deliveryTime: Joi.number().min(1).default(3)
});

const validateCreate = (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });
  next();
};
module.exports = { validateCreate };
