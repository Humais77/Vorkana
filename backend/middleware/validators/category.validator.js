const Joi = require('joi');

const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().allow('').max(1000),
});

const validateCreate = (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    next();
}
module.exports = { validateCreate };