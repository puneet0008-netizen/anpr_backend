const ParkingSession = require('../models/parkingSessions.model');
const ParkingSite    = require('../models/parkingSites.model');
const ParkingUser    = require('../models/parkingUsers.model');
const { v4: uuidv4 } = require('uuid');
const {
  isInStatus,
  resolveListStatusFilter,
  fetchActiveSessions,
  findActiveByPlate: findActiveByPlateLatest,
} = require('../utils/parkingSessionStatus');

const _calcDuration = (doc) => {
  if (doc.durationMinutes != null) return doc.durationMinutes;
  const end   = doc.exitTime || new Date();
  const start = doc.entryTime;
  return Math.round((end - start) / 60000);
};

const _enrichWithUser = async (sessions) => {
  const userIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
  const siteIds = [...new Set(sessions.map(s => s.siteId).filter(Boolean))];
  const [users, sites] = await Promise.all([
    ParkingUser.find({ _id: { $in: userIds } }, { name: 1, phone: 1 }).lean(),
    ParkingSite.find({ _id: { $in: siteIds } }, { hourlyRate: 1 }).lean(),
  ]);
  const userMap = {};
  for (const u of users) userMap[u._id] = u;
  const siteMap = {};
  for (const s of sites) siteMap[s._id] = s;

  return sessions.map(s => ({
    ...s,
    duration_minutes_calc: _calcDuration(s),
    user_name:  s.userId ? (userMap[s.userId]?.name  || null) : null,
    user_phone: s.userId ? (userMap[s.userId]?.phone || null) : null,
    hourly_rate: s.siteId ? (siteMap[s.siteId]?.hourlyRate ?? 0) : 0,
  }));
};

const listAll = async ({ numberPlate, userId, siteId, status, startDate, endDate, limit = 20, offset = 0 }) => {
  const filter = {};
  if (numberPlate) filter.numberPlate = new RegExp(numberPlate, 'i');
  if (userId)      filter.userId      = userId;
  if (siteId)      filter.siteId      = siteId;
  const statusFilter = resolveListStatusFilter(status);
  if (statusFilter) filter.status = statusFilter;
  if (startDate)   { filter.entryTime = filter.entryTime || {}; filter.entryTime.$gte = new Date(startDate); }
  if (endDate)     { filter.entryTime = filter.entryTime || {}; filter.entryTime.$lte = new Date(endDate); }

  const [docs, total] = await Promise.all([
    ParkingSession.find(filter).sort({ entryTime: -1 }).skip(offset).limit(limit).lean(),
    ParkingSession.countDocuments(filter),
  ]);

  const rows = await _enrichWithUser(docs);
  return { rows, total };
};

const recordEntry = async ({
  numberPlate, vehicleId, userId, siteId, parkingName,
  vehicleName, vehicleModel, vehicleType, isMonthly,
  entryPlateImageUrl, entryCarImageUrl,
}) => {
  const doc = new ParkingSession({
    _id:                uuidv4(),
    numberPlate:        numberPlate.toUpperCase(),
    parkingName:        parkingName || null,
    vehicleId:          vehicleId || null,
    userId:             userId    || null,
    siteId:             siteId    || null,
    vehicleName:        vehicleName  || null,
    vehicleModel:       vehicleModel || null,
    vehicleType:        vehicleType  || null,
    isMonthly:          isMonthly === true,
    entryPlateImageUrl: entryPlateImageUrl || null,
    entryCarImageUrl:   entryCarImageUrl   || null,
    entryTime:          new Date(),
    status:             'IN',
  });
  await doc.save();
  if (siteId) {
    await ParkingSite.findByIdAndUpdate(siteId, { $inc: { occupied: 1 } });
  }
  return doc.toObject();
};

/** Creates a separate OUT record; the IN record is left unchanged. */
const recordExit = async (sessionId, { exitPlateImageUrl, exitCarImageUrl } = {}) => {
  const inSession = await ParkingSession.findById(sessionId).lean();
  if (!inSession || !isInStatus(inSession.status)) return null;

  const exitTime = new Date();
  const durationMinutes = Math.round((exitTime - new Date(inSession.entryTime)) / 60000);

  const doc = new ParkingSession({
    _id:               uuidv4(),
    numberPlate:       inSession.numberPlate,
    parkingName:       inSession.parkingName || null,
    vehicleId:         inSession.vehicleId || null,
    userId:            inSession.userId || null,
    siteId:            inSession.siteId || null,
    vehicleName:       inSession.vehicleName || null,
    vehicleModel:      inSession.vehicleModel || null,
    vehicleType:       inSession.vehicleType || null,
    isMonthly:         inSession.isMonthly === true,
    linkedSessionId:   inSession._id,
    exitPlateImageUrl: exitPlateImageUrl || null,
    exitCarImageUrl:   exitCarImageUrl || null,
    entryTime:         exitTime,
    exitTime,
    durationMinutes,
    status:            'OUT',
  });
  await doc.save();

  if (inSession.siteId) {
    await ParkingSite.findByIdAndUpdate(
      inSession.siteId,
      [{ $set: { occupied: { $max: [0, { $subtract: ['$occupied', 1] }] } } }],
    );
  }
  return doc.toObject();
};

const findActiveByPlate = async (plate) => {
  const session = await findActiveByPlateLatest(plate);
  if (!session) return null;

  const user = session.userId
    ? await ParkingUser.findById(session.userId, { name: 1, phone: 1 }).lean()
    : null;

  return {
    ...session,
    user_name:  user?.name  || null,
    user_phone: user?.phone || null,
  };
};

const findById = async (id) => {
  const doc = await ParkingSession.findById(id).lean();
  if (!doc) return null;
  const [enriched] = await _enrichWithUser([doc]);
  return enriched;
};

const getActiveSessions = async () => {
  const docs = await fetchActiveSessions();
  return _enrichWithUser(docs);
};

const findActiveBySiteId = async (siteId) => {
  const docs = await fetchActiveSessions({ siteId });
  return _enrichWithUser(docs);
};

const findBySiteId = async (siteId, { status, startDate, endDate, limit = 50, offset = 0 } = {}) => {
  const filter = { siteId };
  const statusFilter = resolveListStatusFilter(status);
  if (statusFilter) filter.status = statusFilter;
  if (startDate || endDate) {
    filter.entryTime = {};
    if (startDate) filter.entryTime.$gte = new Date(startDate);
    if (endDate)   filter.entryTime.$lte = new Date(endDate);
  }

  const [docs, total] = await Promise.all([
    ParkingSession.find(filter).sort({ entryTime: -1 }).skip(offset).limit(limit).lean(),
    ParkingSession.countDocuments(filter),
  ]);
  const rows = await _enrichWithUser(docs);
  return { rows, total };
};

const deleteById = async (id) => {
  const session = await ParkingSession.findById(id).lean();
  if (!session) return null;

  await ParkingSession.findByIdAndDelete(id);

  if (session.siteId && isInStatus(session.status)) {
    const stillParked = await findActiveByPlateLatest(session.numberPlate);
    if (!stillParked) {
      await ParkingSite.findByIdAndUpdate(
        session.siteId,
        [{ $set: { occupied: { $max: [0, { $subtract: ['$occupied', 1] }] } } }],
      );
    }
  }

  return session;
};

module.exports = { listAll, recordEntry, recordExit, findActiveByPlate, findById, getActiveSessions, findActiveBySiteId, findBySiteId, deleteById };
