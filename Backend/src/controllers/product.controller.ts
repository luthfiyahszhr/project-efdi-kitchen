import type { RequestHandler } from 'express';
import { getPool, sql } from '../config/database';
import { ok } from '../utils/response';
import { AppError } from '../utils/errors';

export const list: RequestHandler = async (req, res, next) => {
  try {
    const { q, jenis_paket, harga_min, harga_max } = req.query;
    const pool = await getPool();
    const request = pool.request();
    const cond = ['aktif = 1'];

    if (q) {
      request.input('q', sql.NVarChar(200), `%${q}%`);
      cond.push('(nama_paket LIKE @q OR isi_paket LIKE @q)');
    }
    if (jenis_paket) {
      request.input('jenis', sql.NVarChar(50), String(jenis_paket));
      cond.push('jenis_paket = @jenis');
    }
    if (harga_min) {
      request.input('hmin', sql.Decimal(12, 2), Number(harga_min));
      cond.push('harga_per_porsi >= @hmin');
    }
    if (harga_max) {
      request.input('hmax', sql.Decimal(12, 2), Number(harga_max));
      cond.push('harga_per_porsi <= @hmax');
    }

    const r = await request.query(`SELECT * FROM dbo.produk WHERE ${cond.join(' AND ')} ORDER BY id_produk DESC`);
    return ok(res, r.recordset);
  } catch (e) { next(e); }
};

export const detail: RequestHandler = async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.Int, Number(req.params.id))
      .query(`SELECT * FROM dbo.produk WHERE id_produk = @id AND aktif = 1`);
    if (!r.recordset[0]) throw new AppError('ERR-CAT-04', 404);
    return ok(res, r.recordset[0]);
  } catch (e) { next(e); }
};
