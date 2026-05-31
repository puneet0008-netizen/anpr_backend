const Joi = require('joi');

const createVendorSchema = Joi.object({
  vendorName:         Joi.string().trim().min(2).max(255).required(),
  contactPerson:      Joi.string().trim().min(2).max(255).required(),
  phone:              Joi.string().pattern(/^\d{10}$/).required()
                        .messages({ 'string.pattern.base': 'Phone must be exactly 10 digits' }),
  email:              Joi.string().email().max(255).required(),
  city:               Joi.string().trim().max(100).required(),
  state:              Joi.string().trim().max(100).required(),
  gstin:              Joi.string().trim().uppercase().length(15).required()
                        .messages({ 'string.length': 'GSTIN must be exactly 15 characters' }),
  registeredAddress:  Joi.string().trim().max(1000).required(),
  primaryService:     Joi.string().trim().max(100).required(),
  contractStartDate:  Joi.string().isoDate().required()
                        .messages({ 'string.isoDate': 'contractStartDate must be a valid date (YYYY-MM-DD)' }),
  notes:              Joi.string().trim().max(2000).allow('', null).optional(),
  assignedSiteId:     Joi.string().uuid().allow('', null).optional(),
  password:           Joi.string().min(6).max(100).allow('', null).optional()
                        .messages({ 'string.min': 'Password must be at least 6 characters' }),
});

const updateVendorSchema = Joi.object({
  vendorName:         Joi.string().trim().min(2).max(255),
  contactPerson:      Joi.string().trim().min(2).max(255),
  phone:              Joi.string().pattern(/^\d{10}$/)
                        .messages({ 'string.pattern.base': 'Phone must be exactly 10 digits' }),
  email:              Joi.string().email().max(255),
  city:               Joi.string().trim().max(100),
  state:              Joi.string().trim().max(100),
  gstin:              Joi.string().trim().uppercase().length(15),
  registeredAddress:  Joi.string().trim().max(1000),
  primaryService:     Joi.string().trim().max(100),
  contractStartDate:  Joi.string().isoDate(),
  notes:              Joi.string().trim().max(2000).allow('', null),
  status:             Joi.string().valid('active', 'inactive'),
  assignedSiteId:     Joi.string().uuid().allow('', null).optional(),
  password:           Joi.string().min(6).max(100).allow('', null).optional()
                        .messages({ 'string.min': 'Password must be at least 6 characters' }),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const listVendorQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(10),
  search:    Joi.string().trim().max(100).allow('', null),
  status:    Joi.string().valid('active', 'inactive'),
  sortBy:    Joi.string().valid('vendor_name', 'created_at', 'city', 'status').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

module.exports = { createVendorSchema, updateVendorSchema, listVendorQuerySchema };
