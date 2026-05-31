const Joi = require('joi');

const ROLES         = ['Manager', 'Operator', 'Finance', 'Super Admin'];
const ACCESS_LEVELS = ['Read Only', 'Read+Write', 'Full Access', 'Finance Module'];

const createPortalUserSchema = Joi.object({
  name:         Joi.string().trim().min(2).max(255).required(),
  email:        Joi.string().email().max(255).required(),
  tempPassword: Joi.string().min(8).max(100)
                  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
                  .required()
                  .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character' }),
  role:         Joi.string().valid(...ROLES).required()
                  .messages({ 'any.only': `role must be one of: ${ROLES.join(', ')}` }),
  accessLevel:  Joi.string().valid(...ACCESS_LEVELS).required()
                  .messages({ 'any.only': `accessLevel must be one of: ${ACCESS_LEVELS.join(', ')}` }),
});

const updatePortalUserSchema = Joi.object({
  name:        Joi.string().trim().min(2).max(255),
  email:       Joi.string().email().max(255),
  password:    Joi.string().min(8).max(100)
                 .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
                 .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character' }),
  role:        Joi.string().valid(...ROLES)
                 .messages({ 'any.only': `role must be one of: ${ROLES.join(', ')}` }),
  accessLevel: Joi.string().valid(...ACCESS_LEVELS)
                 .messages({ 'any.only': `accessLevel must be one of: ${ACCESS_LEVELS.join(', ')}` }),
  status:      Joi.string().valid('active', 'inactive'),
}).min(1);

const toggleStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

module.exports = { createPortalUserSchema, updatePortalUserSchema, toggleStatusSchema };
