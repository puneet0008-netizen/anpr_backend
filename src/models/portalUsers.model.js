const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:         { type: String },           // UUID
  name:        { type: String },
  email:       { type: String, unique: true },
  passwordHash:{ type: String },
  role:        { type: String },
  accessLevel: { type: String },
  status:      { type: String, default: 'active' },
  lastLoginAt: { type: Date, default: null },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('PortalUser', schema);
