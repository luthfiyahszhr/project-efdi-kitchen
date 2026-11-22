import type { RequestHandler } from 'express';
import { findSession, readSessionCookie, csrfMatches } from '../services/session.service';
import { AppError } from '../utils/errors';

export const loadSession: RequestHandler = async (req, res, next) => {
  try {
    req.session = await findSession(readSessionCookie(req.headers.cookie));
    next();
  } catch (error) {
    next(error);
  }
};

export const requireCsrf: RequestHandler = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  if (!req.session) return next(new AppError('ERR-AUTH-04', 401));
  if (!csrfMatches(req.get('X-CSRF-Token'), req.session)) {
    return next(new AppError('ERR-AUTH-04', 403, 'Token CSRF tidak valid'));
  }
  next();
};
