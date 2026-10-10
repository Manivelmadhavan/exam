import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import type { ExecuteResult } from '../src/docker';

const TOKEN = 'a-very-secret-token-123';
const okResult: ExecuteResult = {
  status: 'OK', stdout: '3\n', stderr: '', compilerMessage: '', exitCode: 0, executionTimeMs: 5,
};

function setup() {
  const executor = vi.fn(async () => okResult);
  return { executor, app: createApp({ runnerToken: TOKEN, executor }) };
}

describe('HTTP API', () => {
  it('GET /health', async () => {
    const res = await request(setup().app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /languages lists supported languages', async () => {
    const res = await request(setup().app).get('/languages');
    expect(res.status).toBe(200);
    expect(res.body.languages.map((l: { id: string }) => l.id).sort()).toEqual(['cpp', 'java', 'python']);
  });

  it('rejects missing or wrong token with 401 and does not execute', async () => {
    const { app, executor } = setup();
    const body = { language: 'python', sourceCode: 'print(1)' };
    expect((await request(app).post('/execute').send(body)).status).toBe(401);
    expect((await request(app).post('/execute').set('x-runner-token', 'nope').send(body)).status).toBe(401);
    expect((await request(app).post('/execute').set('x-runner-token', TOKEN + 'x').send(body)).status).toBe(401);
    expect(executor).not.toHaveBeenCalled();
  });

  it('executes with a valid token and applies defaults', async () => {
    const { app, executor } = setup();
    const res = await request(app).post('/execute').set('x-runner-token', TOKEN).send({ language: 'python', sourceCode: 'print(1)' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(okResult);
    expect(executor).toHaveBeenCalledWith({
      language: 'python', sourceCode: 'print(1)', input: '', timeLimitMs: 2000, memoryLimitMb: 256,
    });
  });

  it.each([
    [{ language: 'ruby', sourceCode: 'x' }],
    [{ language: 'python' }],
    [{ language: 'python', sourceCode: 'x', timeLimitMs: 50 }],
    [{ language: 'python', sourceCode: 'x', timeLimitMs: 20000 }],
    [{ language: 'python', sourceCode: 'x', memoryLimitMb: 8 }],
    [{ language: 'python', sourceCode: 'x'.repeat(64 * 1024 + 1) }],
    [{ language: 'python', sourceCode: 'x', input: 'y'.repeat(64 * 1024 + 1) }],
  ])('400 on invalid body %#', async (body) => {
    const { app, executor } = setup();
    const res = await request(app).post('/execute').set('x-runner-token', TOKEN).send(body);
    expect(res.status).toBe(400);
    expect(executor).not.toHaveBeenCalled();
  });

  it('413 when body exceeds 256kb', async () => {
    const res = await request(setup().app).post('/execute').set('x-runner-token', TOKEN)
      .send({ language: 'python', sourceCode: 'x'.repeat(300 * 1024) });
    expect(res.status).toBe(413);
  });

  it('returns INTERNAL_ERROR without leaking when the executor throws', async () => {
    const app = createApp({ runnerToken: TOKEN, executor: async () => { throw new Error('/secret/path docker'); } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await request(app).post('/execute').set('x-runner-token', TOKEN).send({ language: 'python', sourceCode: 'x' });
    expect(res.body.status).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});

describe('loadConfig', () => {
  it('applies defaults', () => {
    const c = loadConfig({ RUNNER_TOKEN: 'x'.repeat(16) });
    expect(c).toMatchObject({ port: 4001, maxConcurrent: 4, dockerBin: 'docker' });
  });
  it('requires a token of at least 16 chars', () => {
    expect(() => loadConfig({})).toThrow();
    expect(() => loadConfig({ RUNNER_TOKEN: 'short' })).toThrow();
  });
});
