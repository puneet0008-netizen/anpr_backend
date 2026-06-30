const ParkingSession = require('../models/parkingSessions.model');
const ParkingUser    = require('../models/parkingUsers.model');
const { v4: uuidv4 } = require('uuid');
const { localDayBounds } = require('../utils/dateWindow');
const {
  inStatusQuery,
  fetchActiveSessions,
  countActiveSessions,
  findActiveByPlate: findActiveByPlateLatest,
} = require('../utils/parkingSessionStatus');

/**
 * Compute elapsed duration in minutes from entryTime to now (or exitTime).
 */
const _calcDuration = (doc) => {
  if (doc.durationMinutes != null) return doc.durationMinutes;
  const end   = doc.exitTime || new Date();
  const start = doc.entryTime;
  return Math.round((end - start) / 60000);
};

const findByUser = async (userId, { limit = 10, offset = 0, date } = {}) => {
  const filter = { userId };
  if (date) {
    const { start, endExclusive } = localDayBounds(date);
    filter.entryTime = { $gte: start, $lt: endExclusive };
  }
  const docs = await ParkingSession.find(filter)
    .sort({ entryTime: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  return docs.map(d => ({ ...d, duration_minutes_calc: _calcDuration(d) }));
};

/** Sessions for user + registered plates (same basis as admin recentSessions). */
const findByUserPlates = async (userId, plates, { limit = 100, offset = 0, date } = {}) => {
  const normalized = [...new Set(
    plates.map((p) => String(p || '').replace(/\s/g, '').toUpperCase()).filter(Boolean),
  )];
  const filter = {
    $or: [
      { userId },
      ...(normalized.length ? [{ numberPlate: { $in: normalized } }] : []),
    ],
  };
  if (date) {
    const { start, endExclusive } = localDayBounds(date);
    filter.entryTime = { $gte: start, $lt: endExclusive };
  }
  const docs = await ParkingSession.find(filter)
    .sort({ entryTime: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  return docs.map((d) => ({ ...d, duration_minutes_calc: _calcDuration(d) }));
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
  const sessions = await fetchActiveSessions();

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
    ParkingSession.countDocuments({ status: inStatusQuery(), entryTime: { $gte: today } }),
    ParkingSession.countDocuments({
      $or: [
        { status: 'OUT', entryTime: { $gte: today } },
        { status: 'completed', exitTime: { $gte: today } },
      ],
    }),
    countActiveSessions(),
    ParkingSession.aggregate([
      {
        $match: {
          $or: [
            { status: 'OUT', entryTime: { $gte: today } },
            { status: 'completed', entryTime: { $gte: today } },
          ],
        },
      },
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
    status:      'IN',
  });
  await doc.save();
  return doc.toObject();
};

/** Legacy helper — creates a separate OUT record linked to the IN session. */
const closeSession = async (id) => {
  const inSession = await ParkingSession.findById(id).lean();
  if (!inSession) return null;

  const exitTime = new Date();
  const durationMinutes = Math.round((exitTime - new Date(inSession.entryTime)) / 60000);

  const doc = new ParkingSession({
    _id:             uuidv4(),
    numberPlate:     inSession.numberPlate,
    vehicleId:       inSession.vehicleId,
    userId:          inSession.userId,
    siteId:          inSession.siteId,
    vehicleName:     inSession.vehicleName,
    vehicleModel:    inSession.vehicleModel,
    vehicleType:     inSession.vehicleType,
    isMonthly:       inSession.isMonthly,
    linkedSessionId: inSession._id,
    entryTime:       exitTime,
    exitTime,
    durationMinutes,
    status:          'OUT',
  });
  await doc.save();
  return doc.toObject();
};

const findActiveByPlate = async (plate) => findActiveByPlateLatest(plate);

module.exports = {
  findByUser,
  findByUserPlates,
  findTodayByUser,
  findActive,
  getTodayStats,
  getTodayLog,
  getHistoryRange,
  create,
  closeSession,
  findActiveByPlate,
};
