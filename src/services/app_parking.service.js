const sessionsRepo = require('../repositories/parking_sessions.repository')
const { toSessionStatus, toParkingType } = require('../utils/sessionFormat')

// ─── Parking history for user (with date filter) ──────────────────────────────

const getHistory = async (userId, { limit = 20, offset = 0, startDate, endDate } = {}) => {
  const rows = await sessionsRepo.findByUser(userId, { limit, offset, startDate, endDate })
  return rows.map(formatSession)
}

// ─── Today's sessions ─────────────────────────────────────────────────────────

const getTodaySessions = async (userId) => {
  const rows = await sessionsRepo.findTodayByUser(userId)
  return rows.map(formatSession)
}

// ─── Duration formatter ───────────────────────────────────────────────────────

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return null
  const totalMins = Math.round(Number(minutes))
  const d = Math.floor(totalMins / (60 * 24))
  const h = Math.floor((totalMins % (60 * 24)) / 60)
  const m = totalMins % 60
  return `${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

// ─── Format session ───────────────────────────────────────────────────────────

const formatSession = (row) => ({
  id:                row._id || row.id,
  numberPlate:       row.numberPlate ?? row.number_plate,
  vehicleName:       row.vehicleName ?? row.vehicle_name,
  vehicleModel:      row.vehicleModel ?? row.vehicle_model,
  vehicleType:       row.vehicleType ?? row.vehicle_type,
  entryTime:         row.entryTime ?? row.entry_time,
  exitTime:          row.exitTime ?? row.exit_time ?? null,
  status:            toSessionStatus(row),
  parkingType:       toParkingType(row),
  durationMinutes:   row.duration_minutes_calc != null ? Math.round(Number(row.duration_minutes_calc)) : null,
  durationFormatted: formatDuration(row.duration_minutes_calc),
})

module.exports = { getHistory, getTodaySessions }
