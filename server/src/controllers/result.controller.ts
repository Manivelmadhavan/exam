import { Request, Response } from 'express';
import { asyncHandler, ok, param } from '../utils/http';
import * as results from '../services/resultService';
import { badRequest } from '../utils/errors';

const filtersFrom = (req: Request, forcedYear?: 'ONE_YEAR' | 'TWO_YEAR'): results.ResultFilters => {
  const q = req.query as any;
  // forcedYear comes from the route (1-year / 2-year) and overrides anything in the query string.
  return { ...q, year: forcedYear ?? q.year };
};
const listFor = (forcedYear?: 'ONE_YEAR' | 'TWO_YEAR') =>
  asyncHandler(async (req, res) => ok(res, await results.listAdminResults(filtersFrom(req, forcedYear))));

export const listAllResults = listFor();
export const listOneYearResults = listFor('ONE_YEAR');
export const listTwoYearResults = listFor('TWO_YEAR');

export const exportResults = asyncHandler(async (req: Request, res: Response) => {
  const f = filtersFrom(req);
  const format = (req.query as any).format ?? 'csv';
  if (format !== 'csv' && format !== 'xlsx') throw badRequest('format must be csv or xlsx');
  const file = await results.exportAdminResults(f, format);
  const label = f.year === 'ONE_YEAR' ? '1-year' : f.year === 'TWO_YEAR' ? '2-year' : 'all';
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="results-${label}.${file.ext}"`);
  res.send(file.buffer);
});

export const getAdminResult = asyncHandler(async (req, res) => ok(res, await results.getAdminResult(param(req, 'id'))));
export const getAttemptViolations = asyncHandler(async (req, res) => ok(res, await results.listAttemptViolations(param(req, 'id'))));
export const listViolations = asyncHandler(async (req, res) => {
  const q = req.query as any;
  ok(res, await results.listAdminViolations({ search: q.search, year: q.year, examId: q.examId, type: q.type, page: q.page ?? 1, pageSize: q.pageSize ?? 20 }));
});
export const getDashboard = asyncHandler(async (_req, res) => ok(res, await results.getDashboard()));
export const listMyResults = asyncHandler(async (req, res) => ok(res, await results.listStudentResults(req.user!.id)));
export const getMyResult = asyncHandler(async (req, res) => ok(res, await results.getStudentResult(param(req, 'id'), req.user!.id)));
