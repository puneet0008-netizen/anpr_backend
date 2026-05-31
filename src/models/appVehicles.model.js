const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:          { type: String },           // UUID
  userId:       { type: String, ref: 'ParkingUser', required: true },
  numberPlate:  { type: String },
  vehicleType:  { type: String },
  vehicleName:  { type: String },
  vehicleModel: { type: String },
  isPrimary:    { type: Boolean, default: false },
  status:       { type: String, default: 'active' },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('AppVehicle', schema);
