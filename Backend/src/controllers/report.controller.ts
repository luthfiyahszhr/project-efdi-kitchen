import type { RequestHandler } from 'express';
import { getPool, sql } from '../config/database';
import { ok } from '../utils/response';
import { AppError } from '../utils/errors';
import { nowWIB } from '../utils/datetime';

export const finance: RequestHandler = async (req, res, next) => {
  try {
    const period = String(req.query.period ?? 'daily');
    const date = String(req.query.date ?? nowWIB().format('YYYY-MM-DD'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('ERR-VAL-01', 422, 'date harus berformat YYYY-MM-DD');
    }

    const pool = await getPool();
    // contoh agregasi sederhana (per hari pesanan dibuat)
    const r = await pool.request()
      .input('date', sql.NVarChar(10), date)
      .query(`
        SELECT COUNT(*) AS total_pesanan,
               ISNULL(SUM(total_harga), 0) AS total_omset
        FROM dbo.pesanan
        WHERE status_pesanan <> 'DIBATALKAN'
          AND CAST(dibuat_pada AS DATE) = CAST(@date AS DATE)
      `);
    return ok(res, { period, date, ...r.recordset[0] });
  } catch (e) { next(e); }
};
