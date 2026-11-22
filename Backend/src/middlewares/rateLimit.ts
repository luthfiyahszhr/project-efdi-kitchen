import rateLimit from 'express-rate-limit';
import { fail } from '../utils/response';

const responseHandler: Parameters<typeof rateLimit>[0]['handler'] = (req, res) => {
  fail(res, 'ERR-RATE-01', 429, 'Terlalu banyak permintaan. Silakan coba kembali nanti.');
};

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responseHandler,
});

export const lookupRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responseHandler,
});
