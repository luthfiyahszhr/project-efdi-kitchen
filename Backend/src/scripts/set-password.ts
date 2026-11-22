/**
 * Mengganti password_hash seorang pengguna dengan hash bcrypt asli.
 * Pemakaian: npx tsx src/scripts/set-password.ts <email> <password-baru>
 * Berguna untuk akun seed (owner/admin1/dll.) yang password_hash-nya masih placeholder.
 */
import bcrypt from 'bcryptjs';
import { getPool, closePool, sql } from '../config/database';

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Pemakaian: npx tsx src/scripts/set-password.ts <email> <password-baru>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password minimal 6 karakter.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();
  const r = await pool.request()
    .input('email', sql.NVarChar(150), email)
    .input('hash', sql.NVarChar(255), hash)
    .query(`
      UPDATE dbo.Pengguna
      SET password_hash = @hash, jumlah_gagal = 0, terkunci_sampai = NULL
      WHERE email = @email
    `);

  if (r.rowsAffected[0] === 0) {
    console.error(`Pengguna dengan email ${email} tidak ditemukan.`);
    process.exitCode = 1;
  } else {
    console.log(`Password untuk ${email} berhasil diganti.`);
  }
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
