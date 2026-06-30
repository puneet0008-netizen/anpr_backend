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

const visitorTimePattern = /^\d{1,2}:\d{2}(:\d{2})?$/
const visitorTimeMessage = { 'string.pattern.base': 'Time must be HH:MM or HH:MM:SS' }

const inviteVisitorCommon = {
  visitorName:  Joi.string().min(2).max(255).required(),
  visitorPhone: Joi.string().min(7).max(20).required(),
  purpose:      Joi.string().min(2).max(255).required(),
}

const inviteVisitorDateRangeSchema = Joi.object({
  ...inviteVisitorCommon,
  visitorCarNumber: Joi.string().max(50).allow('', null),
  fromDate: Joi.string().isoDate().required(),
  toDate:   Joi.string().isoDate().required(),
  fromTime: Joi.string().pattern(visitorTimePattern).required().messages(visitorTimeMessage),
  toTime:   Joi.string().pattern(visitorTimePattern).required().messages(visitorTimeMessage),
})

const inviteVisitorLegacySchema = Joi.object({
  ...inviteVisitorCommon,
  visitorCarNumber: Joi.string().min(3).max(50).required(),
  visitDate: Joi.string().isoDate().required(),
  visitTime: Joi.string().pattern(visitorTimePattern).required().messages(visitorTimeMessage),
  durationHours:   Joi.number().integer().min(0).max(24 * 30).default(1),
  durationMinutes: Joi.number().integer().min(0).max(59).default(0),
})

const inviteVisitorSchema = Joi.alternatives().try(
  inviteVisitorDateRangeSchema,
  inviteVisitorLegacySchema,
)

const registerDeviceTokenSchema = Joi.object({
  token:    Joi.string().min(10).required(),
  platform: Joi.string().valid('android', 'ios', 'web').default('android'),
  deviceId: Joi.string().max(255).allow(null, ''),
})

const removeDeviceTokenSchema = Joi.object({
  token: Joi.string().min(10).required(),
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
  registerDeviceTokenSchema,
  removeDeviceTokenSchema,
}
