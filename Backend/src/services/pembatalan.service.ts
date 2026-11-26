import { sql, withTransaction } from '../config/database';
import { AppError } from '../utils/errors';
import type { AuthUser } from '../types/express';
import * as logSvc from './log.service';

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export async function cancel({
  user, kode, alasan, ip,
}: { user: AuthUser; kode: string; alasan?: string; ip?: string }) {
  const reason = alasan?.trim() || null;
  const cancelled = await withTransaction(async (trx) => {
    const actorResult = await new sql.Request(trx)
      .input('userId', sql.Int, user.id)
      .query(`SELECT role FROM dbo.pengguna WHERE id_pengguna = @userId AND aktif = 1`);
    const role: string | undefined = actorResult.recordset[0]?.role;
    if (!role) throw new AppError('ERR-AUTH-01', 401);
    if (!['Customer', 'Admin', 'Owner'].includes(role)) throw new AppError('ERR-AUTH-03', 403);

    const orderResult = await new sql.Request(trx)
      .input('kode', sql.NVarChar(10), kode)
      .query(`
        SELECT id_pesanan, id_pelanggan, status_pesanan, status_pembayaran,
               CASE WHEN DATEDIFF(SECOND, dibuat_pada, SYSUTCDATETIME()) > 480 THEN 1 ELSE 0 END AS batas_waktu_lewat
        FROM dbo.pesanan WITH (UPDLOCK, ROWLOCK)
        WHERE kode_pesanan = @kode
      `);
    const order = orderResult.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);
    if (role === 'Customer') {
      if (order.id_pelanggan !== user.id) throw new AppError('ERR-AUTH-03', 403);
      if (order.status_pesanan !== 'MENUNGGU_DP' || order.status_pembayaran !== 'BELUM_BAYAR') {
        throw new AppError('ERR-ORD-07', 403);
      }
      if (order.batas_waktu_lewat) throw new AppError('ERR-ORD-06', 403);

      const paymentResult = await new sql.Request(trx)
        .input('idPesanan', sql.Int, order.id_pesanan)
        .query(`
          SELECT TOP 1 id_pembayaran
          FROM dbo.pembayaran
          WHERE id_pesanan = @idPesanan
        `);
      if (paymentResult.recordset.length > 0) throw new AppError('ERR-ORD-07', 403);
    } else {
      if (order.status_pesanan === 'DIBATALKAN' || order.status_pesanan === 'SELESAI') {
        throw new AppError('ERR-ORD-02', 409);
      }
      if (!reason) throw new AppError('ERR-ORD-05', 422);
    }

    if (role === 'Admin' || role === 'Owner') {
      await new sql.Request(trx)
        .input('idPesanan', sql.Int, order.id_pesanan)
        .input('userId', sql.Int, user.id)
        .query(`
          UPDATE dbo.pembayaran
          SET status = 'VOID', di_void_pada = SYSUTCDATETIME(), di_void_oleh = @userId
          WHERE id_pesanan = @idPesanan AND status = 'MENUNGGU_VERIFIKASI'
        `);

      const productionItems = await new sql.Request(trx)
        .input('idPesanan', sql.Int, order.id_pesanan)
        .query(`
          SELECT id_item, SUM(jumlah) AS jumlah_balik
          FROM dbo.mutasi_stok
          WHERE id_pesanan = @idPesanan AND jenis = 'PENGURANGAN_PRODUKSI'
          GROUP BY id_item
          ORDER BY id_item
        `);

      for (const item of productionItems.recordset) {
        const alreadyRestocked = await new sql.Request(trx)
          .input('idPesanan', sql.Int, order.id_pesanan)
          .input('idItem', sql.Int, item.id_item)
          .query(`
            SELECT TOP 1 id_mutasi
            FROM dbo.mutasi_stok
            WHERE id_pesanan = @idPesanan AND id_item = @idItem
              AND jenis = 'PENGEMBALIAN_PEMBATALAN'
          `);
        if (alreadyRestocked.recordset.length > 0) continue;

        const stockResult = await new sql.Request(trx)
          .input('idItem', sql.Int, item.id_item)
          .query(`
            SELECT stok_saat_ini
            FROM dbo.item_inventaris WITH (UPDLOCK, ROWLOCK)
            WHERE id_item = @idItem
          `);
        const amount = round3(Number(item.jumlah_balik));
        const before = round3(Number(stockResult.recordset[0].stok_saat_ini));
        const after = round3(before + amount);
        await new sql.Request(trx)
          .input('itemId', sql.Int, item.id_item)
          .input('amount', sql.Decimal(12, 3), amount)
          .input('before', sql.Decimal(12, 3), before)
          .input('after', sql.Decimal(12, 3), after)
          .input('orderId', sql.Int, order.id_pesanan)
          .input('reason', sql.NVarChar(255), reason)
          .input('userId', sql.Int, user.id)
          .query(`
            INSERT INTO dbo.mutasi_stok
              (id_item, jenis, jumlah, stok_sebelum, stok_sesudah, id_pesanan, keterangan, id_pengguna, waktu)
            VALUES
              (@itemId, 'PENGEMBALIAN_PEMBATALAN', @amount, @before, @after, @orderId, @reason, @userId, SYSUTCDATETIME());

            UPDATE dbo.item_inventaris SET stok_saat_ini = @after WHERE id_item = @itemId;
          `);
      }
    }

    await new sql.Request(trx)
      .input('idPesanan', sql.Int, order.id_pesanan)
      .input('reason', sql.NVarChar(255), reason)
      .input('userId', sql.Int, user.id)
      .query(`
        UPDATE dbo.pesanan
        SET status_pesanan = 'DIBATALKAN', alasan_pembatalan = @reason
        WHERE id_pesanan = @idPesanan;

        INSERT INTO dbo.riwayat_status_pesanan (id_pesanan, status, id_pengguna, waktu)
        VALUES (@idPesanan, 'DIBATALKAN', @userId, SYSUTCDATETIME());
      `);

    await logSvc.log({
      transaction: trx,
      actorId: user.id,
      aksi: 'PESANAN_DIBATALKAN',
      entitas: 'Pesanan',
      entitasId: order.id_pesanan,
      dataLama: { status_pesanan: order.status_pesanan },
      dataBaru: { status_pesanan: 'DIBATALKAN', alasan: reason },
      ip,
    });

    return { idPesanan: order.id_pesanan };
  });

  return {
    id_pesanan: cancelled.idPesanan,
    status_pesanan: 'DIBATALKAN',
  };
}
