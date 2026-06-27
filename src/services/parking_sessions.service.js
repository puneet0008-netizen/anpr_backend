const repo         = require('../repositories/parking_sessions_admin.repository');
const vehiclesRepo = require('../repositories/app_vehicles.repository');
const usersRepo    = require('../repositories/parking_users.repository');
const parkingRepo  = require('../repositories/parking.repository');
const { saveBase64Image } = require('../utils/imageStorage');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { cacheDel } = require('../config/redis');
const { notifyParkingStatusForSession } = require('../sockets/parkingStatus');
const { toSessionStatus, toParkingType, calcHourlyFee } = require('../utils/sessionFormat');
const { toPublicImageUrl } = require('../utils/imageStorage');

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatDuration = (minutes) => {
  if (minutes == null) return null;
  const m = Math.round(Number(minutes));
  const d = Math.floor(m / (60 * 24));
  const h = Math.floor((m % (60 * 24)) / 60);
  const min = m % 60;
  return `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(min).padStart(2,'0')}m`;
};

const formatSession = (row) => {
  const duration = row.duration_minutes_calc ?? row.durationMinutes;
  return {
    id:                 row._id || row.id,
    numberPlate:        row.numberPlate || row.number_plate,
    parkingName:        row.parkingName || null,
    vehicleName:        row.vehicleName || row.vehicle_name || null,
    vehicleModel:       row.vehicleModel || row.vehicle_model || null,
    vehicleType:        row.vehicleType || row.vehicle_type || null,
    userId:             row.userId || row.user_id || null,
    userName:           row.user_name || null,
    userPhone:          row.user_phone || null,
    siteId:             row.siteId || row.site_id || null,
    entryTime:          row.entryTime || row.entry_time,
    exitTime:           row.exitTime || row.exit_time || null,
    durationMinutes:    duration != null ? Math.round(Number(duration)) : null,
    durationFormatted:  formatDuration(duration),
    status:             toSessionStatus(row),
    parkingType:        toParkingType(row),
    fee:                calcHourlyFee(row, row.hourly_rate ?? row.hourlyRate ?? 0),
    isMonthly:          row.isMonthly === true,
    entryPlateImageUrl: toPublicImageUrl(row.entryPlateImageUrl),
    entryCarImageUrl:   toPublicImageUrl(row.entryCarImageUrl),
    exitPlateImageUrl:  toPublicImageUrl(row.exitPlateImageUrl),
    exitCarImageUrl:    toPublicImageUrl(row.exitCarImageUrl),
    createdAt:          row.createdAt || row.created_at,
  };
};

const listSessions = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { rows, total } = await repo.listAll({
    numberPlate: query.numberPlate || query.plate,
    userId:      query.userId,
    siteId:      query.siteId,
    status:      query.status,
    startDate:   query.startDate,
    endDate:     query.endDate,
    limit,
    offset,
  });
  return { data: rows.map(formatSession), meta: buildMeta(total, page, limit), success: true };
};

const getActiveSessions = async () => {
  const rows = await repo.getActiveSessions();
  return { data: rows.map(formatSession), success: true };
};

const recordEntry = async (d) => {
  const plate       = (d.platenumber || d.numberPlate || '').toUpperCase().trim();
  const parkingName = (d.parking_name || d.parkingName || '').trim();
  const direction   = (d.status || '').toUpperCase();

  if (!plate) throw err('platenumber is required', 400);
  if (!parkingName) throw err('parking_name is required', 400);
  if (!['IN', 'OUT'].includes(direction)) throw err('status must be IN or OUT', 400);

  const site   = await parkingRepo.findSiteByName(parkingName);
  const siteId = site?._id || null;

  const plateImageUrl = saveBase64Image(d.plate_image || d.plateImage, 'plates');
  const carImageUrl   = saveBase64Image(d.car_image || d.carImage, 'cars');

  if (direction === 'IN') {
    const existing = await repo.findActiveByPlate(plate);
    if (existing) throw err(`Vehicle ${plate} is already parked (session: ${existing._id || existing.id})`, 409);

    let vehicleId    = d.vehicleId || null;
    let userId       = null;
    let vehicleName  = d.vehicleName  || null;
    let vehicleModel = d.vehicleModel || null;
    let vehicleType  = d.vehicleType  || null;

    const vehicle = await vehiclesRepo.findByPlate(plate);
    if (vehicle) {
      vehicleId    = vehicleId || vehicle._id;
      userId       = vehicle.userId || null;
      vehicleName  = vehicleName  || vehicle.vehicleName;
      vehicleModel = vehicleModel || vehicle.vehicleModel;
      vehicleType  = vehicleType  || vehicle.vehicleType;
    }

    const parkingUser = await usersRepo.findByVehicle(plate);
    const isMonthly   = !!parkingUser;
    if (parkingUser) {
      userId = userId || parkingUser._id;
    }

    const session = await repo.recordEntry({
      numberPlate: plate,
      vehicleId,
      userId,
      siteId,
      parkingName,
      vehicleName,
      vehicleModel,
      vehicleType,
      isMonthly,
      entryPlateImageUrl: plateImageUrl,
      entryCarImageUrl:   carImageUrl,
    });

    await cacheDel('parking:stats');
    await notifyParkingStatusForSession(session, 'IN');
    return { data: formatSession(session), success: true };
  }

  // OUT
  const active = await repo.findActiveByPlate(plate);
  if (!active) throw err(`No active parking session found for plate ${plate}`, 404);

  const sessionId = active._id || active.id;
  const session   = await repo.recordExit(sessionId, {
    exitPlateImageUrl: plateImageUrl,
    exitCarImageUrl:   carImageUrl,
  });
  if (!session) throw err('Session not found or already completed', 404);

  await cacheDel('parking:stats');
  const enriched = await repo.findById(sessionId);
  await notifyParkingStatusForSession(enriched || session, 'OUT');
  return { data: formatSession(enriched || session), success: true };
};

const recordExit = async (d) => {
  let sessionId = d.sessionId;

  if (!sessionId) {
    const plate = (d.numberPlate || d.platenumber || '').toUpperCase().trim();
    if (!plate) throw err('Either sessionId or numberPlate is required', 400);
    const active = await repo.findActiveByPlate(plate);
    if (!active) throw err(`No active parking session found for plate ${plate}`, 404);
    sessionId = active._id || active.id;
  }

  const exitImages = {};
  if (d.plate_image || d.plateImage) {
    exitImages.exitPlateImageUrl = saveBase64Image(d.plate_image || d.plateImage, 'plates');
  }
  if (d.car_image || d.carImage) {
    exitImages.exitCarImageUrl = saveBase64Image(d.car_image || d.carImage, 'cars');
  }

  const session = await repo.recordExit(sessionId, exitImages);
  if (!session) throw err('Session not found or already completed', 404);
  await cacheDel('parking:stats');
  const enriched = await repo.findById(sessionId);
  await notifyParkingStatusForSession(enriched || session, 'OUT');
  return { data: formatSession(enriched || session), success: true };
};

const getSessionById = async (id) => {
  const session = await repo.findById(id);
  if (!session) throw err('Session not found', 404);
  return { data: formatSession(session), success: true };
};

const lookupByPlate = async (plate) => {
  if (!plate) throw err('plate is required', 400);
  const normalized = plate.toUpperCase().trim();

  const activeSession = await repo.findActiveByPlate(normalized);
  const vehicle = await vehiclesRepo.findByPlate(normalized);
  let user = null;
  if (vehicle?.userId) {
    user = await usersRepo.findById(vehicle.userId);
  }

  return {
    data: {
      plate: normalized,
      isAlreadyParked: !!activeSession,
      activeSessionId: activeSession?._id || activeSession?.id || null,
      status: activeSession ? toSessionStatus(activeSession) : null,
      parkingType: activeSession ? toParkingType(activeSession) : null,
      registered: !!vehicle,
      vehicle: vehicle ? {
        id:           vehicle._id,
        vehicleName:  vehicle.vehicleName,
        vehicleModel: vehicle.vehicleModel,
        vehicleType:  vehicle.vehicleType,
      } : null,
      user: user ? {
        id:    user._id,
        name:  user.name,
        phone: user.phone,
        email: user.email,
      } : null,
    },
    success: true,
  };
};

module.exports = { listSessions, getActiveSessions, recordEntry, recordExit, getSessionById, lookupByPlate };
