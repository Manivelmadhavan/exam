import { ExecutionStatus, Language, Prisma, ScoringMode, SubmissionPolicy, TestCase } from '@prisma/client';
import { prisma } from '../config/db';
import { executeCode, RunnerResult } from './runnerClient';
import { outputsMatch } from '../utils/compare';
import { calculateMarks, deriveVerdict } from '../utils/scoring';
import { badRequest } from '../utils/errors';

const MAX_STORED = 10_000;
const clip = (s: string | undefined | null) => (s ?? '').slice(0, MAX_STORED);

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export const toExecutionStatus = (run: RunnerResult, matches: boolean): ExecutionStatus => {
  switch (run.status) {
    case 'COMPILATION_ERROR': return 'COMPILATION_ERROR';
    case 'TIME_LIMIT_EXCEEDED': return 'TIME_LIMIT_EXCEEDED';
    case 'MEMORY_LIMIT_EXCEEDED': return 'MEMORY_LIMIT_EXCEEDED';
    case 'RUNTIME_ERROR': return 'RUNTIME_ERROR';
    default: return matches ? 'ACCEPTED' : 'WRONG_ANSWER';
  }
};

interface Limits { timeLimitMs: number; memoryLimitMb: number }

/** Runs one test case in the sandbox and compares its output. */
export async function runTestCase(language: Language, sourceCode: string, test: Pick<TestCase, 'input' | 'expectedOutput'>, limits: Limits, strict: boolean) {
  const run = await executeCode({ language, sourceCode, input: test.input, ...limits });
  const matches = run.status === 'OK' && outputsMatch(run.stdout, test.expectedOutput, strict);
  return { run, status: toExecutionStatus(run, matches) };
}

export interface EvaluationInput {
  attemptId: string;
  questionId: string;
  maxMarks: number;
  language: Language;
  sourceCode: string;
  tests: TestCase[];
  limits: Limits;
  scoringMode: ScoringMode;
  policy: SubmissionPolicy;
  strictWhitespace: boolean;
}

/**
 * Executes the code against every test case (hidden ones included), scores it,
 * stores all executions and updates the stored submission (best or latest).
 */
export async function evaluateSubmission(input: EvaluationInput) {
  if (input.tests.length === 0) throw badRequest('This question has no test cases yet', 'NO_TEST_CASES');
  const [first, ...rest] = input.tests;
  const firstRun = await runTestCase(input.language, input.sourceCode, first, input.limits, input.strictWhitespace);
  let runs = [{ test: first, ...firstRun }];
  if (firstRun.status === 'COMPILATION_ERROR') {
    // No point compiling the same code again for every test.
    runs = input.tests.map((test) => ({ test, run: firstRun.run, status: 'COMPILATION_ERROR' as ExecutionStatus }));
  } else {
    const others = await mapLimit(rest, 3, async (test) => ({
      test, ...(await runTestCase(input.language, input.sourceCode, test, input.limits, input.strictWhitespace)),
    }));
    runs = [...runs, ...others];
  }

  const outcomes = runs.map((r) => ({ weight: r.test.weight, status: r.status }));
  const marks = calculateMarks(input.maxMarks, outcomes, input.scoringMode);
  const verdict = deriveVerdict(outcomes);
  const passed = outcomes.filter((o) => o.status === 'ACCEPTED').length;
  const executionTimeMs = Math.max(0, ...runs.map((r) => r.run.executionTimeMs ?? 0));

  return prisma.$transaction(async (tx) => {
    const existing = await tx.questionSubmission.findUnique({
      where: { attemptId_questionId: { attemptId: input.attemptId, questionId: input.questionId } },
    });
    if (!existing) throw badRequest('Nothing saved for this question', 'NO_SUBMISSION');
    const attemptNo = existing.submissionCount + 1;
    await tx.codeExecution.createMany({
      data: runs.map((r) => ({
        submissionId: existing.id, testCaseId: r.test.id, attemptNo,
        input: clip(r.test.input), output: clip(r.run.stdout), expectedOutput: clip(r.test.expectedOutput),
        status: r.status, executionTimeMs: r.run.executionTimeMs ?? 0,
        compilerMessage: r.run.compilerMessage ? clip(r.run.compilerMessage) : null,
        runtimeMessage: r.run.stderr ? clip(r.run.stderr) : null,
      })),
    });
    const keepPrevious = input.policy === 'BEST' && existing.submissionCount > 0 && existing.obtainedMarks > marks;
    const data: Prisma.QuestionSubmissionUpdateInput = keepPrevious
      ? { submissionCount: attemptNo, submittedAt: new Date() }
      : {
          submissionCount: attemptNo, submittedAt: new Date(), status: verdict, obtainedMarks: marks,
          passedTestCases: passed, totalTestCases: input.tests.length, executionTimeMs,
          evaluatedCode: input.sourceCode, evaluatedLanguage: input.language,
        };
    const updated = await tx.questionSubmission.update({ where: { id: existing.id }, data });
    return { submission: updated, latest: { verdict, marks, passed, total: input.tests.length, executionTimeMs } };
  });
}
