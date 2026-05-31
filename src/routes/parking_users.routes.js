const { Router } = require('express');
const ctrl = require('../controllers/parking_users.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');
const { uploadProfilePhoto } = require('../config/multer');

const router = Router();
router.use(authenticate, authorize('admin'));

// ── Search (must be before /:id) ─────────────────────────────────────────────
router.get('/app/search',   ctrl.search);

// ── App user detail (vehicles, wallet, sessions) — before /:id ───────────────
router.get('/app/:id/detail', ctrl.getAppUserDetail);

// ── Web users ─────────────────────────────────────────────────────────────────
router.get('/web',             ctrl.listWeb);
router.post('/web',            auditLog('CREATE_WEB_USER', 'parking_user'), ctrl.createWeb);
router.patch('/web/:id',       auditLog('UPDATE_PARKING_USER', 'parking_user', r => r.params.id), ctrl.updateUser);
router.delete('/web/:id',      auditLog('DELETE_PARKING_USER', 'parking_user', r => r.params.id), ctrl.deleteUser);

// ── App users ─────────────────────────────────────────────────────────────────
router.get('/app',             ctrl.listApp);
router.post('/app',            auditLog('CREATE_APP_USER', 'parking_user'), ctrl.createApp);
router.patch('/app/:id',       auditLog('UPDATE_PARKING_USER', 'parking_user', r => r.params.id), ctrl.updateUser);
router.delete('/app/:id',      auditLog('DELETE_PARKING_USER', 'parking_user', r => r.params.id), ctrl.deleteUser);
router.post('/app/:id/recharge', auditLog('RECHARGE_WALLET', 'parking_user', r => r.params.id), ctrl.rechargeWallet);

// ── Profile photo upload ──────────────────────────────────────────────────────
router.post('/:id/photo', uploadProfilePhoto, ctrl.uploadPhoto);

// ── Vehicle management for a user ──────────────────────────────────────────────
router.get('/:id/vehicles',                  ctrl.listUserVehicles);
router.post('/:id/vehicles',                 auditLog('ADD_VEHICLE', 'vehicle', r => r.params.id), ctrl.addUserVehicle);
router.patch('/:id/vehicles/:vehicleId',          auditLog('UPDATE_VEHICLE', 'vehicle', r => r.params.id), ctrl.updateUserVehicle);
router.patch('/:id/vehicles/:vehicleId/primary',  auditLog('SET_PRIMARY_VEHICLE', 'vehicle', r => r.params.vehicleId), ctrl.setPrimaryVehicle);
router.delete('/:id/vehicles/:vehicleId',         auditLog('REMOVE_VEHICLE', 'vehicle', r => r.params.id), ctrl.removeUserVehicle);

// ── Generic fallback by ID ────────────────────────────────────────────────────
router.get('/:id',   ctrl.getById);
router.patch('/:id', auditLog('UPDATE_PARKING_USER', 'parking_user', r => r.params.id), ctrl.updateUser);
router.delete('/:id',auditLog('DELETE_PARKING_USER', 'parking_user', r => r.params.id), ctrl.deleteUser);

module.exports = router;
