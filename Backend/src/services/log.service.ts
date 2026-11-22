import { getPool, sql } from '../config/database';

interface LogParams {
  actorId?: number | null;
  aksi: string;
  entitas?: string | null;
  entitasId?: number | null;
  dataLama?: unknown;
  dataBaru?: unknown;
  ip?: string | null;
  /** Isi agar log ikut transaksi yang sedang berjalan. */
  transaction?: sql.Transaction;
}

/** Menulis ke dbo.LogAktivitas (append-only). data_lama/data_baru harus JSON valid (CK_Log_json_*). */
export async function log(p: LogParams): Promise<void> {
  const request = p.transaction ? new sql.Request(p.transaction) : (await getPool()).request();
  await request
    .input('actor', sql.Int, p.actorId ?? null)
    .input('aksi', sql.VarChar(50), p.aksi)
    .input('entitas', sql.VarChar(50), p.entitas ?? null)
    .input('entitasId', sql.Int, p.entitasId ?? null)
    .input('dataLama', sql.NVarChar(sql.MAX), p.dataLama != null ? JSON.stringify(p.dataLama) : null)
    .input('dataBaru', sql.NVarChar(sql.MAX), p.dataBaru != null ? JSON.stringify(p.dataBaru) : null)
    .input('ip', sql.VarChar(45), (p.ip || '0.0.0.0').slice(0, 45))
    .query(`
      INSERT INTO dbo.LogAktivitas (id_pengguna, aksi, entitas, id_entitas, data_lama, data_baru, alamat_ip)
      VALUES (@actor, @aksi, @entitas, @entitasId, @dataLama, @dataBaru, @ip)
    `);
}
