/** Server-authoritative countdown helpers. The client clock is only used as a ticking source. */

/** offset = serverNow - clientNow, captured when the server time was received. */
export const clockOffset = (serverTimeIso: string, clientNowMs: number = Date.now()): number => Date.parse(serverTimeIso) - clientNowMs;

/** Whole seconds left (rounded up so 00:00 only shows once the deadline has really passed). Never negative. */
export function remainingSeconds(expiresAtIso: string, offsetMs: number, clientNowMs: number = Date.now()): number {
  const left = Date.parse(expiresAtIso) - (clientNowMs + offsetMs);
  if (!Number.isFinite(left)) return 0;
  return Math.max(0, Math.ceil(left / 1000));
}

export type TimerTone = 'normal' | 'warning' | 'danger';
/** amber below 5 minutes, red below 1 minute */
export const timerTone = (seconds: number): TimerTone => (seconds < 60 ? 'danger' : seconds < 300 ? 'warning' : 'normal');
