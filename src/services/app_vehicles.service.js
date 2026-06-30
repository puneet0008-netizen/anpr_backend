const vehiclesRepo  = require('../repositories/app_vehicles.repository')
const sessionsRepo  = require('../repositories/parking_sessions.repository')
const requestsRepo  = require('../repositories/vehicle_requests.repository')
const notifRepo     = require('../repositories/notifications.repository')
const { toSessionStatus } = require('../utils/sessionFormat')
const { getIO }     = require('../sockets')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── List vehicles ────────────────────────────────────────────────────────────

const _formatVehicle = (row, carStatus = 'OUT') => ({
  id:           row._id || row.id,
  userId:       row.userId,
  numberPlate:  row.numberPlate,
  vehicleType:  row.vehicleType,
  vehicleName:  row.vehicleName,
  vehicleModel: row.vehicleModel,
  isPrimary:    row.isPrimary === true,
  status:       row.status,
  carStatus,
  createdAt:    row.createdAt,
  updatedAt:    row.updatedAt,
})

const _normPlate = (plate) => String(plate || '').replace(/\s/g, '').toUpperCase()

const getVehicles = async (userId) => {
  const rows = await vehiclesRepo.findByUser(userId)
  const plates = rows.map((r) => _normPlate(r.numberPlate)).filter(Boolean)

  const sessions = plates.length
    ? await sessionsRepo.findByUserPlates(userId, plates, { limit: 200 })
    : await sessionsRepo.findByUser(userId, { limit: 200 })

  const plateSet = new Set(plates)
  const matched = sessions.filter((s) => {
    const p = _normPlate(s.numberPlate)
    return !plateSet.size || plateSet.has(p)
  })

  const latestByPlate = {}
  for (const session of matched) {
    const plate = _normPlate(session.numberPlate)
    if (!plate || latestByPlate[plate]) continue
    latestByPlate[plate] = session
  }

  const vehicles = rows.map((row) => {
    const plate = _normPlate(row.numberPlate)
    const latest = latestByPlate[plate]
    const carStatus = latest ? toSessionStatus(latest) : 'OUT'
    return _formatVehicle(row, carStatus)
  })

  const { totalIn, totalOut } = await sessionsRepo.countInOutForUser(userId, plates)

  return { vehicles, totalIn, totalOut }
}

// ─── Add vehicle ──────────────────────────────────────────────────────────────

const addVehicle = async (userId, { numberPlate, vehicleType, vehicleName, vehicleModel }) => {
  // Check duplicate plate
  const existing = await vehiclesRepo.findByPlate(numberPlate.toUpperCase())
  if (existing) throw err('This number plate is already registered', 409)

  const vehicle = await vehiclesRepo.create({
    userId, numberPlate, vehicleType, vehicleName, vehicleModel,
  })

  // Notification
  const notif = await notifRepo.create({
    userId,
    title:   'Vehicle Added',
    message: `${vehicleName} (${numberPlate.toUpperCase()}) has been added to your account.`,
    type:    'vehicle_added',
    data:    { vehicleId: vehicle._id ?? vehicle.id, numberPlate: _plate(vehicle) },
  })
  _pushNotif(userId, notif)

  return vehicle
}

// ─── Request: change plate ────────────────────────────────────────────────────

const requestPlateChange = async (userId, vehicleId, { newPlate, reason }) => {
  const vehicle = await _ownedVehicle(userId, vehicleId)

  // Check new plate not taken
  const taken = await vehiclesRepo.findByPlate(newPlate.toUpperCase(), vehicleId)
  if (taken) throw err('New plate is already registered to another vehicle', 409)

  const request = await requestsRepo.create({
    userId,
    vehicleId,
    requestType:    'plate_change',
    currentValue:   _plate(vehicle),
    requestedValue: newPlate.toUpperCase(),
    reason: reason || null,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Plate Change Request Submitted',
    message: `Your request to change plate from ${_plate(vehicle)} to ${newPlate.toUpperCase()} is under review.`,
    type:    'vehicle_request',
    data:    { requestId: request.id, requestType: 'plate_change' },
  })
  _pushNotif(userId, notif)

  // Notify admin
  try { getIO().to('admin').emit('vehicle_request:new', { request, userId }) } catch {}

  return request
}

// ─── Request: slot swap ───────────────────────────────────────────────────────

const requestSlotSwap = async (userId, vehicleId, { requestedSlot, reason }) => {
  const vehicle = await _ownedVehicle(userId, vehicleId)

  const request = await requestsRepo.create({
    userId,
    vehicleId,
    requestType:    'slot_swap',
    currentValue:   _plate(vehicle),
    requestedValue: requestedSlot || 'Any available slot',
    reason: reason || null,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Slot Swap Request Submitted',
    message: `Your slot swap request for ${_plate(vehicle)} is under review.`,
    type:    'vehicle_request',
    data:    { requestId: request.id, requestType: 'slot_swap' },
  })
  _pushNotif(userId, notif)

  try { getIO().to('admin').emit('vehicle_request:new', { request, userId }) } catch {}

  return request
}

// ─── Request: remove vehicle ──────────────────────────────────────────────────

const requestRemoveVehicle = async (userId, vehicleId, { reason }) => {
  const vehicle = await _ownedVehicle(userId, vehicleId)

  const request = await requestsRepo.create({
    userId,
    vehicleId,
    requestType:    'remove_vehicle',
    currentValue:   _plate(vehicle),
    requestedValue: 'remove',
    reason: reason || null,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Vehicle Removal Request Submitted',
    message: `Your request to remove ${_vehicleName(vehicle)} (${_plate(vehicle)}) is under review.`,
    type:    'vehicle_request',
    data:    { requestId: request.id, requestType: 'remove_vehicle' },
  })
  _pushNotif(userId, notif)

  try { getIO().to('admin').emit('vehicle_request:new', { request, userId }) } catch {}

  return request
}

// ─── My requests ─────────────────────────────────────────────────────────────

const getMyRequests = async (userId) => {
  return requestsRepo.findByUser(userId)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _ownedVehicle = async (userId, vehicleId) => {
  const vehicle = await vehiclesRepo.findById(vehicleId)
  if (!vehicle) throw err('Vehicle not found', 404)
  const ownerId = vehicle.userId ?? vehicle.user_id
  if (ownerId !== userId) throw err('Access denied', 403)
  if (vehicle.status === 'removed') throw err('Vehicle has already been removed', 400)
  return vehicle
}

const _plate = (vehicle) => vehicle.numberPlate ?? vehicle.number_plate ?? ''
const _vehicleName = (vehicle) => vehicle.vehicleName ?? vehicle.vehicle_name ?? 'Vehicle'

const _pushNotif = (userId, notif) => {
  try { getIO().to(`user:${userId}`).emit('notification:new', notif) } catch {}
}

module.exports = {
  getVehicles,
  addVehicle,
  requestPlateChange,
  requestSlotSwap,
  requestRemoveVehicle,
  getMyRequests,
}
