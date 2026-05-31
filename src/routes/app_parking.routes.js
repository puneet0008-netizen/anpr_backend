const { Router } = require('express')
const ctrl = require('../controllers/app_parking.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')

const router = Router()
router.use(appAuthenticate)

/**
 * @swagger
 * tags:
 *   name: App Parking
 *   description: Mobile app parking history
 */

/**
 * @swagger
 * /app/parking/today:
 *   get:
 *     summary: Today's parking sessions for the user
 *     tags: [App Parking]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/today', ctrl.getTodaySessions)

/**
 * @swagger
 * /app/parking/history:
 *   get:
 *     summary: Parking history (with optional date range)
 *     tags: [App Parking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 */
router.get('/history', ctrl.getHistory)

module.exports = router
