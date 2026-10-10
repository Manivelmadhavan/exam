import { Prisma, Year } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../config/db';
import { notFound } from '../utils/errors';

export interface ResultFilters {
  year?: Year; examId?: string; studentId?: string; search?: string; status?: string;
  from?: Date; to?: Date; sortBy: 'marks' | 'percentage' | 'submittedAt' | 'name'; order: 'asc' | 'desc';
  page: number; pageSize: number;
}

export function buildWhere(f: ResultFilters): Prisma.ResultWhereInput {
  const and: Prisma.ResultWhereInput[] = [];
  // The year filter is enforced here, in the database query - never only in the UI.
  if (f.year) and.push({ student: { year: f.year } });
  if (f.examId) and.push({ examId: f.examId });
  if (f.studentId) and.push({ student: { studentId: { contains: f.studentId, mode: 'insensitive' } } });
  if (f.status) and.push({ attempt: { status: f.status as never } });
  if (f.from || f.to) and.push({ submittedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } });
  if (f.search) {
    and.push({ OR: [
      { student: { studentId: { contains: f.search, mode: 'insensitive' } } },
      { student: { name: { contains: f.search, mode: 'insensitive' } } },
      { exam: { title: { contains: f.search, mode: 'insensitive' } } },
    ] });
  }
  return { AND: and };
}

const orderBy = (f: ResultFilters): Prisma.ResultOrderByWithRelationInput =>
  f.sortBy === 'marks' ? { obtainedMarks: f.order }
  : f.sortBy === 'percentage' ? { percentage: f.order }
  : f.sortBy === 'name' ? { student: { name: f.order } }
  : { submittedAt: f.order };

const resultInclude = {
  student: { select: { studentId: true, name: true, year: true } },
  exam: { select: { id: true, title: true, year: true } },
  attempt: { select: { status: true, autoSubmitted: true, finalizeReason: true } },
} satisfies Prisma.ResultInclude;

const toRow = (r: Prisma.ResultGetPayload<{ include: typeof resultInclude }>) => ({
  id: r.id, studentId: r.student.studentId, studentName: r.student.name, year: r.student.year,
  examId: r.exam.id, examTitle: r.exam.title, totalQuestions: r.totalQuestions,
  attemptedCount: r.attemptedCount, acceptedCount: r.acceptedCount,
  obtainedMarks: r.obtainedMarks, totalMarks: r.totalMarks, percentage: r.percentage,
  timeTakenSeconds: r.timeTakenSeconds, submittedAt: r.submittedAt,
  status: r.attempt.status, autoSubmitted: r.attempt.autoSubmitted,
});

export async function listAdminResults(f: ResultFilters) {
  const where = buildWhere(f);
  const [total, rows] = await Promise.all([
    prisma.result.count({ where }),
    prisma.result.findMany({ where, include: resultInclude, orderBy: orderBy(f), skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
  ]);
  return { items: rows.map(toRow), total, page: f.page, pageSize: f.pageSize };
}

export async function exportAdminResults(f: ResultFilters, format: 'csv' | 'xlsx') {
  const rows = (await prisma.result.findMany({ where: buildWhere(f), include: resultInclude, orderBy: orderBy(f) })).map(toRow);
  const headers = ['Student ID', 'Student Name', 'Exam', 'Year', 'Questions', 'Attempted', 'Accepted', 'Marks Obtained', 'Total Marks', 'Percentage', 'Time Taken (s)', 'Submitted At', 'Status'];
  const yearLabel = (y: string) => (y === 'ONE_YEAR' ? '1 Year' : '2 Year');
  const data = rows.map((r) => [r.studentId, r.studentName, r.examTitle, yearLabel(r.year), r.totalQuestions, r.attemptedCount,
    r.acceptedCount, r.obtainedMarks, r.totalMarks, r.percentage, r.timeTakenSeconds, r.submittedAt.toISOString(), r.autoSubmitted ? `${r.status} (auto)` : r.status]);
  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Results');
    ws.addRow(headers).font = { bold: true };
    data.forEach((d) => ws.addRow(d));
    ws.columns.forEach((c) => { c.width = 18; });
    return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
  }
  // Prefix risky leading characters so spreadsheet apps do not evaluate cells as formulas.
  const esc = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers, ...data].map((r) => r.map(esc).join(',')).join('\r\n');
  return { buffer: Buffer.from('﻿' + csv, 'utf8'), contentType: 'text/csv; charset=utf-8', ext: 'csv' };
}

export async function getAdminResult(id: string) {
  const result = await prisma.result.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, studentId: true, name: true, year: true, email: true, department: true, batch: true } },
      exam: { select: { id: true, title: true, year: true, durationMinutes: true } },
      attempt: { include: { violations: { orderBy: { createdAt: 'asc' } }, submissions: { include: { executions: { orderBy: { createdAt: 'asc' } } } } } },
      details: { orderBy: { questionNumber: 'asc' } },
    },
  });
  if (!result) throw notFound('Result not found', 'RESULT_NOT_FOUND');
  const subByQuestion = new Map(result.attempt.submissions.map((s) => [s.questionId, s]));
  const { attempt, details, ...rest } = result;
  return {
    ...rest,
    attempt: { id: attempt.id, status: attempt.status, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, submittedAt: attempt.submittedAt, autoSubmitted: attempt.autoSubmitted, finalizeReason: attempt.finalizeReason },
    violations: attempt.violations,
    details: details.map((d) => {
      const sub = subByQuestion.get(d.questionId);
      const latestNo = sub?.submissionCount ?? 0;
      return { ...d, executions: (sub?.executions ?? []).filter((e) => e.attemptNo === latestNo) };
    }),
  };
}

export async function listAttemptViolations(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { student: { select: { studentId: true, name: true } } } });
  if (!attempt) throw notFound('Attempt not found', 'ATTEMPT_NOT_FOUND');
  const violations = await prisma.examViolation.findMany({ where: { attemptId }, orderBy: { createdAt: 'asc' } });
  return { attemptId, student: attempt.student, total: violations.length, violations };
}

export interface ViolationFilters {
  search?: string; year?: Year; examId?: string; type?: string; page: number; pageSize: number;
}

function violationWhere(f: ViolationFilters): Prisma.ExamViolationWhereInput {
  const and: Prisma.ExamViolationWhereInput[] = [];
  if (f.type) and.push({ type: f.type as never });
  if (f.year) and.push({ student: { year: f.year } });
  if (f.examId) and.push({ attempt: { examId: f.examId } });
  if (f.search) {
    and.push({ OR: [
      { student: { studentId: { contains: f.search, mode: 'insensitive' } } },
      { student: { name: { contains: f.search, mode: 'insensitive' } } },
      { attempt: { exam: { title: { contains: f.search, mode: 'insensitive' } } } },
    ] });
  }
  return { AND: and };
}

/** All violations of each student, collapsed into one group per student (paginated by student). */
export async function listAdminViolations(f: ViolationFilters) {
  const where = violationWhere(f);
  const groups = await prisma.examViolation.groupBy({
    by: ['studentId'], where, _count: { _all: true }, orderBy: { _count: { studentId: 'desc' } },
  });
  const pageGroups = groups.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);
  const ids = pageGroups.map((g) => g.studentId);
  const [students, violations] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, studentId: true, name: true, year: true } }),
    prisma.examViolation.findMany({
      where: { AND: [{ studentId: { in: ids } }, where] },
      orderBy: { createdAt: 'desc' },
      include: {
        attempt: { select: { id: true, status: true, autoSubmitted: true, finalizeReason: true, exam: { select: { id: true, title: true, durationMinutes: true } } } },
      },
    }),
  ]);

  type Group = {
    student: { id: string; studentId: string; name: string; year: Year };
    total: number;
    attempts: Array<{ attemptId: string; examId: string; examTitle: string; durationMinutes: number; status: string; autoSubmitted: boolean; finalizeReason: string | null; canReopen: boolean }>;
    violations: Array<{ id: string; type: string; details: string | null; createdAt: Date; examId: string; examTitle: string; attemptId: string }>;
  };
  const studentById = new Map(students.map((s) => [s.id, s]));
  const grouped = new Map<string, Group>();
  for (const v of violations) {
    const student = studentById.get(v.studentId);
    if (!student) continue;
    let g = grouped.get(v.studentId);
    if (!g) { g = { student, total: 0, attempts: [], violations: [] }; grouped.set(v.studentId, g); }
    g.total += 1;
    if (!g.attempts.some((a) => a.attemptId === v.attempt.id)) {
      g.attempts.push({
        attemptId: v.attempt.id, examId: v.attempt.exam.id, examTitle: v.attempt.exam.title,
        durationMinutes: v.attempt.exam.durationMinutes, status: v.attempt.status,
        autoSubmitted: v.attempt.autoSubmitted, finalizeReason: v.attempt.finalizeReason,
        canReopen: v.attempt.status !== 'IN_PROGRESS',
      });
    }
    g.violations.push({
      id: v.id, type: v.type, details: v.details, createdAt: v.createdAt,
      examId: v.attempt.exam.id, examTitle: v.attempt.exam.title, attemptId: v.attempt.id,
    });
  }
  const items = pageGroups.map((g) => grouped.get(g.studentId)).filter((g): g is Group => !!g);
  return { items, total: groups.length, page: f.page, pageSize: f.pageSize };
}

/* ---------- student side ---------- */

export async function listStudentResults(studentDbId: string) {
  const rows = await prisma.result.findMany({
    where: { studentId: studentDbId }, orderBy: { submittedAt: 'desc' },
    include: { exam: { select: { id: true, title: true } }, attempt: { select: { status: true, autoSubmitted: true } } },
  });
  return rows.map((r) => ({
    id: r.id, examId: r.exam.id, examTitle: r.exam.title, submittedAt: r.submittedAt,
    obtainedMarks: r.obtainedMarks, totalMarks: r.totalMarks, percentage: r.percentage,
    status: r.attempt.status, autoSubmitted: r.attempt.autoSubmitted,
  }));
}

export async function getStudentResult(resultId: string, studentDbId: string) {
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    include: {
      student: { select: { studentId: true, name: true, year: true } },
      exam: { select: { id: true, title: true, year: true, showVerdict: true } },
      attempt: { select: { status: true, autoSubmitted: true, startedAt: true } },
      details: { orderBy: { questionNumber: 'asc' } },
    },
  });
  if (!result || result.studentId !== studentDbId) throw notFound('Result not found', 'RESULT_NOT_FOUND');
  // Only per-question counts are exposed. Hidden test inputs/outputs are never returned to students.
  return result;
}

/* ---------- dashboard ---------- */

export async function getDashboard() {
  const now = new Date();
  const [oneYear, twoYear, exams, results] = await Promise.all([
    prisma.student.count({ where: { year: 'ONE_YEAR' } }),
    prisma.student.count({ where: { year: 'TWO_YEAR' } }),
    prisma.exam.findMany({ orderBy: { startDateTime: 'desc' } }),
    prisma.result.findMany({ select: { examId: true, obtainedMarks: true, percentage: true, student: { select: { year: true } } } }),
  ]);
  const activeExams = exams.filter((e) => e.status === 'PUBLISHED' && e.startDateTime <= now && e.endDateTime >= now).length;
  const completedExams = exams.filter((e) => e.status === 'CLOSED' || (e.status === 'PUBLISHED' && e.endDateTime < now)).length;
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);

  const perExam = exams.slice(0, 10).reverse().map((e) => {
    const rs = results.filter((r) => r.examId === e.id);
    const y1 = rs.filter((r) => r.student.year === 'ONE_YEAR');
    const y2 = rs.filter((r) => r.student.year === 'TWO_YEAR');
    return {
      exam: e.title, participants: rs.length, averageMarks: avg(rs.map((r) => r.obtainedMarks)),
      averagePercentage: avg(rs.map((r) => r.percentage)),
      oneYearAverage: avg(y1.map((r) => r.percentage)), twoYearAverage: avg(y2.map((r) => r.percentage)),
    };
  });
  const yearPerf = (['ONE_YEAR', 'TWO_YEAR'] as const).map((y) => {
    const rs = results.filter((r) => r.student.year === y);
    return { year: y === 'ONE_YEAR' ? '1 Year' : '2 Year', averagePercentage: avg(rs.map((r) => r.percentage)), submissions: rs.length };
  });
  return {
    cards: {
      totalStudents: oneYear + twoYear, oneYearStudents: oneYear, twoYearStudents: twoYear,
      totalExams: exams.length, activeExams, completedExams, totalSubmissions: results.length,
      averageScore: avg(results.map((r) => r.percentage)),
    },
    charts: { perExam, yearPerformance: yearPerf },
  };
}
