export interface LanguageConfig {
  id: string;
  displayName: string;
  /** Docker image that contains the toolchain and run.sh entrypoint. */
  image: string;
  /** File name the entrypoint writes the source to (informational). */
  fileName: string;
  /** --pids-limit for the container. */
  pidsLimit: number;
  /** Minimum effective memory limit (MB) for the program. */
  minMemoryMb: number;
  /** Extra container memory (MB) on top of the program limit (e.g. JVM overhead). */
  memoryOverheadMb: number;
  /** Extra time (ms) allowed after the run marker for runtime start-up. */
  startupAllowanceMs: number;
}

/** Add a new language by adding an entry here (plus an image under docker/). */
export const LANGUAGES = {
  python: {
    id: 'python',
    displayName: 'Python 3',
    image: 'exam-runner-python',
    fileName: 'program.py',
    pidsLimit: 64,
    minMemoryMb: 16,
    memoryOverheadMb: 0,
    startupAllowanceMs: 500,
  },
  java: {
    id: 'java',
    displayName: 'Java 21',
    image: 'exam-runner-java',
    fileName: 'Main.java',
    pidsLimit: 128,
    minMemoryMb: 128,
    memoryOverheadMb: 256,
    startupAllowanceMs: 1000,
  },
  cpp: {
    id: 'cpp',
    displayName: 'C++17',
    image: 'exam-runner-cpp',
    fileName: 'Main.cpp',
    pidsLimit: 64,
    minMemoryMb: 256,
    memoryOverheadMb: 0,
    startupAllowanceMs: 200,
  },
} as const satisfies Record<string, LanguageConfig>;

export type LanguageId = keyof typeof LANGUAGES;

export const LANGUAGE_IDS = Object.keys(LANGUAGES) as [LanguageId, ...LanguageId[]];

export function getLanguage(id: string): LanguageConfig {
  const lang = (LANGUAGES as Record<string, LanguageConfig>)[id];
  if (!lang) throw new Error(`Unsupported language: ${id}`);
  return lang;
}

export function listLanguages(): { id: string; name: string; fileName: string }[] {
  return Object.values(LANGUAGES as Record<string, LanguageConfig>).map((l) => ({
    id: l.id,
    name: l.displayName,
    fileName: l.fileName,
  }));
}
