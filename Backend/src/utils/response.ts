import type { Response } from 'express';
import { ERR } from './errors';

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
  });
}

export function fail(
  res: Response,
  code: string,
  httpStatus = 400,
  message?: string,
  fields: Record<string, string> = {},
) {
  return res.status(httpStatus).json({
    success: false,
    data: null,
    error: { code, message: message || ERR[code] || code, fields },
  });
}
