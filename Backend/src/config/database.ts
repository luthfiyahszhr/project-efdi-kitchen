import * as sql from 'mssql';
import { env } from './env';

/**
 * Kolom datetime2 menyimpan UTC, sedangkan kolom TIME jadwal operasional menyimpan jam WIB.
 * Gunakan SYSUTCDATETIME() untuk timestamp yang dibuat di SQL dan dayjs.utc() untuk nilai TIME.
 */
const poolConfig: sql.config = {
  server: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  options: {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
    useUTC: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(poolConfig)
      .connect()
      .then((pool) => {
        pool.on('error', (err) => console.error('[SQL] Pool error:', err));
        return pool;
      })
      .catch((err) => {
        poolPromise = null; // izinkan percobaan ulang
        throw err;
      });
  }
  return poolPromise;
}

export async function closePool(): Promise<void> {
  if (poolPromise) {
    const pool = await poolPromise;
    poolPromise = null;
    await pool.close();
  }
}

/**
 * Menjalankan fn di dalam satu transaksi: commit jika sukses, rollback jika error.
 * Gunakan `new sql.Request(trx)` di dalam fn agar query ikut transaksi.
 */
export async function withTransaction<T>(fn: (trx: sql.Transaction) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const trx = new sql.Transaction(pool);
  await trx.begin();
  try {
    const result = await fn(trx);
    await trx.commit();
    return result;
  } catch (err) {
    try {
      await trx.rollback();
    } catch {
      /* transaksi sudah di-abort oleh server */
    }
    throw err;
  }
}

export { sql };
