const parkingService = require('../services/app_parking.service')
const { sendSuccess } = require('../utils/response')

const getHistory = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit)  || 20
    const offset = parseInt(req.query.offset) || 0
    const date = req.query.date ? String(req.query.date) : undefined

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'date query param is required (YYYY-MM-DD)',
      })
    }

    const data = await parkingService.getHistory(req.appUser.id, { limit, offset, date })
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
