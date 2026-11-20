const pesananSvc = require('../services/pesanan.service');
const pembatalanSvc = require('../services/pembatalan.service');
const { getPool, sql } = require('../config/database');
const { ok } = require('../utils/response');
const { AppError } = require('../utils/errors');

exports.create = async (req, res, next) => {
  try {
    const data = await pesananSvc.create({ user: req.user, payload: req.body });
    return ok(res, data, 201);
  } catch (e) { next(e); }
};

exports.status = async (req, res, next) => {
  try {
    const { kode } = req.params;
    const { no_kontak } = req.query;
    const pool = await getPool();
    const r = await pool.request()
      .input('kode', kode)
      .query(`SELECT * FROM pesanan WHERE kode_pesanan=@kode`);
    const order = r.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);

    // Customer wajib cocokkan no_kontak
    if (req.user.role === 'CUSTOMER') {
      if (!no_kontak || no_kontak !== order.no_kontak) throw new AppError('ERR-ORD-01', 404);
    }

    const hist = await pool.request()
      .input('id', order.id_pesanan)
      .query(`SELECT status, waktu FROM riwayat_status_pesanan WHERE id_pesanan=@id ORDER BY waktu ASC`);

    const saldoRes = await pool.request()
      .input('id', order.id_pesanan)
      .query(`
        SELECT o.total_tagihan - ISNULL(SUM(CASE WHEN p.status='DITERIMA' THEN p.nominal ELSE 0 END),0) AS saldo
        FROM pesanan o LEFT JOIN pembayaran p ON p.id_pesanan=o.id_pesanan
        WHERE o.id_pesanan=@id GROUP BY o.total_tagihan
      `);

    return ok(res, {
      status_pesanan: order.status_pesanan,
      status_pembayaran: order.status_pembayaran,
      riwayat_status: hist.recordset,
      tanggal_acara: order.tanggal_acara,
      total_tagihan: order.total_tagihan,
      sisa_pembayaran: saldoRes.recordset[0]?.saldo ?? order.total_tagihan,
    });
  } catch (e) { next(e); }
};

exports.nota = async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('kode', req.params.kode)
      .query(`
        SELECT n.*, p.kode_pesanan FROM nota_digital n
        JOIN pesanan p ON p.id_pesanan=n.id_pesanan
        WHERE p.kode_pesanan=@kode
      `);
    const nota = r.recordset[0];
    if (!nota) throw new AppError('ERR-ORD-01', 404);

    const detail = await pool.request()
      .input('idPesanan', nota.id_pesanan)
      .query(`
        SELECT pr.nama_paket, dp.jumlah_porsi AS porsi, dp.harga_satuan, dp.subtotal
        FROM detail_pesanan dp JOIN produk pr ON pr.id_produk=dp.id_produk
        WHERE dp.id_pesanan=@idPesanan
      `);

    return ok(res, { ...nota, rincian: detail.recordset });
  } catch (e) { next(e); }
};

exports.cancel = async (req, res, next) => {
  try {
    const data = await pembatalanSvc.cancel({ user: req.user, kode: req.params.kode, alasan: req.body.alasan });
    return ok(res, data);
  } catch (e) { next(e); }
};