const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:            { type: String },           // UUID
  userId:         { type: String, ref: 'ParkingUser', unique: true, required: true },
  balance:        { type: Number, default: 0 },
  totalRecharges: { type: Number, default: 0 },
  lastRechargeAt: { type: Date, default: null },
  updatedAt:      { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false });

module.exports = model('ParkingWallet', schema);
