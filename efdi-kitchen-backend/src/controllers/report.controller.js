const { getPool } = require('../config/database');
const { ok } = require('../utils/response');

exports.finance = async (req, res, next) => {
  try {
    const { period = 'daily', date } = req.query;
    const pool = await getPool();
    // contoh agregasi sederhana
    const r = await pool.request()
      .input('date', date || new Date().toISOString().slice(0, 10))
      .query(`
        SELECT COUNT(*) AS total_pesanan,
               ISNULL(SUM(total_tagihan),0) AS total_omset
        FROM pesanan
        WHERE status_pesanan <> 'DIBATALKAN'
          AND CAST(created_at AS DATE) = @date
      `);
    return ok(res, { period, date, ...r.recordset[0] });
  } catch (e) { next(e); }
};