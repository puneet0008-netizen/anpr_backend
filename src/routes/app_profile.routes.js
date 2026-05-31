const { Router } = require('express')
const ctrl = require('../controllers/app_profile.controller')
const { appAuthenticate } = require('../middlewares/app_authenticate.middleware')
const { validate } = require('../middlewares/validate.middleware')
const { updateProfileSchema } = require('../validators/app.validator')
const { uploadProfilePhoto } = require('../config/multer')

const router = Router()
router.use(appAuthenticate)

/**
 * @swagger
 * tags:
 *   name: App Profile
 *   description: Mobile app user profile
 */

/**
 * @swagger
 * /app/profile:
 *   get:
 *     summary: Get own profile (vehicles, wallet, recent activity)
 *     tags: [App Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Full user profile
 */
router.get('/', ctrl.getProfile)

/**
 * @swagger
 * /app/profile:
 *   patch:
 *     summary: Update username, password, name or phone
 *     tags: [App Profile]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/', validate(updateProfileSchema), ctrl.updateProfile)

/**
 * @swagger
 * /app/profile/photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [App Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded
 */
router.post('/photo', uploadProfilePhoto, ctrl.uploadPhoto)

module.exports = router
