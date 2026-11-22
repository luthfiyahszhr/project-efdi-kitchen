import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Request, RequestHandler } from 'express';
import { getPool, sql, withTransaction } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { dayjs, nowWIB, SQL_NOW_WIB } from '../utils/datetime';
import { ok } from '../utils/response';
import * as logService from '../services/log.service';
import * as paymentService from '../services/pembayaran.service';
import * as inventoryService from '../services/inventaris.service';
import * as cancellationService from '../services/pembatalan.service';
import { readPaymentProof } from './tsd-public.controller';

function endpoint(
  action: (req: Request) => Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (req, res, next) => {
    try {
      return ok(res, await action(req), status);
    } catch (error) {
      next(error);
    }
  };
}

function imageMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  throw new AppError('ERR-SYS-02', 500, 'Format file bukti tidak dikenal');
}

async function removeFile(filename: string): Promise<void> {
  try {
    await fs.unlink(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[UPLOAD] Gagal menghapus file sementara:', error);
    }
  }
}

async function persistProduct(req: Request, create: boolean) {
  const {
    nama_paket,
    jenis_paket,
    deskripsi,
    isi_paket,
    harga_per_porsi,
    aktif,
    komposisi,
  } = req.body;
  const file = req.file;
  const uploadedName = file?.filename ?? null;
  let oldImage: string | null = null;
  try {
    const data = await withTransaction(async (trx) => {
      let id: number;
      if (create) {
        const inserted = await new sql.Request(trx)
          .input('nama', sql.NVarChar(100), nama_paket)
          .input('jenis', sql.NVarChar(50), jenis_paket)
          .input('deskripsi', sql.NVarChar(1000), deskripsi)
          .input('isi', sql.NVarChar(1000), isi_paket)
          .input('harga', sql.Decimal(12, 2), Number(harga_per_porsi))
          .input('foto', sql.NVarChar(255), uploadedName)
          .input('aktif', sql.Bit, aktif)
          .query(`
            INSERT INTO dbo.Produk (nama_paket, jenis_paket, deskripsi, isi_paket, harga_per_porsi, foto_path, aktif)
            OUTPUT INSERTED.id_produk
            VALUES (@nama, @jenis, @deskripsi, @isi, @harga, @foto, @aktif)
          `);
        id = inserted.recordset[0].id_produk;
      } else {
        id = Number(req.params.id_produk);
        const previous = await new sql.Request(trx)
          .input('id', sql.Int, id)
          .query(`SELECT foto_path FROM dbo.Produk WITH (UPDLOCK, ROWLOCK) WHERE id_produk = @id`);
        if (!previous.recordset[0]) throw new AppError('ERR-CAT-03', 404, 'Paket tidak ditemukan');
        oldImage = previous.recordset[0].foto_path;
        await new sql.Request(trx)
          .input('id', sql.Int, id)
          .input('nama', sql.NVarChar(100), nama_paket)
          .input('jenis', sql.NVarChar(50), jenis_paket)
          .input('deskripsi', sql.NVarChar(1000), deskripsi)
          .input('isi', sql.NVarChar(1000), isi_paket)
          .input('harga', sql.Decimal(12, 2), Number(harga_per_porsi))
          .input('foto', sql.NVarChar(255), uploadedName ?? oldImage)
          .input('aktif', sql.Bit, aktif)
          .query(`
            UPDATE dbo.Produk
            SET nama_paket = @nama, jenis_paket = @jenis, deskripsi = @deskripsi,
                isi_paket = @isi, harga_per_porsi = @harga, foto_path = @foto,
                aktif = @aktif, diubah_pada = ${SQL_NOW_WIB}
            WHERE id_produk = @id
          `);
        await new sql.Request(trx)
          .input('id', sql.Int, id)
          .query(`DELETE FROM dbo.KomposisiPaket WHERE id_produk = @id`);
      }

      for (const composition of komposisi as Array<{ id_item: number; jumlah_per_porsi: string }>) {
        const item = await new sql.Request(trx)
          .input('id', sql.Int, composition.id_item)
          .query(`SELECT id_item FROM dbo.ItemInventaris WHERE id_item = @id AND aktif = 1`);
        if (!item.recordset[0]) throw new AppError('ERR-CAT-02', 422, 'Komposisi memakai item inventaris yang tidak tersedia');
        await new sql.Request(trx)
          .input('produk', sql.Int, id)
          .input('item', sql.Int, composition.id_item)
          .input('jumlah', sql.Decimal(10, 3), Number(composition.jumlah_per_porsi))
          .query(`
            INSERT INTO dbo.KomposisiPaket (id_produk, id_item, jumlah_per_porsi)
            VALUES (@produk, @item, @jumlah)
          `);
      }

      await logService.log({
        transaction: trx,
        actorId: req.user!.id,
        aksi: create ? 'PRODUK_DIBUAT' : 'PRODUK_DIPERBARUI',
        entitas: 'Produk',
        entitasId: id,
        dataBaru: { nama_paket, jenis_paket, aktif },
        ip: req.ip,
      });
      return { id_produk: id, aktif };
    });

    if (uploadedName && oldImage && oldImage !== uploadedName) {
      await removeFile(path.resolve(env.upload.dir, path.basename(oldImage)));
    }
    return data;
  } catch (error) {
    if (file) await removeFile(file.path);
    throw error;
  }
}

export const createProduct = endpoint((req) => persistProduct(req, true), 201);
export const updateProduct = endpoint((req) => persistProduct(req, false));

export const setProductActive = endpoint(async (req) => {
  const id = Number(req.params.id_produk);
  const { aktif } = req.body;
  return withTransaction(async (trx) => {
    const product = await new sql.Request(trx)
      .input('id', sql.Int, id)
      .query(`SELECT nama_paket FROM dbo.Produk WITH (UPDLOCK, ROWLOCK) WHERE id_produk = @id`);
    if (!product.recordset[0]) throw new AppError('ERR-CAT-04', 409);
    if (aktif) {
      const composition = await new sql.Request(trx)
        .input('id', sql.Int, id)
        .query(`SELECT TOP 1 id_item FROM dbo.KomposisiPaket WHERE id_produk = @id`);
      if (!composition.recordset[0]) {
        throw new AppError('ERR-CAT-02', 422, `Paket ${product.recordset[0].nama_paket} belum memiliki komposisi bahan`);
      }
    }
    await new sql.Request(trx)
      .input('id', sql.Int, id)
      .input('aktif', sql.Bit, aktif)
      .query(`UPDATE dbo.Produk SET aktif = @aktif, diubah_pada = ${SQL_NOW_WIB} WHERE id_produk = @id`);
    await logService.log({
      transaction: trx,
      actorId: req.user!.id,
      aksi: aktif ? 'PRODUK_DIAKTIFKAN' : 'PRODUK_DINONAKTIFKAN',
      entitas: 'Produk',
      entitasId: id,
      dataBaru: { aktif },
      ip: req.ip,
    });
    return { id_produk: id, aktif };
  });
});

export const searchPayments = endpoint(async (req) => {
  const pool = await getPool();
  const query = pool.request().input('status', sql.VarChar(20), req.body.status);
  let filter = 'py.status = @status';
  if (req.body.id_pesanan !== undefined) {
    query.input('idPesanan', sql.Int, req.body.id_pesanan);
    filter += ' AND py.id_pesanan = @idPesanan';
  }
  const result = await query.query(`
    SELECT py.id_pembayaran, py.id_pesanan, py.jenis, py.metode, py.nominal, py.status,
           py.diunggah_pada, ps.kode_pesanan
    FROM dbo.Pembayaran py
    JOIN dbo.Pesanan ps ON ps.id_pesanan = py.id_pesanan
    WHERE ${filter}
    ORDER BY py.diunggah_pada DESC
  `);
  return {
    pembayaran: result.recordset.map((row) => ({
      ...row,
      nominal: Number(row.nominal).toFixed(2),
    })),
  };
});

export const viewPaymentProof = endpoint(async (req) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, Number(req.params.id_pembayaran))
    .query(`SELECT bukti_path FROM dbo.Pembayaran WHERE id_pembayaran = @id`);
  const storedPath: string | undefined = result.recordset[0]?.bukti_path;
  if (!storedPath) throw new AppError('ERR-ORD-01', 404, 'Bukti pembayaran tidak ditemukan');
  try {
    const image = await readPaymentProof(storedPath);
    return { mime_type: imageMime(storedPath), content_base64: image.toString('base64') };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new AppError('ERR-SYS-02', 500, 'Berkas bukti pembayaran tidak ditemukan di penyimpanan');
    }
    throw error;
  }
});

export const verifyPayment = endpoint(async (req) => {
  const action = req.body.keputusan === 'DITERIMA' ? 'DITERIMA' : 'DITOLAK';
  const result = await paymentService.verify({
    user: req.user!,
    idPembayaran: Number(req.params.id_pembayaran),
    aksi: action,
    catatan: req.body.alasan_penolakan,
    ip: req.ip,
  });
  return result;
});

export const recordCashPayment = endpoint(async (req) => {
  const idPesanan = Number(req.params.id_pesanan);
  const jenis = req.body.jenis as 'DP' | 'PELUNASAN';
  const nominal = Number(req.body.nominal);
  return withTransaction(async (trx) => {
    const result = await new sql.Request(trx)
      .input('id', sql.Int, idPesanan)
      .query(`
        SELECT id_pesanan, kanal, status_pesanan, status_pembayaran, total_harga
        FROM dbo.Pesanan WITH (UPDLOCK, ROWLOCK) WHERE id_pesanan = @id
      `);
    const order = result.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);
    if (order.kanal !== 'DATANG_LANGSUNG') throw new AppError('ERR-PAY-04', 409);
    if (order.status_pesanan === 'DIBATALKAN') throw new AppError('ERR-PAY-06', 409);
    const pending = await new sql.Request(trx)
      .input('id', sql.Int, idPesanan)
      .query(`SELECT TOP 1 id_pembayaran FROM dbo.Pembayaran WHERE id_pesanan = @id AND status = 'MENUNGGU_VERIFIKASI'`);
    if (pending.recordset[0]) throw new AppError('ERR-PAY-01', 409);

    const paid = await new sql.Request(trx)
      .input('id', sql.Int, idPesanan)
      .query(`SELECT ISNULL(SUM(nominal), 0) AS total FROM dbo.Pembayaran WHERE id_pesanan = @id AND status = 'DITERIMA'`);
    const remaining = Math.round((Number(order.total_harga) - Number(paid.recordset[0].total)) * 100) / 100;
    let before: string;
    if (jenis === 'DP') {
      if (order.status_pembayaran !== 'BELUM_BAYAR') throw new AppError('ERR-PAY-01', 409);
      const nota = await new sql.Request(trx)
        .input('id', sql.Int, idPesanan)
        .query(`SELECT nominal_dp FROM dbo.NotaDigital WHERE id_pesanan = @id`);
      if (!nota.recordset[0] || nominal < Number(nota.recordset[0].nominal_dp) || nominal > Number(order.total_harga)) {
        throw new AppError('ERR-PAY-05', 422);
      }
      before = 'BELUM_BAYAR';
    } else {
      if (order.status_pembayaran !== 'DP_DITERIMA') throw new AppError('ERR-PAY-01', 409);
      if (Math.round(nominal * 100) !== Math.round(remaining * 100)) {
        throw new AppError('ERR-PAY-05', 422);
      }
      before = 'DP_DITERIMA';
    }
    const inserted = await new sql.Request(trx)
      .input('id', sql.Int, idPesanan)
      .input('jenis', sql.VarChar(10), jenis)
      .input('nominal', sql.Decimal(14, 2), nominal)
      .input('before', sql.VarChar(25), before)
      .input('user', sql.Int, req.user!.id)
      .query(`
        INSERT INTO dbo.Pembayaran
          (id_pesanan, jenis, metode, nominal, status, status_sebelum_verifikasi, dicatat_oleh, diverifikasi_oleh, diverifikasi_pada)
        OUTPUT INSERTED.id_pembayaran
        VALUES (@id, @jenis, 'TUNAI', @nominal, 'DITERIMA', @before, @user, @user, ${SQL_NOW_WIB})
      `);
    const isPaid = Math.round((Number(paid.recordset[0].total) + nominal) * 100) >= Math.round(Number(order.total_harga) * 100);
    const paymentStatus = isPaid ? 'LUNAS' : 'DP_DITERIMA';
    const promote = jenis === 'DP' && order.status_pesanan === 'MENUNGGU_DP';
    await new sql.Request(trx)
      .input('id', sql.Int, idPesanan)
      .input('paymentStatus', sql.VarChar(25), paymentStatus)
      .input('promote', sql.Bit, promote)
      .query(`
        UPDATE dbo.Pesanan
        SET status_pembayaran = @paymentStatus,
            status_pesanan = CASE WHEN @promote = 1 THEN 'PESANAN_BARU' ELSE status_pesanan END
        WHERE id_pesanan = @id
      `);
    if (promote) {
      await new sql.Request(trx)
        .input('id', sql.Int, idPesanan)
        .input('user', sql.Int, req.user!.id)
        .query(`INSERT INTO dbo.RiwayatStatusPesanan (id_pesanan, status, id_pengguna) VALUES (@id, 'PESANAN_BARU', @user)`);
    }
    const paymentId = inserted.recordset[0].id_pembayaran;
    await logService.log({
      transaction: trx,
      actorId: req.user!.id,
      aksi: 'PEMBAYARAN_TUNAI_DICATAT',
      entitas: 'Pembayaran',
      entitasId: paymentId,
      dataBaru: { id_pesanan: idPesanan, jenis, nominal, status_pembayaran: paymentStatus },
      ip: req.ip,
    });
    return { id_pembayaran: paymentId, status: 'DITERIMA', status_pembayaran: paymentStatus };
  });
}, 201);

export const searchOrders = endpoint(async (req) => {
  const date = req.body.tanggal_acara ?? nowWIB().format('YYYY-MM-DD');
  if (date > nowWIB().format('YYYY-MM-DD')) throw new AppError('ERR-VAL-04', 422);
  const pool = await getPool();
  const query = pool.request().input('tanggal', sql.Date, date);
  let filter = 'tanggal_acara = @tanggal';
  if (req.body.status_pesanan) {
    query.input('status', sql.VarChar(20), req.body.status_pesanan);
    filter += ' AND status_pesanan = @status';
  }
  const result = await query.query(`
    SELECT id_pesanan, kode_pesanan, nama_pelanggan, no_kontak, tanggal_acara, waktu_acara,
           status_pesanan, status_pembayaran, total_harga, kanal
    FROM dbo.Pesanan WHERE ${filter}
    ORDER BY waktu_acara, id_pesanan
  `);
  return {
    pesanan: result.recordset.map((row) => ({
      ...row,
      total_harga: Number(row.total_harga).toFixed(2),
    })),
  };
});

export const updateOrderStatus = endpoint(async (req) => {
  const id = Number(req.params.id_pesanan);
  const nextStatus = req.body.status_baru as string;
  if (nextStatus === 'DIBATALKAN') {
    const pool = await getPool();
    const order = await pool.request().input('id', sql.Int, id)
      .query(`SELECT kode_pesanan FROM dbo.Pesanan WHERE id_pesanan = @id`);
    const code = order.recordset[0]?.kode_pesanan;
    if (!code) throw new AppError('ERR-ORD-01', 404);
    await cancellationService.cancel({
      user: req.user!,
      kode: code,
      alasan: req.body.alasan_pembatalan,
      ip: req.ip,
    });
    return { id_pesanan: id, status_pesanan: 'DIBATALKAN' };
  }
  if (nextStatus === 'MULAI_DIMASAK') {
    const pool = await getPool();
    const order = await pool.request().input('id', sql.Int, id)
      .query(`SELECT kode_pesanan FROM dbo.Pesanan WHERE id_pesanan = @id`);
    const code = order.recordset[0]?.kode_pesanan;
    if (!code) throw new AppError('ERR-ORD-01', 404);
    await inventoryService.consumeStock({ user: req.user!, kode: code, ip: req.ip });
    return { id_pesanan: id, status_pesanan: nextStatus };
  }

  const transitions: Record<string, string> = {
    MULAI_DIMASAK: 'SEDANG_DIPACKING',
    SEDANG_DIPACKING: 'SIAP_DIAMBIL',
    SIAP_DIAMBIL: 'SELESAI',
  };
  return withTransaction(async (trx) => {
    const orderResult = await new sql.Request(trx)
      .input('id', sql.Int, id)
      .query(`SELECT status_pesanan, status_pembayaran FROM dbo.Pesanan WITH (UPDLOCK, ROWLOCK) WHERE id_pesanan = @id`);
    const order = orderResult.recordset[0];
    if (!order) throw new AppError('ERR-ORD-01', 404);
    if (order.status_pembayaran !== 'DP_DITERIMA' && order.status_pembayaran !== 'LUNAS') {
      throw new AppError('ERR-ORD-03', 409);
    }
    if (transitions[order.status_pesanan] !== nextStatus) throw new AppError('ERR-ORD-02', 409);
    await new sql.Request(trx)
      .input('id', sql.Int, id)
      .input('status', sql.VarChar(20), nextStatus)
      .input('user', sql.Int, req.user!.id)
      .query(`
        UPDATE dbo.Pesanan SET status_pesanan = @status WHERE id_pesanan = @id;
        INSERT INTO dbo.RiwayatStatusPesanan (id_pesanan, status, id_pengguna) VALUES (@id, @status, @user);
      `);
    await logService.log({
      transaction: trx,
      actorId: req.user!.id,
      aksi: 'STATUS_PESANAN_DIUBAH',
      entitas: 'Pesanan',
      entitasId: id,
      dataLama: { status_pesanan: order.status_pesanan },
      dataBaru: { status_pesanan: nextStatus },
      ip: req.ip,
    });
    return { id_pesanan: id, status_pesanan: nextStatus };
  });
});

function mapNeeds(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const needed = Number(row.kebutuhan);
    const stock = Number(row.stok);
    return {
      id_item: row.id_item,
      nama_item: row.nama_item,
      satuan: row.satuan,
      kebutuhan: needed.toFixed(3),
      stok: stock.toFixed(3),
      kekurangan: Math.max(0, needed - stock).toFixed(3),
    };
  });
}

export const calculateNeeds = endpoint(async (req) => {
  const date = req.body.tanggal ?? nowWIB().format('YYYY-MM-DD');
  if (date > nowWIB().format('YYYY-MM-DD')) throw new AppError('ERR-VAL-04', 422);
  const pool = await getPool();
  async function needs(status: string) {
    const result = await pool.request()
      .input('tanggal', sql.Date, date)
      .input('status', sql.VarChar(20), status)
      .query(`
        SELECT ii.id_item, ii.nama_item, ii.satuan,
               SUM(kp.jumlah_per_porsi * dp.jumlah_porsi) AS kebutuhan,
               ii.stok_saat_ini AS stok
        FROM dbo.Pesanan ps
        JOIN dbo.DetailPesanan dp ON dp.id_pesanan = ps.id_pesanan
        JOIN dbo.KomposisiPaket kp ON kp.id_produk = dp.id_produk
        JOIN dbo.ItemInventaris ii ON ii.id_item = kp.id_item
        WHERE ps.tanggal_acara = @tanggal AND ps.status_pesanan = @status
        GROUP BY ii.id_item, ii.nama_item, ii.satuan, ii.stok_saat_ini
        ORDER BY ii.nama_item
      `);
    return mapNeeds(result.recordset);
  }
  const [active, potential] = await Promise.all([needs('PESANAN_BARU'), needs('MENUNGGU_DP')]);
  return { waktu_dihitung: nowWIB().format(), kebutuhan: active, potensi_kebutuhan: potential };
});

export const openStockInput = endpoint(async (req) => {
  await logService.log({
    actorId: req.user!.id,
    aksi: 'BUKA_KELOLA_STOK',
    entitas: 'ItemInventaris',
    ip: req.ip,
  });
  return { redirect: '/admin/stok' };
});

export const searchInventory = endpoint(async (req) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('keyword', sql.NVarChar(100), `%${req.body.kata_kunci}%`)
    .query(`
      SELECT id_item, nama_item, jenis AS tipe, satuan, stok_saat_ini, batas_minimum,
             CASE WHEN batas_minimum IS NULL OR stok_saat_ini <= batas_minimum THEN 'ERR-STK-05' ELSE NULL END AS info
      FROM dbo.ItemInventaris
      WHERE aktif = 1 AND nama_item LIKE @keyword
      ORDER BY nama_item
    `);
  return {
    item: result.recordset.map((row) => ({
      ...row,
      stok_saat_ini: Number(row.stok_saat_ini).toFixed(3),
      batas_minimum: row.batas_minimum === null ? null : Number(row.batas_minimum).toFixed(3),
    })),
  };
});

export const createInventoryItem = endpoint(async (req) => {
  const { nama_item, tipe, satuan, stok_awal, batas_minimum } = req.body;
  const stock = Number(stok_awal);
  return withTransaction(async (trx) => {
    const inserted = await new sql.Request(trx)
      .input('name', sql.NVarChar(100), nama_item)
      .input('type', sql.VarChar(15), tipe)
      .input('unit', sql.VarChar(10), satuan)
      .input('stock', sql.Decimal(12, 3), stock)
      .input('minimum', sql.Decimal(12, 3), batas_minimum === null ? null : Number(batas_minimum))
      .query(`
        INSERT INTO dbo.ItemInventaris (nama_item, jenis, satuan, stok_saat_ini, batas_minimum, aktif)
        OUTPUT INSERTED.id_item
        VALUES (@name, @type, @unit, @stock, @minimum, 1)
      `);
    const id = inserted.recordset[0].id_item as number;
    if (stock > 0) {
      await new sql.Request(trx)
        .input('id', sql.Int, id)
        .input('stock', sql.Decimal(12, 3), stock)
        .input('user', sql.Int, req.user!.id)
        .query(`
          INSERT INTO dbo.MutasiStok (id_item, jenis, jumlah, stok_sebelum, stok_sesudah, keterangan, id_pengguna)
          VALUES (@id, 'PENAMBAHAN', @stock, 0, @stock, 'Stok awal item', @user)
        `);
    }
    await logService.log({
      transaction: trx,
      actorId: req.user!.id,
      aksi: 'ITEM_INVENTARIS_DIBUAT',
      entitas: 'ItemInventaris',
      entitasId: id,
      dataBaru: { nama_item, tipe, satuan, stok_awal: stock, batas_minimum },
      ip: req.ip,
    });
    return { id_item: id, stok_saat_ini: stock.toFixed(3) };
  });
}, 201);

export const mutateInventory = endpoint(async (req) => {
  const id = Number(req.params.id_item);
  const { jenis_koreksi, jumlah, keterangan } = req.body;
  const amount = Number(jumlah);
  return withTransaction(async (trx) => {
    const result = await new sql.Request(trx)
      .input('id', sql.Int, id)
      .query(`SELECT stok_saat_ini FROM dbo.ItemInventaris WITH (UPDLOCK, ROWLOCK) WHERE id_item = @id AND aktif = 1`);
    if (!result.recordset[0]) throw new AppError('ERR-STK-02', 404);
    const before = Number(result.recordset[0].stok_saat_ini);
    let after: number;
    let mutation: string;
    let quantity: number;
    if (jenis_koreksi === 'TAMBAH') {
      after = before + amount;
      mutation = 'PENAMBAHAN';
      quantity = amount;
    } else if (jenis_koreksi === 'KURANG') {
      if (amount > before) throw new AppError('ERR-STK-04', 409, 'Stok tidak mencukupi untuk pengurangan');
      after = before - amount;
      mutation = 'PENGURANGAN_MANUAL';
      quantity = amount;
    } else {
      after = amount;
      mutation = 'KOREKSI';
      quantity = Math.abs(after - before);
    }
    after = Math.round(after * 1000) / 1000;
    quantity = Math.round(quantity * 1000) / 1000;
    if (quantity > 0) {
      await new sql.Request(trx)
        .input('id', sql.Int, id)
        .input('quantity', sql.Decimal(12, 3), quantity)
        .input('before', sql.Decimal(12, 3), before)
        .input('after', sql.Decimal(12, 3), after)
        .input('type', sql.VarChar(25), mutation)
        .input('note', sql.NVarChar(255), keterangan ?? `Mutasi stok ${jenis_koreksi}`)
        .input('user', sql.Int, req.user!.id)
        .query(`
          INSERT INTO dbo.MutasiStok (id_item, jenis, jumlah, stok_sebelum, stok_sesudah, keterangan, id_pengguna)
          VALUES (@id, @type, @quantity, @before, @after, @note, @user);
          UPDATE dbo.ItemInventaris SET stok_saat_ini = @after WHERE id_item = @id;
        `);
      await logService.log({
        transaction: trx,
        actorId: req.user!.id,
        aksi: 'STOK_DIMUTASI',
        entitas: 'ItemInventaris',
        entitasId: id,
        dataLama: { stok_saat_ini: before },
        dataBaru: { stok_saat_ini: after, jenis_koreksi, keterangan: keterangan ?? null },
        ip: req.ip,
      });
    }
    return { id_item: id, stok_saat_ini: after.toFixed(3) };
  });
});

export const setMinimumStock = endpoint(async (req) => {
  const id = Number(req.params.id_item);
  const minimum = req.body.batas_minimum === null ? null : Number(req.body.batas_minimum);
  return withTransaction(async (trx) => {
    const previous = await new sql.Request(trx)
      .input('id', sql.Int, id)
      .query(`SELECT batas_minimum, stok_saat_ini FROM dbo.ItemInventaris WITH (UPDLOCK, ROWLOCK) WHERE id_item = @id`);
    const item = previous.recordset[0];
    if (!item) throw new AppError('ERR-STK-02', 404);
    await new sql.Request(trx)
      .input('id', sql.Int, id)
      .input('minimum', sql.Decimal(12, 3), minimum)
      .query(`UPDATE dbo.ItemInventaris SET batas_minimum = @minimum WHERE id_item = @id`);
    await logService.log({
      transaction: trx,
      actorId: req.user!.id,
      aksi: 'BATAS_MINIMUM_DIUBAH',
      entitas: 'ItemInventaris',
      entitasId: id,
      dataLama: { batas_minimum: item.batas_minimum },
      dataBaru: { batas_minimum: minimum },
      ip: req.ip,
    });
    return {
      id_item: id,
      batas_minimum: minimum === null ? null : minimum.toFixed(3),
      info: minimum === null || Number(item.stok_saat_ini) <= minimum ? 'ERR-STK-05' : null,
    };
  });
});

export const saveOperationalSettings = endpoint(async (req) => {
  const { mode_pemesanan, jadwal } = req.body;
  return withTransaction(async (trx) => {
    await new sql.Request(trx)
      .input('mode', sql.VarChar(15), mode_pemesanan)
      .input('user', sql.Int, req.user!.id)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.PengaturanPemesanan WHERE id_pengaturan = 1)
          UPDATE dbo.PengaturanPemesanan SET mode = @mode, diubah_oleh = @user, diubah_pada = ${SQL_NOW_WIB} WHERE id_pengaturan = 1;
        ELSE
          INSERT INTO dbo.PengaturanPemesanan (id_pengaturan, mode, diubah_oleh) VALUES (1, @mode, @user);
      `);
    await new sql.Request(trx).query(`DELETE FROM dbo.JadwalOperasional WHERE id_pengaturan = 1`);
    for (const day of jadwal as Array<{ hari: string; aktif: boolean; jam_buka: string | null; jam_tutup: string | null }>) {
      await new sql.Request(trx)
        .input('hari', sql.VarChar(6), day.hari)
        .input('buka', sql.VarChar(5), day.jam_buka ?? '00:00')
        .input('tutup', sql.VarChar(5), day.jam_tutup ?? '00:00')
        .input('aktif', sql.Bit, day.aktif)
        .query(`
          INSERT INTO dbo.JadwalOperasional (hari, id_pengaturan, jam_buka, jam_tutup, aktif)
          VALUES (@hari, 1, CAST(@buka AS TIME(0)), CAST(@tutup AS TIME(0)), @aktif)
        `);
    }
    await logService.log({
      transaction: trx,
      actorId: req.user!.id,
      aksi: 'PENGATURAN_OPERASIONAL_DIUBAH',
      entitas: 'PengaturanPemesanan',
      entitasId: 1,
      dataBaru: { mode_pemesanan, jadwal },
      ip: req.ip,
    });
    const status = operationalStatusInTransaction(mode_pemesanan, jadwal);
    return { mode_pemesanan, status };
  });
});

async function operationalStatusInTransaction(
  mode: string,
  schedule: Array<{ hari: string; aktif: boolean; jam_buka: string | null; jam_tutup: string | null }>,
) {
  if (mode === 'DIBUKA_MANUAL') return 'BUKA';
  if (mode === 'DITUTUP_MANUAL') return 'TUTUP';
  const today = nowWIB().format('dddd');
  const names: Record<string, string> = {
    Monday: 'Senin', Tuesday: 'Selasa', Wednesday: 'Rabu', Thursday: 'Kamis',
    Friday: 'Jumat', Saturday: 'Sabtu', Sunday: 'Minggu',
  };
  const todaysSchedule = schedule.find((day) => day.hari === names[today]);
  const time = nowWIB().format('HH:mm');
  return todaysSchedule?.aktif && todaysSchedule.jam_buka !== null && todaysSchedule.jam_tutup !== null &&
    time >= todaysSchedule.jam_buka && time < todaysSchedule.jam_tutup ? 'BUKA' : 'TUTUP';
}

export const operationalDetail = endpoint(async () => {
  const pool = await getPool();
  const [settings, schedule] = await Promise.all([
    pool.request().query(`SELECT mode FROM dbo.PengaturanPemesanan WHERE id_pengaturan = 1`),
    pool.request().query(`
      SELECT hari, jam_buka, jam_tutup, aktif FROM dbo.JadwalOperasional
      WHERE id_pengaturan = 1 ORDER BY CASE hari WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2
        WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END
    `),
  ]);
  if (!settings.recordset[0] || schedule.recordset.length !== 7) throw new AppError('ERR-OPS-02', 503);
  return {
    mode_pemesanan: settings.recordset[0].mode,
    jadwal: schedule.recordset.map((day) => ({
      hari: day.hari,
      aktif: day.aktif,
      jam_buka: day.aktif ? dayjs.utc(day.jam_buka).format('HH:mm') : null,
      jam_tutup: day.aktif ? dayjs.utc(day.jam_tutup).format('HH:mm') : null,
    })),
  };
});

export const financeReport = endpoint(async (req) => {
  const currentDate = nowWIB().format('YYYY-MM-DD');
  let start: string;
  let endExclusive: string;
  if (req.body.periode === 'HARIAN') {
    if (req.body.tanggal > currentDate) throw new AppError('ERR-VAL-04', 422);
    start = req.body.tanggal;
    const nextDay = new Date(`${start}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    endExclusive = nextDay.toISOString().slice(0, 10);
  } else {
    const month = req.body.bulan as string;
    if (month > currentDate.slice(0, 7)) throw new AppError('ERR-VAL-04', 422);
    start = `${month}-01`;
    const [year, monthNumber] = month.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
    endExclusive = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }
  const pool = await getPool();
  const result = await pool.request()
    .input('start', sql.Date, start)
    .input('end', sql.Date, endExclusive)
    .query(`
      SELECT ps.id_pesanan, ps.status_pesanan, ps.status_pembayaran, ps.total_harga,
             ISNULL(pay.diterima, 0) AS diterima
      FROM dbo.Pesanan ps
      OUTER APPLY (
        SELECT SUM(p.nominal) AS diterima
        FROM dbo.Pembayaran p
        WHERE p.id_pesanan = ps.id_pesanan AND p.status = 'DITERIMA'
      ) pay
      WHERE ps.dibuat_pada >= @start
        AND ps.dibuat_pada < @end
      ORDER BY ps.dibuat_pada, ps.id_pesanan
    `);
  const rows = result.recordset as Array<{
    id_pesanan: number;
    status_pesanan: string;
    status_pembayaran: string;
    total_harga: number;
    diterima: number;
  }>;
  const totalSales = rows.reduce((sum, row) => sum + (row.status_pesanan === 'DIBATALKAN' ? 0 : Number(row.total_harga)), 0);
  const totalReceived = rows.reduce((sum, row) => sum + Number(row.diterima), 0);
  const totalReceivable = rows.reduce((sum, row) => sum + (
    row.status_pesanan === 'DIBATALKAN' ? 0 : Math.max(0, Number(row.total_harga) - Number(row.diterima))
  ), 0);
  return {
    jumlah_pesanan: rows.length,
    total_penjualan: totalSales.toFixed(2),
    total_diterima: totalReceived.toFixed(2),
    total_piutang: totalReceivable.toFixed(2),
    pesanan: rows.map(({ id_pesanan, status_pembayaran }) => ({ id_pesanan, status_pembayaran })),
  };
});

export const searchCustomers = endpoint(async (req) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('keyword', sql.NVarChar(100), `%${req.body.kata_kunci}%`)
    .query(`
      SELECT id_pengguna, nama_lengkap, email, aktif
      FROM dbo.Pengguna
      WHERE role = 'Customer' AND (nama_lengkap LIKE @keyword OR email LIKE @keyword)
      ORDER BY nama_lengkap
    `);
  return { customer: result.recordset };
});

export const resetCustomerPassword: RequestHandler = async (req, res, next) => {
  try {
    const temporaryPassword = `Efdi${crypto.randomBytes(9).toString('base64url')}9`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const id = Number(req.params.id_pengguna);
    const result = await withTransaction(async (trx) => {
      const customer = await new sql.Request(trx)
        .input('id', sql.Int, id)
        .input('email', sql.NVarChar(100), String(req.body.email_customer).toLowerCase())
        .query(`
          SELECT id_pengguna FROM dbo.Pengguna WITH (UPDLOCK, ROWLOCK)
          WHERE id_pengguna = @id AND LOWER(email) = @email AND role = 'Customer' AND aktif = 1
        `);
      if (!customer.recordset[0]) throw new AppError('ERR-CUST-01', 404);
      await new sql.Request(trx)
        .input('id', sql.Int, id)
        .input('hash', sql.NVarChar(255), passwordHash)
        .query(`
          UPDATE dbo.Pengguna
          SET password_hash = @hash, jumlah_gagal = 0, terkunci_sampai = NULL
          WHERE id_pengguna = @id
        `);
      await logService.log({
        transaction: trx,
        actorId: req.user!.id,
        aksi: 'RESET_PASSWORD',
        entitas: 'Pengguna',
        entitasId: id,
        ip: req.ip,
      });
      return { id_pengguna: id };
    });
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { ...result, password_sementara: temporaryPassword });
  } catch (error) {
    next(error);
  }
};
