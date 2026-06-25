const notifService = require('../services/app_notifications.service')
const { sendSuccess } = require('../utils/response')

const list = async (req, res, next) => {
  try {
    const limit      = parseInt(req.query.limit)  || 20
    const offset     = parseInt(req.query.offset) || 0
    const unreadOnly = req.query.unreadOnly === 'true'
    const data = await notifService.getNotifications(req.appUser.id, { limit, offset, unreadOnly })
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const unreadCount = async (req, res, next) => {
  try {
    const count = await notifService.getUnreadCount(req.appUser.id)
    return sendSuccess(res, { data: { unreadCount: count } })
  } catch (err) {
    next(err)
  }
}

const markRead = async (req, res, next) => {
  try {
    await notifService.markRead(req.params.id, req.appUser.id)
    return sendSuccess(res, { message: 'Marked as read' })
  } catch (err) {
    next(err)
  }
}

const markAllRead = async (req, res, next) => {
  try {
    await notifService.markAllRead(req.appUser.id)
    return sendSuccess(res, { message: 'All notifications marked as read' })
  } catch (err) {
    next(err)
  }
}

const registerDeviceToken = async (req, res, next) => {
  try {
    const data = await notifService.registerDeviceToken(req.appUser.id, req.body)
    return sendSuccess(res, { message: 'Device token registered', data })
  } catch (err) {
    next(err)
  }
}

const removeDeviceToken = async (req, res, next) => {
  try {
    await notifService.removeDeviceToken(req.appUser.id, req.body.token)
    return sendSuccess(res, { message: 'Device token removed' })
  } catch (err) {
    next(err)
  }
}

module.exports = { list, unreadCount, markRead, markAllRead, registerDeviceToken, removeDeviceToken }
