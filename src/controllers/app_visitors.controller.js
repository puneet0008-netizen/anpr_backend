const visitorsService = require('../services/app_visitors.service')
const { sendSuccess, sendCreated } = require('../utils/response')

const invite = async (req, res, next) => {
  try {
    const data = await visitorsService.inviteVisitor(req.appUser.id, req.body)
    return sendCreated(res, { message: 'Visitor invited successfully', data })
  } catch (err) {
    next(err)
  }
}

const list = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit)  || 20
    const offset = parseInt(req.query.offset) || 0
    const status = req.query.status || undefined
    const data   = await visitorsService.getVisitors(req.appUser.id, { limit, offset, status })
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const getByTracking = async (req, res, next) => {
  try {
    const data = await visitorsService.getByTracking(req.params.trackingNumber)
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const cancel = async (req, res, next) => {
  try {
    const data = await visitorsService.cancelVisitor(req.appUser.id, req.params.id)
    return sendSuccess(res, { message: 'Visitor invitation cancelled', data })
  } catch (err) {
    next(err)
  }
}

module.exports = { invite, list, getByTracking, cancel }
