import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node', testTimeout: 30000, hookTimeout: 60000, fileParallelism: false,
    env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret-test-secret-test-secret', RUNNER_TOKEN: 'test-runner-token-123456', DISABLE_RATE_LIMIT: 'true' },
  },
});
