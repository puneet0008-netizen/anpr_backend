const parkingService = require('../services/app_parking.service')
const { sendSuccess } = require('../utils/response')

const getHistory = async (req, res, next) => {
  try {
    const limit     = parseInt(req.query.limit)  || 20
    const offset    = parseInt(req.query.offset) || 0
    const startDate = req.query.startDate || undefined
    const endDate   = req.query.endDate   || undefined
    const data = await parkingService.getHistory(req.appUser.id, { limit, offset, startDate, endDate })
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const getTodaySessions = async (req, res, next) => {
  try {
    const data = await parkingService.getTodaySessions(req.appUser.id)
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getHistory, getTodaySessions }
