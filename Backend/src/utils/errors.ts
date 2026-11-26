export const ERR: Record<string, string> = {
  'ERR-VAL-01': 'Field ini wajib diisi',
  'ERR-VAL-02': 'Masukkan nomor kontak yang valid',
  'ERR-VAL-03': 'Jumlah porsi minimal 1',
  'ERR-VAL-04': 'Tanggal atau waktu yang dipilih tidak valid',
  'ERR-VAL-05': 'Unggah gambar JPG/PNG dengan ukuran sesuai batas',
  'ERR-VAL-07': 'Jam buka harus lebih awal dari jam tutup',
  'ERR-OPS-01': 'Pemesanan sedang ditutup. Silakan hubungi pengelola untuk informasi lebih lanjut.',
  'ERR-OPS-02': 'Pemesanan belum dibuka',
  'ERR-CAT-04': 'Paket tidak tersedia, pilih paket lain',
  'ERR-ORD-01': 'Kode pesanan atau nomor kontak tidak sesuai',
  'ERR-ORD-02': 'Status tidak dapat diubah ke tahap tersebut',
  'ERR-ORD-03': 'DP pesanan ini belum terverifikasi',
  'ERR-ORD-04': 'Pesanan belum lunas',
  'ERR-PAY-01': 'Jenis atau status pembayaran tidak sesuai, atau bukti masih menunggu verifikasi',
  'ERR-PAY-05': 'Nominal pembayaran tidak sesuai',
  'ERR-PAY-06': 'Pesanan sudah dibatalkan',
  'ERR-AUTH-01': 'Anda harus login untuk mengakses halaman ini',
  'ERR-AUTH-02': 'Email/username atau password tidak valid',
  'ERR-AUTH-03': 'Anda tidak memiliki izin untuk mengakses ini',
  'ERR-AUTH-04': 'Sesi berakhir, silakan login kembali',
  'ERR-AUTH-05': 'Email sudah digunakan. Silakan login atau gunakan email lain.',
  'ERR-AUTH-06': 'Konfirmasi password tidak cocok',
  'ERR-AUTH-07': 'Anda tidak memiliki izin untuk mengakses halaman ini',
  'ERR-RATE-01': 'Terlalu banyak permintaan. Silakan coba kembali nanti.',
  'ERR-CAT-01': 'Produk tidak ditemukan',
  'ERR-CAT-02': 'Paket belum memiliki komposisi bahan',
  'ERR-CAT-03': 'Nama paket sudah digunakan',
  'ERR-PAY-02': 'Alasan penolakan wajib diisi',
  'ERR-PAY-03': 'Pembayaran ini sudah diverifikasi',
  'ERR-PAY-04': 'Pembayaran tunai hanya untuk pesanan datang langsung',
  'ERR-STK-01': 'Stok tidak cukup',
  'ERR-STK-02': 'Item tidak ditemukan',
  'ERR-STK-04': 'Jumlah pengurangan melebihi stok yang tersedia',
  'ERR-STK-05': 'Batas minimum stok belum tersedia atau stok menipis',
  'ERR-ORD-05': 'Alasan pembatalan wajib diisi',
  'ERR-ORD-06': 'Batas waktu pembatalan (8 menit) telah habis',
  'ERR-ORD-07': 'Pesanan tidak dapat dibatalkan karena sudah ada bukti pembayaran',
  'ERR-RPT-01': 'Tidak ada transaksi pada periode ini',
  'ERR-LOCK-01': 'Akun dikunci. Coba lagi dalam 15 menit',
  'ERR-VAL-06': 'Periksa kembali data yang Anda isi',
  'ERR-VAL-08': 'Verifikasi CAPTCHA gagal. Silakan coba lagi.',
  'ERR-CUST-01': 'Akun customer tidak ditemukan atau tidak aktif',
  'ERR-SYS-01': 'Layanan tidak tersedia. Silakan coba lagi',
  'ERR-SYS-02': 'Terjadi kendala saat memproses berkas. Coba lagi',
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
