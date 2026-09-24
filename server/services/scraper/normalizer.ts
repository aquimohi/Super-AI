import { LeadItem } from './types.js';

export class LeadNormalizer {
  /**
   * Cleans business name: removes excess whitespace, fixes casing if ALL CAPS,
   * unescapes HTML entities.
   */
  static cleanBusinessName(rawName?: string | null): string {
    if (!rawName) return 'Unknown Business';
    let name = rawName
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // If completely uppercase and longer than 4 chars, convert to Title Case
    if (name.length > 4 && name === name.toUpperCase() && !name.includes('&')) {
      name = name
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return name;
  }

  /**
   * Normalizes phone numbers into clean readable strings.
   * Strips non-digit chars (preserving leading + for international code).
   */
  static normalizePhone(rawPhone?: string | null): string | null {
    if (!rawPhone) return null;
    const trimmed = rawPhone.trim();
    if (!trimmed) return null;

    // Remove noise words
    const stripped = trimmed.replace(/(tel:|phone:|call:)/i, '').trim();

    // Extract digits and optional leading +
    const hasPlus = stripped.startsWith('+');
    const digits = stripped.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      return stripped.length >= 7 && stripped.length <= 25 ? stripped : null;
    }

    if (hasPlus) {
      return `+${digits}`;
    }

    return stripped;
  }

  /**
   * Normalizes website URLs: ensures http/https scheme, strips tracking query params,
   * lowercase hostname.
   */
  static normalizeWebsite(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;
    let urlStr = rawUrl.trim();
    if (!urlStr || urlStr === '#' || urlStr.startsWith('javascript:')) return null;

    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }

    try {
      const parsed = new URL(urlStr);
      // Strip tracking query parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
      
      parsed.hostname = parsed.hostname.toLowerCase();
      // Remove trailing slash if root
      if (parsed.pathname === '/') {
        return `${parsed.protocol}//${parsed.hostname}`;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * Validates and cleans email addresses.
   */
  static normalizeEmail(rawEmail?: string | null): string | null {
    if (!rawEmail) return null;
    const email = rawEmail.trim().toLowerCase();
    
    // Filter out common false positives and image files
    if (
      email.endsWith('.png') ||
      email.endsWith('.jpg') ||
      email.endsWith('.jpeg') ||
      email.endsWith('.webp') ||
      email.endsWith('.svg') ||
      email.endsWith('.gif') ||
      email.includes('sentry') ||
      email.includes('example.com')
    ) {
      return null;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) ? email : null;
  }

  /**
   * Normalizes rating into float between 0 and 5.
   */
  static normalizeRating(rating?: number | string | null): number | null {
    if (rating === undefined || rating === null) return null;
    const num = typeof rating === 'number' ? rating : parseFloat(String(rating));
    if (isNaN(num)) return null;
    return Math.max(0, Math.min(5, Math.round(num * 10) / 10));
  }

  /**
   * Normalizes review count into non-negative integer.
   */
  static normalizeReviewCount(reviews?: number | string | null): number | null {
    if (reviews === undefined || reviews === null) return null;
    const num = typeof reviews === 'number' ? reviews : parseInt(String(reviews).replace(/\D/g, ''), 10);
    if (isNaN(num)) return null;
    return Math.max(0, num);
  }

  /**
   * Parses free-form address string to extract city, state, postalCode, country.
   */
  static parseAddress(rawAddress?: string | null, defaultCity?: string, defaultCountry?: string): {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
  } {
    if (!rawAddress) {
      return {
        address: null,
        city: defaultCity || null,
        state: null,
        country: defaultCountry || null,
        postalCode: null,
      };
    }

    const cleaned = rawAddress.replace(/\s+/g, ' ').trim();
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);

    let city = defaultCity || null;
    let country = defaultCountry || null;
    let postalCode: string | null = null;
    let state: string | null = null;

    // Check postal code pattern (5-6 digits or standard alphanumeric postal codes)
    const postalMatch = cleaned.match(/\b\d{5,6}\b/) || cleaned.match(/\b[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}\b/i);
    if (postalMatch) {
      postalCode = postalMatch[0];
    }

    if (parts.length >= 3) {
      country = country || parts[parts.length - 1];
      const statePart = parts[parts.length - 2];
      if (postalCode && statePart.includes(postalCode)) {
        state = statePart.replace(postalCode, '').trim();
      } else {
        state = statePart;
      }
      city = city || parts[parts.length - 3];
    } else if (parts.length === 2) {
      country = country || parts[1];
      city = city || parts[0];
    }

    return {
      address: cleaned,
      city,
      state,
      country,
      postalCode,
    };
  }

  /**
   * Normalizes an entire lead record before persisting or deduplicating.
   */
  static normalizeLead(raw: Partial<LeadItem>, fallbackCity?: string, fallbackCountry?: string): Partial<LeadItem> {
    const businessName = this.cleanBusinessName(raw.businessName);
    const phone = this.normalizePhone(raw.phone);
    const website = this.normalizeWebsite(raw.website);
    const email = this.normalizeEmail(raw.email);
    const rating = this.normalizeRating(raw.rating);
    const reviewCount = this.normalizeReviewCount(raw.reviewCount);

    const addrParsed = this.parseAddress(raw.address, raw.city || fallbackCity, raw.country || fallbackCountry);

    return {
      ...raw,
      businessName,
      phone,
      website,
      email,
      rating,
      reviewCount,
      address: addrParsed.address,
      city: raw.city || addrParsed.city,
      state: raw.state || addrParsed.state,
      country: raw.country || addrParsed.country,
      postalCode: raw.postalCode || addrParsed.postalCode,
      category: (raw.category || 'General Business').trim(),
    };
  }
}
