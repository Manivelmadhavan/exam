# code-runner

Sandboxed code execution service (Node 20, Express, TypeScript). Every request runs in one throwaway
`docker run` container (no network, read-only rootfs, dropped capabilities, pids/memory/cpu limits).

## Setup

```sh
cp .env.example .env        # set RUNNER_TOKEN (>= 16 chars)
./build-images.sh           # or build-images.cmd on Windows -> exam-runner-{python,java,cpp}
npm install
npm run dev                 # or: npm run build && npm start
npm test                    # docker integration tests auto-skip if docker/images are missing
```

Env: `PORT` (4001), `RUNNER_TOKEN` (required), `MAX_CONCURRENT` (4), `DOCKER_BIN` (docker).
The service needs access to a Docker daemon (the Dockerfile here installs the CLI; mount the socket).

## API

- `GET /health` -> `{status:'ok'}`; `GET /languages`
- `POST /execute` with header `x-runner-token`:
  `{language:'python'|'java'|'cpp', sourceCode, input?, timeLimitMs?(100..10000, 2000), memoryLimitMb?(16..1024, 256)}`
  -> `{status, stdout, stderr, compilerMessage, exitCode, executionTimeMs}` where status is one of
  `OK, COMPILATION_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, INTERNAL_ERROR`.

## Adding a language

Add an entry to `src/languages.ts`, then a `docker/<lang>/` folder (Dockerfile + `run.sh` that prints
`@@RUN@@` to stderr right before running the program and `exit 100` on compile failure) and add it to the build scripts.
