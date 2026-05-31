const Visitor = require('../models/visitors.model');
const { v4: uuidv4 } = require('uuid');

const generateTrackingNumber = () => {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand  = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VIS-${date}-${rand}`;
};

const findByUser = async (userId, { limit = 20, offset = 0, status } = {}) => {
  const filter = { invitedBy: userId };
  if (status) filter.status = status;
  return Visitor.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
};

const findByTracking = async (trackingNumber) => {
  return Visitor.findOne({ trackingNumber }).lean();
};

const create = async (d) => {
  const trackingNumber = generateTrackingNumber();
  const doc = new Visitor({
    _id:              uuidv4(),
    invitedBy:        d.invitedBy || null,
    visitorName:      d.visitorName,
    visitorPhone:     d.visitorPhone,
    visitorCarNumber: d.visitorCarNumber.toUpperCase(),
    purpose:          d.purpose,
    visitDate:        d.visitDate,
    visitTime:        d.visitTime,
    durationHours:    d.durationHours,
    durationMinutes:  d.durationMinutes,
    trackingNumber,
  });
  await doc.save();
  return doc.toObject();
};

const updateStatus = async (id, status) => {
  return Visitor.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
};

module.exports = { findByUser, findByTracking, create, updateStatus };
