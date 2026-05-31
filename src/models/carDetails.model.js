const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:                { type: String },           // UUID
  accountId:          { type: String, ref: 'Account', unique: true, required: true },
  carNumberEncrypted: { type: String },
  carNumberHash:      { type: String },
  carModel:           { type: String },
  carName:            { type: String },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('CarDetail', schema);
