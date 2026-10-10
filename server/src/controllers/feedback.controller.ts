import { Request } from 'express';
import { prisma } from '../config/db';
import { asyncHandler, ok } from '../utils/http';
import { conflict } from '../utils/errors';

export const submitFeedback = asyncHandler(async (req: Request, res) => {
  const feedback = await prisma.feedback
    .create({ data: { ...req.body, submittedById: req.user!.id } })
    .catch((e) => {
      if (e?.code === 'P2002') throw conflict('You have already submitted feedback. Only one submission per student is allowed.', 'ALREADY_SUBMITTED');
      throw e;
    });
  ok(res, { id: feedback.id, submittedAt: feedback.createdAt }, 201);
});

export const getMySubmission = asyncHandler(async (req: Request, res) => {
  const row = await prisma.feedback.findFirst({
    where: { submittedById: req.user!.id },
    select: { id: true, createdAt: true },
  });
  ok(res, row ? { submitted: true, submittedAt: row.createdAt } : { submitted: false });
});

export const listFeedback = asyncHandler(async (_req, res) => {
  const rows = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  ok(res, rows);
});