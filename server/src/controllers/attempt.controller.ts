import { asyncHandler, ok, param } from '../utils/http';
import * as attempts from '../services/attemptService';

export const getAttempt = asyncHandler(async (req, res) => ok(res, await attempts.getAttemptView(param(req, 'id'), req.user!)));
export const saveCode = asyncHandler(async (req, res) => ok(res, await attempts.saveCode(param(req, 'id'), req.user!.id, req.body.items)));
export const runCode = asyncHandler(async (req, res) => ok(res, await attempts.runForAttempt(param(req, 'id'), req.user!.id, req.body)));
export const submitQuestion = asyncHandler(async (req, res) =>
  ok(res, await attempts.submitQuestion(param(req, 'id'), req.user!.id, param(req, 'questionId'), req.body.language, req.body.sourceCode)));
export const submitExam = asyncHandler(async (req, res) => ok(res, await attempts.submitExam(param(req, 'id'), req.user!.id)));
export const recordViolation = asyncHandler(async (req, res) =>
  ok(res, await attempts.recordViolation(param(req, 'id'), req.user!.id, req.body.type, req.body.details), 201));

export const reopenAttempt = asyncHandler(async (req, res) => ok(res, await attempts.reopenAttempt(param(req, 'id'))));
