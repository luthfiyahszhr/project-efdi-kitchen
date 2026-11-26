import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { fail } from '../utils/response';

// Error dari THROW di trigger (lihat db/02-schema.sql) -> HTTP status
const SQL_THROW_STATUS: Record<number, number> = {
  51001: 409, 51002: 409, 51003: 409,
};

export const notFound: RequestHandler = (req, res) => {
  return fail(res, 'ERR-SYS-01', 404, `Route ${req.method} ${req.originalUrl} not found`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return fail(res, err.code, err.httpStatus, err.message, err.fields);
  }

  if (err?.name === 'MulterError') {
    return fail(res, 'ERR-VAL-05', 422, 'File terlalu besar atau tidak valid');
  }
  if (['ENOENT', 'EACCES', 'ENOSPC'].includes(err?.code)) {
    console.error('[FILE STORAGE]', err);
    return fail(res, 'ERR-SYS-02', 500);
  }

  const sqlNumber: number | undefined = err?.number ?? err?.originalError?.info?.number;
  if (sqlNumber !== undefined) {
    if (SQL_THROW_STATUS[sqlNumber]) {
      const code = /\((ERR-[A-Z]+-\d+)\)/.exec(err.message)?.[1] ?? `ERR-DB-${sqlNumber}`;
      return fail(res, code, SQL_THROW_STATUS[sqlNumber], err.message);
    }
    if (sqlNumber === 2627 || sqlNumber === 2601) {
      console.error('[SQL duplicate]', err.message);
      const message = String(err.message).toLowerCase();
      if (message.includes('uq_pengguna_email')) {
        return fail(res, 'ERR-AUTH-05', 409);
      }
      if (message.includes('uq_produk_nama')) {
        return fail(res, 'ERR-CAT-03', 409);
      }
      if (message.includes('uq_item_nama')) {
        return fail(res, 'ERR-VAL-06', 422, 'Nama item sudah digunakan');
      }
      return fail(res, 'ERR-DB-DUP', 409, 'Data duplikat');
    }
    if (sqlNumber === 547) {
      console.error('[SQL constraint]', err.message);
      return fail(res, 'ERR-DB-CONSTRAINT', 422, 'Data melanggar aturan basis data');
    }
  }

  console.error('[UNHANDLED]', err);
  return fail(res, 'ERR-SYS-01', 503, 'Layanan sementara tidak tersedia');
};
