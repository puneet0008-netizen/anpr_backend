const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:               { type: String },           // UUID
  roleId:            { type: Number, ref: 'Role', required: true },
  usernameEncrypted: { type: String },
  usernameHash:      { type: String, unique: true },
  passwordHash:      { type: String },
  phoneEncrypted:    { type: String },
  phoneHash:         { type: String },
  isActive:          { type: Boolean, default: true },
  createdBy:         { type: String, ref: 'Account', default: null },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('Account', schema);
