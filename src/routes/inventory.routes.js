const { Router } = require('express');
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize }    = require('../middlewares/rbac.middleware');
const { auditLog }     = require('../middlewares/audit.middleware');

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getById);
router.post('/',     auditLog('CREATE_INVENTORY_ITEM', 'inventory'), ctrl.create);
router.patch('/:id', auditLog('UPDATE_INVENTORY_ITEM', 'inventory', r => r.params.id), ctrl.update);
router.delete('/:id', auditLog('DELETE_INVENTORY_ITEM', 'inventory', r => r.params.id), ctrl.remove);

module.exports = router;
