const bcrypt   = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const usersRepo  = require('../repositories/parking_users.repository')
const tokensRepo = require('../repositories/app_refresh_tokens.repository')
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} = require('../utils/jwt')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── Login ────────────────────────────────────────────────────────────────────

const login = async ({ email, password }, { ip, userAgent } = {}) => {
  const user = await usersRepo.findByEmail(email)
  if (!user) throw err('Invalid email or password', 401)
  if (user.status !== 'active') throw err('Account is inactive or suspended', 403)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw err('Invalid email or password', 401)

  const payload = { id: user._id, role: 'app_user' }
  const accessToken  = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  const tokenHash    = hashRefreshToken(refreshToken)

  await tokensRepo.create({
    userId:    user._id,
    tokenHash,
    expiresAt: refreshTokenExpiresAt(),
    ip,
    userAgent,
  })

  return { accessToken, refreshToken, user: formatUser(user) }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

const refresh = async (rawToken, { ip, userAgent } = {}) => {
  let decoded
  try {
    decoded = verifyRefreshToken(rawToken)
  } catch {
    throw err('Invalid or expired refresh token', 401)
  }

  if (decoded.role !== 'app_user') throw err('Invalid token type', 401)

  const tokenHash = hashRefreshToken(rawToken)
  const stored    = await tokensRepo.findValid(tokenHash)
  if (!stored) throw err('Refresh token revoked or expired', 401)

  // Rotate: revoke old, issue new
  await tokensRepo.revoke(tokenHash)

  const payload     = { id: decoded.id, role: 'app_user' }
  const accessToken = signAccessToken(payload)
  const newRefresh  = signRefreshToken(payload)
  const newHash     = hashRefreshToken(newRefresh)

  await tokensRepo.create({
    userId:    decoded.id,
    tokenHash: newHash,
    expiresAt: refreshTokenExpiresAt(),
    ip,
    userAgent,
  })

  return { accessToken, refreshToken: newRefresh }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

const logout = async (rawToken) => {
  if (!rawToken) return
  const tokenHash = hashRefreshToken(rawToken)
  await tokensRepo.revoke(tokenHash)
}

const logoutAll = async (userId) => {
  await tokensRepo.revokeAll(userId)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatUser = (u) => ({
  id:           u._id,
  name:         u.name,
  email:        u.email,
  phone:        u.phone,
  username:     u.username || null,
  profilePhoto: u.profilePhoto || null,
  status:       u.status,
  joinedAt:     u.joinedAt,
})

module.exports = { login, refresh, logout, logoutAll }
