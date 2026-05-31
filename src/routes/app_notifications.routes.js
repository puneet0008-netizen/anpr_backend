const { Router } = require('express')
const ctrl = require('../controllers/app_notifications.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')

const router = Router()
router.use(appAuthenticate)

/**
 * @swagger
 * tags:
 *   name: App Notifications
 *   description: Mobile app notifications
 */

/**
 * @swagger
 * /app/notifications:
 *   get:
 *     summary: List notifications
 *     tags: [App Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, default: false }
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
 * /app/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [App Notifications]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/unread-count', ctrl.unreadCount)

/**
 * @swagger
 * /app/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [App Notifications]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/read-all', ctrl.markAllRead)

/**
 * @swagger
 * /app/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [App Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.patch('/:id/read', ctrl.markRead)

module.exports = router
