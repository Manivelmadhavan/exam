import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config';
import { createExecutor } from './docker';

const config = loadConfig();
const executor = createExecutor({ dockerBin: config.dockerBin, maxConcurrent: config.maxConcurrent });
const app = createApp({ runnerToken: config.runnerToken, executor });

const server = app.listen(config.port, () => {
  console.log(`code-runner listening on port ${config.port} (max concurrent: ${config.maxConcurrent})`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
