import { Language, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { notFound } from '../utils/errors';
import { isBlankOrStarter } from '../utils/starter';

export const examWithQuestions = Prisma.validator<Prisma.ExamDefaultArgs>()({
  include: { questions: { orderBy: { questionNumber: 'asc' }, include: { question: { include: { testCases: { orderBy: { createdAt: 'asc' } } } } } } },
});
export type ExamWithQuestions = Prisma.ExamGetPayload<typeof examWithQuestions>;

export const examSettings = (e: ExamWithQuestions) => ({
  fullscreenRequired: e.fullscreenRequired, disableCopyPaste: e.disableCopyPaste,
  disableRightClick: e.disableRightClick, tabSwitchDetection: e.tabSwitchDetection,
  maxViolations: e.maxViolations, autoSubmit: e.autoSubmit, showVerdict: e.showVerdict,
});

export const examSummary = (e: ExamWithQuestions) => ({
  id: e.id, title: e.title, description: e.description, instructions: e.instructions, year: e.year,
  durationMinutes: e.durationMinutes, totalMarks: e.questions.reduce((s, q) => s + q.marks, 0),
  questionCount: e.questions.length, startDateTime: e.startDateTime, endDateTime: e.endDateTime,
  status: e.status, languages: e.languages, settings: examSettings(e),
});

type SubmissionLike = {
  questionId: string; language: Language; sourceCode: string; status: string; submissionCount: number;
  obtainedMarks: number; passedTestCases: number; totalTestCases: number;
};

/** Per-question view: intersect the exam's languages with the question's allowed languages. */
export function questionLanguages(exam: ExamWithQuestions, q: { allowedLanguages: Language[] }) {
  const effective = q.allowedLanguages.filter((l) => exam.languages.includes(l));
  return effective.length ? effective : q.allowedLanguages;
}

/** Student-safe question views: hidden test cases are never included. */
export function buildQuestionViews(exam: ExamWithQuestions, submissions: SubmissionLike[] = []) {
  const byQuestion = new Map(submissions.map((s) => [s.questionId, s]));
  return exam.questions.map((eq) => {
    const q = eq.question;
    const sub = byQuestion.get(q.id);
    let submission: Record<string, unknown> | null = null;
    if (sub) {
      const submitted = sub.submissionCount > 0;
      const state = submitted ? 'SUBMITTED' : isBlankOrStarter(sub.language, sub.sourceCode) ? 'NOT_ATTEMPTED' : 'ATTEMPTED';
      submission = {
        language: sub.language, sourceCode: sub.sourceCode, state,
        ...(submitted && exam.showVerdict
          ? { verdict: sub.status, obtainedMarks: sub.obtainedMarks, passedTestCases: sub.passedTestCases, totalTestCases: sub.totalTestCases }
          : {}),
      };
    }
    return {
      id: q.id, questionNumber: eq.questionNumber, marks: eq.marks, title: q.title,
      problemStatement: q.problemStatement, inputFormat: q.inputFormat, outputFormat: q.outputFormat,
      constraints: q.constraints, explanation: q.explanation, sampleInput: q.sampleInput, sampleOutput: q.sampleOutput,
      allowedLanguages: questionLanguages(exam, q), timeLimitMs: q.timeLimitMs, memoryLimitMb: q.memoryLimitMb,
      sampleTests: q.testCases.filter((t) => t.isSample).map((t) => ({ id: t.id, input: t.input, expectedOutput: t.expectedOutput })),
      submission,
    };
  });
}

export async function loadExamWithQuestions(examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, ...examWithQuestions });
  if (!exam) throw notFound('Exam not found', 'EXAM_NOT_FOUND');
  return exam;
}

/** The exam's configured languages are the source of truth for what students can use. */
export const allowedLanguagesOf = (exam: ExamWithQuestions): Language[] => {
  if (exam.languages.length) return exam.languages;
  return [...new Set(exam.questions.flatMap((q) => q.question.allowedLanguages))];
};
