/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  INITIAL_OPERATIONAL_SETTINGS,
} from '../data/mockData';
import type {
  EffectiveStoreStatus,
  InventoryItem,
  InventoryMutationType,
  InventoryType,
  InventoryUnit,
  OperationalSettings,
  Order,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentType,
  Product,
  ProductComposition,
  ToastItem,
  UserAccount,
} from '../types/domain';
import { ApiError, mutateApi, postApi, resolveMediaUrl, TsdEndpoints } from '../services/api';

interface BackendBootstrap {
  currentUser: Omit<UserAccount, 'password'>;
  users: Omit<UserAccount, 'password'>[];
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  payments: PaymentRecord[];
  operationalSettings: {
    mode: 'OTOMATIS' | 'DIBUKA_MANUAL' | 'DITUTUP_MANUAL';
    jadwal: Array<{
      hari: OperationalSettings['jadwal'][number]['hari'];
      aktif: boolean;
      jamBuka: string;
      jamTutup: string;
    }>;
  } | null;
}

interface BackendProduct {
  id_produk: number;
  nama_paket: string;
  jenis_paket: Product['jenis'];
  deskripsi: string;
  isi_paket: string;
  harga_per_porsi: string | number;
  foto_url: string | null;
}

interface BackendOperationalStatus {
  status: 'BUKA' | 'TUTUP';
  mode_pemesanan: 'OTOMATIS' | 'DIBUKA_MANUAL' | 'DITUTUP_MANUAL' | null;
  jam_buka_berikutnya: string | null;
  tanpa_jadwal: boolean;
}

function mapOperationalMode(mode: string | null | undefined): OperationalSettings['mode'] {
  if (mode === 'DIBUKA_MANUAL') return 'Dibuka Manual';
  if (mode === 'DITUTUP_MANUAL') return 'Ditutup Manual';
  return 'Otomatis';
}

function mapOperationalStatus(status: BackendOperationalStatus): EffectiveStoreStatus {
  const isOpen = status.status === 'BUKA';
  return {
    isOpen,
    mode: mapOperationalMode(status.mode_pemesanan),
    reasonText: isOpen
      ? 'Pemesanan sedang dibuka.'
      : status.tanpa_jadwal
        ? 'Pemesanan sedang ditutup.'
        : 'Pemesanan sedang di luar jam operasional.',
    nextOpenText: status.jam_buka_berikutnya,
  };
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!match) throw new Error('File harus berupa gambar JPG atau PNG.');
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const extension = match[1] === 'image/png' ? '.png' : '.jpg';
  const name = filename.replace(/\.[^.]+$/, '');
  return new File([bytes], `${name}${extension}`, { type: match[1] });
}

export interface StockShortage {
  itemId: number;
  nama: string;
  satuan: InventoryUnit;
  dibutuhkan: number;
  tersedia: number;
  kekurangan: number;
}

export interface OrderDraft {
  items: { produkId: number; jumlahPorsi: number }[];
  returnToAfterAuth?: string;
}

interface AppContextValue {
  // Auth & Session
  authReady: boolean;
  currentUser: UserAccount | null;
  users: UserAccount[];
  failedLoginAttempts: number;
  lockedUntil: number | null;
  isAccountLocked: boolean;
  sessionTimeoutMinutes: number;
  lastActivityAt: number;
  orderDraft: OrderDraft | null;
  setOrderDraft: (draft: OrderDraft | null) => void;
  login: (
    identifier: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; user?: UserAccount }>;
  registerCustomer: (data: {
    namaLengkap: string;
    email: string;
    password: string;
    captchaToken: string;
  }) => Promise<{ ok: boolean; error?: string; user?: UserAccount }>;
  logout: (reason?: string) => void;
  simulateSessionExpired: () => void;
  resetCustomerPassword: (
    customerId: number
  ) => Promise<{ ok: boolean; tempPassword?: string; error?: string }>;

  // Store operational status
  operationalSettings: OperationalSettings;
  effectiveStoreStatus: EffectiveStoreStatus;
  saveOperationalSettings: (
    settings: OperationalSettings
  ) => Promise<{ ok: boolean; error?: string }>;

  // Products
  products: Product[];
  saveProduct: (payload: {
    id?: number;
    nama: string;
    jenis: Product['jenis'];
    ringkasanIsi: string;
    deskripsi: string;
    isiLengkap: string[];
    hargaPerPorsi: number;
    fotoUrl: string;
    aktif: boolean;
    komposisi: ProductComposition[];
  }) => Promise<{ ok: boolean; error?: string }>;
  toggleProductActive: (productId: number) => Promise<{ ok: boolean; error?: string }>;

  // Inventory
  inventory: InventoryItem[];
  createInventoryItem: (payload: {
    nama: string;
    tipe: InventoryType;
    satuan: InventoryUnit;
    stokAwal: number;
    batasMinimum: number | null;
  }) => Promise<{ ok: boolean; error?: string; item?: InventoryItem }>;
  mutateInventory: (payload: {
    itemId: number;
    jenisMutasi: InventoryMutationType;
    jumlah: number;
    batasMinimum?: number | null;
    keterangan?: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  // Orders & Payments
  orders: Order[];
  payments: PaymentRecord[];
  getVerifiedPaidAmount: (orderId: number) => number;
  getRemainingBalance: (order: Order) => number;
  getOrderPayments: (orderId: number) => PaymentRecord[];
  fetchPaymentProof: (paymentId: number) => Promise<string>;
  downloadNota: (order: Order) => Promise<void>;
  createOrder: (payload: {
    namaPelanggan: string;
    noKontak: string;
    kanal: OrderChannel;
    tanggalAcara: string;
    waktuAcara: string;
    catatan: string;
    items: { produkId: number; jumlahPorsi: number }[];
  }) => Promise<{ ok: boolean; error?: string; order?: Order }>;
  uploadPaymentProof: (payload: {
    orderId: number;
    jenis: PaymentType;
    metode: Exclude<PaymentMethod, 'Tunai'>;
    nominal: number;
    buktiUrl: string;
    buktiNamaFile: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  verifyPayment: (payload: {
    paymentId: number;
    approved: boolean;
    alasanPenolakan?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  recordCashPayment: (payload: {
    orderId: number;
    jenis: PaymentType;
    nominal: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  advanceOrderStatus: (orderId: number) => Promise<{
    ok: boolean;
    error?: string;
    shortages?: StockShortage[];
  }>;
  cancelOrderByCustomer: (orderId: number) => Promise<{ ok: boolean; error?: string }>;
  cancelOrderByAdmin: (
    orderId: number,
    alasan: string
  ) => Promise<{ ok: boolean; error?: string; summary?: string }>;

  // Toasts
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number>(() => Date.now());
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);

  const [operationalSettings, setOperationalSettings] =
    useState<OperationalSettings>(INITIAL_OPERATIONAL_SETTINGS);
  const [storeStatus, setStoreStatus] = useState<EffectiveStoreStatus>({
    isOpen: false,
    mode: 'Otomatis',
    reasonText: 'Memuat status operasional dari server.',
    nextOpenText: null,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Live ticker so store status & 8-min countdown react naturally
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const applyBootstrap = useCallback((data: BackendBootstrap) => {
    setCurrentUser(data.currentUser);
    setUsers(data.users);
    setProducts(data.products.map((product) => ({
      ...product,
      fotoUrl: resolveMediaUrl(product.fotoUrl),
    })));
    setInventory(data.inventory);
    setOrders(data.orders);
    setPayments(data.payments.map((payment) => ({
      ...payment,
      buktiUrl: payment.buktiUrl ? resolveMediaUrl(payment.buktiUrl) : undefined,
    })));
    if (data.operationalSettings) {
      setOperationalSettings({
        mode: mapOperationalMode(data.operationalSettings.mode),
        jadwal: data.operationalSettings.jadwal,
      });
    }
    setLastActivityAt(Date.now());
    setAuthReady(true);
  }, []);
  const refreshBootstrap = useCallback(async () => {
    const data = await postApi<BackendBootstrap>('/app/bootstrap');
    applyBootstrap(data);
    return data;
  }, [applyBootstrap]);

  useEffect(() => {
    let active = true;
    const report = (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    };
    const loadInitialData = async () => {
      const [sessionResult, catalogResult, statusResult] = await Promise.allSettled([
        postApi<BackendBootstrap['currentUser']>(TsdEndpoints.auth.me),
        postApi<{ produk: BackendProduct[] }>(TsdEndpoints.katalog.cari, { kata_kunci: '' }),
        postApi<BackendOperationalStatus>(TsdEndpoints.operasional.status),
      ]);
      if (!active) return;

      if (sessionResult.status === 'fulfilled') {
        try {
          await refreshBootstrap();
          if (!active) return;
        } catch (error) {
          report({
            type: 'error',
            title: 'Data aplikasi gagal dimuat',
            message: error instanceof Error ? error.message : 'Tidak dapat memuat data akun.',
          });
        }
      } else if (sessionResult.reason instanceof ApiError && sessionResult.reason.status !== 401) {
        report({
          type: 'error',
          title: 'Sesi gagal diperiksa',
          message: sessionResult.reason.message,
        });
      }

      if (catalogResult.status === 'fulfilled' && sessionResult.status !== 'fulfilled') {
        setProducts(catalogResult.value.produk.map((row) => ({
              id: row.id_produk,
              nama: row.nama_paket,
              jenis: row.jenis_paket,
              ringkasanIsi: row.isi_paket,
              deskripsi: row.deskripsi,
              isiLengkap: row.isi_paket.split(/\r?\n/).filter(Boolean),
              hargaPerPorsi: Number(row.harga_per_porsi),
              fotoUrl: resolveMediaUrl(row.foto_url),
              aktif: true,
              komposisi: [],
            })));
      } else if (catalogResult.status === 'rejected') {
        report({
          type: 'error',
          title: 'Katalog tidak tersedia',
          message: catalogResult.reason instanceof Error
            ? catalogResult.reason.message
            : 'Gagal memuat katalog dari server.',
        });
      }

      if (statusResult.status === 'fulfilled') {
        setStoreStatus(mapOperationalStatus(statusResult.value));
      } else {
        setStoreStatus({
          isOpen: false,
          mode: 'Otomatis',
          reasonText: statusResult.reason instanceof Error
            ? statusResult.reason.message
            : 'Status operasional tidak dapat dimuat.',
          nextOpenText: null,
        });
        report({
          type: 'warning',
          title: 'Pemesanan ditutup sementara',
          message: statusResult.reason instanceof Error
            ? statusResult.reason.message
            : 'Status operasional tidak dapat dimuat dari server.',
        });
      }

      setAuthReady(true);
    };

    void loadInitialData();
    return () => {
      active = false;
    };
  }, [refreshBootstrap]);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      void postApi(TsdEndpoints.auth.logout).catch((error: unknown) => {
        pushToast({
          type: 'error',
          title: 'Gagal mengakhiri sesi',
          message: error instanceof Error ? error.message : 'Silakan coba lagi.',
        });
      });
      setCurrentUser(null);
      setUsers([]);
      setOrders([]);
      setPayments([]);
      setInventory([]);
      if (reason) {
        pushToast({
          type: 'warning',
          title: 'Sesi Berakhir',
          message: reason,
        });
      } else {
        pushToast({
          type: 'info',
          title: 'Anda telah keluar',
          message: 'Terima kasih telah menggunakan Efdi Kitchen.',
        });
      }
    },
    [pushToast]
  );

  // Track user activity & enforce 60 minutes inactivity timeout
  useEffect(() => {
    if (!currentUser) return;
    const handleActivity = () => setLastActivityAt(Date.now());
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityAt >= SESSION_TIMEOUT_MS) {
        logout('Sesi berakhir otomatis setelah 60 menit tidak aktif. Silakan masuk kembali.');
      }
    }, 10000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      window.clearInterval(interval);
    };
  }, [currentUser, lastActivityAt, logout]);

  const simulateSessionExpired = useCallback(() => {
    if (!currentUser) return;
    logout('Sesi berakhir karena batas waktu tidak aktif 60 menit (simulasi).');
  }, [currentUser, logout]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      try {
        await postApi(TsdEndpoints.auth.login, {
          kredensial: identifier.trim(),
          password,
        });
        const data = await refreshBootstrap();
        setFailedLoginAttempts(0);
        setLockedUntil(null);
        return { ok: true, user: data.currentUser };
      } catch (error) {
        const failures = failedLoginAttempts + 1;
        setFailedLoginAttempts(failures);
        if (error instanceof ApiError && error.code === 'ERR-LOCK-01') {
          setLockedUntil(Date.now() + 15 * 60 * 1000);
        }
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Email/username atau kata sandi tidak sesuai.',
        };
      }
    },
    [failedLoginAttempts, refreshBootstrap]
  );

  const registerCustomer = useCallback(
    async (data: { namaLengkap: string; email: string; password: string; captchaToken: string }) => {
      try {
        await postApi(TsdEndpoints.auth.register, {
          nama_lengkap: data.namaLengkap.trim(),
          email: data.email.trim(),
          password: data.password,
          konfirmasi_password: data.password,
          captcha_token: data.captchaToken,
          asal: orderDraft ? 'PESAN' : 'KATALOG',
        });
        const result = await refreshBootstrap();
        return { ok: true, user: result.currentUser };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Registrasi gagal.',
        };
      }
    },
    [orderDraft, refreshBootstrap]
  );

  const resetCustomerPassword = useCallback(
    async (customerId: number) => {
      if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Owner')) {
        return { ok: false, error: 'Akses ditolak.' };
      }
      const target = users.find((u) => u.id === customerId && u.role === 'Customer');
      if (!target) {
        return { ok: false, error: 'Akun customer tidak ditemukan.' };
      }
      if (!target.aktif) {
        return { ok: false, error: 'Reset password hanya tersedia untuk Customer aktif.' };
      }
      try {
        const result = await postApi<{ password_sementara: string }>(
          TsdEndpoints.admin.resetPasswordCustomer(customerId),
          { email_customer: target.email, konfirmasi: true }
        );
        return { ok: true, tempPassword: result.password_sementara };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Reset password gagal.',
        };
      }
    },
    [currentUser, users]
  );

  const effectiveStoreStatus = storeStatus;

  const saveOperationalSettings = useCallback(
    async (settings: OperationalSettings) => {
      for (const day of settings.jadwal) {
        if (day.aktif) {
          if (!day.jamBuka || !day.jamTutup || day.jamBuka >= day.jamTutup) {
            return {
              ok: false,
              error: `Jam buka harus sebelum jam tutup pada hari ${day.hari}.`,
            };
          }
        }
      }
      try {
        await mutateApi('PUT', TsdEndpoints.admin.simpanOperasional, {
          mode_pemesanan: settings.mode === 'Otomatis'
            ? 'OTOMATIS'
            : settings.mode === 'Dibuka Manual'
              ? 'DIBUKA_MANUAL'
              : 'DITUTUP_MANUAL',
          jadwal: settings.jadwal.map((day) => ({
            hari: day.hari,
            aktif: day.aktif,
            jam_buka: day.aktif ? day.jamBuka : null,
            jam_tutup: day.aktif ? day.jamTutup : null,
          })),
        });
        setOperationalSettings(settings);
        const status = await postApi<BackendOperationalStatus>(TsdEndpoints.operasional.status);
        setStoreStatus(mapOperationalStatus(status));
        pushToast({
          type: 'success',
          title: 'Pengaturan Disimpan',
          message: 'Jadwal dan mode pemesanan Efdi Kitchen berhasil diperbarui.',
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.',
        };
      }
    },
    [pushToast]
  );

  const saveProduct = useCallback(
    async (payload: {
      id?: number;
      nama: string;
      jenis: Product['jenis'];
      ringkasanIsi: string;
      deskripsi: string;
      isiLengkap: string[];
      hargaPerPorsi: number;
      fotoUrl: string;
      aktif: boolean;
      komposisi: ProductComposition[];
    }) => {
      const nameNorm = payload.nama.trim().toLowerCase();
      if (!nameNorm) {
        return { ok: false, error: 'Nama paket wajib diisi.' };
      }
      const duplicate = products.find(
        (p) => p.nama.toLowerCase() === nameNorm && p.id !== payload.id
      );
      if (duplicate) {
        return { ok: false, error: 'Nama paket sudah digunakan produk lain.' };
      }
      if (payload.aktif && payload.komposisi.length === 0) {
        return {
          ok: false,
          error: 'Produk aktif wajib memiliki minimal satu komposisi bahan/kemasan.',
        };
      }
      if (payload.hargaPerPorsi <= 0) {
        return { ok: false, error: 'Harga per porsi harus lebih dari Rp0.' };
      }

      try {
        const formData = new FormData();
        formData.append('data', JSON.stringify({
          nama_paket: payload.nama.trim(),
          jenis_paket: payload.jenis,
          deskripsi: payload.deskripsi,
          isi_paket: payload.isiLengkap.join('\n'),
          harga_per_porsi: String(payload.hargaPerPorsi),
          aktif: payload.aktif,
          komposisi: payload.komposisi.map((composition) => ({
            id_item: composition.itemId,
            jumlah_per_porsi: String(composition.jumlahPerPorsi),
          })),
        }));
        if (payload.fotoUrl.startsWith('data:')) {
          formData.append('foto', dataUrlToFile(payload.fotoUrl, `${payload.nama}.jpg`));
        }
        await mutateApi(
          payload.id ? 'PUT' : 'POST',
          payload.id
            ? TsdEndpoints.admin.ubahProduk(payload.id)
            : TsdEndpoints.admin.buatProduk,
          formData
        );
        await refreshBootstrap();
        pushToast({
          type: 'success',
          title: payload.id ? 'Paket Diperbarui' : 'Paket Ditambahkan',
          message: `${payload.nama.trim()} berhasil disimpan.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Gagal menyimpan produk.',
        };
      }
    },
    [products, pushToast, refreshBootstrap]
  );

  const toggleProductActive = useCallback(
    async (productId: number) => {
      const prod = products.find((p) => p.id === productId);
      if (!prod) return { ok: false, error: 'Produk tidak ditemukan.' };
      if (!prod.aktif && prod.komposisi.length === 0) {
        return {
          ok: false,
          error: 'Produk tidak dapat diaktifkan tanpa minimal satu komposisi.',
        };
      }
      const nextActive = !prod.aktif;
      try {
        await mutateApi('PATCH', TsdEndpoints.admin.aktifProduk(productId), {
          aktif: nextActive,
        });
        await refreshBootstrap();
        pushToast({
          type: 'info',
          title: nextActive ? 'Produk Diaktifkan' : 'Produk Dinonaktifkan',
          message: `${prod.nama} sekarang ${nextActive ? 'tampil di katalog' : 'disembunyikan dari katalog'}.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Status produk gagal diperbarui.',
        };
      }
    },
    [products, pushToast, refreshBootstrap]
  );

  const createInventoryItem = useCallback(
    async (payload: {
      nama: string;
      tipe: InventoryType;
      satuan: InventoryUnit;
      stokAwal: number;
      batasMinimum: number | null;
    }) => {
      const nameNorm = payload.nama.trim().toLowerCase();
      if (!nameNorm) return { ok: false, error: 'Nama item wajib diisi.' };
      if (inventory.some((i) => i.nama.toLowerCase() === nameNorm)) {
        return { ok: false, error: 'Nama item inventaris sudah terdaftar.' };
      }
      if (payload.stokAwal < 0) {
        return { ok: false, error: 'Stok awal tidak boleh negatif.' };
      }
      try {
        const result = await postApi<{ id_item: number; stok_saat_ini: string }>(
          TsdEndpoints.admin.buatItem,
          {
            nama_item: payload.nama.trim(),
            tipe: payload.tipe === 'Bahan Baku' ? 'BAHAN_BAKU' : 'KEMASAN',
            satuan: payload.satuan,
            stok_awal: payload.stokAwal.toFixed(3),
            batas_minimum: payload.batasMinimum?.toFixed(3) ?? null,
          }
        );
        await refreshBootstrap();
        const newItem = inventory.find((item) => item.id === result.id_item) ?? {
          id: result.id_item,
          nama: payload.nama.trim(),
          tipe: payload.tipe,
          satuan: payload.satuan,
          stok: Number(result.stok_saat_ini),
          batasMinimum: payload.batasMinimum,
          sudahDigunakan: false,
        };
        pushToast({
          type: 'success',
          title: 'Item Ditambahkan',
          message: `${newItem.nama} (${newItem.tipe}) berhasil ditambahkan.`,
        });
        return { ok: true, item: newItem };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Gagal menambahkan item.',
        };
      }
    },
    [inventory, pushToast, refreshBootstrap]
  );

  const mutateInventory = useCallback(
    async (payload: {
      itemId: number;
      jenisMutasi: InventoryMutationType;
      jumlah: number;
      batasMinimum?: number | null;
      keterangan?: string;
    }) => {
      const target = inventory.find((i) => i.id === payload.itemId);
      if (!target) return { ok: false, error: 'Item stok tidak ditemukan.' };
      if (Number.isNaN(payload.jumlah) || payload.jumlah < 0) {
        return { ok: false, error: 'Jumlah stok tidak boleh negatif.' };
      }
      if (
        payload.jenisMutasi !== 'Koreksi Absolut' &&
        payload.jumlah <= 0
      ) {
        return { ok: false, error: 'Jumlah perubahan harus lebih dari 0.' };
      }
      if (
        payload.jenisMutasi === 'Koreksi Absolut' &&
        (!payload.keterangan || !payload.keterangan.trim())
      ) {
        return {
          ok: false,
          error: 'Keterangan wajib diisi untuk Koreksi Absolut.',
        };
      }

      if (payload.jenisMutasi === 'Kurang') {
        if (payload.jumlah > target.stok) {
          return {
            ok: false,
            error: `Pengurangan (${payload.jumlah} ${target.satuan}) melebihi stok tersedia (${target.stok} ${target.satuan}).`,
          };
        }
      }

      try {
        await postApi(TsdEndpoints.admin.mutasiStok(payload.itemId), {
          jenis_koreksi: payload.jenisMutasi === 'Tambah'
            ? 'TAMBAH'
            : payload.jenisMutasi === 'Kurang'
              ? 'KURANG'
              : 'KOREKSI_ABSOLUT',
          jumlah: payload.jumlah.toFixed(3),
          keterangan: payload.keterangan?.trim() || undefined,
        });
        if (payload.batasMinimum !== undefined) {
          await mutateApi('PATCH', TsdEndpoints.admin.batasMinimum(payload.itemId), {
            batas_minimum: payload.batasMinimum?.toFixed(3) ?? null,
          });
        }
        await refreshBootstrap();
        pushToast({
          type: 'success',
          title: 'Stok Diperbarui',
          message: `${target.nama}: perubahan stok berhasil disimpan.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Gagal memperbarui stok.',
        };
      }
    },
    [inventory, pushToast, refreshBootstrap]
  );

  const getOrderPayments = useCallback(
    (orderId: number) => payments.filter((p) => p.pesananId === orderId),
    [payments]
  );

  const fetchPaymentProof = useCallback(async (paymentId: number) => {
    const result = await postApi<{ mime_type: string; content_base64: string }>(
      TsdEndpoints.admin.buktiPembayaran(paymentId)
    );
    return `data:${result.mime_type};base64,${result.content_base64}`;
  }, []);

  const downloadNota = useCallback(async (order: Order) => {
    try {
      const lookup = currentUser?.role === 'Customer'
        ? { kode_pesanan: order.kodePesanan, no_kontak: order.noKontak }
        : { id_pesanan: order.id };
      const result = await postApi<{
        filename: string;
        mime_type: string;
        content_base64: string;
      }>(TsdEndpoints.pesanan.unduhNota, lookup);
      const binary = atob(result.content_base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const blob = new Blob([bytes], { type: result.mime_type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Nota gagal diunduh',
        message: error instanceof Error ? error.message : 'Server tidak dapat membuat nota.',
      });
    }
  }, [currentUser, pushToast]);

  const getVerifiedPaidAmount = useCallback(
    (orderId: number) =>
      payments
        .filter((p) => p.pesananId === orderId && p.status === 'Diterima')
        .reduce((sum, p) => sum + p.nominal, 0),
    [payments]
  );

  const getRemainingBalance = useCallback(
    (order: Order) => {
      const paid = getVerifiedPaidAmount(order.id);
      return Math.max(0, order.totalHarga - paid);
    },
    [getVerifiedPaidAmount]
  );

  const createOrder = useCallback(
    async (payload: {
      namaPelanggan: string;
      noKontak: string;
      kanal: OrderChannel;
      tanggalAcara: string;
      waktuAcara: string;
      catatan: string;
      items: { produkId: number; jumlahPorsi: number }[];
    }) => {
      if (!effectiveStoreStatus.isOpen) {
        return {
          ok: false,
          error:
            'Pemesanan sedang ditutup sehingga pesanan baru tidak dapat dibuat saat ini.',
        };
      }
      if (payload.items.length === 0) {
        return { ok: false, error: 'Pilih minimal satu paket katering.' };
      }

      try {
        const response = await postApi<{
          id_pesanan: number;
          kode_pesanan: string;
          status_pesanan: string;
          total_tagihan: string;
          nota: { nomor_nota: string; nominal_dp: string; sisa_pembayaran: string };
        }>(TsdEndpoints.pesanan.buat, {
          nama_pelanggan: payload.namaPelanggan.trim(),
          no_kontak: payload.noKontak.trim(),
          tanggal_acara: payload.tanggalAcara,
          waktu_acara: payload.waktuAcara,
          catatan: payload.catatan.trim() || null,
          kanal: payload.kanal === 'Online' ? 'ONLINE' : 'DATANG_LANGSUNG',
          detail: payload.items.map((item) => ({
            id_produk: item.produkId,
            jumlah_porsi: item.jumlahPorsi,
          })),
        });
        const builtItems = payload.items.map((row) => {
          const product = products.find((item) => item.id === row.produkId);
          if (!product) throw new Error('Paket yang dipesan tidak ditemukan pada katalog.');
          return {
            produkId: product.id,
            namaProduk: product.nama,
            jenisPaket: product.jenis,
            hargaPerPorsi: product.hargaPerPorsi,
            jumlahPorsi: row.jumlahPorsi,
            subtotal: product.hargaPerPorsi * row.jumlahPorsi,
          };
        });
        const totalHarga = Number(response.total_tagihan);
        const createdAt = new Date().toISOString();
        const newOrder: Order = {
          id: response.id_pesanan,
          kodePesanan: response.kode_pesanan,
          nomorNota: response.nota.nomor_nota,
          pelangganId: currentUser?.id ?? null,
          namaPelanggan: payload.namaPelanggan.trim(),
          noKontak: payload.noKontak.trim(),
          kanal: payload.kanal,
          tanggalAcara: payload.tanggalAcara,
          waktuAcara: payload.waktuAcara,
          catatan: payload.catatan.trim(),
          items: builtItems,
          totalHarga,
          dpMinimumNota: Number(response.nota.nominal_dp),
          sisaAwalNota: Number(response.nota.sisa_pembayaran),
          statusPesanan: 'Menunggu DP',
          statusPembayaran: 'Belum Bayar',
          stokSudahDipotong: false,
          dibuatPada: createdAt,
          riwayatStatus: [{ status: 'Menunggu DP', waktuWib: createdAt }],
        };
        setOrders((prev) => [newOrder, ...prev]);
        setOrderDraft(null);
        pushToast({
          type: 'success',
          title: 'Pesanan Berhasil Dibuat',
          message: `Kode pesanan Anda: ${response.kode_pesanan}`,
        });
        void refreshBootstrap().catch((error: unknown) => {
          pushToast({
            type: 'warning',
            title: 'Pesanan tersimpan',
            message: error instanceof Error ? error.message : 'Gagal memperbarui data terbaru.',
          });
        });
        return { ok: true, order: newOrder };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Gagal membuat pesanan.',
        };
      }
    },
    [currentUser, effectiveStoreStatus.isOpen, products, pushToast, refreshBootstrap]
  );

  const uploadPaymentProof = useCallback(
    async (payload: {
      orderId: number;
      jenis: PaymentType;
      metode: Exclude<PaymentMethod, 'Tunai'>;
      nominal: number;
      buktiUrl: string;
      buktiNamaFile: string;
    }) => {
      const order = orders.find((o) => o.id === payload.orderId);
      if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };
      if (order.statusPesanan === 'Dibatalkan') {
        return {
          ok: false,
          error: 'Pesanan yang sudah dibatalkan tidak menerima unggahan pembayaran.',
        };
      }
      if (order.statusPembayaran === 'Lunas') {
        return { ok: false, error: 'Pesanan sudah berstatus Lunas.' };
      }

      const existingPendingSameType = payments.some(
        (p) =>
          p.pesananId === order.id &&
          p.jenis === payload.jenis &&
          p.status === 'Menunggu Verifikasi'
      );
      if (existingPendingSameType) {
        return {
          ok: false,
          error: `Pembayaran ${payload.jenis} untuk pesanan ini sedang menunggu verifikasi pengelola.`,
        };
      }

      const remaining = getRemainingBalance(order);
      if (payload.jenis === 'DP') {
        if (payload.nominal < order.dpMinimumNota || payload.nominal > remaining) {
          return {
            ok: false,
            error: `Nominal DP harus antara DP minimum dan total sisa tagihan.`,
          };
        }
      } else {
        if (payload.nominal !== remaining) {
          return {
            ok: false,
            error: `Nominal pelunasan harus sama dengan sisa pembayaran saat ini.`,
          };
        }
      }

      try {
        const formData = new FormData();
        formData.append('jenis', payload.jenis === 'DP' ? 'DP' : 'PELUNASAN');
        formData.append('metode', payload.metode === 'QRIS' ? 'QRIS' : 'TRANSFER');
        formData.append('nominal', String(payload.nominal));
        formData.append('file_bukti', dataUrlToFile(payload.buktiUrl, payload.buktiNamaFile));
        const result = await mutateApi<{ id_pembayaran: number; status: string }>(
          'POST',
          TsdEndpoints.pesanan.unggahBukti(order.id),
          formData
        );
        const nowIso = new Date().toISOString();
        setPayments((prev) => [{
          id: result.id_pembayaran,
          pesananId: order.id,
          kodePesanan: order.kodePesanan,
          jenis: payload.jenis,
          metode: payload.metode,
          nominal: payload.nominal,
          buktiUrl: payload.buktiUrl,
          buktiNamaFile: payload.buktiNamaFile,
          waktuUnggah: nowIso,
          status: 'Menunggu Verifikasi',
        }, ...prev]);
        void refreshBootstrap().catch((error: unknown) => {
          pushToast({
            type: 'warning',
            title: 'Bukti tersimpan',
            message: error instanceof Error ? error.message : 'Gagal memperbarui status pembayaran.',
          });
        });
        pushToast({
          type: 'success',
          title: 'Bukti Pembayaran Terunggah',
          message: 'Pengelola akan mencocokkan bukti dengan mutasi dana secara manual.',
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Gagal mengunggah bukti pembayaran.',
        };
      }
    },
    [getRemainingBalance, orders, payments, pushToast, refreshBootstrap]
  );

  const verifyPayment = useCallback(
    async (payload: { paymentId: number; approved: boolean; alasanPenolakan?: string }) => {
      const target = payments.find((p) => p.id === payload.paymentId);
      if (!target) return { ok: false, error: 'Data pembayaran tidak ditemukan.' };
      if (target.status !== 'Menunggu Verifikasi') {
        return { ok: false, error: 'Pembayaran ini sudah diproses.' };
      }
      if (!payload.approved) {
        const reason = (payload.alasanPenolakan ?? '').trim();
        if (!reason) {
          return { ok: false, error: 'Alasan penolakan wajib diisi.' };
        }
        if (reason.length > 255) {
          return { ok: false, error: 'Alasan penolakan maksimal 255 karakter.' };
        }
      }

      try {
        await postApi(TsdEndpoints.admin.verifikasiPembayaran(payload.paymentId), {
          keputusan: payload.approved ? 'DITERIMA' : 'DITOLAK',
          alasan_penolakan: payload.approved ? undefined : payload.alasanPenolakan?.trim(),
        });
        await refreshBootstrap();
        pushToast({
          type: payload.approved ? 'success' : 'warning',
          title: payload.approved ? 'Pembayaran Diterima' : 'Pembayaran Ditolak',
          message: `Pesanan ${target.kodePesanan} berhasil diperbarui.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Verifikasi pembayaran gagal.',
        };
      }
    },
    [payments, pushToast, refreshBootstrap]
  );

  const recordCashPayment = useCallback(
    async (payload: { orderId: number; jenis: PaymentType; nominal: number }) => {
      const order = orders.find((o) => o.id === payload.orderId);
      if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };
      if (order.kanal !== 'Datang Langsung') {
        return {
          ok: false,
          error: 'Pembayaran tunai hanya tersedia untuk pesanan kanal Datang Langsung.',
        };
      }
      if (order.statusPesanan === 'Dibatalkan') {
        return { ok: false, error: 'Pesanan yang dibatalkan tidak dapat dibayar.' };
      }

      const remaining = getRemainingBalance(order);
      if (remaining <= 0) {
        return { ok: false, error: 'Pesanan sudah lunas.' };
      }
      if (payload.jenis === 'DP') {
        if (payload.nominal < order.dpMinimumNota || payload.nominal > remaining) {
          return {
            ok: false,
            error: 'Nominal DP tunai harus antara DP minimum dan sisa tagihan.',
          };
        }
      } else if (payload.nominal !== remaining) {
        return {
          ok: false,
          error: 'Nominal pelunasan tunai harus sama dengan sisa tagihan.',
        };
      }

      try {
        await postApi(TsdEndpoints.admin.catatTunai(order.id), {
          jenis: payload.jenis === 'DP' ? 'DP' : 'PELUNASAN',
          nominal: payload.nominal.toFixed(2),
        });
        await refreshBootstrap();
        pushToast({
          type: 'success',
          title: 'Pembayaran Tunai Dicatat',
          message: `Pembayaran tunai untuk ${order.kodePesanan} berhasil tercatat.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Pembayaran tunai gagal dicatat.',
        };
      }
    },
    [getRemainingBalance, orders, pushToast, refreshBootstrap]
  );

  const computeOrderInventoryNeeds = useCallback(
    (order: Order) => {
      const map = new Map<number, number>();
      for (const line of order.items) {
        const prod = products.find((p) => p.id === line.produkId);
        if (!prod) continue;
        for (const comp of prod.komposisi) {
          const prev = map.get(comp.itemId) ?? 0;
          map.set(
            comp.itemId,
            Number((prev + comp.jumlahPerPorsi * line.jumlahPorsi).toFixed(3))
          );
        }
      }
      return map;
    },
    [products]
  );

  const advanceOrderStatus = useCallback(
    async (orderId: number) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };

      const flow: OrderStatus[] = [
        'Menunggu DP',
        'Pesanan Baru',
        'Mulai Dimasak',
        'Sedang Dipacking',
        'Siap Diambil',
        'Pesanan Selesai',
      ];
      const idx = flow.indexOf(order.statusPesanan);
      if (idx === -1 || idx >= flow.length - 1) {
        return { ok: false, error: 'Pesanan sudah berada pada status akhir.' };
      }

      if (order.statusPesanan === 'Menunggu DP') {
        return {
          ok: false,
          error:
            'DP harus diterima dan diverifikasi terlebih dahulu sebelum masuk ke Pesanan Baru.',
        };
      }

      const nextStatus = flow[idx + 1];

      if (nextStatus === 'Mulai Dimasak') {
        if (
          order.statusPembayaran !== 'DP Diterima' &&
          order.statusPembayaran !== 'Lunas'
        ) {
          return {
            ok: false,
            error: 'DP harus sudah diterima sebelum produksi dimulai.',
          };
        }

        if (!order.stokSudahDipotong) {
          const needs = computeOrderInventoryNeeds(order);
          const shortages: StockShortage[] = [];
          needs.forEach((needed, itemId) => {
            const inv = inventory.find((i) => i.id === itemId);
            const available = inv ? inv.stok : 0;
            if (available < needed) {
              shortages.push({
                itemId,
                nama: inv ? inv.nama : `Item #${itemId}`,
                satuan: inv ? inv.satuan : 'pcs',
                dibutuhkan: needed,
                tersedia: available,
                kekurangan: Number((needed - available).toFixed(3)),
              });
            }
          });

          if (shortages.length > 0) {
            return {
              ok: false,
              error:
                'Stok bahan atau kemasan tidak mencukupi untuk memulai produksi.',
              shortages,
            };
          }

        }
      }

      if (nextStatus === 'Pesanan Selesai' && order.statusPembayaran !== 'Lunas') {
        return {
          ok: false,
          error: 'Pesanan Selesai hanya dapat dipilih setelah pembayaran Lunas.',
        };
      }

      const statusMap: Record<OrderStatus, string> = {
        'Menunggu DP': 'MENUNGGU_DP',
        'Pesanan Baru': 'PESANAN_BARU',
        'Mulai Dimasak': 'MULAI_DIMASAK',
        'Sedang Dipacking': 'SEDANG_DIPACKING',
        'Siap Diambil': 'SIAP_DIAMBIL',
        'Pesanan Selesai': 'SELESAI',
        Dibatalkan: 'DIBATALKAN',
      };
      try {
        await mutateApi(
          'PATCH',
          TsdEndpoints.admin.ubahStatusPesanan(orderId),
          { status_baru: statusMap[nextStatus] }
        );
        await refreshBootstrap();
        pushToast({
          type: 'success',
          title: 'Status Pesanan Diperbarui',
          message: `${order.kodePesanan} kini berstatus ${nextStatus}.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Status pesanan gagal diperbarui.',
        };
      }
    },
    [computeOrderInventoryNeeds, inventory, orders, pushToast, refreshBootstrap]
  );

  const cancelOrderByCustomer = useCallback(
    async (orderId: number) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };
      if (!currentUser || order.pelangganId !== currentUser.id) {
        return { ok: false, error: 'Anda tidak memiliki akses membatalkan pesanan ini.' };
      }
      if (order.statusPesanan !== 'Menunggu DP' || order.statusPembayaran !== 'Belum Bayar') {
        return { ok: false, error: 'Pesanan tidak memenuhi syarat pembatalan mandiri.' };
      }
      const hasUploads = payments.some((p) => p.pesananId === order.id);
      if (hasUploads) {
        return {
          ok: false,
          error: 'Pesanan yang sudah memiliki unggahan bukti tidak dapat dibatalkan mandiri.',
        };
      }
      const elapsedMs = Date.now() - new Date(order.dibuatPada).getTime();
      if (elapsedMs > 8 * 60 * 1000) {
        return {
          ok: false,
          error: 'Batas waktu 8 menit pembatalan mandiri telah berakhir.',
        };
      }

      try {
        await postApi(TsdEndpoints.pesanan.batal(orderId), {
          alasan_pembatalan: 'Dibatalkan mandiri oleh pelanggan dalam batas waktu 8 menit.',
        });
        await refreshBootstrap();
        pushToast({
          type: 'info',
          title: 'Pesanan Dibatalkan',
          message: `Pesanan ${order.kodePesanan} telah dibatalkan.`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Pesanan tidak dapat dibatalkan.',
        };
      }
    },
    [currentUser, orders, payments, pushToast, refreshBootstrap]
  );

  const cancelOrderByAdmin = useCallback(
    async (orderId: number, alasan: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };
      if (!alasan.trim()) return { ok: false, error: 'Alasan pembatalan wajib diisi.' };
      if (order.statusPesanan === 'Pesanan Selesai' || order.statusPesanan === 'Dibatalkan') {
        return { ok: false, error: 'Pesanan pada tahap akhir tidak dapat dibatalkan.' };
      }

      const shouldRestock =
        order.stokSudahDipotong &&
        (order.statusPesanan === 'Mulai Dimasak' ||
          order.statusPesanan === 'Sedang Dipacking' ||
          order.statusPesanan === 'Siap Diambil');

      const summaryParts: string[] = [];
      if (shouldRestock) summaryParts.push('stok bahan/kemasan dikembalikan');
      else summaryParts.push('tidak ada pengembalian stok');
      const voidCount = payments.filter(
        (payment) => payment.pesananId === order.id && payment.status === 'Menunggu Verifikasi'
      ).length;
      if (voidCount > 0) summaryParts.push(`${voidCount} pembayaran menunggu diubah menjadi VOID`);
      summaryParts.push('pembayaran yang sudah diterima tetap tercatat');

      try {
        await mutateApi(
          'PATCH',
          TsdEndpoints.admin.ubahStatusPesanan(orderId),
          { status_baru: 'DIBATALKAN', alasan_pembatalan: alasan.trim() }
        );
        await refreshBootstrap();
        pushToast({
          type: 'warning',
          title: 'Pesanan Dibatalkan',
          message: `${order.kodePesanan} dibatalkan (${summaryParts.join(', ')}).`,
        });
        return { ok: true, summary: summaryParts.join(', ') };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Pembatalan pesanan gagal.',
        };
      }
    },
    [orders, payments, pushToast, refreshBootstrap]
  );

  const value: AppContextValue = {
    authReady,
    currentUser,
    users,
    failedLoginAttempts,
    lockedUntil,
    isAccountLocked: Boolean(lockedUntil && nowTick < lockedUntil),
    sessionTimeoutMinutes: 60,
    lastActivityAt,
    orderDraft,
    setOrderDraft,
    login,
    registerCustomer,
    logout,
    simulateSessionExpired,
    resetCustomerPassword,
    operationalSettings,
    effectiveStoreStatus,
    saveOperationalSettings,
    products,
    saveProduct,
    toggleProductActive,
    inventory,
    createInventoryItem,
    mutateInventory,
    orders,
    payments,
    getVerifiedPaidAmount,
    getRemainingBalance,
    getOrderPayments,
    fetchPaymentProof,
    downloadNota,
    createOrder,
    uploadPaymentProof,
    verifyPayment,
    recordCashPayment,
    advanceOrderStatus,
    cancelOrderByCustomer,
    cancelOrderByAdmin,
    toasts,
    pushToast,
    dismissToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider.');
  return ctx;
}
