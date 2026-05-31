const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const { authLimiter }  = require('../middlewares/rateLimiter.middleware');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and obtain JWT tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate access + refresh token pair
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoke current refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Revoke ALL sessions for the current account
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: All sessions revoked
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated account info
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Account info
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
