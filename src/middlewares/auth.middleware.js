const { verifyAccessToken }  = require('../utils/jwt');
const { sendUnauthorized }   = require('../utils/response');
const logger                 = require('../utils/logger');

/**
 * Verifies the Bearer token in the Authorization header.
 * Attaches decoded payload to req.user = { id, role }.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Missing or malformed Authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    logger.warn('Invalid access token', { error: err.message, ip: req.ip });
    if (err.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Access token expired');
    }
    return sendUnauthorized(res, 'Invalid access token');
  }
};

module.exports = { authenticate };
