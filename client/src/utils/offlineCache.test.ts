import { beforeEach, describe, expect, it } from 'vitest';
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null), setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; }, key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
};
import { clearAttemptCache, dirtyEntries, markClean, readCache, writeCache } from './offlineCache';

describe('offline code cache', () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });
  it('keeps unsynced code until it is marked clean', () => {
    writeCache('a1', 'q1', { language: 'PYTHON', sourceCode: 'print(1)', dirty: true, updatedAt: 1 });
    expect(dirtyEntries('a1')).toHaveLength(1);
    markClean('a1', 'q1');
    expect(dirtyEntries('a1')).toHaveLength(0);
    expect(readCache('a1', 'q1')?.sourceCode).toBe('print(1)');
  });
  it('clears an attempt cache', () => {
    writeCache('a1', 'q1', { language: 'JAVA', sourceCode: 'x', dirty: true, updatedAt: 1 });
    clearAttemptCache('a1');
    expect(readCache('a1', 'q1')).toBeNull();
  });
});
