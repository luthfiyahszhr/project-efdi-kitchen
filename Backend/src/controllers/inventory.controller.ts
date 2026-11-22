import type { RequestHandler } from 'express';
import * as inventaris from '../services/inventaris.service';
import { ok } from '../utils/response';

export const list: RequestHandler = async (req, res, next) => {
  try {
    return ok(res, await inventaris.list());
  } catch (e) { next(e); }
};

export const updateStock: RequestHandler = async (req, res, next) => {
  try {
    const data = await inventaris.updateStock({
      user: req.user!,
      idItem: Number(req.params.id),
      stokBaru: Number(req.body.stok),
      keterangan: String(req.body.keterangan).trim(),
      ip: req.ip,
    });
    return ok(res, data);
  } catch (e) { next(e); }
};

export const productionNeeds: RequestHandler = async (req, res, next) => {
  try {
    return ok(res, await inventaris.productionNeeds(req.params.kode as string));
  } catch (e) { next(e); }
};

export const consumeStock: RequestHandler = async (req, res, next) => {
  try {
    const data = await inventaris.consumeStock({ user: req.user!, kode: req.params.kode as string, ip: req.ip });
    return ok(res, data);
  } catch (e) { next(e); }
};
