function ok(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    meta: { timestamp: new Date().toISOString() },
  });
}

function fail(res, code, httpStatus = 400, message) {
  return res.status(httpStatus).json({
    success: false,
    data: null,
    error: { code, message: message || code },
    meta: { timestamp: new Date().toISOString() },
  });
}

module.exports = { ok, fail };