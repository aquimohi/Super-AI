import fs from 'fs';
import path from 'path';
import { ToolDefinition, ToolExecutionResult } from './types.js';

const FORBIDDEN_FILE_PATTERNS = [
  /\.env(\..+)?$/i,
  /\.git/i,
  /\.data/i,
  /superai-store/i,
  /id_rsa/i,
  /id_ed25519/i,
  /id_dsa/i,
  /\.ssh/i,
  /passwd/i,
  /shadow/i,
  /sudoers/i,
  /credentials?/i,
  /secrets?/i,
  /token/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /\.sqlite/i,
  /history/i,
  /cookie/i,
  /keychain/i,
  /login data/i,
  /web data/i,
];

const MAX_SAFE_FILE_SIZE = 64 * 1024; // 64 KB limit

export const readFileTool: ToolDefinition = {
  name: 'read_file',
  displayName: 'Read File',
  description: 'Reads the contents of an approved workspace text file (e.g. package.json, source files, documentation) within strict security boundaries.',
  requiredPermission: 'READ_FILES',
  risk: 'MEDIUM',
  category: 'filesystem',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to the approved file inside the workspace (e.g. "package.json", "metadata.json", "src/types.ts", "README.md").',
      },
    },
    required: ['path'],
  },
  execute: async (args): Promise<ToolExecutionResult> => {
    const rawPath = String(args.path || '').trim();
    if (!rawPath) {
      return {
        success: false,
        error: 'Missing required "path" parameter.',
        displaySummary: 'Read File error: No file path provided',
        sanitizedExecutionSummary: 'path: [empty]',
        sanitizedResultSummary: 'Error: Missing path',
      };
    }

    const workspaceRoot = path.resolve(process.cwd());
    const normalizedInput = rawPath.replace(/^[\\/]+/, '');
    const resolvedPath = path.resolve(workspaceRoot, normalizedInput);
    const relativePath = path.relative(workspaceRoot, resolvedPath);

    // 1. Enforce Workspace Boundary (Reject path traversal)
    if (!resolvedPath.startsWith(workspaceRoot) || relativePath.startsWith('..')) {
      return {
        success: false,
        error: `Access denied: Path "${rawPath}" is outside the permitted application workspace boundary.`,
        displaySummary: `Access denied: Outside workspace boundary.`,
        sanitizedExecutionSummary: `path: ${rawPath}`,
        sanitizedResultSummary: 'ACCESS DENIED [OUTSIDE WORKSPACE]',
      };
    }

    // 2. Reject Sensitive File Patterns
    const baseName = path.basename(resolvedPath).toLowerCase();
    const isForbidden = FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(resolvedPath) || pattern.test(baseName));
    if (isForbidden || baseName.startsWith('.')) {
      return {
        success: false,
        error: `Access denied: Access to system, credential, or sensitive security files is strictly blocked by policy.`,
        displaySummary: `Access denied: File "${baseName}" is blocked by security policy.`,
        sanitizedExecutionSummary: `path: ${relativePath}`,
        sanitizedResultSummary: 'ACCESS DENIED [SECURITY POLICY VIOLATION]',
      };
    }

    // 3. Verify Existence
    if (!fs.existsSync(resolvedPath)) {
      return {
        success: false,
        error: `File not found: "${relativePath}" does not exist in the permitted workspace.`,
        displaySummary: `File not found: ${relativePath}`,
        sanitizedExecutionSummary: `path: ${relativePath}`,
        sanitizedResultSummary: 'FILE NOT FOUND',
      };
    }

    // 4. Verify Stat & Size
    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolvedPath);
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to inspect file properties: ${err.message}`,
        sanitizedExecutionSummary: `path: ${relativePath}`,
        sanitizedResultSummary: 'STAT ERROR',
      };
    }

    if (!stat.isFile()) {
      return {
        success: false,
        error: `Access denied: "${relativePath}" is a directory or special file, not a readable text file.`,
        sanitizedExecutionSummary: `path: ${relativePath}`,
        sanitizedResultSummary: 'NOT A REGULAR FILE',
      };
    }

    // 5. Read Content safely
    try {
      const isOversized = stat.size > MAX_SAFE_FILE_SIZE;
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const safeContent = isOversized
        ? content.slice(0, MAX_SAFE_FILE_SIZE) + `\n...[TRUNCATED: File exceeds ${MAX_SAFE_FILE_SIZE} bytes]`
        : content;

      const lines = safeContent.split('\n').length;

      return {
        success: true,
        result: {
          path: relativePath,
          sizeBytes: stat.size,
          lines,
          truncated: isOversized,
          content: safeContent,
        },
        displaySummary: `Read ${relativePath} (${stat.size} bytes, ${lines} lines)`,
        sanitizedExecutionSummary: `path: ${relativePath}`,
        sanitizedResultSummary: `File read successfully (${stat.size} bytes, ${lines} lines)`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to read file: ${err.message}`,
        sanitizedExecutionSummary: `path: ${relativePath}`,
        sanitizedResultSummary: `READ ERROR: ${err.message}`,
      };
    }
  },
};
