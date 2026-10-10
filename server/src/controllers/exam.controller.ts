import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler, ok, param } from '../utils/http';
import { badRequest, conflict, notFound } from '../utils/errors';
import { allowedLanguagesOf, buildQuestionViews, examSummary, examWithQuestions, loadExamWithQuestions } from '../services/examView';
import { DEFAULT_LANGUAGES } from '../config/languages';

type QuestionRef = { questionId: string; marks?: number };

async function buildQuestionRows(refs: QuestionRef[], languages?: string[]) {
  const ids = refs.map((r) => r.questionId);
  if (new Set(ids).size !== ids.length) throw badRequest('A question can only be added once', 'DUPLICATE_QUESTION');
  const found = await prisma.question.findMany({ where: { id: { in: ids } } });
  if (found.length !== ids.length) throw badRequest('One or more questions do not exist', 'QUESTION_NOT_FOUND');
  if (languages) assertLanguageCompatible(found, languages);
  const byId = new Map(found.map((q) => [q.id, q]));
  return refs.map((r, i) => ({ questionId: r.questionId, questionNumber: i + 1, marks: r.marks ?? byId.get(r.questionId)!.marks }));
}

/** Every question must support at least one of the exam's languages. */
function assertLanguageCompatible(questions: Array<{ title: string; allowedLanguages: string[] }>, languages: string[]) {
  const bad = questions.find((q) => !q.allowedLanguages.some((l) => languages.includes(l)));
  if (bad) throw badRequest(`Question "${bad.title}" does not support any of the exam's languages`, 'LANGUAGE_MISMATCH');
}

function sameLanguages(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((l) => set.has(l));
}

const examData = (body: any): Prisma.ExamUpdateInput => {
  const { questions: _q, ...rest } = body;
  return rest;
};

export const listExams = asyncHandler(async (_req, res) => {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
    include: { questions: { select: { marks: true } }, _count: { select: { attempts: true } } },
  });
  ok(res, exams.map(({ questions, _count, ...e }) => ({
    ...e, questionCount: questions.length, totalMarks: questions.reduce((s, q) => s + q.marks, 0), attemptCount: _count.attempts,
  })));
});

export const createExam = asyncHandler(async (req, res) => {
  const rows = await buildQuestionRows(req.body.questions ?? [], req.body.languages);
  const exam = await prisma.exam.create({
    data: { ...(examData(req.body) as Prisma.ExamCreateInput), totalMarks: rows.reduce((s, r) => s + r.marks, 0), questions: { create: rows } },
  });
  ok(res, exam, 201);
});

export const getExam = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findUnique({
    where: { id: param(req, 'id') },
    include: { questions: { orderBy: { questionNumber: 'asc' }, include: { question: { include: { testCases: { orderBy: { createdAt: 'asc' } } } } } }, _count: { select: { attempts: true } } },
  });
  if (!exam) throw notFound('Exam not found', 'EXAM_NOT_FOUND');
  ok(res, { ...exam, attemptCount: exam._count.attempts, totalMarks: exam.questions.reduce((s, q) => s + q.marks, 0) });
});

export const updateExam = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const existing = await prisma.exam.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
  if (!existing) throw notFound('Exam not found', 'EXAM_NOT_FOUND');
  if (existing._count.attempts > 0 && req.body.languages && !sameLanguages(existing.languages, req.body.languages))
    throw conflict('Languages cannot be changed after students have started this exam', 'EXAM_LOCKED');
  const data = examData(req.body);
  const languages = req.body.languages ?? existing.languages ?? DEFAULT_LANGUAGES;
  let exam;
  if (req.body.questions) {
    if (existing._count.attempts > 0) throw conflict('Questions cannot be changed after students have started this exam', 'EXAM_LOCKED');
    const rows = await buildQuestionRows(req.body.questions, languages);
    exam = await prisma.$transaction(async (tx) => {
      await tx.examQuestion.deleteMany({ where: { examId: id } });
      return tx.exam.update({ where: { id }, data: { ...data, totalMarks: rows.reduce((s, r) => s + r.marks, 0), questions: { create: rows } } });
    });
  } else {
    exam = await prisma.exam.update({ where: { id }, data });
  }
  ok(res, exam);
});

export const deleteExam = asyncHandler(async (req, res) => {
  await prisma.exam.delete({ where: { id: param(req, 'id') } });
  ok(res, { deleted: true });
});

export const publishExam = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const exam = await loadExamWithQuestions(id);
  if (req.body.published === false) {
    const attempts = await prisma.examAttempt.count({ where: { examId: id } });
    if (attempts > 0) throw conflict('Students have already started this exam. Close it instead.', 'EXAM_HAS_ATTEMPTS');
    return ok(res, await prisma.exam.update({ where: { id }, data: { status: 'DRAFT' } }));
  }
  if (exam.questions.length === 0) throw conflict('Add at least one question before publishing', 'EXAM_INCOMPLETE');
  const missing = exam.questions.find((q) => q.question.testCases.length === 0);
  if (missing) throw conflict(`Question "${missing.question.title}" has no test cases`, 'EXAM_INCOMPLETE');
  assertLanguageCompatible(exam.questions.map((q) => q.question), exam.languages);
  ok(res, await prisma.exam.update({ where: { id }, data: { status: 'PUBLISHED', totalMarks: exam.questions.reduce((s, q) => s + q.marks, 0) } }));
});

export const closeExam = asyncHandler(async (req, res) => {
  ok(res, await prisma.exam.update({ where: { id: param(req, 'id') }, data: { status: 'CLOSED' } }));
});

/** Reopen a closed exam: same completeness checks as publishing, then back to PUBLISHED. */
export const reopenExam = asyncHandler(async (req, res) => {
  const exam = await loadExamWithQuestions(param(req, 'id'));
  if (exam.questions.length === 0) throw conflict('Add at least one question before reopening', 'EXAM_INCOMPLETE');
  const missing = exam.questions.find((q) => q.question.testCases.length === 0);
  if (missing) throw conflict(`Question "${missing.question.title}" has no test cases`, 'EXAM_INCOMPLETE');
  assertLanguageCompatible(exam.questions.map((q) => q.question), exam.languages);
  ok(res, await prisma.exam.update({ where: { id: exam.id }, data: { status: 'PUBLISHED' } }));
});

/** Admin preview: same shape the student sees, but no attempt is created. */
export const previewExam = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: param(req, 'id') }, ...examWithQuestions });
  if (!exam) throw notFound('Exam not found', 'EXAM_NOT_FOUND');
  ok(res, { preview: true, exam: examSummary(exam), allowedLanguages: allowedLanguagesOf(exam), questions: buildQuestionViews(exam) });
});
