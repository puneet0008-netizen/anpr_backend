const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:         Number,
  name:        { type: String, required: true, unique: true },
  description: String,
  createdAt:   { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false });

module.exports = model('Role', schema);
