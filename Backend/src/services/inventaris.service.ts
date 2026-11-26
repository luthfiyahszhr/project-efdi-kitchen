import { getPool, sql, withTransaction } from '../config/database';
import { AppError } from '../utils/errors';
import type { AuthUser } from '../types/express';
import * as logSvc from './log.service';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export async function list() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT id_item, nama_item, tipe, satuan, stok_saat_ini, batas_minimum, aktif, diubah_pada,
           CASE WHEN aktif = 1 AND stok_saat_ini <= batas_minimum THEN 1 ELSE 0 END AS menipis
    FROM dbo.item_inventaris
    ORDER BY nama_item
  `);
  return r.recordset;
}

/**
 * Set stok ke nilai absolut (stok opname). Dicatat sebagai mutasi KOREKSI.
 * Catatan: tabel ItemInventaris punya trigger UPDATE, sehingga UPDATE ... OUTPUT tidak boleh dipakai.
 */
export async function updateStock({
  user, idItem, stokBaru, keterangan, ip,
}: { user: AuthUser; idItem: number; stokBaru: number; keterangan: string; ip?: string }) {
  return withTransaction(async (trx) => {
    const r = await new sql.Request(trx)
      .input('id', sql.Int, idItem)
      .query(`
        SELECT stok_saat_ini FROM dbo.item_inventaris WITH (UPDLOCK, ROWLOCK) WHERE id_item = @id
      `);
    if (!r.recordset[0]) throw new AppError('ERR-STK-02', 404);

    const sebelum = round3(Number(r.recordset[0].stok_saat_ini));
    const sesudah = round3(stokBaru);
    const selisih = round3(Math.abs(sesudah - sebelum));

    if (selisih > 0) {
      await new sql.Request(trx)
        .input('id', sql.Int, idItem)
        .input('jumlah', sql.Decimal(12, 3), selisih)
        .input('sebelum', sql.Decimal(12, 3), sebelum)
        .input('sesudah', sql.Decimal(12, 3), sesudah)
        .input('ket', sql.NVarChar(255), keterangan)
        .input('by', sql.Int, user.id)
        .query(`
          INSERT INTO dbo.mutasi_stok (id_item, jenis, jumlah, stok_sebelum, stok_sesudah, keterangan, id_pengguna)
          VALUES (@id, 'KOREKSI', @jumlah, @sebelum, @sesudah, @ket, @by);

          UPDATE dbo.item_inventaris SET stok_saat_ini = @sesudah WHERE id_item = @id;
        `);

      await logSvc.log({
        transaction: trx,
        actorId: user.id,
        aksi: 'STOK_DIKOREKSI',
        entitas: 'ItemInventaris',
        entitasId: idItem,
        dataLama: { stok_saat_ini: sebelum },
        dataBaru: { stok_saat_ini: sesudah, keterangan },
        ip,
      });
    }

    const after = await new sql.Request(trx)
      .input('id', sql.Int, idItem)
      .query(`SELECT * FROM dbo.item_inventaris WHERE id_item = @id`);
    return after.recordset[0];
  });
}

export async function productionNeeds(kode: string) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('kode', sql.NVarChar(10), kode)
    .query(`
      SELECT ii.id_item, ii.nama_item, ii.satuan,
             SUM(kp.jumlah_per_porsi * dp.jumlah_porsi) AS total_kebutuhan,
             ii.stok_saat_ini AS stok_tersedia,
             CASE WHEN ii.stok_saat_ini < SUM(kp.jumlah_per_porsi * dp.jumlah_porsi) THEN 1 ELSE 0 END AS kurang
      FROM dbo.pesanan o
      JOIN dbo.detail_pesanan dp ON dp.id_pesanan = o.id_pesanan
      JOIN dbo.komposisi_paket kp ON kp.id_produk = dp.id_produk
      JOIN dbo.item_inventaris ii ON ii.id_item = kp.id_item
      WHERE o.kode_pesanan = @kode
      GROUP BY ii.id_item, ii.nama_item, ii.satuan, ii.stok_saat_ini
      ORDER BY ii.nama_item
    `);
  return r.recordset;
}

/**
 * Mulai produksi: potong stok sesuai komposisi, catat MutasiStok PENGURANGAN_PRODUKSI,
 * ubah status pesanan PESANAN_BARU -> MULAI_DIMASAK. Semua dalam satu transaksi.
 * Catatan: produk tanpa KomposisiPaket tidak memotong stok apa pun.
 */
export async function consumeStock({ user, kode, ip }: { user: AuthUser; kode: string; ip?: string }) {
  return withTransaction(async (trx) => {
    const ord = await new sql.Request(trx)
      .input('kode', sql.NVarChar(10), kode)
      .query(`
        SELECT id_pesanan, status_pesanan, status_pembayaran
        FROM dbo.pesanan WITH (UPDLOCK, ROWLOCK) WHERE kode_pesanan = @kode
      `);
    const o = ord.recordset[0];
    if (!o) throw new AppError('ERR-ORD-01', 404);
    if (o.status_pesanan === 'DIBATALKAN') throw new AppError('ERR-PAY-06', 409);
    if (!['DP_DITERIMA', 'LUNAS'].includes(o.status_pembayaran)) {
      throw new AppError('ERR-ORD-03', 409);
    }
    if (o.status_pesanan !== 'PESANAN_BARU') {
      throw new AppError('ERR-ORD-03', 409, 'Produksi hanya dapat dimulai dari status PESANAN_BARU');
    }

    const needsResult = await new sql.Request(trx)
      .input('id', sql.Int, o.id_pesanan)
      .query(`
        SELECT kp.id_item, SUM(kp.jumlah_per_porsi * dp.jumlah_porsi) AS total_kebutuhan
        FROM dbo.detail_pesanan dp
        JOIN dbo.komposisi_paket kp ON kp.id_produk = dp.id_produk
        WHERE dp.id_pesanan = @id
        GROUP BY kp.id_item
        ORDER BY kp.id_item
      `);

    const needs: Array<{
      id_item: number;
      nama_item: string;
      satuan: string;
      stok_saat_ini: number;
      total_kebutuhan: number;
    }> = [];
    for (const item of needsResult.recordset) {
      const stock = await new sql.Request(trx)
        .input('id', sql.Int, item.id_item)
        .query(`
          SELECT id_item, nama_item, satuan, stok_saat_ini
          FROM dbo.item_inventaris WITH (UPDLOCK, ROWLOCK)
          WHERE id_item = @id
        `);
      if (!stock.recordset[0]) throw new AppError('ERR-STK-02', 404);
      needs.push({
        ...stock.recordset[0],
        id_item: item.id_item,
        total_kebutuhan: item.total_kebutuhan,
      });
    }

    const kurang = needs.filter((n) => round3(Number(n.stok_saat_ini)) < round3(Number(n.total_kebutuhan)));
    if (kurang.length > 0) {
      const daftar = kurang
        .map((n) => `${n.nama_item} (butuh ${round3(Number(n.total_kebutuhan))} ${n.satuan}, tersedia ${round3(Number(n.stok_saat_ini))})`)
        .join('; ');
      throw new AppError('ERR-STK-01', 409, `Stok tidak mencukupi: ${daftar}`);
    }

    for (const n of needs) {
      const jumlah = round3(Number(n.total_kebutuhan));
      const sebelum = round3(Number(n.stok_saat_ini));
      await new sql.Request(trx)
        .input('item', sql.Int, n.id_item)
        .input('jumlah', sql.Decimal(12, 3), jumlah)
        .input('sebelum', sql.Decimal(12, 3), sebelum)
        .input('sesudah', sql.Decimal(12, 3), round3(sebelum - jumlah))
        .input('idPesanan', sql.Int, o.id_pesanan)
        .input('ket', sql.NVarChar(255), `Produksi pesanan ${kode}`)
        .input('by', sql.Int, user.id)
        .query(`
          INSERT INTO dbo.mutasi_stok (id_item, jenis, jumlah, stok_sebelum, stok_sesudah, id_pesanan, keterangan, id_pengguna)
          VALUES (@item, 'PENGURANGAN_PRODUKSI', @jumlah, @sebelum, @sesudah, @idPesanan, @ket, @by);

          UPDATE dbo.item_inventaris SET stok_saat_ini = @sesudah WHERE id_item = @item;
        `);
    }

    await new sql.Request(trx)
      .input('idPesanan', sql.Int, o.id_pesanan)
      .input('by', sql.Int, user.id)
      .query(`
        UPDATE dbo.pesanan SET status_pesanan = 'MULAI_DIMASAK' WHERE id_pesanan = @idPesanan;
        INSERT INTO dbo.riwayat_status_pesanan (id_pesanan, status, id_pengguna)
        VALUES (@idPesanan, 'MULAI_DIMASAK', @by);
      `);

    await logSvc.log({
      transaction: trx,
      actorId: user.id,
      aksi: 'PRODUKSI_DIMULAI',
      entitas: 'Pesanan',
      entitasId: o.id_pesanan,
      dataLama: { status_pesanan: 'PESANAN_BARU' },
      dataBaru: { status_pesanan: 'MULAI_DIMASAK', item_dikurangi: needs.length },
      ip,
    });

    return { kode_pesanan: kode, status_pesanan: 'MULAI_DIMASAK', item_dikurangi: needs.length };
  });
}
