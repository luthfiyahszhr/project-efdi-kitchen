/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  INITIAL_INVENTORY,
  INITIAL_OPERATIONAL_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  createInitialOrders,
  createInitialPayments,
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
import {
  computeEffectiveStoreStatus,
  generateNotaNumber,
  generateOrderCode,
  generateTempPassword,
  getTodayWibDate,
} from '../utils/format';

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
  ) => { ok: boolean; error?: string; user?: UserAccount };
  registerCustomer: (data: {
    namaLengkap: string;
    email: string;
    password: string;
  }) => { ok: boolean; error?: string; user?: UserAccount };
  logout: (reason?: string) => void;
  simulateSessionExpired: () => void;
  resetCustomerPassword: (
    customerId: number
  ) => { ok: boolean; tempPassword?: string; error?: string };

  // Store operational status
  operationalSettings: OperationalSettings;
  effectiveStoreStatus: EffectiveStoreStatus;
  saveOperationalSettings: (
    settings: OperationalSettings
  ) => { ok: boolean; error?: string };

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
  }) => { ok: boolean; error?: string };
  toggleProductActive: (productId: number) => { ok: boolean; error?: string };

  // Inventory
  inventory: InventoryItem[];
  createInventoryItem: (payload: {
    nama: string;
    tipe: InventoryType;
    satuan: InventoryUnit;
    stokAwal: number;
    batasMinimum: number | null;
  }) => { ok: boolean; error?: string; item?: InventoryItem };
  mutateInventory: (payload: {
    itemId: number;
    jenisMutasi: InventoryMutationType;
    jumlah: number;
    batasMinimum?: number | null;
    keterangan?: string;
  }) => { ok: boolean; error?: string };

  // Orders & Payments
  orders: Order[];
  payments: PaymentRecord[];
  getVerifiedPaidAmount: (orderId: number) => number;
  getRemainingBalance: (order: Order) => number;
  getOrderPayments: (orderId: number) => PaymentRecord[];
  createOrder: (payload: {
    namaPelanggan: string;
    noKontak: string;
    kanal: OrderChannel;
    tanggalAcara: string;
    waktuAcara: string;
    catatan: string;
    items: { produkId: number; jumlahPorsi: number }[];
  }) => { ok: boolean; error?: string; order?: Order };
  uploadPaymentProof: (payload: {
    orderId: number;
    jenis: PaymentType;
    metode: Exclude<PaymentMethod, 'Tunai'>;
    nominal: number;
    buktiUrl: string;
    buktiNamaFile: string;
  }) => { ok: boolean; error?: string };
  verifyPayment: (payload: {
    paymentId: number;
    approved: boolean;
    alasanPenolakan?: string;
  }) => { ok: boolean; error?: string };
  recordCashPayment: (payload: {
    orderId: number;
    jenis: PaymentType;
    nominal: number;
  }) => { ok: boolean; error?: string };
  advanceOrderStatus: (orderId: number) => {
    ok: boolean;
    error?: string;
    shortages?: StockShortage[];
  };
  cancelOrderByCustomer: (orderId: number) => { ok: boolean; error?: string };
  cancelOrderByAdmin: (
    orderId: number,
    alasan: string
  ) => { ok: boolean; error?: string; summary?: string };

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
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number>(() => Date.now());
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);

  const [operationalSettings, setOperationalSettings] =
    useState<OperationalSettings>(INITIAL_OPERATIONAL_SETTINGS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [orders, setOrders] = useState<Order[]>(() => createInitialOrders());
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    createInitialPayments()
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Live ticker so store status & 8-min countdown react naturally
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

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
      setCurrentUser(null);
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
    (identifier: string, password: string) => {
      const now = Date.now();
      if (lockedUntil && now < lockedUntil) {
        const minsLeft = Math.ceil((lockedUntil - now) / 60000);
        return {
          ok: false,
          error: `Akun sementara terkunci selama 15 menit setelah lima kegagalan berturut-turut. Coba lagi dalam sekitar ${minsLeft} menit.`,
        };
      }
      if (lockedUntil && now >= lockedUntil) {
        setLockedUntil(null);
        setFailedLoginAttempts(0);
      }

      const norm = identifier.trim().toLowerCase();
      const matched = users.find(
        (u) =>
          (u.email.toLowerCase() === norm ||
            (u.username && u.username.toLowerCase() === norm)) &&
          u.password === password &&
          u.aktif
      );

      if (!matched) {
        const nextFails = failedLoginAttempts + 1;
        setFailedLoginAttempts(nextFails);
        if (nextFails >= 5) {
          const lockTime = now + 15 * 60 * 1000;
          setLockedUntil(lockTime);
          return {
            ok: false,
            error:
              'Terlalu banyak percobaan masuk gagal (5 kali). Akun terkunci selama 15 menit.',
          };
        }
        return {
          ok: false,
          error: 'Email/username atau kata sandi tidak sesuai.',
        };
      }

      setFailedLoginAttempts(0);
      setLockedUntil(null);
      setCurrentUser(matched);
      setLastActivityAt(now);
      return { ok: true, user: matched };
    },
    [failedLoginAttempts, lockedUntil, users]
  );

  const registerCustomer = useCallback(
    (data: { namaLengkap: string; email: string; password: string }) => {
      const emailNorm = data.email.trim().toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
        return {
          ok: false,
          error: 'Email sudah digunakan oleh akun lain.',
        };
      }
      const nextId = users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
      const newUser: UserAccount = {
        id: nextId,
        idKode: `CUST-${String(nextId).padStart(3, '0')}`,
        namaLengkap: data.namaLengkap.trim(),
        email: data.email.trim(),
        password: data.password,
        role: 'Customer',
        aktif: true,
      };
      setUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setLastActivityAt(Date.now());
      return { ok: true, user: newUser };
    },
    [users]
  );

  const resetCustomerPassword = useCallback(
    (customerId: number) => {
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
      const tempPassword = generateTempPassword();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === customerId
            ? { ...u, password: tempPassword, mustChangePassword: true }
            : u
        )
      );
      return { ok: true, tempPassword };
    },
    [currentUser, users]
  );

  const effectiveStoreStatus = useMemo(
    () => computeEffectiveStoreStatus(operationalSettings, new Date(nowTick)),
    [operationalSettings, nowTick]
  );

  const saveOperationalSettings = useCallback(
    (settings: OperationalSettings) => {
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
      setOperationalSettings(settings);
      pushToast({
        type: 'success',
        title: 'Pengaturan Disimpan',
        message: 'Jadwal dan mode pemesanan Efdi Kitchen berhasil diperbarui.',
      });
      return { ok: true };
    },
    [pushToast]
  );

  const saveProduct = useCallback(
    (payload: {
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

      if (payload.id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.id ? { ...p, ...payload, nama: payload.nama.trim() } : p))
        );
        pushToast({
          type: 'success',
          title: 'Paket Diperbarui',
          message: `${payload.nama.trim()} berhasil disimpan.`,
        });
      } else {
        const nextId = products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
        setProducts((prev) => [
          ...prev,
          { ...payload, id: nextId, nama: payload.nama.trim() },
        ]);
        pushToast({
          type: 'success',
          title: 'Paket Ditambahkan',
          message: `${payload.nama.trim()} ditambahkan ke katalog.`,
        });
      }

      // Mark inventory items as used
      const usedIds = new Set(payload.komposisi.map((k) => k.itemId));
      setInventory((prev) =>
        prev.map((item) =>
          usedIds.has(item.id) ? { ...item, sudahDigunakan: true } : item
        )
      );
      return { ok: true };
    },
    [products, pushToast]
  );

  const toggleProductActive = useCallback(
    (productId: number) => {
      const prod = products.find((p) => p.id === productId);
      if (!prod) return { ok: false, error: 'Produk tidak ditemukan.' };
      if (!prod.aktif && prod.komposisi.length === 0) {
        return {
          ok: false,
          error: 'Produk tidak dapat diaktifkan tanpa minimal satu komposisi.',
        };
      }
      const nextActive = !prod.aktif;
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, aktif: nextActive } : p))
      );
      pushToast({
        type: 'info',
        title: nextActive ? 'Produk Diaktifkan' : 'Produk Dinonaktifkan',
        message: `${prod.nama} sekarang ${nextActive ? 'tampil di katalog' : 'disembunyikan dari katalog'}.`,
      });
      return { ok: true };
    },
    [products, pushToast]
  );

  const createInventoryItem = useCallback(
    (payload: {
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
      const nextId = inventory.reduce((m, i) => Math.max(m, i.id), 0) + 1;
      const newItem: InventoryItem = {
        id: nextId,
        nama: payload.nama.trim(),
        tipe: payload.tipe,
        satuan: payload.satuan,
        stok: Number(payload.stokAwal.toFixed(3)),
        batasMinimum:
          payload.batasMinimum !== null && !Number.isNaN(payload.batasMinimum)
            ? Number(payload.batasMinimum.toFixed(3))
            : null,
        sudahDigunakan: false,
      };
      setInventory((prev) => [...prev, newItem]);
      pushToast({
        type: 'success',
        title: 'Item Ditambahkan',
        message: `${newItem.nama} (${newItem.tipe}) berhasil ditambahkan.`,
      });
      return { ok: true, item: newItem };
    },
    [inventory, pushToast]
  );

  const mutateInventory = useCallback(
    (payload: {
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

      let nextStok = target.stok;
      if (payload.jenisMutasi === 'Tambah') {
        nextStok = Number((target.stok + payload.jumlah).toFixed(3));
      } else if (payload.jenisMutasi === 'Kurang') {
        if (payload.jumlah > target.stok) {
          return {
            ok: false,
            error: `Pengurangan (${payload.jumlah} ${target.satuan}) melebihi stok tersedia (${target.stok} ${target.satuan}).`,
          };
        }
        nextStok = Number((target.stok - payload.jumlah).toFixed(3));
      } else {
        nextStok = Number(payload.jumlah.toFixed(3));
      }

      setInventory((prev) =>
        prev.map((item) =>
          item.id === payload.itemId
            ? {
                ...item,
                stok: nextStok,
                batasMinimum:
                  payload.batasMinimum !== undefined
                    ? payload.batasMinimum
                    : item.batasMinimum,
              }
            : item
        )
      );

      pushToast({
        type: 'success',
        title: 'Stok Diperbarui',
        message: `${target.nama}: stok kini ${nextStok} ${target.satuan}.`,
      });
      return { ok: true };
    },
    [inventory, pushToast]
  );

  const getOrderPayments = useCallback(
    (orderId: number) => payments.filter((p) => p.pesananId === orderId),
    [payments]
  );

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
    (payload: {
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

      const builtItems = payload.items.map((row) => {
        const prod = products.find((p) => p.id === row.produkId && p.aktif);
        if (!prod) {
          throw new Error('Paket tidak tersedia atau tidak aktif.');
        }
        return {
          produkId: prod.id,
          namaProduk: prod.nama,
          jenisPaket: prod.jenis,
          hargaPerPorsi: prod.hargaPerPorsi,
          jumlahPorsi: row.jumlahPorsi,
          subtotal: prod.hargaPerPorsi * row.jumlahPorsi,
        };
      });

      const totalHarga = builtItems.reduce((sum, i) => sum + i.subtotal, 0);
      const dpMinimumNota = Math.ceil(totalHarga * 0.5);
      const sisaAwalNota = totalHarga - dpMinimumNota;
      const nowIso = new Date().toISOString();
      const todayWib = getTodayWibDate();
      const kodePesanan = generateOrderCode(orders.map((o) => o.kodePesanan));
      const nomorNota = generateNotaNumber(
        orders.map((o) => o.nomorNota),
        todayWib
      );
      const nextId = orders.reduce((m, o) => Math.max(m, o.id), 0) + 1;

      const newOrder: Order = {
        id: nextId,
        kodePesanan,
        nomorNota,
        pelangganId:
          payload.kanal === 'Online' && currentUser?.role === 'Customer'
            ? currentUser.id
            : null,
        namaPelanggan: payload.namaPelanggan.trim(),
        noKontak: payload.noKontak.trim(),
        kanal: payload.kanal,
        tanggalAcara: payload.tanggalAcara,
        waktuAcara: payload.waktuAcara,
        catatan: payload.catatan.trim(),
        items: builtItems,
        totalHarga,
        dpMinimumNota,
        sisaAwalNota,
        statusPesanan: 'Menunggu DP',
        statusPembayaran: 'Belum Bayar',
        stokSudahDipotong: false,
        dibuatPada: nowIso,
        riwayatStatus: [
          {
            status: 'Menunggu DP',
            waktuWib: nowIso,
            keterangan:
              payload.kanal === 'Online'
                ? 'Pesanan dibuat melalui katalog online'
                : 'Pesanan Datang Langsung dicatat oleh pengelola',
          },
        ],
      };

      setOrders((prev) => [newOrder, ...prev]);
      setOrderDraft(null);
      pushToast({
        type: 'success',
        title: 'Pesanan Berhasil Dibuat',
        message: `Kode pesanan Anda: ${kodePesanan}`,
      });
      return { ok: true, order: newOrder };
    },
    [currentUser, effectiveStoreStatus.isOpen, orders, products, pushToast]
  );

  const uploadPaymentProof = useCallback(
    (payload: {
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

      const nowIso = new Date().toISOString();
      const nextPayId = payments.reduce((m, p) => Math.max(m, p.id), 0) + 1;
      const newPay: PaymentRecord = {
        id: nextPayId,
        pesananId: order.id,
        kodePesanan: order.kodePesanan,
        jenis: payload.jenis,
        metode: payload.metode,
        nominal: payload.nominal,
        buktiUrl: payload.buktiUrl,
        buktiNamaFile: payload.buktiNamaFile,
        waktuUnggah: nowIso,
        status: 'Menunggu Verifikasi',
      };

      setPayments((prev) => [newPay, ...prev]);

      // Note: uploading proof of Pelunasan keeps main payment status as DP Diterima!
      if (payload.jenis === 'DP' && order.statusPembayaran === 'Belum Bayar') {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, statusPembayaran: 'Menunggu Verifikasi' }
              : o
          )
        );
      }

      pushToast({
        type: 'success',
        title: 'Bukti Pembayaran Terunggah',
        message: 'Pengelola akan mencocokkan bukti dengan mutasi dana secara manual.',
      });
      return { ok: true };
    },
    [getRemainingBalance, orders, payments, pushToast]
  );

  const verifyPayment = useCallback(
    (payload: { paymentId: number; approved: boolean; alasanPenolakan?: string }) => {
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

      const nowIso = new Date().toISOString();
      const verifierName = currentUser?.namaLengkap ?? 'Admin';

      const updatedPayments = payments.map((p) =>
        p.id === target.id
          ? {
              ...p,
              status: payload.approved ? ('Diterima' as const) : ('Ditolak' as const),
              alasanPenolakan: payload.approved
                ? undefined
                : payload.alasanPenolakan?.trim(),
              diverifikasiPada: nowIso,
              diverifikasiOleh: verifierName,
            }
          : p
      );
      setPayments(updatedPayments);

      const order = orders.find((o) => o.id === target.pesananId);
      if (order) {
        const totalAccepted = updatedPayments
          .filter((p) => p.pesananId === order.id && p.status === 'Diterima')
          .reduce((s, p) => s + p.nominal, 0);

        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== order.id) return o;
            if (!payload.approved) {
              const hasOtherPendingDp = updatedPayments.some(
                (p) =>
                  p.pesananId === o.id &&
                  p.jenis === 'DP' &&
                  p.status === 'Menunggu Verifikasi'
              );
              const nextPayStatus =
                totalAccepted >= o.totalHarga
                  ? 'Lunas'
                  : totalAccepted > 0
                  ? 'DP Diterima'
                  : hasOtherPendingDp
                  ? 'Menunggu Verifikasi'
                  : 'Belum Bayar';
              return { ...o, statusPembayaran: nextPayStatus };
            }

            const nextPayStatus =
              totalAccepted >= o.totalHarga ? 'Lunas' : 'DP Diterima';

            // Approving DP moves Menunggu DP -> Pesanan Baru; approving Pelunasan does NOT advance production
            const shouldAdvanceToNew =
              target.jenis === 'DP' && o.statusPesanan === 'Menunggu DP';

            return {
              ...o,
              statusPembayaran: nextPayStatus,
              statusPesanan: shouldAdvanceToNew ? 'Pesanan Baru' : o.statusPesanan,
              riwayatStatus: shouldAdvanceToNew
                ? [
                    ...o.riwayatStatus,
                    {
                      status: 'Pesanan Baru',
                      waktuWib: nowIso,
                      keterangan: `DP diterima (${verifierName})`,
                    },
                  ]
                : o.riwayatStatus,
            };
          })
        );
      }

      pushToast({
        type: payload.approved ? 'success' : 'warning',
        title: payload.approved ? 'Pembayaran Diterima' : 'Pembayaran Ditolak',
        message: `Pesanan ${target.kodePesanan} berhasil diperbarui.`,
      });
      return { ok: true };
    },
    [currentUser, orders, payments, pushToast]
  );

  const recordCashPayment = useCallback(
    (payload: { orderId: number; jenis: PaymentType; nominal: number }) => {
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

      const nowIso = new Date().toISOString();
      const verifierName = currentUser?.namaLengkap ?? 'Admin';
      const nextPayId = payments.reduce((m, p) => Math.max(m, p.id), 0) + 1;
      const newPay: PaymentRecord = {
        id: nextPayId,
        pesananId: order.id,
        kodePesanan: order.kodePesanan,
        jenis: payload.jenis,
        metode: 'Tunai',
        nominal: payload.nominal,
        waktuUnggah: nowIso,
        status: 'Diterima',
        diverifikasiPada: nowIso,
        diverifikasiOleh: verifierName,
      };
      const updatedPayments = [newPay, ...payments];
      setPayments(updatedPayments);

      const totalAccepted = updatedPayments
        .filter((p) => p.pesananId === order.id && p.status === 'Diterima')
        .reduce((s, p) => s + p.nominal, 0);

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== order.id) return o;
          const nextPayStatus =
            totalAccepted >= o.totalHarga ? 'Lunas' : 'DP Diterima';
          const shouldAdvanceToNew =
            payload.jenis === 'DP' && o.statusPesanan === 'Menunggu DP';
          return {
            ...o,
            statusPembayaran: nextPayStatus,
            statusPesanan: shouldAdvanceToNew ? 'Pesanan Baru' : o.statusPesanan,
            riwayatStatus: shouldAdvanceToNew
              ? [
                  ...o.riwayatStatus,
                  {
                    status: 'Pesanan Baru',
                    waktuWib: nowIso,
                    keterangan: `Pembayaran tunai diterima (${verifierName})`,
                  },
                ]
              : o.riwayatStatus,
          };
        })
      );

      pushToast({
        type: 'success',
        title: 'Pembayaran Tunai Dicatat',
        message: `Pembayaran tunai untuk ${order.kodePesanan} berhasil tercatat.`,
      });
      return { ok: true };
    },
    [currentUser, getRemainingBalance, orders, payments, pushToast]
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
    (orderId: number) => {
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

          // Deduct stock once
          setInventory((prev) =>
            prev.map((inv) => {
              const deduct = needs.get(inv.id);
              if (!deduct) return inv;
              return {
                ...inv,
                stok: Number(Math.max(0, inv.stok - deduct).toFixed(3)),
                sudahDigunakan: true,
              };
            })
          );
        }
      }

      if (nextStatus === 'Pesanan Selesai' && order.statusPembayaran !== 'Lunas') {
        return {
          ok: false,
          error: 'Pesanan Selesai hanya dapat dipilih setelah pembayaran Lunas.',
        };
      }

      const nowIso = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                statusPesanan: nextStatus,
                stokSudahDipotong:
                  nextStatus === 'Mulai Dimasak' ? true : o.stokSudahDipotong,
                selesaiPada:
                  nextStatus === 'Pesanan Selesai' ? nowIso : o.selesaiPada,
                riwayatStatus: [
                  ...o.riwayatStatus,
                  {
                    status: nextStatus,
                    waktuWib: nowIso,
                    keterangan:
                      nextStatus === 'Mulai Dimasak' && !o.stokSudahDipotong
                        ? 'Stok bahan dan kemasan dikurangi otomatis'
                        : undefined,
                  },
                ],
              }
            : o
        )
      );

      pushToast({
        type: 'success',
        title: 'Status Pesanan Diperbarui',
        message: `${order.kodePesanan} kini berstatus ${nextStatus}.`,
      });
      return { ok: true };
    },
    [computeOrderInventoryNeeds, inventory, orders, pushToast]
  );

  const cancelOrderByCustomer = useCallback(
    (orderId: number) => {
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

      const nowIso = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                statusPesanan: 'Dibatalkan',
                alasanPembatalan: 'Dibatalkan mandiri oleh pelanggan dalam batas waktu 8 menit.',
                riwayatStatus: [
                  ...o.riwayatStatus,
                  {
                    status: 'Dibatalkan',
                    waktuWib: nowIso,
                    keterangan: 'Pembatalan mandiri oleh pelanggan',
                  },
                ],
              }
            : o
        )
      );

      pushToast({
        type: 'info',
        title: 'Pesanan Dibatalkan',
        message: `Pesanan ${order.kodePesanan} telah dibatalkan.`,
      });
      return { ok: true };
    },
    [currentUser, orders, payments, pushToast]
  );

  const cancelOrderByAdmin = useCallback(
    (orderId: number, alasan: string) => {
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

      if (shouldRestock) {
        const needs = computeOrderInventoryNeeds(order);
        setInventory((prev) =>
          prev.map((inv) => {
            const addBack = needs.get(inv.id);
            if (!addBack) return inv;
            return {
              ...inv,
              stok: Number((inv.stok + addBack).toFixed(3)),
            };
          })
        );
      }

      let voidCount = 0;
      setPayments((prev) =>
        prev.map((p) => {
          if (p.pesananId === order.id && p.status === 'Menunggu Verifikasi') {
            voidCount += 1;
            return { ...p, status: 'VOID' };
          }
          return p;
        })
      );

      const nowIso = new Date().toISOString();
      const summaryParts: string[] = [];
      if (shouldRestock) summaryParts.push('stok bahan/kemasan dikembalikan');
      else summaryParts.push('tidak ada pengembalian stok');
      if (voidCount > 0) summaryParts.push(`${voidCount} pembayaran menunggu diubah menjadi VOID`);
      summaryParts.push('pembayaran yang sudah diterima tetap tercatat');

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                statusPesanan: 'Dibatalkan',
                alasanPembatalan: alasan.trim(),
                riwayatStatus: [
                  ...o.riwayatStatus,
                  {
                    status: 'Dibatalkan',
                    waktuWib: nowIso,
                    keterangan: `Dibatalkan pengelola: ${alasan.trim()}`,
                  },
                ],
              }
            : o
        )
      );

      pushToast({
        type: 'warning',
        title: 'Pesanan Dibatalkan',
        message: `${order.kodePesanan} dibatalkan (${summaryParts.join(', ')}).`,
      });
      return { ok: true, summary: summaryParts.join(', ') };
    },
    [computeOrderInventoryNeeds, orders, pushToast]
  );

  const value: AppContextValue = {
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
