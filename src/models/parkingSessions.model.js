const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:             { type: String },           // UUID
  vehicleId:       { type: String, ref: 'AppVehicle', default: null },
  userId:          { type: String, ref: 'ParkingUser', default: null },
  siteId:          { type: String, ref: 'ParkingSite', default: null },
  numberPlate:         { type: String },
  parkingName:         { type: String },
  vehicleName:         { type: String },
  vehicleModel:        { type: String },
  vehicleType:         { type: String },
  entryPlateImageUrl:  { type: String },
  entryCarImageUrl:    { type: String },
  exitPlateImageUrl:   { type: String },
  exitCarImageUrl:     { type: String },
  entryTime:       { type: Date, default: Date.now },
  exitTime:        { type: Date },
  durationMinutes: { type: Number },
  fee:             { type: Number, default: 0 },
  isMonthly:       { type: Boolean, default: false },
  status:          { type: String, default: 'active' },
  createdAt:       { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false });

module.exports = model('ParkingSession', schema);
