const visitorsRepo = require('../repositories/visitors.repository')
const notifRepo    = require('../repositories/notifications.repository')
const { getIO }    = require('../sockets')
const { resolveVisitorWindow } = require('../utils/visitorWindow')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

const buildInvitePayload = (userId, input) => {
  const window = resolveVisitorWindow(input)

  return {
    invitedBy:        userId,
    visitorName:      input.visitorName,
    visitorPhone:     input.visitorPhone,
    visitorCarNumber: input.visitorCarNumber || '',
    purpose:          input.purpose,
    fromDate:         window.fromDate,
    toDate:           window.toDate,
    fromTime:         window.fromTime,
    toTime:           window.toTime,
    validFrom:        window.validFrom,
    validUntil:       window.validUntil,
    validityText:     window.validityText,
    visitDate:        window.visitDate,
    visitTime:        window.visitTime,
    durationHours:    window.durationHours,
    durationMinutes:  window.durationMinutes,
  }
}

// ─── Invite visitor ───────────────────────────────────────────────────────────

const inviteVisitor = async (userId, input) => {
  const payload = buildInvitePayload(userId, input)
  const visitor = await visitorsRepo.create(payload)

  const notif = await notifRepo.create({
    userId,
    title:   'Visitor Invited',
    message: `${payload.visitorName} has been invited. Tracking: ${visitor.trackingNumber}`,
    type:    'visitor_invited',
    data:    { visitorId: visitor.id, trackingNumber: visitor.trackingNumber },
  })
  _push(userId, notif)

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
  const visitor = await visitorsRepo.findByIdAndUser(visitorId, userId)
  if (!visitor) throw err('Visitor not found', 404)
  if (visitor.status === 'checked_in') {
    throw err('Cannot cancel a visitor who has already checked in', 400)
  }

  return visitorsRepo.updateStatus(visitorId, 'cancelled')
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const _push = (userId, notif) => {
  try { getIO().to(`user:${userId}`).emit('notification:new', notif) } catch {}
}

module.exports = { inviteVisitor, getVisitors, getByTracking, cancelVisitor, buildInvitePayload }
