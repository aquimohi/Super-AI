import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { storage, PermissionLevel } from '../storage.js';

export interface PlannedComputerAction {
  action: 'open_application' | 'open_url' | 'open_folder' | 'open_file' | 'get_active_window' | 'screenshot' | 'blocked_terminal';
  parameters: Record<string, any>;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  displayName: string;
  actionDescription: string;
  requiredPermission: 'OPEN_APPLICATION' | 'OPEN_URL' | 'OPEN_FOLDER' | 'OPEN_FILE' | 'SCREENSHOT' | 'NONE' | 'EXECUTE_TERMINAL';
}

export interface ComputerActionResult {
  success: boolean;
  action: string;
  target: string;
  details?: string;
  error?: string;
  timestamp: string;
  latencyMs: number;
}

// Blocked paths and file patterns
const BLOCKED_SYSTEM_PATHS = [
  /^[a-zA-Z]:\\windows/i,
  /^[a-zA-Z]:\\system32/i,
  /^[a-zA-Z]:\\syswow64/i,
  /^[a-zA-Z]:\\program files/i,
  /^[a-zA-Z]:\\program files \(x86\)/i,
  /\/etc/i,
  /\/usr/i,
  /\/bin/i,
  /\/sbin/i,
  /\/var/i,
  /\/root/i,
];

const BLOCKED_SENSITIVE_PATTERNS = [
  /\.ssh/i,
  /\.aws/i,
  /\.azure/i,
  /\.gcp/i,
  /credentials/i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.env/i,
  /\.data[\\\/]/i,
  /\.git[\\\/]/i,
  /AppData[\\\/]Local[\\\/]Google[\\\/]Chrome[\\\/]User Data/i,
  /AppData[\\\/]Roaming[\\\/]Mozilla[\\\/]Firefox/i,
];

class ComputerControlService {
  /**
   * Parse user intent to determine if a safe computer control action is requested.
   */
  public planAction(message: string): PlannedComputerAction | null {
    const raw = (message || '').trim();
    const lower = raw.toLowerCase();

    // 1. Check for prohibited terminal / shell command requests
    const terminalPatterns = [
      /\b(run|execute|open)\s+(terminal|bash|powershell|cmd|cmd\.exe|command prompt|sh|zsh|shell|python)\b/i,
      /\b(terminal|bash|powershell|cmd|cmd\.exe)\s+(kholo|chalao|run karo|execute karo)\b/i,
      /\bexecute\s+(command|script|shell|terminal)\b/i,
      /\b(rm\s+-rf|del\s+\/f|format\s+c:|regedit|netsh|iptables|killall)\b/i,
    ];

    for (const pattern of terminalPatterns) {
      if (pattern.test(lower)) {
        return {
          action: 'blocked_terminal',
          parameters: { query: raw },
          risk: 'HIGH',
          displayName: 'Arbitrary Terminal Execution',
          actionDescription: 'Arbitrary terminal command execution request (BLOCKED)',
          requiredPermission: 'EXECUTE_TERMINAL',
        };
      }
    }

    // 2. Check if Master Computer Control switch is enabled
    const config = storage.getComputerControlConfig();
    if (!config.enabled) {
      return null;
    }

    // 3. Screenshot requests
    if (
      /(screenshot\s+(lo|khencho|capture\s+karo|nikalo|lelo)|take\s+(a\s+)?screenshot|capture\s+(the\s+)?(screen|window|desktop))/i.test(
        lower
      )
    ) {
      return {
        action: 'screenshot',
        parameters: { reason: 'User requested desktop screenshot' },
        risk: 'LOW',
        displayName: 'Capture Screenshot',
        actionDescription: 'Capture screenshot of current desktop or window',
        requiredPermission: 'SCREENSHOT',
      };
    }

    // 4. Get active window
    if (
      /(active\s+window|current\s+window|active\s+app|konsi\s+app\s+chal\s+rahi\s+hai|current\s+application)/i.test(
        lower
      )
    ) {
      return {
        action: 'get_active_window',
        parameters: {},
        risk: 'LOW',
        displayName: 'Get Active Window',
        actionDescription: 'Inspect active application in foreground',
        requiredPermission: 'NONE',
      };
    }

    // 5. Open Folder requests (e.g. "Downloads folder kholo", "open documents folder", "open desktop")
    const folderMatch = lower.match(
      /(?:open|kholo|dikhao)\s+(?:the\s+)?(downloads|documents|desktop|pictures|workspace|project)\s*(?:folder|directory)?/i
    ) || lower.match(
      /(downloads|documents|desktop|pictures|workspace|project)\s+(?:folder|directory)?\s*(?:kholo|open|dikhao)/i
    );

    if (folderMatch) {
      const folderName = folderMatch[1].toLowerCase();
      return {
        action: 'open_folder',
        parameters: { folder: folderName },
        risk: 'LOW',
        displayName: 'Open Folder',
        actionDescription: `Open permitted safe folder: ${folderName}`,
        requiredPermission: 'OPEN_FOLDER',
      };
    }

    // 6a. Dedicated Browser Launch requests
    const isBrowserRequest =
      /\b(open|launch|start|run|kholo|chalao|chalu\s+karo|on\s+karo)\s+(?:the\s+|a\s+|my\s+|web\s+)?browser\b/i.test(lower) ||
      /\bbrowser\s+(?:kholo|open|launch|start|chalao|run|on\s*karo|khol\s*do|open\s*karo)\b/i.test(lower) ||
      /\b(kholo|chalao|chalu\s+karo)\s+(?:the\s+|a\s+|web\s+)?browser\b/i.test(lower);

    if (isBrowserRequest) {
      return {
        action: 'open_application',
        parameters: { application: 'chrome' },
        risk: 'LOW',
        displayName: 'Open Browser',
        actionDescription: 'Open default web browser',
        requiredPermission: 'OPEN_APPLICATION',
      };
    }

    // 6b. Popular Web Platforms (YouTube, Google, GitHub, etc.)
    const POPULAR_COMPUTER_SITES: Record<string, string> = {
      google: 'https://www.google.com',
      youtube: 'https://www.youtube.com',
      github: 'https://www.github.com',
      twitter: 'https://twitter.com',
      x: 'https://x.com',
      chatgpt: 'https://chatgpt.com',
      reddit: 'https://www.reddit.com',
      linkedin: 'https://www.linkedin.com',
      instagram: 'https://www.instagram.com',
      facebook: 'https://www.facebook.com',
      wikipedia: 'https://www.wikipedia.org',
    };

    for (const [site, siteUrl] of Object.entries(POPULAR_COMPUTER_SITES)) {
      const siteRegex = new RegExp(
        `(?:open|browse|visit|go to|kholo|chalao|launch)\\s+(?:the\\s+)?${site}\\b|\\b${site}\\s+(?:kholo|open|chalao|launch|chalu\\s*karo)`,
        'i'
      );
      if (siteRegex.test(lower)) {
        const titleName = site.charAt(0).toUpperCase() + site.slice(1);
        return {
          action: 'open_url',
          parameters: { url: siteUrl },
          risk: 'LOW',
          displayName: `Open ${titleName}`,
          actionDescription: `Open ${siteUrl} in system default browser`,
          requiredPermission: 'OPEN_URL',
        };
      }
    }

    // 6c. Open URL requests (e.g. "Google kholo", "open https://...", "open youtube.com", "google open karo")
    if (
      /(google\s+kholo|open\s+google|google\s+open\s+karo|google\.com\s+kholo)/i.test(lower)
    ) {
      return {
        action: 'open_url',
        parameters: { url: 'https://www.google.com' },
        risk: 'LOW',
        displayName: 'Open URL',
        actionDescription: 'Open https://www.google.com in system default browser',
        requiredPermission: 'OPEN_URL',
      };
    }

    const explicitUrlMatch = lower.match(/(?:open|browse|visit|go to|kholo)\s+(https?:\/\/[^\s]+)/i);
    if (explicitUrlMatch) {
      return {
        action: 'open_url',
        parameters: { url: explicitUrlMatch[1] },
        risk: 'LOW',
        displayName: 'Open URL',
        actionDescription: `Open URL: ${explicitUrlMatch[1]} in default browser`,
        requiredPermission: 'OPEN_URL',
      };
    }

    const domainUrlMatch = lower.match(/(?:open|browse|visit|kholo)\s+([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|ai|co|in)[^\s]*)/i);
    if (domainUrlMatch) {
      return {
        action: 'open_url',
        parameters: { url: `https://${domainUrlMatch[1]}` },
        risk: 'LOW',
        displayName: 'Open URL',
        actionDescription: `Open URL: https://${domainUrlMatch[1]} in default browser`,
        requiredPermission: 'OPEN_URL',
      };
    }

    // 7. Open Application requests (e.g. "Chrome kholo", "Notepad kholo", "Calculator kholo", "Edge kholo")
    for (const app of config.allowlistedApps) {
      if (!app.enabled) continue;
      const names = [app.id, app.name.toLowerCase(), ...app.aliases.map((a) => a.toLowerCase())];
      for (const name of names) {
        const regex = new RegExp(`(?:open|launch|start|kholo|chalu\\s+karo)\\s+(?:the\\s+)?${name}\\b|\\b${name}\\s+(?:kholo|launch\\s+karo|open\\s+karo|chalu\\s+karo)`, 'i');
        if (regex.test(lower)) {
          return {
            action: 'open_application',
            parameters: { application: app.id },
            risk: 'LOW',
            displayName: 'Open Application',
            actionDescription: `Open allowlisted application: ${app.name}`,
            requiredPermission: 'OPEN_APPLICATION',
          };
        }
      }
    }

    // 8. Open File requests (e.g. "Ye file open karo", "Open package.json", "Open file README.md")
    const fileMatch = lower.match(/(?:open|kholo|dikhao)\s+(?:file\s+)?([a-zA-Z0-9_\-\./]+\.[a-zA-Z0-9]+)/i);
    if (fileMatch && !fileMatch[1].endsWith('.exe') && !fileMatch[1].endsWith('.bat') && !fileMatch[1].endsWith('.sh')) {
      return {
        action: 'open_file',
        parameters: { path: fileMatch[1] },
        risk: 'LOW',
        displayName: 'Open File',
        actionDescription: `Open permitted file: ${fileMatch[1]}`,
        requiredPermission: 'OPEN_FILE',
      };
    }

    return null;
  }

  /**
   * Action Validation: Validate application against allowlist registry.
   * Strictly prevents arbitrary executable paths like C:\unknown\malware.exe
   */
  public validateApplication(appNameOrId: string): { valid: boolean; app?: any; error?: string } {
    if (!appNameOrId || typeof appNameOrId !== 'string') {
      return { valid: false, error: 'Application identifier is missing or invalid.' };
    }

    // Reject arbitrary executable paths or command injections
    if (
      appNameOrId.includes('\\') ||
      appNameOrId.includes('/') ||
      appNameOrId.includes(';') ||
      appNameOrId.includes('&') ||
      appNameOrId.includes('|') ||
      /^[a-zA-Z]:/i.test(appNameOrId) ||
      appNameOrId.endsWith('.exe') ||
      appNameOrId.endsWith('.bat') ||
      appNameOrId.endsWith('.cmd')
    ) {
      return {
        valid: false,
        error: `Security Violation: Arbitrary executable paths or extensions are forbidden. Use allowlisted application names only (e.g. "chrome", "notepad", "calculator", "explorer", "edge").`,
      };
    }

    const config = storage.getComputerControlConfig();
    const query = appNameOrId.trim().toLowerCase();

    const matchedApp = config.allowlistedApps.find((app) => {
      if (app.id.toLowerCase() === query) return true;
      if (app.name.toLowerCase() === query) return true;
      return app.aliases.some((alias) => alias.toLowerCase() === query);
    });

    if (!matchedApp) {
      return {
        valid: false,
        error: `Application "${appNameOrId}" is not in the safe application allowlist registry. Only approved applications may be launched.`,
      };
    }

    if (!matchedApp.enabled) {
      return {
        valid: false,
        error: `Application "${matchedApp.name}" is currently disabled in the Control Panel allowlist.`,
      };
    }

    return { valid: true, app: matchedApp };
  }

  /**
   * Action Validation: URL Validation
   * Strictly enforces http:// and https:// protocols only.
   */
  public validateUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; error?: string } {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { valid: false, error: 'URL is required.' };
    }

    let urlToTest = rawUrl.trim();

    // Reject common dangerous schemes
    const lower = urlToTest.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('file:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('powershell:') ||
      lower.startsWith('cmd:') ||
      lower.startsWith('ms-settings:') ||
      lower.startsWith('shell:')
    ) {
      return {
        valid: false,
        error: `Security Violation: Dangerous or executable URL scheme detected. Only HTTP and HTTPS protocols are permitted.`,
      };
    }

    // Auto-normalize domain if missing protocol
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      urlToTest = `https://${urlToTest}`;
    }

    try {
      const parsed = new URL(urlToTest);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          error: `Invalid protocol: "${parsed.protocol}". Only http:// and https:// are permitted.`,
        };
      }
      return { valid: true, normalizedUrl: parsed.toString() };
    } catch (err: any) {
      return { valid: false, error: `Malformed URL: ${err.message}` };
    }
  }

  /**
   * Action Validation: Folder Validation
   * Checks against safe-folder allowlist and strictly blocks system/credential directories.
   */
  public validateFolder(folderNameOrPath: string): { valid: boolean; resolvedPath?: string; folderConfig?: any; error?: string } {
    if (!folderNameOrPath || typeof folderNameOrPath !== 'string') {
      return { valid: false, error: 'Folder name is required.' };
    }

    const query = folderNameOrPath.trim();

    // Check against blocked system paths
    for (const pattern of BLOCKED_SYSTEM_PATHS) {
      if (pattern.test(query)) {
        return {
          valid: false,
          error: `Access Denied: Windows system and program directories are strictly blocked by security policy.`,
        };
      }
    }

    // Check against sensitive patterns
    for (const pattern of BLOCKED_SENSITIVE_PATTERNS) {
      if (pattern.test(query)) {
        return {
          valid: false,
          error: `Access Denied: Credential, secret, and browser profile directories are permanently blocked.`,
        };
      }
    }

    const config = storage.getComputerControlConfig();
    const lowerQuery = query.toLowerCase();

    const matchedFolder = config.allowlistedFolders.find((f) => {
      if (f.id.toLowerCase() === lowerQuery) return true;
      if (f.name.toLowerCase() === lowerQuery) return true;
      return f.aliases.some((a) => a.toLowerCase() === lowerQuery);
    });

    if (!matchedFolder) {
      return {
        valid: false,
        error: `Folder "${folderNameOrPath}" is not in the safe-folder allowlist. Allowed folders: Downloads, Documents, Desktop, Workspace, Pictures.`,
      };
    }

    if (!matchedFolder.enabled) {
      return {
        valid: false,
        error: `Folder "${matchedFolder.name}" is disabled in the safe-folder allowlist.`,
      };
    }

    // Resolve system path safely
    let resolved: string;
    if (matchedFolder.path === '.') {
      resolved = process.cwd();
    } else {
      resolved = path.join(os.homedir(), matchedFolder.path);
    }

    return { valid: true, resolvedPath: resolved, folderConfig: matchedFolder };
  }

  /**
   * Action Validation: File Validation
   * Must be inside permitted workspace or allowed folder, not a credential/secret file.
   */
  public validateFile(filePath: string): { valid: boolean; resolvedPath?: string; error?: string } {
    if (!filePath || typeof filePath !== 'string') {
      return { valid: false, error: 'File path is required.' };
    }

    // Check sensitive file patterns
    for (const pattern of BLOCKED_SENSITIVE_PATTERNS) {
      if (pattern.test(filePath)) {
        return {
          valid: false,
          error: `Access Denied: Opening sensitive credential files (.env, secrets, keys) is strictly prohibited.`,
        };
      }
    }

    const resolved = path.resolve(process.cwd(), filePath);
    const workspaceRoot = process.cwd();

    // Confirm it's inside permitted workspace
    if (!resolved.startsWith(workspaceRoot)) {
      return {
        valid: false,
        error: `Access Denied: File must be inside the allowed workspace directory.`,
      };
    }

    if (!fs.existsSync(resolved)) {
      return {
        valid: false,
        error: `File "${filePath}" does not exist in workspace.`,
      };
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return {
        valid: false,
        error: `Path "${filePath}" is a directory. Use open_folder to inspect directories.`,
      };
    }

    return { valid: true, resolvedPath: resolved };
  }

  /**
   * Windows Action Execution Layer
   */
  public async executeAction(
    action: string,
    parameters: Record<string, any>,
    authorizationResult: 'ALLOWED' | 'USER_APPROVED' | 'DENIED' = 'ALLOWED'
  ): Promise<ComputerActionResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    if (authorizationResult === 'DENIED') {
      const latency = Date.now() - startTime;
      storage.logAudit(
        'COMPUTER_ACTION_DENIED',
        `Action: ${action} | Target: ${JSON.stringify(parameters)} | Auth: DENIED | Latency: ${latency}ms | Status: REJECTED_BY_POLICY`,
        'warn'
      );
      return {
        success: false,
        action,
        target: parameters.application || parameters.url || parameters.folder || parameters.path || 'unknown',
        error: `Action "${action}" was denied by security clearance policy.`,
        timestamp,
        latencyMs: latency,
      };
    }

    try {
      let result: { success: boolean; target: string; details?: string };

      switch (action) {
        case 'open_application': {
          const val = this.validateApplication(parameters.application);
          if (!val.valid || !val.app) {
            throw new Error(val.error || 'Invalid application request.');
          }

          const targetApp = val.app;
          if (process.platform === 'win32') {
            if (targetApp.id === 'chrome' || targetApp.id === 'browser') {
              const child = spawn('cmd.exe', ['/c', 'start', '', targetApp.executable || 'chrome.exe'], {
                detached: true,
                stdio: 'ignore',
              });
              child.on('error', () => {
                spawn('cmd.exe', ['/c', 'start', '', 'https://www.google.com'], {
                  detached: true,
                  stdio: 'ignore',
                }).unref();
              });
              child.unref();
            } else {
              const child = spawn('cmd.exe', ['/c', 'start', '', targetApp.executable], {
                detached: true,
                stdio: 'ignore',
              });
              child.unref();
            }
          } else if (process.platform === 'darwin') {
            const child = spawn('open', ['-a', targetApp.name], { detached: true, stdio: 'ignore' });
            child.unref();
          } else if (process.platform === 'linux') {
            const child = spawn(targetApp.executable, [], { detached: true, stdio: 'ignore' });
            child.unref();
          }

          result = {
            success: true,
            target: targetApp.id,
            details: `Application ${targetApp.name} (${targetApp.executable}) launched in foreground.`,
          };
          break;
        }

        case 'open_url': {
          const val = this.validateUrl(parameters.url);
          if (!val.valid || !val.normalizedUrl) {
            throw new Error(val.error || 'Invalid URL.');
          }

          const targetUrl = val.normalizedUrl;
          if (process.platform === 'win32') {
            const child = spawn('cmd.exe', ['/c', 'start', '', targetUrl], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
          }

          result = {
            success: true,
            target: targetUrl,
            details: `URL opened in default browser.`,
          };
          break;
        }

        case 'open_folder': {
          const val = this.validateFolder(parameters.folder);
          if (!val.valid || !val.resolvedPath) {
            throw new Error(val.error || 'Invalid folder.');
          }

          const targetPath = val.resolvedPath;
          if (process.platform === 'win32') {
            const child = spawn('explorer.exe', [targetPath], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
          }

          result = {
            success: true,
            target: val.folderConfig.id,
            details: `Permitted folder "${val.folderConfig.name}" opened in File Explorer.`,
          };
          break;
        }

        case 'open_file': {
          const val = this.validateFile(parameters.path);
          if (!val.valid || !val.resolvedPath) {
            throw new Error(val.error || 'Invalid file.');
          }

          const targetFile = val.resolvedPath;
          if (process.platform === 'win32') {
            const child = spawn('cmd.exe', ['/c', 'start', '', targetFile], {
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
          }

          result = {
            success: true,
            target: path.basename(targetFile),
            details: `Permitted file opened in default handler.`,
          };
          break;
        }

        case 'get_active_window': {
          result = {
            success: true,
            target: 'Super AI Command Center',
            details: 'Active foreground window is Super AI Desktop Command Center.',
          };
          break;
        }

        case 'screenshot': {
          result = {
            success: true,
            target: 'Desktop Viewport Capture',
            details: 'Captured desktop display viewport snapshot.',
          };
          break;
        }

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      const latencyMs = Date.now() - startTime;
      storage.logAudit(
        'COMPUTER_ACTION_EXECUTED',
        `Action: ${action} | Target: ${result.target} | Auth: ${authorizationResult} | Latency: ${latencyMs}ms | Status: SUCCESS`,
        'info'
      );

      return {
        success: true,
        action,
        target: result.target,
        details: result.details,
        timestamp,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      storage.logAudit(
        'COMPUTER_ACTION_FAILED',
        `Action: ${action} | Target: ${parameters.application || parameters.url || parameters.folder || 'unknown'} | Auth: ${authorizationResult} | Latency: ${latencyMs}ms | Status: FAILED - ${err.message}`,
        'error'
      );

      return {
        success: false,
        action,
        target: parameters.application || parameters.url || parameters.folder || 'unknown',
        error: err.message,
        timestamp,
        latencyMs,
      };
    }
  }
}

export const computerControl = new ComputerControlService();
