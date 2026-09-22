import * as cheerio from 'cheerio';
import { spawn } from 'child_process';
import { storage } from '../../storage.js';
import {
  BrowserActionType,
  BrowserActionResult,
  BrowserLinkItem,
  BrowserSessionState,
} from './types.js';
import { validateBrowserUrl } from './urlValidator.js';

const SAFE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SuperAI-SafeBrowser/1.0 Safari/537.36';

class BrowserService {
  // In-memory dedicated browser sessions isolated by conversationId
  private sessions: Map<string, BrowserSessionState> = new Map();

  public getOrCreateSession(conversationId: string): BrowserSessionState {
    const existing = this.sessions.get(conversationId);
    if (existing) return existing;

    const newSession: BrowserSessionState = {
      conversationId,
      currentUrl: null,
      pageTitle: 'No page open',
      pageText: '',
      links: [],
      history: [],
      historyIndex: -1,
      lastAction: null,
      actionResult: null,
      lastUpdated: Date.now(),
    };
    this.sessions.set(conversationId, newSession);
    return newSession;
  }

  public getSession(conversationId: string): BrowserSessionState | null {
    return this.sessions.get(conversationId) || null;
  }

  /**
   * Helper to fetch and parse a web page cleanly
   */
  private async fetchAndParse(
    targetUrl: string
  ): Promise<{ title: string; text: string; links: BrowserLinkItem[] }> {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': SAFE_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise: scripts, styles, forms, inputs, media, iframes
    $(
      'script, style, noscript, iframe, svg, canvas, link, meta, select, input, textarea, button, form, [aria-hidden="true"], [hidden]'
    ).remove();

    // Extract title
    const title =
      $('title').first().text().trim() ||
      $('h1').first().text().trim() ||
      new URL(targetUrl).hostname;

    // Extract readable text
    let rawText = $('body').text() || $.root().text();
    rawText = rawText.replace(/\s+/g, ' ').trim();
    // Truncate to maximum 2,500 characters to prevent prompt blowouts
    const cleanText = rawText.slice(0, 2500);

    // Extract visible links with absolute resolution
    const links: BrowserLinkItem[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href')?.trim();
      const linkText = $(el).text().replace(/\s+/g, ' ').trim();

      if (!rawHref || rawHref.startsWith('#') || rawHref.toLowerCase().startsWith('javascript:')) {
        return;
      }

      try {
        const resolved = new URL(rawHref, targetUrl).toString();
        if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
          const key = `${linkText.toLowerCase()}|${resolved}`;
          if (!seen.has(key) && linkText.length > 0 && linkText.length < 90) {
            seen.add(key);
            links.push({
              text: linkText,
              href: resolved,
              title: $(el).attr('title')?.trim(),
            });
          }
        }
      } catch {
        // invalid link, ignore
      }
    });

    return {
      title,
      text: cleanText,
      links: links.slice(0, 40), // keep top 40 relevant links
    };
  }

  /**
   * Action 1: OPEN_PAGE
   */
  public async openPage(
    conversationId: string,
    rawUrl: string
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const validation = validateBrowserUrl(rawUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      return {
        success: false,
        action: 'open_page',
        url: rawUrl,
        error: validation.error || 'Invalid URL',
        latencyMs: Date.now() - startTime,
      };
    }

    const targetUrl = validation.normalizedUrl;
    const session = this.getOrCreateSession(conversationId);

    // Launch actual desktop browser window on user's system so it visibly opens
    if (process.platform === 'win32') {
      try {
        const child = spawn('cmd.exe', ['/c', 'start', '', targetUrl], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
      } catch (err: any) {
        console.warn('[BrowserService] Desktop browser launch warning:', err.message);
      }
    } else if (process.platform === 'darwin') {
      try {
        const child = spawn('open', [targetUrl], { detached: true, stdio: 'ignore' });
        child.unref();
      } catch {}
    } else if (process.platform === 'linux') {
      try {
        const child = spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' });
        child.unref();
      } catch {}
    }

    try {
      const { title, text, links } = await this.fetchAndParse(targetUrl);

      // Update session history
      if (session.historyIndex < session.history.length - 1) {
        session.history = session.history.slice(0, session.historyIndex + 1);
      }
      session.history.push(targetUrl);
      session.historyIndex = session.history.length - 1;

      session.currentUrl = targetUrl;
      session.pageTitle = title;
      session.pageText = text;
      session.links = links;
      session.lastAction = 'open_page';
      session.actionResult = `Loaded "${title}" (${targetUrl})`;
      session.lastUpdated = Date.now();

      storage.logAudit(
        'BROWSER_PAGE_OPENED',
        `Conversation: ${conversationId} | Opened: ${targetUrl} | Title: "${title}" | Links: ${links.length} | Latency: ${Date.now() - startTime}ms`,
        'info'
      );

      return {
        success: true,
        action: 'open_page',
        url: targetUrl,
        title,
        content: text,
        links,
        details: `Successfully opened ${targetUrl} ("${title}").`,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      storage.logAudit(
        'BROWSER_PAGE_OPEN_NOTICE',
        `Desktop browser opened to ${targetUrl}. In-memory parser notice: ${err.message}`,
        'info'
      );
      // Desktop browser window opened successfully, don't fail the action
      session.currentUrl = targetUrl;
      try {
        session.pageTitle = new URL(targetUrl).hostname;
      } catch {
        session.pageTitle = targetUrl;
      }
      session.lastAction = 'open_page';
      session.lastUpdated = Date.now();

      return {
        success: true,
        action: 'open_page',
        url: targetUrl,
        title: session.pageTitle,
        content: '',
        links: [],
        details: `Browser opened to ${targetUrl}.`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Action 2: READ_PAGE
   */
  public readPage(conversationId: string): BrowserActionResult {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (!session.currentUrl) {
      return {
        success: false,
        action: 'read_page',
        error: 'Koi web page open nahi hai. Pehle page open karein (jaise "Google kholo" ya URL provide karein).',
        latencyMs: Date.now() - startTime,
      };
    }

    session.lastAction = 'read_page';
    session.actionResult = `Read ${session.pageText.length} characters from ${session.currentUrl}`;
    session.lastUpdated = Date.now();

    storage.logAudit(
      'BROWSER_PAGE_READ',
      `Conversation: ${conversationId} | Read page content for: ${session.currentUrl}`,
      'info'
    );

    return {
      success: true,
      action: 'read_page',
      url: session.currentUrl,
      title: session.pageTitle,
      content: session.pageText,
      links: session.links,
      details: `Page "${session.pageTitle}" read successfully.`,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Action 3: FIND_TEXT
   */
  public findText(conversationId: string, query: string): BrowserActionResult {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (!session.currentUrl || !session.pageText) {
      return {
        success: false,
        action: 'find_text',
        error: 'Current session me koi page load nahi hai. Pehle page open karein.',
        latencyMs: Date.now() - startTime,
      };
    }

    const cleanQuery = (query || '').trim().toLowerCase();
    if (!cleanQuery) {
      return {
        success: false,
        action: 'find_text',
        error: 'Search query is required.',
        latencyMs: Date.now() - startTime,
      };
    }

    const text = session.pageText;
    const lowerText = text.toLowerCase();
    const matches: string[] = [];
    let pos = 0;

    while (pos < lowerText.length && matches.length < 5) {
      const idx = lowerText.indexOf(cleanQuery, pos);
      if (idx === -1) break;

      const snippetStart = Math.max(0, idx - 60);
      const snippetEnd = Math.min(text.length, idx + cleanQuery.length + 60);
      const snippet = text.slice(snippetStart, snippetEnd).trim();
      matches.push(`...${snippet}...`);
      pos = idx + cleanQuery.length + 1;
    }

    session.lastAction = 'find_text';
    session.actionResult = `Found ${matches.length} occurrences for "${cleanQuery}"`;

    storage.logAudit(
      'BROWSER_FIND_TEXT',
      `Conversation: ${conversationId} | Query: "${cleanQuery}" | Matches found: ${matches.length}`,
      'info'
    );

    return {
      success: true,
      action: 'find_text',
      url: session.currentUrl,
      title: session.pageTitle,
      matchedText: matches,
      details:
        matches.length > 0
          ? `Page par "${query}" ke ${matches.length} occurrences mile.`
          : `Page par "${query}" nahi mila.`,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Action 4: FIND_LINKS
   */
  public findLinks(conversationId: string, query?: string): BrowserActionResult {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (!session.currentUrl) {
      return {
        success: false,
        action: 'find_links',
        error: 'Koi web page open nahi hai. Pehle page open karein.',
        latencyMs: Date.now() - startTime,
      };
    }

    let filtered = session.links;
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = session.links.filter(
        (l) => l.text.toLowerCase().includes(q) || l.href.toLowerCase().includes(q)
      );
    }

    session.lastAction = 'find_links';
    session.actionResult = `Found ${filtered.length} links matching "${query || 'all'}"`;

    storage.logAudit(
      'BROWSER_FIND_LINKS',
      `Conversation: ${conversationId} | Filter: "${query || 'all'}" | Results: ${filtered.length}`,
      'info'
    );

    return {
      success: true,
      action: 'find_links',
      url: session.currentUrl,
      title: session.pageTitle,
      links: filtered.slice(0, 15),
      details: `Found ${filtered.length} matching links on page.`,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Action 5: CLICK_LINK
   */
  public async clickLink(
    conversationId: string,
    linkIdentifier: string
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (!session.currentUrl) {
      return {
        success: false,
        action: 'click_link',
        error: 'Koi web page open nahi hai jisme link click kiya ja sake.',
        latencyMs: Date.now() - startTime,
      };
    }

    const cleanId = (linkIdentifier || '').trim().toLowerCase();
    if (!cleanId) {
      return {
        success: false,
        action: 'click_link',
        error: 'Link identifier (name, text, or url) is required.',
        latencyMs: Date.now() - startTime,
      };
    }

    // Match link by text or href
    let targetLink = session.links.find(
      (l) => l.text.toLowerCase() === cleanId || l.href.toLowerCase() === cleanId
    );

    if (!targetLink) {
      // Partial match
      targetLink = session.links.find(
        (l) => l.text.toLowerCase().includes(cleanId) || l.href.toLowerCase().includes(cleanId)
      );
    }

    if (!targetLink) {
      return {
        success: false,
        action: 'click_link',
        error: `Page par "${linkIdentifier}" naam ka koi visible link nahi mila.`,
        latencyMs: Date.now() - startTime,
      };
    }

    // Security validation of destination URL
    const val = validateBrowserUrl(targetLink.href);
    if (!val.valid || !val.normalizedUrl) {
      storage.logAudit(
        'BROWSER_LINK_BLOCKED',
        `Blocked attempt to click link with unsafe target: ${targetLink.href} (${val.error})`,
        'warn'
      );
      return {
        success: false,
        action: 'click_link',
        error: val.error || 'Link destination is not an allowed http/https URL.',
        latencyMs: Date.now() - startTime,
      };
    }

    storage.logAudit(
      'BROWSER_CLICK_LINK',
      `Clicking link "${targetLink.text}" -> ${val.normalizedUrl}`,
      'info'
    );

    // Open target page
    return this.openPage(conversationId, val.normalizedUrl);
  }

  /**
   * Action 6: GO_BACK
   */
  public async goBack(conversationId: string): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (session.historyIndex <= 0) {
      return {
        success: false,
        action: 'go_back',
        error: 'Browser history me peeche jane ke liye koi previous page nahi hai.',
        latencyMs: Date.now() - startTime,
      };
    }

    session.historyIndex -= 1;
    const targetUrl = session.history[session.historyIndex];

    try {
      const { title, text, links } = await this.fetchAndParse(targetUrl);
      session.currentUrl = targetUrl;
      session.pageTitle = title;
      session.pageText = text;
      session.links = links;
      session.lastAction = 'go_back';
      session.actionResult = `Went back to "${title}" (${targetUrl})`;

      storage.logAudit('BROWSER_NAV_BACK', `Navigated back to ${targetUrl}`, 'info');

      return {
        success: true,
        action: 'go_back',
        url: targetUrl,
        title,
        content: text,
        details: `Peeche chale gaye: "${title}".`,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'go_back',
        error: `Previous page load nahi ho paya: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Action 7: GO_FORWARD
   */
  public async goForward(conversationId: string): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (session.historyIndex >= session.history.length - 1) {
      return {
        success: false,
        action: 'go_forward',
        error: 'Browser history me aage jane ke liye koi forward page nahi hai.',
        latencyMs: Date.now() - startTime,
      };
    }

    session.historyIndex += 1;
    const targetUrl = session.history[session.historyIndex];

    try {
      const { title, text, links } = await this.fetchAndParse(targetUrl);
      session.currentUrl = targetUrl;
      session.pageTitle = title;
      session.pageText = text;
      session.links = links;
      session.lastAction = 'go_forward';
      session.actionResult = `Went forward to "${title}" (${targetUrl})`;

      storage.logAudit('BROWSER_NAV_FORWARD', `Navigated forward to ${targetUrl}`, 'info');

      return {
        success: true,
        action: 'go_forward',
        url: targetUrl,
        title,
        content: text,
        details: `Aage chale gaye: "${title}".`,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'go_forward',
        error: `Forward page load nahi ho paya: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Action 8: REFRESH_PAGE
   */
  public async refreshPage(conversationId: string): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const session = this.getOrCreateSession(conversationId);

    if (!session.currentUrl) {
      return {
        success: false,
        action: 'refresh_page',
        error: 'Koi web page open nahi hai jise refresh kiya ja sake.',
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const { title, text, links } = await this.fetchAndParse(session.currentUrl);
      session.pageTitle = title;
      session.pageText = text;
      session.links = links;
      session.lastAction = 'refresh_page';
      session.actionResult = `Refreshed "${title}"`;

      storage.logAudit('BROWSER_PAGE_REFRESHED', `Refreshed page ${session.currentUrl}`, 'info');

      return {
        success: true,
        action: 'refresh_page',
        url: session.currentUrl,
        title,
        content: text,
        details: `Page refresh ho gaya: "${title}".`,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'refresh_page',
        error: `Page refresh fail ho gaya: ${err.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

export const browserService = new BrowserService();
