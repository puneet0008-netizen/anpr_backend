const logger = require('../utils/logger');

/**
 * Global error-handling middleware.
 * Must be registered AFTER all routes with app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log full stack in dev; just message in production
  logger.error('Unhandled error', {
    message:   err.message,
    stack:     process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path:      req.path,
    method:    req.method,
    ip:        req.ip,
  });

  // Joi / Zod validation errors forwarded from validate middleware
  if (err.name === 'ValidationError' || err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  err.details || [{ message: err.message }],
    });
  }

  // JWT errors not caught in auth middleware (edge cases)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // PostgreSQL unique constraint
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry – resource already exists' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced resource does not exist' });
  }

  // PostgreSQL invalid UUID / wrong data type syntax (e.g. passing a string where UUID expected)
  if (err.code === '22P02') {
    return res.status(400).json({ success: false, message: 'Invalid ID format – must be a valid UUID' });
  }

  // PostgreSQL check constraint violation (e.g. wrong enum value for role/status)
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'Value violates a database constraint – check your field values' });
  }

  // PostgreSQL not-null violation
  if (err.code === '23502') {
    return res.status(400).json({ success: false, message: `Missing required field: ${err.column || 'unknown'}` });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message    = statusCode < 500 ? err.message : 'Internal server error';

  return res.status(statusCode).json({ success: false, message });
};

/**
 * 404 handler – register BEFORE errorHandler, AFTER all routes.
 */
const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });

module.exports = { errorHandler, notFound };
