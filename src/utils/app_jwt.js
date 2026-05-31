const jwt  = require('jsonwebtoken')
const crypto = require('crypto')

const ACCESS_SECRET  = process.env.JWT_SECRET        || 'app_access_secret_change_me'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'app_refresh_secret_change_me'
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN     || '15m'
const REFRESH_EXP    = '30d'

const signAppAccessToken  = (userId) =>
  jwt.sign({ sub: userId, type: 'app_user' }, ACCESS_SECRET, { expiresIn: ACCESS_EXP })

const signAppRefreshToken = (userId) =>
  jwt.sign({ sub: userId, type: 'app_user', jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: REFRESH_EXP })

const verifyAppAccessToken  = (token) => jwt.verify(token, ACCESS_SECRET)
const verifyAppRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET)

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

const refreshExpiresAt = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d
}

module.exports = { signAppAccessToken, signAppRefreshToken, verifyAppAccessToken, verifyAppRefreshToken, hashToken, refreshExpiresAt }
