import 'express';
import type { SessionRecord } from '../services/session.service';

export type Role = 'Customer' | 'Admin' | 'Owner';

export interface AuthUser {
  id: number;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: SessionRecord | null;
    }
  }
}
