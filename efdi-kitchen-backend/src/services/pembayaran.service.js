const { getPool, sql } = require('../config/database');
const { AppError } = require('../utils/errors');
const logSvc = require('./log.service');

async function uploadBukti({ user, kode, body, file }) {
  if (!file) throw new AppError('ERR-VAL-05', 422, 'File bukti wajib diunggah');

  const pool = await getPool();
  const trx = new sql.Transaction(pool);
  await trx.begin();

  try {
    // SELECT ... FOR UPDATE → MSSQL: WITH (UPDLOCK, ROWLOCK)
    const r = await new sql.Request(trx)
      .input('kode', kode)
      .query(`SELECT TOP 1 * FROM pesanan WITH (UPDLOCK, ROWLOCK) WHERE kode_pesanan=@kode`);
    const order = r.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);
    if (order.status_pesanan === 'DIBATALKAN') throw new AppError('ERR-PAY-06', 409);

    // Otorisasi: customer hanya pesanannya sendiri
    if (user.role === 'CUSTOMER' && order.id_pelanggan !== user.id) {
      throw new AppError('ERR-AUTH-02', 403);
    }

    const jenis = body.jenis;
    const nominal = Number(body.nominal);

    // Cek tidak ada pending jenis sama
    const pending = await new sql.Request(trx)
      .input('idPesanan', order.id_pesanan)
      .input('jenis', jenis)
      .query(`SELECT TOP 1 id_pembayaran FROM pembayaran WHERE id_pesanan=@idPesanan AND jenis=@jenis AND status='MENUNGGU_VERIFIKASI'`);
    if (pending.recordset[0]) throw new AppError('ERR-PAY-01', 409);

    if (jenis === 'DP') {
      if (order.status_pembayaran !== 'BELUM_BAYAR') throw new AppError('ERR-PAY-01', 409);
      const nota = await new sql.Request(trx)
        .input('idPesanan', order.id_pesanan)
        .query(`SELECT nominal_dp FROM nota_digital WHERE id_pesanan=@idPesanan`);
      if (nominal < Number(nota.recordset[0].nominal_dp)) throw new AppError('ERR-PAY-05', 422);
    } else {
      if (order.status_pembayaran !== 'DP_DITERIMA') throw new AppError('ERR-PAY-01', 409);
      const saldoRes = await new sql.Request(trx)
        .input('idPesanan', order.id_pesanan)
        .query(`
          SELECT o.total_tagihan - ISNULL(SUM(CASE WHEN p.status='DITERIMA' THEN p.nominal ELSE 0 END),0) AS saldo
          FROM pesanan o LEFT JOIN pembayaran p ON p.id_pesanan=o.id_pesanan
          WHERE o.id_pesanan=@idPesanan
          GROUP BY o.total_tagihan
        `);
      const saldo = Number(saldoRes.recordset[0].saldo);
      if (nominal !== saldo) throw new AppError('ERR-PAY-05', 422);
    }

    const statusSebelum = order.status_pembayaran;

    const inserted = await new sql.Request(trx)
      .input('idPesanan', order.id_pesanan)
      .input('jenis', jenis)
      .input('metode', body.metode)
      .input('nominal', nominal)
      .input('fileUrl', `/files/${file.filename}`)
      .input('statusSebelum', statusSebelum)
      .query(`
        INSERT INTO pembayaran (id_pesanan, jenis, metode, nominal, file_bukti_url, status, status_sebelum_verifikasi)
        OUTPUT INSERTED.id_pembayaran
        VALUES (@idPesanan, @jenis, @metode, @nominal, @fileUrl, 'MENUNGGU_VERIFIKASI', @statusSebelum)
      `);
    const idPembayaran = inserted.recordset[0].id_pembayaran;

    // DP → ubah Pesanan.status_pembayaran ke MENUNGGU_VERIFIKASI
    // PELUNASAN → tetap DP_DITERIMA
    if (jenis === 'DP') {
      await new sql.Request(trx)
        .input('idPesanan', order.id_pesanan)
        .query(`UPDATE pesanan SET status_pembayaran='MENUNGGU_VERIFIKASI', updated_at=SYSDATETIME() WHERE id_pesanan=@idPesanan`);
    }

    await logSvc.log({ actorId: user.id, aksi: 'UNGGAH_BUKTI', entitas: 'pembayaran', entitasId: idPembayaran });
    await trx.commit();

    return {
      id_pembayaran: idPembayaran,
      jenis,
      status: 'MENUNGGU_VERIFIKASI',
      nominal,
      status_pembayaran_pesanan: jenis === 'DP' ? 'MENUNGGU_VERIFIKASI' : 'DP_DITERIMA',
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}

/**
 * Verifikasi pembayaran (Admin/Owner).
 * - TERIMA + DP == total_tagihan → LUNAS tanpa pelunasan nol (BR-26)
 * - TERIMA + DP < total → DP_DITERIMA
 * - TERIMA + PELUNASAN → LUNAS
 * - TOLAK → status Pesanan kembali ke status_sebelum_verifikasi
 */
async function verify({ user, idPembayaran, aksi, catatan }) {
  const pool = await getPool();
  const trx = new sql.Transaction(pool);
  await trx.begin();

  try {
    const r = await new sql.Request(trx)
      .input('id', idPembayaran)
      .query(`SELECT TOP 1 p.*, o.total_tagihan, o.id_pesanan AS oid
              FROM pembayaran p WITH (UPDLOCK, ROWLOCK)
              JOIN pesanan o ON o.id_pesanan=p.id_pesanan
              WHERE p.id_pembayaran=@id`);
    const pay = r.recordset[0];
    if (!pay) throw new AppError('ERR-ORD-01', 404);
    if (pay.status !== 'MENUNGGU_VERIFIKASI') throw new AppError('ERR-PAY-01', 409);

    if (aksi === 'TERIMA') {
      await new sql.Request(trx)
        .input('id', idPembayaran)
        .input('by', user.id)
        .query(`UPDATE pembayaran SET status='DITERIMA', verified_by=@by, verified_at=SYSDATETIME() WHERE id_pembayaran=@id`);

      let newStatus;
      if (pay.jenis === 'DP') {
        newStatus = Number(pay.nominal) >= Number(pay.total_tagihan) ? 'LUNAS' : 'DP_DITERIMA';
      } else {
        newStatus = 'LUNAS';
      }
      await new sql.Request(trx)
        .input('idPesanan', pay.oid)
        .input('status', newStatus)
        .query(`UPDATE pesanan SET status_pembayaran=@status, updated_at=SYSDATETIME() WHERE id_pesanan=@idPesanan`);

      await new sql.Request(trx)
        .input('idPesanan', pay.oid)
        .input('status', newStatus)
        .query(`INSERT INTO riwayat_status_pesanan (id_pesanan, status) VALUES (@idPesanan, @status)`);

      await logSvc.log({ actorId: user.id, aksi: 'VERIFIKASI_TERIMA', entitas: 'pembayaran', entitasId: idPembayaran, detail: { catatan } });
    } else {
      // TOLAK
      await new sql.Request(trx)
        .input('id', idPembayaran)
        .input('by', user.id)
        .query(`UPDATE pembayaran SET status='DITOLAK', verified_by=@by, verified_at=SYSDATETIME() WHERE id_pembayaran=@id`);
      await new sql.Request(trx)
        .input('idPesanan', pay.oid)
        .input('status', pay.status_sebelum_verifikasi)
        .query(`UPDATE pesanan SET status_pembayaran=@status, updated_at=SYSDATETIME() WHERE id_pesanan=@idPesanan`);
      await logSvc.log({ actorId: user.id, aksi: 'VERIFIKASI_TOLAK', entitas: 'pembayaran', entitasId: idPembayaran, detail: { catatan } });
    }

    await trx.commit();
    return { id_pembayaran: idPembayaran, aksi };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}

module.exports = { uploadBukti, verify };