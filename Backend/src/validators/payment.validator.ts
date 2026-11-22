import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate';

export const uploadBukti = [
  body('jenis').isIn(['DP', 'PELUNASAN']).withMessage('jenis harus DP atau PELUNASAN'),
  body('metode').isIn(['QRIS', 'TRANSFER', 'TUNAI']).withMessage('metode harus QRIS, TRANSFER, atau TUNAI'),
  body('nominal').isFloat({ gt: 0 }).withMessage('nominal harus lebih dari 0'),
  validate,
];

export const verify = [
  param('id').isInt({ min: 1 }).withMessage('id pembayaran tidak valid'),
  body('aksi').isIn(['TERIMA', 'TOLAK']).withMessage('aksi harus TERIMA atau TOLAK'),
  body('catatan', 'Catatan harus teks maksimal 255 karakter').optional({ values: 'null' }).isString().isLength({ max: 255 }),
  validate,
];
