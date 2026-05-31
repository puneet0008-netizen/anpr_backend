const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:               { type: String },           // UUID
  vendorName:        { type: String, required: true },
  contactPerson:     { type: String },
  phone:             { type: String },
  email:             { type: String },
  city:              { type: String },
  state:             { type: String },
  gstin:             { type: String, unique: true },
  registeredAddress: { type: String },
  primaryService:    { type: String },
  contractStartDate: { type: Date },
  notes:             { type: String, default: null },
  status:            { type: String, default: 'active' },
  lastOrderDate:     { type: Date, default: null },
  assignedSiteId:    { type: String, ref: 'ParkingSite', default: null },
  accountId:         { type: String, ref: 'Account', default: null },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('Vendor', schema);
