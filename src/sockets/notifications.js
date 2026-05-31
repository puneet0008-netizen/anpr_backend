/**
 * Notification helpers – thin wrappers over getIO().emit()
 * so business logic never imports Socket.IO directly.
 */
const { getIO } = require('./index');

/**
 * Notify the admin room when any vendor is created.
 */
const notifyVendorCreated = (vendorId, createdBy) => {
  getIO().to('admin').emit('vendor:created', {
    vendorId,
    createdBy,
    timestamp: new Date(),
  });
};

/**
 * Notify the creating vendor AND admin when a user is created.
 */
const notifyUserCreated = (userId, createdBy, creatorRole) => {
  const io = getIO();

  io.to('admin').emit('user:created', { userId, createdBy, creatorRole, timestamp: new Date() });

  if (creatorRole === 'vendor') {
    io.to(`vendor:${createdBy}`).emit('user:created', {
      userId,
      createdBy,
      timestamp: new Date(),
    });
  }
};

/**
 * Notify a specific user (e.g. account status change).
 */
const notifyUser = (userId, event, payload) => {
  getIO().to(`user:${userId}`).emit(event, { ...payload, timestamp: new Date() });
};

module.exports = { notifyVendorCreated, notifyUserCreated, notifyUser };
