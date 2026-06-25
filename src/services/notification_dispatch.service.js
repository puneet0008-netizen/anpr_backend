const notifRepo = require('../repositories/notifications.repository');
const { getIO } = require('../sockets');

/**
 * Save notification to DB and push real-time via socket.
 */
const sendAppNotification = async (userId, { title, message, type, data = null }) => {
  const notif = await notifRepo.create({ userId, title, message, type, data });

  try {
    getIO().to(`user:${userId}`).emit('notification:new', notif);
  } catch (_) {}

  return notif;
};

module.exports = { sendAppNotification };
