import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  RUNNER_TOKEN: z.string().min(16, 'RUNNER_TOKEN must be at least 16 characters'),
  MAX_CONCURRENT: z.coerce.number().int().min(1).max(64).default(4),
  DOCKER_BIN: z.string().min(1).default('docker'),
});

export interface Config {
  port: number;
  runnerToken: string;
  maxConcurrent: number;
  dockerBin: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${msg}`);
  }
  return {
    port: parsed.data.PORT,
    runnerToken: parsed.data.RUNNER_TOKEN,
    maxConcurrent: parsed.data.MAX_CONCURRENT,
    dockerBin: parsed.data.DOCKER_BIN,
  };
}
