export type Role = 'Customer' | 'Admin' | 'Owner';

export type JenisPaket = 'Nasi Box' | 'Tumpeng' | 'Prasmanan' | 'Snack Box';

export type OrderChannel = 'Online' | 'Datang Langsung';

export type OrderStatus =
  | 'Menunggu DP'
  | 'Pesanan Baru'
  | 'Mulai Dimasak'
  | 'Sedang Dipacking'
  | 'Siap Diambil'
  | 'Pesanan Selesai'
  | 'Dibatalkan';

export type PaymentStatus =
  | 'Belum Bayar'
  | 'Menunggu Verifikasi'
  | 'DP Diterima'
  | 'Lunas';

export type PaymentType = 'DP' | 'Pelunasan';

export type PaymentMethod = 'QRIS' | 'Transfer Bank' | 'Tunai';

export type PaymentRecordStatus =
  | 'Menunggu Verifikasi'
  | 'Diterima'
  | 'Ditolak'
  | 'VOID';

export type InventoryType = 'Bahan Baku' | 'Kemasan';

export type InventoryUnit = 'kg' | 'g' | 'liter' | 'ml' | 'pcs' | 'pack';

export type InventoryMutationType = 'Tambah' | 'Kurang' | 'Koreksi Absolut';

export type OperationalMode = 'Otomatis' | 'Dibuka Manual' | 'Ditutup Manual';

export type DayName =
  | 'Senin'
  | 'Selasa'
  | 'Rabu'
  | 'Kamis'
  | 'Jumat'
  | 'Sabtu'
  | 'Minggu';

export interface UserAccount {
  id: number;
  idKode: string;
  namaLengkap: string;
  username?: string;
  email: string;
  password?: string;
  role: Role;
  aktif: boolean;
  mustChangePassword?: boolean;
}

export interface ProductComposition {
  itemId: number;
  jumlahPerPorsi: number;
}

export interface Product {
  id: number;
  nama: string;
  jenis: JenisPaket;
  ringkasanIsi: string;
  deskripsi: string;
  isiLengkap: string[];
  hargaPerPorsi: number;
  fotoUrl: string;
  aktif: boolean;
  komposisi: ProductComposition[];
}

export interface InventoryItem {
  id: number;
  nama: string;
  tipe: InventoryType;
  satuan: InventoryUnit;
  stok: number;
  batasMinimum: number | null;
  sudahDigunakan: boolean;
}

export interface OrderItem {
  produkId: number;
  namaProduk: string;
  jenisPaket: JenisPaket;
  hargaPerPorsi: number;
  jumlahPorsi: number;
  subtotal: number;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  waktuWib: string;
  keterangan?: string;
}

export interface Order {
  id: number;
  kodePesanan: string;
  nomorNota: string;
  pelangganId: number | null;
  namaPelanggan: string;
  noKontak: string;
  kanal: OrderChannel;
  tanggalAcara: string; // YYYY-MM-DD
  waktuAcara: string; // HH:mm
  catatan: string;
  items: OrderItem[];
  totalHarga: number;
  dpMinimumNota: number;
  sisaAwalNota: number;
  statusPesanan: OrderStatus;
  statusPembayaran: PaymentStatus;
  stokSudahDipotong: boolean;
  dibuatPada: string; // ISO string
  selesaiPada?: string; // ISO string
  alasanPembatalan?: string;
  riwayatStatus: OrderHistoryEntry[];
}

export interface PaymentRecord {
  id: number;
  pesananId: number;
  kodePesanan: string;
  jenis: PaymentType;
  metode: PaymentMethod;
  nominal: number;
  buktiUrl?: string;
  buktiTersedia?: boolean;
  buktiNamaFile?: string;
  waktuUnggah: string; // ISO string
  status: PaymentRecordStatus;
  alasanPenolakan?: string;
  diverifikasiPada?: string; // ISO string
  diverifikasiOleh?: string;
}

export interface DaySchedule {
  hari: DayName;
  aktif: boolean;
  jamBuka: string; // HH:mm
  jamTutup: string; // HH:mm
}

export interface OperationalSettings {
  mode: OperationalMode;
  jadwal: DaySchedule[];
}

export interface EffectiveStoreStatus {
  isOpen: boolean;
  mode: OperationalMode;
  reasonText: string;
  nextOpenText: string | null;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
}
