import { createHash, timingSafeEqual } from 'node:crypto';
import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Executor } from './docker';
import { LANGUAGE_IDS, listLanguages } from './languages';

export const executeSchema = z.object({
  language: z.enum(LANGUAGE_IDS),
  sourceCode: z.string().max(64 * 1024),
  input: z.string().max(64 * 1024).default(''),
  timeLimitMs: z.number().int().min(100).max(10000).default(2000),
  memoryLimitMb: z.number().int().min(16).max(1024).default(256),
});

function sha256(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

export function tokenMatches(provided: string | undefined, expected: string): boolean {
  // Hash both sides so lengths are equal and the comparison is constant-time.
  const a = sha256(provided ?? '');
  const b = sha256(expected);
  return timingSafeEqual(a, b) && provided !== undefined;
}

export interface AppOptions {
  runnerToken: string;
  executor: Executor;
}

export function createApp(opts: AppOptions): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/languages', (_req, res) => {
    res.json({ languages: listLanguages() });
  });

  const auth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('x-runner-token');
    if (!tokenMatches(header, opts.runnerToken)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };

  app.post('/execute', auth, express.json({ limit: '256kb' }), async (req, res) => {
    const parsed = executeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    try {
      const result = await opts.executor(parsed.data);
      res.json(result);
    } catch (err) {
      console.error('[runner] executor failure:', err);
      res.json({
        status: 'INTERNAL_ERROR',
        stdout: '',
        stderr: 'Internal execution error. Please try again later.',
        compilerMessage: '',
        exitCode: null,
        executionTimeMs: 0,
      });
    }
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (status === 413) {
      res.status(413).json({ error: 'Request body too large' });
    } else if (status >= 400 && status < 500) {
      res.status(status).json({ error: 'Bad request' });
    } else {
      console.error('[runner] unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  app.use(errorHandler);

  return app;
}
