import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const notFoundHandler = (_req: Request, res: Response) =>
  res.status(404).json({ success: false, message: 'Route not found', errorCode: 'ROUTE_NOT_FOUND' });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false, message: err.message, errorCode: err.errorCode,
      ...(err.details ? { details: err.details } : {}),
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false, message: err.issues[0]?.message ?? 'Validation failed', errorCode: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002')
      return res.status(409).json({ success: false, message: 'A record with the same unique value already exists', errorCode: 'DUPLICATE' });
    if (err.code === 'P2025')
      return res.status(404).json({ success: false, message: 'Record not found', errorCode: 'NOT_FOUND' });
    if (err.code === 'P2003')
      return res.status(409).json({ success: false, message: 'Record is referenced by other data', errorCode: 'IN_USE' });
  }
  if (err?.type === 'entity.too.large')
    return res.status(413).json({ success: false, message: 'Request body too large', errorCode: 'PAYLOAD_TOO_LARGE' });
  if (err?.type === 'entity.parse.failed')
    return res.status(400).json({ success: false, message: 'Invalid JSON body', errorCode: 'INVALID_JSON' });
  console.error('[unhandled]', err);
  return res.status(500).json({ success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' });
};
