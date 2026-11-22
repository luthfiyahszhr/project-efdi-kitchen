import fs from 'fs';
import { sql, withTransaction } from '../config/database';
import { AppError } from '../utils/errors';
import { SQL_NOW_WIB } from '../utils/datetime';
import type { AuthUser } from '../types/express';
import * as logSvc from './log.service';

const sen = (n: number | string) => Math.round(Number(n) * 100);

export async function uploadBukti({
  user, kode, body, file, ip,
}: {
  user: AuthUser;
  kode: string;
  body: { jenis: 'DP' | 'PELUNASAN'; metode: 'QRIS' | 'TRANSFER' | 'TUNAI'; nominal: string | number };
  file?: Express.Multer.File;
  ip?: string;
}) {
  const { jenis, metode } = body;
  const nominal = Number(body.nominal);
  const isStaff = user.role !== 'Customer';

  // CK_Bayar_bukti: TUNAI tanpa bukti, selain TUNAI wajib ada bukti
  if (metode === 'TUNAI') {
    if (!isStaff) throw new AppError('ERR-AUTH-02', 403, 'Pembayaran tunai hanya dapat dicatat oleh Admin/Owner');
    if (file) {
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        console.error('[UPLOAD] Gagal menghapus file bukti tunai:', error);
      }
    }
  } else if (!file) {
    throw new AppError('ERR-VAL-05', 422, 'File bukti wajib diunggah');
  }

  try {
    return await withTransaction(async (trx) => {
      const r = await new sql.Request(trx)
        .input('kode', sql.VarChar(20), kode)
        .query(`
          SELECT id_pesanan, status_pesanan, status_pembayaran, id_pelanggan, total_harga
          FROM dbo.Pesanan WITH (UPDLOCK, ROWLOCK)
          WHERE kode_pesanan = @kode
        `);
      const order = r.recordset[0];
      if (!order) throw new AppError('ERR-ORD-01', 404);
      if (order.status_pesanan === 'DIBATALKAN') throw new AppError('ERR-PAY-06', 409);

      // Customer hanya boleh untuk pesanannya sendiri
      if (user.role === 'Customer' && order.id_pelanggan !== user.id) {
        throw new AppError('ERR-AUTH-02', 403);
      }

      // Tidak boleh ada pembayaran jenis sama yang masih menunggu verifikasi
      const pending = await new sql.Request(trx)
        .input('idPesanan', sql.Int, order.id_pesanan)
        .input('jenis', sql.VarChar(10), jenis)
        .query(`
          SELECT TOP 1 id_pembayaran FROM dbo.Pembayaran
          WHERE id_pesanan = @idPesanan AND jenis = @jenis AND status = 'MENUNGGU_VERIFIKASI'
        `);
      if (pending.recordset[0]) throw new AppError('ERR-PAY-01', 409);

      if (jenis === 'DP') {
        if (order.status_pembayaran !== 'BELUM_BAYAR') throw new AppError('ERR-PAY-01', 409);
        const nota = await new sql.Request(trx)
          .input('idPesanan', sql.Int, order.id_pesanan)
          .query(`SELECT nominal_dp FROM dbo.NotaDigital WHERE id_pesanan = @idPesanan`);
        if (!nota.recordset[0]) throw new AppError('ERR-SYS-01', 500, 'Nota pesanan tidak ditemukan');
        if (sen(nominal) < sen(nota.recordset[0].nominal_dp) || sen(nominal) > sen(order.total_harga)) {
          throw new AppError('ERR-PAY-05', 422);
        }
      } else {
        if (order.status_pembayaran !== 'DP_DITERIMA') throw new AppError('ERR-PAY-01', 409);
        const saldoRes = await new sql.Request(trx)
          .input('idPesanan', sql.Int, order.id_pesanan)
          .query(`
            SELECT o.total_harga - ISNULL(SUM(CASE WHEN p.status = 'DITERIMA' THEN p.nominal ELSE 0 END), 0) AS saldo
            FROM dbo.Pesanan o
            LEFT JOIN dbo.Pembayaran p ON p.id_pesanan = o.id_pesanan
            WHERE o.id_pesanan = @idPesanan
            GROUP BY o.total_harga
          `);
        if (sen(nominal) !== sen(saldoRes.recordset[0].saldo)) throw new AppError('ERR-PAY-05', 422);
      }

      const inserted = await new sql.Request(trx)
        .input('idPesanan', sql.Int, order.id_pesanan)
        .input('jenis', sql.VarChar(10), jenis)
        .input('metode', sql.VarChar(10), metode)
        .input('nominal', sql.Decimal(14, 2), nominal)
        .input('buktiPath', sql.NVarChar(255), metode === 'TUNAI' ? null : file!.filename)
        .input('statusSebelum', sql.VarChar(25), order.status_pembayaran)
        .input('dicatatOleh', sql.Int, isStaff ? user.id : null)
        .query(`
          INSERT INTO dbo.Pembayaran (id_pesanan, jenis, metode, nominal, bukti_path, status, status_sebelum_verifikasi, dicatat_oleh)
          OUTPUT INSERTED.id_pembayaran
          VALUES (@idPesanan, @jenis, @metode, @nominal, @buktiPath, 'MENUNGGU_VERIFIKASI', @statusSebelum, @dicatatOleh)
        `);
      const idPembayaran: number = inserted.recordset[0].id_pembayaran;

      // DP -> status pembayaran pesanan jadi MENUNGGU_VERIFIKASI; PELUNASAN -> tetap DP_DITERIMA
      if (jenis === 'DP') {
        await new sql.Request(trx)
          .input('idPesanan', sql.Int, order.id_pesanan)
          .query(`UPDATE dbo.Pesanan SET status_pembayaran = 'MENUNGGU_VERIFIKASI' WHERE id_pesanan = @idPesanan`);
      }

      await logSvc.log({
        transaction: trx,
        actorId: user.id,
        aksi: 'UNGGAH_BUKTI',
        entitas: 'Pembayaran',
        entitasId: idPembayaran,
        dataBaru: { kode_pesanan: kode, jenis, metode, nominal },
        ip,
      });

      return {
        id_pembayaran: idPembayaran,
        jenis,
        status: 'MENUNGGU_VERIFIKASI',
        nominal,
        status_pembayaran_pesanan: jenis === 'DP' ? 'MENUNGGU_VERIFIKASI' : 'DP_DITERIMA',
      };
    });
  } catch (err) {
    if (file) {
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupError) {
        console.error('[UPLOAD] Gagal menghapus file setelah transaksi gagal:', cleanupError);
      }
    }
    throw err;
  }
}

/**
 * Verifikasi pembayaran (Admin/Owner).
 * - TERIMA + DP == total -> LUNAS tanpa pelunasan nol (BR-26)
 * - TERIMA + DP < total  -> DP_DITERIMA, dan pesanan MENUNGGU_DP -> PESANAN_BARU
 * - TERIMA + PELUNASAN   -> LUNAS
 * - TOLAK                -> status pembayaran pesanan kembali ke status_sebelum_verifikasi (alasan wajib)
 */
export async function verify({
  user, idPembayaran, aksi, catatan, ip,
}: {
  user: AuthUser;
  idPembayaran: number;
  aksi: 'DITERIMA' | 'DITOLAK';
  catatan?: string | null;
  ip?: string;
}) {
  const alasan = (catatan ?? '').trim();
  if (aksi === 'DITOLAK' && !alasan) {
    throw new AppError('ERR-PAY-02', 422, 'Alasan penolakan wajib diisi');
  }

  return withTransaction(async (trx) => {
    const r = await new sql.Request(trx)
      .input('id', sql.Int, idPembayaran)
      .query(`
        SELECT p.id_pembayaran, p.id_pesanan, p.jenis, p.nominal, p.status, p.status_sebelum_verifikasi,
               o.total_harga, o.status_pesanan
        FROM dbo.Pembayaran p WITH (UPDLOCK, ROWLOCK)
        JOIN dbo.Pesanan o WITH (UPDLOCK, ROWLOCK) ON o.id_pesanan = p.id_pesanan
        WHERE p.id_pembayaran = @id
      `);
    const pay = r.recordset[0];
    if (!pay) throw new AppError('ERR-ORD-01', 404, 'Pembayaran tidak ditemukan');
    if (pay.status !== 'MENUNGGU_VERIFIKASI') throw new AppError('ERR-PAY-03', 409);
    if (pay.status_pesanan === 'DIBATALKAN') throw new AppError('ERR-PAY-06', 409);

    if (aksi === 'DITERIMA') {
      await new sql.Request(trx)
        .input('id', sql.Int, idPembayaran)
        .input('by', sql.Int, user.id)
        .query(`
          UPDATE dbo.Pembayaran
          SET status = 'DITERIMA', diverifikasi_oleh = @by, diverifikasi_pada = ${SQL_NOW_WIB}
          WHERE id_pembayaran = @id
        `);

      let statusBayarBaru: 'LUNAS' | 'DP_DITERIMA';
      if (pay.jenis === 'DP') {
        statusBayarBaru = sen(pay.nominal) >= sen(pay.total_harga) ? 'LUNAS' : 'DP_DITERIMA';
      } else {
        statusBayarBaru = 'LUNAS';
      }

      const naikKePesananBaru = pay.jenis === 'DP' && pay.status_pesanan === 'MENUNGGU_DP';
      await new sql.Request(trx)
        .input('idPesanan', sql.Int, pay.id_pesanan)
        .input('statusBayar', sql.VarChar(25), statusBayarBaru)
        .input('naik', sql.Bit, naikKePesananBaru)
        .query(`
          UPDATE dbo.Pesanan
          SET status_pembayaran = @statusBayar,
              status_pesanan = CASE WHEN @naik = 1 THEN 'PESANAN_BARU' ELSE status_pesanan END
          WHERE id_pesanan = @idPesanan
        `);

      if (naikKePesananBaru) {
        await new sql.Request(trx)
          .input('idPesanan', sql.Int, pay.id_pesanan)
          .input('by', sql.Int, user.id)
          .query(`
            INSERT INTO dbo.RiwayatStatusPesanan (id_pesanan, status, id_pengguna)
            VALUES (@idPesanan, 'PESANAN_BARU', @by)
          `);
      }

      await logSvc.log({
        transaction: trx,
        actorId: user.id,
        aksi: 'VERIFIKASI_TERIMA',
        entitas: 'Pembayaran',
        entitasId: idPembayaran,
        dataBaru: { status_pembayaran_pesanan: statusBayarBaru, catatan: alasan || null },
        ip,
      });

      return {
        id_pembayaran: idPembayaran,
        status: 'DITERIMA',
        status_pesanan: naikKePesananBaru ? 'PESANAN_BARU' : pay.status_pesanan,
        status_pembayaran: statusBayarBaru,
      };
    }

    // TOLAK
    const statusKembali: string =
      pay.status_sebelum_verifikasi ?? (pay.jenis === 'DP' ? 'BELUM_BAYAR' : 'DP_DITERIMA');

    await new sql.Request(trx)
      .input('id', sql.Int, idPembayaran)
      .input('by', sql.Int, user.id)
      .input('alasan', sql.NVarChar(255), alasan)
      .query(`
        UPDATE dbo.Pembayaran
        SET status = 'DITOLAK', alasan_penolakan = @alasan,
            diverifikasi_oleh = @by, diverifikasi_pada = ${SQL_NOW_WIB}
        WHERE id_pembayaran = @id
      `);
    await new sql.Request(trx)
      .input('idPesanan', sql.Int, pay.id_pesanan)
      .input('statusBayar', sql.VarChar(25), statusKembali)
      .query(`UPDATE dbo.Pesanan SET status_pembayaran = @statusBayar WHERE id_pesanan = @idPesanan`);

    await logSvc.log({
      transaction: trx,
      actorId: user.id,
      aksi: 'VERIFIKASI_TOLAK',
      entitas: 'Pembayaran',
      entitasId: idPembayaran,
      dataBaru: { status_pembayaran_pesanan: statusKembali, alasan },
      ip,
    });

    return {
      id_pembayaran: idPembayaran,
      status: 'DITOLAK',
      status_pesanan: pay.status_pesanan,
      status_pembayaran: statusKembali,
    };
  });
}
