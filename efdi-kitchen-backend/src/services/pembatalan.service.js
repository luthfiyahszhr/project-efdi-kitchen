const { getPool, sql } = require('../config/database');
const { AppError } = require('../utils/errors');
const { dayjs } = require('../utils/datetime');
const logSvc = require('./log.service');

const CANCEL_WINDOW_MINUTES = 8;

async function cancel({ user, kode, alasan }) {
  const pool = await getPool();
  const trx = new sql.Transaction(pool);
  await trx.begin();
  try {
    const r = await new sql.Request(trx)
      .input('kode', kode)
      .query(`SELECT TOP 1 * FROM pesanan WITH (UPDLOCK, ROWLOCK) WHERE kode_pesanan=@kode`);
    const order = r.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);
    if (order.status_pesanan === 'DIBATALKAN') throw new AppError('ERR-ORD-01', 409, 'Sudah dibatalkan');

    // Batas 8 menit hanya untuk Customer
    if (user.role === 'CUSTOMER') {
      if (order.id_pelanggan !== user.id) throw new AppError('ERR-AUTH-02', 403);
      const minutes = dayjs().diff(dayjs(order.created_at), 'minute');
      if (minutes > CANCEL_WINDOW_MINUTES) throw new AppError('ERR-ORD-02', 409);
    }

    // Void semua pembayaran pending
    const voided = await new sql.Request(trx)
      .input('idPesanan', order.id_pesanan)
      .query(`UPDATE pembayaran SET status='DIVOID' OUTPUT INSERTED.id_pembayaran WHERE id_pesanan=@idPesanan AND status='MENUNGGU_VERIFIKASI'`);
    const voidIds = voided.recordset.map(x => x.id_pembayaran);

    // Auto-restock jika stok telah terpotong — deteksi lewat status pesanan
    let restock = false;
    if (['DIPROSES', 'SIAP'].includes(order.status_pesanan)) {
      // implementasi konsumsi stok simetris (lihat FSD modul inventaris)
      // pseudo: kurangi stok saat diproses → pada pembatalan, kembalikan
      restock = true;
      await new sql.Request(trx)
        .input('idPesanan', order.id_pesanan)
        .query(`
          UPDATE b SET b.stok = b.stok + cb.jumlah_per_porsi * dp.jumlah_porsi
          FROM bahan b
          JOIN komposisi_bahan cb ON cb.id_bahan=b.id_bahan
          JOIN detail_pesanan dp ON dp.id_produk=cb.id_produk
          WHERE dp.id_pesanan=@idPesanan
        `);
    }

    await new sql.Request(trx)
      .input('idPesanan', order.id_pesanan)
      .query(`UPDATE pesanan SET status_pesanan='DIBATALKAN', updated_at=SYSDATETIME() WHERE id_pesanan=@idPesanan`);
    await new sql.Request(trx)
      .input('idPesanan', order.id_pesanan)
      .query(`INSERT INTO riwayat_status_pesanan (id_pesanan, status) VALUES (@idPesanan, 'DIBATALKAN')`);

    await logSvc.log({ actorId: user.id, aksi: 'PEMBATALAN_PESANAN', entitas: 'pesanan', entitasId: order.id_pesanan, detail: { alasan } });
    await trx.commit();

    return {
      kode_pesanan: kode,
      status_pesanan: 'DIBATALKAN',
      pembayaran_divoid: voidIds,
      restock,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}

module.exports = { cancel };