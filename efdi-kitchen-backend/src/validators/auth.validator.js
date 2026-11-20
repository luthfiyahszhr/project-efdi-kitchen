const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

exports.register = [
  body('nama').isString().isLength({ min: 2, max: 100 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  validate,
];

exports.login = [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate,
];