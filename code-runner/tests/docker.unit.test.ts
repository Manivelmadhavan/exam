import { describe, expect, it } from 'vitest';
import { buildDockerArgs, classifyResult, type RawRun } from '../src/docker';
import { LANGUAGES } from '../src/languages';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

describe('buildDockerArgs', () => {
  const args = buildDockerArgs({
    language: LANGUAGES.python,
    containerName: 'exam-abc',
    sourceCode: 'print("hi")',
    memoryLimitMb: 128,
  });

  it('returns an array of strings starting with run', () => {
    expect(Array.isArray(args)).toBe(true);
    expect(args.every((a) => typeof a === 'string')).toBe(true);
    expect(args[0]).toBe('run');
  });

  it('applies the isolation flags', () => {
    expect(flag(args, '--network')).toBe('none');
    expect(args).toContain('--read-only');
    expect(flag(args, '--cap-drop')).toBe('ALL');
    expect(flag(args, '--security-opt')).toBe('no-new-privileges');
    expect(flag(args, '--pids-limit')).toBe(String(LANGUAGES.python.pidsLimit));
    expect(flag(args, '--memory')).toBe('128m');
    expect(flag(args, '--memory-swap')).toBe('128m');
    expect(flag(args, '--cpus')).toBe('1');
    expect(flag(args, '--user')).toBe('1000:1000');
    expect(args).toContain('--rm');
    expect(flag(args, '--name')).toBe('exam-abc');
    expect(flag(args, '--tmpfs')).toBe('/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777');
  });

  it('passes the source base64-encoded and the image last', () => {
    const src = args.find((a) => a.startsWith('SOURCE_B64='))!;
    expect(Buffer.from(src.slice('SOURCE_B64='.length), 'base64').toString()).toBe('print("hi")');
    expect(args).toContain('MEM_MB=128');
    expect(args[args.length - 1]).toBe('exam-runner-python');
  });

  it('adds JVM overhead for java and enforces minimums', () => {
    const j = buildDockerArgs({ language: LANGUAGES.java, containerName: 'n', sourceCode: 'x', memoryLimitMb: 64 });
    expect(flag(j, '--memory')).toBe(`${128 + 256}m`);
    expect(j).toContain('MEM_MB=128');
    const c = buildDockerArgs({ language: LANGUAGES.cpp, containerName: 'n', sourceCode: 'x', memoryLimitMb: 64 });
    expect(flag(c, '--memory')).toBe('256m');
    const j2 = buildDockerArgs({ language: LANGUAGES.java, containerName: 'n', sourceCode: 'x', memoryLimitMb: 512 });
    expect(flag(j2, '--memory')).toBe('768m');
  });
});

describe('classifyResult', () => {
  const base: RawRun = {
    markerSeen: true,
    exitCode: 0,
    stdout: 'out',
    stderr: '',
    preMarkerStderr: '',
    timedOut: false,
    outputLimitExceeded: false,
    executionTimeMs: 12,
  };

  it('OK on exit 0', () => {
    const r = classifyResult(base);
    expect(r.status).toBe('OK');
    expect(r.stdout).toBe('out');
    expect(r.exitCode).toBe(0);
    expect(r.executionTimeMs).toBe(12);
  });

  it('RUNTIME_ERROR on nonzero exit', () => {
    expect(classifyResult({ ...base, exitCode: 1, stderr: 'Traceback' }).status).toBe('RUNTIME_ERROR');
  });

  it('TIME_LIMIT_EXCEEDED when timed out after the marker', () => {
    expect(classifyResult({ ...base, exitCode: 137, timedOut: true }).status).toBe('TIME_LIMIT_EXCEEDED');
  });

  it('MEMORY_LIMIT_EXCEEDED on exit 137 without timeout', () => {
    expect(classifyResult({ ...base, exitCode: 137 }).status).toBe('MEMORY_LIMIT_EXCEEDED');
  });

  it.each(['MemoryError', 'std::bad_alloc', 'java.lang.OutOfMemoryError: heap'])('MEMORY_LIMIT_EXCEEDED on stderr %s', (s) => {
    expect(classifyResult({ ...base, exitCode: 1, stderr: s }).status).toBe('MEMORY_LIMIT_EXCEEDED');
  });

  it('COMPILATION_ERROR when no marker and exit 100', () => {
    const r = classifyResult({ ...base, markerSeen: false, exitCode: 100, stdout: '', stderr: 'Main.cpp: error', preMarkerStderr: 'Main.cpp: error' });
    expect(r.status).toBe('COMPILATION_ERROR');
    expect(r.compilerMessage).toBe('Main.cpp: error');
    expect(r.stderr).toBe('');
  });

  it.each([125, 126, 127, 1])('INTERNAL_ERROR with generic message when no marker and exit %i', (code) => {
    const r = classifyResult({ ...base, markerSeen: false, exitCode: code, stderr: 'docker: /var/run/docker.sock secret path' });
    expect(r.status).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(r)).not.toContain('docker.sock');
  });

  it('RUNTIME_ERROR on output limit', () => {
    const r = classifyResult({ ...base, exitCode: 137, outputLimitExceeded: true });
    expect(r.status).toBe('RUNTIME_ERROR');
    expect(r.stderr).toBe('Output limit exceeded');
  });

  it('truncates stdout to 256KB and stderr to 8KB', () => {
    const r = classifyResult({ ...base, exitCode: 1, stdout: 'a'.repeat(300 * 1024), stderr: 'e'.repeat(20000) });
    expect(Buffer.byteLength(r.stdout)).toBeLessThan(257 * 1024);
    expect(r.stderr.length).toBeLessThan(8 * 1024 + 50);
  });
});
