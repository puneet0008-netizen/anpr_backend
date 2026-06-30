const { Router } = require('express')
const ctrl = require('../controllers/app_visitors.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')
const { validate } = require('../middlewares/validate.middleware')
const { inviteVisitorSchema } = require('../validators/app.validator')

const router = Router()
router.use(appAuthenticate)

/**
 * @swagger
 * tags:
 *   name: App Visitors
 *   description: Mobile app visitor management
 */

/**
 * @swagger
 * /app/visitors:
 *   post:
 *     summary: Invite a visitor (date range or legacy single-slot)
 *     tags: [App Visitors]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [visitorName, visitorPhone, purpose, fromDate, toDate, fromTime, toTime]
 *                 properties:
 *                   visitorName:      { type: string }
 *                   visitorPhone:     { type: string }
 *                   visitorCarNumber: { type: string, description: Optional vehicle number }
 *                   purpose:          { type: string }
 *                   fromDate:         { type: string, format: date, example: '2026-04-20' }
 *                   toDate:           { type: string, format: date, example: '2026-04-22' }
 *                   fromTime:         { type: string, example: '09:00' }
 *                   toTime:           { type: string, example: '18:00' }
 *               - type: object
 *                 required: [visitorName, visitorPhone, visitorCarNumber, purpose, visitDate, visitTime]
 *                 properties:
 *                   visitorName:      { type: string }
 *                   visitorPhone:     { type: string }
 *                   visitorCarNumber: { type: string }
 *                   purpose:          { type: string }
 *                   visitDate:        { type: string, format: date, example: '2026-04-25' }
 *                   visitTime:        { type: string, example: '14:30' }
 *                   durationHours:    { type: integer, default: 1 }
 *                   durationMinutes:  { type: integer, default: 0 }
 *     responses:
 *       201:
 *         description: Visitor invited – returns tracking number and validity window
 */
router.post('/', validate(inviteVisitorSchema), ctrl.invite)

/**
 * @swagger
 * /app/visitors:
 *   get:
 *     summary: List my visitors
 *     tags: [App Visitors]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, checked_in, checked_out, expired, cancelled] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 */
router.get('/', ctrl.list)

/**
 * @swagger
 * /app/visitors/track/{trackingNumber}:
 *   get:
 *     summary: Get visitor by tracking number
 *     tags: [App Visitors]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema: { type: string, example: VIS-20260422-AB12C }
 */
router.get('/track/:trackingNumber', ctrl.getByTracking)

/**
 * @swagger
 * /app/visitors/{id}/cancel:
 *   patch:
 *     summary: Cancel a visitor invitation
 *     tags: [App Visitors]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/:id/cancel', ctrl.cancel)

module.exports = router
