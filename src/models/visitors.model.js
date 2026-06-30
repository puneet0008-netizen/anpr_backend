const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:              { type: String },           // UUID
  invitedBy:        { type: String, ref: 'ParkingUser', default: null },
  visitorName:      { type: String },
  visitorPhone:     { type: String },
  visitorCarNumber: { type: String },
  purpose:          { type: String },
  fromDate:         { type: Date },
  toDate:           { type: Date },
  fromTime:         { type: String },
  toTime:           { type: String },
  validFrom:        { type: Date },
  validUntil:       { type: Date },
  validityText:     { type: String },
  visitDate:        { type: Date },
  visitTime:        { type: String },
  durationHours:    { type: Number, default: 1 },
  durationMinutes:  { type: Number, default: 0 },
  trackingNumber:   { type: String, unique: true },
  status:           { type: String, default: 'pending' },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('Visitor', schema);
