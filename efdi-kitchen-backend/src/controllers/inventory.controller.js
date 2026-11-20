const { getPool } = require('../config/database');
const { ok } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`SELECT * FROM bahan ORDER BY nama`);
    return ok(res, r.recordset);
  } catch (e) { next(e); }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { stok } = req.body;
    const pool = await getPool();
    const r = await pool.request()
      .input('id', req.params.id)
      .input('stok', Number(stok))
      .query(`UPDATE bahan SET stok=@stok OUTPUT INSERTED.* WHERE id_bahan=@id`);
    return ok(res, r.recordset[0]);
  } catch (e) { next(e); }
};

exports.productionNeeds = async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('kode', req.params.kode)
      .query(`
        SELECT b.nama, b.satuan,
               SUM(cb.jumlah_per_porsi * dp.jumlah_porsi) AS total_kebutuhan,
               b.stok AS stok_tersedia,
               CASE WHEN b.stok < SUM(cb.jumlah_per_porsi * dp.jumlah_porsi)
                    THEN 1 ELSE 0 END AS kurang
        FROM pesanan o
        JOIN detail_pesanan dp ON dp.id_pesanan = o.id_pesanan
        JOIN komposisi_bahan cb ON cb.id_produk = dp.id_produk
        JOIN bahan b ON b.id_bahan = cb.id_bahan
        WHERE o.kode_pesanan = @kode
        GROUP BY b.id_bahan, b.nama, b.satuan, b.stok
      `);
    return ok(res, r.recordset);
  } catch (e) { next(e); }
};

exports.consumeStock = async (req, res, next) => {
  try {
    const pool = await getPool();
    // Precondition: DP diterima (DP_DITERIMA atau LUNAS)
    const ord = await pool.request().input('kode', req.params.kode)
      .query(`SELECT TOP 1 id_pesanan, status_pembayaran FROM pesanan WHERE kode_pesanan=@kode`);
    const o = ord.recordset[0];
    if (!o) throw new AppError('ERR-ORD-01', 404);
    if (!['DP_DITERIMA','LUNAS'].includes(o.status_pembayaran))
      throw new AppError('ERR-PAY-01', 409, 'DP harus diterima sebelum produksi');

    const trx = new sql.Transaction(pool);
    await trx.begin();
    try {
      await new sql.Request(trx).input('idPesanan', o.id_pesanan).query(`
        UPDATE b SET b.stok = b.stok - (cb.jumlah_per_porsi * dp.jumlah_porsi)
        FROM bahan b
        JOIN komposisi_bahan cb ON cb.id_bahan=b.id_bahan
        JOIN detail_pesanan dp ON dp.id_produk=cb.id_produk
        WHERE dp.id_pesanan=@idPesanan
      `);
      await new sql.Request(trx).input('idPesanan', o.id_pesanan)
        .query(`UPDATE pesanan SET status_pesanan='DIPROSES', updated_at=SYSDATETIME() WHERE id_pesanan=@idPesanan`);
      await new sql.Request(trx).input('idPesanan', o.id_pesanan)
        .query(`INSERT INTO riwayat_status_pesanan (id_pesanan, status) VALUES (@idPesanan, 'DIPROSES')`);
      await trx.commit();
      return ok(res, { kode_pesanan: req.params.kode, status_pesanan: 'DIPROSES' });
    } catch (err) { await trx.rollback(); throw err; }
  } catch (e) { next(e); }
};