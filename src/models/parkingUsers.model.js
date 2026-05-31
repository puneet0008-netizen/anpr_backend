const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:            { type: String },           // UUID
  type:           { type: String, default: 'web' },
  name:           { type: String },
  email:          { type: String, unique: true },
  phone:          { type: String },
  vehicleNumber:  { type: String },
  passwordHash:   { type: String },
  status:         { type: String, default: 'active' },
  profilePhoto:   { type: String },
  allottedSlots:  { type: Number, default: 1 },
  vendorId:       { type: String, ref: 'Vendor', default: null },
  assignedSiteId: { type: String, ref: 'ParkingSite', default: null },
  slotNumber:     { type: String },
  joinedAt:       { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('ParkingUser', schema);
