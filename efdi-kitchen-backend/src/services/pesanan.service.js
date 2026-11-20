const { getPool, sql } = require('../config/database');
const { AppError } = require('../utils/errors');
const { dayjs } = require('../utils/datetime');
const operasional = require('./operasional.service');
const notaSvc = require('./nota.service');
const logSvc = require('./log.service');

async function generateKodePesanan(pool) {
  const today = dayjs().format('YYYYMMDD');
  const r = await pool.request()
    .input('prefix', `ORD-${today}-%`)
    .query(`SELECT COUNT(*) AS c FROM pesanan WHERE kode_pesanan LIKE @prefix`);
  return `ORD-${today}-${String(r.recordset[0].c + 1).padStart(4, '0')}`;
}

async function create({ user, payload }) {
  // 1. Validasi jam operasional (server-side, saat submit)
  const ops = await operasional.cekStatus();
  if (ops.status === 'TUTUP') {
    const msg = ops.tanpa_jadwal
      ? 'Pemesanan sedang ditutup. Silakan hubungi pengelola untuk informasi lebih lanjut.'
      : `Pemesanan sedang ditutup. Buka kembali: ${ops.jam_buka_berikutnya}`;
    throw new AppError('ERR-OPS-01', 422, msg);
  }

  // 2. Validasi tanggal per kanal
  const now = dayjs();
  const acara = dayjs(`${payload.tanggal_acara}T${payload.waktu_acara || '00:00'}`);
  if (payload.kanal === 'ONLINE') {
    if (acara.isBefore(now.add(1, 'day'), 'day')) {
      throw new AppError('ERR-VAL-04', 422, 'Tanggal ONLINE minimal H+1');
    }
  } else {
    if (acara.isBefore(now)) {
      throw new AppError('ERR-VAL-04', 422, 'Tanggal/jam acara sudah terlewat');
    }
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // 3. Hitung detail & total
    let total = 0;
    const detailFixed = [];
    for (const d of payload.detail) {
      const p = await new sql.Request(transaction)
        .input('id', d.id_produk)
        .query(`SELECT id_produk, harga_per_porsi FROM produk WHERE id_produk=@id AND is_active=1`);
      if (!p.recordset[0]) throw new AppError('ERR-CAT-04', 404);
      const harga = Number(p.recordset[0].harga_per_porsi);
      const subtotal = harga * d.jumlah_porsi;
      total += subtotal;
      detailFixed.push({ ...d, harga, subtotal });
    }

    const nominalDp = Number((total * 0.5).toFixed(2));
    const sisa = Number((total - nominalDp).toFixed(2));
    const kode = await generateKodePesanan(pool);

    // 4. INSERT pesanan
    const insertOrder = await new sql.Request(transaction)
      .input('kode', kode)
      .input('nama', payload.nama_pelanggan)
      .input('kontak', payload.no_kontak)
      .input('tgl', payload.tanggal_acara)
      .input('waktu', payload.waktu_acara)
      .input('catatan', payload.catatan || null)
      .input('kanal', payload.kanal)
      .input('idPelanggan', payload.kanal === 'ONLINE' ? user.id : null)
      .input('idAdmin', payload.kanal === 'DATANG_LANGSUNG' ? user.id : null)
      .input('total', total)
      .query(`
        INSERT INTO pesanan (kode_pesanan, nama_pelanggan, no_kontak, tanggal_acara, waktu_acara,
          catatan, kanal, id_pelanggan, dibuat_oleh_admin, status_pesanan, status_pembayaran, total_tagihan)
        OUTPUT INSERTED.id_pesanan
        VALUES (@kode, @nama, @kontak, @tgl, @waktu,
          @catatan, @kanal, @idPelanggan, @idAdmin, 'MENUNGGU_DP', 'BELUM_BAYAR', @total)
      `);
    const idPesanan = insertOrder.recordset[0].id_pesanan;

    // 5. INSERT detail
    for (const d of detailFixed) {
      await new sql.Request(transaction)
        .input('idPesanan', idPesanan)
        .input('idProduk', d.id_produk)
        .input('porsi', d.jumlah_porsi)
        .input('harga', d.harga)
        .input('subtotal', d.subtotal)
        .query(`
          INSERT INTO detail_pesanan (id_pesanan, id_produk, jumlah_porsi, harga_satuan, subtotal)
          VALUES (@idPesanan, @idProduk, @porsi, @harga, @subtotal)
        `);
    }

    // 6. Nota
    const nomorNota = await notaSvc.terbitkanNomorNota(pool);
    await notaSvc.simpanNota({ transaction, idPesanan, total, nominalDp, sisa, nomorNota });
    
    // 7. validasi total tagihan
    if (total <= 0) throw new AppError('ERR-VAL-03', 422);

    // 8. Riwayat awal
    await new sql.Request(transaction)
      .input('idPesanan', idPesanan)
      .query(`INSERT INTO riwayat_status_pesanan (id_pesanan, status) VALUES (@idPesanan, 'PESANAN_BARU')`);

    // 9. Log
    await logSvc.log({ actorId: user.id, aksi: 'PESANAN_BARU', entitas: 'pesanan', entitasId: idPesanan });

    await transaction.commit();

    return {
      kode_pesanan: kode,
      status_pesanan: 'MENUNGGU_DP',
      status_pembayaran: 'BELUM_BAYAR',
      total_tagihan: total,
      nominal_dp: nominalDp,
      sisa_pembayaran: sisa,
      nota: { nomor_nota: nomorNota, diterbitkan_pada: new Date().toISOString() },
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = { create };