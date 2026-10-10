import { Language } from '@prisma/client';

/** Registry: add a language here (and in the code-runner) to support it everywhere. */
export const LANGUAGE_REGISTRY: Record<Language, { runnerKey: string; label: string }> = {
  PYTHON: { runnerKey: 'python', label: 'Python' },
  JAVA: { runnerKey: 'java', label: 'Java' },
  CPP: { runnerKey: 'cpp', label: 'C++' },
};

export const parseLanguage = (value: unknown): Language | undefined => {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase();
  if (v === 'python' || v === 'py') return 'PYTHON';
  if (v === 'java') return 'JAVA';
  if (v === 'cpp' || v === 'c++') return 'CPP';
  return undefined;
};

export const DEFAULT_LANGUAGES: Language[] = ['PYTHON', 'JAVA', 'CPP'];
