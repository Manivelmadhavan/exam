import { Language } from '@prisma/client';
import { env } from '../config/env';
import { LANGUAGE_REGISTRY } from '../config/languages';
import { AppError } from '../utils/errors';

export type RunnerStatus =
  | 'OK' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'INTERNAL_ERROR';
export interface RunnerResult {
  status: RunnerStatus; stdout: string; stderr: string; compilerMessage: string;
  exitCode: number | null; executionTimeMs: number;
}
export interface RunRequest {
  language: Language; sourceCode: string; input: string; timeLimitMs: number; memoryLimitMb: number;
}

/**
 * The API process never executes student code. It only calls the isolated
 * code-runner service, which spawns a locked-down Docker container per run.
 */
export async function executeCode(req: RunRequest): Promise<RunnerResult> {
  try {
    const response = await fetch(`${env.RUNNER_URL}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-runner-token': env.RUNNER_TOKEN },
      body: JSON.stringify({
        language: LANGUAGE_REGISTRY[req.language].runnerKey,
        sourceCode: req.sourceCode, input: req.input,
        timeLimitMs: req.timeLimitMs, memoryLimitMb: req.memoryLimitMb,
      }),
      signal: AbortSignal.timeout(req.timeLimitMs + 40_000),
    });
    if (!response.ok) throw new Error(`runner responded ${response.status}`);
    const result = (await response.json()) as RunnerResult;
    if (result.status === 'INTERNAL_ERROR') throw new Error('runner internal error');
    return result;
  } catch (e) {
    console.error('[runner]', (e as Error).message);
    throw new AppError(503, 'RUNNER_UNAVAILABLE', 'Unable to run code right now. Please try again.');
  }
}

export const toApiRunStatus = (s: RunnerStatus): string => (s === 'OK' ? 'SUCCESS' : s);
