const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('ERR-VAL-01', 422, errors.array()[0].msg));
  }
  next();
}

module.exports = { validate };