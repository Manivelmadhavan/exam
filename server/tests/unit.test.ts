import { describe, expect, it } from 'vitest';
import { normalizeOutput, outputsMatch } from '../src/utils/compare';
import { calculateMarks, calculatePercentage, deriveVerdict } from '../src/utils/scoring';
import { computeExpiresAt, isExpired, remainingSeconds } from '../src/utils/timer';
import { isBlankOrStarter, STARTER_CODE } from '../src/utils/starter';
import { studentCreateSchema, runSchema, questionBodySchema } from '../src/validators';
import { parseLanguage } from '../src/config/languages';

describe('output comparison', () => {
  it('normalizes CRLF, trailing spaces and trailing newlines', () => {
    expect(outputsMatch('30\r\n', '30')).toBe(true);
    expect(outputsMatch('a  \nb \n\n', 'a\nb')).toBe(true);
  });
  it('keeps meaningful whitespace', () => {
    expect(outputsMatch('1 2', '1  2')).toBe(false);
    expect(outputsMatch(' 3', '3')).toBe(false);
  });
  it('strict mode keeps trailing spaces per line', () => {
    expect(outputsMatch('a \n', 'a', true)).toBe(false);
    expect(normalizeOutput('a\r\n\r\n', true)).toBe('a');
  });
});

describe('scoring', () => {
  const outcome = (passed: boolean[]) => passed.map((p) => ({ weight: 1, status: p ? 'ACCEPTED' as const : 'WRONG_ANSWER' as const }));
  it('proportional: 3/5 of 10 marks = 6', () => expect(calculateMarks(10, outcome([true, true, true, false, false]), 'PROPORTIONAL')).toBe(6));
  it('proportional: 5/5 = 10', () => expect(calculateMarks(10, outcome([true, true, true, true, true]), 'PROPORTIONAL')).toBe(10));
  it('full marks only', () => {
    expect(calculateMarks(10, outcome([true, true, true, true, false]), 'FULL_MARKS')).toBe(0);
    expect(calculateMarks(10, outcome([true, true]), 'FULL_MARKS')).toBe(10);
  });
  it('respects test case weights', () => {
    expect(calculateMarks(10, [{ weight: 3, status: 'ACCEPTED' }, { weight: 1, status: 'WRONG_ANSWER' }], 'PROPORTIONAL')).toBe(7.5);
  });
  it('derives verdicts', () => {
    expect(deriveVerdict(outcome([true, true]))).toBe('ACCEPTED');
    expect(deriveVerdict([{ weight: 1, status: 'ACCEPTED' }, { weight: 1, status: 'TIME_LIMIT_EXCEEDED' }])).toBe('TIME_LIMIT_EXCEEDED');
    expect(deriveVerdict([{ weight: 1, status: 'COMPILATION_ERROR' }])).toBe('COMPILATION_ERROR');
  });
  it('percentage', () => {
    expect(calculatePercentage(30, 60)).toBe(50);
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});

describe('server-side timer', () => {
  const start = new Date('2026-01-01T10:00:00Z');
  it('expires after the duration', () => {
    const exp = computeExpiresAt(start, 60, new Date('2026-01-02T00:00:00Z'));
    expect(exp.toISOString()).toBe('2026-01-01T11:00:00.000Z');
  });
  it('never outlives the exam window', () => {
    const exp = computeExpiresAt(start, 60, new Date('2026-01-01T10:30:00Z'));
    expect(exp.toISOString()).toBe('2026-01-01T10:30:00.000Z');
  });
  it('computes remaining time and expiry with grace', () => {
    const exp = new Date('2026-01-01T11:00:00Z');
    expect(remainingSeconds(exp, new Date('2026-01-01T10:59:30Z'))).toBe(30);
    expect(remainingSeconds(exp, new Date('2026-01-01T11:05:00Z'))).toBe(0);
    expect(isExpired(exp, new Date('2026-01-01T11:00:05Z'))).toBe(true);
    expect(isExpired(exp, new Date('2026-01-01T11:00:05Z'), 10_000)).toBe(false);
  });
});

describe('starter code & validators', () => {
  it('detects blank / starter code as unattempted', () => {
    expect(isBlankOrStarter('PYTHON', STARTER_CODE.PYTHON)).toBe(true);
    expect(isBlankOrStarter('CPP', '  ')).toBe(true);
    expect(isBlankOrStarter('PYTHON', 'print(1)')).toBe(false);
  });
  it('parses language aliases', () => {
    expect(parseLanguage('c++')).toBe('CPP');
    expect(parseLanguage('python')).toBe('PYTHON');
    expect(parseLanguage('ruby')).toBeUndefined();
  });
  it('validates student registration', () => {
    expect(studentCreateSchema.safeParse({ studentId: 'S1', name: 'A', password: '123456', year: 'ONE_YEAR' }).success).toBe(true);
    expect(studentCreateSchema.safeParse({ studentId: 'S 1', name: 'A', password: '123456', year: 'ONE_YEAR' }).success).toBe(false);
    expect(studentCreateSchema.safeParse({ studentId: 'S1', name: 'A', password: '1', year: 'ONE_YEAR' }).success).toBe(false);
    expect(studentCreateSchema.safeParse({ studentId: 'S1', name: 'A', password: '123456', year: 'THREE' }).success).toBe(false);
  });
  it('rejects unsupported languages', () => {
    expect(runSchema.safeParse({ questionId: 'q', language: 'ruby', sourceCode: 'x' }).success).toBe(false);
    expect(runSchema.parse({ questionId: 'q', language: 'c++', sourceCode: 'x' }).language).toBe('CPP');
  });
  it('requires at least one allowed language on a question', () => {
    expect(questionBodySchema.safeParse({ title: 't', problemStatement: 'p', allowedLanguages: [] }).success).toBe(false);
  });
});
