const Joi = require('joi');

const createVendorSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(50).required(),
  password: Joi.string()
    .min(8).max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain uppercase, lowercase, number and special character',
    }),
  phone: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'Phone must be exactly 10 digits',
  }),
});

const updateVendorSchema = Joi.object({
  phone:     Joi.string().pattern(/^\d{10}$/),
  password:  Joi.string()
    .min(8).max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  is_active: Joi.boolean(),
}).min(1);

const listQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(10),
  search:    Joi.string().trim().max(100).allow('', null),
  sortBy:    Joi.string().valid('created_at', 'username').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
  isActive:  Joi.boolean(),
});

module.exports = { createVendorSchema, updateVendorSchema, listQuerySchema };
