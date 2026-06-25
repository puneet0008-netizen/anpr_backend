const { v4: uuidv4 } = require('uuid')
const walletRepo  = require('../repositories/wallet.repository')
const usersRepo   = require('../repositories/parking_users.repository')
const { sendAppNotification } = require('./notification_dispatch.service')
const { getIO }   = require('../sockets')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── Recharge options (defined by backend) ────────────────────────────────────
const RECHARGE_OPTIONS = [
  { id: 1, amount: 100,  label: '₹100',  description: 'Basic recharge' },
  { id: 2, amount: 500,  label: '₹500',  description: 'Standard recharge' },
  { id: 3, amount: 1000, label: '₹1000', description: 'Premium recharge' },
]

const getRechargeOptions = () => RECHARGE_OPTIONS

// ─── Get wallet ───────────────────────────────────────────────────────────────

const getWallet = async (userId) => {
  const wallet = await walletRepo.findByUser(userId)
  return {
    balance:        parseFloat(wallet?.balance) || 0,
    totalRecharges: parseFloat(wallet?.total_recharges) || 0,
    lastRechargeAt: wallet?.last_recharge_at || null,
  }
}

// ─── Recharge ─────────────────────────────────────────────────────────────────

const recharge = async (userId, { amount, paymentMethod = 'UPI' }) => {
  // Validate amount against allowed options
  const validAmounts = RECHARGE_OPTIONS.map((o) => o.amount)
  if (!validAmounts.includes(Number(amount))) {
    throw err(`Invalid amount. Allowed: ${validAmounts.join(', ')}`, 400)
  }

  const user = await usersRepo.findById(userId)
  if (!user) throw err('User not found', 404)

  const transactionRef = `TXN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`

  const record = await walletRepo.recharge(userId, amount, paymentMethod, transactionRef)
  const wallet = await walletRepo.findByUser(userId)

  await sendAppNotification(userId, {
    title:   'Wallet Recharged',
    message: `₹${amount} has been added to your wallet. New balance: ₹${parseFloat(wallet.balance).toFixed(2)}.`,
    type:    'wallet_recharge',
    data:    { amount, transactionRef, balance: parseFloat(wallet.balance) },
  })
  try { getIO().to(`user:${userId}`).emit('wallet:recharged', { amount, balance: parseFloat(wallet.balance), transactionRef }) } catch {}

  return {
    transactionRef,
    amount:     parseFloat(record.amount),
    balance:    parseFloat(wallet.balance),
    rechargedAt: record.created_at,
  }
}

// ─── Recharge history ─────────────────────────────────────────────────────────

const getRechargeHistory = async (userId, { limit = 20, offset = 0 } = {}) => {
  return walletRepo.getRechargeHistory(userId, { limit, offset })
}

module.exports = { getRechargeOptions, getWallet, recharge, getRechargeHistory }
