import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const skip = () => env.DISABLE_RATE_LIMIT === 'true' || env.NODE_ENV === 'test';
const handler = { success: false, message: 'Too many requests, please slow down', errorCode: 'RATE_LIMITED' };

export const globalLimiter = rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: true, legacyHeaders: false, skip, message: handler });
export const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, skip, message: handler });
export const runLimiter = rateLimit({
  windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, skip, message: handler,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
});
