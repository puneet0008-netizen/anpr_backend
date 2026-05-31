const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:            { type: String },           // UUID
  userId:         { type: String, ref: 'ParkingUser', required: true },
  userName:       { type: String },
  vehicleNumber:  { type: String },
  amount:         { type: Number, required: true },
  paymentMethod:  { type: String },
  transactionRef: { type: String },
  processedBy:    { type: String, ref: 'Account', default: null },
  createdAt:      { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false });

module.exports = model('ParkingRecharge', schema);
