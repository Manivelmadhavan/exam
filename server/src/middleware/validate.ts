import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';
export const validate = (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true });
    } else {
      (req as any)[source] = result.data;
    }
    next();
  };
