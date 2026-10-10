import { prisma } from '../config/db';
import { asyncHandler, ok, param } from '../utils/http';
import { notFound } from '../utils/errors';
import { isExpired } from '../utils/timer';
import { allowedLanguagesOf, examWithQuestions, examSettings } from '../services/examView';
import { startAttempt } from '../services/attemptService';

const visibleTo = (year: 'ONE_YEAR' | 'TWO_YEAR') => ({ status: 'PUBLISHED' as const, year: { in: [year, 'BOTH' as const] } });

function availability(exam: { startDateTime: Date; endDateTime: Date }, attempt?: { status: string; expiresAt: Date }) {
  const now = new Date();
  if (attempt) {
    if (attempt.status === 'IN_PROGRESS' && !isExpired(attempt.expiresAt, now)) return 'IN_PROGRESS';
    return 'COMPLETED';
  }
  if (now < exam.startDateTime) return 'UPCOMING';
  if (now > exam.endDateTime) return 'MISSED';
  return 'AVAILABLE';
}

export const listStudentExams = asyncHandler(async (req, res) => {
  const user = req.user!;
  const exams = await prisma.exam.findMany({
    where: visibleTo(user.year!), orderBy: { startDateTime: 'desc' },
    include: { questions: { select: { marks: true } }, attempts: { where: { studentId: user.id }, include: { result: { select: { id: true } } } } },
  });
  ok(res, exams.map((e) => {
    const attempt = e.attempts[0];
    return {
      id: e.id, title: e.title, description: e.description, year: e.year, durationMinutes: e.durationMinutes,
      questionCount: e.questions.length, totalMarks: e.questions.reduce((s, q) => s + q.marks, 0),
      startDateTime: e.startDateTime, endDateTime: e.endDateTime,
      availability: availability(e, attempt), attemptId: attempt?.id ?? null, resultId: attempt?.result?.id ?? null,
    };
  }));
});

export const getStudentExam = asyncHandler(async (req, res) => {
  const user = req.user!;
  const exam = await prisma.exam.findFirst({ where: { id: param(req, 'examId'), ...visibleTo(user.year!) }, ...examWithQuestions });
  if (!exam) throw notFound('Exam not found', 'EXAM_NOT_FOUND');
  const attempt = await prisma.examAttempt.findFirst({ where: { examId: exam.id, studentId: user.id }, include: { result: { select: { id: true } } } });
  ok(res, {
    id: exam.id, title: exam.title, description: exam.description, instructions: exam.instructions, year: exam.year,
    durationMinutes: exam.durationMinutes, questionCount: exam.questions.length,
    totalMarks: exam.questions.reduce((s, q) => s + q.marks, 0), startDateTime: exam.startDateTime, endDateTime: exam.endDateTime,
    allowedLanguages: allowedLanguagesOf(exam), settings: examSettings(exam),
    availability: availability(exam, attempt ?? undefined), attemptId: attempt?.id ?? null, resultId: attempt?.result?.id ?? null,
  });
});

export const startStudentExam = asyncHandler(async (req, res) => {
  const user = req.user!;
  ok(res, await startAttempt(param(req, 'examId'), { id: user.id, year: user.year! }), 201);
});
