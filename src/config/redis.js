const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;

// Set REDIS_ENABLED=false in .env to skip Redis entirely
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

const getRedisClient = async () => {
  if (!REDIS_ENABLED) return null;
  if (client) return client;

  client = createClient({
    socket: {
      host:           process.env.REDIS_HOST || 'localhost',
      port:           Number(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        if (retries >= 3) {
          logger.warn('Redis unavailable after 3 retries – caching disabled');
          return false; // stop retrying
        }
        return Math.min(retries * 500, 2000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error', (err) => {
    // Only log first error, not every reconnect attempt
    if (!client._loggedError) {
      logger.warn('Redis unavailable – caching disabled', { error: err.message });
      client._loggedError = true;
    }
  });
  client.on('connect', () => { client._loggedError = false; logger.info('Redis connected'); });

  try {
    await client.connect();
  } catch {
    client = null;
    return null;
  }
  return client;
};

/**
 * Cache-aside helpers
 */
const cacheGet = async (key) => {
  try {
    const c = await getRedisClient();
    const val = await c.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

const cacheSet = async (key, value, ttlSeconds = null) => {
  try {
    const c = await getRedisClient();
    const ttl = ttlSeconds || Number(process.env.REDIS_TTL) || 3600;
    await c.setEx(key, ttl, JSON.stringify(value));
  } catch { /* non-fatal */ }
};

const cacheDel = async (key) => {
  try {
    const c = await getRedisClient();
    await c.del(key);
  } catch { /* non-fatal */ }
};

const cacheDelPattern = async (pattern) => {
  try {
    const c = await getRedisClient();
    const keys = await c.keys(pattern);
    if (keys.length) await c.del(keys);
  } catch { /* non-fatal */ }
};

module.exports = { getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
