import type { RequestHandler } from 'express';
import * as operasional from '../services/operasional.service';
import { ok } from '../utils/response';

export const status: RequestHandler = async (req, res, next) => {
  try {
    return ok(res, await operasional.cekStatus());
  } catch (e) { next(e); }
};
