const bcrypt      = require('bcryptjs')
const usersRepo   = require('../repositories/parking_users.repository')
const vehiclesRepo = require('../repositories/app_vehicles.repository')
const walletRepo  = require('../repositories/wallet.repository')
const sessionsRepo = require('../repositories/parking_sessions.repository')
const notifRepo   = require('../repositories/notifications.repository')

const SALT_ROUNDS = 12
const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── Get full profile ─────────────────────────────────────────────────────────

const getProfile = async (userId) => {
  const [user, wallet, vehicles, recentActivity] = await Promise.all([
    usersRepo.findById(userId),
    walletRepo.findByUser(userId),
    vehiclesRepo.findByUser(userId),
    notifRepo.findByUser(userId, { limit: 10 }),
  ])

  if (!user) throw err('User not found', 404)

  return {
    id:           user.id,
    name:         user.name,
    email:        user.email,
    phone:        user.phone,
    username:     user.username || null,
    profilePhoto: user.profile_photo_url || null,
    status:       user.status,
    joinedAt:     user.joined_at,
    wallet: {
      balance:        parseFloat(wallet?.balance) || 0,
      totalRecharges: parseFloat(wallet?.total_recharges) || 0,
      lastRechargeAt: wallet?.last_recharge_at || null,
    },
    vehicles:       vehicles,
    vehicleCount:   vehicles.length,
    recentActivity: recentActivity,
  }
}

// ─── Update profile ───────────────────────────────────────────────────────────

const updateProfile = async (userId, { username, password, name, phone }) => {
  const user = await usersRepo.findById(userId)
  if (!user) throw err('User not found', 404)

  const updates = {}
  if (name     !== undefined) updates.name = name
  if (phone    !== undefined) updates.phone = phone
  if (username !== undefined) {
    // Save username via direct query since updateById doesn't support it
    const { query } = require('../config/database')
    await query(`UPDATE parking_users SET username = $1, updated_at = NOW() WHERE id = $2`, [username, userId])
  }
  if (password !== undefined) {
    updates.passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  }

  if (Object.keys(updates).length) {
    await usersRepo.updateById(userId, updates)
  }

  return getProfile(userId)
}

// ─── Update profile photo ─────────────────────────────────────────────────────

const updateProfilePhoto = async (userId, photoUrl) => {
  const { query } = require('../config/database')
  await query(
    `UPDATE parking_users SET profile_photo_url = $1, updated_at = NOW() WHERE id = $2`,
    [photoUrl, userId]
  )
  return { profilePhoto: photoUrl }
}

module.exports = { getProfile, updateProfile, updateProfilePhoto }
