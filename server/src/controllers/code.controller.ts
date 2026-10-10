import { asyncHandler, ok } from '../utils/http';
import { executeCode, toApiRunStatus } from '../services/runnerClient';

/** Admin-only sandbox run (question editor / preview). Students run code via /api/attempts/:id/run. */
export const runCode = asyncHandler(async (req, res) => {
  const { language, sourceCode, input, timeLimitMs, memoryLimitMb } = req.body;
  const run = await executeCode({ language, sourceCode, input, timeLimitMs: timeLimitMs ?? 2000, memoryLimitMb: memoryLimitMb ?? 256 });
  ok(res, {
    status: toApiRunStatus(run.status), output: run.stdout, executionTimeMs: run.executionTimeMs,
    ...(run.compilerMessage ? { compilerMessage: run.compilerMessage } : {}),
    ...(run.stderr ? { errorMessage: run.stderr } : {}),
  });
});
