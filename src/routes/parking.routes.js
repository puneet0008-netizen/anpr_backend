const { Router } = require('express');
const ctrl = require('../controllers/parking.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');

const router = Router();
router.use(authenticate, authorize('admin', 'vendor'));

router.get('/stats',             ctrl.getStats);
router.get('/vendor-details',    ctrl.getVendorParkingDetails);
router.get('/recharge/recent',   ctrl.recentRecharges);
router.post('/recharge',         auditLog('PARKING_RECHARGE', 'recharge'), ctrl.processRecharge);
router.get('/list',              ctrl.siteDropdown);   // dropdown — before /:id

router.get('/:id/active-sessions', ctrl.getActiveSessionsBySiteId);
router.get('/',      ctrl.listSites);
router.post('/',     auditLog('CREATE_PARKING_SITE', 'parking_site'), ctrl.createSite);
router.patch('/:id', auditLog('UPDATE_PARKING_SITE', 'parking_site', r => r.params.id), ctrl.updateSite);
router.delete('/:id', auditLog('DELETE_PARKING_SITE', 'parking_site', r => r.params.id), ctrl.deleteSite);

module.exports = router;
