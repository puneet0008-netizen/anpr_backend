const { Router } = require('express')
const ctrl = require('../controllers/app_vehicles.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')
const { validate } = require('../middlewares/validate.middleware')
const {
  addVehicleSchema,
  plateChangeSchema,
  slotSwapSchema,
  removeVehicleSchema,
} = require('../validators/app.validator')

const router = Router()
router.use(appAuthenticate)

/**
 * @swagger
 * tags:
 *   name: App Vehicles
 *   description: Mobile app vehicle management
 */

/**
 * @swagger
 * /app/vehicles:
 *   get:
 *     summary: List user's vehicles with live IN/OUT parking status
 *     tags: [App Vehicles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Vehicles with parking totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     vehicles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           numberPlate: { type: string }
 *                           carStatus: { type: string, enum: [IN, OUT] }
 *                     totalIn: { type: integer, example: 1 }
 *                     totalOut: { type: integer, example: 2 }
 */
router.get('/', ctrl.list)

/**
 * @swagger
 * /app/vehicles:
 *   post:
 *     summary: Add a new vehicle
 *     tags: [App Vehicles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [numberPlate, vehicleType, vehicleName, vehicleModel]
 *             properties:
 *               numberPlate:  { type: string, example: MH12AB1234 }
 *               vehicleType:  { type: string, enum: [two_wheeler, four_wheeler] }
 *               vehicleName:  { type: string, example: Honda City }
 *               vehicleModel: { type: string, example: SV 2022 }
 */
router.post('/', validate(addVehicleSchema), ctrl.add)

/**
 * @swagger
 * /app/vehicles/requests:
 *   get:
 *     summary: List my vehicle change requests
 *     tags: [App Vehicles]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/requests', ctrl.getRequests)

/**
 * @swagger
 * /app/vehicles/{id}/change-plate:
 *   post:
 *     summary: Request a number plate change
 *     tags: [App Vehicles]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/change-plate', validate(plateChangeSchema), ctrl.requestPlateChange)

/**
 * @swagger
 * /app/vehicles/{id}/slot-swap:
 *   post:
 *     summary: Request a slot swap
 *     tags: [App Vehicles]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/slot-swap', validate(slotSwapSchema), ctrl.requestSlotSwap)

/**
 * @swagger
 * /app/vehicles/{id}/remove:
 *   post:
 *     summary: Request vehicle removal
 *     tags: [App Vehicles]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/remove', validate(removeVehicleSchema), ctrl.requestRemove)

module.exports = router
