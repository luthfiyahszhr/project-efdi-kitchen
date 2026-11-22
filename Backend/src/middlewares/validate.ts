import fs from 'fs/promises';
import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import type { ZodType } from 'zod';
import { AppError } from '../utils/errors';

export const validate: RequestHandler = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const fields: Record<string, string> = {};
  for (const issue of result.array()) {
    if (!fields[issue.type === 'field' ? issue.path : '']) {
      fields[issue.type === 'field' ? issue.path : ''] = issue.msg;
    }
  }
  next(new AppError('ERR-VAL-06', 422, 'Periksa kembali data yang Anda isi', fields));
};

export function validateBody(
  schema: ZodType,
  errorCode: string | ((paths: string[]) => string) = 'ERR-VAL-06',
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields: Record<string, string> = {};
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (key && !fields[key]) fields[key] = issue.message;
      }
      const code = typeof errorCode === 'function' ? errorCode(paths) : errorCode;
      const message = code === 'ERR-VAL-07' ? 'Jam buka harus lebih awal dari jam tutup' : undefined;
      return next(new AppError(code, 422, message, fields));
    }
    req.body = result.data;
    next();
  };
}

export const positiveId: RequestHandler = (req, res, next) => {
  const id = Number(req.params.id_produk ?? req.params.id_pesanan ?? req.params.id_pembayaran ?? req.params.id_item ?? req.params.id_pengguna);
  if (!Number.isInteger(id) || id < 1) {
    return next(new AppError('ERR-VAL-06', 422, 'ID harus berupa integer positif'));
  }
  next();
};

export const parseMultipartData: RequestHandler = (req, res, next) => {
  if (typeof req.body.data !== 'string') {
    return next(new AppError('ERR-VAL-06', 422, 'Part data wajib berisi JSON valid'));
  }
  try {
    req.body = JSON.parse(req.body.data);
  } catch {
    return next(new AppError('ERR-VAL-06', 422, 'Part data wajib berisi JSON valid'));
  }
  next();
};

export const validateUploadedImage: RequestHandler = async (req, res, next) => {
  const file = req.file;
  if (!file) return next();

  try {
    const handle = await fs.open(file.path, 'r');
    const header = Buffer.alloc(8);
    try {
      await handle.read(header, 0, header.length, 0);
    } finally {
      await handle.close();
    }

    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const matchesMime = (isJpeg && ['image/jpeg', 'image/jpg'].includes(file.mimetype)) ||
      (isPng && file.mimetype === 'image/png');
    if (!matchesMime) {
      await fs.unlink(file.path);
      return next(new AppError('ERR-VAL-05', 422, 'Unggah gambar JPG/PNG dengan ukuran sesuai batas'));
    }
    next();
  } catch (error) {
    next(error);
  }
};
