const notifRepo = require('../repositories/notifications.repository')

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

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead }
