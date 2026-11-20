const { AppError } = require('../utils/errors');
const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 'ERR-SYS-01', 404, `Route ${req.method} ${req.originalUrl} not found`);
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return fail(res, err.code, err.httpStatus, err.message);
  }
  console.error('[UNHANDLED]', err);
  return fail(res, 'ERR-SYS-01', 500, 'Kesalahan sistem');
}

module.exports = { errorHandler, notFound };