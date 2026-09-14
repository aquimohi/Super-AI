import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FileModification {
  path: string;
  content: string;
}

export interface ModificationResult {
  success: boolean;
  message: string;
  filesModified: string[];
  gitCommitHash?: string;
  tsErrors?: string;
}

const FORBIDDEN_FILES = ['.env', 'package.json', 'tsconfig.json'];

export async function modifyRepoAndCommit(
  modifications: FileModification[],
  commitMessage: string
): Promise<ModificationResult> {
  const rootDir = process.cwd();
  const backupFiles: Record<string, string> = {}; // { absolutePath: originalContent }
  const filesModified: string[] = [];

  try {
    // 1. Validation & Backup
    for (const mod of modifications) {
      // Prevent path traversal
      const normalizedPath = path.normalize(mod.path).replace(/^(\.\.[\/\\])+/, '');
      const absolutePath = path.resolve(rootDir, normalizedPath);

      if (!absolutePath.startsWith(rootDir)) {
        throw new Error(`Security Violation: Attempted to modify file outside workspace (${mod.path})`);
      }

      const basename = path.basename(absolutePath);
      if (FORBIDDEN_FILES.includes(basename)) {
        throw new Error(`Security Violation: Modification of core config file blocked (${basename})`);
      }

      // Check if file exists to backup
      try {
        const stats = await fs.stat(absolutePath);
        if (!stats.isFile()) {
           throw new Error(`Path is not a file: ${mod.path}`);
        }
        const originalContent = await fs.readFile(absolutePath, 'utf8');
        backupFiles[absolutePath] = originalContent;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File does not exist, backup null
          backupFiles[absolutePath] = null as any; 
        } else {
          throw err;
        }
      }
    }

    // 2. Write new contents to disk
    for (const mod of modifications) {
      const normalizedPath = path.normalize(mod.path).replace(/^(\.\.[\/\\])+/, '');
      const absolutePath = path.resolve(rootDir, normalizedPath);
      
      // Ensure parent directories exist
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, mod.content, 'utf8');
      filesModified.push(mod.path);
    }

    // 3. Run TypeScript validation
    console.log('[RepoModifier] Validating changes with tsc...');
    try {
      await execAsync('npx tsc --noEmit', { cwd: rootDir });
    } catch (tsError: any) {
      console.warn('[RepoModifier] TypeScript validation failed, rolling back changes...');
      // Rollback changes
      for (const [absPath, origContent] of Object.entries(backupFiles)) {
        if (origContent === null) {
          await fs.unlink(absPath).catch(() => {}); // Delete if it was a new file
        } else {
          await fs.writeFile(absPath, origContent, 'utf8');
        }
      }
      return {
        success: false,
        message: 'TypeScript validation failed. Changes rolled back.',
        filesModified: [],
        tsErrors: tsError.stdout || tsError.message,
      };
    }

    // 4. Git Automation
    console.log('[RepoModifier] TypeScript validation passed. Committing changes...');
    await execAsync('git add .', { cwd: rootDir });
    
    // Commit
    const gitMsg = `[Jarvis Auto-Evolution] ${commitMessage.replace(/"/g, '\\"')}`;
    await execAsync(`git commit -m "${gitMsg}"`, { cwd: rootDir });

    // Push
    console.log('[RepoModifier] Pushing to origin main...');
    await execAsync('git push origin main', { cwd: rootDir });

    // Get commit hash
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: rootDir });
    const gitCommitHash = stdout.trim();

    return {
      success: true,
      message: 'Code modified, validated, committed, and pushed successfully.',
      filesModified,
      gitCommitHash,
    };

  } catch (error: any) {
    console.error('[RepoModifier] Error during modification pipeline:', error);
    // Attempt rollback on unexpected error
    for (const [absPath, origContent] of Object.entries(backupFiles)) {
       try {
         if (origContent === null) {
           await fs.unlink(absPath).catch(() => {}); 
         } else {
           await fs.writeFile(absPath, origContent, 'utf8');
         }
       } catch (e) {
         console.error(`[RepoModifier] CRITICAL: Failed to rollback file ${absPath}`, e);
       }
    }

    return {
      success: false,
      message: `System error during execution: ${error.message}`,
      filesModified: [],
    };
  }
}
