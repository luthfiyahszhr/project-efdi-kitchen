const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/order.controller');
const payCtrl = require('../controllers/payment.controller');
const v = require('../validators/order.validator');
const payV = require('../validators/payment.validator');
const { upload } = require('../middlewares/upload');

// Buat pesanan (Customer ONLINE / Admin DATANG_LANGSUNG)
router.post(
  '/',
  authenticate,
  authorize('CUSTOMER', 'ADMIN', 'OWNER'),
  v.createOrder,
  ctrl.create
);

// Status pesanan (Customer: + no_kontak; Admin/Owner: bebas)
router.get('/:kode/status', authenticate, ctrl.status);

// Nota digital
router.get('/:kode/nota', authenticate, ctrl.nota);

// Unggah bukti pembayaran
router.post(
  '/:kode/payments',
  authenticate,
  authorize('CUSTOMER', 'ADMIN', 'OWNER'),
  upload.single('file_bukti'),
  payV.uploadBukti,
  payCtrl.upload
);

// Pembatalan pesanan
router.post('/:kode/cancel', authenticate, ctrl.cancel);

module.exports = router;