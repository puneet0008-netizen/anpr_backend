/**
 * Audit log repository — Mongoose.
 */
const AuditLog = require('../models/auditLogs.model');
const { v4: uuidv4 } = require('uuid');

const findAll = async ({
  actorId      = null,
  action       = null,
  resourceType = null,
  status       = null,
  limit        = 20,
  offset       = 0,
} = {}) => {
  const filter = {};
  if (actorId)      filter.actorId      = actorId;
  if (action)       filter.action       = action;
  if (resourceType) filter.resourceType = resourceType;
  if (status)       filter.status       = status;

  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { rows, total };
};

const create = async ({ actorId, actorRole, action, resourceType, resourceId, details, ipAddress, userAgent, status = 'success' }) => {
  const doc = new AuditLog({
    _id: uuidv4(),
    actorId:      actorId || null,
    actorRole,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
    status,
  });
  await doc.save();
  return doc.toObject();
};

module.exports = { findAll, create };
