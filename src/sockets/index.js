/**
 * Socket.IO singleton.
 *
 * Call initSocket(httpServer) once during app startup.
 * Call getIO() anywhere to emit events.
 */
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const { getSocketCorsOptions } = require('../config/cors');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors:        getSocketCorsOptions(),
    pingTimeout:  20000,
    pingInterval: 25000,
  });

  // ── JWT auth handshake ──────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded    = verifyAccessToken(token);
      socket.user      = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      logger.warn('Socket auth failed', { error: err.message });
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    logger.info('Socket connected', { socketId: socket.id, accountId: id, role });

    // Join role-based rooms for broadcasting
    socket.join(role);                   // e.g. 'admin', 'vendor', 'user', 'app_user'
    if (role === 'vendor') {
      socket.join(`vendor:${id}`);       // vendor-specific room
    }
    if (role === 'user') {
      socket.join(`user:${id}`);         // portal user-specific room
    }
    if (role === 'app_user') {
      socket.join(`user:${id}`);         // app user – same room convention for notifications
      require('./parkingStatus').registerParkingStatusHandlers(socket);
    }

    socket.emit('connected', {
      message: `Welcome! Connected as ${role}`,
      accountId: id,
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, accountId: id, reason });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err.message });
    });
  });

  logger.info('Socket.IO initialised');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialised – call initSocket first');
  return io;
};

module.exports = { initSocket, getIO };
