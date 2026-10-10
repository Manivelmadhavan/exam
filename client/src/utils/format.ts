import type { AttemptStatus, ExamYear, Language, SubmissionStatus, Year } from '../types';

export const yearLabel = (y: Year | ExamYear) => (y === 'ONE_YEAR' ? '1 Year' : y === 'TWO_YEAR' ? '2 Year' : 'Both Years');
export const languageLabel = (l: Language) => (l === 'CPP' ? 'C++' : l === 'JAVA' ? 'Java' : 'Python');
export const monacoLanguage = (l: Language) => (l === 'CPP' ? 'cpp' : l === 'JAVA' ? 'java' : 'python');
export const ALL_LANGUAGES: Language[] = ['PYTHON', 'JAVA', 'CPP'];

export const verdictLabel = (s: SubmissionStatus | string) =>
  ({ ACCEPTED: 'Accepted', WRONG_ANSWER: 'Wrong Answer', COMPILATION_ERROR: 'Compilation Error', RUNTIME_ERROR: 'Runtime Error',
     TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded', MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded', NOT_ATTEMPTED: 'Unanswered', DRAFT: 'Draft' } as Record<string, string>)[s] ?? s;
export const attemptStatusLabel = (s: AttemptStatus) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-';
export const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-');

/** 3725 -> "1:02:05" ; 65 -> "01:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
