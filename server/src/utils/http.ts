import { NextFunction, Request, RequestHandler, Response } from 'express';

export const ok = (res: Response, data: unknown = {}, status = 200) =>
  res.status(status).json({ success: true, data });

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const param = (req: Request, name: string): string => String(req.params[name]);
