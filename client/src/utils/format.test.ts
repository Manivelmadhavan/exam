import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, yearLabel, verdictLabel } from './format';

describe('format helpers', () => {
  it('formats the countdown clock', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-5)).toBe('00:00');
  });
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3900)).toBe('1h 5m');
  });
  it('labels years and verdicts', () => {
    expect(yearLabel('ONE_YEAR')).toBe('1 Year');
    expect(yearLabel('BOTH')).toBe('Both Years');
    expect(verdictLabel('TIME_LIMIT_EXCEEDED')).toBe('Time Limit Exceeded');
  });
});
