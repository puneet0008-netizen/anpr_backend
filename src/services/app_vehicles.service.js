const vehiclesRepo  = require('../repositories/app_vehicles.repository')
const requestsRepo  = require('../repositories/vehicle_requests.repository')
const notifRepo     = require('../repositories/notifications.repository')
const { getIO }     = require('../sockets')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── List vehicles ────────────────────────────────────────────────────────────

const getVehicles = async (userId) => {
  return vehiclesRepo.findByUser(userId)
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
    data:    { vehicleId: vehicle.id, numberPlate: vehicle.number_plate },
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
    currentValue:   vehicle.number_plate,
    requestedValue: newPlate.toUpperCase(),
    reason: reason || null,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Plate Change Request Submitted',
    message: `Your request to change plate from ${vehicle.number_plate} to ${newPlate.toUpperCase()} is under review.`,
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
    currentValue:   vehicle.number_plate,
    requestedValue: requestedSlot || 'Any available slot',
    reason: reason || null,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Slot Swap Request Submitted',
    message: `Your slot swap request for ${vehicle.number_plate} is under review.`,
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
    currentValue:   vehicle.number_plate,
    requestedValue: 'remove',
    reason: reason || null,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Vehicle Removal Request Submitted',
    message: `Your request to remove ${vehicle.vehicle_name} (${vehicle.number_plate}) is under review.`,
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
  if (vehicle.user_id !== userId) throw err('Access denied', 403)
  if (vehicle.status === 'removed') throw err('Vehicle has already been removed', 400)
  return vehicle
}

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
