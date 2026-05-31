const { Router } = require('express');
const ctrl = require('../controllers/portal_users.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const { createPortalUserSchema, updatePortalUserSchema, toggleStatusSchema } = require('../validators/portal_users.validator');

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/',             ctrl.list);
router.post('/',            validate(createPortalUserSchema), auditLog('CREATE_PORTAL_USER', 'portal_user'), ctrl.create);
router.patch('/:id/status', validate(toggleStatusSchema), auditLog('TOGGLE_PORTAL_USER', 'portal_user', r => r.params.id), ctrl.toggle);  // before /:id
router.patch('/:id',        validate(updatePortalUserSchema), auditLog('UPDATE_PORTAL_USER', 'portal_user', r => r.params.id), ctrl.update);
router.delete('/:id',       auditLog('DELETE_PORTAL_USER', 'portal_user', r => r.params.id), ctrl.remove);

module.exports = router;
