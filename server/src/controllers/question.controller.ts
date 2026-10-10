import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler, ok, param } from '../utils/http';
import { conflict, notFound } from '../utils/errors';

export const listQuestions = asyncHandler(async (req, res) => {
  const { search, language } = req.query as { search?: string; language?: 'PYTHON' | 'JAVA' | 'CPP' };
  const where: Prisma.QuestionWhereInput = {
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    ...(language ? { allowedLanguages: { has: language } } : {}),
  };
  const items = await prisma.question.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { testCases: true, examQuestions: true } } } });
  ok(res, items);
});

export const createQuestion = asyncHandler(async (req, res) => {
  const { testCases, ...data } = req.body;
  const q = await prisma.question.create({ data: { ...data, testCases: { create: testCases ?? [] } }, include: { testCases: true } });
  ok(res, q, 201);
});

export const getQuestion = asyncHandler(async (req, res) => {
  const q = await prisma.question.findUnique({ where: { id: param(req, 'id') }, include: { testCases: { orderBy: { createdAt: 'asc' } }, _count: { select: { examQuestions: true } } } });
  if (!q) throw notFound('Question not found', 'QUESTION_NOT_FOUND');
  ok(res, q);
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { testCases: _ignored, ...data } = req.body; // test cases are managed via /testcases endpoints
  const q = await prisma.question.update({ where: { id: param(req, 'id') }, data, include: { testCases: { orderBy: { createdAt: 'asc' } } } });
  ok(res, q);
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const used = await prisma.examQuestion.count({ where: { questionId: id } });
  if (used > 0) throw conflict('This question is used in an exam. Remove it from the exam first.', 'QUESTION_IN_USE');
  await prisma.question.delete({ where: { id } });
  ok(res, { deleted: true });
});

/* test cases */
export const listTestCases = asyncHandler(async (req, res) => {
  ok(res, await prisma.testCase.findMany({ where: { questionId: param(req, 'questionId') }, orderBy: { createdAt: 'asc' } }));
});
export const createTestCase = asyncHandler(async (req, res) => {
  const questionId = param(req, 'questionId');
  if (!(await prisma.question.findUnique({ where: { id: questionId } }))) throw notFound('Question not found', 'QUESTION_NOT_FOUND');
  ok(res, await prisma.testCase.create({ data: { ...req.body, questionId } }), 201);
});
export const updateTestCase = asyncHandler(async (req, res) => {
  ok(res, await prisma.testCase.update({ where: { id: param(req, 'id') }, data: req.body }));
});
export const deleteTestCase = asyncHandler(async (req, res) => {
  await prisma.testCase.delete({ where: { id: param(req, 'id') } });
  ok(res, { deleted: true });
});
