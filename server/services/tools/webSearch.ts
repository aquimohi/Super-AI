import { ToolDefinition, ToolExecutionResult } from './types.js';

interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

interface WebSearchProvider {
  name: string;
  isAvailable: () => boolean;
  search: (query: string) => Promise<SearchResultItem[]>;
}

/**
 * Abstract Web Search Providers
 */
const providers: WebSearchProvider[] = [
  // 1. Tavily Search Provider
  {
    name: 'Tavily',
    isAvailable: () => Boolean(process.env.TAVILY_API_KEY),
    search: async (query: string): Promise<SearchResultItem[]> => {
      const apiKey = process.env.TAVILY_API_KEY;
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: 5,
        }),
      });

      if (!res.ok) {
        throw new Error(`Tavily search failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        title: r.title || 'Untitled Result',
        snippet: r.content || r.snippet || '',
        url: r.url || '',
      }));
    },
  },

  // 2. Serper Search Provider (Google Serper)
  {
    name: 'Serper',
    isAvailable: () => Boolean(process.env.SERPER_API_KEY),
    search: async (query: string): Promise<SearchResultItem[]> => {
      const apiKey = process.env.SERPER_API_KEY;
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });

      if (!res.ok) {
        throw new Error(`Serper search failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return (data.organic || []).map((r: any) => ({
        title: r.title || 'Untitled Result',
        snippet: r.snippet || '',
        url: r.link || '',
      }));
    },
  },

  // 3. SerpApi Search Provider
  {
    name: 'SerpApi',
    isAvailable: () => Boolean(process.env.SERPAPI_API_KEY),
    search: async (query: string): Promise<SearchResultItem[]> => {
      const apiKey = process.env.SERPAPI_API_KEY;
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`SerpApi search failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return (data.organic_results || []).map((r: any) => ({
        title: r.title || 'Untitled Result',
        snippet: r.snippet || '',
        url: r.link || '',
      }));
    },
  },

  // 4. Brave Search Provider
  {
    name: 'Brave',
    isAvailable: () => Boolean(process.env.BRAVE_SEARCH_API_KEY),
    search: async (query: string): Promise<SearchResultItem[]> => {
      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey!,
        },
      });

      if (!res.ok) {
        throw new Error(`Brave search failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return (data.web?.results || []).map((r: any) => ({
        title: r.title || 'Untitled Result',
        snippet: r.description || '',
        url: r.url || '',
      }));
    },
  },
];

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  displayName: 'Web Search',
  description: 'Searches the live web for facts, news, documentation, and real-time information via secure server-side grounding.',
  requiredPermission: 'WEB_SEARCH',
  risk: 'LOW',
  category: 'web',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Web search query to look up on the live Internet, e.g. "latest AI developments", "weather in Mumbai", "OpenRouter models"',
      },
    },
    required: ['query'],
  },
  execute: async (args): Promise<ToolExecutionResult> => {
    const rawQuery = String(args.query || '').trim();
    if (!rawQuery) {
      return {
        success: false,
        error: 'Missing required "query" parameter.',
        displaySummary: 'Web Search error: No search query provided',
        sanitizedExecutionSummary: 'Empty query',
        sanitizedResultSummary: 'Error: No query provided',
      };
    }

    // Identify an available provider
    const activeProvider = providers.find((p) => p.isAvailable());

    if (!activeProvider) {
      // Per instructions: "If no web-search provider is configured, return: 'Web search is not configured.' Do not fabricate search results."
      return {
        success: true,
        result: {
          status: 'unconfigured',
          message: 'Web search is not configured.',
          results: [],
        },
        displaySummary: 'Web search is not configured.',
        sanitizedExecutionSummary: `Query: "${rawQuery.slice(0, 40)}"`,
        sanitizedResultSummary: 'Web search is not configured.',
      };
    }

    try {
      const results = await activeProvider.search(rawQuery);
      return {
        success: true,
        result: {
          provider: activeProvider.name,
          query: rawQuery,
          count: results.length,
          results,
        },
        displaySummary: `Found ${results.length} live results via ${activeProvider.name} for "${rawQuery}"`,
        sanitizedExecutionSummary: `Query: "${rawQuery.slice(0, 40)}" [Provider: ${activeProvider.name}]`,
        sanitizedResultSummary: `${results.length} live results retrieved`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Search provider error (${activeProvider.name}): ${err.message}`,
        displaySummary: `Search failed: ${err.message}`,
        sanitizedExecutionSummary: `Query: "${rawQuery.slice(0, 40)}"`,
        sanitizedResultSummary: `Provider error: ${err.message}`,
      };
    }
  },
};
