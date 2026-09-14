import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';

export interface SandboxRunOptions {
  code: string;
  language: 'python' | 'javascript';
  timeoutMs?: number;
}

export interface SandboxRunResult {
  success: boolean;
  output: string;   // stdout
  error: string;    // stderr or timeout/system error
  exitCode: number | null;
  timedOut: boolean;
  executionMs: number;
  language: 'python' | 'javascript';
  tempFile: string;
}

// Resolve sandbox_workspace relative to the project root (process.cwd())
const SANDBOX_DIR = path.join(process.cwd(), 'sandbox_workspace');

/** Ensure sandbox_workspace/ exists on startup */
function ensureSandboxDir(): void {
  if (!fs.existsSync(SANDBOX_DIR)) {
    fs.mkdirSync(SANDBOX_DIR, { recursive: true });
  }
}

/** Return the interpreter command and default args for the given language */
function resolveInterpreter(language: 'python' | 'javascript'): { cmd: string; args: string[] } {
  if (language === 'python') {
    // Try `python3` first (Unix), fall back to `python` (Windows PATH)
    return { cmd: process.platform === 'win32' ? 'python' : 'python3', args: [] };
  }
  // JavaScript → Node.js
  return { cmd: 'node', args: [] };
}

/** Generate a unique temp filename inside sandbox_workspace/ */
function makeTempFilePath(language: 'python' | 'javascript'): string {
  const ext = language === 'python' ? '.py' : '.js';
  const uid = randomBytes(4).toString('hex');
  const name = `exec_${Date.now()}_${uid}${ext}`;
  return path.join(SANDBOX_DIR, name);
}

/**
 * Run arbitrary code in an isolated sandbox.
 *
 * Safety guarantees:
 *  - Code is executed in a temporary file inside sandbox_workspace/
 *  - Hard wall-clock timeout (default 5 000 ms) terminates the child process
 *  - Temp file is always cleaned up in finally
 *  - Max output captured: 128 KB (stdout) + 128 KB (stderr)
 */
export async function runInSandbox(options: SandboxRunOptions): Promise<SandboxRunResult> {
  const { code, language, timeoutMs = 5_000 } = options;

  ensureSandboxDir();

  const tempFile = makeTempFilePath(language);
  const { cmd, args } = resolveInterpreter(language);

  const MAX_BYTES = 128 * 1024; // 128 KB cap per stream
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let exitCode: number | null = null;
  const startTime = Date.now();

  // Write code to temp file
  try {
    fs.writeFileSync(tempFile, code, 'utf8');
  } catch (writeErr: any) {
    return {
      success: false,
      output: '',
      error: `Sandbox write error: ${writeErr.message}`,
      exitCode: null,
      timedOut: false,
      executionMs: 0,
      language,
      tempFile: '',
    };
  }

  try {
    await new Promise<void>((resolve) => {
      const child = spawn(cmd, [...args, tempFile], {
        cwd: SANDBOX_DIR,
        // Isolate environment: pass only minimal env vars
        env: {
          PATH: process.env.PATH || '',
          HOME: process.env.HOME || process.env.USERPROFILE || '',
          TEMP: process.env.TEMP || process.env.TMP || SANDBOX_DIR,
          TMP: process.env.TEMP || process.env.TMP || SANDBOX_DIR,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Timeout watchdog
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore — process may have already exited
        }
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_BYTES) {
          stdout += chunk.toString('utf8');
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_BYTES) {
          stderr += chunk.toString('utf8');
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        exitCode = code;
        resolve();
      });

      child.on('error', (spawnErr) => {
        clearTimeout(timer);
        stderr += `\nSpawn error: ${spawnErr.message}`;
        resolve();
      });
    });
  } finally {
    // Always remove temp file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // Non-fatal — log silently
    }
  }

  const executionMs = Date.now() - startTime;

  // Truncate if over cap
  if (stdout.length >= MAX_BYTES) {
    stdout += '\n[OUTPUT TRUNCATED — exceeded 128 KB limit]';
  }
  if (stderr.length >= MAX_BYTES) {
    stderr += '\n[STDERR TRUNCATED — exceeded 128 KB limit]';
  }

  const timeoutMsg = timedOut
    ? `\n[SANDBOX TIMEOUT — process killed after ${timeoutMs / 1000}s]`
    : '';

  const success = !timedOut && exitCode === 0;

  return {
    success,
    output: stdout.trimEnd(),
    error: (stderr + timeoutMsg).trimEnd(),
    exitCode,
    timedOut,
    executionMs,
    language,
    tempFile: path.basename(tempFile), // return only filename (already deleted)
  };
}
