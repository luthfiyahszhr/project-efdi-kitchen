import swaggerJsdoc from 'swagger-jsdoc';

const sessionSecurity = [{ sessionCookie: [], csrfToken: [] }];
const envelope = { $ref: '#/components/schemas/ApiEnvelope' };

function operation(
  tag: string,
  summary: string,
  example: Record<string, unknown> = {},
  status = 200,
  contentType = 'application/json',
  pathParam?: string,
) {
  const isMultipart = contentType === 'multipart/form-data';
  return {
    tags: [tag],
    summary,
    security: sessionSecurity,
    ...(pathParam ? {
      parameters: [{
        in: 'path',
        name: pathParam,
        required: true,
        schema: { type: 'integer', minimum: 1 },
      }],
    } : {}),
    requestBody: {
      required: true,
      content: {
        [contentType]: {
          schema: isMultipart
            ? {
              type: 'object',
              properties: {
                data: { type: 'string', description: 'JSON string untuk metadata request.' },
                foto: { type: 'string', format: 'binary' },
                jenis: { type: 'string', enum: ['DP', 'PELUNASAN'] },
                metode: { type: 'string', enum: ['QRIS', 'TRANSFER'] },
                nominal: { type: 'string' },
                file_bukti: { type: 'string', format: 'binary' },
              },
              required: example.data === undefined
                ? ['jenis', 'metode', 'nominal', 'file_bukti']
                : ['data'],
            }
            : { type: 'object', additionalProperties: true },
          example,
        },
      },
    },
    responses: {
      [status]: {
        description: 'Berhasil.',
        content: { 'application/json': { schema: envelope } },
      },
      401: { description: 'Sesi tidak valid atau kedaluwarsa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      403: { description: 'Akses atau status operasional ditolak.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      404: { description: 'Data tidak ditemukan.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      409: { description: 'Konflik status/data.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      422: { description: 'Validasi request gagal.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      429: { description: 'Rate limit terlampaui.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      500: { description: 'Kesalahan penyimpanan atau dokumen.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
      503: { description: 'Layanan sementara tidak tersedia.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
    },
  };
}

const options: swaggerJsdoc.OAS3Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EFDI Kitchen API',
      description: 'Kontrak API Efdi Kitchen sesuai TSD v2.0 Final. Semua endpoint bisnis memakai POST, PUT, atau PATCH dan sesi cookie dengan perlindungan CSRF.',
      version: '2.0.0',
    },
    servers: [{ url: '/', description: 'Server EFDI Kitchen' }],
    tags: [
      { name: 'Sesi', description: 'Bootstrap sesi dan token CSRF.' },
      { name: 'Katalog' },
      { name: 'Operasional' },
      { name: 'Pesanan' },
      { name: 'Auth' },
      { name: 'Admin - Produk' },
      { name: 'Admin - Pembayaran' },
      { name: 'Admin - Pesanan' },
      { name: 'Admin - Inventaris' },
      { name: 'Admin - Operasional' },
      { name: 'Admin - Laporan' },
      { name: 'Admin - Customer' },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'efdi_session',
          description: 'Ambil cookie sesi dan token CSRF dari GET /csrf.',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
        },
      },
      schemas: {
        ApiEnvelope: {
          type: 'object',
          required: ['success', 'data', 'error'],
          properties: {
            success: { type: 'boolean', example: true },
            data: { nullable: true, description: 'Data hasil operasi.' },
            error: { nullable: true, description: 'Detail error, termasuk code, message, dan fields.' },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            data: { nullable: true, example: null },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'ERR-VAL-06' },
                message: { type: 'string', example: 'Periksa kembali data yang Anda isi' },
                fields: { type: 'object', additionalProperties: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    paths: {
      '/csrf': {
        get: {
          tags: ['Sesi'],
          summary: 'Buat sesi anonim dan ambil token CSRF',
          security: [],
          responses: {
            200: {
              description: 'Cookie efdi_session dan token CSRF diterbitkan.',
              headers: { 'X-CSRF-Token': { schema: { type: 'string' } } },
            },
            503: { description: 'Penyimpanan sesi tidak tersedia.' },
          },
        },
      },
      '/health': {
        get: {
          tags: ['Sesi'],
          summary: 'Periksa koneksi backend dan basis data',
          security: [],
          responses: { 200: { description: 'Backend dan SQL Server terhubung.' } },
        },
      },
      '/media/produk/{id_produk}': {
        get: {
          tags: ['Katalog'],
          summary: 'Ambil foto produk aktif',
          security: [],
          parameters: [{
            in: 'path',
            name: 'id_produk',
            required: true,
            schema: { type: 'integer', minimum: 1 },
          }],
          responses: { 200: { description: 'Konten gambar produk.' }, 404: { description: 'Produk tidak ditemukan.' } },
        },
      },
      '/api/katalog/cari': {
        post: operation('Katalog', 'Cari katalog produk', {
          kata_kunci: 'Nasi',
          harga_min: '0',
          harga_max: '50000',
        }),
      },
      '/api/katalog/{id_produk}/detail': {
        post: operation('Katalog', 'Lihat detail produk', {}, 200, 'application/json', 'id_produk'),
      },
      '/api/operasional/status': {
        post: operation('Operasional', 'Lihat status operasional'),
      },
      '/api/pesanan': {
        post: operation('Pesanan', 'Buat pesanan', {
          nama_pelanggan: 'Sari',
          no_kontak: '081234567890',
          detail: [{ id_produk: 1, jumlah_porsi: 10 }],
          tanggal_acara: '2026-11-25',
          waktu_acara: '10:00',
          kanal: 'ONLINE',
        }, 201),
      },
      '/api/pesanan/{id_pesanan}/pembayaran': {
        post: operation('Pesanan', 'Unggah bukti pembayaran', {
          jenis: 'DP',
          metode: 'TRANSFER',
          nominal: '125000.00',
        }, 201, 'multipart/form-data', 'id_pesanan'),
      },
      '/api/pesanan/status': {
        post: operation('Pesanan', 'Pantau status pesanan', {
          kode_pesanan: 'EFD-A7B9C2',
          no_kontak: '081234567890',
        }),
      },
      '/api/pesanan/nota/unduh': {
        post: operation('Pesanan', 'Unduh nota digital', {
          kode_pesanan: 'EFD-A7B9C2',
          no_kontak: '081234567890',
        }),
      },
      '/api/pesanan/{id_pesanan}/batal': {
        post: operation('Pesanan', 'Batalkan pesanan Customer', {}, 200, 'application/json', 'id_pesanan'),
      },
      '/api/auth/login': {
        post: operation('Auth', 'Login terpadu', { kredensial: 'sari@example.test', password: 'ContohSandi123' }),
      },
      '/api/auth/logout': {
        post: operation('Auth', 'Logout', {}),
      },
      '/api/auth/register': {
        post: operation('Auth', 'Registrasi Customer', {
          nama_lengkap: 'Sari',
          email: 'sari@example.test',
          password: 'ContohSandi123',
          konfirmasi_password: 'ContohSandi123',
          captcha_token: 'token-dari-google-recaptcha',
          asal: 'KATALOG',
        }, 201),
      },
      '/api/admin/produk': {
        post: operation('Admin - Produk', 'Buat produk dan komposisi', {
          data: JSON.stringify({
            nama_paket: 'Paket A',
            jenis_paket: 'Nasi Box',
            deskripsi: 'Nasi dan lauk',
            isi_paket: 'Nasi, ayam, sayur',
            harga_per_porsi: '25000.00',
            aktif: true,
            komposisi: [{ id_item: 1, jumlah_per_porsi: '0.150' }],
          }),
        }, 201, 'multipart/form-data'),
      },
      '/api/admin/produk/{id_produk}': {
        put: operation('Admin - Produk', 'Perbarui seluruh data produk', {
          data: JSON.stringify({
            nama_paket: 'Paket A',
            jenis_paket: 'Nasi Box',
            deskripsi: 'Nasi dan lauk',
            isi_paket: 'Nasi, ayam, sayur',
            harga_per_porsi: '25000.00',
            aktif: true,
            komposisi: [{ id_item: 1, jumlah_per_porsi: '0.150' }],
          }),
        }, 200, 'multipart/form-data', 'id_produk'),
      },
      '/api/admin/produk/{id_produk}/aktif': {
        patch: operation('Admin - Produk', 'Ubah status aktif produk', { aktif: false }, 200, 'application/json', 'id_produk'),
      },
      '/api/admin/pembayaran/cari': {
        post: operation('Admin - Pembayaran', 'Cari pembayaran', { status: 'MENUNGGU_VERIFIKASI' }),
      },
      '/api/admin/pembayaran/{id_pembayaran}/bukti': {
        post: operation('Admin - Pembayaran', 'Pratinjau bukti pembayaran', {}, 200, 'application/json', 'id_pembayaran'),
      },
      '/api/admin/pembayaran/{id_pembayaran}/verifikasi': {
        post: operation('Admin - Pembayaran', 'Verifikasi pembayaran', { keputusan: 'DITERIMA' }, 200, 'application/json', 'id_pembayaran'),
      },
      '/api/admin/pesanan/{id_pesanan}/pembayaran/tunai': {
        post: operation('Admin - Pembayaran', 'Catat pembayaran tunai', { jenis: 'DP', nominal: '125000.00' }, 201, 'application/json', 'id_pesanan'),
      },
      '/api/admin/pesanan/cari': {
        post: operation('Admin - Pesanan', 'Cari daftar pesanan', { tanggal_acara: '2026-11-25' }),
      },
      '/api/admin/pesanan/{id_pesanan}/status': {
        patch: operation('Admin - Pesanan', 'Ubah status pesanan', { status_baru: 'MULAI_DIMASAK' }, 200, 'application/json', 'id_pesanan'),
      },
      '/api/admin/kebutuhan/hitung': {
        post: operation('Admin - Inventaris', 'Hitung kebutuhan produksi', { tanggal: '2026-11-25' }),
      },
      '/api/admin/kebutuhan/input-stok': {
        post: operation('Admin - Inventaris', 'Buka input stok'),
      },
      '/api/admin/stok/cari': {
        post: operation('Admin - Inventaris', 'Cari stok inventaris', {}),
      },
      '/api/admin/item': {
        post: operation('Admin - Inventaris', 'Buat item inventaris', {
          nama_item: 'Beras',
          tipe: 'BAHAN_BAKU',
          satuan: 'kg',
          stok_awal: '1.000',
          batas_minimum: null,
        }, 201),
      },
      '/api/admin/stok/{id_item}/mutasi': {
        post: operation('Admin - Inventaris', 'Catat mutasi stok', {
          jenis_koreksi: 'TAMBAH',
          jumlah: '2.000',
          keterangan: 'Pembelian bahan',
        }, 200, 'application/json', 'id_item'),
      },
      '/api/admin/stok/{id_item}/batas-minimum': {
        patch: operation('Admin - Inventaris', 'Ubah batas minimum stok', { batas_minimum: null }, 200, 'application/json', 'id_item'),
      },
      '/api/admin/operasional': {
        put: operation('Admin - Operasional', 'Simpan jadwal operasional', {
          mode_pemesanan: 'OTOMATIS',
          jadwal: [
            { hari: 'Senin', aktif: true, jam_buka: '08:00', jam_tutup: '17:00' },
            { hari: 'Selasa', aktif: true, jam_buka: '08:00', jam_tutup: '17:00' },
            { hari: 'Rabu', aktif: true, jam_buka: '08:00', jam_tutup: '17:00' },
            { hari: 'Kamis', aktif: true, jam_buka: '08:00', jam_tutup: '17:00' },
            { hari: 'Jumat', aktif: true, jam_buka: '08:00', jam_tutup: '17:00' },
            { hari: 'Sabtu', aktif: true, jam_buka: '08:00', jam_tutup: '17:00' },
            { hari: 'Minggu', aktif: false, jam_buka: null, jam_tutup: null },
          ],
        }),
      },
      '/api/admin/operasional/detail': {
        post: operation('Admin - Operasional', 'Baca jadwal operasional'),
      },
      '/api/admin/laporan/rekap': {
        post: operation('Admin - Laporan', 'Lihat rekap transaksi', { periode: 'HARIAN', tanggal: '2026-11-20' }),
      },
      '/api/admin/customer/cari': {
        post: operation('Admin - Customer', 'Cari akun Customer', { kata_kunci: 'Sari' }),
      },
      '/api/admin/customer/{id_pengguna}/reset-password': {
        post: operation('Admin - Customer', 'Reset password Customer', {
          email_customer: 'sari@example.test',
          konfirmasi: true,
        }, 200, 'application/json', 'id_pengguna'),
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
