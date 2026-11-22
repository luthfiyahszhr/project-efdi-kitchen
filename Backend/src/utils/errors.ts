export const ERR: Record<string, string> = {
  'ERR-VAL-01': 'Data tidak valid',
  'ERR-VAL-02': 'Nomor kontak tidak valid',
  'ERR-VAL-03': 'Total tagihan tidak valid',
  'ERR-VAL-04': 'Tanggal/waktu acara tidak valid',
  'ERR-VAL-05': 'Format/ukuran file tidak valid',
  'ERR-VAL-07': 'Jam buka harus lebih awal dari jam tutup',
  'ERR-OPS-01': 'Pemesanan sedang ditutup. Silakan hubungi pengelola untuk informasi lebih lanjut.',
  'ERR-OPS-02': 'Pemesanan belum dibuka',
  'ERR-CAT-04': 'Produk tidak ditemukan atau nonaktif',
  'ERR-ORD-01': 'Pesanan tidak ditemukan',
  'ERR-ORD-02': 'Batas waktu pembatalan telah lewat',
  'ERR-ORD-03': 'Status pesanan tidak memungkinkan aksi ini',
  'ERR-PAY-01': 'Status pembayaran tidak memungkinkan unggah bukti',
  'ERR-PAY-05': 'Nominal pembayaran tidak sesuai',
  'ERR-PAY-06': 'Pesanan sudah dibatalkan',
  'ERR-INV-01': 'Stok bahan tidak mencukupi',
  'ERR-INV-02': 'Item inventaris tidak ditemukan',
  'ERR-AUTH-01': 'Tidak terautentikasi',
  'ERR-AUTH-02': 'Akses ditolak',
  'ERR-AUTH-03': 'Anda tidak memiliki izin untuk mengakses ini',
  'ERR-AUTH-04': 'Sesi berakhir, silakan login kembali',
  'ERR-AUTH-05': 'Email sudah digunakan. Silakan login atau gunakan email lain.',
  'ERR-AUTH-06': 'Password dan konfirmasi password tidak sama',
  'ERR-AUTH-07': 'Customer tidak memiliki akses ke endpoint admin',
  'ERR-RATE-01': 'Terlalu banyak permintaan. Silakan coba kembali nanti.',
  'ERR-CAT-01': 'Produk tidak ditemukan',
  'ERR-CAT-02': 'Paket belum memiliki komposisi bahan',
  'ERR-CAT-03': 'Paket tidak dapat diperbarui',
  'ERR-PAY-02': 'Alasan penolakan wajib diisi',
  'ERR-PAY-03': 'Pembayaran tidak dapat diverifikasi pada status ini',
  'ERR-PAY-04': 'Pembayaran tunai hanya untuk pesanan datang langsung',
  'ERR-STK-02': 'Item tidak ditemukan',
  'ERR-STK-04': 'Stok tidak mencukupi',
  'ERR-STK-05': 'Batas minimum stok belum tersedia atau stok menipis',
  'ERR-ORD-05': 'Alasan pembatalan wajib diisi',
  'ERR-ORD-06': 'Batas waktu pembatalan (8 menit) telah habis',
  'ERR-ORD-07': 'Pesanan tidak dapat dibatalkan karena sudah ada bukti pembayaran',
  'ERR-LOCK-01': 'Akun terkunci selama 15 menit karena terlalu banyak percobaan login',
  'ERR-VAL-06': 'Periksa kembali data yang Anda isi',
  'ERR-VAL-08': 'CAPTCHA tidak valid',
  'ERR-CUST-01': 'Akun customer tidak ditemukan atau tidak aktif',
  'ERR-SYS-01': 'Layanan tidak tersedia. Silakan coba lagi',
  'ERR-SYS-02': 'Penyimpanan file tidak tersedia',
};

export class AppError extends Error {
  code: string;
  httpStatus: number;
  fields: Record<string, string>;

  constructor(code: string, httpStatus = 400, message?: string, fields: Record<string, string> = {}) {
    super(message || ERR[code] || 'Terjadi kesalahan');
    this.code = code;
    this.httpStatus = httpStatus;
    this.fields = fields;
  }
}
