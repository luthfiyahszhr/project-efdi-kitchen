const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new AppError('ERR-AUTH-01', 401));
  try {
    req.user = jwt.verify(token, env.jwt.secret); // { id, role, email }
    next();
  } catch {
    return next(new AppError('ERR-AUTH-01', 401));
  }
}

function optionalAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, env.jwt.secret); } catch { /* guest */ }
  }
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('ERR-AUTH-01', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('ERR-AUTH-02', 403));
    next();
  };
}

module.exports = { authenticate, optionalAuth, authorize };