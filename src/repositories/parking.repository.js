const ParkingSite    = require('../models/parkingSites.model');
const ParkingSession = require('../models/parkingSessions.model');
const ParkingUser    = require('../models/parkingUsers.model');
const ParkingWallet  = require('../models/parkingWallets.model');
const ParkingRecharge= require('../models/parkingRecharges.model');
const Vendor         = require('../models/vendors.model');
const { v4: uuidv4 } = require('uuid');

// ─── Parking Sites ────────────────────────────────────────────────────────────

/**
 * Enrich a site doc with live occupied count, allotted_slots sum, and vendor name.
 */
const _enrichSite = async (site) => {
  const [occupied, allottedResult, vendor] = await Promise.all([
    ParkingSession.countDocuments({ siteId: site._id, status: 'active' }),
    ParkingUser.aggregate([
      { $match: { assignedSiteId: site._id, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$allottedSlots' } } },
    ]),
    site.assignedVendorId ? Vendor.findById(site.assignedVendorId).lean() : null,
  ]);
  site.occupied            = occupied;
  site.allotted_slots      = allottedResult[0] ? allottedResult[0].total : 0;
  site.assignedVendorName  = vendor ? vendor.vendorName : null;
  return site;
};

const findAllSites = async ({ search, status, limit, offset, sortBy = 'createdAt', sortOrder = 'DESC' }) => {
  const filter = {};
  if (search) filter.$or = [
    { siteName: new RegExp(search, 'i') },
    { location: new RegExp(search, 'i') },
  ];
  if (status) filter.status = status;

  const allowedSort = ['siteName', 'createdAt', 'status', 'totalCapacity'];
  const col         = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir     = sortOrder === 'ASC' ? 1 : -1;

  const [docs, total] = await Promise.all([
    ParkingSite.find(filter).sort({ [col]: sortDir }).skip(offset).limit(limit).lean(),
    ParkingSite.countDocuments(filter),
  ]);

  const rows = await Promise.all(docs.map(_enrichSite));
  return { rows, total };
};

const findSiteById = async (id) => {
  const doc = await ParkingSite.findById(id).lean();
  if (!doc) return null;
  return _enrichSite(doc);
};

const findSiteByName = async (name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return ParkingSite.findOne({ siteName: new RegExp(`^${escaped}$`, 'i') }).lean();
};

const createSite = async (d) => {
  const doc = new ParkingSite({
    _id:                 uuidv4(),
    siteName:            d.siteName,
    location:            d.location,
    type:                d.type,
    totalCapacity:       d.totalCapacity,
    hourlyRate:          d.hourlyRate,
    dailyRate:           d.dailyRate,
    monthlyRate:         d.monthlyRate,
    entryCameraIp:       d.entryCameraIp,
    exitCameraIp:        d.exitCameraIp,
    barrierControllerIp: d.barrierControllerIp,
    assignedVendorId:    d.assignedVendorId || null,
    status:              'active',
  });
  await doc.save();
  return doc.toObject();
};

const updateSiteById = async (id, d) => {
  const map = {
    siteName: 'siteName', location: 'location', type: 'type', totalCapacity: 'totalCapacity',
    hourlyRate: 'hourlyRate', dailyRate: 'dailyRate', monthlyRate: 'monthlyRate',
    entryCameraIp: 'entryCameraIp', exitCameraIp: 'exitCameraIp',
    barrierControllerIp: 'barrierControllerIp', assignedVendorId: 'assignedVendorId', status: 'status',
  };
  const update = {};
  for (const [key, field] of Object.entries(map)) {
    if (d[key] !== undefined) update[field] = d[key];
  }
  if (!Object.keys(update).length) return findSiteById(id);
  await ParkingSite.findByIdAndUpdate(id, { $set: update });
  return findSiteById(id);
};

const deleteSiteById = async (id) => {
  await ParkingSite.findByIdAndDelete(id);
};

const getStats = async () => {
  const [siteStats, currentlyOccupied, totalAllottedSlots] = await Promise.all([
    ParkingSite.aggregate([
      {
        $group: {
          _id:           null,
          totalSites:    { $sum: 1 },
          totalCapacity: { $sum: '$totalCapacity' },
          activeSites:   { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        },
      },
    ]),
    ParkingSession.countDocuments({ status: 'active' }),
    ParkingUser.aggregate([
      { $match: { assignedSiteId: { $ne: null }, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$allottedSlots' } } },
    ]),
  ]);

  const s = siteStats[0] || { totalSites: 0, totalCapacity: 0, activeSites: 0 };
  return {
    totalSites:        s.totalSites,
    totalCapacity:     s.totalCapacity,
    currentlyOccupied,
    activeSites:       s.activeSites,
    totalAllottedSlots: totalAllottedSlots[0] ? totalAllottedSlots[0].total : 0,
  };
};

// ─── Recharges ────────────────────────────────────────────────────────────────

const createRecharge = async (d) => {
  const doc = new ParkingRecharge({
    _id:            uuidv4(),
    userId:         d.userId,
    userName:       d.userName,
    vehicleNumber:  d.vehicleNumber,
    amount:         d.amount,
    paymentMethod:  d.paymentMethod,
    transactionRef: d.transactionRef,
    processedBy:    d.processedBy || null,
  });
  await doc.save();
  return doc.toObject();
};

const updateWallet = async (userId, amount) => {
  await ParkingWallet.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount, totalRecharges: amount },
      $set: { lastRechargeAt: new Date(), updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );
};

const getRecentRecharges = async (limit = 20) => {
  const recharges = await ParkingRecharge.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const userIds = [...new Set(recharges.map(r => r.userId))];
  const users   = await ParkingUser.find({ _id: { $in: userIds } }).lean();
  const userMap = {};
  for (const u of users) {
    userMap[u._id] = u;
  }

  return recharges.map(r => ({
    ...r,
    user_name:     userMap[r.userId] ? userMap[r.userId].name          : null,
    vehicle_number:userMap[r.userId] ? userMap[r.userId].vehicleNumber  : null,
  }));
};

const findDropdown = async () => {
  return ParkingSite.find({ status: 'active' }, { _id: 1, siteName: 1 }).sort({ siteName: 1 }).lean();
};

module.exports = {
  findAllSites,
  findSiteById,
  findSiteByName,
  findDropdown,
  createSite,
  updateSiteById,
  deleteSiteById,
  getStats,
  createRecharge,
  updateWallet,
  getRecentRecharges,
};
