const Joi = require('joi');

const createUserSchema = Joi.object({
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
  carNumber: Joi.string().trim().uppercase()
    .pattern(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid car number format (e.g. MH12AB1234)' }),
  carModel: Joi.string().trim().min(1).max(100).required(),
  carName:  Joi.string().trim().min(1).max(100).required(),
});

const updateUserSchema = Joi.object({
  phone:    Joi.string().pattern(/^\d{10}$/),
  password: Joi.string()
    .min(8).max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  carModel:  Joi.string().trim().min(1).max(100),
  carName:   Joi.string().trim().min(1).max(100),
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

module.exports = { createUserSchema, updateUserSchema, listQuerySchema };
