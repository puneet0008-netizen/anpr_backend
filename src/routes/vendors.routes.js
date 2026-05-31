const { Router } = require('express');
const ctrl = require('../controllers/vendors.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const { createVendorSchema, updateVendorSchema, listVendorQuerySchema } = require('../validators/vendors.validator');

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/list',          ctrl.dropdown);          // dropdown — must come before /:id
router.get('/',              validate(listVendorQuerySchema, 'query'), ctrl.list);
router.get('/:id',           ctrl.getById);
router.post('/',             validate(createVendorSchema), auditLog('CREATE_VENDOR_ENTITY', 'vendor'), ctrl.create);
router.patch('/:id/deactivate', auditLog('DEACTIVATE_VENDOR', 'vendor', r => r.params.id), ctrl.deactivate);  // must come before /:id
router.patch('/:id',         validate(updateVendorSchema), auditLog('UPDATE_VENDOR_ENTITY', 'vendor', r => r.params.id), ctrl.update);
router.delete('/:id',        auditLog('DELETE_VENDOR_ENTITY', 'vendor', r => r.params.id), ctrl.remove);

module.exports = router;
