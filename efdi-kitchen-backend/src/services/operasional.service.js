const { getPool } = require('../config/database');
const { nowWIB } = require('../utils/datetime');
const { log } = require('./log.service');

const HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

/**
 * Mengembalikan { status, mode_pemesanan, jam_buka_berikutnya, tanpa_jadwal }
 * Fail-closed: config kosong → TUTUP + ERR-OPS-02 dicatat ke log.
 */
async function cekStatus() {
  const pool = await getPool();
  const now = nowWIB();

  // Ambil pengaturan
  const cfgRes = await pool.request()
    .query(`SELECT TOP 1 mode_pemesanan FROM pengaturan_pemesanan ORDER BY id DESC`);
  const mode = cfgRes.recordset[0]?.mode_pemesanan;

  if (!mode) {
    await log({ aksi: 'ERR-OPS-02', entitas: 'pengaturan_pemesanan' });
    return { status: 'TUTUP', mode_pemesanan: null, jam_buka_berikutnya: null, tanpa_jadwal: true };
  }
  if (mode === 'DIBUKA_MANUAL') {
    return { status: 'BUKA', mode_pemesanan: mode, jam_buka_berikutnya: null, tanpa_jadwal: false };
  }
  if (mode === 'DITUTUP_MANUAL') {
    return { status: 'TUTUP', mode_pemesanan: mode, jam_buka_berikutnya: null, tanpa_jadwal: true };
  }

  // OTOMATIS
  const hariIni = HARI[now.day()];
  const schedRes = await pool.request()
    .input('hari', hariIni)
    .query(`SELECT jam_buka, jam_tutup FROM jadwal_operasional WHERE hari=@hari AND is_active=1`);
  const sched = schedRes.recordset[0];

  if (sched) {
    const open = now.hour() * 60 + now.minute();
    const toMin = (t) => {
      const [h, m] = String(t).split(':').map(Number);
      return h * 60 + m;
    };
    if (open >= toMin(sched.jam_buka) && open < toMin(sched.jam_tutup)) {
      return { status: 'BUKA', mode_pemesanan: mode, jam_buka_berikutnya: null, tanpa_jadwal: false };
    }
  }

  // cari jadwal aktif terdekat (7 hari ke depan)
  let next = null;
  for (let i = 0; i < 7; i++) {
    const d = now.add(i, 'day');
    const h = HARI[d.day()];
    const r = await pool.request()
      .input('hari', h)
      .query(`SELECT TOP 1 jam_buka FROM jadwal_operasional WHERE hari=@hari AND is_active=1`);
    if (r.recordset[0]) {
      const [hh, mm] = String(r.recordset[0].jam_buka).split(':').map(Number);
      next = d.hour(hh).minute(mm).second(0).toISOString();
      if (i === 0 && d.hour() * 60 + d.minute() >= hh * 60 + mm) continue; // sudah lewat hari ini
      break;
    }
  }

  return {
    status: 'TUTUP',
    mode_pemesanan: mode,
    jam_buka_berikutnya: next,
    tanpa_jadwal: next === null,
  };
}

module.exports = { cekStatus };