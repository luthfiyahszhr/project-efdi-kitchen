import { body } from 'express-validator';
import { validate } from '../middlewares/validate';

// Sesuai CK_Pesanan_kontak: 08xxxxxxxx (10-15 digit) atau +62xxxxxxxx (10-15 digit setelah +, digit pertama setelah 62 bukan 0)
const KONTAK_REGEX = /^(08\d{8,13}|\+62[1-9]\d{7,12})$/;

// Catatan: `kanal` tidak lagi diterima dari client. Ditentukan server dari role (Customer = ONLINE, Admin/Owner = DATANG_LANGSUNG).
export const createOrder = [
  body('nama_pelanggan', 'Nama pelanggan harus 2-100 karakter').isString().trim().isLength({ min: 2, max: 100 }),
  body('no_kontak').matches(KONTAK_REGEX).withMessage('Nomor kontak harus diawali 08 atau +62 (10-15 digit)'),
  body('detail').isArray({ min: 1 }).withMessage('Detail pesanan minimal 1 item'),
  body('detail.*.id_produk').isInt({ min: 1 }).withMessage('id_produk tidak valid').toInt(),
  body('detail.*.jumlah_porsi').isInt({ min: 1 }).withMessage('jumlah_porsi minimal 1').toInt(),
  body('tanggal_acara').isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('tanggal_acara harus berformat YYYY-MM-DD'),
  body('waktu_acara')
    .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .withMessage('waktu_acara harus berformat HH:mm'),
  body('catatan', 'Catatan harus teks maksimal 500 karakter').optional({ values: 'null' }).isString().isLength({ max: 500 }),
  validate,
];
