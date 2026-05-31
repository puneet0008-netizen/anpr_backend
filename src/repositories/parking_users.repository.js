const ParkingUser   = require('../models/parkingUsers.model');
const ParkingWallet = require('../models/parkingWallets.model');
const AppVehicle    = require('../models/appVehicles.model');
const Vendor        = require('../models/vendors.model');
const ParkingSite   = require('../models/parkingSites.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Enrich a user doc with wallet, vendor, and assigned site data.
 */
const _enrich = async (doc) => {
  if (!doc) return null;
  const [wallet, vendor, site] = await Promise.all([
    ParkingWallet.findOne({ userId: doc._id }).lean(),
    doc.vendorId       ? Vendor.findById(doc.vendorId).lean()       : null,
    doc.assignedSiteId ? ParkingSite.findById(doc.assignedSiteId).lean() : null,
  ]);
  doc.wallet_balance      = wallet?.balance         ?? null;
  doc.total_recharges     = wallet?.totalRecharges  ?? null;
  doc.last_recharge       = wallet?.lastRechargeAt  ?? null;
  doc.vendor_name         = vendor?.vendorName      ?? null;
  doc.assigned_site_name  = site?.siteName          ?? null;
  return doc;
};

const findAll = async ({ type, search, status, limit, offset, sortBy = 'joinedAt', sortOrder = 'DESC' }) => {
  const filter = { type };

  if (search) filter.$or = [
    { name:          new RegExp(search, 'i') },
    { phone:         new RegExp(search, 'i') },
    { vehicleNumber: new RegExp(search, 'i') },
    { email:         new RegExp(search, 'i') },
  ];
  if (status) filter.status = status;

  const allowedSort = ['joinedAt', 'name', 'status'];
  const col         = allowedSort.includes(sortBy) ? sortBy : 'joinedAt';
  const sortDir     = sortOrder === 'ASC' ? 1 : -1;

  const [docs, total] = await Promise.all([
    ParkingUser.find(filter).sort({ [col]: sortDir }).skip(offset).limit(limit).lean(),
    ParkingUser.countDocuments(filter),
  ]);

  const rows = await Promise.all(docs.map(_enrich));
  return { rows, total };
};

const findById = async (id) => {
  const doc = await ParkingUser.findById(id).lean();
  return _enrich(doc);
};

const findByEmail = async (email) => {
  return ParkingUser.findOne({ email }).lean();
};

const findByVehicle = async (vehicleNumber) => {
  return ParkingUser.findOne({ vehicleNumber }).lean();
};

const search = async (q) => {
  return ParkingUser.find(
    {
      $or: [{ name: new RegExp(q, 'i') }, { vehicleNumber: new RegExp(q, 'i') }],
      status: 'active',
    },
    { _id: 1, name: 1, vehicleNumber: 1 }
  ).limit(10).lean();
};

const create = async (d) => {
  const doc = new ParkingUser({
    _id:            uuidv4(),
    type:           d.type,
    name:           d.name,
    email:          d.email,
    phone:          d.phone,
    vehicleNumber:  d.vehicleNumber || null,
    passwordHash:   d.passwordHash,
    status:         'active',
    vendorId:       d.vendorId       || null,
    assignedSiteId: d.assignedSiteId || null,
    slotNumber:     d.slotNumber     || null,
    allottedSlots:  d.allottedSlots  || 1,
  });
  await doc.save();
  return doc.toObject();
};

const createWallet = async (userId) => {
  await ParkingWallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { _id: uuidv4(), userId, balance: 0, totalRecharges: 0 } },
    { upsert: true }
  );
};

const updateById = async (id, d) => {
  const map = {
    name: 'name', email: 'email', phone: 'phone', vehicleNumber: 'vehicleNumber',
    status: 'status', passwordHash: 'passwordHash', assignedSiteId: 'assignedSiteId',
    slotNumber: 'slotNumber', allottedSlots: 'allottedSlots', profilePhoto: 'profilePhoto',
  };
  const update = {};
  for (const [key, field] of Object.entries(map)) {
    if (d[key] !== undefined) update[field] = d[key];
  }
  if (!Object.keys(update).length) return findById(id);
  await ParkingUser.findByIdAndUpdate(id, { $set: update });
  return findById(id);
};

const deleteById = async (id) => {
  await ParkingUser.findByIdAndDelete(id);
};

const listVehicles = async (userId) => {
  return AppVehicle.find({ userId, status: { $ne: 'removed' } })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
};

const addVehicle = async (userId, d) => {
  const count     = await AppVehicle.countDocuments({ userId, status: 'active' });
  const isPrimary = count === 0;
  const doc = new AppVehicle({
    _id:          uuidv4(),
    userId,
    numberPlate:  (d.numberPlate || '').toUpperCase(),
    vehicleType:  d.vehicleType,
    vehicleName:  d.vehicleName,
    vehicleModel: d.vehicleModel,
    isPrimary,
  });
  await doc.save();
  return doc.toObject();
};

const updateVehicle = async (vehicleId, userId, d) => {
  const map = {
    numberPlate: 'numberPlate', vehicleType: 'vehicleType',
    vehicleName: 'vehicleName', vehicleModel: 'vehicleModel', status: 'status',
  };
  const update = {};
  for (const [key, field] of Object.entries(map)) {
    if (d[key] !== undefined) {
      update[field] = key === 'numberPlate' ? d[key].toUpperCase() : d[key];
    }
  }
  if (!Object.keys(update).length) {
    return AppVehicle.findById(vehicleId).lean();
  }
  return AppVehicle.findOneAndUpdate(
    { _id: vehicleId, userId },
    { $set: update },
    { new: true }
  ).lean();
};

const removeVehicle = async (vehicleId, userId) => {
  await AppVehicle.findOneAndUpdate(
    { _id: vehicleId, userId },
    { $set: { status: 'removed', isPrimary: false } }
  );
};

module.exports = {
  findAll, findById, findByEmail, findByVehicle, search,
  create, createWallet, updateById, deleteById,
  listVehicles, addVehicle, updateVehicle, removeVehicle,
};
