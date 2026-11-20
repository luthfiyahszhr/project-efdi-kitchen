const sql = require('mssql');
const env = require('./env');

const poolConfig = {
  server: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  options: {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await new sql.ConnectionPool(poolConfig).connect();
    pool.on('error', (err) => console.error('[SQL] Pool error:', err));
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

/**
 * Helper untuk SELECT dengan lock FOR UPDATE (SQL Server pakai UPDLOCK, ROWLOCK)
 * @example
 *   SELECT TOP 1 * FROM pesanan WITH (UPDLOCK, ROWLOCK) WHERE kode_pesanan = @kode
 */
module.exports = { sql, getPool, closePool };