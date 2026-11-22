import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { sql, getPool } from '../config/database';
import { env } from '../config/env';

const SESSION_TTL_MINUTES = 60;
export const SESSION_COOKIE = 'efdi_session';

export interface SessionRecord {
  id: string;
  userId: number | null;
  csrfHash: Buffer;
}

export interface CreatedSession {
  id: string;
  csrfToken: string;
}

function hash(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function csrfMatches(token: string | undefined, session: SessionRecord): boolean {
  if (!token) return false;
  const tokenHash = hash(token);
  return tokenHash.length === session.csrfHash.length && timingSafeEqual(tokenHash, session.csrfHash);
}

export async function createSession(userId: number | null): Promise<CreatedSession> {
  const id = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  const pool = await getPool();

  await pool.request()
    .input('sessionHash', sql.VarBinary(32), hash(id))
    .input('csrfHash', sql.VarBinary(32), hash(csrfToken))
    .input('userId', sql.Int, userId)
    .query(`
      INSERT INTO dbo.ApiSession (session_id_hash, csrf_token_hash, id_pengguna, created_at, last_activity, expires_at)
      VALUES (@sessionHash, @csrfHash, @userId, SYSUTCDATETIME(), SYSUTCDATETIME(),
              DATEADD(MINUTE, ${SESSION_TTL_MINUTES}, SYSUTCDATETIME()))
    `);

  return { id, csrfToken };
}

export async function findSession(id: string | undefined): Promise<SessionRecord | null> {
  if (!id || !/^[a-f0-9]{64}$/i.test(id)) return null;

  const pool = await getPool();
  const result = await pool.request()
    .input('sessionHash', sql.VarBinary(32), hash(id))
    .query(`
      UPDATE dbo.ApiSession
      SET last_activity = SYSUTCDATETIME(),
          expires_at = DATEADD(MINUTE, ${SESSION_TTL_MINUTES}, SYSUTCDATETIME())
      OUTPUT INSERTED.id_pengguna, INSERTED.csrf_token_hash
      WHERE session_id_hash = @sessionHash AND expires_at > SYSUTCDATETIME()
    `);

  const row = result.recordset[0];
  if (!row) return null;
  return { id, userId: row.id_pengguna ?? null, csrfHash: Buffer.from(row.csrf_token_hash) };
}

export async function rotateCsrfToken(id: string): Promise<string> {
  const csrfToken = randomBytes(32).toString('hex');
  const pool = await getPool();
  const result = await pool.request()
    .input('sessionHash', sql.VarBinary(32), hash(id))
    .input('csrfHash', sql.VarBinary(32), hash(csrfToken))
    .query(`
      UPDATE dbo.ApiSession
      SET csrf_token_hash = @csrfHash
      WHERE session_id_hash = @sessionHash AND expires_at > SYSUTCDATETIME()
    `);

  if (result.rowsAffected[0] !== 1) throw new Error('Session expired while rotating CSRF token');
  return csrfToken;
}

export async function destroySession(id: string | undefined): Promise<void> {
  if (!id || !/^[a-f0-9]{64}$/i.test(id)) return;
  const pool = await getPool();
  await pool.request()
    .input('sessionHash', sql.VarBinary(32), hash(id))
    .query('DELETE FROM dbo.ApiSession WHERE session_id_hash = @sessionHash');
}

export function setSessionCookie(res: Response, id: string): void {
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MINUTES * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  const cookie = cookieHeader?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}
