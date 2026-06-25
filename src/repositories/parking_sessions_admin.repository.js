const ParkingSession = require('../models/parkingSessions.model');
const ParkingSite    = require('../models/parkingSites.model');
const ParkingUser    = require('../models/parkingUsers.model');
const { v4: uuidv4 } = require('uuid');

const _calcDuration = (doc) => {
  const end   = doc.exitTime || new Date();
  const start = doc.entryTime;
  return Math.round((end - start) / 60000);
};

const _enrichWithUser = async (sessions) => {
  const userIds = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
  const users   = await ParkingUser.find({ _id: { $in: userIds } }, { name: 1, phone: 1 }).lean();
  const userMap = {};
  for (const u of users) userMap[u._id] = u;

  return sessions.map(s => ({
    ...s,
    duration_minutes_calc: _calcDuration(s),
    user_name:  s.userId ? (userMap[s.userId]?.name  || null) : null,
    user_phone: s.userId ? (userMap[s.userId]?.phone || null) : null,
  }));
};

const listAll = async ({ numberPlate, userId, siteId, status, startDate, endDate, limit = 20, offset = 0 }) => {
  const filter = {};
  if (numberPlate) filter.numberPlate = new RegExp(numberPlate, 'i');
  if (userId)      filter.userId      = userId;
  if (siteId)      filter.siteId      = siteId;
  if (status)      filter.status      = status;
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
    status:             'active',
  });
  await doc.save();
  // Increment site occupancy counter
  if (siteId) {
    await ParkingSite.findByIdAndUpdate(siteId, { $inc: { occupied: 1 } });
  }
  return doc.toObject();
};

const recordExit = async (sessionId, { exitPlateImageUrl, exitCarImageUrl } = {}) => {
  const exitTime = new Date();
  const session  = await ParkingSession.findById(sessionId).lean();
  if (!session || session.status !== 'active') return null;

  const durationMinutes = Math.round((exitTime - session.entryTime) / 60000);
  const update = {
    exitTime,
    durationMinutes,
    status: 'completed',
  };
  if (exitPlateImageUrl) update.exitPlateImageUrl = exitPlateImageUrl;
  if (exitCarImageUrl)   update.exitCarImageUrl   = exitCarImageUrl;

  const updated = await ParkingSession.findByIdAndUpdate(
    sessionId,
    { $set: update },
    { new: true }
  ).lean();

  // Decrement site occupancy (floor at 0)
  if (updated?.siteId) {
    await ParkingSite.findByIdAndUpdate(
      updated.siteId,
      [{ $set: { occupied: { $max: [0, { $subtract: ['$occupied', 1] }] } } }]
    );
  }
  return updated;
};

const findActiveByPlate = async (plate) => {
  const session = await ParkingSession.findOne({
    numberPlate: plate.toUpperCase(),
    status: 'active',
  }).sort({ entryTime: -1 }).lean();

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
  const docs = await ParkingSession.find({ status: 'active' }).sort({ entryTime: -1 }).lean();
  return _enrichWithUser(docs);
};

module.exports = { listAll, recordEntry, recordExit, findActiveByPlate, findById, getActiveSessions };
