/**
 * Lapisan kontrak integrasi API sesuai arahan FSD/TSD:
 * - Base path: /api
 * - Operasi baca memakai POST (bukan GET)
 * - Autentikasi memakai sesi cookie (credentials: 'include') + header CSRF
 *
 * Catatan: Pada mode prototipe interaktif saat ini, state dijalankan secara lokal
 * di browser (AppContext) tanpa server nyata. Modul ini disiapkan agar integrasi
 * ke backend nantinya mengikuti kontrak FSD/TSD tanpa JWT atau API GET.
 */

const API_BASE = '/api';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function postApi<TResponse, TBody = Record<string, unknown>>(
  path: string,
  body?: TBody
): Promise<TResponse> {
  const csrfToken = readCookie('csrf_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.message || 'Permintaan ke server gagal.');
  }

  return (await res.json()) as TResponse;
}

export async function mutateApi<TResponse, TBody = Record<string, unknown>>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: TBody | FormData
): Promise<TResponse> {
  const csrfToken = readCookie('csrf_token');
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: isFormData ? body : JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.message || 'Permintaan ke server gagal.');
  }

  return (await res.json()) as TResponse;
}

export const TsdEndpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
  },
  katalog: {
    cari: '/katalog/cari',
    detail: (idProduk: number) => `/katalog/${idProduk}/detail`,
  },
  operasional: {
    status: '/operasional/status',
  },
  pesanan: {
    buat: '/pesanan',
    unggahBukti: (idPesanan: number) => `/pesanan/${idPesanan}/pembayaran`,
    status: '/pesanan/status',
    unduhNota: '/pesanan/nota/unduh',
    batal: (idPesanan: number) => `/pesanan/${idPesanan}/batal`,
  },
  admin: {
    cariPesanan: '/admin/pesanan/cari',
    ubahStatusPesanan: (idPesanan: number) => `/admin/pesanan/${idPesanan}/status`,
    cariPembayaran: '/admin/pembayaran/cari',
    verifikasiPembayaran: (idPembayaran: number) =>
      `/admin/pembayaran/${idPembayaran}/verifikasi`,
    catatTunai: (idPesanan: number) => `/admin/pesanan/${idPesanan}/pembayaran/tunai`,
    buatProduk: '/admin/produk',
    ubahProduk: (idProduk: number) => `/admin/produk/${idProduk}`,
    aktifProduk: (idProduk: number) => `/admin/produk/${idProduk}/aktif`,
    hitungKebutuhan: '/admin/kebutuhan/hitung',
    cariStok: '/admin/stok/cari',
    buatItem: '/admin/item',
    mutasiStok: (idItem: number) => `/admin/stok/${idItem}/mutasi`,
    batasMinimum: (idItem: number) => `/admin/stok/${idItem}/batas-minimum`,
    simpanOperasional: '/admin/operasional',
    rekapLaporan: '/admin/laporan/rekap',
    cariCustomer: '/admin/customer/cari',
    resetPasswordCustomer: (idPengguna: number) =>
      `/admin/customer/${idPengguna}/reset-password`,
  },
} as const;
