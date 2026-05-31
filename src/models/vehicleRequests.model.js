const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:            { type: String },           // UUID
  userId:         { type: String, ref: 'ParkingUser', required: true },
  vehicleId:      { type: String, ref: 'AppVehicle', default: null },
  requestType:    { type: String },
  currentValue:   { type: String },
  requestedValue: { type: String },
  reason:         { type: String },
  status:         { type: String, default: 'pending' },
  adminNote:      { type: String },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('VehicleRequest', schema);
