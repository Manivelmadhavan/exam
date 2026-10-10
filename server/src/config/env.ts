import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  RUNNER_URL: z.string().default('http://localhost:4001'),
  RUNNER_TOKEN: z.string().min(16, 'RUNNER_TOKEN must be at least 16 characters'),
  COOKIE_NAME: z.string().default('exam_token'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  EXAM_GRACE_SECONDS: z.coerce.number().default(10),
  SWEEP_INTERVAL_SECONDS: z.coerce.number().default(20),
  DISABLE_RATE_LIMIT: z.enum(['true', 'false']).default('false'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
