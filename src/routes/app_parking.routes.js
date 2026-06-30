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
 *     summary: Parking history for a single date
 *     tags: [App Parking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date, example: '2026-04-20' }
 *         description: Calendar day (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 */
router.get('/history', ctrl.getHistory)

module.exports = router
