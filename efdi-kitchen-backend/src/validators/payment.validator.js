const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');

exports.uploadBukti = [
  body('jenis').isIn(['DP', 'PELUNASAN']),
  body('metode').isIn(['QRIS', 'TRANSFER', 'TUNAI']),
  body('nominal').isFloat({ gt: 0 }),
  validate,
];