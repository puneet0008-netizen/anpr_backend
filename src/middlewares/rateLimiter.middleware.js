const rateLimit = require('express-rate-limit');
const logger    = require('../utils/logger');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const max      = Number(process.env.RATE_LIMIT_MAX)       || 100;

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit hit', { ip: req.ip, path: req.path });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict limiter for auth endpoints (prevent brute-force)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes.' },
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit hit', { ip: req.ip, path: req.path });
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { apiLimiter, authLimiter };
