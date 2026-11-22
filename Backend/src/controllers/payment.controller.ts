import type { RequestHandler } from 'express';
import * as pembayaranSvc from '../services/pembayaran.service';
import { ok } from '../utils/response';

export const upload: RequestHandler = async (req, res, next) => {
  try {
    const data = await pembayaranSvc.uploadBukti({
      user: req.user!,
      kode: req.params.kode as string,
      body: req.body,
      file: req.file,
      ip: req.ip,
    });
    return ok(res, data, 201);
  } catch (e) { next(e); }
};

export const verify: RequestHandler = async (req, res, next) => {
  try {
    const data = await pembayaranSvc.verify({
      user: req.user!,
      idPembayaran: Number(req.params.id),
      aksi: req.body.aksi,
      catatan: req.body.catatan,
      ip: req.ip,
    });
    return ok(res, data);
  } catch (e) { next(e); }
};
