const { Router } = require('express');
const vendorController = require('../controllers/vendor.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/rbac.middleware');
const { validate }      = require('../middlewares/validate.middleware');
const { auditLog }      = require('../middlewares/audit.middleware');
const {
  createVendorSchema,
  updateVendorSchema,
  listQuerySchema,
} = require('../validators/vendor.validator');

const router = Router();

// All vendor routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor management (admin only)
 */

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVendorRequest'
 *     responses:
 *       201:
 *         description: Vendor created
 *       409:
 *         description: Username already taken
 */
router.post(
  '/',
  authorize('admin'),
  validate(createVendorSchema),
  auditLog('CREATE_VENDOR', 'vendor'),
  vendorController.create
);

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: List all vendors (paginated)
 *     tags: [Vendors]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [created_at, username] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated vendor list
 */
router.get(
  '/',
  authorize('admin'),
  validate(listQuerySchema, 'query'),
  vendorController.list
);

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get a single vendor by ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor data
 *       404:
 *         description: Vendor not found
 */
router.get('/:id', authorize('admin'), vendorController.getById);

/**
 * @swagger
 * /vendors/{id}:
 *   patch:
 *     summary: Update a vendor (phone / password / status)
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated vendor
 */
router.patch(
  '/:id',
  authorize('admin'),
  validate(updateVendorSchema),
  auditLog('UPDATE_VENDOR', 'vendor', (req) => req.params.id),
  vendorController.update
);

/**
 * @swagger
 * /vendors/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor deactivated
 */
router.patch(
  '/:id/deactivate',
  authorize('admin'),
  auditLog('DEACTIVATE_VENDOR', 'vendor', (req) => req.params.id),
  vendorController.deactivate
);

module.exports = router;
