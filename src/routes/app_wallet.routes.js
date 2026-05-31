const { Router } = require('express')
const ctrl = require('../controllers/app_wallet.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')
const { validate } = require('../middlewares/validate.middleware')
const { rechargeSchema } = require('../validators/app.validator')

const router = Router()
router.use(appAuthenticate)

/**
 * @swagger
 * tags:
 *   name: App Wallet
 *   description: Mobile app wallet & recharge
 */

/**
 * @swagger
 * /app/wallet:
 *   get:
 *     summary: Get wallet balance
 *     tags: [App Wallet]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', ctrl.getWallet)

/**
 * @swagger
 * /app/wallet/recharge-options:
 *   get:
 *     summary: Get available recharge amounts (defined by backend)
 *     tags: [App Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of recharge options (100, 500, 1000)
 */
router.get('/recharge-options', ctrl.getRechargeOptions)

/**
 * @swagger
 * /app/wallet/history:
 *   get:
 *     summary: Get recharge history
 *     tags: [App Wallet]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/history', ctrl.getRechargeHistory)

/**
 * @swagger
 * /app/wallet/recharge:
 *   post:
 *     summary: Recharge wallet
 *     tags: [App Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:        { type: number, enum: [100, 500, 1000] }
 *               paymentMethod: { type: string, enum: [Cash, UPI, Card], default: UPI }
 */
router.post('/recharge', validate(rechargeSchema), ctrl.recharge)

module.exports = router
