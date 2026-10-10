import { NextFunction, Request, Response } from 'express';

/** Removes NUL/control chars (keeps \n \r \t) from every string in the request body. */
const clean = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, clean(v)]));
  }
  return value;
};
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = clean(req.body);
  next();
};
