import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate';

export const updateStock = [
  param('id').isInt({ min: 1 }).withMessage('id item tidak valid'),
  body('stok').isFloat({ min: 0 }).withMessage('stok harus angka >= 0'),
  body('keterangan', 'keterangan wajib diisi (maks 255 karakter)').isString().trim().isLength({ min: 1, max: 255 }),
  validate,
];
