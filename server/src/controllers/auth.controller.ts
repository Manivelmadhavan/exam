import { Request, Response } from 'express';
import { asyncHandler, ok } from '../utils/http';
import * as auth from '../services/authService';

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { token, user } = await auth.loginAdmin(req.body.identifier, req.body.password);
  auth.setAuthCookie(res, token);
  ok(res, { user });
});
export const studentLogin = asyncHandler(async (req: Request, res: Response) => {
  const { token, user } = await auth.loginStudent(req.body.studentId, req.body.password);
  auth.setAuthCookie(res, token);
  ok(res, { user: { role: 'STUDENT', ...user } });
});
export const logout = asyncHandler(async (_req, res) => {
  auth.clearAuthCookie(res);
  ok(res, { loggedOut: true });
});
export const me = asyncHandler(async (req, res) => ok(res, { user: await auth.getProfile(req.user!) }));
