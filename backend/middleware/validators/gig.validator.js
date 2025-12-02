const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');


const secureAttachment = Joi.string().pattern(
  /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|pdf|zip)$/i
);

const createSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(60).required(),
  oauthEmail: Joi.string().trim().email({ tlds: false }).max(100).required(),
  country: Joi.string().trim().max(80).required(),
  phone: Joi.string().trim().max(20).required(),
  projectCategory: objectId.required(),
  description: Joi.string().trim().min(20).max(2000).required(),
  budget: Joi.number().min(5).max(100000).required(),
  timeline: Joi.string().trim().max(100).required(),
  communication: Joi.string().valid('Email', 'Phone', 'Video Call'),
  attachments: Joi.array().max(5).items(secureAttachment),
});

const updateSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(60),
  oauthEmail: Joi.string().trim().email({ tlds: false }).max(100),
  country: Joi.string().trim().max(80),
  phone: Joi.string().trim().max(20),
  projectCategory: objectId,
  description: Joi.string().trim().min(20).max(2000),
  budget: Joi.number().min(5).max(100000),
  timeline: Joi.string().trim().max(100),
  communication: Joi.string().valid('Email', 'Phone', 'Video Call'),
  attachments: Joi.array().max(5).items(secureAttachment),
}).min(1);

const validateCreate = (req, res, next) => {
  const { error } = createSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details[0].message.replace(/"/g, "'");
    return res.status(400).json({ success: false, message });
  }
  next();
};

const validateUpdate = (req, res, next) => {
  const { error } = updateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details[0].message.replace(/"/g, "'");
    return res.status(400).json({ success: false, message });
  }
  next();
};

module.exports = { validateCreate, validateUpdate };