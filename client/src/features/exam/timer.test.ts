import { describe, expect, it } from 'vitest';
import { clockOffset, remainingSeconds, timerTone } from './timer';

describe('server clock timer', () => {
  const expiresAt = '2025-01-01T10:30:00.000Z';
  it('uses the server clock rather than the client clock', () => {
    // client clock is 5 minutes behind the server
    const clientNow = Date.parse('2025-01-01T09:55:00.000Z');
    const offset = clockOffset('2025-01-01T10:00:00.000Z', clientNow);
    expect(offset).toBe(5 * 60 * 1000);
    expect(remainingSeconds(expiresAt, offset, clientNow)).toBe(30 * 60);
    // 10 seconds later on the client
    expect(remainingSeconds(expiresAt, offset, clientNow + 10_000)).toBe(30 * 60 - 10);
  });
  it('rounds up and never goes negative', () => {
    expect(remainingSeconds(expiresAt, 0, Date.parse(expiresAt) - 1500)).toBe(2);
    expect(remainingSeconds(expiresAt, 0, Date.parse(expiresAt) + 9000)).toBe(0);
    expect(remainingSeconds('garbage', 0)).toBe(0);
  });
  it('chooses warning tones', () => {
    expect(timerTone(600)).toBe('normal');
    expect(timerTone(299)).toBe('warning');
    expect(timerTone(59)).toBe('danger');
  });
});
