const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:       { type: String },
  userId:    { type: String, ref: 'ParkingUser', required: true },
  token:     { type: String, required: true },
  platform:  { type: String, default: 'android' },
  deviceId:  { type: String, default: null },
}, { _id: false, id: false, versionKey: false, timestamps: true });

schema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = model('DeviceToken', schema);
