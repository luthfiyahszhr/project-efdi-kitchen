import type {
  InventoryItem,
  OperationalSettings,
  Order,
  PaymentRecord,
  Product,
  UserAccount,
} from '../types/domain';
import { addDaysIso, getTodayWibDate } from '../utils/format';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 1,
    idKode: 'USR-001',
    namaLengkap: 'Anita Rahma',
    username: 'owner',
    email: 'owner@efdikitchen.local',
    password: 'owner123',
    role: 'Owner',
    aktif: true,
  },
  {
    id: 3,
    idKode: 'USR-003',
    namaLengkap: 'Admin Dapur 1',
    username: 'admin1',
    email: 'admin1@efdikitchen.local',
    password: 'admin123',
    role: 'Admin',
    aktif: true,
  },
  {
    id: 4,
    idKode: 'CUST-004',
    namaLengkap: 'Budi Santoso',
    username: 'budi',
    email: 'budi.santoso@gmail.com',
    password: 'customer123',
    role: 'Customer',
    aktif: true,
  },
  {
    id: 5,
    idKode: 'CUST-005',
    namaLengkap: 'Siti Aminah',
    username: 'siti_am',
    email: 'siti.aminah@gmail.com',
    password: 'customer123',
    role: 'Customer',
    aktif: true,
  },
  {
    id: 6,
    idKode: 'CUST-006',
    namaLengkap: 'Rina Kusuma',
    email: 'rina.kusuma@gmail.com',
    password: 'customer123',
    role: 'Customer',
    aktif: false,
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    nama: 'Beras Putih',
    tipe: 'Bahan Baku',
    satuan: 'kg',
    stok: 42.5,
    batasMinimum: 20,
    sudahDigunakan: true,
  },
  {
    id: 2,
    nama: 'Ayam Potong',
    tipe: 'Bahan Baku',
    satuan: 'kg',
    stok: 18,
    batasMinimum: 25,
    sudahDigunakan: true,
  },
  {
    id: 3,
    nama: 'Daging Sapi',
    tipe: 'Bahan Baku',
    satuan: 'kg',
    stok: 12,
    batasMinimum: 8,
    sudahDigunakan: true,
  },
  {
    id: 4,
    nama: 'Sayur Segar',
    tipe: 'Bahan Baku',
    satuan: 'kg',
    stok: 9,
    batasMinimum: 10,
    sudahDigunakan: true,
  },
  {
    id: 5,
    nama: 'Bumbu & Rempah Dapur',
    tipe: 'Bahan Baku',
    satuan: 'kg',
    stok: 6.5,
    batasMinimum: null,
    sudahDigunakan: true,
  },
  {
    id: 6,
    nama: 'Kotak Makan',
    tipe: 'Kemasan',
    satuan: 'pcs',
    stok: 180,
    batasMinimum: 100,
    sudahDigunakan: true,
  },
  {
    id: 7,
    nama: 'Sendok',
    tipe: 'Kemasan',
    satuan: 'pcs',
    stok: 140,
    batasMinimum: 150,
    sudahDigunakan: true,
  },
  {
    id: 8,
    nama: 'Cup Sambal & Lauk',
    tipe: 'Kemasan',
    satuan: 'pack',
    stok: 12,
    batasMinimum: 5,
    sudahDigunakan: true,
  },
  {
    id: 9,
    nama: 'Kotak Tumpeng Mini',
    tipe: 'Kemasan',
    satuan: 'pcs',
    stok: 45,
    batasMinimum: 20,
    sudahDigunakan: true,
  },
  {
    id: 10,
    nama: 'Kotak Snack',
    tipe: 'Kemasan',
    satuan: 'pcs',
    stok: 85,
    batasMinimum: null,
    sudahDigunakan: true,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    nama: 'Nasi Box Ayam',
    jenis: 'Nasi Box',
    ringkasanIsi: 'Nasi putih hangat, ayam goreng bumbu kuning, tumis sayur, dan sambal segar.',
    deskripsi:
      'Paket nasi box andalan Efdi Kitchen untuk rapat kantor, pengajian, maupun acara keluarga. Diolah dari bahan segar dengan bumbu rumahan yang meresap dan dikemas rapi.',
    isiLengkap: [
      'Nasi putih pulen hangat',
      'Ayam goreng bumbu lengkuas/kuning',
      'Sayur tumis buncis & wortel',
      'Sambal bajak rumahan dalam cup terpisah',
      'Lalapan timun segar, tisu, dan sendok',
    ],
    hargaPerPorsi: 25000,
    fotoUrl: '/images/nasi-box-ayam.jpg',
    aktif: true,
    komposisi: [
      { itemId: 1, jumlahPerPorsi: 0.15 },
      { itemId: 2, jumlahPerPorsi: 0.25 },
      { itemId: 4, jumlahPerPorsi: 0.1 },
      { itemId: 6, jumlahPerPorsi: 1 },
      { itemId: 7, jumlahPerPorsi: 1 },
    ],
  },
  {
    id: 2,
    nama: 'Nasi Box Rendang',
    jenis: 'Nasi Box',
    ringkasanIsi: 'Nasi putih, rendang daging sapi empuk, daun singkong, dan sambal ijo.',
    deskripsi:
      'Sajian istimewa untuk tamu acara formal maupun syukuran. Daging sapi pilihan dimasak perlahan bersama santan dan rempah Nusantara hingga empuk dan gurih.',
    isiLengkap: [
      'Nasi putih pulen',
      'Rendang daging sapi empuk berbumbu pekat',
      'Rebusan daun singkong & nangka muda',
      'Sambal ijo khas rumahan',
      'Kerupuk renyah, tisu, dan sendok',
    ],
    hargaPerPorsi: 38000,
    fotoUrl: '/images/nasi-box-rendang.jpg',
    aktif: true,
    komposisi: [
      { itemId: 1, jumlahPerPorsi: 0.15 },
      { itemId: 3, jumlahPerPorsi: 0.15 },
      { itemId: 4, jumlahPerPorsi: 0.08 },
      { itemId: 5, jumlahPerPorsi: 0.05 },
      { itemId: 6, jumlahPerPorsi: 1 },
      { itemId: 7, jumlahPerPorsi: 1 },
    ],
  },
  {
    id: 3,
    nama: 'Tumpeng Mini Kuning',
    jenis: 'Tumpeng',
    ringkasanIsi: 'Nasi kuning harum, ayam goreng, orek tempe, perkedel, urap, dan sambal.',
    deskripsi:
      'Tumpeng porsi personal dalam kemasan mika bundar beralas daun pisang. Cocok untuk perayaan ulang tahun, syukuran kantor, dan hantaran acara spesial.',
    isiLengkap: [
      'Nasi kuning kunyit & santan gurih',
      'Ayam goreng kampung/negeri bumbu rempah',
      'Orek tempe manis gurih',
      'Perkedel kentang & telur dadar iris',
      'Urap sayur kelapa sangrai & sambal terasi',
    ],
    hargaPerPorsi: 35000,
    fotoUrl: '/images/tumpeng-mini.jpg',
    aktif: true,
    komposisi: [
      { itemId: 1, jumlahPerPorsi: 0.18 },
      { itemId: 2, jumlahPerPorsi: 0.2 },
      { itemId: 4, jumlahPerPorsi: 0.1 },
      { itemId: 5, jumlahPerPorsi: 0.04 },
      { itemId: 9, jumlahPerPorsi: 1 },
      { itemId: 7, jumlahPerPorsi: 1 },
    ],
  },
  {
    id: 4,
    nama: 'Paket Prasmanan Nusantara',
    jenis: 'Prasmanan',
    ringkasanIsi: 'Sajian prasmanan lengkap: nasi, ayam bakar kecap, capcay, sambal goreng kentang.',
    deskripsi:
      'Paket prasmanan rumahan dengan porsi melimpah untuk hajatan, arisan keluarga besar, maupun pertemuan instansi (disiapkan siap ambil di dapur kami).',
    isiLengkap: [
      'Nasi putih hangat',
      'Ayam bakar kecap manis berbumbu',
      'Capcay sayur segar bakso ayam',
      'Sambal goreng kentang ati/kapri',
      'Kerupuk udang & sambal bajak',
    ],
    hargaPerPorsi: 45000,
    fotoUrl: '/images/prasmanan.jpg',
    aktif: true,
    komposisi: [
      { itemId: 1, jumlahPerPorsi: 0.2 },
      { itemId: 2, jumlahPerPorsi: 0.25 },
      { itemId: 4, jumlahPerPorsi: 0.15 },
      { itemId: 5, jumlahPerPorsi: 0.05 },
    ],
  },
  {
    id: 5,
    nama: 'Snack Box Tradisional',
    jenis: 'Snack Box',
    ringkasanIsi: 'Risoles ragout, lemper ayam daun pisang, kue lapis tradisional, dan air mineral.',
    deskripsi:
      'Pilihan kudapan pagi atau sore untuk seminar, rapat kerja, dan pengajian. Dibuat segar pada hari yang sama tanpa pengawet.',
    isiLengkap: [
      'Risoles ragout ayam wortel',
      'Lemper ketan isi ayam suwir bungkus daun pisang',
      'Kue lapis tradisional lembut',
      'Air mineral gelas & tisu',
    ],
    hargaPerPorsi: 18000,
    fotoUrl: '/images/snack-box.jpg',
    aktif: true,
    komposisi: [
      { itemId: 2, jumlahPerPorsi: 0.06 },
      { itemId: 10, jumlahPerPorsi: 1 },
    ],
  },
  {
    id: 6,
    nama: 'Nasi Box Uduk Komplit',
    jenis: 'Nasi Box',
    ringkasanIsi: 'Nasi uduk gurih, ayam suwir bumbu bali, bihun goreng, dan sambal kacang.',
    deskripsi:
      'Contoh paket yang sedang dinonaktifkan sementara pada katalog pelanggan namun tetap tersimpan pada riwayat katalog pengelola.',
    isiLengkap: [
      'Nasi uduk santan daun salam',
      'Ayam suwir bumbu bali',
      'Bihun goreng kecap & telur dadar',
      'Sambal kacang & kerupuk',
    ],
    hargaPerPorsi: 27000,
    fotoUrl: '',
    aktif: false,
    komposisi: [
      { itemId: 1, jumlahPerPorsi: 0.15 },
      { itemId: 2, jumlahPerPorsi: 0.2 },
      { itemId: 6, jumlahPerPorsi: 1 },
    ],
  },
];

export const INITIAL_OPERATIONAL_SETTINGS: OperationalSettings = {
  mode: 'Otomatis',
  jadwal: [
    { hari: 'Senin', aktif: true, jamBuka: '08:00', jamTutup: '20:00' },
    { hari: 'Selasa', aktif: true, jamBuka: '08:00', jamTutup: '20:00' },
    { hari: 'Rabu', aktif: true, jamBuka: '08:00', jamTutup: '20:00' },
    { hari: 'Kamis', aktif: true, jamBuka: '08:00', jamTutup: '20:00' },
    { hari: 'Jumat', aktif: true, jamBuka: '08:00', jamTutup: '20:00' },
    { hari: 'Sabtu', aktif: true, jamBuka: '08:00', jamTutup: '18:00' },
    { hari: 'Minggu', aktif: false, jamBuka: '08:00', jamTutup: '15:00' },
  ],
};

// Simple SVG data-URI receipt illustration for prototype payment proof preview
export const DEMO_PROOF_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="680" viewBox="0 0 520 680">
  <rect width="520" height="680" fill="#F5F7F4"/>
  <rect x="40" y="36" width="440" height="608" rx="18" fill="#FFFFFF" stroke="#DCE5DA" stroke-width="2"/>
  <rect x="40" y="36" width="440" height="84" rx="18" fill="#245C3D"/>
  <text x="260" y="76" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">BUKTI TRANSFER SIMULASI</text>
  <text x="260" y="102" font-family="Arial, sans-serif" font-size="13" fill="#EEF5EC" text-anchor="middle">Contoh Dokumen Demonstrasi Efdi Kitchen</text>
  <circle cx="260" cy="176" r="28" fill="#EEF5EC"/>
  <path d="M247 176 l9 9 l18 -18" stroke="#245C3D" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="260" y="226" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#243128" text-anchor="middle">Transfer Berhasil (Simulasi)</text>
  <line x1="72" y1="252" x2="448" y2="252" stroke="#E5ECE3" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="72" y="294" font-family="Arial, sans-serif" font-size="14" fill="#55645A">Penerima</text>
  <text x="448" y="294" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#243128" text-anchor="end">Efdi Kitchen (Rekening Contoh)</text>
  <text x="72" y="336" font-family="Arial, sans-serif" font-size="14" fill="#55645A">Bank Tujuan</text>
  <text x="448" y="336" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#243128" text-anchor="end">Bank Contoh Nasional</text>
  <text x="72" y="378" font-family="Arial, sans-serif" font-size="14" fill="#55645A">Referensi</text>
  <text x="448" y="378" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#243128" text-anchor="end">SIM-REF-20261126</text>
  <text x="72" y="420" font-family="Arial, sans-serif" font-size="14" fill="#55645A">Keterangan</text>
  <text x="448" y="420" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#243128" text-anchor="end">Pembayaran Katering Efdi</text>
  <rect x="72" y="460" width="376" height="84" rx="12" fill="#EEF5EC"/>
  <text x="92" y="492" font-family="Arial, sans-serif" font-size="13" fill="#55645A">Nominal Tertera</text>
  <text x="92" y="524" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#245C3D">Sesuai Isian Form</text>
  <text x="260" y="604" font-family="Arial, sans-serif" font-size="12" fill="#55645A" text-anchor="middle">Hanya untuk simulasi verifikasi manual pada prototipe.</text>
</svg>`);

export function createInitialOrders(): Order[] {
  const today = getTodayWibDate();
  const tomorrow = addDaysIso(today, 1);
  const plus2 = addDaysIso(today, 2);
  const yesterday = addDaysIso(today, -1);
  const twoDaysAgo = addDaysIso(today, -2);
  const now = Date.now();
  const compactToday = today.replace(/-/g, '');
  const compactYesterday = yesterday.replace(/-/g, '');
  const compactTwoDays = twoDaysAgo.replace(/-/g, '');

  return [
    {
      id: 1,
      kodePesanan: 'EFD-A7K9P2',
      nomorNota: `NOTA-${compactToday}-0001`,
      pelangganId: 4,
      namaPelanggan: 'Budi Santoso',
      noKontak: '081234567890',
      kanal: 'Online',
      tanggalAcara: today,
      waktuAcara: '12:00',
      catatan: 'Sambal mohon dipisah dalam cup dan kotak diberi stiker rapat divisi.',
      items: [
        {
          produkId: 1,
          namaProduk: 'Nasi Box Ayam',
          jenisPaket: 'Nasi Box',
          hargaPerPorsi: 25000,
          jumlahPorsi: 40,
          subtotal: 1000000,
        },
      ],
      totalHarga: 1000000,
      dpMinimumNota: 500000,
      sisaAwalNota: 500000,
      statusPesanan: 'Pesanan Baru',
      statusPembayaran: 'DP Diterima',
      stokSudahDipotong: false,
      dibuatPada: new Date(now - 1000 * 60 * 180).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 180).toISOString(),
          keterangan: 'Pesanan dibuat melalui katalog online',
        },
        {
          status: 'Pesanan Baru',
          waktuWib: new Date(now - 1000 * 60 * 140).toISOString(),
          keterangan: 'DP Rp600.000 diterima setelah verifikasi manual',
        },
      ],
    },
    {
      id: 2,
      kodePesanan: 'EFD-M4N8Q3',
      nomorNota: `NOTA-${compactToday}-0002`,
      pelangganId: 5,
      namaPelanggan: 'Siti Aminah',
      noKontak: '081298765432',
      kanal: 'Online',
      tanggalAcara: today,
      waktuAcara: '14:00',
      catatan: 'Tidak memakai kerupuk untuk 5 kotak.',
      items: [
        {
          produkId: 2,
          namaProduk: 'Nasi Box Rendang',
          jenisPaket: 'Nasi Box',
          hargaPerPorsi: 38000,
          jumlahPorsi: 30,
          subtotal: 1140000,
        },
      ],
      totalHarga: 1140000,
      dpMinimumNota: 570000,
      sisaAwalNota: 570000,
      statusPesanan: 'Menunggu DP',
      statusPembayaran: 'Menunggu Verifikasi',
      stokSudahDipotong: false,
      dibuatPada: new Date(now - 1000 * 60 * 95).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 95).toISOString(),
          keterangan: 'Menunggu verifikasi bukti DP oleh pengelola',
        },
      ],
    },
    {
      id: 3,
      kodePesanan: 'EFD-K2P5R9',
      nomorNota: `NOTA-${compactToday}-0003`,
      pelangganId: 4,
      namaPelanggan: 'Budi Santoso',
      noKontak: '081234567890',
      kanal: 'Online',
      tanggalAcara: tomorrow,
      waktuAcara: '10:30',
      catatan: 'Untuk acara syukuran pagi.',
      items: [
        {
          produkId: 3,
          namaProduk: 'Tumpeng Mini Kuning',
          jenisPaket: 'Tumpeng',
          hargaPerPorsi: 35000,
          jumlahPorsi: 25,
          subtotal: 875000,
        },
      ],
      totalHarga: 875000,
      dpMinimumNota: 437500,
      sisaAwalNota: 437500,
      statusPesanan: 'Menunggu DP',
      statusPembayaran: 'Belum Bayar',
      stokSudahDipotong: false,
      // Created 2.5 minutes ago so the 8-minute self-cancel countdown is active!
      dibuatPada: new Date(now - 1000 * 150).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 150).toISOString(),
          keterangan: 'Pesanan baru dibuat, belum ada unggahan bukti',
        },
      ],
    },
    {
      id: 4,
      kodePesanan: 'EFD-J8W3V4',
      nomorNota: `NOTA-${compactToday}-0004`,
      pelangganId: null,
      namaPelanggan: 'Ibu Ratna Dewi',
      noKontak: '085611223344',
      kanal: 'Datang Langsung',
      tanggalAcara: today,
      waktuAcara: '15:30',
      catatan: 'Diambil sendiri pukul 15.00 WIB.',
      items: [
        {
          produkId: 5,
          namaProduk: 'Snack Box Tradisional',
          jenisPaket: 'Snack Box',
          hargaPerPorsi: 18000,
          jumlahPorsi: 50,
          subtotal: 900000,
        },
      ],
      totalHarga: 900000,
      dpMinimumNota: 450000,
      sisaAwalNota: 450000,
      statusPesanan: 'Mulai Dimasak',
      statusPembayaran: 'DP Diterima',
      stokSudahDipotong: true,
      dibuatPada: new Date(now - 1000 * 60 * 300).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 300).toISOString(),
        },
        {
          status: 'Pesanan Baru',
          waktuWib: new Date(now - 1000 * 60 * 280).toISOString(),
          keterangan: 'DP tunai Rp500.000 diterima di dapur',
        },
        {
          status: 'Mulai Dimasak',
          waktuWib: new Date(now - 1000 * 60 * 60).toISOString(),
          keterangan: 'Stok bahan dan kemasan sudah dikurangi',
        },
      ],
    },
    {
      id: 5,
      kodePesanan: 'EFD-B6T1X7',
      nomorNota: `NOTA-${compactToday}-0005`,
      pelangganId: 4,
      namaPelanggan: 'Budi Santoso',
      noKontak: '081234567890',
      kanal: 'Online',
      tanggalAcara: plus2,
      waktuAcara: '11:30',
      catatan: 'Tambahkan sendok cadangan 5 pcs jika memungkinkan.',
      items: [
        {
          produkId: 1,
          namaProduk: 'Nasi Box Ayam',
          jenisPaket: 'Nasi Box',
          hargaPerPorsi: 25000,
          jumlahPorsi: 20,
          subtotal: 500000,
        },
      ],
      totalHarga: 500000,
      dpMinimumNota: 250000,
      sisaAwalNota: 250000,
      statusPesanan: 'Menunggu DP',
      statusPembayaran: 'Belum Bayar',
      stokSudahDipotong: false,
      dibuatPada: new Date(now - 1000 * 60 * 120).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 120).toISOString(),
          keterangan: 'Menunggu unggahan ulang bukti DP',
        },
      ],
    },
    {
      id: 6,
      kodePesanan: 'EFD-R5Y2N8',
      nomorNota: `NOTA-${compactToday}-0006`,
      pelangganId: null,
      namaPelanggan: 'Koperasi Sejahtera',
      noKontak: '081511223344',
      kanal: 'Datang Langsung',
      tanggalAcara: today,
      waktuAcara: '13:00',
      catatan: 'Acara rapat anggota tahunan.',
      items: [
        {
          produkId: 1,
          namaProduk: 'Nasi Box Ayam',
          jenisPaket: 'Nasi Box',
          hargaPerPorsi: 25000,
          jumlahPorsi: 80,
          subtotal: 2000000,
        },
      ],
      totalHarga: 2000000,
      dpMinimumNota: 1000000,
      sisaAwalNota: 1000000,
      statusPesanan: 'Pesanan Baru',
      statusPembayaran: 'Lunas',
      stokSudahDipotong: false,
      dibuatPada: new Date(now - 1000 * 60 * 240).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 240).toISOString(),
        },
        {
          status: 'Pesanan Baru',
          waktuWib: new Date(now - 1000 * 60 * 220).toISOString(),
          keterangan: 'Pembayaran lunas Rp2.000.000 diterima',
        },
      ],
    },
    {
      id: 7,
      kodePesanan: 'EFD-L9C4Z2',
      nomorNota: `NOTA-${compactYesterday}-0001`,
      pelangganId: null,
      namaPelanggan: 'Hendra Wijaya',
      noKontak: '081345678901',
      kanal: 'Datang Langsung',
      tanggalAcara: yesterday,
      waktuAcara: '11:00',
      catatan: 'Ambil pakai wadah food-grade pribadi.',
      items: [
        {
          produkId: 4,
          namaProduk: 'Paket Prasmanan Nusantara',
          jenisPaket: 'Prasmanan',
          hargaPerPorsi: 45000,
          jumlahPorsi: 35,
          subtotal: 1575000,
        },
      ],
      totalHarga: 1575000,
      dpMinimumNota: 787500,
      sisaAwalNota: 787500,
      statusPesanan: 'Pesanan Selesai',
      statusPembayaran: 'Lunas',
      stokSudahDipotong: true,
      dibuatPada: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      selesaiPada: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
        },
        {
          status: 'Pesanan Baru',
          waktuWib: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
        },
        {
          status: 'Mulai Dimasak',
          waktuWib: new Date(now - 1000 * 60 * 60 * 27).toISOString(),
        },
        {
          status: 'Sedang Dipacking',
          waktuWib: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
        },
        {
          status: 'Siap Diambil',
          waktuWib: new Date(now - 1000 * 60 * 60 * 25).toISOString(),
        },
        {
          status: 'Pesanan Selesai',
          waktuWib: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
          keterangan: 'Pesanan telah diambil pelanggan',
        },
      ],
    },
    {
      id: 8,
      kodePesanan: 'EFD-D3F7H5',
      nomorNota: `NOTA-${compactTwoDays}-0002`,
      pelangganId: 5,
      namaPelanggan: 'Siti Aminah',
      noKontak: '081298765432',
      kanal: 'Online',
      tanggalAcara: twoDaysAgo,
      waktuAcara: '10:00',
      catatan: 'Pesanan dibatalkan sebelum produksi.',
      items: [
        {
          produkId: 1,
          namaProduk: 'Nasi Box Ayam',
          jenisPaket: 'Nasi Box',
          hargaPerPorsi: 25000,
          jumlahPorsi: 20,
          subtotal: 500000,
        },
      ],
      totalHarga: 500000,
      dpMinimumNota: 250000,
      sisaAwalNota: 250000,
      statusPesanan: 'Dibatalkan',
      statusPembayaran: 'DP Diterima',
      stokSudahDipotong: false,
      dibuatPada: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
      alasanPembatalan: 'Acara ditunda oleh pemesan setelah konfirmasi dengan pengelola.',
      riwayatStatus: [
        {
          status: 'Menunggu DP',
          waktuWib: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
        },
        {
          status: 'Pesanan Baru',
          waktuWib: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
          keterangan: 'DP Rp250.000 diterima',
        },
        {
          status: 'Dibatalkan',
          waktuWib: new Date(now - 1000 * 60 * 60 * 46).toISOString(),
          keterangan: 'Dibatalkan pengelola; penerimaan DP tetap tercatat historis.',
        },
      ],
    },
  ];
}

export function createInitialPayments(): PaymentRecord[] {
  const now = Date.now();
  return [
    {
      id: 1,
      pesananId: 1,
      kodePesanan: 'EFD-A7K9P2',
      jenis: 'DP',
      metode: 'Transfer Bank',
      nominal: 600000,
      buktiUrl: DEMO_PROOF_IMAGE,
      buktiNamaFile: 'bukti-dp-efd-a7k9p2.png',
      waktuUnggah: new Date(now - 1000 * 60 * 150).toISOString(),
      status: 'Diterima',
      diverifikasiPada: new Date(now - 1000 * 60 * 140).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
    {
      id: 2,
      pesananId: 2,
      kodePesanan: 'EFD-M4N8Q3',
      jenis: 'DP',
      metode: 'QRIS',
      nominal: 570000,
      buktiUrl: DEMO_PROOF_IMAGE,
      buktiNamaFile: 'bukti-qris-efd-m4n8q3.jpg',
      waktuUnggah: new Date(now - 1000 * 60 * 45).toISOString(),
      status: 'Menunggu Verifikasi',
    },
    {
      id: 3,
      pesananId: 4,
      kodePesanan: 'EFD-J8W3V4',
      jenis: 'DP',
      metode: 'Tunai',
      nominal: 500000,
      waktuUnggah: new Date(now - 1000 * 60 * 280).toISOString(),
      status: 'Diterima',
      diverifikasiPada: new Date(now - 1000 * 60 * 280).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
    {
      id: 4,
      pesananId: 4,
      kodePesanan: 'EFD-J8W3V4',
      jenis: 'Pelunasan',
      metode: 'Transfer Bank',
      nominal: 400000,
      buktiUrl: DEMO_PROOF_IMAGE,
      buktiNamaFile: 'bukti-pelunasan-j8w3v4.png',
      waktuUnggah: new Date(now - 1000 * 60 * 25).toISOString(),
      status: 'Menunggu Verifikasi',
    },
    {
      id: 5,
      pesananId: 5,
      kodePesanan: 'EFD-B6T1X7',
      jenis: 'DP',
      metode: 'Transfer Bank',
      nominal: 250000,
      buktiUrl: DEMO_PROOF_IMAGE,
      buktiNamaFile: 'bukti-buram-b6t1x7.jpg',
      waktuUnggah: new Date(now - 1000 * 60 * 100).toISOString(),
      status: 'Ditolak',
      alasanPenolakan:
        'Nominal pada tangkapan layar mutasi belum terlihat jelas. Mohon unggah ulang bukti transfer yang mencantumkan nominal dan tanggal.',
      diverifikasiPada: new Date(now - 1000 * 60 * 80).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
    {
      id: 6,
      pesananId: 6,
      kodePesanan: 'EFD-R5Y2N8',
      jenis: 'DP',
      metode: 'Tunai',
      nominal: 2000000,
      waktuUnggah: new Date(now - 1000 * 60 * 220).toISOString(),
      status: 'Diterima',
      diverifikasiPada: new Date(now - 1000 * 60 * 220).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
    {
      id: 7,
      pesananId: 7,
      kodePesanan: 'EFD-L9C4Z2',
      jenis: 'DP',
      metode: 'Tunai',
      nominal: 800000,
      waktuUnggah: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
      status: 'Diterima',
      diverifikasiPada: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
    {
      id: 8,
      pesananId: 7,
      kodePesanan: 'EFD-L9C4Z2',
      jenis: 'Pelunasan',
      metode: 'Tunai',
      nominal: 775000,
      waktuUnggah: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      status: 'Diterima',
      diverifikasiPada: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
    {
      id: 9,
      pesananId: 8,
      kodePesanan: 'EFD-D3F7H5',
      jenis: 'DP',
      metode: 'Transfer Bank',
      nominal: 250000,
      buktiUrl: DEMO_PROOF_IMAGE,
      buktiNamaFile: 'bukti-dp-d3f7h5.jpg',
      waktuUnggah: new Date(now - 1000 * 60 * 60 * 51).toISOString(),
      status: 'Diterima',
      diverifikasiPada: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
      diverifikasiOleh: 'Admin Dapur 1',
    },
  ];
}
