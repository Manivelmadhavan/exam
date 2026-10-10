/**
 * End-to-end API tests against a real PostgreSQL database (set DATABASE_URL to a throw-away database,
 * e.g. exam_test, after running `npx prisma migrate deploy`). The Docker code-runner is replaced with a
 * deterministic fake so no Docker is needed:  code containing WRONG -> wrong output, COMPILE_ERR ->
 * compilation error, LOOP -> time limit exceeded, otherwise it prints the sum of the two input numbers.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/runnerClient', () => ({
  toApiRunStatus: (s: string) => (s === 'OK' ? 'SUCCESS' : s),
  executeCode: async ({ sourceCode, input }: { sourceCode: string; input: string }) => {
    const base = { stderr: '', compilerMessage: '', exitCode: 0, executionTimeMs: 12 };
    if (sourceCode.includes('COMPILE_ERR')) return { ...base, status: 'COMPILATION_ERROR', stdout: '', compilerMessage: 'error: boom', exitCode: 100 };
    if (sourceCode.includes('LOOP')) return { ...base, status: 'TIME_LIMIT_EXCEEDED', stdout: '' };
    const sum = input.trim().split(/\s+/).map(Number).reduce((a, b) => a + b, 0);
    return { ...base, status: 'OK', stdout: sourceCode.includes('WRONG') ? `${sum + 1}\n` : `${sum}\n` };
  },
}));

import { createApp } from '../src/app';
import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/password';
import { sweepOnce } from '../src/services/attemptService';

const app = createApp();
const tag = `t${Date.now()}`;
const admin = request.agent(app);
const s1 = request.agent(app); // 1 Year
const s2 = request.agent(app); // 2 Year
let examId = '', oneYearExamId = '', q1 = '', q2 = '';
const GOOD = 'a,b=map(int,input().split()); print(a+b)';

beforeAll(async () => {
  await prisma.admin.create({ data: { username: `admin_${tag}`, email: `${tag}@x.com`, passwordHash: await hashPassword('Admin@123') } });
});
afterAll(async () => {
  await prisma.feedback.deleteMany({ where: { studentId: { startsWith: tag } } });
  await prisma.exam.deleteMany({ where: { title: { startsWith: tag } } });
  await prisma.question.deleteMany({ where: { title: { startsWith: tag } } });
  await prisma.student.deleteMany({ where: { studentId: { startsWith: tag } } });
  await prisma.admin.deleteMany({ where: { username: `admin_${tag}` } });
  await prisma.$disconnect();
});

describe('authentication & authorization', () => {
  it('rejects invalid login and sets an httpOnly cookie on success', async () => {
    expect((await request(app).post('/api/auth/admin/login').send({ identifier: `admin_${tag}`, password: 'nope' })).status).toBe(401);
    const res = await admin.post('/api/auth/admin/login').send({ identifier: `admin_${tag}`, password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });
  it('blocks unauthenticated and wrong-role access', async () => {
    expect((await request(app).get('/api/students')).status).toBe(401);
  });
  it('registers students (unique id, hashed password)', async () => {
    const mk = (n: number, year: string) => admin.post('/api/students').send({ studentId: `${tag}_${n}`, name: `Student ${n}`, password: 'Pass@123', year });
    expect((await mk(1, 'ONE_YEAR')).status).toBe(201);
    expect((await mk(2, 'TWO_YEAR')).status).toBe(201);
    expect((await mk(1, 'ONE_YEAR')).status).toBe(409);
    const row = await prisma.student.findUniqueOrThrow({ where: { studentId: `${tag}_1` } });
    expect(row.passwordHash).not.toBe('Pass@123');
    expect((await s1.post('/api/auth/student/login').send({ studentId: `${tag}_1`, password: 'Pass@123' })).status).toBe(200);
    expect((await s2.post('/api/auth/student/login').send({ studentId: `${tag}_2`, password: 'Pass@123' })).status).toBe(200);
  });
  it('students cannot use admin APIs; admins cannot use student APIs', async () => {
    expect((await s1.get('/api/students')).status).toBe(403);
    expect((await s1.post('/api/exams').send({})).status).toBe(403);
    expect((await admin.get('/api/student/exams')).status).toBe(403);
  });
});

describe('content management', () => {
  it('creates questions with test cases', async () => {
    const body = (n: string) => ({
      title: `${tag} ${n}`, problemStatement: 'Add numbers', allowedLanguages: ['python', 'java'], marks: 10,
      testCases: [
        { input: '1 2', expectedOutput: '3', isSample: true }, { input: '5 7', expectedOutput: '12' }, { input: '100 200', expectedOutput: '300' },
        { input: '1 1', expectedOutput: '2' }, { input: '2 2', expectedOutput: '4' },
      ],
    });
    const a = await admin.post('/api/questions').send(body('A'));
    expect(a.status).toBe(201);
    q1 = a.body.data.id;
    q2 = (await admin.post('/api/questions').send(body('B'))).body.data.id;
    expect(a.body.data.allowedLanguages).toEqual(['PYTHON', 'JAVA']);
    expect((await admin.post(`/api/questions/${q1}/testcases`).send({ input: '3 3', expectedOutput: '6', isSample: false })).status).toBe(201);
    const list = await admin.get(`/api/questions/${q1}/testcases`);
    expect(list.body.data).toHaveLength(6);
    expect((await admin.put(`/api/testcases/${list.body.data[0].id}`).send({ input: '1 2', expectedOutput: '3', isSample: true, weight: 2 })).status).toBe(200);
    expect((await admin.delete(`/api/testcases/${list.body.data[5].id}`)).status).toBe(200);
  });
  it('creates, publishes and year-scopes exams', async () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 86_400_000).toISOString();
    const mk = (n: string, year: string) => admin.post('/api/exams').send({
      title: `${tag} ${n}`, year, durationMinutes: 30, startDateTime: start, endDateTime: end,
      questions: [{ questionId: q1 }, { questionId: q2 }],
    });
    const both = await mk('both', 'BOTH');
    expect(both.status).toBe(201);
    examId = both.body.data.id;
    oneYearExamId = (await mk('one', 'ONE_YEAR')).body.data.id;
    expect(both.body.data.totalMarks).toBe(20);
    expect((await admin.patch(`/api/exams/${examId}/publish`).send({ published: true })).status).toBe(200);
    expect((await admin.patch(`/api/exams/${oneYearExamId}/publish`).send({ published: true })).status).toBe(200);
    const titles = (r: request.Response) => r.body.data.map((e: { title: string }) => e.title);
    expect(titles(await s1.get('/api/student/exams'))).toContain(`${tag} one`);
    expect(titles(await s2.get('/api/student/exams'))).not.toContain(`${tag} one`);
    expect((await s2.get(`/api/student/exams/${oneYearExamId}`)).status).toBe(404);
    expect((await s2.post(`/api/student/exams/${oneYearExamId}/start`)).status).toBe(404);
  });
});

describe('exam attempt flow', () => {
  let attemptId = '';
  it('starts once and resumes the same attempt after refresh', async () => {
    const r = await s1.post(`/api/student/exams/${examId}/start`);
    expect(r.status).toBe(201);
    attemptId = r.body.data.attemptId;
    const again = await s1.post(`/api/student/exams/${examId}/start`);
    expect(again.body.data.attemptId).toBe(attemptId);
    expect(again.body.data.resumed).toBe(true);
  });
  it('never exposes hidden test cases to the student', async () => {
    const view = await s1.get(`/api/attempts/${attemptId}`);
    expect(view.status).toBe(200);
    expect(view.body.data.remainingSeconds).toBeGreaterThan(1700);
    const q = view.body.data.questions[0];
    expect(q.sampleTests).toHaveLength(1);
    expect(JSON.stringify(view.body)).not.toContain('300');
  });
  it("blocks another student's attempt", async () => {
    expect((await s2.get(`/api/attempts/${attemptId}`)).status).toBe(404);
    expect((await s2.put(`/api/attempts/${attemptId}/code`).send({ items: [{ questionId: q1, language: 'python', sourceCode: 'x' }] })).status).toBe(404);
  });
  it('autosaves code and rejects disallowed languages', async () => {
    const ok = await s1.put(`/api/attempts/${attemptId}/code`).send({ items: [{ questionId: q1, language: 'python', sourceCode: GOOD }] });
    expect(ok.status).toBe(200);
    expect((await s1.get(`/api/attempts/${attemptId}`)).body.data.questions[0].submission.sourceCode).toBe(GOOD);
    const bad = await s1.put(`/api/attempts/${attemptId}/code`).send({ items: [{ questionId: q1, language: 'cpp', sourceCode: 'int main(){}' }] });
    expect(bad.status).toBe(400);
    expect(bad.body.errorCode).toBe('LANGUAGE_NOT_ALLOWED');
  });
  it('runs custom input and sample tests without submitting', async () => {
    const run = await s1.post(`/api/attempts/${attemptId}/run`).send({ questionId: q1, language: 'python', sourceCode: GOOD, input: '4 5' });
    expect(run.body.data).toMatchObject({ status: 'SUCCESS', output: '9\n' });
    const samples = await s1.post(`/api/attempts/${attemptId}/run`).send({ questionId: q1, language: 'python', sourceCode: GOOD, mode: 'samples' });
    expect(samples.body.data.results[0].passed).toBe(true);
    expect((await s1.post(`/api/attempts/${attemptId}/run`).send({ questionId: q1, language: 'cpp', sourceCode: 'x' })).body.errorCode).toBe('LANGUAGE_NOT_ALLOWED');
  });
  it('evaluates accepted, wrong answer, compile error and timeout', async () => {
    const submit = (qid: string, code: string) => s1.post(`/api/attempts/${attemptId}/questions/${qid}/submit`).send({ language: 'python', sourceCode: code });
    const accepted = await submit(q1, GOOD);
    expect(accepted.body.data).toMatchObject({ verdict: 'ACCEPTED', obtainedMarks: 10 });
    const wrong = await submit(q2, `${GOOD} #WRONG`);
    expect(wrong.body.data).toMatchObject({ verdict: 'WRONG_ANSWER', obtainedMarks: 0 });
    expect((await submit(q2, '#COMPILE_ERR')).body.data.verdict).toBe('COMPILATION_ERROR');
    expect((await submit(q2, '#LOOP')).body.data.verdict).toBe('TIME_LIMIT_EXCEEDED');
    const exec = await prisma.codeExecution.count({ where: { submission: { attemptId } } });
    expect(exec).toBeGreaterThan(5);
  });
  it('final submission stores a result with correct totals', async () => {
    await s1.put(`/api/attempts/${attemptId}/code`).send({ items: [{ questionId: q2, language: 'python', sourceCode: GOOD }] });
    const sub = await s1.post(`/api/attempts/${attemptId}/submit`);
    expect(sub.status).toBe(200);
    const result = await s1.get(`/api/student/results/${sub.body.data.resultId}`);
    expect(result.body.data).toMatchObject({ totalMarks: 20, obtainedMarks: 10, percentage: 50, acceptedCount: 1, totalQuestions: 2 });
    expect(result.body.data.details).toHaveLength(2);
    // Submitting twice is idempotent; editing afterwards is refused.
    expect((await s1.post(`/api/attempts/${attemptId}/submit`)).body.data.resultId).toBe(sub.body.data.resultId);
    expect((await s1.put(`/api/attempts/${attemptId}/code`).send({ items: [{ questionId: q1, language: 'python', sourceCode: 'x' }] })).body.errorCode).toBe('ATTEMPT_CLOSED');
    expect((await s1.post(`/api/student/exams/${examId}/start`)).body.errorCode).toBe('ALREADY_ATTEMPTED');
  });
});

describe('server-side timer & auto-submission', () => {
  it('auto-submits expired attempts and evaluates saved code', async () => {
    const start = await s2.post(`/api/student/exams/${examId}/start`);
    const attemptId = start.body.data.attemptId;
    await s2.put(`/api/attempts/${attemptId}/code`).send({ items: [{ questionId: q1, language: 'python', sourceCode: GOOD }] });
    // Simulate the clock running out on the server.
    await prisma.examAttempt.update({ where: { id: attemptId }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    const rejected = await s2.post(`/api/attempts/${attemptId}/questions/${q1}/submit`).send({ language: 'python', sourceCode: GOOD });
    expect(rejected.status).toBe(403);
    expect(rejected.body.errorCode).toBe('EXAM_EXPIRED');
    await sweepOnce();
    const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { result: true } });
    expect(attempt.status).toBe('EVALUATED');
    expect(attempt.autoSubmitted).toBe(true);
    expect(attempt.result?.obtainedMarks).toBe(10);
  });
});

describe('results & year separation', () => {
  it('serves year-specific result lists enforced by the backend', async () => {
    const one = await admin.get('/api/admin/results/1-year').query({ year: 'TWO_YEAR', search: tag });
    const two = await admin.get('/api/admin/results/2-year').query({ year: 'ONE_YEAR', search: tag });
    expect(one.body.data.items.length).toBeGreaterThan(0);
    expect(one.body.data.items.every((r: { year: string }) => r.year === 'ONE_YEAR')).toBe(true);
    expect(two.body.data.items.every((r: { year: string }) => r.year === 'TWO_YEAR')).toBe(true);
    const all = await admin.get('/api/admin/results').query({ search: tag });
    expect(all.body.data.total).toBe(one.body.data.total + two.body.data.total);
    expect((await s1.get('/api/admin/results/1-year')).status).toBe(403);
  });
  it('exports CSV and shows violations in result detail', async () => {
    const csv = await admin.get('/api/admin/results/export').query({ year: 'ONE_YEAR', format: 'csv', search: tag });
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    const list = await admin.get('/api/admin/results/1-year').query({ search: tag });
    const detail = await admin.get(`/api/admin/results/${list.body.data.items[0].id}`);
    expect(detail.body.data.details[0]).toHaveProperty('sourceCode');
    expect(detail.body.data).toHaveProperty('violations');
  });
});

describe('force delete cascades linked records', () => {
  it('deleting an exam removes its attempts, results and submissions but keeps question library', async () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 86_400_000).toISOString();
    const exam = await admin.post('/api/exams').send({
      title: `${tag} del1`, year: 'BOTH', durationMinutes: 30, startDateTime: start, endDateTime: end,
      questions: [{ questionId: q1 }, { questionId: q2 }],
    });
    expect(exam.status).toBe(201);
    const delExamId = exam.body.data.id;
    await admin.patch(`/api/exams/${delExamId}/publish`).send({ published: true });

    const d1 = request.agent(app);
    expect((await admin.post('/api/students').send({ studentId: `${tag}_del1`, name: 'Del One', password: 'Pass@123', year: 'ONE_YEAR' })).status).toBe(201);
    expect((await d1.post('/api/auth/student/login').send({ studentId: `${tag}_del1`, password: 'Pass@123' })).status).toBe(200);
    const attempt = await d1.post(`/api/student/exams/${delExamId}/start`);
    expect(attempt.status).toBe(201);
    await d1.post(`/api/attempts/${attempt.body.data.attemptId}/questions/${q1}/submit`).send({ language: 'python', sourceCode: GOOD });
    expect((await d1.post(`/api/attempts/${attempt.body.data.attemptId}/submit`)).status).toBe(200);

    expect(await prisma.examAttempt.count({ where: { examId: delExamId } })).toBe(1);
    expect(await prisma.result.count({ where: { examId: delExamId } })).toBe(1);
    expect((await admin.delete(`/api/exams/${delExamId}`)).status).toBe(200);
    expect(await prisma.exam.findUnique({ where: { id: delExamId } })).toBeNull();
    expect(await prisma.examAttempt.count({ where: { examId: delExamId } })).toBe(0);
    expect(await prisma.result.count({ where: { examId: delExamId } })).toBe(0);
    expect(await prisma.examQuestion.count({ where: { examId: delExamId } })).toBe(0);
    expect(await prisma.question.count({ where: { id: q1 } })).toBe(1);
  });
  it('deleting a student removes their attempts and results', async () => {
    const del2 = request.agent(app);
    expect((await admin.post('/api/students').send({ studentId: `${tag}_del2`, name: 'Del Two', password: 'Pass@123', year: 'TWO_YEAR' })).status).toBe(201);
    expect((await del2.post('/api/auth/student/login').send({ studentId: `${tag}_del2`, password: 'Pass@123' })).status).toBe(200);
    const started = await del2.post(`/api/student/exams/${examId}/start`);
    expect(started.status).toBe(201);
    await del2.post(`/api/attempts/${started.body.data.attemptId}/questions/${q1}/submit`).send({ language: 'python', sourceCode: GOOD });
    expect((await del2.post(`/api/attempts/${started.body.data.attemptId}/submit`)).status).toBe(200);

    const row = await prisma.student.findUniqueOrThrow({ where: { studentId: `${tag}_del2` } });
    expect(await prisma.result.count({ where: { studentId: row.id } })).toBe(1);
    expect((await admin.delete(`/api/students/${row.id}`)).status).toBe(200);
    expect(await prisma.student.findUnique({ where: { id: row.id } })).toBeNull();
    expect(await prisma.examAttempt.count({ where: { studentId: row.id } })).toBe(0);
    expect(await prisma.result.count({ where: { studentId: row.id } })).toBe(0);
  });
});

describe('feedback', () => {
  const payload = (sid: string) => ({
    studentName: `Student ${sid}`, studentId: sid, classYear: '2nd Year', language: 'Python',
    loginEase: 4, uiRating: 5, problemReadability: 'Easy', codeEditorRating: 4, runCodeWorks: 'Yes, perfectly',
    inputOutputEase: 'Very Easy', timerVisible: 'Yes', timeSufficient: 'Yes', languageSupport: 'Yes',
    executionSpeed: 3, resultsDisplayed: 'Yes', overallSatisfaction: 5, likedMost: 'Clean interface',
    issuesSeen: ['Slow performance', 'Timer issues'], improvements: 'Add more languages', useAgain: 'Yes',
  });
  it('requires a student session to submit', async () => {
    expect((await request(app).post('/api/feedback').send(payload(`${tag}_1`))).status).toBe(401);
    expect((await admin.post('/api/feedback').send(payload(`${tag}_1`))).status).toBe(403);
    expect((await s1.get('/api/admin/feedback')).status).toBe(403);
  });
  it('validates missing required answers', async () => {
    const res = await s1.post('/api/feedback').send({ studentName: 'x' });
    expect(res.status).toBe(400);
  });
  it('stores a submission and admin can read it back', async () => {
    const sub = await s1.post('/api/feedback').send(payload(`${tag}_1`));
    expect(sub.status).toBe(201);
    expect(sub.body.data).toMatchObject({ id: expect.any(String), submittedAt: expect.any(String) });
    const list = await admin.get('/api/admin/feedback');
    expect(list.status).toBe(200);
    const row = list.body.data.find((r: { studentId: string }) => r.studentId === `${tag}_1`);
    expect(row).toMatchObject({ overallSatisfaction: 5, issuesSeen: ['Slow performance', 'Timer issues'], language: 'Python' });
  });
  it('allows only one submission per student', async () => {
    const mine = await s1.get('/api/feedback/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.data).toMatchObject({ submitted: true, submittedAt: expect.any(String) });
    const again = await s1.post('/api/feedback').send(payload(`${tag}_1`));
    expect(again.status).toBe(409);
    expect(again.body.errorCode).toBe('ALREADY_SUBMITTED');
    const feed2 = await s2.post('/api/feedback').send(payload(`${tag}_2`));
    expect(feed2.status).toBe(201);
    expect((await s2.get('/api/feedback/mine')).body.data.submitted).toBe(true);
  });
});
