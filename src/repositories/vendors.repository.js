const Vendor        = require('../models/vendors.model');
const InventoryItem = require('../models/inventoryItems.model');
const ParkingSite   = require('../models/parkingSites.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Enrich a vendor doc with counts and assigned site name.
 */
const _enrich = async (doc, { includeSitesList = false } = {}) => {
  if (!doc) return null;

  const [itemsCount, contractsCount, site] = await Promise.all([
    InventoryItem.countDocuments({ vendorId: doc._id }),
    ParkingSite.countDocuments({ assignedVendorId: doc._id }),
    doc.assignedSiteId ? ParkingSite.findById(doc.assignedSiteId, { siteName: 1 }).lean() : null,
  ]);

  doc.items_count      = itemsCount;
  doc.contracts_count  = contractsCount;
  doc.assigned_site_name = site?.siteName || null;

  if (includeSitesList) {
    const sites = await ParkingSite.find({ assignedVendorId: doc._id }, { siteName: 1 }).lean();
    doc.assigned_parking_sites = sites.map(s => s.siteName);
  }

  return doc;
};

const findAll = async ({ search, status, limit, offset, sortBy = 'createdAt', sortOrder = 'DESC' }) => {
  const filter = {};
  if (search) filter.$or = [
    { vendorName:     new RegExp(search, 'i') },
    { contactPerson:  new RegExp(search, 'i') },
    { city:           new RegExp(search, 'i') },
  ];
  if (status) filter.status = status;

  const allowedSort = ['vendorName', 'createdAt', 'city', 'status'];
  const col         = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir     = sortOrder === 'ASC' ? 1 : -1;

  const [docs, total] = await Promise.all([
    Vendor.find(filter).sort({ [col]: sortDir }).skip(offset).limit(limit).lean(),
    Vendor.countDocuments(filter),
  ]);

  const rows = await Promise.all(docs.map(d => _enrich(d)));
  return { rows, total };
};

const findById = async (id) => {
  const doc = await Vendor.findById(id).lean();
  return _enrich(doc, { includeSitesList: true });
};

const findByAccountId = async (accountId) => {
  const doc = await Vendor.findOne({ accountId }).lean();
  if (!doc) return null;
  return _enrich(doc, { includeSitesList: true });
};

const findDropdown = async () => {
  const vendors = await Vendor.find({ status: 'active' }, { _id: 1, vendorName: 1, assignedSiteId: 1 })
    .sort({ vendorName: 1 })
    .lean();

  const siteIds = [...new Set(vendors.map(v => v.assignedSiteId).filter(Boolean))];
  const sites   = await ParkingSite.find({ _id: { $in: siteIds } }, { siteName: 1 }).lean();
  const siteMap = {};
  for (const s of sites) siteMap[s._id] = s;

  return vendors.map(v => ({
    ...v,
    assigned_site_name: v.assignedSiteId ? (siteMap[v.assignedSiteId]?.siteName || null) : null,
  }));
};

const create = async (d) => {
  const doc = new Vendor({
    _id:               uuidv4(),
    vendorName:        d.vendorName,
    contactPerson:     d.contactPerson,
    phone:             d.phone,
    email:             d.email,
    city:              d.city,
    state:             d.state,
    gstin:             d.gstin,
    registeredAddress: d.registeredAddress,
    primaryService:    d.primaryService,
    contractStartDate: d.contractStartDate,
    notes:             d.notes || null,
    status:            'active',
    assignedSiteId:    d.assignedSiteId || null,
    accountId:         d.accountId      || null,
  });
  await doc.save();
  return doc.toObject();
};

const updateById = async (id, d) => {
  const map = {
    vendorName: 'vendorName', contactPerson: 'contactPerson', phone: 'phone',
    email: 'email', city: 'city', state: 'state', gstin: 'gstin',
    registeredAddress: 'registeredAddress', primaryService: 'primaryService',
    contractStartDate: 'contractStartDate', notes: 'notes', status: 'status',
    assignedSiteId: 'assignedSiteId',
  };
  const update = {};
  for (const [key, field] of Object.entries(map)) {
    if (d[key] !== undefined) update[field] = d[key];
  }
  if (!Object.keys(update).length) return findById(id);
  await Vendor.findByIdAndUpdate(id, { $set: update });
  return findById(id);
};

const deleteById = async (id) => {
  await Vendor.findByIdAndDelete(id);
};

const existsByGstin = async (gstin, excludeId = null) => {
  const filter = { gstin };
  if (excludeId) filter._id = { $ne: excludeId };
  const count = await Vendor.countDocuments(filter);
  return count > 0;
};

module.exports = { findAll, findById, findByAccountId, findDropdown, create, updateById, deleteById, existsByGstin };
