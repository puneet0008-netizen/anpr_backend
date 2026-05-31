const { verifyAccessToken } = require('../utils/jwt')
const { sendUnauthorized }  = require('../utils/response')
const logger                = require('../utils/logger')

/**
 * JWT middleware for mobile-app users.
 * Expects a Bearer token signed with role = 'app_user'.
 * Sets req.appUser = { id, role: 'app_user' }
 */
const appAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Missing or malformed Authorization header')
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyAccessToken(token)

    if (decoded.role !== 'app_user') {
      return sendUnauthorized(res, 'Invalid token type for app')
    }

    req.appUser = { id: decoded.id, role: decoded.role }
    next()
  } catch (err) {
    logger.warn('App JWT auth failed', { error: err.message, ip: req.ip })
    if (err.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Access token expired')
    }
    return sendUnauthorized(res, 'Invalid access token')
  }
}

module.exports = { appAuthenticate }
