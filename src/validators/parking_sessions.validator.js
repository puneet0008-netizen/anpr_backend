const Joi = require('joi');

const entrySchema = Joi.object({
  platenumber:  Joi.string().trim().min(1).max(20).required(),
  parking_name: Joi.string().trim().min(1).max(255).required(),
  status:       Joi.string().valid('IN', 'OUT', 'in', 'out').uppercase().required(),
  plate_image:  Joi.string().min(10).required(),
  car_image:    Joi.string().min(10).required(),
});

module.exports = { entrySchema };
