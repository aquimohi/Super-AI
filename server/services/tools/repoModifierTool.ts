import { ToolDefinition, ToolExecutionResult } from './types.js';
import { modifyRepoAndCommit, FileModification } from './repoModifier.js';

export const repoModifierTool: ToolDefinition = {
  name: 'modify_backend_code',
  displayName: 'Code Evolution & Git Pipeline',
  description:
    'Allows the AI to programmatically modify backend source files, automatically run TypeScript validation (npx tsc), ' +
    'and if successful, commit and push the changes to GitHub. ' +
    'Use this tool to evolve the codebase. ' +
    'Target files must be inside the workspace. Modifying core configs like .env or package.json is blocked.',
  requiredPermission: 'MODIFY_CODE',
  risk: 'HIGH',
  category: 'automation',
  parameters: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        description: 'List of files to create or modify.',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file (e.g., server/services/test.ts)' },
            content: { type: 'string', description: 'The complete new content of the file.' },
          },
          required: ['path', 'content'],
        },
      },
      commitMessage: {
        type: 'string',
        description: 'A short description of the changes for the git commit message.',
      },
    },
    required: ['files', 'commitMessage'],
  },

  execute: async (args): Promise<ToolExecutionResult> => {
    const files = args.files as FileModification[];
    const commitMessage = String(args.commitMessage || 'Automated code evolution').trim();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return {
        success: false,
        error: 'No files provided for modification.',
        displaySummary: '❌ Error: No files provided.',
        sanitizedExecutionSummary: 'modify_backend_code: 0 files',
        sanitizedResultSummary: 'ERROR: No files',
      };
    }

    try {
      const result = await modifyRepoAndCommit(files, commitMessage);

      if (result.success) {
        return {
          success: true,
          result: {
            filesModified: result.filesModified,
            gitCommitHash: result.gitCommitHash,
          },
          displaySummary:
            `✅ Successfully modified ${result.filesModified.length} file(s), validated with tsc, and pushed to git.\n` +
            `Commit Hash: ${result.gitCommitHash}`,
          sanitizedExecutionSummary: `modify_backend_code: ${result.filesModified.length} files`,
          sanitizedResultSummary: `SUCCESS: Commit ${result.gitCommitHash?.substring(0, 7)}`,
        };
      } else {
        return {
          success: false,
          error: result.message + (result.tsErrors ? `\n\nTypeScript Errors:\n${result.tsErrors}` : ''),
          result: { tsErrors: result.tsErrors },
          displaySummary: `❌ Modification failed: ${result.message}`,
          sanitizedExecutionSummary: `modify_backend_code: ${files.length} files`,
          sanitizedResultSummary: `FAILED: ${result.message}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `System error during execution: ${err.message}`,
        displaySummary: `💥 System Error: ${err.message}`,
        sanitizedExecutionSummary: `modify_backend_code system error`,
        sanitizedResultSummary: `SYSTEM ERROR: ${err.message}`,
      };
    }
  },
};
