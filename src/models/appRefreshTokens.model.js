const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:       { type: String },           // UUID
  userId:    { type: String, ref: 'ParkingUser', required: true },
  tokenHash: { type: String, unique: true, required: true },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('AppRefreshToken', schema);
