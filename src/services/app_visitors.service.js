const visitorsRepo = require('../repositories/visitors.repository')
const notifRepo    = require('../repositories/notifications.repository')
const { getIO }    = require('../sockets')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── Invite visitor ───────────────────────────────────────────────────────────

const inviteVisitor = async (userId, d) => {
  const visitor = await visitorsRepo.create({
    invitedBy:        userId,
    visitorName:      d.visitorName,
    visitorPhone:     d.visitorPhone,
    visitorCarNumber: d.visitorCarNumber,
    purpose:          d.purpose,
    visitDate:        d.visitDate,
    visitTime:        d.visitTime,
    durationHours:    d.durationHours   || 1,
    durationMinutes:  d.durationMinutes || 0,
  })

  const notif = await notifRepo.create({
    userId,
    title:   'Visitor Invited',
    message: `${d.visitorName} has been invited. Tracking: ${visitor.tracking_number}`,
    type:    'visitor_invited',
    data:    { visitorId: visitor.id, trackingNumber: visitor.tracking_number },
  })
  _push(userId, notif)

  // Notify admin
  try { getIO().to('admin').emit('visitor:new', { visitor, invitedBy: userId }) } catch {}

  return visitor
}

// ─── List visitors ────────────────────────────────────────────────────────────

const getVisitors = async (userId, { limit = 20, offset = 0, status } = {}) => {
  return visitorsRepo.findByUser(userId, { limit, offset, status })
}

// ─── Get by tracking number ───────────────────────────────────────────────────

const getByTracking = async (trackingNumber) => {
  const visitor = await visitorsRepo.findByTracking(trackingNumber)
  if (!visitor) throw err('Visitor not found', 404)
  return visitor
}

// ─── Cancel visitor ───────────────────────────────────────────────────────────

const cancelVisitor = async (userId, visitorId) => {
  const { query } = require('../config/database')
  const { rows } = await query(
    `SELECT * FROM visitors WHERE id = $1 AND invited_by = $2`, [visitorId, userId]
  )
  if (!rows[0]) throw err('Visitor not found', 404)
  if (rows[0].status === 'checked_in') throw err('Cannot cancel a visitor who has already checked in', 400)

  return visitorsRepo.updateStatus(visitorId, 'cancelled')
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const _push = (userId, notif) => {
  try { getIO().to(`user:${userId}`).emit('notification:new', notif) } catch {}
}

module.exports = { inviteVisitor, getVisitors, getByTracking, cancelVisitor }
