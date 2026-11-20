const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

exports.createOrder = [
  body('nama_pelanggan').isString().isLength({ min: 2, max: 100 }),
  body('no_kontak').matches(/^\d{10,15}$/),
  body('detail').isArray({ min: 1 }),
  body('detail.*.id_produk').isInt({ min: 1 }),
  body('detail.*.jumlah_porsi').isInt({ min: 1 }),
  body('tanggal_acara').isISO8601().toDate(),
  body('waktu_acara').matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('catatan').optional().isString().isLength({ max: 500 }),
  body('kanal').isIn(['ONLINE', 'DATANG_LANGSUNG']),
  validate,
];