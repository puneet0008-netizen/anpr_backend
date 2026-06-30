/**
 * Real-time parking IN/OUT status for app users.
 *
 * Client (app_user JWT):
 *   connect → receives `parking:status`
 *   emit `parking:status:get` → receives fresh `parking:status`
 *
 * Server pushes `parking:status` when /sessions/entry records IN or OUT.
 */
const ParkingSession = require('../models/parkingSessions.model');
const ParkingUser    = require('../models/parkingUsers.model');
const AppVehicle     = require('../models/appVehicles.model');
const usersRepo      = require('../repositories/parking_users.repository');
const { isInStatus } = require('../utils/parkingSessionStatus');
const { getIO }      = require('./index');
const logger         = require('../utils/logger');

const EVENT = 'parking:status';

const _collectPlates = (user, vehicles) => {
  const plates = new Set();
  if (user?.vehicleNumber) plates.add(user.vehicleNumber.toUpperCase().trim());
  for (const v of vehicles) {
    if (v.numberPlate) plates.add(v.numberPlate.toUpperCase().trim());
  }
  return [...plates];
};

const _sessionSummary = (session) => session ? {
  sessionId:   session._id,
  numberPlate: session.numberPlate,
  parkingName: session.parkingName || null,
  entryTime:   session.entryTime,
  isMonthly:   session.isMonthly === true,
} : null;

/**
 * Build current IN/OUT status for an app parking user.
 * Uses the latest event per plate — parked only if that event is IN.
 */
const buildParkingStatus = async (userId) => {
  const user = await ParkingUser.findById(userId).lean();
  if (!user) {
    return {
      carStatus: 'OUT',
      isParked:  false,
      numberPlate: null,
      parkingName: null,
      sessionId:   null,
      entryTime:   null,
      isMonthly:   false,
      vehicles:    [],
      timestamp:   new Date(),
    };
  }

  const appVehicles = await AppVehicle.find({ userId, status: { $ne: 'removed' } }).lean();
  const plates      = _collectPlates(user, appVehicles);

  const recentSessions = await ParkingSession.find({
    $or: [
      { userId },
      ...(plates.length ? [{ numberPlate: { $in: plates } }] : []),
    ],
  }).sort({ entryTime: -1, createdAt: -1 }).lean();

  const latestByPlate = {};
  for (const s of recentSessions) {
    const plate = s.numberPlate?.toUpperCase();
    if (!plate || latestByPlate[plate]) continue;
    latestByPlate[plate] = s;
  }

  const vehicles = plates.map((plate) => {
    const session = latestByPlate[plate];
    const parked  = session && isInStatus(session.status);
    return {
      numberPlate: plate,
      carStatus:   parked ? 'IN' : 'OUT',
      ...(parked ? _sessionSummary(session) : {}),
    };
  });

  const activeSessions = Object.values(latestByPlate).filter((s) => isInStatus(s.status));
  activeSessions.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));

  const primarySession = activeSessions[0] || null;
  const isParked       = !!primarySession;

  return {
    carStatus:   isParked ? 'IN' : 'OUT',
    isParked,
    numberPlate: primarySession?.numberPlate || plates[0] || user.vehicleNumber || null,
    parkingName: primarySession?.parkingName || null,
    sessionId:   primarySession?._id || null,
    entryTime:   primarySession?.entryTime || null,
    isMonthly:   primarySession?.isMonthly === true,
    vehicles,
    timestamp:   new Date(),
  };
};

const emitParkingStatus = async (userId) => {
  const payload = await buildParkingStatus(userId);
  getIO().to(`user:${userId}`).emit(EVENT, payload);
  return payload;
};

/** Push latest status to the app user room (safe if socket unavailable). */
const notifyAppUserParkingStatus = async (userId) => {
  if (!userId) return;
  try {
    await emitParkingStatus(userId);
  } catch (err) {
    logger.warn('Parking status notify failed', { userId, error: err.message });
  }
};

/** Push IN/OUT to the app user linked to this session. */
const notifyParkingStatusForSession = async (session, direction) => {
  if (!session?.numberPlate || !['IN', 'OUT'].includes(direction)) return;

  let userId = session.userId || session.user_id || null;

  if (!userId) {
    const parkingUser = await usersRepo.findAppUserByPlate(session.numberPlate);
    userId = parkingUser?._id || null;
  }

  if (!userId) return;

  try {
    await emitParkingStatus(userId);
    logger.info('Parking status pushed', {
      userId,
      plate:     session.numberPlate,
      direction,
    });
  } catch (err) {
    logger.warn('Parking status notify failed', { userId, error: err.message });
  }
};

const registerParkingStatusHandlers = (socket) => {
  const userId = socket.user.id;

  emitParkingStatus(userId).catch((err) => {
    logger.warn('Initial parking status emit failed', { userId, error: err.message });
  });

  socket.on('parking:status:get', async () => {
    try {
      const payload = await buildParkingStatus(userId);
      socket.emit(EVENT, payload);
    } catch (err) {
      logger.warn('Parking status get failed', { userId, error: err.message });
      socket.emit('parking:status:error', { message: 'Failed to fetch parking status' });
    }
  });
};

module.exports = {
  registerParkingStatusHandlers,
  notifyAppUserParkingStatus,
  notifyParkingStatusForSession,
  buildParkingStatus,
};
