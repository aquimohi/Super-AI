export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

const REJECTED_SCHEMES = [
  'javascript:',
  'file:',
  'data:',
  'vbscript:',
  'chrome:',
  'edge:',
  'about:',
  'blob:',
  'view-source:',
  'res:',
  'ms-windows-store:',
  'intent:',
];

export function validateBrowserUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required and must be a string.' };
  }

  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check prohibited schemes
  for (const scheme of REJECTED_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return {
        valid: false,
        error: `Security Policy Violation: URL scheme "${scheme}" is strictly prohibited and blocked in Super AI Browser.`,
      };
    }
  }

  // 2. Validate scheme prefix
  let urlWithScheme = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    // If user provided a domain like google.com or openrouter.ai, prepend https://
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/i.test(trimmed)) {
      urlWithScheme = `https://${trimmed}`;
    } else {
      return {
        valid: false,
        error: `Security Policy Violation: Only http:// and https:// protocols are permitted. Provided: "${trimmed}"`,
      };
    }
  }

  try {
    const parsed = new URL(urlWithScheme);

    // Enforce protocol check on parsed URL
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Security Policy Violation: Protocol "${parsed.protocol}" is not permitted. Only HTTP and HTTPS are allowed.`,
      };
    }

    // Reject localhost / private metadata services if needed or credential leakage in URL
    if (parsed.username || parsed.password) {
      return {
        valid: false,
        error: 'Security Policy Violation: Embedded credentials in URL are strictly prohibited.',
      };
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return {
        valid: false,
        error: `Security Policy Violation: Access to private/loopback network addresses ("${host}") is blocked in Super AI Browser.`,
      };
    }

    return {
      valid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid URL format: ${err.message}`,
    };
  }
}
