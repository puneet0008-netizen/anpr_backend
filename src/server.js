require('dotenv').config();

const http   = require('http');
const app    = require('./app');
const { initSocket }    = require('./sockets');
const { initFirebase }  = require('./config/firebase');
const db                = require('./config/database');
const { getRedisClient } = require('./config/redis');
const logger            = require('./utils/logger');

const PORT = Number(process.env.PORT) || 3001;

const server = http.createServer(app);

// Attach Socket.IO
initSocket(server);
initFirebase();

// ── Startup ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Connect to MongoDB
    await db.connect();

    // Verify Redis (non-fatal)
    try {
      await getRedisClient();
      logger.info('Redis connection verified');
    } catch (redisErr) {
      logger.warn('Redis unavailable – caching disabled', { error: redisErr.message });
    }

    server.listen(PORT, () => {
      logger.info(`🚀  ANPR API running on port ${PORT}`);
      logger.info(`📄  Swagger docs at http://localhost:${PORT}/api-docs`);
      logger.info(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received – shutting down gracefully`);
  server.close(async () => {
    try {
      await db.mongoose.disconnect();
      logger.info('MongoDB connection closed');
    } catch (_) {}
    process.exit(0);
  });

  // Force-kill after 10 s
  setTimeout(() => { logger.error('Forced exit'); process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start();
