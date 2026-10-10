# Online Programming Examination System

A full-stack platform where a teacher can run **Python, Java and C++** programming exams online. Students log in, take timed exams in a Monaco code editor, and their code is executed and graded automatically inside isolated Docker containers.

## 1. Project overview
Two portals:
* **Teacher/Admin portal** - dashboard, student management, exam builder (6-step wizard), question bank with test cases, results (separate **1st Year** and **2nd Year** pages), CSV/Excel export, violation logs.
* **Student portal** - dashboard, exam overview, full-screen coding interface with autosave, custom-input runs, per-question submit, final submit, automatic submit when time ends, result history.

## 2. Features
* JWT in HTTP-only cookies, bcrypt-hashed passwords, role-based API + route protection, session-expiry handling.
* Server-authoritative timer (`startedAt`/`expiresAt` stored in PostgreSQL). Refreshing the browser resumes the same attempt with the correct time. A background sweeper auto-submits expired attempts even if the browser was closed.
* Docker sandbox for every run: no network, read-only root FS, memory/CPU/PID limits, timeout, non-root user, container destroyed after the run.
* Hidden test cases are never sent to students. Scoring: proportional (by test-case weight) or full-marks-only; best or latest submission per question.
* Autosave (debounced + on blur/question change/reconnect) with a local cache that survives network drops.
* Anti-cheating controls (fullscreen, copy/paste/right-click blocking, tab-switch/blur detection, max violations) with logged violations. The server always enforces timing and submission state independently.
* Year separation enforced in the database query for `/api/admin/results/1-year` and `/2-year`.

## 3. Architecture
```
Browser (React/Vite)  --/api-->  Express API (Prisma)  --->  PostgreSQL
                                      |
                                      | x-runner-token
                                      v
                                 code-runner (Express) --docker run--> sandbox containers (python | java | cpp)
```
* `client/` - React 18, Vite, TypeScript, Tailwind.  `server/` - Express, Prisma.  `code-runner/` - execution service + sandbox images.
* The API process **never** runs student code; it only calls the runner. New languages are added through `server/src/config/languages.ts`, `code-runner/src/languages.ts` and a new `code-runner/docker/<lang>/` image.

## 4. Technologies
React, Vite, TypeScript, Tailwind CSS, React Hook Form + Zod, Axios, Monaco Editor, Recharts, Lucide icons, react-markdown | Node.js, Express, Prisma, PostgreSQL, bcryptjs (bcrypt algorithm, pure JS so it installs on Windows without build tools), jsonwebtoken, helmet, express-rate-limit, exceljs | Docker.

## 5. Installation (Windows, local development)
Prerequisites: **Node.js 20+**, **Docker Desktop** (running), and PostgreSQL (the easiest way is the Docker container below).

```powershell
cd online-programming-exam

# 1) PostgreSQL in Docker (skip if you have your own PostgreSQL)
docker run -d --name exam-db -e POSTGRES_USER=exam_user -e POSTGRES_PASSWORD=exam_password -e POSTGRES_DB=exam_db -p 5432:5432 postgres:16-alpine

# 2) Build the three sandbox images (one-time)
cd code-runner
.\build-images.cmd
copy .env.example .env        # edit RUNNER_TOKEN (min 16 chars)
npm install
npm run dev                   # terminal 1 - runner on http://localhost:4001

# 3) Backend (new terminal)
cd ..\server
copy .env.example .env        # set RUNNER_TOKEN to the SAME value as the runner, set a JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                   # terminal 2 - API on http://localhost:4000

# 4) Frontend (new terminal)
cd ..\client
npm install
npm run dev                   # terminal 3 - http://localhost:5173
```
Open http://localhost:5173.

**Seed logins:** admin `admin` / `Admin@123` - students `STU001` (1 Year) and `STU002` (2 Year), password `Student@123`. Change these before real use.

## 6. PostgreSQL setup
Any PostgreSQL 14+ works. Create a database and set `DATABASE_URL` in `server/.env`, e.g. `postgresql://exam_user:exam_password@localhost:5432/exam_db?schema=public`.

## 7. Environment variables
| File | Variable | Meaning |
|---|---|---|
| server/.env | `DATABASE_URL` | PostgreSQL connection string |
| | `JWT_SECRET` | signing secret, >=16 chars (use 32+ random) |
| | `JWT_EXPIRES_IN` | e.g. `8h` |
| | `NODE_ENV`, `PORT`, `CLIENT_URL` | environment, API port, allowed CORS origin(s) (comma separated) |
| | `RUNNER_URL`, `RUNNER_TOKEN` | runner address and shared secret (must match the runner) |
| | `COOKIE_SECURE` | `true` when served over HTTPS (default: true in production) |
| | `EXAM_GRACE_SECONDS` | grace for the last autosave flush after expiry (default 10) |
| | `SWEEP_INTERVAL_SECONDS` | how often expired attempts are auto-submitted (default 20) |
| code-runner/.env | `PORT`, `RUNNER_TOKEN`, `MAX_CONCURRENT`, `DOCKER_BIN` | runner settings |
| root .env | `POSTGRES_*`, `JWT_SECRET`, `RUNNER_TOKEN`, `CLIENT_URL`, `COOKIE_SECURE` | used by docker compose |

No secrets are hardcoded; `.env` files are git-ignored.

## 8-9. Prisma migration and seed
```
cd server
npx prisma generate
npx prisma migrate dev --name init     # creates prisma/migrations from schema.prisma
npx prisma db seed                     # admin, 2 students, "Python Programming Test" (5 questions with sample + hidden tests)
```
For production use `npx prisma migrate deploy`.

## 10-11. Running frontend / backend
`cd client && npm run dev` (Vite proxies `/api` to `http://localhost:4000`; set `VITE_API_TARGET` to change). `cd server && npm run dev`.

## 12. Running the code runner
`cd code-runner && npm run dev`. It needs access to Docker and the images `exam-runner-python`, `exam-runner-java`, `exam-runner-cpp` (built by `build-images.cmd` / `build-images.sh`). Per execution it runs:
`docker run --rm -i --network none --read-only --cap-drop ALL --security-opt no-new-privileges --pids-limit N --memory Xm --cpus 1 --tmpfs /tmp ... --user 1000:1000 <image>`.

## 13. Docker setup (everything in containers)
```
copy .env.example .env      # set strong secrets
docker compose --profile images build
docker compose up -d --build
docker compose exec backend npx prisma db seed
```
Open http://localhost:8080 (nginx serves the UI and proxies `/api`). The database and runner are on internal networks and publish no ports.

## 14. Production deployment
* Put the app behind HTTPS (reverse proxy / load balancer), set `COOKIE_SECURE=true`, a strong `JWT_SECRET`, `RUNNER_TOKEN` and DB password, and `CLIENT_URL` to your public origin.
* Run `prisma migrate deploy` on release; back up the `pgdata` volume.
* **The runner mounts the Docker socket**, which is root-equivalent on the host. Run the runner on a dedicated VM/host (set `RUNNER_URL` to it), keep it off the public network, and consider a rootless Docker daemon or gVisor/Firecracker for stronger isolation.
* Tune `RUNNER_MAX_CONCURRENT` to your CPU count. Monaco loads from a CDN by default; vendor it if exam rooms have no internet.

## 15. Security notes
Helmet, CORS allow-list, rate limiting (global, login, code runs), Zod validation, control-character sanitising, 512 KB body limit, Prisma (parameterised SQL), bcrypt, HTTP-only SameSite cookies, RBAC middleware on every route, 404 for other students' attempts, generic login errors with constant-time-ish checks, CSV formula-injection protection, hidden tests never serialised to students, runner secret header, no shell string execution anywhere (argument arrays only), sandbox with no network/read-only FS/limits. Client-side anti-cheating is deterrence only; server-side timing and state checks are the real enforcement.

## 16. API documentation
All responses: `{ "success": true, "data": ... }` or `{ "success": false, "message": "...", "errorCode": "..." }`. Auth is the `exam_token` cookie. Languages accept `python|java|cpp|c++` (case-insensitive).

**Authentication**
* `POST /api/auth/admin/login` `{identifier, password}` - username or email
* `POST /api/auth/student/login` `{studentId, password}`
* `POST /api/auth/logout` - `GET /api/auth/me`

**Students (ADMIN)**
`GET /api/students?search&year&status&page&pageSize` - `POST /api/students` `{studentId,name,password,year,email?,phone?,department?,batch?,rollNumber?}` - `GET|PUT|DELETE /api/students/:id` - `PATCH /api/students/:id/status` `{status}` - `PATCH /api/students/:id/password` `{password}`. Delete is refused (409) when the student has attempts; deactivate instead.

**Exams (ADMIN)**
`GET|POST /api/exams` - `GET|PUT|DELETE /api/exams/:id` - `GET /api/exams/:id/preview` (student view, no attempt) - `PATCH /api/exams/:id/publish` `{published:true|false}` - `PATCH /api/exams/:id/close`.
Body: `title, description, year(ONE_YEAR|TWO_YEAR|BOTH), durationMinutes, instructions, startDateTime, endDateTime, fullscreenRequired, disableCopyPaste, disableRightClick, tabSwitchDetection, maxViolations, autoSubmit, scoringMode(PROPORTIONAL|FULL_MARKS), submissionPolicy(BEST|LATEST), showVerdict, strictWhitespace, questions:[{questionId, marks?}]`.

**Questions and test cases (ADMIN)**
`GET|POST /api/questions` - `GET|PUT|DELETE /api/questions/:id` - `GET|POST /api/questions/:questionId/testcases` - `PUT|DELETE /api/testcases/:id`. Question: `title, problemStatement, inputFormat, outputFormat, constraints, explanation, sampleInput, sampleOutput, marks, timeLimitMs, memoryLimitMb, allowedLanguages[], testCases?[{input, expectedOutput, isSample, weight}]`.

**Student exams**
`GET /api/student/exams` - `GET /api/student/exams/:examId` - `POST /api/student/exams/:examId/start` (one attempt per exam; calling again resumes).

**Attempts (STUDENT, own attempts only)**
* `GET /api/attempts/:id` - questions (samples only), saved code, `serverTime`, `expiresAt`, `remainingSeconds`
* `PUT /api/attempts/:id/code` `{items:[{questionId,language,sourceCode}]}` - autosave
* `POST /api/attempts/:id/run` `{questionId,language,sourceCode,input,mode:"custom"|"samples"}` - does not submit
* `POST /api/attempts/:id/questions/:questionId/submit` `{language,sourceCode}` - evaluates against all tests
* `POST /api/attempts/:id/submit` - final submit (idempotent, returns `resultId`)
* `POST /api/attempts/:id/violations` `{type,details?}`

**Code execution**
`POST /api/code/run` (ADMIN) `{language, sourceCode, input}` -> `{status:"SUCCESS"|"COMPILATION_ERROR"|"RUNTIME_ERROR"|"TIME_LIMIT_EXCEEDED"|"MEMORY_LIMIT_EXCEEDED", output, executionTimeMs, compilerMessage?, errorMessage?}`. Students run code through `/api/attempts/:id/run` so the language and attempt state are validated.

**Results**
`GET /api/student/results`, `GET /api/student/results/:id` - `GET /api/admin/results`, `/1-year`, `/2-year` (`search, examId, studentId, status, from, to, sortBy=marks|percentage|submittedAt|name, order, page, pageSize`) - `GET /api/admin/results/export?year=&format=csv|xlsx` - `GET /api/admin/results/:id` (code, executions, violations) - `GET /api/admin/attempts/:id/violations` - `GET /api/admin/dashboard`.

Common error codes: `EXAM_EXPIRED`, `ATTEMPT_CLOSED`, `ALREADY_ATTEMPTED`, `LANGUAGE_NOT_ALLOWED`, `EXAM_NOT_STARTED`, `EXAM_ENDED`, `EXAM_LOCKED`, `EXAM_INCOMPLETE`, `RUNNER_UNAVAILABLE`, `SESSION_EXPIRED`, `VALIDATION_ERROR`.

## Tests
```
cd server && npm test                # unit tests (scoring, output comparison, timer, validators); no DB needed
cd server && npm run test -- tests/api.integration.test.ts   # API flow tests: needs DATABASE_URL pointing at a throw-away migrated database; the runner is faked, no Docker needed
cd client && npm test
cd code-runner && npm test           # Docker integration tests run automatically when Docker and the images exist
```
The integration suite covers authentication, student registration, admin authorization, exam/question/test-case creation, year-scoped student access, autosave, run, accepted / wrong answer / compilation error / timeout, final submission, auto-submission after expiry, result calculation and year-based result filtering.

## 17. Troubleshooting
* **`Unable to run code`** - the runner is not running, `RUNNER_TOKEN` differs between server and runner, or Docker Desktop is stopped.
* **Runner returns INTERNAL_ERROR** - sandbox images not built; run `build-images.cmd`.
* **401 right after login in dev** - use http://localhost:5173 (the Vite proxy keeps cookies same-origin); behind HTTPS set `COOKIE_SECURE=true`.
* **`prisma migrate dev` asks to reset** - the database contains tables from another schema; use an empty database.
* **Port in use** - change `PORT` (API/runner) or Vite's port.
* **Monaco editor blank** - it loads from a CDN; check internet access.
* **Auto-submit seems slow** - evaluation runs every test in Docker; raise `RUNNER_MAX_CONCURRENT`.

## Extending
The schema and services leave room for multiple attempts (`attemptNumber`), negative marking, question randomisation, leaderboards, certificates, e-mail notifications, analytics, PDF results, more languages, teacher accounts, classes and subjects.
