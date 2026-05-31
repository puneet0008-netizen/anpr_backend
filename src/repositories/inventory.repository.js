const InventoryItem = require('../models/inventoryItems.model');
const Vendor        = require('../models/vendors.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Compute status label from qty values.
 */
const _statusLabel = (totalQty, availableQty) => {
  if (totalQty === 0) return 'Critical';
  const ratio = availableQty / totalQty;
  if (ratio <= 0.10) return 'Critical';
  if (ratio <= 0.25) return 'Low Stock';
  return 'In Stock';
};

/**
 * Enrich a lean doc with vendorName and computed status.
 */
const _enrich = async (doc) => {
  if (!doc) return null;
  if (doc.vendorId) {
    const vendor = await Vendor.findById(doc.vendorId).lean();
    doc.vendorName = vendor ? vendor.vendorName : null;
  } else {
    doc.vendorName = null;
  }
  doc.status = _statusLabel(doc.totalQty, doc.availableQty);
  return doc;
};

const findAll = async ({ search, status, vendorId, limit, offset, sortBy = 'createdAt', sortOrder = 'DESC' }) => {
  const filter = {};

  if (search)   filter.itemName = new RegExp(search, 'i');
  if (vendorId) filter.vendorId = vendorId;

  const allowedSort = ['itemName', 'createdAt', 'availableQty', 'totalQty'];
  const col          = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir      = sortOrder === 'ASC' ? 1 : -1;

  let docs = await InventoryItem.find(filter).sort({ [col]: sortDir }).lean();

  // Enrich so we can filter by computed status
  const enriched = await Promise.all(docs.map(_enrich));

  // Apply status filter post-enrichment (computed field)
  const filtered = status ? enriched.filter(d => d.status === status) : enriched;

  const total   = filtered.length;
  const page    = filtered.slice(offset, offset + limit);

  return { rows: page, total };
};

const findById = async (id) => {
  const doc = await InventoryItem.findById(id).lean();
  return _enrich(doc);
};

const create = async (d) => {
  const doc = new InventoryItem({
    _id:          uuidv4(),
    itemName:     d.itemName,
    totalQty:     d.totalQty,
    availableQty: d.availableQty,
    unit:         d.unit,
    vendorId:     d.vendorId || null,
  });
  await doc.save();
  return findById(doc._id);
};

const updateById = async (id, d) => {
  const map = { itemName: 'itemName', totalQty: 'totalQty', availableQty: 'availableQty', unit: 'unit', vendorId: 'vendorId' };
  const update = {};
  for (const [key, field] of Object.entries(map)) {
    if (d[key] !== undefined) update[field] = d[key];
  }
  if (!Object.keys(update).length) return findById(id);
  await InventoryItem.findByIdAndUpdate(id, { $set: update });
  return findById(id);
};

const deleteById = async (id) => {
  await InventoryItem.findByIdAndDelete(id);
};

module.exports = { findAll, findById, create, updateById, deleteById };
