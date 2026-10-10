/** Server-side exam clock helpers. The attempt never outlives the exam window. */
export function computeExpiresAt(startedAt: Date, durationMinutes: number, examEnd: Date): Date {
  const byDuration = startedAt.getTime() + durationMinutes * 60_000;
  return new Date(Math.min(byDuration, examEnd.getTime()));
}
export const isExpired = (expiresAt: Date, now: Date = new Date(), graceMs = 0): boolean =>
  now.getTime() > expiresAt.getTime() + graceMs;
export const remainingSeconds = (expiresAt: Date, now: Date = new Date()): number =>
  Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
