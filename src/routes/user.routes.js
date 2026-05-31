const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');
const {
  createUserSchema,
  updateUserSchema,
  listQuerySchema,
} = require('../validators/user.validator');

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get own profile (all roles)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Own profile
 */
router.get('/me', userController.getMe);

/**
 * @swagger
 * /users/lookup/{carNumber}:
 *   get:
 *     summary: ANPR lookup – find user by car number plate
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: carNumber
 *         required: true
 *         schema: { type: string, example: MH12AB1234 }
 *     responses:
 *       200:
 *         description: User data associated with the plate
 *       404:
 *         description: Car not found
 */
router.get(
  '/lookup/:carNumber',
  authorize('admin', 'vendor'),
  userController.lookupCarNumber
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Username or car number already taken
 */
router.post(
  '/',
  authorize('admin', 'vendor'),
  validate(createUserSchema),
  auditLog('CREATE_USER', 'user'),
  userController.create
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users (admin sees all; vendor sees own users)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get(
  '/',
  authorize('admin', 'vendor'),
  validate(listQuerySchema, 'query'),
  userController.list
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID (users can only get themselves)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User data
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.get('/:id', userController.getById);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update user (admin/vendor only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated user
 */
router.patch(
  '/:id',
  authorize('admin', 'vendor'),
  validate(updateUserSchema),
  auditLog('UPDATE_USER', 'user', (req) => req.params.id),
  userController.update
);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.patch(
  '/:id/deactivate',
  authorize('admin', 'vendor'),
  auditLog('DEACTIVATE_USER', 'user', (req) => req.params.id),
  userController.deactivate
);

module.exports = router;
