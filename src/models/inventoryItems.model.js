const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id:          { type: String },           // UUID
  itemName:     { type: String, required: true },
  totalQty:     { type: Number, default: 0 },
  availableQty: { type: Number, default: 0 },
  unit:         { type: String, default: 'pcs' },
  vendorId:     { type: String, ref: 'Vendor', default: null },
}, { _id: false, id: false, versionKey: false, timestamps: true });

module.exports = model('InventoryItem', schema);
