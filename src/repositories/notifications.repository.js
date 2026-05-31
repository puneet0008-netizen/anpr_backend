const Notification = require('../models/notifications.model');
const { v4: uuidv4 } = require('uuid');

const findByUser = async (userId, { limit = 20, offset = 0, unreadOnly = false } = {}) => {
  const filter = { userId };
  if (unreadOnly) filter.isRead = false;
  return Notification.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, isRead: false });
};

const create = async ({ userId, title, message, type, data = null }) => {
  const doc = new Notification({
    _id: uuidv4(),
    userId,
    title,
    message,
    type,
    data: data || null,
  });
  await doc.save();
  return doc.toObject();
};

const markRead = async (id, userId) => {
  await Notification.updateOne({ _id: id, userId }, { $set: { isRead: true } });
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
};

module.exports = { findByUser, getUnreadCount, create, markRead, markAllRead };
