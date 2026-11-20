const { getPool, sql } = require('../config/database');
const { ok } = require('../utils/response');
const { AppError } = require('../utils/errors');

exports.list = async (req, res, next) => {
  try {
    const { q, jenis_paket, harga_min, harga_max } = req.query;
    const pool = await getPool();
    const reqDb = pool.request();
    const cond = ['is_active=1'];

    if (q) { reqDb.input('q', `%${q}%`); cond.push('(nama_paket LIKE @q OR isi_paket LIKE @q)'); }
    if (jenis_paket) { reqDb.input('jenis', jenis_paket); cond.push('nama_paket LIKE CONCAT(@jenis, \'%\')'); }
    if (harga_min) { reqDb.input('hmin', Number(harga_min)); cond.push('harga_per_porsi >= @hmin'); }
    if (harga_max) { reqDb.input('hmax', Number(harga_max)); cond.push('harga_per_porsi <= @hmax'); }

    const r = await reqDb.query(`SELECT * FROM produk WHERE ${cond.join(' AND ')} ORDER BY id_produk DESC`);
    return ok(res, r.recordset);
  } catch (e) { next(e); }
};

exports.detail = async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM produk WHERE id_produk=@id AND is_active=1`);
    if (!r.recordset[0]) throw new AppError('ERR-CAT-04', 404);
    return ok(res, r.recordset[0]);
  } catch (e) { next(e); }
};