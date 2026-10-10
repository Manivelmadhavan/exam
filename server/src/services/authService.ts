import { Response } from 'express';
import { prisma } from '../config/db';
import { env, isProd } from '../config/env';
import { signToken } from '../middleware/auth';
import { DUMMY_HASH, verifyPassword } from '../utils/password';
import { forbidden, unauthorized } from '../utils/errors';

const hoursFromExpiry = () => {
  const m = /^(\d+)([smhd])$/.exec(env.JWT_EXPIRES_IN);
  if (!m) return 8 * 3600_000;
  return Number(m[1]) * { s: 1000, m: 60_000, h: 3600_000, d: 86_400_000 }[m[2] as 's' | 'm' | 'h' | 'd'];
};
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  path: '/',
});
export const setAuthCookie = (res: Response, token: string) =>
  res.cookie(env.COOKIE_NAME, token, { ...cookieOptions(), maxAge: hoursFromExpiry() });
export const clearAuthCookie = (res: Response) => res.clearCookie(env.COOKIE_NAME, cookieOptions());

export async function loginAdmin(identifier: string, password: string) {
  const id = identifier.trim();
  const admin = await prisma.admin.findFirst({ where: { OR: [{ username: id }, { email: id.toLowerCase() }] } });
  const valid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid) throw unauthorized('Invalid username/email or password', 'INVALID_CREDENTIALS');
  return { token: signToken({ sub: admin.id, role: 'ADMIN' }), user: publicAdmin(admin) };
}

export async function loginStudent(studentId: string, password: string) {
  const student = await prisma.student.findUnique({ where: { studentId: studentId.trim() } })
    ?? await prisma.student.findFirst({ where: { studentId: { equals: studentId.trim(), mode: 'insensitive' } } });
  const valid = await verifyPassword(password, student?.passwordHash ?? DUMMY_HASH);
  if (!student || !valid) throw unauthorized('Invalid Student ID or password', 'INVALID_CREDENTIALS');
  if (student.status !== 'ACTIVE') throw forbidden('Your account is deactivated. Contact your teacher.', 'ACCOUNT_INACTIVE');
  return { token: signToken({ sub: student.id, role: 'STUDENT' }), user: publicStudent(student) };
}

export const publicAdmin = (a: { id: string; username: string; email: string; name: string }) => ({
  id: a.id, role: 'ADMIN' as const, username: a.username, email: a.email, name: a.name,
});
export const publicStudent = <T extends { passwordHash?: string }>(s: T) => {
  const { passwordHash: _omit, ...rest } = s;
  return rest;
};

export async function getProfile(user: { id: string; role: 'ADMIN' | 'STUDENT' }) {
  if (user.role === 'ADMIN') {
    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: user.id } });
    return publicAdmin(admin);
  }
  const student = await prisma.student.findUniqueOrThrow({ where: { id: user.id } });
  return { role: 'STUDENT' as const, ...publicStudent(student) };
}
