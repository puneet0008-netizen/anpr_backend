const { verifyAppAccessToken } = require('../utils/app_jwt')
const { query }               = require('../config/database')
const { sendUnauthorized }    = require('../utils/response')

const appAuthenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return sendUnauthorized(res, 'Missing token')

    const token   = header.slice(7)
    const payload = verifyAppAccessToken(token)

    if (payload.type !== 'app_user') return sendUnauthorized(res, 'Invalid token type')

    const { rows } = await query(
      `SELECT id, name, email, phone, vehicle_number, status, type, profile_photo_url, username
       FROM parking_users WHERE id = $1`,
      [payload.sub]
    )
    if (!rows[0]) return sendUnauthorized(res, 'User not found')
    if (rows[0].status !== 'active') return sendUnauthorized(res, 'Account suspended')

    req.appUser = rows[0]
    next()
  } catch (e) {
    return sendUnauthorized(res, 'Invalid or expired token')
  }
}

module.exports = { appAuthenticate }
