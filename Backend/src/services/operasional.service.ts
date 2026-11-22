import { getPool } from '../config/database';
import { dayjs, nowWIB } from '../utils/datetime';
import { AppError } from '../utils/errors';
import { log } from './log.service';

// Sesuai CK_Jadwal_hari di schema
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface StatusOperasional {
  status: 'BUKA' | 'TUTUP';
  mode_pemesanan: string | null;
  jam_buka_berikutnya: string | null;
  tanpa_jadwal: boolean;
}

/** Kolom TIME dari mssql berupa Date (1970-01-01 + jam WIB sebagai UTC). */
function toMinutes(t: Date | string): number {
  if (typeof t === 'string') {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  const d = dayjs.utc(t);
  return d.hour() * 60 + d.minute();
}

/**
 * Fail-closed: konfigurasi kosong -> TUTUP + ERR-OPS-02 dicatat ke log.
 */
export async function cekStatus(): Promise<StatusOperasional> {
  const pool = await getPool();
  const now = nowWIB();

  const cfg = await pool.request().query(`SELECT mode FROM dbo.PengaturanPemesanan WHERE id_pengaturan = 1`);
  const mode: string | undefined = cfg.recordset[0]?.mode;

  if (!mode) {
    try {
      await log({ aksi: 'ERR-OPS-02', entitas: 'PengaturanPemesanan' });
    } catch (e) {
      console.error('[log ERR-OPS-02] gagal:', e);
    }
    throw new AppError('ERR-OPS-02', 503, 'Pemesanan belum dibuka');
  }
  if (mode === 'DIBUKA_MANUAL') {
    return { status: 'BUKA', mode_pemesanan: mode, jam_buka_berikutnya: null, tanpa_jadwal: false };
  }
  if (mode === 'DITUTUP_MANUAL') {
    return { status: 'TUTUP', mode_pemesanan: mode, jam_buka_berikutnya: null, tanpa_jadwal: true };
  }

  // OTOMATIS
  const jadwalRes = await pool.request().query(`
    SELECT hari, jam_buka, jam_tutup FROM dbo.JadwalOperasional WHERE aktif = 1
  `);
  if (jadwalRes.recordset.length === 0) {
    try {
      await log({ aksi: 'ERR-OPS-02', entitas: 'JadwalOperasional' });
    } catch (error) {
      console.error('[log ERR-OPS-02] gagal:', error);
    }
    throw new AppError('ERR-OPS-02', 503, 'Jadwal operasional belum tersedia');
  }
  const jadwal = new Map<string, { buka: number; tutup: number }>();
  for (const row of jadwalRes.recordset) {
    jadwal.set(row.hari, { buka: toMinutes(row.jam_buka), tutup: toMinutes(row.jam_tutup) });
  }

  const nowMin = now.hour() * 60 + now.minute();
  const hariIni = jadwal.get(HARI[now.day()]);
  if (hariIni && nowMin >= hariIni.buka && nowMin < hariIni.tutup) {
    return { status: 'BUKA', mode_pemesanan: mode, jam_buka_berikutnya: null, tanpa_jadwal: false };
  }

  // Cari jam buka terdekat (hari ini jika belum buka, atau sampai 7 hari ke depan)
  let next: string | null = null;
  for (let i = 0; i <= 7; i++) {
    const d = now.add(i, 'day');
    const j = jadwal.get(HARI[d.day()]);
    if (!j) continue;
    if (i === 0 && nowMin >= j.buka) continue; // jam buka hari ini sudah lewat
    next = d.startOf('day').add(j.buka, 'minute').format(); // ISO dengan offset +07:00
    break;
  }

  return {
    status: 'TUTUP',
    mode_pemesanan: mode,
    jam_buka_berikutnya: next,
    tanpa_jadwal: next === null,
  };
}
