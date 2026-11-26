type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: { code?: string; message?: string; fields?: Record<string, string> } | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const API_ORIGIN = API_BASE.replace(/\/api$/, '');
let csrfToken: string | null = null;
let csrfRequest: Promise<void> | null = null;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function csrfUrl(): string {
  return `${API_ORIGIN}/csrf`;
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

async function ensureCsrfToken(): Promise<void> {
  if (csrfToken) return;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      const response = await fetch(csrfUrl(), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new ApiError('Tidak dapat memulai sesi aman dengan server.', response.status);
      }

      const payload = (await response.json()) as ApiEnvelope<{ csrf_token: string }>;
      if (!payload.success || !payload.data?.csrf_token) {
        throw new Error(payload.error?.message || 'Server tidak memberikan token keamanan.');
      }
      csrfToken = payload.data.csrf_token;
    })().finally(() => {
      csrfRequest = null;
    });
  }
  await csrfRequest;
}

async function requestApi<TResponse>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: unknown | FormData
): Promise<TResponse> {
  const isFormData = body instanceof FormData;
  const requestBody = isFormData ? body : JSON.stringify(body ?? {});

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await ensureCsrfToken();

    const headers: Record<string, string> = { 'X-CSRF-Token': csrfToken! };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: requestBody,
    });

    const responseToken = response.headers.get('X-CSRF-Token');
    if (responseToken) csrfToken = responseToken;

    let payload: ApiEnvelope<TResponse>;
    try {
      payload = (await response.json()) as ApiEnvelope<TResponse>;
    } catch {
      throw new ApiError(`Server mengembalikan respons tidak valid (${response.status}).`, response.status);
    }

    const csrfRejected = response.status === 403
      && payload.error?.message === 'Token CSRF tidak valid';
    if (csrfRejected && attempt === 0) {
      csrfToken = null;
      continue;
    }

    if (!response.ok || !payload.success) {
      if (response.status === 401 || csrfRejected) csrfToken = null;
      throw new ApiError(
        payload.error?.message || 'Permintaan ke server gagal.',
        response.status,
        payload.error?.code
      );
    }
    return payload.data;
  }

  throw new Error('Permintaan gagal setelah memperbarui token keamanan.');
}

export function postApi<TResponse, TBody = Record<string, unknown>>(
  path: string,
  body?: TBody
): Promise<TResponse> {
  return requestApi<TResponse>('POST', path, body);
}

export function mutateApi<TResponse, TBody = Record<string, unknown>>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: TBody | FormData
): Promise<TResponse> {
  return requestApi<TResponse>(method, path, body);
}

export const TsdEndpoints = {
  auth: {
    me: '/auth/me',
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
    buktiPembayaran: (idPembayaran: number) => `/admin/pembayaran/${idPembayaran}/bukti`,
    verifikasiPembayaran: (idPembayaran: number) =>
      `/admin/pembayaran/${idPembayaran}/verifikasi`,
    catatTunai: (idPesanan: number) => `/admin/pesanan/${idPesanan}/pembayaran/tunai`,
    cariProduk: '/admin/produk/cari',
    buatProduk: '/admin/produk',
    ubahProduk: (idProduk: number) => `/admin/produk/${idProduk}`,
    aktifProduk: (idProduk: number) => `/admin/produk/${idProduk}/aktif`,
    hitungKebutuhan: '/admin/kebutuhan/hitung',
    cariStok: '/admin/stok/cari',
    buatItem: '/admin/item',
    mutasiStok: (idItem: number) => `/admin/stok/${idItem}/mutasi`,
    batasMinimum: (idItem: number) => `/admin/stok/${idItem}/batas-minimum`,
    detailOperasional: '/admin/operasional/detail',
    simpanOperasional: '/admin/operasional',
    rekapLaporan: '/admin/laporan/rekap',
    cariCustomer: '/admin/customer/cari',
    resetPasswordCustomer: (idPengguna: number) =>
      `/admin/customer/${idPengguna}/reset-password`,
  },
} as const;
