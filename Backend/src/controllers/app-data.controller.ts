import type { RequestHandler } from 'express';
import { dayjs, toWIB } from '../utils/datetime';
import { getPool, sql } from '../config/database';
import { ok } from '../utils/response';

const ORDER_STATUS: Record<string, string> = {
  MENUNGGU_DP: 'Menunggu DP',
  PESANAN_BARU: 'Pesanan Baru',
  MULAI_DIMASAK: 'Mulai Dimasak',
  SEDANG_DIPACKING: 'Sedang Dipacking',
  SIAP_DIAMBIL: 'Siap Diambil',
  SELESAI: 'Pesanan Selesai',
  DIBATALKAN: 'Dibatalkan',
};
const PAYMENT_STATUS: Record<string, string> = {
  BELUM_BAYAR: 'Belum Bayar',
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  DP_DITERIMA: 'DP Diterima',
  LUNAS: 'Lunas',
};
const PAYMENT_RECORD_STATUS: Record<string, string> = {
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  DITERIMA: 'Diterima',
  DITOLAK: 'Ditolak',
  VOID: 'VOID',
};
const PAYMENT_METHOD: Record<string, string> = {
  QRIS: 'QRIS',
  TRANSFER: 'Transfer Bank',
  TUNAI: 'Tunai',
};

function mapDate(value: Date | string): string {
  return dayjs.utc(value).format('YYYY-MM-DD');
}

export const bootstrap: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user!;
    const isStaff = user.role !== 'Customer';
    const pool = await getPool();

    const userResult = await pool.request()
      .input('id', sql.Int, user.id)
      .query(`
        SELECT id_pengguna, nama_lengkap, username, email, role, aktif
        FROM dbo.pengguna WHERE id_pengguna = @id AND aktif = 1
      `);
    const currentUser = userResult.recordset[0];
    if (!currentUser) return res.status(401).json({
      success: false,
      data: null,
      error: { code: 'ERR-AUTH-04', message: 'Sesi tidak valid', fields: {} },
    });

    const productsResult = await pool.request()
      .query(`
        SELECT p.id_produk, p.nama_paket, p.jenis_paket, p.deskripsi, p.isi_paket,
               p.harga_per_porsi, p.aktif,
               CASE WHEN p.foto_path IS NULL THEN NULL ELSE CONCAT('/media/produk/', p.id_produk) END AS foto_url
        FROM dbo.produk p
        ${isStaff ? '' : 'WHERE p.aktif = 1'}
        ORDER BY p.nama_paket, p.id_produk
      `);
    const compositionsResult = await pool.request()
      .query(`
        SELECT kp.id_produk, kp.id_item, kp.jumlah_per_porsi
        FROM dbo.komposisi_paket kp
        JOIN dbo.produk p ON p.id_produk = kp.id_produk
        ${isStaff ? '' : 'WHERE p.aktif = 1'}
      `);
    const compositions = new Map<number, Array<{ itemId: number; jumlahPerPorsi: number }>>();
    for (const row of compositionsResult.recordset) {
      const current = compositions.get(row.id_produk) ?? [];
      current.push({ itemId: row.id_item, jumlahPerPorsi: Number(row.jumlah_per_porsi) });
      compositions.set(row.id_produk, current);
    }
    const products = productsResult.recordset.map((row) => ({
      id: row.id_produk,
      nama: row.nama_paket,
      jenis: row.jenis_paket,
      ringkasanIsi: row.isi_paket,
      deskripsi: row.deskripsi,
      isiLengkap: String(row.isi_paket).split(/\r?\n/).filter(Boolean),
      hargaPerPorsi: Number(row.harga_per_porsi),
      fotoUrl: row.foto_url,
      aktif: Boolean(row.aktif),
      komposisi: compositions.get(row.id_produk) ?? [],
    }));

    const inventoryResult = isStaff
      ? await pool.request().query(`
          SELECT i.id_item, i.nama_item, i.tipe, i.satuan, i.stok_saat_ini, i.batas_minimum,
                 CASE WHEN EXISTS (SELECT 1 FROM dbo.komposisi_paket k WHERE k.id_item = i.id_item)
                      THEN 1 ELSE 0 END AS sudah_digunakan
          FROM dbo.item_inventaris i WHERE i.aktif = 1 ORDER BY i.nama_item, i.id_item
        `)
      : { recordset: [] };
    const inventory = inventoryResult.recordset.map((row) => ({
      id: row.id_item,
      nama: row.nama_item,
      tipe: row.tipe === 'BAHAN_BAKU' ? 'Bahan Baku' : 'Kemasan',
      satuan: row.satuan,
      stok: Number(row.stok_saat_ini),
      batasMinimum: row.batas_minimum === null ? null : Number(row.batas_minimum),
      sudahDigunakan: Boolean(row.sudah_digunakan),
    }));

    const orderResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT p.id_pesanan, p.kode_pesanan, p.nama_pelanggan, p.no_kontak,
               p.id_pelanggan, p.kanal, p.tanggal_acara, p.waktu_acara, p.catatan,
               p.status_pesanan, p.status_pembayaran, p.total_harga, p.dibuat_pada,
               p.alasan_pembatalan, n.nomor_nota, n.nominal_dp, n.sisa_pembayaran
        FROM dbo.pesanan p
        LEFT JOIN dbo.nota_digital n ON n.id_pesanan = p.id_pesanan
        WHERE ${isStaff ? '1 = 1' : 'p.id_pelanggan = @userId'}
        ORDER BY p.dibuat_pada DESC, p.id_pesanan DESC
      `);
    const detailResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT d.id_pesanan, d.id_produk, pr.nama_paket, pr.jenis_paket,
               d.jumlah_porsi, d.harga_satuan, d.subtotal
        FROM dbo.detail_pesanan d
        JOIN dbo.pesanan p ON p.id_pesanan = d.id_pesanan
        JOIN dbo.produk pr ON pr.id_produk = d.id_produk
        WHERE ${isStaff ? '1 = 1' : 'p.id_pelanggan = @userId'}
        ORDER BY d.id_detail
      `);
    const historyResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT h.id_pesanan, h.status, h.waktu
        FROM dbo.riwayat_status_pesanan h
        JOIN dbo.pesanan p ON p.id_pesanan = h.id_pesanan
        WHERE ${isStaff ? '1 = 1' : 'p.id_pelanggan = @userId'}
        ORDER BY h.waktu, h.id_riwayat
      `);
    type DetailRow = (typeof detailResult.recordset)[number];
    type HistoryRow = (typeof historyResult.recordset)[number];
    const detailsByOrder = new Map<number, DetailRow[]>();
    for (const row of detailResult.recordset) {
      const current = detailsByOrder.get(row.id_pesanan) ?? [];
      current.push(row);
      detailsByOrder.set(row.id_pesanan, current);
    }
    const historyByOrder = new Map<number, HistoryRow[]>();
    for (const row of historyResult.recordset) {
      const current = historyByOrder.get(row.id_pesanan) ?? [];
      current.push(row);
      historyByOrder.set(row.id_pesanan, current);
    }
    const orders = orderResult.recordset.map((row) => ({
      id: row.id_pesanan,
      kodePesanan: row.kode_pesanan,
      nomorNota: row.nomor_nota ?? '',
      pelangganId: row.id_pelanggan,
      namaPelanggan: row.nama_pelanggan,
      noKontak: row.no_kontak,
      kanal: row.kanal === 'ONLINE' ? 'Online' : 'Datang Langsung',
      tanggalAcara: mapDate(row.tanggal_acara),
      waktuAcara: dayjs.utc(row.waktu_acara).format('HH:mm'),
      catatan: row.catatan ?? '',
      items: (detailsByOrder.get(row.id_pesanan) ?? []).map((detail) => ({
        produkId: detail.id_produk,
        namaProduk: detail.nama_paket,
        jenisPaket: detail.jenis_paket,
        hargaPerPorsi: Number(detail.harga_satuan),
        jumlahPorsi: detail.jumlah_porsi,
        subtotal: Number(detail.subtotal),
      })),
      totalHarga: Number(row.total_harga),
      dpMinimumNota: Number(row.nominal_dp ?? 0),
      sisaAwalNota: Number(row.sisa_pembayaran ?? 0),
      statusPesanan: ORDER_STATUS[row.status_pesanan] ?? row.status_pesanan,
      statusPembayaran: PAYMENT_STATUS[row.status_pembayaran] ?? row.status_pembayaran,
      stokSudahDipotong: ['MULAI_DIMASAK', 'SEDANG_DIPACKING', 'SIAP_DIAMBIL', 'SELESAI'].includes(row.status_pesanan),
      dibuatPada: toWIB(row.dibuat_pada),
      selesaiPada: historyByOrder.get(row.id_pesanan)?.find((item) => item.status === 'SELESAI')
        ? toWIB(historyByOrder.get(row.id_pesanan)!.find((item) => item.status === 'SELESAI')!.waktu)
        : undefined,
      alasanPembatalan: row.alasan_pembatalan ?? undefined,
      riwayatStatus: (historyByOrder.get(row.id_pesanan) ?? []).map((item) => ({
        status: ORDER_STATUS[item.status] ?? item.status,
        waktuWib: toWIB(item.waktu),
      })),
    }));

    const paymentResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query(`
        SELECT py.id_pembayaran, py.id_pesanan, p.kode_pesanan, py.jenis, py.metode,
               py.nominal, py.bukti_path, py.diunggah_pada, py.status,
               py.alasan_penolakan, py.diverifikasi_pada, verifier.nama_lengkap AS diverifikasi_oleh
        FROM dbo.pembayaran py
        JOIN dbo.pesanan p ON p.id_pesanan = py.id_pesanan
        LEFT JOIN dbo.pengguna verifier ON verifier.id_pengguna = py.diverifikasi_oleh
        WHERE ${isStaff ? '1 = 1' : 'p.id_pelanggan = @userId'}
        ORDER BY py.diunggah_pada DESC, py.id_pembayaran DESC
      `);
    const payments = paymentResult.recordset.map((row) => ({
      id: row.id_pembayaran,
      pesananId: row.id_pesanan,
      kodePesanan: row.kode_pesanan,
      jenis: row.jenis === 'PELUNASAN' ? 'Pelunasan' : 'DP',
      metode: PAYMENT_METHOD[row.metode] ?? row.metode,
      nominal: Number(row.nominal),
      buktiTersedia: Boolean(row.bukti_path),
      buktiNamaFile: row.bukti_path ? String(row.bukti_path).split(/[\\/]/).pop() : undefined,
      waktuUnggah: toWIB(row.diunggah_pada),
      status: PAYMENT_RECORD_STATUS[row.status] ?? row.status,
      alasanPenolakan: row.alasan_penolakan ?? undefined,
      diverifikasiPada: row.diverifikasi_pada ? toWIB(row.diverifikasi_pada) : undefined,
      diverifikasiOleh: row.diverifikasi_oleh ?? undefined,
    }));

    const usersResult = isStaff
      ? await pool.request().query(`
          SELECT id_pengguna, nama_lengkap, username, email, role, aktif
          FROM dbo.pengguna ORDER BY nama_lengkap, id_pengguna
        `)
      : { recordset: [] };
    const users = usersResult.recordset.map((row) => ({
      id: row.id_pengguna,
      idKode: `USR-${String(row.id_pengguna).padStart(4, '0')}`,
      namaLengkap: row.nama_lengkap,
      username: row.username ?? undefined,
      email: row.email,
      role: row.role,
      aktif: Boolean(row.aktif),
    }));

    let operationalSettings = null;
    if (isStaff) {
      const settings = await pool.request().query(`
        SELECT mode FROM dbo.pengaturan_pemesanan WHERE id = 1
      `);
      const schedule = await pool.request().query(`
        SELECT hari, jam_buka, jam_tutup, aktif FROM dbo.jadwal_operasional
        WHERE id_pengaturan = 1
        ORDER BY CASE hari WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3
          WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END
      `);
      if (settings.recordset[0] && schedule.recordset.length === 7) {
        operationalSettings = {
          mode: settings.recordset[0].mode,
          jadwal: schedule.recordset.map((day) => ({
            hari: day.hari,
            aktif: Boolean(day.aktif),
            jamBuka: day.aktif ? dayjs.utc(day.jam_buka).format('HH:mm') : '',
            jamTutup: day.aktif ? dayjs.utc(day.jam_tutup).format('HH:mm') : '',
          })),
        };
      }
    }

    return ok(res, {
      currentUser: {
        id: currentUser.id_pengguna,
        idKode: `USR-${String(currentUser.id_pengguna).padStart(4, '0')}`,
        namaLengkap: currentUser.nama_lengkap,
        username: currentUser.username ?? undefined,
        email: currentUser.email,
        role: currentUser.role,
        aktif: Boolean(currentUser.aktif),
      },
      users,
      products,
      inventory,
      orders,
      payments,
      operationalSettings,
    });
  } catch (error) {
    next(error);
  }
};
