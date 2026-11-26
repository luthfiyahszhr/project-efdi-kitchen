import type { Request, RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { getPool, sql, withTransaction } from '../config/database';
import { ok } from '../utils/response';
import { AppError } from '../utils/errors';
import { createSession, destroySession, setSessionCookie, clearSessionCookie } from '../services/session.service';
import * as logSvc from '../services/log.service';

interface UserRow {
  id_pengguna: number;
  nama_lengkap: string;
  email: string;
  role: 'Customer' | 'Admin' | 'Owner';
  password_hash: string;
  jumlah_gagal: number;
  terkunci_sampai: Date | null;
}

async function establishSession(req: Request, res: Parameters<RequestHandler>[1], userId: number) {
  await destroySession(req.session?.id);
  const session = await createSession(userId);
  setSessionCookie(res, session.id);
  res.setHeader('X-CSRF-Token', session.csrfToken);
  return session.csrfToken;
}

async function verifyGoogleRecaptcha(token: string): Promise<void> {
  if (!env.googleRecaptchaSecret) {
    throw new AppError('ERR-SYS-01', 503, 'Google reCAPTCHA belum dikonfigurasi di backend');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let response: Response;
  try {
    response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.googleRecaptchaSecret, response: token }),
      signal: controller.signal,
    });
  } catch (error) {
    console.error('[reCAPTCHA] Verification request failed:', error);
    throw new AppError('ERR-SYS-01', 503, 'Layanan verifikasi CAPTCHA tidak tersedia');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AppError('ERR-SYS-01', 503, 'Layanan verifikasi CAPTCHA tidak tersedia');
  }

  const result = await response.json() as { success?: boolean };
  if (!result.success) throw new AppError('ERR-VAL-08', 422, 'Verifikasi CAPTCHA gagal. Silakan coba lagi.');
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const {
      nama_lengkap,
      email,
      password,
      konfirmasi_password,
      captcha_token,
      asal = 'KATALOG',
    } = req.body;

    if (password !== konfirmasi_password) {
      throw new AppError('ERR-AUTH-06', 422, 'Konfirmasi password tidak cocok.');
    }
    await verifyGoogleRecaptcha(captcha_token);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await withTransaction(async (trx) => {
      const exists = await new sql.Request(trx)
        .input('email', sql.NVarChar(100), email.toLowerCase())
        .query('SELECT TOP 1 id_pengguna FROM dbo.pengguna WHERE LOWER(email) = @email');
      if (exists.recordset[0]) {
        throw new AppError('ERR-AUTH-05', 409, 'Email sudah digunakan. Silakan login atau gunakan email lain.');
      }

      const inserted = await new sql.Request(trx)
        .input('nama', sql.NVarChar(100), nama_lengkap.trim())
        .input('email', sql.NVarChar(100), email.toLowerCase())
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .query(`
          INSERT INTO dbo.pengguna (nama_lengkap, username, email, password_hash, role)
          OUTPUT INSERTED.id_pengguna, INSERTED.role
          VALUES (@nama, NULL, @email, @passwordHash, 'Customer')
        `);
      const created = inserted.recordset[0];
      await logSvc.log({
        transaction: trx,
        actorId: created.id_pengguna,
        aksi: 'REGISTER_SUCCESS',
        entitas: 'Pengguna',
        entitasId: created.id_pengguna,
        dataBaru: { asal },
        ip: req.ip,
      });
      return created as { id_pengguna: number; role: 'Customer' };
    });

    await establishSession(req, res, user.id_pengguna);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, {
      id_pengguna: user.id_pengguna,
      role: user.role,
      redirect: asal === 'PESAN' ? '/pesan' : '/paket',
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const identity = String(req.body.kredensial).trim().toLowerCase();
    const authResult = await withTransaction(async (trx) => {
      const result = await new sql.Request(trx)
        .input('identity', sql.NVarChar(100), identity)
        .query(`
          SELECT TOP 1 id_pengguna, nama_lengkap, email, role, password_hash, jumlah_gagal, terkunci_sampai
          FROM dbo.pengguna WITH (UPDLOCK, ROWLOCK)
          WHERE aktif = 1 AND (LOWER(email) = @identity OR LOWER(username) = @identity)
        `);
      const matchedUser = result.recordset[0] as UserRow | undefined;

      if (matchedUser?.terkunci_sampai && new Date(matchedUser.terkunci_sampai).getTime() > Date.now()) {
        throw new AppError('ERR-LOCK-01', 403);
      }

      const passwordMatches = matchedUser
        ? await bcrypt.compare(req.body.password, matchedUser.password_hash)
        : false;
      if (!matchedUser || !passwordMatches) {
        let locked = false;
        if (matchedUser) {
          const failure = await new sql.Request(trx)
            .input('id', sql.Int, matchedUser.id_pengguna)
            .query(`
            UPDATE dbo.pengguna
            SET jumlah_gagal = CASE WHEN terkunci_sampai IS NOT NULL AND terkunci_sampai <= SYSUTCDATETIME()
                                    THEN 1 ELSE jumlah_gagal + 1 END,
                terkunci_sampai = CASE
                  WHEN (CASE WHEN terkunci_sampai IS NOT NULL AND terkunci_sampai <= SYSUTCDATETIME()
                             THEN 1 ELSE jumlah_gagal + 1 END) >= 5
                  THEN DATEADD(MINUTE, 15, SYSUTCDATETIME())
                  ELSE NULL
                END
            WHERE id_pengguna = @id
            OUTPUT INSERTED.jumlah_gagal
          `);
          locked = Number(failure.recordset[0]?.jumlah_gagal) >= 5;
        }
        await logSvc.log({
          transaction: trx,
          actorId: matchedUser?.id_pengguna ?? null,
          aksi: 'LOGIN_FAILED',
          entitas: 'Pengguna',
          entitasId: matchedUser?.id_pengguna ?? null,
          ip: req.ip,
        });
        return { user: null, locked };
      }

      await new sql.Request(trx)
        .input('id', sql.Int, matchedUser.id_pengguna)
        .query(`
          UPDATE dbo.pengguna
          SET jumlah_gagal = 0, terkunci_sampai = NULL, terakhir_login = SYSUTCDATETIME()
          WHERE id_pengguna = @id
        `);
      await logSvc.log({
        transaction: trx,
        actorId: matchedUser.id_pengguna,
        aksi: 'LOGIN_SUCCESS',
        entitas: 'Pengguna',
        entitasId: matchedUser.id_pengguna,
        ip: req.ip,
      });
      return { user: matchedUser, locked: false };
    });

    if (authResult.locked) throw new AppError('ERR-LOCK-01', 403);
    const user = authResult.user;
    if (!user) {
      throw new AppError('ERR-AUTH-02', 401, 'Email/username atau password tidak valid');
    }

    const csrfToken = await establishSession(req, res, user.id_pengguna);
    return ok(res, {
      role: user.role,
      redirect: user.role === 'Customer' ? '/paket' : '/admin',
      csrf_token: csrfToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    await destroySession(req.session?.id);
    clearSessionCookie(res);
    await logSvc.log({
      actorId: req.user!.id,
      aksi: 'LOGOUT',
      entitas: 'Pengguna',
      entitasId: req.user!.id,
      ip: req.ip,
    });
    return ok(res, { logout: true });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user!.id)
      .query(`
        SELECT id_pengguna, nama_lengkap, username, email, role, aktif
        FROM dbo.pengguna
        WHERE id_pengguna = @id AND aktif = 1
      `);
    const user = result.recordset[0];
    if (!user) throw new AppError('ERR-AUTH-04', 401);
    return ok(res, {
      id_pengguna: user.id_pengguna,
      nama_lengkap: user.nama_lengkap,
      username: user.username,
      email: user.email,
      role: user.role,
      aktif: user.aktif,
    });
  } catch (error) {
    next(error);
  }
};
