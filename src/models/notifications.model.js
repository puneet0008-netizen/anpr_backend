const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:       { type: String },           // UUID
  userId:    { type: String, ref: 'ParkingUser', required: true },
  title:     { type: String },
  message:   { type: String },
  type:      { type: String },
  data:      { type: Schema.Types.Mixed, default: null },
  isRead:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false });

module.exports = model('Notification', schema);
