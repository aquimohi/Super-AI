import { ToolDefinition } from './types.js';
import { computerControl } from '../computerControl.js';

export const openApplicationTool: ToolDefinition = {
  name: 'open_application',
  displayName: 'Open Application',
  description:
    'Open an allowlisted desktop application safely (e.g. "chrome", "notepad", "calculator", "explorer", "edge"). Only registered allowlisted applications are permitted. Arbitrary executable paths (e.g. C:\\unknown\\malware.exe) are strictly rejected.',
  parameters: {
    type: 'object',
    properties: {
      application: {
        type: 'string',
        description:
          'Name or alias of the allowlisted application to open (e.g. "chrome", "notepad", "calculator", "explorer", "edge")',
      },
    },
    required: ['application'],
  },
  requiredPermission: 'OPEN_APPLICATION',
  risk: 'LOW',
  category: 'computer-control',
  execute: async (args) => {
    const res = await computerControl.executeAction('open_application', args);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        sanitizedExecutionSummary: `Refused application launch: ${args.application}`,
      };
    }
    return {
      success: true,
      result: {
        success: true,
        action: 'open_application',
        target: res.target,
        details: res.details,
      },
      displaySummary: `Launched application: ${res.target}`,
      sanitizedExecutionSummary: `Application launched: ${res.target}`,
      sanitizedResultSummary: `Application ${res.target} running in foreground`,
    };
  },
};

export const openUrlTool: ToolDefinition = {
  name: 'open_url',
  displayName: 'Open URL',
  description:
    'Open a verified web URL in the system default browser (HTTP/HTTPS only). Arbitrary browser command injection or script schemes are prohibited.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Web URL starting with http:// or https:// (e.g. "https://www.google.com")',
      },
    },
    required: ['url'],
  },
  requiredPermission: 'OPEN_URL',
  risk: 'LOW',
  category: 'computer-control',
  execute: async (args) => {
    const res = await computerControl.executeAction('open_url', args);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        sanitizedExecutionSummary: `Refused URL opening: ${args.url}`,
      };
    }
    return {
      success: true,
      result: {
        success: true,
        action: 'open_url',
        target: res.target,
        details: res.details,
      },
      displaySummary: `Opened URL in default browser: ${res.target}`,
      sanitizedExecutionSummary: `Opened URL: ${res.target}`,
      sanitizedResultSummary: `URL active in browser: ${res.target}`,
    };
  },
};

export const openFolderTool: ToolDefinition = {
  name: 'open_folder',
  displayName: 'Open Folder',
  description:
    'Open a permitted safe directory from the folder allowlist (e.g. "Downloads", "Documents", "Desktop", "workspace", "Pictures"). Arbitrary system paths and sensitive directories are strictly blocked.',
  parameters: {
    type: 'object',
    properties: {
      folder: {
        type: 'string',
        description:
          'Name of the permitted folder (e.g. "Downloads", "Documents", "Desktop", "workspace", "Pictures")',
      },
    },
    required: ['folder'],
  },
  requiredPermission: 'OPEN_FOLDER',
  risk: 'LOW',
  category: 'computer-control',
  execute: async (args) => {
    const res = await computerControl.executeAction('open_folder', args);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        sanitizedExecutionSummary: `Refused folder access: ${args.folder}`,
      };
    }
    return {
      success: true,
      result: {
        success: true,
        action: 'open_folder',
        target: res.target,
        details: res.details,
      },
      displaySummary: `Opened permitted folder: ${res.target}`,
      sanitizedExecutionSummary: `Opened folder: ${res.target}`,
      sanitizedResultSummary: `Folder active in File Explorer`,
    };
  },
};

export const openFileTool: ToolDefinition = {
  name: 'open_file',
  displayName: 'Open File',
  description:
    'Open a permitted file located inside the workspace with the system default application. Credential files and secrets (.env, keys) are strictly blocked.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path of the permitted workspace file to open',
      },
    },
    required: ['path'],
  },
  requiredPermission: 'OPEN_FILE',
  risk: 'LOW',
  category: 'computer-control',
  execute: async (args) => {
    const res = await computerControl.executeAction('open_file', args);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        sanitizedExecutionSummary: `Refused file opening: ${args.path}`,
      };
    }
    return {
      success: true,
      result: {
        success: true,
        action: 'open_file',
        target: res.target,
        details: res.details,
      },
      displaySummary: `Opened permitted file: ${res.target}`,
      sanitizedExecutionSummary: `Opened file: ${res.target}`,
      sanitizedResultSummary: `File opened in default handler: ${res.target}`,
    };
  },
};

export const getActiveWindowTool: ToolDefinition = {
  name: 'get_active_window',
  displayName: 'Get Active Window',
  description: 'Inspect the current active desktop application or foreground window title.',
  parameters: {
    type: 'object',
    properties: {},
  },
  requiredPermission: 'NONE',
  risk: 'LOW',
  category: 'computer-control',
  execute: async (args) => {
    const res = await computerControl.executeAction('get_active_window', args);
    return {
      success: true,
      result: {
        success: true,
        action: 'get_active_window',
        target: res.target,
        details: res.details,
      },
      displaySummary: `Active window: ${res.target}`,
      sanitizedExecutionSummary: `Queried active foreground window`,
      sanitizedResultSummary: `Foreground window: ${res.target}`,
    };
  },
};

export const screenshotTool: ToolDefinition = {
  name: 'screenshot',
  displayName: 'Take Screenshot',
  description:
    'Capture a screenshot of the current active window or desktop ONLY when explicitly requested by the user.',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Explicit reason or context for capturing the screenshot',
      },
    },
  },
  requiredPermission: 'SCREENSHOT',
  risk: 'LOW',
  category: 'computer-control',
  execute: async (args) => {
    const res = await computerControl.executeAction('screenshot', args);
    return {
      success: true,
      result: {
        success: true,
        action: 'screenshot',
        target: res.target,
        details: res.details,
      },
      displaySummary: `Captured screenshot: ${res.target}`,
      sanitizedExecutionSummary: `Screenshot captured: ${args.reason || 'User requested'}`,
      sanitizedResultSummary: `Display viewport captured successfully`,
    };
  },
};
