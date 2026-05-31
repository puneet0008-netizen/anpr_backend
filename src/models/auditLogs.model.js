const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:          { type: String },           // UUID
  actorId:      { type: String, ref: 'Account', default: null },
  actorRole:    { type: String },
  action:       { type: String },
  resourceType: { type: String },
  resourceId:   { type: String },
  details:      { type: Schema.Types.Mixed },
  ipAddress:    { type: String },
  userAgent:    { type: String },
  status:       { type: String, default: 'success' },
  createdAt:    { type: Date, default: Date.now },
}, { _id: false, id: false, versionKey: false });

module.exports = model('AuditLog', schema);
