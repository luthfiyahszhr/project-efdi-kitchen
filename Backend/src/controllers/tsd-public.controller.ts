import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { Request, RequestHandler } from 'express';
import { dayjs, toWIB } from '../utils/datetime';
import { getPool, sql } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { nowWIB } from '../utils/datetime';
import { ok } from '../utils/response';
import * as orderService from '../services/pesanan.service';
import * as paymentService from '../services/pembayaran.service';
import * as cancellationService from '../services/pembatalan.service';
import * as operationalService from '../services/operasional.service';

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

export const catalogSearch = endpoint(async (req) => {
  const { kata_kunci, jenis_paket, harga_min, harga_max } = req.body;
  const pool = await getPool();
  const query = pool.request();
  query.input('keyword', sql.NVarChar(100), `%${kata_kunci}%`);
  const conditions = ['aktif = 1', '(nama_paket LIKE @keyword OR isi_paket LIKE @keyword)'];
  if (jenis_paket) {
    query.input('jenis', sql.NVarChar(50), jenis_paket);
    conditions.push('jenis_paket = @jenis');
  }
  if (harga_min !== undefined) {
    query.input('hargaMin', sql.Decimal(12, 2), Number(harga_min));
    conditions.push('harga_per_porsi >= @hargaMin');
  }
  if (harga_max !== undefined) {
    query.input('hargaMax', sql.Decimal(12, 2), Number(harga_max));
    conditions.push('harga_per_porsi <= @hargaMax');
  }
  const result = await query.query(`
    SELECT id_produk, nama_paket, jenis_paket, deskripsi, isi_paket, harga_per_porsi,
           CASE WHEN foto_path IS NULL THEN NULL ELSE CONCAT('/media/produk/', id_produk) END AS foto_url
    FROM dbo.produk
    WHERE ${conditions.join(' AND ')}
    ORDER BY nama_paket
  `);
  return {
    produk: result.recordset.map((row) => ({
      id_produk: row.id_produk,
      nama_paket: row.nama_paket,
      jenis_paket: row.jenis_paket,
      deskripsi: row.deskripsi,
      isi_paket: row.isi_paket,
      harga_per_porsi: Number(row.harga_per_porsi).toFixed(2),
      foto_url: row.foto_url,
    })),
    ...(result.recordset.length === 0 ? { info: 'ERR-CAT-01' } : {}),
  };
});

export const catalogDetail = endpoint(async (req) => {
  const id = Number(req.params.id_produk);
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT id_produk, nama_paket, jenis_paket, deskripsi, isi_paket, harga_per_porsi,
             CASE WHEN foto_path IS NULL THEN NULL ELSE CONCAT('/media/produk/', id_produk) END AS foto_url,
             aktif
      FROM dbo.produk
      WHERE id_produk = @id AND aktif = 1
    `);
  if (!result.recordset[0]) throw new AppError('ERR-CAT-04', 409, 'Paket tidak tersedia, pilih paket lain');
  const product = result.recordset[0];
  return { ...product, harga_per_porsi: Number(product.harga_per_porsi).toFixed(2) };
});

export const operationalStatus = endpoint(async () => {
  const result = await operationalService.cekStatus();
  return { ...result, waktu_server: nowWIB().format() };
});

export const createOrder = endpoint(async (req) => {
  const user = req.user!;
  const expectedChannel = user.role === 'Customer' ? 'ONLINE' : 'DATANG_LANGSUNG';
  if (req.body.kanal !== expectedChannel) {
    throw new AppError('ERR-VAL-06', 422, 'Kanal pesanan tidak sesuai dengan role pengguna');
  }
  const data = await orderService.create({ user, payload: req.body, ip: req.ip });
  return data;
}, 201);

export const uploadPayment = endpoint(async (req) => {
  if (!req.file) throw new AppError('ERR-VAL-05', 422, 'File bukti wajib diunggah');
  const pool = await getPool();
  const orderResult = await pool.request()
    .input('id', sql.Int, Number(req.params.id_pesanan))
    .query(`SELECT kode_pesanan FROM dbo.pesanan WHERE id_pesanan = @id`);
  const kode = orderResult.recordset[0]?.kode_pesanan;
  if (!kode) throw new AppError('ERR-ORD-01', 404);

  const result = await paymentService.uploadBukti({
    user: req.user!,
    kode,
    body: req.body,
    file: req.file,
    ip: req.ip,
  });
  return {
    id_pembayaran: result.id_pembayaran,
    status: result.status,
    status_pembayaran: result.status_pembayaran_pesanan,
  };
}, 201);

async function findOrder(req: Request) {
  const user = req.user!;
  const isCustomer = user.role === 'Customer';
  const pool = await getPool();
  const request = pool.request();
  let where: string;
  if (isCustomer) {
    const { kode_pesanan, no_kontak } = req.body;
    request.input('kode', sql.NVarChar(10), kode_pesanan);
    request.input('kontak', sql.NVarChar(20), no_kontak);
    request.input('userId', sql.Int, user.id);
    where = 'p.kode_pesanan = @kode AND p.no_kontak = @kontak AND p.id_pelanggan = @userId';
  } else {
    request.input('id', sql.Int, Number(req.body.id_pesanan));
    where = 'p.id_pesanan = @id';
  }
  const result = await request.query(`
    SELECT p.id_pesanan, p.kode_pesanan, p.nama_pelanggan, p.no_kontak, p.id_pelanggan,
           p.tanggal_acara, p.waktu_acara, p.status_pesanan, p.status_pembayaran, p.total_harga,
           n.nomor_nota, n.total_tagihan, n.nominal_dp, n.sisa_pembayaran
    FROM dbo.pesanan p
    LEFT JOIN dbo.nota_digital n ON n.id_pesanan = p.id_pesanan
    WHERE ${where}
  `);
  const order = result.recordset[0];
  if (!order) throw new AppError('ERR-ORD-01', 404);
  return { pool, order };
}

async function orderStatusData(req: Request) {
  const { pool, order } = await findOrder(req);
  const [history, balance] = await Promise.all([
    pool.request().input('id', sql.Int, order.id_pesanan).query(`
      SELECT status, waktu FROM dbo.riwayat_status_pesanan
      WHERE id_pesanan = @id ORDER BY waktu, id_riwayat
    `),
    pool.request().input('id', sql.Int, order.id_pesanan).query(`
      SELECT o.total_harga - ISNULL(SUM(CASE WHEN p.status = 'DITERIMA' THEN p.nominal ELSE 0 END), 0) AS sisa
      FROM dbo.pesanan o
      LEFT JOIN dbo.pembayaran p ON p.id_pesanan = o.id_pesanan
      WHERE o.id_pesanan = @id
      GROUP BY o.total_harga
    `),
  ]);
  return {
    id_pesanan: order.id_pesanan,
    status_pesanan: order.status_pesanan,
    status_pembayaran: order.status_pembayaran,
    sisa_pembayaran: Number(balance.recordset[0]?.sisa ?? order.total_harga).toFixed(2),
    riwayat_status: history.recordset.map((entry) => ({
      ...entry,
      waktu: toWIB(entry.waktu),
    })),
  };
}

export const orderStatus = endpoint(orderStatusData);

async function createNotaPdf(req: Request): Promise<{ nomor_nota: string; filename: string; mime_type: string; content_base64: string }> {
  const { pool, order } = await findOrder(req);
  const nota = await pool.request()
    .input('id', sql.Int, order.id_pesanan)
    .query(`
      SELECT nomor_nota, total_tagihan, nominal_dp, sisa_pembayaran
      FROM dbo.nota_digital WHERE id_pesanan = @id
    `);
  const note = nota.recordset[0];
  if (!note) throw new AppError('ERR-SYS-02', 500, 'Nota digital belum tersedia');
  const detail = await pool.request()
    .input('id', sql.Int, order.id_pesanan)
    .query(`
      SELECT pr.nama_paket, dp.jumlah_porsi, dp.harga_satuan, dp.subtotal
      FROM dbo.detail_pesanan dp
      JOIN dbo.produk pr ON pr.id_produk = dp.id_produk
      WHERE dp.id_pesanan = @id
    `);

  const document = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  const pdf = new Promise<Buffer>((resolve, reject) => {
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });
  document.fontSize(18).text('Efdi Kitchen', { align: 'center' });
  document.moveDown().fontSize(13).text(`Nota: ${note.nomor_nota}`);
  document.fontSize(10)
    .text(`Kode pesanan: ${order.kode_pesanan}`)
    .text(`Nama pelanggan: ${order.nama_pelanggan}`)
    .text(`Tanggal acara: ${dayjs.utc(order.tanggal_acara).format('YYYY-MM-DD')} ${dayjs.utc(order.waktu_acara).format('HH:mm')}`)
    .text(`Status pembayaran: ${order.status_pembayaran}`);
  document.moveDown().text('Rincian pesanan:');
  for (const row of detail.recordset) {
    document.text(`${row.nama_paket} - ${row.jumlah_porsi} porsi x Rp${row.harga_satuan} = Rp${row.subtotal}`);
  }
  document.moveDown()
    .text(`Total tagihan: Rp${note.total_tagihan}`)
    .text(`Nominal DP: Rp${note.nominal_dp}`)
    .text(`Sisa pembayaran: Rp${note.sisa_pembayaran}`);
  document.end();
  const content = await pdf;
  return {
    nomor_nota: note.nomor_nota,
    filename: `${note.nomor_nota}.pdf`,
    mime_type: 'application/pdf',
    content_base64: content.toString('base64'),
  };
}

export const downloadNota = endpoint(createNotaPdf);

export const cancelOrder = endpoint(async (req) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, Number(req.params.id_pesanan))
    .query(`SELECT kode_pesanan FROM dbo.pesanan WHERE id_pesanan = @id`);
  const kode = result.recordset[0]?.kode_pesanan;
  if (!kode) throw new AppError('ERR-ORD-01', 404);
  return cancellationService.cancel({
    user: req.user!,
    kode,
    alasan: req.body.alasan_pembatalan,
    ip: req.ip,
  });
}, 200);

export const serveProductImage: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id_produk);
    if (!Number.isInteger(id) || id < 1) throw new AppError('ERR-CAT-04', 404);
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT foto_path FROM dbo.produk WHERE id_produk = @id AND aktif = 1`);
    const storedName = result.recordset[0]?.foto_path;
    if (typeof storedName !== 'string' || !storedName) throw new AppError('ERR-CAT-04', 404);
    const filename = path.basename(storedName);
    const filePath = path.resolve(env.upload.dir, filename);
    if (!filePath.startsWith(path.resolve(env.upload.dir) + path.sep)) throw new AppError('ERR-CAT-04', 404);
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
};

export const paymentProofImagePath = (storedPath: string) => path.resolve(env.upload.dir, path.basename(storedPath));
export const readPaymentProof = (storedPath: string) => fs.readFile(paymentProofImagePath(storedPath));
