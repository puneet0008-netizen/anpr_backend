const walletService = require('../services/app_wallet.service')
const { sendSuccess, sendCreated } = require('../utils/response')

const getWallet = async (req, res, next) => {
  try {
    const data = await walletService.getWallet(req.appUser.id)
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const getRechargeOptions = async (req, res, next) => {
  try {
    const data = walletService.getRechargeOptions()
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

const recharge = async (req, res, next) => {
  try {
    const { amount, paymentMethod } = req.body
    const data = await walletService.recharge(req.appUser.id, { amount, paymentMethod })
    return sendCreated(res, { message: 'Wallet recharged successfully', data })
  } catch (err) {
    next(err)
  }
}

const getRechargeHistory = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit)  || 20
    const offset = parseInt(req.query.offset) || 0
    const data   = await walletService.getRechargeHistory(req.appUser.id, { limit, offset })
    return sendSuccess(res, { data })
  } catch (err) {
    next(err)
  }
}

module.exports = { getWallet, getRechargeOptions, recharge, getRechargeHistory }
