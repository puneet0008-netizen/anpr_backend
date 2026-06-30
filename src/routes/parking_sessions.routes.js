const { Router } = require('express');
const ctrl     = require('../controllers/parking_sessions.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const { entrySchema }  = require('../validators/parking_sessions.validator');

const router = Router();
router.use(authenticate, authorize('admin', 'vendor'));

router.get('/active',  ctrl.listActive);          // before /:id
router.get('/lookup',  ctrl.lookup);              // before /:id
router.get('/',        ctrl.list);
router.get('/:id',     ctrl.getById);
router.delete('/:id', auditLog('DELETE_PARKING_SESSION', 'parking_session', (r) => r.params.id), ctrl.remove);
router.post('/entry',  validate(entrySchema), auditLog('VEHICLE_ENTRY', 'parking_session'), ctrl.entry);
router.post('/exit',   auditLog('VEHICLE_EXIT',  'parking_session'), ctrl.exit);

module.exports = router;
