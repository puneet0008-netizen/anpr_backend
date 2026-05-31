const requestsRepo  = require('../repositories/vehicle_requests.repository');
const visitorsRepo  = require('../repositories/visitors.repository');
const sessionsRepo  = require('../repositories/parking_sessions.repository');
const vehiclesRepo  = require('../repositories/app_vehicles.repository');
const notifRepo     = require('../repositories/notifications.repository');
const { sendSuccess } = require('../utils/response');
const { getIO }       = require('../sockets');

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

// ─── Vehicle Requests ─────────────────────────────────────────────────────────

const listVehicleRequests = async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const { rows, total } = await requestsRepo.findAll({ status, limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: rows, meta: { total, limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (e) { next(e); }
};

const reviewVehicleRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const request = await requestsRepo.updateStatus(id, status, adminNote || null);
    if (!request) throw err('Request not found', 404);

    // If approved, execute the actual change
    if (status === 'approved') {
      if (request.request_type === 'plate_change') {
        await vehiclesRepo.updatePlate(request.vehicle_id, request.requested_value);
      } else if (request.request_type === 'remove_vehicle') {
        await vehiclesRepo.remove(request.vehicle_id);
      } else if (request.request_type === 'slot_swap') {
        // Slot swap is informational — admin acts offline; just mark approved
      }
    }

    // Notify the user
    const notif = await notifRepo.create({
      userId:  request.user_id,
      title:   `Vehicle Request ${status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}`,
      message: adminNote
        ? `Your ${request.request_type.replace('_', ' ')} request was ${status}. Note: ${adminNote}`
        : `Your ${request.request_type.replace('_', ' ')} request was ${status}.`,
      type: 'vehicle_request_reviewed',
      data: { requestId: id, status, requestType: request.request_type },
    });
    try { getIO().to(`user:${request.user_id}`).emit('notification:new', notif); } catch {}

    res.json({ success: true, data: request });
  } catch (e) { next(e); }
};

// ─── Visitors ─────────────────────────────────────────────────────────────────

const listVisitors = async (req, res, next) => {
  try {
    const { status, date, limit = 50, offset = 0 } = req.query;
    const { query } = require('../config/database');

    const conditions = [];
    const values     = [];
    let idx = 1;

    if (status) { conditions.push(`v.status = $${idx++}`); values.push(status); }
    if (date)   { conditions.push(`v.visit_date = $${idx++}`); values.push(date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT v.*, pu.name AS invited_by_name, pu.phone AS invited_by_phone
       FROM visitors v
       LEFT JOIN parking_users pu ON pu.id = v.invited_by
       ${where}
       ORDER BY v.visit_date DESC, v.visit_time DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, parseInt(limit), parseInt(offset)]
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM visitors v ${where}`, values
    );

    res.json({ success: true, data: rows, total: parseInt(countRes.rows[0].count) });
  } catch (e) { next(e); }
};

const createVisitor = async (req, res, next) => {
  try {
    const { invitedBy, visitorName, visitorPhone, visitorCarNumber, purpose, visitDate, visitTime, durationHours, durationMinutes } = req.body;
    if (!visitorName || !visitorPhone || !visitorCarNumber || !visitDate || !visitTime) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const visitor = await visitorsRepo.create({
      invitedBy: invitedBy || null,
      visitorName, visitorPhone, visitorCarNumber,
      purpose: purpose || 'Visit',
      visitDate, visitTime,
      durationHours:   durationHours   ?? 1,
      durationMinutes: durationMinutes ?? 0,
    });
    res.status(201).json({ success: true, data: visitor });
  } catch (e) { next(e); }
};

const updateVisitorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'checked_in', 'checked_out', 'expired', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }

    const visitor = await visitorsRepo.updateStatus(id, status);
    if (!visitor) throw err('Visitor not found', 404);

    // Notify inviting user
    const notif = await notifRepo.create({
      userId:  visitor.invited_by,
      title:   `Visitor ${status.replace('_', ' ')}`,
      message: `${visitor.visitor_name} has been marked as ${status.replace('_', ' ')}.`,
      type:    'visitor_status_update',
      data:    { visitorId: id, status, trackingNumber: visitor.tracking_number },
    });
    try { getIO().to(`user:${visitor.invited_by}`).emit('notification:new', notif); } catch {}

    res.json({ success: true, data: visitor });
  } catch (e) { next(e); }
};

// ─── Parking Sessions ─────────────────────────────────────────────────────────

const listParkingSessions = async (req, res, next) => {
  try {
    const { startDate, endDate, status, limit = 50, offset = 0 } = req.query;

    const { query } = require('../config/database');
    const conditions = [];
    const values     = [];
    let idx = 1;

    if (status)    { conditions.push(`ps.status = $${idx++}`); values.push(status); }
    if (startDate) { conditions.push(`ps.entry_time >= $${idx++}`); values.push(startDate); }
    if (endDate)   { conditions.push(`ps.entry_time <= $${idx++}`); values.push(endDate); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ps.*,
              pu.name AS user_name, pu.phone AS user_phone,
              EXTRACT(EPOCH FROM (COALESCE(ps.exit_time, NOW()) - ps.entry_time))/60 AS duration_minutes_calc
       FROM parking_sessions ps
       LEFT JOIN parking_users pu ON pu.id = ps.user_id
       ${where}
       ORDER BY ps.entry_time DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

module.exports = {
  listVehicleRequests,
  reviewVehicleRequest,
  listVisitors,
  createVisitor,
  updateVisitorStatus,
  listParkingSessions,
};
