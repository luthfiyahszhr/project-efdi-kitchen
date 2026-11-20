const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/inventory.controller');

router.use(authenticate, authorize('ADMIN', 'OWNER'));
router.get('/', ctrl.list);
router.patch('/:id', ctrl.updateStock);
router.get('/orders/:kode/production-needs', ctrl.productionNeeds);
router.post('/orders/:kode/consume-stock', ctrl.consumeStock);

module.exports = router;