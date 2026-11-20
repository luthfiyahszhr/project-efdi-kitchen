const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/auth.controller');
const v = require('../validators/auth.validator');

router.post('/register', v.register, ctrl.register);
router.post('/login', v.login, ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;