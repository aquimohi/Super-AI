import * as cheerio from 'cheerio';
import { LeadItem, LeadSocialProfiles, LeadEnrichmentRecord } from './types.js';
import { LeadNormalizer } from './normalizer.js';

export interface EnrichmentResult {
  socials: Omit<LeadSocialProfiles, 'id' | 'leadId'>;
  enrichment: Omit<LeadEnrichmentRecord, 'id' | 'leadId'>;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
}

export class WebsiteEnricher {
  private static USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  /**
   * Fetches an HTML page safely with strict timeout and size limit.
   */
  private static async fetchPage(urlStr: string): Promise<{ html: string; status: number } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(urlStr, {
        method: 'GET',
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { html: '', status: res.status };
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return null;
      }

      // Read max 1MB
      const text = await res.text();
      return { html: text.slice(0, 1024 * 1024), status: res.status };
    } catch {
      return null;
    }
  }

  /**
   * Extracts emails from text and hrefs.
   */
  private static extractEmails(html: string, $: cheerio.CheerioAPI): string[] {
    const emails = new Set<string>();

    // 1. mailto: links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const mail = href.replace(/^mailto:/i, '').split('?')[0].trim();
        const norm = LeadNormalizer.normalizeEmail(mail);
        if (norm) emails.add(norm);
      }
    });

    // 2. regex scan across HTML
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const matches = html.match(emailRegex) || [];
    for (const match of matches) {
      const norm = LeadNormalizer.normalizeEmail(match);
      if (norm) emails.add(norm);
    }

    return Array.from(emails);
  }

  /**
   * Extracts phone numbers from tel: links.
   */
  private static extractPhones($: cheerio.CheerioAPI): string[] {
    const phones = new Set<string>();

    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const phone = href.replace(/^tel:/i, '').trim();
        const norm = LeadNormalizer.normalizePhone(phone);
        if (norm) phones.add(norm);
      }
    });

    return Array.from(phones);
  }

  /**
   * Extracts social links from anchor hrefs.
   */
  private static extractSocials($: cheerio.CheerioAPI): {
    facebook?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    twitter?: string | null;
    youtube?: string | null;
    otherLinks: string[];
    foundMap: Record<string, string>;
  } {
    let facebook: string | null = null;
    let instagram: string | null = null;
    let linkedin: string | null = null;
    let twitter: string | null = null;
    let youtube: string | null = null;
    const otherLinks: string[] = [];
    const foundMap: Record<string, string> = {};

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const url = new URL(href, 'https://example.com');
        const host = url.hostname.toLowerCase();
        const fullHref = href.startsWith('http') ? href : url.href;

        // Skip sharing / intent links
        if (url.searchParams.has('url') || fullHref.includes('/sharer/') || fullHref.includes('/intent/')) {
          return;
        }

        if (host.includes('facebook.com') && !facebook) {
          if (!fullHref.includes('/dialog/') && !fullHref.includes('/policies/')) {
            facebook = fullHref;
            foundMap['facebook'] = fullHref;
          }
        } else if (host.includes('instagram.com') && !instagram) {
          instagram = fullHref;
          foundMap['instagram'] = fullHref;
        } else if (host.includes('linkedin.com') && !linkedin) {
          linkedin = fullHref;
          foundMap['linkedin'] = fullHref;
        } else if ((host.includes('twitter.com') || host.includes('x.com')) && !twitter) {
          twitter = fullHref;
          foundMap['twitter'] = fullHref;
        } else if ((host.includes('youtube.com') || host.includes('youtu.be')) && !youtube) {
          youtube = fullHref;
          foundMap['youtube'] = fullHref;
        } else if (
          host.includes('tiktok.com') ||
          host.includes('pinterest.com') ||
          host.includes('github.com') ||
          host.includes('yelp.com')
        ) {
          if (!otherLinks.includes(fullHref) && otherLinks.length < 5) {
            otherLinks.push(fullHref);
            foundMap[host] = fullHref;
          }
        }
      } catch {
        // ignore malformed URLs
      }
    });

    return { facebook, instagram, linkedin, twitter, youtube, otherLinks, foundMap };
  }

  /**
   * Discovers contact/about page links on homepage.
   */
  private static findContactLinks(baseUrl: string, $: cheerio.CheerioAPI): string[] {
    const contactUrls: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      if (!href) return;

      if (
        text.includes('contact') ||
        text.includes('about') ||
        text.includes('reach us') ||
        href.includes('/contact') ||
        href.includes('/about')
      ) {
        try {
          const resolved = new URL(href, baseUrl).href;
          if (
            resolved.startsWith('http') &&
            !contactUrls.includes(resolved) &&
            contactUrls.length < 2 &&
            resolved !== baseUrl
          ) {
            contactUrls.push(resolved);
          }
        } catch {
          // ignore
        }
      }
    });

    return contactUrls;
  }

  /**
   * Main method to enrich a lead by scraping its website and contact page.
   */
  static async enrichLeadWebsite(lead: Partial<LeadItem>): Promise<EnrichmentResult> {
    const pagesScraped: string[] = [];
    const allEmails = new Set<string>();
    const allPhones = new Set<string>();
    let socialData: ReturnType<typeof WebsiteEnricher.extractSocials> = {
      otherLinks: [],
      foundMap: {},
    };
    let httpStatus: number | null = null;
    let errorMessage: string | null = null;

    if (!lead.website) {
      return {
        socials: { otherLinks: [] },
        enrichment: {
          enrichedAt: new Date().toISOString(),
          pagesScraped: [],
          emailsFound: [],
          phonesFound: [],
          socialsFound: {},
          status: 'FAILED',
          errorMessage: 'No website URL provided for enrichment',
        },
      };
    }

    try {
      const normalizedUrl = LeadNormalizer.normalizeWebsite(lead.website);
      if (!normalizedUrl) {
        throw new Error('Invalid website URL');
      }

      // Step 1: Scrape Homepage
      pagesScraped.push(normalizedUrl);
      const homeRes = await this.fetchPage(normalizedUrl);
      if (homeRes) {
        httpStatus = homeRes.status;
        if (homeRes.html) {
          const $ = cheerio.load(homeRes.html);
          
          this.extractEmails(homeRes.html, $).forEach((e) => allEmails.add(e));
          this.extractPhones($).forEach((p) => allPhones.add(p));
          socialData = this.extractSocials($);

          // Step 2: If no emails or socials found, try 1 contact/about link
          if (allEmails.size === 0 || !socialData.facebook && !socialData.linkedin) {
            const secondaryLinks = this.findContactLinks(normalizedUrl, $);
            for (const secondaryUrl of secondaryLinks) {
              pagesScraped.push(secondaryUrl);
              const secRes = await this.fetchPage(secondaryUrl);
              if (secRes && secRes.html) {
                const $sec = cheerio.load(secRes.html);
                this.extractEmails(secRes.html, $sec).forEach((e) => allEmails.add(e));
                this.extractPhones($sec).forEach((p) => allPhones.add(p));
                const secSocials = this.extractSocials($sec);

                socialData.facebook = socialData.facebook || secSocials.facebook;
                socialData.instagram = socialData.instagram || secSocials.instagram;
                socialData.linkedin = socialData.linkedin || secSocials.linkedin;
                socialData.twitter = socialData.twitter || secSocials.twitter;
                socialData.youtube = socialData.youtube || secSocials.youtube;
                Object.assign(socialData.foundMap, secSocials.foundMap);
              }
              break; // limit to 1 secondary page
            }
          }
        }
      }
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const emailList = Array.from(allEmails);
    const phoneList = Array.from(allPhones);
    const hasData = emailList.length > 0 || phoneList.length > 0 || Object.keys(socialData.foundMap).length > 0;

    return {
      socials: {
        facebook: socialData.facebook || null,
        instagram: socialData.instagram || null,
        linkedin: socialData.linkedin || null,
        twitter: socialData.twitter || null,
        youtube: socialData.youtube || null,
        otherLinks: socialData.otherLinks || [],
      },
      enrichment: {
        enrichedAt: new Date().toISOString(),
        pagesScraped,
        emailsFound: emailList,
        phonesFound: phoneList,
        socialsFound: socialData.foundMap,
        status: hasData ? 'SUCCESS' : (errorMessage ? 'FAILED' : 'PARTIAL'),
        httpStatus,
        errorMessage,
      },
      primaryEmail: emailList[0] || null,
      primaryPhone: phoneList[0] || null,
    };
  }
}
