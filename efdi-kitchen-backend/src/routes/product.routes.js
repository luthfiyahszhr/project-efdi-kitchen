const router = require('express').Router();
const { optionalAuth } = require('../middlewares/auth');
const ctrl = require('../controllers/product.controller');

router.get('/', optionalAuth, ctrl.list);
router.get('/:id', optionalAuth, ctrl.detail);

module.exports = router;