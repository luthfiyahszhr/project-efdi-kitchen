const router = require('express').Router();
const ctrl = require('../controllers/operational.controller');

router.get('/status', ctrl.status);

module.exports = router;