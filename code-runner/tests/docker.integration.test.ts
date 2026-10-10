import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createExecutor, type ExecuteRequest } from '../src/docker';

function dockerReady(): boolean {
  try {
    if (spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 10000 }).status !== 0) return false;
    return ['python', 'java', 'cpp'].every(
      (l) => spawnSync('docker', ['image', 'inspect', `exam-runner-${l}`], { stdio: 'ignore', timeout: 10000 }).status === 0,
    );
  } catch {
    return false;
  }
}

const dockerAvailable = dockerReady();
const executor = createExecutor({ dockerBin: 'docker', maxConcurrent: 4 });
const run = (r: Partial<ExecuteRequest> & Pick<ExecuteRequest, 'language' | 'sourceCode'>) =>
  executor({ input: '', timeLimitMs: 2000, memoryLimitMb: 256, ...r });

const programs = {
  python: 'a, b = map(int, input().split())\nprint(a + b)\n',
  java: 'import java.util.*;\npublic class Main { public static void main(String[] x) { Scanner s = new Scanner(System.in); System.out.println(s.nextInt() + s.nextInt()); } }\n',
  cpp: '#include <iostream>\nint main() { long long a, b; std::cin >> a >> b; std::cout << a + b << "\\n"; }\n',
} as const;

describe.skipIf(!dockerAvailable)('docker integration', () => {
  for (const lang of ['python', 'java', 'cpp'] as const) {
    it(`${lang}: sums two numbers`, async () => {
      const r = await run({ language: lang, sourceCode: programs[lang], input: '2 3\n', timeLimitMs: 5000 });
      expect(r.status).toBe('OK');
      expect(r.stdout.trim()).toBe('5');
      expect(r.exitCode).toBe(0);
    }, 90000);
  }

  it('java: compile error', async () => {
    const r = await run({ language: 'java', sourceCode: 'public class Main { void x( }' });
    expect(r.status).toBe('COMPILATION_ERROR');
    expect(r.compilerMessage.length).toBeGreaterThan(0);
  }, 60000);

  it('cpp: compile error', async () => {
    const r = await run({ language: 'cpp', sourceCode: 'int main() { return x; }' });
    expect(r.status).toBe('COMPILATION_ERROR');
    expect(r.compilerMessage).toContain('error');
  }, 60000);

  it('python: runtime error', async () => {
    const r = await run({ language: 'python', sourceCode: 'raise ValueError("boom")' });
    expect(r.status).toBe('RUNTIME_ERROR');
    expect(r.stderr).toContain('boom');
  }, 60000);

  it('python: infinite loop => TLE', async () => {
    const r = await run({ language: 'python', sourceCode: 'while True: pass', timeLimitMs: 500 });
    expect(r.status).toBe('TIME_LIMIT_EXCEEDED');
  }, 60000);

  it('cpp: infinite loop => TLE', async () => {
    const r = await run({ language: 'cpp', sourceCode: 'int main() { while (true) {} }', timeLimitMs: 500 });
    expect(r.status).toBe('TIME_LIMIT_EXCEEDED');
  }, 60000);

  it('python: fork bomb is contained and the runner stays usable', async () => {
    const r = await run({
      language: 'python',
      sourceCode: 'import os\nwhile True:\n    try:\n        os.fork()\n    except OSError:\n        pass\n',
      timeLimitMs: 1000,
    });
    expect(['TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'MEMORY_LIMIT_EXCEEDED']).toContain(r.status);
    const after = await run({ language: 'python', sourceCode: 'print("alive")' });
    expect(after.status).toBe('OK');
  }, 90000);

  it('python: network is blocked', async () => {
    const code = [
      'import socket',
      's = socket.socket()',
      's.settimeout(2)',
      'try:',
      '    s.connect(("1.1.1.1", 53))',
      '    print("CONNECTED")',
      'except Exception:',
      '    print("BLOCKED")',
    ].join('\n');
    const r = await run({ language: 'python', sourceCode: code });
    expect(r.stdout.trim()).toBe('BLOCKED');
  }, 60000);

  it('python: huge output is cut off', async () => {
    const r = await run({ language: 'python', sourceCode: 'while True: print("x" * 1000)', timeLimitMs: 5000 });
    expect(r.status).toBe('RUNTIME_ERROR');
    expect(r.stderr).toBe('Output limit exceeded');
  }, 60000);

  it('python: environment has no host secrets and filesystem is read-only', async () => {
    const code = 'import os\nprint(sorted(os.environ.keys()))\ntry:\n    open("/etc/x","w")\n    print("WRITABLE")\nexcept Exception:\n    print("RO")';
    const r = await run({ language: 'python', sourceCode: code });
    expect(r.stdout).toContain('RO');
    expect(r.stdout).not.toContain('RUNNER_TOKEN');
  }, 60000);
});
