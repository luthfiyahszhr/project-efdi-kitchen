import { getPool, sql } from '../config/database';
import { AppError } from '../utils/errors';
import type { AuthUser } from '../types/express';

/**
 * Pembatalan dijalankan oleh stored procedure dbo.sp_BatalkanPesanan, yang sudah menangani
 * validasi role, batas 8 menit (Customer), void pembayaran, auto-restock, riwayat status, dan log
 * dalam satu transaksi atomik. Error dari SP (THROW 510xx) dipetakan di middlewares/errorHandler.ts.
 */
export async function cancel({ user, kode, alasan, ip }: { user: AuthUser; kode: string; alasan?: string; ip?: string }) {
  const pool = await getPool();

  const found = await pool
    .request()
    .input('kode', sql.VarChar(20), kode)
    .query(`SELECT id_pesanan FROM dbo.Pesanan WHERE kode_pesanan = @kode`);
  const idPesanan: number | undefined = found.recordset[0]?.id_pesanan;
  if (!idPesanan) throw new AppError('ERR-ORD-01', 404);

  await pool
    .request()
    .input('id_pesanan', sql.Int, idPesanan)
    .input('id_pengguna', sql.Int, user.id)
    .input('alasan_pembatalan', sql.NVarChar(255), alasan ?? null)
    .input('alamat_ip', sql.VarChar(45), (ip || '0.0.0.0').slice(0, 45))
    .execute('dbo.sp_BatalkanPesanan');

  const voided = await pool
    .request()
    .input('id', sql.Int, idPesanan)
    .query(`SELECT id_pembayaran FROM dbo.Pembayaran WHERE id_pesanan = @id AND status = 'VOID'`);
  const restocked = await pool
    .request()
    .input('id', sql.Int, idPesanan)
    .query(`SELECT TOP 1 1 AS ada FROM dbo.MutasiStok WHERE id_pesanan = @id AND jenis = 'PENGEMBALIAN_PEMBATALAN'`);

  return {
    kode_pesanan: kode,
    status_pesanan: 'DIBATALKAN',
    pembayaran_divoid: voided.recordset.map((x) => x.id_pembayaran),
    restock: restocked.recordset.length > 0,
  };
}
