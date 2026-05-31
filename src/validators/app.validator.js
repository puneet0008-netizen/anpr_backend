const Joi = require('joi')

// ─── Auth ─────────────────────────────────────────────────────────────────────

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
})

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
})

// ─── Profile ──────────────────────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  name:     Joi.string().min(2).max(255),
  phone:    Joi.string().min(7).max(20),
  username: Joi.string().min(3).max(100),
  password: Joi.string().min(6).max(100),
}).min(1)

// ─── Vehicle ──────────────────────────────────────────────────────────────────

const addVehicleSchema = Joi.object({
  numberPlate:  Joi.string().min(3).max(20).required(),
  vehicleType:  Joi.string().valid('two_wheeler', 'four_wheeler').required(),
  vehicleName:  Joi.string().min(1).max(100).required(),
  vehicleModel: Joi.string().min(1).max(100).required(),
})

const plateChangeSchema = Joi.object({
  newPlate: Joi.string().min(3).max(20).required(),
  reason:   Joi.string().max(500),
})

const slotSwapSchema = Joi.object({
  requestedSlot: Joi.string().max(100),
  reason:        Joi.string().max(500),
})

const removeVehicleSchema = Joi.object({
  reason: Joi.string().max(500),
})

// ─── Wallet ───────────────────────────────────────────────────────────────────

const rechargeSchema = Joi.object({
  amount:        Joi.number().valid(100, 500, 1000).required(),
  paymentMethod: Joi.string().valid('Cash', 'UPI', 'Card').default('UPI'),
})

// ─── Visitor ──────────────────────────────────────────────────────────────────

const inviteVisitorSchema = Joi.object({
  visitorName:      Joi.string().min(2).max(255).required(),
  visitorPhone:     Joi.string().min(7).max(20).required(),
  visitorCarNumber: Joi.string().min(3).max(50).required(),
  purpose:          Joi.string().min(2).max(255).required(),
  visitDate:        Joi.string().isoDate().required(),
  visitTime:        Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required()
                      .messages({ 'string.pattern.base': 'visitTime must be HH:MM or HH:MM:SS' }),
  durationHours:   Joi.number().integer().min(0).max(24).default(1),
  durationMinutes: Joi.number().integer().min(0).max(59).default(0),
})

module.exports = {
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  addVehicleSchema,
  plateChangeSchema,
  slotSwapSchema,
  removeVehicleSchema,
  rechargeSchema,
  inviteVisitorSchema,
}
