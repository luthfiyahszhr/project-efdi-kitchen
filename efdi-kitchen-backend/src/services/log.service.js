const { getPool, sql } = require('../config/database');

async function log({ actorId = null, aksi, entitas, entitasId = null, detail = null }) {
  const pool = await getPool();
  await pool.request()
    .input('actor', sql.BigInt, actorId)
    .input('aksi', sql.VarChar(50), aksi)
    .input('entitas', sql.VarChar(50), entitas)
    .input('entitasId', sql.BigInt, entitasId)
    .input('detail', sql.NVarChar(sql.MAX), detail ? JSON.stringify(detail) : null)
    .query(`
      INSERT INTO log_aktivitas (actor_id, aksi, entitas, entitas_id, detail)
      VALUES (@actor, @aksi, @entitas, @entitasId, @detail)
    `);
}

module.exports = { log };