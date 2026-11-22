import { z } from 'zod';
import { validateBody } from '../middlewares/validate';

const registerSchema = z.object({
  nama_lengkap: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(100),
  password: z.string().min(8),
  konfirmasi_password: z.string().min(8),
  captcha_token: z.string().min(1).max(4096),
  asal: z.enum(['PESAN', 'KATALOG']).optional().default('KATALOG'),
}).strict();

const loginSchema = z.object({
  kredensial: z.string().trim().max(100).refine((value) => {
    if (value.includes('@')) return z.string().email().safeParse(value).success;
    return value.length >= 4 && value.length <= 50;
  }),
  password: z.string().min(8),
}).strict();

export const register = validateBody(registerSchema);
export const login = validateBody(loginSchema);
