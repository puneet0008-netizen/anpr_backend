const ParkingSession = require('../models/parkingSessions.model');
const ParkingUser    = require('../models/parkingUsers.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Compute elapsed duration in minutes from entryTime to now (or exitTime).
 */
const _calcDuration = (doc) => {
  const end   = doc.exitTime || new Date();
  const start = doc.entryTime;
  return Math.round((end - start) / 60000);
};

const findByUser = async (userId, { limit = 10, offset = 0, startDate, endDate } = {}) => {
  const filter = { userId };
  if (startDate || endDate) {
    filter.entryTime = {};
    if (startDate) filter.entryTime.$gte = new Date(startDate);
    if (endDate)   filter.entryTime.$lte = new Date(endDate);
  }
  const docs = await ParkingSession.find(filter)
    .sort({ entryTime: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  return docs.map(d => ({ ...d, duration_minutes_calc: _calcDuration(d) }));
};

const findTodayByUser = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const docs = await ParkingSession.find({ userId, entryTime: { $gte: today } })
    .sort({ entryTime: -1 })
    .lean();
  return docs.map(d => ({ ...d, duration_minutes_calc: _calcDuration(d) }));
};

const findActive = async () => {
  const sessions = await ParkingSession.find({ status: 'active' })
    .sort({ entryTime: -1 })
    .lean();

  const userIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
  const users   = await ParkingUser.find({ _id: { $in: userIds } }, { name: 1, phone: 1 }).lean();
  const userMap = {};
  for (const u of users) userMap[u._id] = u;

  return sessions.map(s => ({
    ...s,
    user_name:  s.userId ? (userMap[s.userId]?.name  || null) : null,
    user_phone: s.userId ? (userMap[s.userId]?.phone || null) : null,
  }));
};

const getTodayStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalInToday, totalOutToday, currentlyParked, durationAgg] = await Promise.all([
    ParkingSession.countDocuments({ entryTime: { $gte: today } }),
    ParkingSession.countDocuments({ exitTime: { $gte: today }, status: 'completed' }),
    ParkingSession.countDocuments({ status: 'active' }),
    ParkingSession.aggregate([
      { $match: { status: 'completed', entryTime: { $gte: today } } },
      { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
    ]),
  ]);

  return {
    total_in_today:      totalInToday,
    total_out_today:     totalOutToday,
    currently_parked:    currentlyParked,
    avg_duration_today:  durationAgg[0] ? durationAgg[0].avg : null,
  };
};

const getTodayLog = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessions = await ParkingSession.find({ entryTime: { $gte: today } })
    .sort({ entryTime: -1 })
    .lean();

  const userIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
  const users   = await ParkingUser.find({ _id: { $in: userIds } }, { name: 1 }).lean();
  const userMap = {};
  for (const u of users) userMap[u._id] = u;

  return sessions.map(s => ({
    ...s,
    user_name: s.userId ? (userMap[s.userId]?.name || null) : null,
  }));
};

const getHistoryRange = async ({ startDate, endDate, siteId }) => {
  const filter = { entryTime: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  if (siteId) filter.siteId = siteId;

  const sessions = await ParkingSession.find(filter).sort({ entryTime: -1 }).lean();

  const userIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
  const users   = await ParkingUser.find({ _id: { $in: userIds } }, { name: 1 }).lean();
  const userMap = {};
  for (const u of users) userMap[u._id] = u;

  return sessions.map(s => ({
    ...s,
    user_name: s.userId ? (userMap[s.userId]?.name || null) : null,
  }));
};

const create = async (d) => {
  const doc = new ParkingSession({
    _id:         uuidv4(),
    vehicleId:   d.vehicleId,
    userId:      d.userId,
    siteId:      d.siteId || null,
    numberPlate: d.numberPlate,
    vehicleName: d.vehicleName,
    vehicleModel:d.vehicleModel,
    vehicleType: d.vehicleType,
  });
  await doc.save();
  return doc.toObject();
};

const closeSession = async (id) => {
  const exitTime = new Date();
  const session  = await ParkingSession.findById(id).lean();
  if (!session) return null;
  const durationMinutes = Math.round((exitTime - session.entryTime) / 60000);
  const doc = await ParkingSession.findByIdAndUpdate(
    id,
    { $set: { exitTime, durationMinutes, status: 'completed' } },
    { new: true }
  ).lean();
  return doc;
};

const findActiveByPlate = async (plate) => {
  return ParkingSession.findOne({ numberPlate: plate, status: 'active' }).lean();
};

module.exports = {
  findByUser,
  findTodayByUser,
  findActive,
  getTodayStats,
  getTodayLog,
  getHistoryRange,
  create,
  closeSession,
  findActiveByPlate,
};
