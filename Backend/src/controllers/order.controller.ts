import type { RequestHandler } from 'express';
import * as pesananSvc from '../services/pesanan.service';
import * as pembatalanSvc from '../services/pembatalan.service';
import { getPool, sql } from '../config/database';
import { ok } from '../utils/response';
import { AppError } from '../utils/errors';

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = await pesananSvc.create({ user: req.user!, payload: req.body, ip: req.ip });
    return ok(res, data, 201);
  } catch (e) { next(e); }
};

export const status: RequestHandler = async (req, res, next) => {
  try {
    const kode = req.params.kode as string;
    const noKontak = req.query.no_kontak;
    const pool = await getPool();
    const r = await pool.request()
      .input('kode', sql.NVarChar(10), kode)
      .query(`
        SELECT id_pesanan, no_kontak, tanggal_acara, waktu_acara, status_pesanan, status_pembayaran, total_harga
        FROM dbo.pesanan WHERE kode_pesanan = @kode
      `);
    const order = r.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);

    // Customer wajib mencocokkan no_kontak
    if (req.user!.role === 'Customer') {
      if (!noKontak || noKontak !== order.no_kontak) throw new AppError('ERR-ORD-01', 404);
    }

    const hist = await pool.request()
      .input('id', sql.Int, order.id_pesanan)
      .query(`SELECT status, waktu FROM dbo.riwayat_status_pesanan WHERE id_pesanan = @id ORDER BY waktu ASC, id_riwayat ASC`);

    const saldoRes = await pool.request()
      .input('id', sql.Int, order.id_pesanan)
      .query(`
        SELECT o.total_harga - ISNULL(SUM(CASE WHEN p.status = 'DITERIMA' THEN p.nominal ELSE 0 END), 0) AS saldo
        FROM dbo.pesanan o
        LEFT JOIN dbo.pembayaran p ON p.id_pesanan = o.id_pesanan
        WHERE o.id_pesanan = @id
        GROUP BY o.total_harga
      `);

    return ok(res, {
      status_pesanan: order.status_pesanan,
      status_pembayaran: order.status_pembayaran,
      riwayat_status: hist.recordset,
      tanggal_acara: order.tanggal_acara,
      waktu_acara: order.waktu_acara,
      total_tagihan: order.total_harga,
      sisa_pembayaran: saldoRes.recordset[0]?.saldo ?? order.total_harga,
    });
  } catch (e) { next(e); }
};

export const nota: RequestHandler = async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('kode', sql.NVarChar(10), req.params.kode as string)
      .query(`
        SELECT n.id_nota, n.nomor_nota, n.id_pesanan, n.total_tagihan, n.nominal_dp, n.sisa_pembayaran,
               n.diterbitkan_pada, p.kode_pesanan, p.id_pelanggan
        FROM dbo.nota_digital n
        JOIN dbo.pesanan p ON p.id_pesanan = n.id_pesanan
        WHERE p.kode_pesanan = @kode
      `);
    const row = r.recordset[0];
    if (!row) throw new AppError('ERR-ORD-01', 404);

    // Customer hanya boleh melihat nota pesanannya sendiri
    if (req.user!.role === 'Customer' && row.id_pelanggan !== req.user!.id) {
      throw new AppError('ERR-ORD-01', 404);
    }

    const detail = await pool.request()
      .input('idPesanan', sql.Int, row.id_pesanan)
      .query(`
        SELECT pr.nama_paket, dp.jumlah_porsi AS porsi, dp.harga_satuan, dp.subtotal
        FROM dbo.detail_pesanan dp
        JOIN dbo.produk pr ON pr.id_produk = dp.id_produk
        WHERE dp.id_pesanan = @idPesanan
      `);

    const { id_pelanggan, ...nota } = row;
    return ok(res, { ...nota, rincian: detail.recordset });
  } catch (e) { next(e); }
};

export const cancel: RequestHandler = async (req, res, next) => {
  try {
    const data = await pembatalanSvc.cancel({
      user: req.user!,
      kode: req.params.kode as string,
      alasan: req.body?.alasan,
      ip: req.ip,
    });
    return ok(res, data);
  } catch (e) { next(e); }
};
