import { z } from 'zod';

const decimal = (maxDecimals: number, maxValue?: number) => {
  const schema = z.string().regex(
    new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`),
    'Gunakan angka desimal yang valid',
  );
  return maxValue === undefined
    ? schema
    : schema.refine((value) => Number(value) <= maxValue, 'Nilai melebihi kapasitas kolom database');
};
const MAX_DECIMAL_12_2 = 9999999999.99;
const MAX_DECIMAL_12_3 = 999999999.999;
const MAX_DECIMAL_10_3 = 9999999.999;
const paginationFields = {
  page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
};
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Tanggal tidak valid');
const timeString = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const emptyBodySchema = z.object({}).strict();
export const catalogSearchSchema = z.object({
  kata_kunci: z.string().max(100).optional().default(''),
  jenis_paket: z.string().max(50).optional(),
  harga_min: decimal(2, MAX_DECIMAL_12_2).optional(),
  harga_max: decimal(2, MAX_DECIMAL_12_2).optional(),
}).strict().refine((value) => {
  if (value.harga_min === undefined || value.harga_max === undefined) return true;
  return Number(value.harga_min) <= Number(value.harga_max);
}, { path: ['harga_max'], message: 'Harga maksimum harus lebih besar atau sama dengan harga minimum' });

export const createOrderSchema = z.object({
  nama_pelanggan: z.string().trim().min(2).max(100),
  no_kontak: z.string().regex(/^(?:08\d{8,13}|\+62[1-9]\d{7,12})$/),
  detail: z.array(z.object({
    id_produk: z.number().int().positive(),
    jumlah_porsi: z.number().int().positive().max(2147483647),
  }).strict()).min(1),
  tanggal_acara: dateString,
  waktu_acara: timeString,
  kanal: z.enum(['ONLINE', 'DATANG_LANGSUNG']),
  catatan: z.string().max(500).nullable().optional().default(null),
}).strict();

export const paymentUploadSchema = z.object({
  jenis: z.enum(['DP', 'PELUNASAN']),
  metode: z.enum(['QRIS', 'TRANSFER']),
  nominal: decimal(2, MAX_DECIMAL_12_2),
}).strict();

export const orderLookupSchema = z.object({
  kode_pesanan: z.string().regex(/^EFD-[A-Z0-9]{6}$/).optional(),
  no_kontak: z.string().regex(/^(?:08\d{8,13}|\+62[1-9]\d{7,12})$/).optional(),
  id_pesanan: z.number().int().positive().optional(),
}).strict().refine((value) => {
  const customerMode = value.kode_pesanan !== undefined && value.no_kontak !== undefined && value.id_pesanan === undefined;
  const staffMode = value.id_pesanan !== undefined && value.kode_pesanan === undefined && value.no_kontak === undefined;
  return customerMode || staffMode;
}, { message: 'Gunakan kode_pesanan dan no_kontak untuk Customer atau id_pesanan untuk Admin/Owner' });

export const cancelOrderSchema = z.object({
  alasan_pembatalan: z.string().trim().max(255).optional(),
}).strict();

export const productFormSchema = z.object({
  nama_paket: z.string().trim().min(1).max(100),
  jenis_paket: z.string().trim().min(1).max(50),
  deskripsi: z.string().max(1000),
  isi_paket: z.string().max(1000),
  harga_per_porsi: decimal(2, MAX_DECIMAL_12_2).refine((value) => Number(value) > 0),
  aktif: z.boolean(),
  komposisi: z.array(z.object({
    id_item: z.number().int().positive(),
    jumlah_per_porsi: decimal(3, MAX_DECIMAL_10_3).refine((value) => Number(value) > 0),
  }).strict()),
}).strict().refine((value) => !value.aktif || value.komposisi.length > 0, {
  path: ['komposisi'],
  message: 'Produk aktif harus memiliki komposisi',
});

export const activeProductSchema = z.object({ aktif: z.boolean() }).strict();
export const paymentSearchSchema = z.object({
  status: z.enum(['MENUNGGU_VERIFIKASI', 'DITERIMA', 'DITOLAK', 'VOID']).optional().default('MENUNGGU_VERIFIKASI'),
  id_pesanan: z.number().int().positive().optional(),
  ...paginationFields,
}).strict();
export const paymentVerifySchema = z.object({
  keputusan: z.enum(['DITERIMA', 'DITOLAK']),
  alasan_penolakan: z.string().trim().min(1).max(255).optional(),
}).strict().refine((value) => value.keputusan !== 'DITOLAK' || Boolean(value.alasan_penolakan), {
  path: ['alasan_penolakan'],
  message: 'Alasan penolakan wajib diisi',
});
export const cashPaymentSchema = z.object({
  jenis: z.enum(['DP', 'PELUNASAN']),
  nominal: decimal(2, MAX_DECIMAL_12_2),
}).strict();
export const orderSearchSchema = z.object({
  tanggal_acara: dateString.optional(),
  status_pesanan: z.enum(['MENUNGGU_DP', 'PESANAN_BARU', 'MULAI_DIMASAK', 'SEDANG_DIPACKING', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN']).optional(),
  ...paginationFields,
}).strict();
export const orderStatusSchema = z.object({
  status_baru: z.enum(['MULAI_DIMASAK', 'SEDANG_DIPACKING', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN']),
  alasan_pembatalan: z.string().trim().min(1).max(255).optional(),
}).strict().refine((value) => value.status_baru !== 'DIBATALKAN' || Boolean(value.alasan_pembatalan), {
  path: ['alasan_pembatalan'],
  message: 'Alasan pembatalan wajib diisi',
});
export const needsSchema = z.object({ tanggal: dateString.optional() }).strict();
export const inventorySearchSchema = z.object({
  kata_kunci: z.string().max(100).optional().default(''),
  ...paginationFields,
}).strict();
export const inventoryCreateSchema = z.object({
  nama_item: z.string().trim().min(1).max(100),
  tipe: z.enum(['BAHAN_BAKU', 'KEMASAN']),
  satuan: z.enum(['kg', 'g', 'liter', 'ml', 'pcs', 'pack']),
  stok_awal: decimal(3, MAX_DECIMAL_12_3),
  batas_minimum: decimal(3, MAX_DECIMAL_12_3).nullable().optional().default(null),
}).strict();
export const inventoryMutationSchema = z.object({
  jenis_koreksi: z.enum(['TAMBAH', 'KURANG', 'KOREKSI_ABSOLUT']),
  jumlah: decimal(3, MAX_DECIMAL_12_3),
  keterangan: z.string().trim().min(1).max(255).optional(),
}).strict().refine((value) => value.jenis_koreksi !== 'KOREKSI_ABSOLUT' || Boolean(value.keterangan), {
  path: ['keterangan'],
  message: 'Keterangan wajib untuk koreksi absolut',
});
export const minimumStockSchema = z.object({ batas_minimum: decimal(3, MAX_DECIMAL_12_3).nullable() }).strict();
export const operationalSettingsSchema = z.object({
  mode_pemesanan: z.enum(['OTOMATIS', 'DIBUKA_MANUAL', 'DITUTUP_MANUAL']),
  jadwal: z.array(z.object({
    hari: z.enum(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']),
    aktif: z.boolean(),
    jam_buka: timeString.nullable(),
    jam_tutup: timeString.nullable(),
  }).strict()).length(7),
}).strict().refine((value) => new Set(value.jadwal.map((row) => row.hari)).size === 7 &&
  value.jadwal.every((row) => row.aktif
    ? row.jam_buka !== null && row.jam_tutup !== null && row.jam_buka < row.jam_tutup
    : row.jam_buka === null && row.jam_tutup === null), {
  message: 'Jadwal wajib memuat tujuh hari unik dan jam buka lebih awal dari jam tutup',
});
export const reportSchema = z.object({
  periode: z.enum(['HARIAN', 'BULANAN']),
  tanggal: dateString.optional(),
  bulan: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
}).strict().refine((value) => value.periode === 'HARIAN'
  ? value.tanggal !== undefined && value.bulan === undefined
  : value.bulan !== undefined && value.tanggal === undefined, {
  path: ['tanggal'],
  message: 'Pilih tanggal untuk HARIAN atau bulan untuk BULANAN',
});
export const customerSearchSchema = z.object({
  kata_kunci: z.string().max(100).optional().default(''),
  ...paginationFields,
}).strict();
export const resetCustomerPasswordSchema = z.object({
  email_customer: z.string().trim().email().max(100),
  konfirmasi: z.literal(true),
}).strict();
