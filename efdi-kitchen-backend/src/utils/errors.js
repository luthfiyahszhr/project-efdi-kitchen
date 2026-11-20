const ERR = {
  'ERR-VAL-01': 'Data tidak valid',
  'ERR-VAL-02': 'Nomor kontak tidak valid',
  'ERR-VAL-03': 'Total tagihan tidak valid',
  'ERR-VAL-04': 'Tanggal/waktu acara tidak valid',
  'ERR-VAL-05': 'Format/ukuran file tidak valid',
  'ERR-OPS-01': 'Pemesanan sedang ditutup',
  'ERR-OPS-02': 'Konfigurasi operasional belum diatur',
  'ERR-CAT-04': 'Produk tidak ditemukan atau nonaktif',
  'ERR-ORD-01': 'Pesanan tidak ditemukan',
  'ERR-ORD-02': 'Batas waktu pembatalan telah lewat',
  'ERR-PAY-01': 'Status pembayaran tidak memungkinkan unggah bukti',
  'ERR-PAY-05': 'Nominal pembayaran tidak sesuai',
  'ERR-PAY-06': 'Pesanan sudah dibatalkan',
  'ERR-AUTH-01': 'Tidak terautentikasi',
  'ERR-AUTH-02': 'Akses ditolak',
  'ERR-SYS-01': 'Kesalahan sistem (database)',
  'ERR-SYS-02': 'Kesalahan sistem (penyimpanan file)',
};

class AppError extends Error {
  constructor(code, httpStatus = 400, message) {
    super(message || ERR[code] || 'Terjadi kesalahan');
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

module.exports = { ERR, AppError };