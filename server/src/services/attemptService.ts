import { AttemptStatus, Language, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError, badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { computeExpiresAt, isExpired, remainingSeconds } from '../utils/timer';
import { calculatePercentage } from '../utils/scoring';
import { isBlankOrStarter } from '../utils/starter';
import { executeCode, toApiRunStatus } from './runnerClient';
import { evaluateSubmission, mapLimit, runTestCase } from './evaluationService';
import { buildQuestionViews, examSummary, examWithQuestions, ExamWithQuestions, questionLanguages } from './examView';

const graceMs = () => env.EXAM_GRACE_SECONDS * 1000;
const FINISHED: AttemptStatus[] = ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'];

/* ---------- loading & guards ---------- */

async function loadOwnedAttempt(attemptId: string, studentDbId: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  // 404 rather than 403 so other students' attempt ids cannot be probed.
  if (!attempt || attempt.studentId !== studentDbId) throw notFound('Attempt not found', 'ATTEMPT_NOT_FOUND');
  return attempt;
}

type Attempt = Awaited<ReturnType<typeof loadOwnedAttempt>>;

/** Backend is the source of truth for timing and submission state. */
function assertActive(attempt: Attempt, grace = 0) {
  if (attempt.status !== 'IN_PROGRESS') throw conflict('This exam has already been submitted', 'ATTEMPT_CLOSED');
  if (isExpired(attempt.expiresAt, new Date(), grace)) throw forbidden('Exam session expired', 'EXAM_EXPIRED');
}

async function loadExam(examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, ...examWithQuestions });
  if (!exam) throw notFound('Exam not found', 'EXAM_NOT_FOUND');
  return exam;
}

function questionInExam(exam: ExamWithQuestions, questionId: string) {
  const eq = exam.questions.find((q) => q.questionId === questionId);
  if (!eq) throw badRequest('Question does not belong to this exam', 'QUESTION_NOT_IN_EXAM');
  return eq;
}
function assertLanguageAllowed(allowed: Language[], language: Language) {
  if (!allowed.includes(language)) throw badRequest('This language is not allowed for this question', 'LANGUAGE_NOT_ALLOWED');
}

/* ---------- start / view ---------- */

export async function startAttempt(examId: string, student: { id: string; year: 'ONE_YEAR' | 'TWO_YEAR' }) {
  const exam = await loadExam(examId);
  if (exam.status !== 'PUBLISHED' || (exam.year !== 'BOTH' && exam.year !== student.year))
    throw notFound('Exam not found', 'EXAM_NOT_FOUND');

  const existing = await prisma.examAttempt.findFirst({ where: { examId, studentId: student.id }, orderBy: { attemptNumber: 'desc' } });
  if (existing) {
    if (existing.status === 'IN_PROGRESS' && !isExpired(existing.expiresAt)) return { attemptId: existing.id, resumed: true };
    if (existing.status === 'IN_PROGRESS') await finalizeAttempt(existing.id, 'TIME_EXPIRED');
    throw conflict('You have already attempted this exam', 'ALREADY_ATTEMPTED');
  }
  const now = new Date();
  if (now < exam.startDateTime) throw forbidden('This exam has not started yet', 'EXAM_NOT_STARTED');
  if (now > exam.endDateTime) throw forbidden('This exam has ended', 'EXAM_ENDED');
  if (exam.questions.length === 0) throw conflict('This exam has no questions', 'EXAM_EMPTY');

  try {
    const attempt = await prisma.examAttempt.create({
      data: {
        examId, studentId: student.id, startedAt: now,
        expiresAt: computeExpiresAt(now, exam.durationMinutes, exam.endDateTime),
        totalMarks: exam.questions.reduce((s, q) => s + q.marks, 0),
      },
    });
    return { attemptId: attempt.id, resumed: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await prisma.examAttempt.findFirstOrThrow({ where: { examId, studentId: student.id } });
      return { attemptId: again.id, resumed: true };
    }
    throw e;
  }
}

export async function getAttemptView(attemptId: string, user: { id: string; name: string }) {
  let attempt = await loadOwnedAttempt(attemptId, user.id);
  if (attempt.status === 'IN_PROGRESS' && isExpired(attempt.expiresAt)) {
    await finalizeAttempt(attempt.id, 'TIME_EXPIRED');
    attempt = await loadOwnedAttempt(attemptId, user.id);
  }
  const [exam, student, submissions, result] = await Promise.all([
    loadExam(attempt.examId),
    prisma.student.findUniqueOrThrow({ where: { id: attempt.studentId } }),
    prisma.questionSubmission.findMany({ where: { attemptId } }),
    prisma.result.findUnique({ where: { attemptId } }),
  ]);
  const now = new Date();
  return {
    serverTime: now.toISOString(),
    remainingSeconds: attempt.status === 'IN_PROGRESS' ? remainingSeconds(attempt.expiresAt, now) : 0,
    attempt: {
      id: attempt.id, status: attempt.status, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt, autoSubmitted: attempt.autoSubmitted, resultId: result?.id ?? null,
    },
    exam: examSummary(exam),
    student: { studentId: student.studentId, name: student.name },
    questions: buildQuestionViews(exam, submissions),
  };
}

/* ---------- autosave ---------- */

export async function saveCode(attemptId: string, studentDbId: string, items: Array<{ questionId: string; language: Language; sourceCode: string }>) {
  const attempt = await loadOwnedAttempt(attemptId, studentDbId);
  assertActive(attempt, graceMs()); // short grace so the final flush at 00:00 is not lost
  const exam = await loadExam(attempt.examId);
  for (const item of items) {
    const eq = questionInExam(exam, item.questionId);
    assertLanguageAllowed(questionLanguages(exam, eq.question), item.language);
  }
  await prisma.$transaction(items.map((item) =>
    prisma.questionSubmission.upsert({
      where: { attemptId_questionId: { attemptId, questionId: item.questionId } },
      create: { attemptId, questionId: item.questionId, language: item.language, sourceCode: item.sourceCode },
      update: { language: item.language, sourceCode: item.sourceCode },
    })));
  return { savedAt: new Date().toISOString(), remainingSeconds: remainingSeconds(attempt.expiresAt) };
}

/* ---------- run (does not submit) ---------- */

export async function runForAttempt(
  attemptId: string, studentDbId: string,
  body: { questionId: string; language: Language; sourceCode: string; input: string; mode: 'custom' | 'samples' },
) {
  const attempt = await loadOwnedAttempt(attemptId, studentDbId);
  assertActive(attempt);
  const exam = await loadExam(attempt.examId);
  const eq = questionInExam(exam, body.questionId);
  const q = eq.question;
  assertLanguageAllowed(questionLanguages(exam, q), body.language);
  const limits = { timeLimitMs: q.timeLimitMs, memoryLimitMb: q.memoryLimitMb };

  if (body.mode === 'samples') {
    const samples = q.testCases.filter((t) => t.isSample);
    const results = await mapLimit(samples, 3, async (t) => {
      const { run, status } = await runTestCase(body.language, body.sourceCode, t, limits, exam.strictWhitespace);
      return {
        input: t.input, expectedOutput: t.expectedOutput, output: run.stdout, status,
        passed: status === 'ACCEPTED', executionTimeMs: run.executionTimeMs,
        errorMessage: run.stderr || undefined, compilerMessage: run.compilerMessage || undefined,
      };
    });
    return { mode: 'samples' as const, results };
  }
  const run = await executeCode({ language: body.language, sourceCode: body.sourceCode, input: body.input, ...limits });
  return {
    mode: 'custom' as const, status: toApiRunStatus(run.status), output: run.stdout,
    errorMessage: run.stderr || undefined, compilerMessage: run.compilerMessage || undefined,
    executionTimeMs: run.executionTimeMs,
  };
}

/* ---------- submit one question ---------- */

const evaluating = new Set<string>();

export async function submitQuestion(attemptId: string, studentDbId: string, questionId: string, language: Language, sourceCode: string) {
  const attempt = await loadOwnedAttempt(attemptId, studentDbId);
  assertActive(attempt);
  const exam = await loadExam(attempt.examId);
  const eq = questionInExam(exam, questionId);
  assertLanguageAllowed(questionLanguages(exam, eq.question), language);
  if (isBlankOrStarter(language, sourceCode)) throw badRequest('Write a solution before submitting', 'EMPTY_SOLUTION');

  const key = `${attemptId}:${questionId}`;
  if (evaluating.has(key)) throw conflict('This answer is already being evaluated', 'EVALUATION_IN_PROGRESS');
  evaluating.add(key);
  try {
    await prisma.questionSubmission.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, language, sourceCode },
      update: { language, sourceCode },
    });
    const { latest, submission } = await evaluateSubmission({
      attemptId, questionId, maxMarks: eq.marks, language, sourceCode, tests: eq.question.testCases,
      limits: { timeLimitMs: eq.question.timeLimitMs, memoryLimitMb: eq.question.memoryLimitMb },
      scoringMode: exam.scoringMode, policy: exam.submissionPolicy, strictWhitespace: exam.strictWhitespace,
    });
    if (!exam.showVerdict) return { submitted: true, state: 'SUBMITTED' as const };
    return {
      submitted: true, state: 'SUBMITTED' as const,
      verdict: submission.status, obtainedMarks: submission.obtainedMarks, maxMarks: eq.marks,
      passedTestCases: submission.passedTestCases, totalTestCases: submission.totalTestCases,
      executionTimeMs: submission.executionTimeMs, thisRun: latest,
    };
  } finally {
    evaluating.delete(key);
  }
}

/* ---------- finalisation (manual, timer, violations) ---------- */

export type FinalizeReason = 'MANUAL' | 'TIME_EXPIRED' | 'MAX_VIOLATIONS';
const finalizing = new Set<string>();

export async function waitForResult(attemptId: string, timeoutMs = 180_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await prisma.result.findUnique({ where: { attemptId } });
    if (result) return result.id;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new AppError(504, 'EVALUATION_PENDING', 'Your exam is submitted and still being evaluated. Check My Results shortly.');
}

/** Idempotent: claims the attempt once, then evaluates and stores the result. */
export async function finalizeAttempt(attemptId: string, reason: FinalizeReason): Promise<string> {
  const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.status === 'IN_PROGRESS') {
    const now = new Date();
    const auto = reason !== 'MANUAL' || now > attempt.expiresAt;
    const claim = await prisma.examAttempt.updateMany({
      where: { id: attemptId, status: 'IN_PROGRESS' },
      data: { status: auto ? 'AUTO_SUBMITTED' : 'SUBMITTED', autoSubmitted: auto, finalizeReason: reason, submittedAt: now },
    });
    if (claim.count === 0) return waitForResult(attemptId);
  }
  return completeFinalization(attemptId);
}

export async function completeFinalization(attemptId: string): Promise<string> {
  const done = await prisma.result.findUnique({ where: { attemptId } });
  if (done) return done.id;
  if (finalizing.has(attemptId)) return waitForResult(attemptId);
  finalizing.add(attemptId);
  try {
    const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    const exam = await loadExam(attempt.examId);

    // Evaluate answers that were saved but never submitted (submitted ones are already scored).
    const existing = await prisma.questionSubmission.findMany({ where: { attemptId } });
    const pending = existing.filter((s) => s.submissionCount === 0 && !isBlankOrStarter(s.language, s.sourceCode));
    for (const sub of pending) {
      const eq = exam.questions.find((q) => q.questionId === sub.questionId);
      if (!eq || eq.question.testCases.length === 0) continue;
      await evaluateSubmission({
        attemptId, questionId: sub.questionId, maxMarks: eq.marks, language: sub.language, sourceCode: sub.sourceCode,
        tests: eq.question.testCases,
        limits: { timeLimitMs: eq.question.timeLimitMs, memoryLimitMb: eq.question.memoryLimitMb },
        scoringMode: exam.scoringMode, policy: exam.submissionPolicy, strictWhitespace: exam.strictWhitespace,
      });
    }

    const subs = new Map((await prisma.questionSubmission.findMany({ where: { attemptId } })).map((s) => [s.questionId, s]));
    const details = exam.questions.map((eq) => {
      const s = subs.get(eq.questionId);
      const submitted = !!s && s.submissionCount > 0;
      return {
        questionId: eq.questionId, questionNumber: eq.questionNumber, questionTitle: eq.question.title,
        language: submitted ? s!.evaluatedLanguage : s?.language ?? null,
        status: submitted ? s!.status : ('NOT_ATTEMPTED' as const),
        marks: submitted ? Math.min(s!.obtainedMarks, eq.marks) : 0, maxMarks: eq.marks,
        passedTestCases: submitted ? s!.passedTestCases : 0,
        totalTestCases: submitted ? s!.totalTestCases : eq.question.testCases.length,
        executionTimeMs: submitted ? s!.executionTimeMs : null,
        sourceCode: submitted ? s!.evaluatedCode : s && !isBlankOrStarter(s.language, s.sourceCode) ? s.sourceCode : null,
        submitted,
      };
    });
    const totalMarks = details.reduce((a, d) => a + d.maxMarks, 0);
    const obtained = Math.round(details.reduce((a, d) => a + d.marks, 0) * 100) / 100;
    const attempted = details.filter((d) => d.submitted).length;
    const accepted = details.filter((d) => d.status === 'ACCEPTED').length;
    const submittedAt = attempt.submittedAt ?? new Date();
    const effectiveEnd = Math.min(submittedAt.getTime(), attempt.expiresAt.getTime());
    const timeTaken = Math.max(0, Math.floor((effectiveEnd - attempt.startedAt.getTime()) / 1000));
    const percentage = calculatePercentage(obtained, totalMarks);

    const resultId = await prisma.$transaction(async (tx) => {
      const result = await tx.result.upsert({
        where: { attemptId },
        create: {
          attemptId, studentId: attempt.studentId, examId: attempt.examId, totalQuestions: details.length,
          totalMarks, obtainedMarks: obtained, percentage, attemptedCount: attempted, acceptedCount: accepted,
          wrongAnswerCount: attempted - accepted, unansweredCount: details.length - attempted,
          timeTakenSeconds: timeTaken, submittedAt,
        },
        update: {},
      });
      await tx.resultDetail.deleteMany({ where: { resultId: result.id } });
      await tx.resultDetail.createMany({
        data: details.map(({ submitted: _s, ...d }) => ({ ...d, resultId: result.id })),
      });
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: { status: 'EVALUATED', totalMarks, obtainedMarks: obtained, percentage, timeTakenSeconds: timeTaken, submittedAt },
      });
      return result.id;
    });
    return resultId;
  } finally {
    finalizing.delete(attemptId);
  }
}

export const submitExam = async (attemptId: string, studentDbId: string) => {
  await loadOwnedAttempt(attemptId, studentDbId);
  const resultId = await finalizeAttempt(attemptId, 'MANUAL');
  const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  return { resultId, autoSubmitted: attempt.autoSubmitted, status: attempt.status };
};

/* ---------- admin: reopen a single student's attempt ---------- */

/**
 * Reopen a finished attempt for one student: keep their saved code and submissions,
 * drop the finalized result (so it is scored again on resubmit), and give a fresh
 * full-duration clock. If the exam itself was closed, make it visible again.
 */
export async function reopenAttempt(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw notFound('Attempt not found', 'ATTEMPT_NOT_FOUND');
  const exam = await loadExam(attempt.examId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + exam.durationMinutes * 60_000);
  await prisma.$transaction([
    prisma.result.deleteMany({ where: { attemptId } }),
    prisma.examAttempt.update({
      where: { id: attemptId },
      data: { status: 'IN_PROGRESS', autoSubmitted: false, finalizeReason: null, submittedAt: null, startedAt: now, expiresAt },
    }),
    ...(exam.status === 'CLOSED'
      ? [prisma.exam.update({ where: { id: exam.id }, data: { status: 'PUBLISHED' } })]
      : []),
  ]);
  return { attemptId, examId: exam.id, examTitle: exam.title, status: 'IN_PROGRESS' as const, expiresAt, durationMinutes: exam.durationMinutes };
}

/* ---------- violations ---------- */

const COUNTED = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'PAGE_LEAVE'] as const;

export async function recordViolation(attemptId: string, studentDbId: string, type: (typeof COUNTED)[number] | 'RIGHT_CLICK', details?: string) {
  const attempt = await loadOwnedAttempt(attemptId, studentDbId);
  if (attempt.status !== 'IN_PROGRESS') return { count: 0, max: 0, autoSubmitted: false };
  await prisma.examViolation.create({ data: { attemptId, studentId: studentDbId, type, details } });
  const exam = await prisma.exam.findUniqueOrThrow({ where: { id: attempt.examId } });
  const count = await prisma.examViolation.count({ where: { attemptId, type: { in: [...COUNTED] } } });
  if (exam.maxViolations > 0 && count >= exam.maxViolations) {
    const resultId = await finalizeAttempt(attemptId, 'MAX_VIOLATIONS');
    return { count, max: exam.maxViolations, autoSubmitted: true, resultId };
  }
  return { count, max: exam.maxViolations, autoSubmitted: false };
}

/* ---------- background sweeper: auto-submit expired attempts even if the browser is closed ---------- */

export async function sweepOnce(now = new Date()) {
  const expired = await prisma.examAttempt.findMany({
    where: { status: 'IN_PROGRESS', expiresAt: { lt: new Date(now.getTime() - 2000) } }, select: { id: true }, take: 50,
  });
  for (const a of expired) await finalizeAttempt(a.id, 'TIME_EXPIRED').catch((e) => console.error('[sweeper]', a.id, e.message));
  const stuck = await prisma.examAttempt.findMany({
    where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] }, result: null, submittedAt: { lt: new Date(now.getTime() - 60_000) } },
    select: { id: true }, take: 50,
  });
  for (const a of stuck) await completeFinalization(a.id).catch((e) => console.error('[sweeper:retry]', a.id, e.message));
  return { expired: expired.length, retried: stuck.length };
}

export function startSweeper() {
  const timer = setInterval(() => { sweepOnce().catch((e) => console.error('[sweeper]', e)); }, env.SWEEP_INTERVAL_SECONDS * 1000);
  timer.unref();
  return timer;
}

export { FINISHED };
