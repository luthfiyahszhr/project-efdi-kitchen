const operasional = require('../services/operasional.service');
const { ok } = require('../utils/response');

exports.status = async (req, res, next) => {
  try {
    const data = await operasional.cekStatus();
    return ok(res, data);
  } catch (e) { next(e); }
};