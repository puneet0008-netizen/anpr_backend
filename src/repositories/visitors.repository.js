const Visitor = require('../models/visitors.model');
const { v4: uuidv4 } = require('uuid');
const { formatVisitor } = require('../utils/visitorWindow');

const generateTrackingNumber = () => {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand  = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VIS-${date}-${rand}`;
};

const findByUser = async (userId, { limit = 20, offset = 0, status } = {}) => {
  const filter = { invitedBy: userId };
  if (status) filter.status = status;
  const rows = await Visitor.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
  return rows.map(formatVisitor);
};

const findByIdAndUser = async (id, userId) => {
  const row = await Visitor.findOne({ _id: id, invitedBy: userId }).lean();
  return formatVisitor(row);
};

const findByTracking = async (trackingNumber) => {
  const row = await Visitor.findOne({ trackingNumber }).lean();
  return formatVisitor(row);
};

const create = async (d) => {
  const trackingNumber = generateTrackingNumber();
  const carNumber = (d.visitorCarNumber || '').trim().toUpperCase();

  const doc = new Visitor({
    _id:              uuidv4(),
    invitedBy:        d.invitedBy || null,
    visitorName:      d.visitorName,
    visitorPhone:     d.visitorPhone,
    visitorCarNumber: carNumber,
    purpose:          d.purpose,
    fromDate:         d.fromDate,
    toDate:           d.toDate,
    fromTime:         d.fromTime,
    toTime:           d.toTime,
    validFrom:        d.validFrom,
    validUntil:       d.validUntil,
    validityText:     d.validityText,
    visitDate:        d.visitDate,
    visitTime:        d.visitTime,
    durationHours:    d.durationHours,
    durationMinutes:  d.durationMinutes,
    trackingNumber,
  });
  await doc.save();
  return formatVisitor(doc.toObject());
};

const updateStatus = async (id, status) => {
  const row = await Visitor.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  return formatVisitor(row);
};

module.exports = { findByUser, findByIdAndUser, findByTracking, create, updateStatus };
