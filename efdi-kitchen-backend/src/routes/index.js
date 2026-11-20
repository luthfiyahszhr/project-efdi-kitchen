const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/products', require('./product.routes'));
router.use('/operational', require('./operational.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;