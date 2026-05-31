const repo         = require('../repositories/parking_sessions_admin.repository');
const vehiclesRepo = require('../repositories/app_vehicles.repository');
const usersRepo    = require('../repositories/parking_users.repository');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { cacheDel } = require('../config/redis');

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatDuration = (minutes) => {
  if (minutes == null) return null;
  const m = Math.round(Number(minutes));
  const d = Math.floor(m / (60 * 24));
  const h = Math.floor((m % (60 * 24)) / 60);
  const min = m % 60;
  return `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(min).padStart(2,'0')}m`;
};

const formatSession = (row) => ({
  id:              row.id,
  numberPlate:     row.number_plate,
  vehicleName:     row.vehicle_name,
  vehicleModel:    row.vehicle_model,
  vehicleType:     row.vehicle_type,
  userId:          row.user_id,
  userName:        row.user_name || null,
  userPhone:       row.user_phone || null,
  siteId:          row.site_id,
  entryTime:       row.entry_time,
  exitTime:        row.exit_time || null,
  durationMinutes: row.duration_minutes_calc ? Math.round(Number(row.duration_minutes_calc)) : null,
  durationFormatted: formatDuration(row.duration_minutes_calc),
  status:          row.status,
  fee:             parseFloat(row.fee) || 0,
  createdAt:       row.created_at,
});

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
  const plate = (d.numberPlate || '').toUpperCase().trim();
  if (!plate) throw err('numberPlate is required', 400);

  // Check if already parked
  const existing = await repo.findActiveByPlate(plate);
  if (existing) throw err(`Vehicle ${plate} is already parked (session: ${existing.id})`, 409);

  // Auto-look up vehicle and user if plate is registered
  let vehicleId = d.vehicleId || null;
  let userId    = d.userId    || null;
  let vehicleName  = d.vehicleName  || null;
  let vehicleModel = d.vehicleModel || null;
  let vehicleType  = d.vehicleType  || null;

  if (!vehicleId) {
    const vehicle = await vehiclesRepo.findByPlate(plate);
    if (vehicle) {
      vehicleId    = vehicle.id;
      userId       = vehicle.user_id;
      vehicleName  = vehicleName  || vehicle.vehicle_name;
      vehicleModel = vehicleModel || vehicle.vehicle_model;
      vehicleType  = vehicleType  || vehicle.vehicle_type;
    }
  }

  const session = await repo.recordEntry({ numberPlate: plate, vehicleId, userId, siteId: d.siteId || null, vehicleName, vehicleModel, vehicleType });
  await cacheDel('parking:stats');
  return { data: formatSession(session), success: true };
};

const recordExit = async (d) => {
  let sessionId = d.sessionId;

  // If sessionId not provided, find active session by plate
  if (!sessionId) {
    const plate = (d.numberPlate || '').toUpperCase().trim();
    if (!plate) throw err('Either sessionId or numberPlate is required', 400);
    const active = await repo.findActiveByPlate(plate);
    if (!active) throw err(`No active parking session found for plate ${plate}`, 404);
    sessionId = active.id;
  }

  const session = await repo.recordExit(sessionId);
  if (!session) throw err('Session not found or already completed', 404);
  await cacheDel('parking:stats');
  return { data: formatSession(session), success: true };
};

const getSessionById = async (id) => {
  const session = await repo.findById(id);
  if (!session) throw err('Session not found', 404);
  return { data: formatSession(session), success: true };
};

const lookupByPlate = async (plate) => {
  if (!plate) throw err('plate is required', 400);
  const normalized = plate.toUpperCase().trim();

  // Check if currently parked
  const activeSession = await repo.findActiveByPlate(normalized);

  // Look up registered vehicle + owner
  const vehicle = await vehiclesRepo.findByPlate(normalized);
  let user = null;
  if (vehicle?.user_id) {
    user = await usersRepo.findById(vehicle.user_id);
  }

  return {
    data: {
      plate: normalized,
      isAlreadyParked: !!activeSession,
      activeSessionId: activeSession?.id || null,
      registered: !!vehicle,
      vehicle: vehicle ? {
        id:           vehicle.id,
        vehicleName:  vehicle.vehicle_name,
        vehicleModel: vehicle.vehicle_model,
        vehicleType:  vehicle.vehicle_type,
      } : null,
      user: user ? {
        id:    user.id,
        name:  user.name,
        phone: user.phone,
        email: user.email,
      } : null,
    },
    success: true,
  };
};

module.exports = { listSessions, getActiveSessions, recordEntry, recordExit, getSessionById, lookupByPlate };
