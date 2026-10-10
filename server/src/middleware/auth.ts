import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { forbidden, unauthorized } from '../utils/errors';

export interface TokenPayload { sub: string; role: 'ADMIN' | 'STUDENT' }

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) throw unauthorized();
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) throw unauthorized('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
      throw unauthorized('Invalid session', 'INVALID_TOKEN');
    }
    if (payload.role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
      if (!admin) throw unauthorized('Account no longer exists', 'INVALID_TOKEN');
      req.user = { id: admin.id, role: 'ADMIN', name: admin.name };
    } else {
      const student = await prisma.student.findUnique({ where: { id: payload.sub } });
      if (!student) throw unauthorized('Account no longer exists', 'INVALID_TOKEN');
      if (student.status !== 'ACTIVE') throw forbidden('Your account is deactivated', 'ACCOUNT_INACTIVE');
      req.user = { id: student.id, role: 'STUDENT', name: student.name, year: student.year };
    }
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole = (...roles: Array<'ADMIN' | 'STUDENT'>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('You do not have permission to access this resource'));
    next();
  };
