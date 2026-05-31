const vehiclesService = require('../services/app_vehicles.service')
const { sendSuccess, sendCreated } = require('../utils/response')

const list = async (req, res, next) => {
  try {
    const data = await vehiclesService.getVehicles(req.appUser.id)
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const add = async (req, res, next) => {
  try {
    const { numberPlate, vehicleType, vehicleName, vehicleModel } = req.body
    const data = await vehiclesService.addVehicle(req.appUser.id, {
      numberPlate, vehicleType, vehicleName, vehicleModel,
    })
    return sendCreated(res, { message: 'Vehicle added successfully', data })
  } catch (err) {
    next(err)
  }
}

const requestPlateChange = async (req, res, next) => {
  try {
    const { newPlate, reason } = req.body
    const data = await vehiclesService.requestPlateChange(
      req.appUser.id, req.params.id, { newPlate, reason }
    )
    return sendCreated(res, { message: 'Plate change request submitted', data })
  } catch (err) {
    next(err)
  }
}

const requestSlotSwap = async (req, res, next) => {
  try {
    const { requestedSlot, reason } = req.body
    const data = await vehiclesService.requestSlotSwap(
      req.appUser.id, req.params.id, { requestedSlot, reason }
    )
    return sendCreated(res, { message: 'Slot swap request submitted', data })
  } catch (err) {
    next(err)
  }
}

const requestRemove = async (req, res, next) => {
  try {
    const { reason } = req.body
    const data = await vehiclesService.requestRemoveVehicle(
      req.appUser.id, req.params.id, { reason }
    )
    return sendCreated(res, { message: 'Vehicle removal request submitted', data })
  } catch (err) {
    next(err)
  }
}

const getRequests = async (req, res, next) => {
  try {
    const data = await vehiclesService.getMyRequests(req.appUser.id)
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

module.exports = { list, add, requestPlateChange, requestSlotSwap, requestRemove, getRequests }
