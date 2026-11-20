const pembayaranSvc = require('../services/pembayaran.service');
const { ok } = require('../utils/response');

exports.upload = async (req, res, next) => {
  try {
    const data = await pembayaranSvc.uploadBukti({
      user: req.user,
      kode: req.params.kode,
      body: req.body,
      file: req.file,
    });
    return ok(res, data, 201);
  } catch (e) { next(e); }
};

exports.verify = async (req, res, next) => {
  try {
    const data = await pembayaranSvc.verify({
      user: req.user,
      idPembayaran: req.params.id,
      aksi: req.body.aksi,
      catatan: req.body.catatan,
    });
    return ok(res, data);
  } catch (e) { next(e); }
};