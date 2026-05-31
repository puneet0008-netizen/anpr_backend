const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:                  { type: String },           // UUID
  siteName:             { type: String, required: true },
  location:             { type: String },
  type:                 { type: String },
  totalCapacity:        { type: Number, default: 0 },
  occupied:             { type: Number, default: 0 },
  hourlyRate:           { type: Number, default: 0 },
  dailyRate:            { type: Number, default: 0 },
  monthlyRate:          { type: Number, default: 0 },
  status:               { type: String, default: 'active' },
  assignedVendorId:     { type: String, ref: 'Vendor', default: null },
  entryCameraIp:        { type: String },
  exitCameraIp:         { type: String },
  barrierControllerIp:  { type: String },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('ParkingSite', schema);
