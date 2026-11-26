import { sql, withTransaction } from '../config/database';
import { AppError } from '../utils/errors';
import { nowWIB } from '../utils/datetime';
import { randomInt } from 'crypto';
import type { AuthUser } from '../types/express';
import * as operasional from './operasional.service';
import * as notaSvc from './nota.service';
import * as logSvc from './log.service';

export interface CreateOrderPayload {
  nama_pelanggan: string;
  no_kontak: string;
  tanggal_acara: string; // YYYY-MM-DD
  waktu_acara: string; // HH:mm atau HH:mm:ss
  catatan?: string | null;
  detail: { id_produk: number; jumlah_porsi: number }[];
}

/**
 * Kode pesanan memakai EFD- diikuti enam karakter alfanumerik sesuai kontrak TSD.
 * Pemeriksaan dilakukan di transaksi dengan lock rentang agar kode tidak ganda.
 */
async function generateKodePesanan(trx: sql.Transaction): Promise<string> {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 5; attempt++) {
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += alphabet[randomInt(alphabet.length)];
    const code = `EFD-${suffix}`;
    const existing = await new sql.Request(trx)
      .input('code', sql.NVarChar(10), code)
      .query(`SELECT TOP 1 id_pesanan FROM dbo.pesanan WITH (UPDLOCK, HOLDLOCK) WHERE kode_pesanan = @code`);
    if (!existing.recordset[0]) return code;
  }
  throw new AppError('ERR-SYS-01', 503, 'Kode pesanan tidak dapat dibuat saat ini');
}

export async function create({ user, payload, ip }: { user: AuthUser; payload: CreateOrderPayload; ip?: string }) {
  // 1. Validasi jam operasional (server-side, saat submit)
  const ops = await operasional.cekStatus();
  if (ops.status === 'TUTUP') {
    const msg = ops.tanpa_jadwal
      ? 'Pemesanan sedang ditutup. Silakan hubungi pengelola untuk informasi lebih lanjut.'
      : `Pemesanan sedang ditutup. Buka kembali: ${ops.jam_buka_berikutnya}`;
    throw new AppError('ERR-OPS-01', 403, msg);
  }

  // 2. Kanal ditentukan dari role (CK_Pesanan_kanal_relasi)
  const kanal = user.role === 'Customer' ? 'ONLINE' : 'DATANG_LANGSUNG';

  // 3. Validasi tanggal per kanal (semua dalam WIB)
  const now = nowWIB();
  const hariIni = now.format('YYYY-MM-DD');
  const besok = now.add(1, 'day').format('YYYY-MM-DD');
  const waktu = payload.waktu_acara.slice(0, 5);
  if (kanal === 'ONLINE') {
    if (payload.tanggal_acara < besok) {
      throw new AppError('ERR-VAL-04', 422, 'Tanggal acara pesanan online minimal H+1');
    }
  } else if (payload.tanggal_acara < hariIni || (payload.tanggal_acara === hariIni && waktu <= now.format('HH:mm'))) {
    throw new AppError('ERR-VAL-04', 422, 'Tanggal/jam acara sudah terlewat');
  }

  // Gabungkan produk yang sama
  const porsiPerProduk = new Map<number, bigint>();
  for (const d of payload.detail) {
    const totalPorsi = (porsiPerProduk.get(d.id_produk) ?? 0n) + BigInt(d.jumlah_porsi);
    if (totalPorsi > 2147483647n) throw new AppError('ERR-VAL-03', 422);
    porsiPerProduk.set(d.id_produk, totalPorsi);
  }

  return withTransaction(async (trx) => {
    // 4. Hitung detail & total (dalam sen agar tidak ada selisih pembulatan float)
    let totalSen = 0n;
    const maxTotalSen = 999999999999n;
    const detailFixed: { id_produk: number; jumlah_porsi: number; harga: number; subtotal: number }[] = [];
    for (const [idProduk, porsi] of porsiPerProduk) {
      const p = await new sql.Request(trx)
        .input('id', sql.Int, idProduk)
        .query(`SELECT harga_per_porsi FROM dbo.produk WHERE id_produk = @id AND aktif = 1`);
      if (!p.recordset[0]) throw new AppError('ERR-CAT-04', 409);
      const hargaSen = Math.round(Number(p.recordset[0].harga_per_porsi) * 100);
      const subtotalSen = BigInt(hargaSen) * porsi;
      totalSen += subtotalSen;
      if (totalSen > maxTotalSen) throw new AppError('ERR-VAL-03', 422);
      detailFixed.push({
        id_produk: idProduk,
        jumlah_porsi: Number(porsi),
        harga: hargaSen / 100,
        subtotal: Number(subtotalSen) / 100,
      });
    }
    if (totalSen < 100n) throw new AppError('ERR-VAL-03', 422);

    const dpSen = ((totalSen + 199n) / 200n) * 100n;
    const total = Number(totalSen) / 100;
    const nominalDp = Number(dpSen) / 100;
    const sisaNota = Number(totalSen - dpSen) / 100;
    const kode = await generateKodePesanan(trx);

    // 5. INSERT Pesanan
    const insertOrder = await new sql.Request(trx)
      .input('kode', sql.NVarChar(10), kode)
      .input('nama', sql.NVarChar(100), payload.nama_pelanggan)
      .input('kontak', sql.NVarChar(20), payload.no_kontak)
      .input('idPelanggan', sql.Int, kanal === 'ONLINE' ? user.id : null)
      .input('idAdmin', sql.Int, kanal === 'DATANG_LANGSUNG' ? user.id : null)
      .input('tgl', sql.NVarChar(10), payload.tanggal_acara)
      .input('waktu', sql.NVarChar(8), payload.waktu_acara)
      .input('catatan', sql.NVarChar(500), payload.catatan || null)
      .input('kanal', sql.NVarChar(20), kanal)
      .input('total', sql.Decimal(12, 2), total)
      .query(`
        INSERT INTO dbo.pesanan (kode_pesanan, nama_pelanggan, no_kontak, id_pelanggan, dibuat_oleh_admin,
          tanggal_acara, waktu_acara, catatan, kanal, status_pesanan, status_pembayaran, total_harga)
        OUTPUT INSERTED.id_pesanan
        VALUES (@kode, @nama, @kontak, @idPelanggan, @idAdmin,
          CAST(@tgl AS DATE), CAST(@waktu AS TIME(0)), @catatan, @kanal, 'MENUNGGU_DP', 'BELUM_BAYAR', @total)
      `);
    const idPesanan: number = insertOrder.recordset[0].id_pesanan;

    // 6. INSERT DetailPesanan (subtotal wajib disimpan pada skema baru)
    for (const d of detailFixed) {
      await new sql.Request(trx)
        .input('idPesanan', sql.Int, idPesanan)
        .input('idProduk', sql.Int, d.id_produk)
        .input('porsi', sql.Int, d.jumlah_porsi)
        .input('harga', sql.Decimal(12, 2), d.harga)
        .input('subtotal', sql.Decimal(12, 2), d.subtotal)
        .query(`
          INSERT INTO dbo.detail_pesanan (id_pesanan, id_produk, jumlah_porsi, harga_satuan, subtotal)
          VALUES (@idPesanan, @idProduk, @porsi, @harga, @subtotal)
        `);
    }

    // 7. Nota digital
    const nomorNota = await notaSvc.terbitkanNomorNota(trx);
    await notaSvc.simpanNota({ trx, idPesanan, total, nominalDp, sisa: sisaNota, nomorNota });

    // 8. Riwayat awal (status sebenarnya saat dibuat: MENUNGGU_DP)
    await new sql.Request(trx)
      .input('idPesanan', sql.Int, idPesanan)
      .input('idPengguna', sql.Int, user.id)
      .query(`
        INSERT INTO dbo.riwayat_status_pesanan (id_pesanan, status, id_pengguna)
        VALUES (@idPesanan, 'MENUNGGU_DP', @idPengguna)
      `);

    // 9. Log
    await logSvc.log({
      transaction: trx,
      actorId: user.id,
      aksi: 'PESANAN_DIBUAT',
      entitas: 'Pesanan',
      entitasId: idPesanan,
      dataBaru: { kode_pesanan: kode, kanal, total_harga: total },
      ip,
    });

    return {
      id_pesanan: idPesanan,
      kode_pesanan: kode,
      status_pesanan: 'MENUNGGU_DP',
      status_pembayaran: 'BELUM_BAYAR',
      total_tagihan: total.toFixed(2),
      nominal_dp: nominalDp.toFixed(2),
      sisa_pembayaran: total.toFixed(2),
      nota: {
        nomor_nota: nomorNota,
        nominal_dp: nominalDp.toFixed(2),
        sisa_pembayaran: sisaNota.toFixed(2),
      },
    };
  });
}
