const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');

const router = Router();

router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only system endpoints
 */

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get platform statistics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Stats object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalVendors: { type: integer }
 *                     totalUsers:   { type: integer }
 */
router.get('/stats', adminController.getStats);

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: List audit logs with optional filters
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resourceType
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [success, failure] }
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
