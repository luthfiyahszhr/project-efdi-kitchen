const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/report.controller');

router.use(authenticate, authorize('OWNER', 'ADMIN'));
router.get('/finance', ctrl.finance);

module.exports = router;