
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { getLanguage, type LanguageConfig } from './languages';
import { Semaphore } from './semaphore';

export type ExecutionStatus =
  | 'OK'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface ExecuteRequest {
  language: string;
  sourceCode: string;
  input: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface ExecuteResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  compilerMessage: string;
  exitCode: number | null;
  executionTimeMs: number;
}

export type Executor = (
  req: ExecuteRequest
) => Promise<ExecuteResult>;

export const RUN_MARKER = '@@RUN@@';
export const MAX_STDOUT_BYTES = 256 * 1024;
export const MAX_STDERR_BYTES = 8 * 1024;
export const COMPILE_ALLOWANCE_MS = 20_000;

const COMPILE_ERROR_EXIT_CODE = 100;
const STDERR_CAP = 64 * 1024;

const MEMORY_REGEX =
  /MemoryError|bad_alloc|OutOfMemoryError/i;

const GENERIC_INTERNAL_MESSAGE =
  'Internal execution error. Please try again later.';

/**
 * Ensures that the language receives at least its required memory.
 */
export function effectiveMemoryMb(
  lang: LanguageConfig,
  memoryLimitMb: number
): number {
  return Math.max(memoryLimitMb, lang.minMemoryMb);
}

/**
 * Includes additional memory for the container environment.
 */
export function containerMemoryMb(
  lang: LanguageConfig,
  memoryLimitMb: number
): number {
  return (
    effectiveMemoryMb(lang, memoryLimitMb) +
    lang.memoryOverheadMb
  );
}

export interface BuildArgsInput {
  language: LanguageConfig;
  containerName: string;
  sourceCode: string;
  memoryLimitMb: number;
}

/**
 * Builds arguments for `docker run`.
 * The Docker executable itself is supplied separately.
 */
export function buildDockerArgs(
  input: BuildArgsInput
): string[] {
  const {
    language,
    containerName,
    sourceCode,
    memoryLimitMb,
  } = input;

  const containerMem =
    `${containerMemoryMb(language, memoryLimitMb)}m`;

  const sourceBase64 = Buffer
    .from(sourceCode, 'utf8')
    .toString('base64');

  return [
    'run',
    '--rm',
    '-i',

    '--name',
    containerName,

    '--network',
    'none',

    '--read-only',

    '--cap-drop',
    'ALL',

    '--security-opt',
    'no-new-privileges',

    '--pids-limit',
    String(language.pidsLimit),

    '--memory',
    containerMem,

    '--memory-swap',
    containerMem,

    '--cpus',
    '1',

    '--ulimit',
    'nofile=256:256',

    '--ulimit',
    'fsize=10000000',

    '--tmpfs',
    '/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777',

    '--user',
    '1000:1000',

    '-e',
    `SOURCE_B64=${sourceBase64}`,

    '-e',
    `MEM_MB=${effectiveMemoryMb(
      language,
      memoryLimitMb
    )}`,

    language.image,
  ];
}

export interface RawRun {
  markerSeen: boolean;
  exitCode: number | null;
  stdout: string;

  /** stderr emitted after the execution marker. */
  stderr: string;

  /** Compiler output emitted before the execution marker. */
  preMarkerStderr: string;

  timedOut: boolean;
  outputLimitExceeded: boolean;
  executionTimeMs: number;
}

/**
 * Truncates a string to a maximum UTF-8 byte length.
 */
function truncate(
  value: string,
  maxBytes: number
): string {
  const buffer = Buffer.from(value, 'utf8');

  if (buffer.length <= maxBytes) {
    return value;
  }

  // Avoid cutting a UTF-8 character in the middle.
  let end = maxBytes;

  while (
    end > 0 &&
    ((buffer[end] ?? 0) & 0xc0) === 0x80
  ) {
    end--;
  }

  return (
    buffer.subarray(0, end).toString('utf8') +
    '\n[output truncated]'
  );
}

/**
 * Maps a raw container outcome to the public API result.
 */
export function classifyResult(
  raw: RawRun
): ExecuteResult {
  const base = {
    stdout: truncate(
      raw.stdout,
      MAX_STDOUT_BYTES
    ),
    executionTimeMs: Math.max(
      0,
      Math.round(raw.executionTimeMs)
    ),
    exitCode: raw.exitCode,
  };

  const internal = (): ExecuteResult => ({
    status: 'INTERNAL_ERROR',
    stdout: '',
    stderr: GENERIC_INTERNAL_MESSAGE,
    compilerMessage: '',
    exitCode: null,
    executionTimeMs: 0,
  });

  if (raw.outputLimitExceeded) {
    return {
      ...base,
      status: 'RUNTIME_ERROR',
      stderr: 'Output limit exceeded',
      compilerMessage: '',
    };
  }

  if (raw.timedOut) {
    if (!raw.markerSeen) {
      // Compilation or container startup timed out.
      return internal();
    }

    return {
      ...base,
      status: 'TIME_LIMIT_EXCEEDED',
      stderr: truncate(
        raw.stderr,
        MAX_STDERR_BYTES
      ),
      compilerMessage: truncate(
        raw.preMarkerStderr,
        MAX_STDERR_BYTES
      ),
    };
  }

  if (!raw.markerSeen) {
    const message =
      raw.preMarkerStderr || raw.stderr;

    if (
      raw.exitCode === COMPILE_ERROR_EXIT_CODE
    ) {
      return {
        ...base,
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: '',
        compilerMessage: truncate(
          message,
          MAX_STDERR_BYTES
        ),
      };
    }

    if (raw.exitCode !== 0) {
      console.error(
        '[runner] container failed before run marker, ' +
        `exit=${raw.exitCode}: ${message.slice(0, 500)}`
      );
    }

    return internal();
  }

  const stderr = truncate(
    raw.stderr,
    MAX_STDERR_BYTES
  );

  const compilerMessage = truncate(
    raw.preMarkerStderr,
    MAX_STDERR_BYTES
  );

  if (raw.exitCode === 0) {
    return {
      ...base,
      status: 'OK',
      stderr,
      compilerMessage,
    };
  }

  if (
    raw.exitCode === 137 ||
    MEMORY_REGEX.test(raw.stderr)
  ) {
    return {
      ...base,
      status: 'MEMORY_LIMIT_EXCEEDED',
      stderr,
      compilerMessage,
    };
  }

  return {
    ...base,
    status: 'RUNTIME_ERROR',
    stderr,
    compilerMessage,
  };
}

export interface RunOptions {
  dockerBin: string;
}

/**
 * Supplies only the environment variables needed by Docker.
 */
function minimalEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};

  const allowedKeys = [
    'PATH',
    'Path',
    'DOCKER_HOST',
    'DOCKER_CONFIG',
    'DOCKER_CONTEXT',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
    'HOME',
    'USERPROFILE',
    'HOMEDRIVE',
    'HOMEPATH',
    'SystemRoot',
    'SYSTEMROOT',
    'windir',
    'APPDATA',
    'LOCALAPPDATA',
    'ProgramData',
    'ProgramFiles',
    'ProgramFiles(x86)',
    'ProgramW6432',
    'USERNAME',
    'COMPUTERNAME',
    'TEMP',
    'TMP',
  ];

  for (const key of allowedKeys) {
    const value = process.env[key];

    if (value !== undefined) {
      env[key] = value;
    }
  }

  return env;
}

/**
 * Runs a single Docker container and returns the raw outcome.
 * This function resolves rather than rejecting for ordinary
 * child-process failures.
 */
export function runContainer(
  req: ExecuteRequest,
  opts: RunOptions
): Promise<RawRun> {
  const language = getLanguage(req.language);

  const containerName =
    `exam-${randomBytes(12).toString('hex')}`;

  const args = buildDockerArgs({
    language,
    containerName,
    sourceCode: req.sourceCode,
    memoryLimitMb: req.memoryLimitMb,
  });

  return new Promise<RawRun>((resolve) => {
    let markerAt: number | null = null;
    let markerSeen = false;
    let timedOut = false;
    let outputLimitExceeded = false;
    let settled = false;
    let exitAt = 0;
    let exitCode: number | null = null;

    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;

    let preMarker = '';
    let stderrScan = '';

    const postMarkerChunks: Buffer[] = [];
    let postMarkerBytes = 0;

    let timer: NodeJS.Timeout | undefined;
    let hardTimer: NodeJS.Timeout | undefined;

    const child = spawn(opts.dockerBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: minimalEnv(),
      windowsHide: true,
    });

    /**
     * Resolves once and clears all timers.
     */
    const finish = (
      finalExitCode: number | null
    ) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timer) {
        clearTimeout(timer);
      }

      if (hardTimer) {
        clearTimeout(hardTimer);
      }

      const endedAt = exitAt || Date.now();

      const stderrPost = Buffer
        .concat(postMarkerChunks)
        .toString('utf8');

      resolve({
        markerSeen,
        exitCode: finalExitCode,
        stdout: Buffer
          .concat(stdoutChunks)
          .toString('utf8'),
        stderr: markerSeen
          ? stderrPost
          : stderrScan,
        preMarkerStderr: markerSeen
          ? preMarker
          : stderrScan,
        timedOut,
        outputLimitExceeded,
        executionTimeMs:
          markerAt !== null
            ? endedAt - markerAt
            : 0,
      });
    };

    /**
     * Stops the running container and eventually kills
     * the Docker CLI if it does not exit.
     */
    const killContainer = () => {
      try {
        const killer = spawn(
          opts.dockerBin,
          ['kill', containerName],
          {
            stdio: 'ignore',
            env: minimalEnv(),
            windowsHide: true,
          }
        );

        killer.on('error', () => undefined);
      } catch {
        // Best-effort cleanup.
      }

      if (!hardTimer) {
        hardTimer = setTimeout(() => {
          child.kill('SIGKILL');
          finish(null);
        }, 5000);
      }
    };

    /**
     * Arms or resets the execution timer.
     */
    const armTimer = (ms: number) => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        if (settled) {
          return;
        }

        timedOut = true;
        killContainer();
      }, Math.max(1, ms));
    };

    // Initial allowance covers container startup and compilation.
    armTimer(COMPILE_ALLOWANCE_MS);

    child.on('error', (err) => {
      console.error(
        `[runner] failed to spawn ${opts.dockerBin}: ` +
        err.message
      );

      finish(127);
    });

    // Ignore EPIPE if the container exits before consuming input.
    child.stdin.on('error', () => undefined);

    // Send program input to the container's stdin.
    child.stdin.end(req.input);

    /**
     * Capture stdout without allowing unbounded output.
     */
    child.stdout.on('data', (chunk: Buffer) => {
      if (settled || outputLimitExceeded) {
        return;
      }

      const room =
        MAX_STDOUT_BYTES - stdoutBytes;

      if (chunk.length > room) {
        if (room > 0) {
          stdoutChunks.push(
            chunk.subarray(0, room)
          );
        }

        stdoutBytes = MAX_STDOUT_BYTES;
        outputLimitExceeded = true;

        killContainer();
        return;
      }

      stdoutChunks.push(chunk);
      stdoutBytes += chunk.length;
    });

    /**
     * The wrapper must write:
     *
     * @@RUN@@
     *
     * to stderr after compilation and immediately before
     * starting the submitted program.
     *
     * Text before the marker is compiler output.
     * Text after the marker is runtime stderr.
     */
    child.stderr.on('data', (chunk: Buffer) => {
      if (settled) {
        return;
      }

      if (markerSeen) {
        const room =
          STDERR_CAP - postMarkerBytes;

        if (room > 0) {
          const accepted = chunk.subarray(
            0,
            Math.min(room, chunk.length)
          );

          if (accepted.length > 0) {
            postMarkerChunks.push(accepted);
            postMarkerBytes += accepted.length;
          }
        }

        return;
      }

      // Keep compiler output bounded.
      if (
        Buffer.byteLength(stderrScan, 'utf8') <
        STDERR_CAP * 2
      ) {
        stderrScan += chunk.toString('utf8');
      }

      const lfNeedle = `${RUN_MARKER}\n`;
      const crlfNeedle = `${RUN_MARKER}\r\n`;

      let idx = stderrScan.indexOf(lfNeedle);
      let needleLength = lfNeedle.length;

      if (idx === -1) {
        const crlfIndex =
          stderrScan.indexOf(crlfNeedle);

        if (crlfIndex !== -1) {
          idx = crlfIndex;
          needleLength = crlfNeedle.length;
        }
      }

      if (idx === -1) {
        return;
      }

      markerSeen = true;
      markerAt = Date.now();

      preMarker = stderrScan.slice(0, idx);

      const rest = stderrScan.slice(
        idx + needleLength
      );

      if (rest) {
        const restBuffer = Buffer.from(
          rest,
          'utf8'
        );

        const accepted = restBuffer.subarray(
          0,
          STDERR_CAP
        );

        if (accepted.length > 0) {
          postMarkerChunks.push(accepted);
          postMarkerBytes = accepted.length;
        }
      }

      stderrScan = '';

      // Give the submitted program its configured time limit,
      // plus the language-specific startup allowance.
      armTimer(
        req.timeLimitMs +
        language.startupAllowanceMs
      );
    });

    child.on('exit', (code) => {
      // The close event follows after the streams drain.
      exitAt = Date.now();
      exitCode = code;
    });

    child.on('close', (code) => {
      const finalCode = exitAt
        ? exitCode
        : code;

      finish(
        finalCode === null
          ? (
              timedOut || outputLimitExceeded
                ? 137
                : null
            )
          : finalCode
      );
    });
  });
}

export interface ExecutorOptions {
  dockerBin: string;
  maxConcurrent: number;
}

/**
 * Creates an executor with a concurrency limit.
 */
export function createExecutor(
  opts: ExecutorOptions
): Executor {
  const semaphore = new Semaphore(
    opts.maxConcurrent
  );

  return (req) =>
    semaphore.run(async () => {
      try {
        const raw = await runContainer(
          req,
          { dockerBin: opts.dockerBin }
        );

        return classifyResult(raw);
      } catch (err) {
        console.error(
          '[runner] unexpected error:',
          err
        );

        return classifyResult({
          markerSeen: false,
          exitCode: null,
          stdout: '',
          stderr: '',
          preMarkerStderr: '',
          timedOut: false,
          outputLimitExceeded: false,
          executionTimeMs: 0,
        });
      }
    });
}
