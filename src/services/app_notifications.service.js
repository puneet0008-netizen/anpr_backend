const notifRepo        = require('../repositories/notifications.repository')
const deviceTokensRepo = require('../repositories/device_tokens.repository')

// ─── List ─────────────────────────────────────────────────────────────────────

const getNotifications = async (userId, { limit = 20, offset = 0, unreadOnly = false } = {}) => {
  return notifRepo.findByUser(userId, { limit, offset, unreadOnly })
}

// ─── Unread count ─────────────────────────────────────────────────────────────

const getUnreadCount = async (userId) => {
  return notifRepo.getUnreadCount(userId)
}

// ─── Mark one read ────────────────────────────────────────────────────────────

const markRead = async (id, userId) => {
  await notifRepo.markRead(id, userId)
}

// ─── Mark all read ────────────────────────────────────────────────────────────

const markAllRead = async (userId) => {
  await notifRepo.markAllRead(userId)
}

// ─── Device token (FCM) ───────────────────────────────────────────────────────

const registerDeviceToken = async (userId, { token, platform, deviceId }) => {
  return deviceTokensRepo.upsert({ userId, token, platform, deviceId: deviceId || null })
}

const removeDeviceToken = async (userId, token) => {
  await deviceTokensRepo.removeToken(userId, token)
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  registerDeviceToken,
  removeDeviceToken,
}
