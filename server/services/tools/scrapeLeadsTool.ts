import { ToolDefinition, ToolExecutionResult } from './types.js';
import { scraperStorage } from '../scraper/scraperStorage.js';
import { scraperJobQueue } from '../scraper/jobQueue.js';
import { SearchJob, LeadItem } from '../scraper/types.js';

export const scrapeLeadsTool: ToolDefinition = {
  name: 'scrape_google_maps_leads',
  displayName: 'Google Maps Lead Scraper',
  description:
    'Scrapes verified business leads, contact phone numbers, ratings, physical addresses, websites, and social profiles from Google Maps for any industry and city (e.g. "Dentists in Delhi", "Gyms in Mumbai", "Software Companies in Bangalore"). Saves leads to persistent database and returns detailed dossier.',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'Search keyword or business category (e.g. "Dentist", "Gym", "Real Estate", "Cafes")',
      },
      location: {
        type: 'string',
        description: 'City or location to search within (e.g. "Delhi", "Mumbai", "Bangalore", "Pune")',
      },
      country: {
        type: 'string',
        description: 'Country for phone format and regional discovery (default: "India")',
      },
      requestedResults: {
        type: 'number',
        description: 'Number of leads to collect (default: 10, max: 50)',
      },
      enrichWebsites: {
        type: 'boolean',
        description: 'Whether to crawl company websites for email and social handles (default: true)',
      },
    },
    required: ['keyword', 'location'],
  },
  requiredPermission: 'NONE',
  risk: 'LOW',
  category: 'web',
  execute: async (args): Promise<ToolExecutionResult> => {
    const keyword = (args.keyword || 'Local Businesses').trim();
    const location = (args.location || 'Delhi').trim();
    const country = (args.country || 'India').trim();
    const count = Math.min(Math.max(1, Number(args.requestedResults) || 10), 50);
    const enrich = args.enrichWebsites !== false;

    try {
      const job: SearchJob = scraperStorage.createJob({
        keyword,
        category: keyword,
        location,
        country,
        radiusKm: 15,
        strategy: 'FAST',
        requestedResults: count,
        enrichWebsites: enrich,
      });

      let leads: LeadItem[] = [];
      try {
        leads = await scraperJobQueue.runJob(job);
      } catch (err) {
        console.error('[scrapeLeadsTool] Execution error:', err);
        leads = scraperStorage.getLeads({ jobId: job.id }).leads;
      }

      const summary = `Scraped ${leads.length} leads for "${keyword}" in "${location}" (Job ID: ${job.id})`;

      return {
        success: true,
        result: {
          jobId: job.id,
          keyword,
          location,
          country,
          totalCollected: leads.length,
          leads: leads.map((l) => ({
            id: l.id,
            name: l.businessName,
            phone: l.phone,
            rating: l.rating,
            reviewsCount: l.reviewCount,
            address: l.address,
            website: l.website,
            email: l.email,
          })),
        },
        displaySummary: summary,
        sanitizedExecutionSummary: `scrape_leads(keyword="${keyword}", location="${location}", count=${count})`,
        sanitizedResultSummary: `Collected ${leads.length} leads saved to database`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to scrape leads',
      };
    }
  },
};
