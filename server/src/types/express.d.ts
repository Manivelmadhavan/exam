import { Year } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: 'ADMIN' | 'STUDENT';
  name: string;
  year?: Year;
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
