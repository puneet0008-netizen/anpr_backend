/**
 * Admin-facing routes for app-side data:
 *  - Vehicle change requests (approve / reject)
 *  - Visitor management (check-in / check-out / cancel)
 *  - Parking session overview
 */
const { Router } = require('express');
const ctrl = require('../controllers/app_admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');

const router = Router();
router.use(authenticate, authorize('admin'));

// ── Vehicle Requests ─────────────────────────────────────────────────────────
router.get('/vehicle-requests',         ctrl.listVehicleRequests);
router.patch('/vehicle-requests/:id',   auditLog('REVIEW_VEHICLE_REQUEST', 'vehicle_request', r => r.params.id), ctrl.reviewVehicleRequest);

// ── Visitors ──────────────────────────────────────────────────────────────────
router.get('/visitors',               ctrl.listVisitors);
router.post('/visitors',              auditLog('CREATE_VISITOR', 'visitor'), ctrl.createVisitor);
router.patch('/visitors/:id/status',  auditLog('UPDATE_VISITOR_STATUS', 'visitor', r => r.params.id), ctrl.updateVisitorStatus);

// ── Parking Sessions ──────────────────────────────────────────────────────────
router.get('/parking-sessions',       ctrl.listParkingSessions);

module.exports = router;
