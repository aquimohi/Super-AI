import { ToolDefinition, ToolExecutionResult } from './types.js';
import fs from 'fs/promises';
import path from 'path';

export const createFileTool: ToolDefinition = {
  name: 'write_file',
  displayName: 'Write File',
  description:
    'Creates a new file or overwrites an existing file with the provided content. Useful for generating scripts, config files, or markdown docs. The path must be relative to the workspace.',
  requiredPermission: 'MODIFY_CODE',
  risk: 'LOW',
  category: 'automation',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to the file to create or overwrite (e.g. "scripts/test.py" or "notes.md")',
      },
      content: {
        type: 'string',
        description: 'The raw text content to write into the file.',
      },
    },
    required: ['path', 'content'],
  },

  execute: async (args): Promise<ToolExecutionResult> => {
    try {
      const relPath = String(args.path || '').trim();
      const content = String(args.content || '');

      if (!relPath) {
        return {
          success: false,
          error: 'No path provided.',
          sanitizedExecutionSummary: 'write_file: missing path',
        };
      }

      // Resolve absolute path safely relative to the current working directory
      const absolutePath = path.resolve(process.cwd(), relPath);

      // Basic directory traversal protection
      if (!absolutePath.startsWith(process.cwd())) {
        return {
          success: false,
          error: 'Path must be inside the workspace.',
          sanitizedExecutionSummary: 'write_file: path traversal blocked',
        };
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      // Write the file
      await fs.writeFile(absolutePath, content, 'utf8');

      return {
        success: true,
        result: { path: relPath, size: content.length },
        displaySummary: `✅ Created file: ${relPath}`,
        sanitizedExecutionSummary: `write_file: ${relPath}`,
        sanitizedResultSummary: `File written successfully (${content.length} bytes)`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to write file: ${err.message}`,
        sanitizedExecutionSummary: `write_file system error`,
      };
    }
  },
};
