import { ExecutionStatus, ScoringMode, SubmissionStatus } from '@prisma/client';

export interface TestOutcome { weight: number; status: ExecutionStatus }

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateMarks(maxMarks: number, outcomes: TestOutcome[], mode: ScoringMode): number {
  if (outcomes.length === 0) return 0;
  const totalWeight = outcomes.reduce((s, o) => s + o.weight, 0) || 1;
  const passedWeight = outcomes.filter((o) => o.status === 'ACCEPTED').reduce((s, o) => s + o.weight, 0);
  if (mode === 'FULL_MARKS') return passedWeight === totalWeight ? maxMarks : 0;
  return round2((maxMarks * passedWeight) / totalWeight);
}

/** Overall verdict: ACCEPTED only if every test passes; otherwise the first failing test's status. */
export function deriveVerdict(outcomes: TestOutcome[]): SubmissionStatus {
  if (outcomes.length === 0) return 'WRONG_ANSWER';
  const failed = outcomes.find((o) => o.status !== 'ACCEPTED');
  return failed ? (failed.status as SubmissionStatus) : 'ACCEPTED';
}

export const calculatePercentage = (obtained: number, total: number): number =>
  total > 0 ? round2((obtained / total) * 100) : 0;
