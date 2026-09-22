import { storage } from '../../storage.js';
import { PlannedBrowserAction } from './types.js';

export class BrowserActionPlanner {
  /**
   * Analyzes natural language message for safe Controlled Browser Automation intents
   * or prohibited high-risk actions.
   */
  public planAction(
    message: string,
    conversationId: string = 'default'
  ): PlannedBrowserAction | null {
    const raw = (message || '').trim();
    const lower = raw.toLowerCase();

    // =========================================================================
    // 1. Check for PROHIBITED HIGH-RISK ACTIONS (Must be blocked immediately)
    // =========================================================================

    // Prohibited 1: Arbitrary JavaScript execution in browser
    if (
      /(execute|run|inject)\s+(javascript|js|script|eval|code)\s+(on|in)\s+(page|browser)/i.test(
        lower
      ) ||
      /\b(run\s+js|execute\s+js|javascript\s+run\s+karo|script\s+chalao)\b/i.test(lower) ||
      /\bjavascript\s*:\s*/i.test(lower)
    ) {
      return {
        action: 'blocked_browser_action',
        blockedReason:
          'Security Policy Violation: Arbitrary JavaScript execution, DOM script injection, and eval in browser pages are strictly prohibited.',
        parameters: { rawQuery: raw },
        risk: 'HIGH',
        displayName: 'Arbitrary JavaScript Execution',
        actionDescription: 'Arbitrary browser script execution (BLOCKED)',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_arbitrary_js',
      };
    }

    // Prohibited 2: Access user's existing Chrome/Edge profile, cookies, passwords
    if (
      /(user('s)?\s+chrome\s+profile|personal\s+profile|chrome\s+user\s+data|saved\s+passwords?|browser\s+cookies|extract\s+credentials|login\s+data)/i.test(
        lower
      ) ||
      /(chrome\s+profile\s+se|personal\s+cookies|saved\s+password\s+(nikalo|padho|lo))/i.test(lower)
    ) {
      return {
        action: 'blocked_browser_action',
        blockedReason:
          'Security Policy Violation: Accessing user Chrome/Edge personal profiles, saved passwords, authentication tokens, and personal cookies is strictly prohibited.',
        parameters: { rawQuery: raw },
        risk: 'HIGH',
        displayName: 'Private Profile & Credential Access',
        actionDescription: 'Access user browser profile / credentials (BLOCKED)',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_profile_access',
      };
    }

    // Prohibited 3: Login automation & password entry
    if (
      /(login\s+automation|enter\s+(my\s+)?password|fill\s+password|sign\s+in\s+with\s+password|credentials\s+enter\s+karo|password\s+(dalo|enter\s+karo))/i.test(
        lower
      ) ||
      /\b(login\s+karo|log\s+in\s+karo|auto\s+login)\b/i.test(lower)
    ) {
      return {
        action: 'blocked_browser_action',
        blockedReason:
          'Security Policy Violation: Login automation, credential entry, and password typing are high-risk actions that are not available in Safe Browser V1.',
        parameters: { rawQuery: raw },
        risk: 'HIGH',
        displayName: 'Login & Password Automation',
        actionDescription: 'Automated login or password submission (BLOCKED)',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_login_automation',
      };
    }

    // Prohibited 4: Payment, checkout, purchases
    if (
      /(payment\s+karo|checkout\s+karo|buy\s+now|credit\s+card\s+(dalo|enter)|pay\s+(money|now)|purchase\s+item)/i.test(
        lower
      )
    ) {
      return {
        action: 'blocked_browser_action',
        blockedReason:
          'Security Policy Violation: Financial transactions, checkout automation, and payment submissions are permanently prohibited in Super AI.',
        parameters: { rawQuery: raw },
        risk: 'HIGH',
        displayName: 'Payment & Checkout Automation',
        actionDescription: 'Financial checkout / payment automation (BLOCKED)',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_payment_checkout',
      };
    }

    // Prohibited 5: Arbitrary executable downloads
    if (
      /(download\s+(executable|exe|bat|msi|vbs|sh|malware)|save\s+file\s+.*\.exe)/i.test(lower) ||
      /\b(exe\s+download\s+karo|software\s+download\s+karo)\b/i.test(lower)
    ) {
      return {
        action: 'blocked_browser_action',
        blockedReason:
          'Security Policy Violation: Arbitrary executable, batch, or binary downloads are strictly prohibited.',
        parameters: { rawQuery: raw },
        risk: 'HIGH',
        displayName: 'Executable Download Guard',
        actionDescription: 'Arbitrary executable file download (BLOCKED)',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_download_executable',
      };
    }

    // Prohibited 6: Prohibited URL schemes
    if (
      /(javascript:|file:|data:|vbscript:|chrome:|edge:|about:)/i.test(lower)
    ) {
      const match = lower.match(/(javascript:|file:|data:|vbscript:|chrome:|edge:|about:)/i);
      return {
        action: 'blocked_browser_action',
        blockedReason: `Security Policy Violation: The "${match ? match[1] : 'prohibited'}" URL scheme is strictly rejected. Only http:// and https:// are permitted.`,
        parameters: { rawQuery: raw },
        risk: 'HIGH',
        displayName: 'Prohibited URL Scheme',
        actionDescription: 'Non-HTTP/HTTPS protocol execution (BLOCKED)',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_prohibited_scheme',
      };
    }

    // =========================================================================
    // 2. Check if Master Browser Control is enabled
    // =========================================================================
    const browserConfig = storage.getBrowserControlConfig();
    if (!browserConfig.enabled) {
      return null;
    }

    // =========================================================================
    // 3. SAFE BROWSER ACTIONS V1
    // =========================================================================

    // Action 2: READ_PAGE ("Is page par kya likha hai?", "Is page ko read karo", "read page", "page padho")
    if (
      /(is\s+page\s+(par|ko)\s+(kya\s+likha\s+hai|read\s+karo|read\s+karke\s+batao|padho|dikhao)|read\s+(what\s+is\s+on\s+)?(this\s+|the\s+)?page|what\s+is\s+on\s+(this\s+|the\s+)?page|summarize\s+(this\s+|the\s+)?page|page\s+summary|page\s+read\s+karo)/i.test(
        lower
      )
    ) {
      return {
        action: 'read_page',
        parameters: {},
        risk: 'LOW',
        displayName: 'Read Browser Page',
        actionDescription: 'Extract and read clean text content from the current web page',
        requiredPermission: 'browserReadPage',
        toolName: 'browser_read_page',
      };
    }

    // Action 3: FIND_TEXT ("OpenRouter search karo", "is page par XYZ dhundo", "find text XYZ")
    const findTextPageMatch = lower.match(
      /(?:is\s+page\s+par|page\s+me)\s+["']?([^"']+)["']?\s+(?:dhundo|search\s+karo|find\s+karo)/i
    ) || lower.match(/(?:find\s+text|search\s+text|find\s+on\s+page)\s+["']?([^"']+)["']?/i);

    if (findTextPageMatch) {
      const query = findTextPageMatch[1].trim();
      return {
        action: 'find_text',
        parameters: { query },
        risk: 'LOW',
        displayName: 'Find Text on Page',
        actionDescription: `Search current web page for text: "${query}"`,
        requiredPermission: 'browserFindText',
        toolName: 'browser_find_text',
      };
    }

    // Action 4: FIND_LINKS ("Documentation ka link dhundo", "links dhundo", "is page par links dhundo")
    const findLinksMatch = lower.match(
      /(?:is\s+page\s+par\s+)?([a-zA-Z0-9_\s-]+)?\s*(?:ka\s+)?link(?:s)?\s+(?:dhundo|search\s+karo|find\s+karo|dikhao|list\s+karo)/i
    ) || lower.match(/(?:find\s+links?|search\s+links?|list\s+links?)(?:\s+for\s+([a-zA-Z0-9_\s-]+))?/i);

    if (findLinksMatch && !/(kholo|open|click)/i.test(lower)) {
      const topic = (findLinksMatch[1] || '').trim();
      return {
        action: 'find_links',
        parameters: { query: topic },
        risk: 'LOW',
        displayName: 'Find Links on Page',
        actionDescription: topic
          ? `Find links matching "${topic}" on the current web page`
          : 'List visible navigation links on the current web page',
        requiredPermission: 'browserFindLinks',
        toolName: 'browser_find_links',
      };
    }

    // Action 5: CLICK_LINK ("Documentation link open karo", "documentation link kholo", "click link documentation")
    const clickLinkMatch = lower.match(
      /(?:click\s+(?:on\s+)?(?:the\s+)?(?:link\s+)?["']?([^"']+)["']?|([a-zA-Z0-9_\s-]+)\s+link\s+(?:kholo|open\s+karo|click\s+karo))/i
    );

    if (
      clickLinkMatch &&
      !/(google\s+kholo|open\s+google|youtube\s+kholo|notepadd?|calc)/i.test(lower)
    ) {
      const targetIdentifier = (clickLinkMatch[1] || clickLinkMatch[2] || '').trim();
      if (targetIdentifier && targetIdentifier.toLowerCase() !== 'open') {
        return {
          action: 'click_link',
          parameters: { link: targetIdentifier },
          risk: 'LOW',
          displayName: 'Click Browser Link',
          actionDescription: `Click link matching "${targetIdentifier}" on the current web page`,
          requiredPermission: 'browserClickLink',
          toolName: 'browser_click_link',
        };
      }
    }

    // Action 6: GO_BACK ("Peeche jao", "go back", "back karo", "previous page")
    if (
      /(peeche\s+jao|go\s+back|back\s+karo|browser\s+back|previous\s+page)/i.test(lower)
    ) {
      return {
        action: 'go_back',
        parameters: {},
        risk: 'LOW',
        displayName: 'Browser Go Back',
        actionDescription: 'Navigate back to the previous page in history',
        requiredPermission: 'browserGoBack',
        toolName: 'browser_go_back',
      };
    }

    // Action 7: GO_FORWARD ("Aage jao", "go forward", "forward page", "next page")
    if (
      /(aage\s+jao|go\s+forward|forward\s+karo|browser\s+forward|next\s+page)/i.test(lower)
    ) {
      return {
        action: 'go_forward',
        parameters: {},
        risk: 'LOW',
        displayName: 'Browser Go Forward',
        actionDescription: 'Navigate forward to the next page in history',
        requiredPermission: 'browserGoForward',
        toolName: 'browser_go_forward',
      };
    }

    // Action 8: REFRESH_PAGE ("Page refresh karo", "reload page", "page dubara load karo")
    if (
      /(page\s+refresh\s+karo|refresh\s+(this\s+|the\s+)?page|reload\s+(this\s+|the\s+)?page|page\s+reload\s+karo)/i.test(
        lower
      )
    ) {
      return {
        action: 'refresh_page',
        parameters: {},
        risk: 'LOW',
        displayName: 'Refresh Browser Page',
        actionDescription: 'Reload the current web page in Super AI browser',
        requiredPermission: 'browserRefreshPage',
        toolName: 'browser_refresh_page',
      };
    }

    // Action 1: OPEN_PAGE ("Open browser", "browser kholo", "Google kholo", "open google", "open youtube", "open https://...")
    
    // 1a. Generic browser open requests
    const isGenericBrowserRequest =
      /\b(open|launch|start|run|kholo|chalao|chalu\s+karo|on\s+karo)\s+(?:the\s+|a\s+|my\s+|web\s+)?browser\b/i.test(lower) ||
      /\bbrowser\s+(?:kholo|open|launch|start|chalao|run|on\s*karo|khol\s*do|open\s*karo)\b/i.test(lower) ||
      /\b(kholo|chalao|chalu\s+karo)\s+(?:the\s+|a\s+|web\s+)?browser\b/i.test(lower);

    if (isGenericBrowserRequest) {
      return {
        action: 'open_page',
        parameters: { url: 'https://www.google.com' },
        risk: 'LOW',
        displayName: 'Open Browser',
        actionDescription: 'Open system browser to default homepage',
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_open_page',
      };
    }

    // 1b. Popular web platforms (YouTube, Google, GitHub, etc.)
    const POPULAR_DOMAINS: Record<string, string> = {
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
      netflix: 'https://www.netflix.com',
      amazon: 'https://www.amazon.com',
    };

    for (const [site, siteUrl] of Object.entries(POPULAR_DOMAINS)) {
      const siteRegex = new RegExp(
        `(?:open|browse|visit|go to|kholo|chalao|launch)\\s+(?:the\s+)?${site}\\b|\\b${site}\\s+(?:kholo|open|chalao|launch|chalu\\s*karo)`,
        'i'
      );
      if (siteRegex.test(lower)) {
        const titleName = site.charAt(0).toUpperCase() + site.slice(1);
        return {
          action: 'open_page',
          parameters: { url: siteUrl },
          risk: 'LOW',
          displayName: `Open ${titleName}`,
          actionDescription: `Open ${siteUrl} in browser`,
          requiredPermission: 'browserOpenPage',
          toolName: 'browser_open_page',
        };
      }
    }

    // 1c. Explicit http/https URL
    const explicitUrlMatch = lower.match(
      /(?:open|browse|visit|go to|kholo)\s+(https?:\/\/[^\s]+)/i
    );
    if (explicitUrlMatch) {
      return {
        action: 'open_page',
        parameters: { url: explicitUrlMatch[1] },
        risk: 'LOW',
        displayName: 'Open Browser Page',
        actionDescription: `Open ${explicitUrlMatch[1]} in Super AI browser`,
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_open_page',
      };
    }

    // 1d. Domain name without protocol (e.g. "open github.com", "kholo nytimes.com")
    const domainMatch = lower.match(
      /(?:open|browse|visit|kholo)\s+([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|ai|co|in|dev)[^\s]*)/i
    );
    if (domainMatch) {
      const fullUrl = `https://${domainMatch[1]}`;
      return {
        action: 'open_page',
        parameters: { url: fullUrl },
        risk: 'LOW',
        displayName: 'Open Browser Page',
        actionDescription: `Open ${fullUrl} in Super AI browser`,
        requiredPermission: 'browserOpenPage',
        toolName: 'browser_open_page',
      };
    }

    return null;
  }
}

export const browserPlanner = new BrowserActionPlanner();
