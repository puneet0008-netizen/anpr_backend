const { Router } = require('express')
const ctrl = require('../controllers/app_auth.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')
const { validate } = require('../middlewares/validate.middleware')
const { loginSchema, refreshSchema } = require('../validators/app.validator')

const router = Router()

/**
 * @swagger
 * tags:
 *   name: App Auth
 *   description: Mobile app authentication
 */

/**
 * @swagger
 * /app/auth/login:
 *   post:
 *     summary: Login (mobile app user)
 *     tags: [App Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: user@example.com }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       200:
 *         description: Login successful – returns accessToken + refreshToken
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), ctrl.login)

/**
 * @swagger
 * /app/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [App Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access + refresh tokens
 */
router.post('/refresh', validate(refreshSchema), ctrl.refresh)

/**
 * @swagger
 * /app/auth/logout:
 *   post:
 *     summary: Logout (revoke refresh token)
 *     tags: [App Auth]
 */
router.post('/logout', ctrl.logout)

/**
 * @swagger
 * /app/auth/logout-all:
 *   post:
 *     summary: Logout all devices
 *     tags: [App Auth]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout-all', appAuthenticate, ctrl.logoutAll)

module.exports = router
