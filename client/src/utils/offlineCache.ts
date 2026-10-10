import type { Language } from '../types';

/** Local cache of student code so nothing is lost if the network drops or the tab reloads. */
export interface CachedCode { language: Language; sourceCode: string; dirty: boolean; updatedAt: number }
const key = (attemptId: string, questionId: string) => `exam:${attemptId}:${questionId}`;

export function readCache(attemptId: string, questionId: string): CachedCode | null {
  try { const raw = localStorage.getItem(key(attemptId, questionId)); return raw ? (JSON.parse(raw) as CachedCode) : null; } catch { return null; }
}
export function writeCache(attemptId: string, questionId: string, value: CachedCode) {
  try { localStorage.setItem(key(attemptId, questionId), JSON.stringify(value)); } catch { /* storage unavailable - server autosave still works */ }
}
export function markClean(attemptId: string, questionId: string) {
  const c = readCache(attemptId, questionId);
  if (c) writeCache(attemptId, questionId, { ...c, dirty: false });
}
export function dirtyEntries(attemptId: string): Array<{ questionId: string } & CachedCode> {
  const out: Array<{ questionId: string } & CachedCode> = [];
  try {
    const prefix = `exam:${attemptId}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) {
        const c = JSON.parse(localStorage.getItem(k) ?? 'null') as CachedCode | null;
        if (c?.dirty) out.push({ questionId: k.slice(prefix.length), ...c });
      }
    }
  } catch { /* ignore */ }
  return out;
}
export function clearAttemptCache(attemptId: string) {
  try {
    const prefix = `exam:${attemptId}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(prefix)) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
