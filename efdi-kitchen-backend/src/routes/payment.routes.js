const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/payment.controller');

router.patch('/:id/verify', authenticate, authorize('ADMIN', 'OWNER'), ctrl.verify);

module.exports = router;