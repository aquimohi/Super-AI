import { Router } from 'express';
import { runInSandbox } from '../services/sandbox/sandboxExecutor.js';

export const sandboxRouter = Router();

/**
 * POST /api/sandbox/execute
 *
 * Body:
 *   code     — string: raw Python or JavaScript code to execute
 *   language — 'python' | 'javascript'
 *
 * Response:
 *   { success: boolean, output: string, error: string, exitCode: number | null, timedOut: boolean, executionMs: number }
 */
sandboxRouter.post('/execute', async (req, res) => {
  try {
    const { code, language } = req.body;

    // Validate code
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        output: '',
        error: 'Missing required field: "code" must be a non-empty string.',
      });
    }

    // Validate language
    if (language !== 'python' && language !== 'javascript') {
      return res.status(400).json({
        success: false,
        output: '',
        error: 'Invalid "language". Must be "python" or "javascript".',
      });
    }

    // Enforce reasonable code size limit (64 KB)
    if (code.length > 64 * 1024) {
      return res.status(413).json({
        success: false,
        output: '',
        error: 'Code payload exceeds 64 KB limit.',
      });
    }

    const result = await runInSandbox({ code, language });

    return res.json({
      success: result.success,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      executionMs: result.executionMs,
      language: result.language,
    });
  } catch (err: any) {
    console.error('[SandboxRoute] Unhandled error:', err);
    return res.status(500).json({
      success: false,
      output: '',
      error: `Internal sandbox error: ${err?.message || String(err)}`,
    });
  }
});
