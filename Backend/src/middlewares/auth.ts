import type { RequestHandler } from 'express';
import { getPool, sql } from '../config/database';
import { AppError } from '../utils/errors';
import type { AuthUser, Role } from '../types/express';

async function getSessionUser(userId: number | null | undefined): Promise<AuthUser | null> {
  if (!userId) return null;
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, userId)
    .query(`
      SELECT id_pengguna, role, email
      FROM dbo.Pengguna
      WHERE id_pengguna = @id AND aktif = 1
    `);
  const user = result.recordset[0];
  if (!user) return null;
  return { id: user.id_pengguna, role: user.role, email: user.email };
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    req.user = await getSessionUser(req.session?.userId);
    if (!req.user) return next(new AppError('ERR-AUTH-04', 401));
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth: RequestHandler = async (req, res, next) => {
  try {
    req.user = await getSessionUser(req.session?.userId) ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
};

export function authorize(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('ERR-AUTH-04', 401));
    if (!roles.includes(req.user.role)) {
      const code = req.user.role === 'Customer' ? 'ERR-AUTH-07' : 'ERR-AUTH-03';
      return next(new AppError(code, 403));
    }
    next();
  };
}
