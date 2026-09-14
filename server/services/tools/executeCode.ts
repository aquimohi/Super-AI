import { ToolDefinition, ToolExecutionResult } from './types.js';
import { runInSandbox } from '../sandbox/sandboxExecutor.js';

export const executeCodeTool: ToolDefinition = {
  name: 'execute_code',
  displayName: 'Code Execution Sandbox',
  description:
    'Securely executes Python or JavaScript code in an isolated sandbox and returns the output (stdout) and any errors (stderr). Use this whenever the user asks you to write AND run/test a script. The code runs with a strict 5-second timeout. Perfect for quick calculations, data processing, algorithm demos, and script validation.',
  requiredPermission: 'EXECUTE_CODE',
  risk: 'HIGH',
  category: 'automation',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description:
          'The complete, self-contained source code to execute. Do not include any shell commands or subprocess calls.',
      },
      language: {
        type: 'string',
        description: 'The programming language of the code.',
        enum: ['python', 'javascript'],
      },
    },
    required: ['code', 'language'],
  },

  execute: async (args): Promise<ToolExecutionResult> => {
    const code = String(args.code || '').trim();
    const language = String(args.language || '').toLowerCase().trim() as 'python' | 'javascript';

    // Validate inputs
    if (!code) {
      return {
        success: false,
        error: 'Missing required parameter: "code" cannot be empty.',
        displaySummary: 'Code Execution error: No code provided.',
        sanitizedExecutionSummary: 'execute_code — empty code',
        sanitizedResultSummary: 'ERROR: No code provided',
      };
    }

    if (language !== 'python' && language !== 'javascript') {
      return {
        success: false,
        error: `Unsupported language: "${language}". Only "python" and "javascript" are supported.`,
        displaySummary: `Code Execution error: Unsupported language "${language}"`,
        sanitizedExecutionSummary: `execute_code — unsupported language: ${language}`,
        sanitizedResultSummary: 'ERROR: Unsupported language',
      };
    }

    const langLabel = language === 'python' ? 'Python 🐍' : 'JavaScript ⚡';
    const codePreview = code.split('\n').slice(0, 3).join(' ↵ ').slice(0, 80);

    try {
      const result = await runInSandbox({ code, language, timeoutMs: 5_000 });

      const statusLabel = result.timedOut
        ? '⏱ TIMEOUT'
        : result.success
        ? '✅ SUCCESS'
        : '❌ ERROR';

      return {
        success: result.success,
        result: {
          language: result.language,
          output: result.output,
          error: result.error,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          executionMs: result.executionMs,
        },
        displaySummary: `${langLabel} sandbox — ${statusLabel} (${result.executionMs}ms)${result.output ? `\nOutput: ${result.output.slice(0, 200)}` : ''}${result.error ? `\nStderr: ${result.error.slice(0, 200)}` : ''}`,
        sanitizedExecutionSummary: `${langLabel}: "${codePreview}..." (${result.executionMs}ms)`,
        sanitizedResultSummary: result.timedOut
          ? 'TIMEOUT — process killed after 5s'
          : result.success
          ? `Exit 0 — ${result.output.split('\n').length} output line(s)`
          : `Exit ${result.exitCode ?? '?'} — stderr captured`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Sandbox system error: ${err.message}`,
        displaySummary: `${langLabel} sandbox — 💥 SYSTEM ERROR: ${err.message}`,
        sanitizedExecutionSummary: `execute_code — system error`,
        sanitizedResultSummary: `SYSTEM ERROR: ${err.message}`,
      };
    }
  },
};
