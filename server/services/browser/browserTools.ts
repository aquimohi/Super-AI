import { ToolDefinition, ToolExecutionResult } from '../tools/types.js';
import { browserService } from './browserService.js';

export const browserOpenPageTool: ToolDefinition = {
  name: 'browser_open_page',
  displayName: 'Open Browser Page',
  description:
    'Open an allowlisted http/https webpage in dedicated Super AI browser. Parses readable content and visible links.',
  category: 'web',
  requiredPermission: 'BROWSER_OPEN_PAGE',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The target web page URL (must start with http:// or https://)',
      },
    },
    required: ['url'],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const convId = context?.requestId || 'default';
    const result = await browserService.openPage(convId, args.url);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to open page',
        displaySummary: `Browser Open Error: ${result.error}`,
      };
    }
    return {
      success: true,
      result: {
        url: result.url,
        title: result.title,
        content: result.content,
        linkCount: result.links?.length || 0,
      },
      displaySummary: `Opened ${result.url} ("${result.title}")`,
      sanitizedExecutionSummary: `Navigated to ${result.url}`,
      sanitizedResultSummary: `Page Title: "${result.title}". Clean text extracted (${result.content?.length || 0} chars).`,
    };
  },
};

export const browserReadPageTool: ToolDefinition = {
  name: 'browser_read_page',
  displayName: 'Read Browser Page',
  description:
    'Extract and return the readable text content and title of the currently open webpage in Super AI browser.',
  category: 'web',
  requiredPermission: 'BROWSER_READ_PAGE',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: (args, context): ToolExecutionResult => {
    const convId = context?.requestId || 'default';
    const result = browserService.readPage(convId);
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'No active page to read',
        displaySummary: result.error,
      };
    }
    return {
      success: true,
      result: {
        url: result.url,
        title: result.title,
        content: result.content,
      },
      displaySummary: `Read page: "${result.title}"`,
      sanitizedExecutionSummary: `Reading content of ${result.url}`,
      sanitizedResultSummary: `Title: ${result.title}. Content: ${result.content?.slice(0, 300)}...`,
    };
  },
};

export const browserFindTextTool: ToolDefinition = {
  name: 'browser_find_text',
  displayName: 'Find Text on Page',
  description:
    'Search for specific text within the currently active webpage in Super AI browser and return contextual snippets.',
  category: 'web',
  requiredPermission: 'BROWSER_FIND_TEXT',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text string to search for on the current page',
      },
    },
    required: ['query'],
  },
  execute: (args, context): ToolExecutionResult => {
    const convId = context?.requestId || 'default';
    const result = browserService.findText(convId, args.query);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        displaySummary: result.error,
      };
    }
    return {
      success: true,
      result: {
        query: args.query,
        matchedSnippets: result.matchedText,
      },
      displaySummary: result.details,
      sanitizedExecutionSummary: `Searching for text "${args.query}"`,
      sanitizedResultSummary: `${result.matchedText?.length || 0} occurrences found.`,
    };
  },
};

export const browserFindLinksTool: ToolDefinition = {
  name: 'browser_find_links',
  displayName: 'Find Links on Page',
  description:
    'Search or list visible navigation hyperlinks on the currently loaded webpage in Super AI browser.',
  category: 'web',
  requiredPermission: 'BROWSER_FIND_LINKS',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Optional keyword or topic to filter visible links (e.g. "documentation", "api")',
      },
    },
  },
  execute: (args, context): ToolExecutionResult => {
    const convId = context?.requestId || 'default';
    const result = browserService.findLinks(convId, args.query);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        displaySummary: result.error,
      };
    }
    return {
      success: true,
      result: {
        filter: args.query || 'all',
        links: result.links,
      },
      displaySummary: `Found ${result.links?.length || 0} links.`,
      sanitizedExecutionSummary: `Finding links matching "${args.query || 'all'}"`,
      sanitizedResultSummary: `Found ${result.links?.length || 0} visible links.`,
    };
  },
};

export const browserClickLinkTool: ToolDefinition = {
  name: 'browser_click_link',
  displayName: 'Click Browser Link',
  description:
    'Identify and navigate to a visible link on the current page by text or URL. Destination is strictly validated to http/https.',
  category: 'web',
  requiredPermission: 'BROWSER_CLICK_LINK',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      link: {
        type: 'string',
        description: 'Link text, accessible label, or href to click',
      },
    },
    required: ['link'],
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const convId = context?.requestId || 'default';
    const result = await browserService.clickLink(convId, args.link);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        displaySummary: `Click Error: ${result.error}`,
      };
    }
    return {
      success: true,
      result: {
        url: result.url,
        title: result.title,
        content: result.content,
      },
      displaySummary: `Clicked link -> "${result.title}" (${result.url})`,
      sanitizedExecutionSummary: `Clicked link "${args.link}" -> ${result.url}`,
      sanitizedResultSummary: `Navigated to ${result.url}. Page title: "${result.title}".`,
    };
  },
};

export const browserGoBackTool: ToolDefinition = {
  name: 'browser_go_back',
  displayName: 'Browser Go Back',
  description: 'Navigate back to the previous webpage in Super AI browser session history.',
  category: 'web',
  requiredPermission: 'BROWSER_GO_BACK',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const convId = context?.requestId || 'default';
    const result = await browserService.goBack(convId);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        displaySummary: result.error,
      };
    }
    return {
      success: true,
      result: { url: result.url, title: result.title },
      displaySummary: `Navigated back to "${result.title}"`,
      sanitizedExecutionSummary: 'Back navigation',
      sanitizedResultSummary: `Loaded ${result.url} ("${result.title}")`,
    };
  },
};

export const browserGoForwardTool: ToolDefinition = {
  name: 'browser_go_forward',
  displayName: 'Browser Go Forward',
  description: 'Navigate forward to the next webpage in Super AI browser session history.',
  category: 'web',
  requiredPermission: 'BROWSER_GO_FORWARD',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const convId = context?.requestId || 'default';
    const result = await browserService.goForward(convId);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        displaySummary: result.error,
      };
    }
    return {
      success: true,
      result: { url: result.url, title: result.title },
      displaySummary: `Navigated forward to "${result.title}"`,
      sanitizedExecutionSummary: 'Forward navigation',
      sanitizedResultSummary: `Loaded ${result.url} ("${result.title}")`,
    };
  },
};

export const browserRefreshPageTool: ToolDefinition = {
  name: 'browser_refresh_page',
  displayName: 'Refresh Browser Page',
  description: 'Reload and re-parse the current active webpage in Super AI browser.',
  category: 'web',
  requiredPermission: 'BROWSER_REFRESH_PAGE',
  risk: 'LOW',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (args, context): Promise<ToolExecutionResult> => {
    const convId = context?.requestId || 'default';
    const result = await browserService.refreshPage(convId);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        displaySummary: result.error,
      };
    }
    return {
      success: true,
      result: { url: result.url, title: result.title },
      displaySummary: `Refreshed page "${result.title}"`,
      sanitizedExecutionSummary: `Refreshed ${result.url}`,
      sanitizedResultSummary: `Refreshed "${result.title}".`,
    };
  },
};
