import fs from 'fs';
import path from 'path';
import {
  UserAccount,
  SearchJob,
  LeadItem,
  LeadSocialProfiles,
  LeadEnrichmentRecord,
  ScrapeErrorRecord,
  CreateJobInput,
  LeadFilterParams,
  ScraperDashboardMetrics,
} from './types.js';

interface ScraperStoreData {
  users: UserAccount[];
  jobs: SearchJob[];
  leads: LeadItem[];
  socialProfiles: Record<string, LeadSocialProfiles>;
  enrichments: Record<string, LeadEnrichmentRecord>;
  errors: ScrapeErrorRecord[];
}

const DATA_DIR = path.join(process.cwd(), '.data', 'scraper');
const STORE_FILE = path.join(DATA_DIR, 'scraper-store.json');

const DEFAULT_USER: UserAccount = {
  id: 'usr_admin_01',
  name: 'Mohit Kumar',
  email: 'mohit@superai.local',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

const DEFAULT_STORE: ScraperStoreData = {
  users: [DEFAULT_USER],
  jobs: [],
  leads: [],
  socialProfiles: {},
  enrichments: {},
  errors: [],
};

export class ScraperStorageManager {
  private data: ScraperStoreData;

  // Deduplication lookup maps
  private placeIdIndex: Map<string, string> = new Map();
  private domainIndex: Map<string, string> = new Map();
  private compositeIndex: Map<string, string> = new Map();

  constructor() {
    this.data = this.loadFromDisk();
    this.rebuildIndexes();
  }

  private loadFromDisk(): ScraperStoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || [DEFAULT_USER],
          jobs: parsed.jobs || [],
          leads: parsed.leads || [],
          socialProfiles: parsed.socialProfiles || {},
          enrichments: parsed.enrichments || {},
          errors: parsed.errors || [],
        };
      }

      this.saveToDisk(DEFAULT_STORE);
      return { ...DEFAULT_STORE };
    } catch (err) {
      console.warn('[ScraperStorage] Failed to read disk store, using defaults:', err);
      return { ...DEFAULT_STORE };
    }
  }

  private saveToDisk(data: ScraperStoreData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${STORE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, STORE_FILE);
    } catch (err) {
      console.error('[ScraperStorage] Error saving to disk:', err);
    }
  }

  private cleanDomain(url?: string | null): string {
    if (!url) return '';
    try {
      let withProtocol = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        withProtocol = `https://${url}`;
      }
      const parsed = new URL(withProtocol);
      return parsed.hostname.replace(/^www\./, '').toLowerCase().trim();
    } catch {
      return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();
    }
  }

  private cleanKey(str?: string | null): string {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  private rebuildIndexes(): void {
    this.placeIdIndex.clear();
    this.domainIndex.clear();
    this.compositeIndex.clear();

    for (const lead of this.data.leads) {
      if (lead.googlePlaceId) {
        this.placeIdIndex.set(lead.googlePlaceId.trim(), lead.id);
      }
      const domain = this.cleanDomain(lead.website);
      if (domain) {
        this.domainIndex.set(domain, lead.id);
      }
      const compKey = `${this.cleanKey(lead.businessName)}#${this.cleanKey(lead.address)}`;
      if (compKey.length > 3) {
        this.compositeIndex.set(compKey, lead.id);
      }
    }
  }

  // ── Dashboard Metrics ──────────────────────────────────────────────────────────
  public getMetrics(): ScraperDashboardMetrics {
    const totalLeads = this.data.leads.length;
    let leadsWithPhone = 0;
    let leadsWithWebsite = 0;
    let leadsWithEmail = 0;
    let leadsWithSocials = 0;
    let totalRatingsSum = 0;
    let ratingsCount = 0;
    let totalReviews = 0;

    for (const lead of this.data.leads) {
      if (lead.phone && lead.phone.trim()) leadsWithPhone++;
      if (lead.website && lead.website.trim()) leadsWithWebsite++;
      if (lead.email && lead.email.trim()) leadsWithEmail++;
      if (lead.socials && (lead.socials.facebook || lead.socials.instagram || lead.socials.linkedin || lead.socials.twitter || lead.socials.youtube || lead.socials.otherLinks.length > 0)) {
        leadsWithSocials++;
      }
      if (typeof lead.rating === 'number' && lead.rating > 0) {
        totalRatingsSum += lead.rating;
        ratingsCount++;
      }
      if (typeof lead.reviewCount === 'number') {
        totalReviews += lead.reviewCount;
      }
    }

    const totalJobs = this.data.jobs.length;
    let completedJobs = 0;
    let failedJobs = 0;
    let activeJobs = 0;

    for (const job of this.data.jobs) {
      if (job.status === 'COMPLETED') completedJobs++;
      else if (job.status === 'FAILED') failedJobs++;
      else if (job.status === 'RUNNING' || job.status === 'PENDING') activeJobs++;
    }

    return {
      totalLeads,
      leadsWithPhone,
      leadsWithWebsite,
      leadsWithEmail,
      leadsWithSocials,
      averageRating: ratingsCount > 0 ? Number((totalRatingsSum / ratingsCount).toFixed(2)) : 0,
      totalReviews,
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
    };
  }

  // ── Jobs Management ──────────────────────────────────────────────────────────
  public createJob(input: CreateJobInput, userId: string = DEFAULT_USER.id): SearchJob {
    const job: SearchJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      keyword: input.keyword.trim(),
      category: (input.category || input.keyword).trim(),
      location: input.location.trim(),
      country: (input.country || 'India').trim(),
      radiusKm: input.radiusKm || null,
      strategy: input.strategy || 'DETAILED',
      requestedResults: input.requestedResults || 50,
      collectedResults: 0,
      enrichWebsites: Boolean(input.enrichWebsites),
      status: 'PENDING',
      startTime: new Date().toISOString(),
      endTime: null,
      progressPercent: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    };

    this.data.jobs.unshift(job);
    this.saveToDisk(this.data);
    return job;
  }

  public getJobs(): SearchJob[] {
    return [...this.data.jobs];
  }

  public getJob(id: string): SearchJob | null {
    return this.data.jobs.find((j) => j.id === id) || null;
  }

  public updateJob(id: string, updates: Partial<SearchJob>): SearchJob | null {
    const idx = this.data.jobs.findIndex((j) => j.id === id);
    if (idx === -1) return null;

    const existing = this.data.jobs[idx];
    const updated: SearchJob = {
      ...existing,
      ...updates,
    };

    this.data.jobs[idx] = updated;
    this.saveToDisk(this.data);
    return updated;
  }

  // ── Leads Management & Deduplication ──────────────────────────────────────────
  public saveLead(
    leadInput: Omit<LeadItem, 'id' | 'createdAt' | 'updatedAt'>
  ): { lead: LeadItem; isDuplicate: boolean } {
    let existingLeadId: string | undefined;

    // Check Place ID
    if (leadInput.googlePlaceId && this.placeIdIndex.has(leadInput.googlePlaceId.trim())) {
      existingLeadId = this.placeIdIndex.get(leadInput.googlePlaceId.trim());
    }

    // Check Domain
    if (!existingLeadId && leadInput.website) {
      const domain = this.cleanDomain(leadInput.website);
      if (domain && this.domainIndex.has(domain)) {
        existingLeadId = this.domainIndex.get(domain);
      }
    }

    // Check Name + Address
    if (!existingLeadId) {
      const compKey = `${this.cleanKey(leadInput.businessName)}#${this.cleanKey(leadInput.address)}`;
      if (compKey.length > 4 && this.compositeIndex.has(compKey)) {
        existingLeadId = this.compositeIndex.get(compKey);
      }
    }

    const now = new Date().toISOString();

    if (existingLeadId) {
      const idx = this.data.leads.findIndex((l) => l.id === existingLeadId);
      if (idx !== -1) {
        const current = this.data.leads[idx];
        const merged: LeadItem = {
          ...current,
          ...leadInput,
          // Retain existing valid fields if new ones are null
          phone: leadInput.phone || current.phone,
          website: leadInput.website || current.website,
          email: leadInput.email || current.email,
          googleMapsUrl: leadInput.googleMapsUrl || current.googleMapsUrl,
          rating: leadInput.rating ?? current.rating,
          reviewCount: leadInput.reviewCount ?? current.reviewCount,
          updatedAt: now,
        };

        this.data.leads[idx] = merged;
        this.saveToDisk(this.data);
        return { lead: merged, isDuplicate: true };
      }
    }

    // New Lead
    const newId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newLead: LeadItem = {
      ...leadInput,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    this.data.leads.unshift(newLead);

    // Index newly created lead
    if (newLead.googlePlaceId) {
      this.placeIdIndex.set(newLead.googlePlaceId.trim(), newId);
    }
    const domain = this.cleanDomain(newLead.website);
    if (domain) {
      this.domainIndex.set(domain, newId);
    }
    const compKey = `${this.cleanKey(newLead.businessName)}#${this.cleanKey(newLead.address)}`;
    if (compKey.length > 3) {
      this.compositeIndex.set(compKey, newId);
    }

    this.saveToDisk(this.data);
    return { lead: newLead, isDuplicate: false };
  }

  public getLeads(params: LeadFilterParams = {}): {
    leads: LeadItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    let result = [...this.data.leads];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          (l.address && l.address.toLowerCase().includes(q)) ||
          (l.category && l.category.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.website && l.website.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
      );
    }

    if (params.location) {
      const loc = params.location.toLowerCase().trim();
      result = result.filter(
        (l) =>
          (l.city && l.city.toLowerCase().includes(loc)) ||
          (l.address && l.address.toLowerCase().includes(loc)) ||
          (l.state && l.state.toLowerCase().includes(loc)) ||
          (l.country && l.country.toLowerCase().includes(loc))
      );
    }

    if (params.category) {
      const cat = params.category.toLowerCase().trim();
      result = result.filter((l) => l.category && l.category.toLowerCase().includes(cat));
    }

    if (typeof params.minRating === 'number') {
      result = result.filter((l) => (l.rating || 0) >= params.minRating!);
    }

    if (typeof params.minReviews === 'number') {
      result = result.filter((l) => (l.reviewCount || 0) >= params.minReviews!);
    }

    if (params.hasPhone) {
      result = result.filter((l) => Boolean(l.phone && l.phone.trim()));
    }

    if (params.hasWebsite) {
      result = result.filter((l) => Boolean(l.website && l.website.trim()));
    }

    if (params.hasEmail) {
      result = result.filter((l) => Boolean(l.email && l.email.trim()));
    }

    if (params.hasSocials) {
      result = result.filter((l) =>
        Boolean(
          l.socials &&
            (l.socials.facebook ||
              l.socials.instagram ||
              l.socials.linkedin ||
              l.socials.twitter ||
              l.socials.youtube ||
              (l.socials.otherLinks && l.socials.otherLinks.length > 0))
        )
      );
    }

    if (params.businessStatus) {
      result = result.filter((l) => l.businessStatus === params.businessStatus);
    }

    if (params.jobId) {
      result = result.filter((l) => l.jobId === params.jobId);
    }

    // Sorting
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    result.sort((a: any, b: any) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

    const total = result.length;
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginated = result.slice((page - 1) * pageSize, page * pageSize);

    // Attach social profiles
    for (const lead of paginated) {
      if (!lead.socials && this.data.socialProfiles[lead.id]) {
        lead.socials = this.data.socialProfiles[lead.id];
      }
    }

    return {
      leads: paginated,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public getLead(id: string): LeadItem | null {
    const lead = this.data.leads.find((l) => l.id === id) || null;
    if (lead) {
      lead.socials = this.data.socialProfiles[id] || lead.socials;
    }
    return lead;
  }

  public updateLead(id: string, updates: Partial<LeadItem>): LeadItem | null {
    const idx = this.data.leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    const existing = this.data.leads[idx];
    const updated: LeadItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.leads[idx] = updated;
    this.saveToDisk(this.data);
    return updated;
  }

  public deleteLead(id: string): boolean {
    const prevLen = this.data.leads.length;
    this.data.leads = this.data.leads.filter((l) => l.id !== id);
    delete this.data.socialProfiles[id];
    delete this.data.enrichments[id];

    if (this.data.leads.length !== prevLen) {
      this.rebuildIndexes();
      this.saveToDisk(this.data);
      return true;
    }
    return false;
  }

  // ── Social Profiles & Enrichment Records ──────────────────────────────────────
  public saveSocialProfiles(profiles: Omit<LeadSocialProfiles, 'id'> & { id?: string }): LeadSocialProfiles {
    const fullProfiles: LeadSocialProfiles = {
      id: profiles.id || `soc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...profiles,
    };
    this.data.socialProfiles[profiles.leadId] = fullProfiles;
    const lead = this.data.leads.find((l) => l.id === profiles.leadId);
    if (lead) {
      lead.socials = fullProfiles;
    }
    this.saveToDisk(this.data);
    return fullProfiles;
  }

  public getSocialProfiles(leadId: string): LeadSocialProfiles | null {
    return this.data.socialProfiles[leadId] || null;
  }

  public saveEnrichment(record: LeadEnrichmentRecord): void {
    this.data.enrichments[record.leadId] = record;
    this.saveToDisk(this.data);
  }

  public getEnrichment(leadId: string): LeadEnrichmentRecord | null {
    return this.data.enrichments[leadId] || null;
  }

  // ── Scrape Errors Logging ─────────────────────────────────────────────────────
  public logError(
    jobId: string,
    stage: 'SEARCH' | 'PARSE' | 'ENRICH',
    errorCode: string,
    message: string,
    targetUrl?: string | null
  ): ScrapeErrorRecord {
    const record: ScrapeErrorRecord = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      jobId,
      timestamp: new Date().toISOString(),
      stage,
      targetUrl: targetUrl || null,
      errorCode,
      message,
    };

    this.data.errors.unshift(record);
    if (this.data.errors.length > 500) {
      this.data.errors = this.data.errors.slice(0, 500);
    }
    this.saveToDisk(this.data);
    return record;
  }

  public getErrors(jobId?: string): ScrapeErrorRecord[] {
    if (jobId) {
      return this.data.errors.filter((e) => e.jobId === jobId);
    }
    return [...this.data.errors];
  }

  // ── Aliases for Queue & Routes ────────────────────────────────────────────────
  public getAllJobs(): SearchJob[] {
    return this.getJobs();
  }

  public getPendingJobs(): SearchJob[] {
    return this.data.jobs.filter((j) => j.status === 'PENDING');
  }

  public getJobById(id: string): SearchJob | null {
    return this.getJob(id);
  }

  public upsertLead(lead: Partial<LeadItem>): LeadItem {
    return this.saveLead(lead as any).lead;
  }

  public queryLeads(params: LeadFilterParams = {}) {
    return this.getLeads(params);
  }

  public getLeadById(id: string): LeadItem | null {
    return this.getLead(id);
  }

  public getSocialsByLeadId(leadId: string): LeadSocialProfiles | null {
    return this.getSocialProfiles(leadId);
  }

  public getEnrichmentRecordsByLeadId(leadId: string): LeadEnrichmentRecord[] {
    const rec = this.getEnrichment(leadId);
    return rec ? [rec] : [];
  }

  public addEnrichmentRecord(record: Omit<LeadEnrichmentRecord, 'id' | 'enrichedAt'> & { enrichedAt?: string }): LeadEnrichmentRecord {
    const fullRec: LeadEnrichmentRecord = {
      id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      enrichedAt: record.enrichedAt || new Date().toISOString(),
      ...record,
    };
    this.saveEnrichment(fullRec);
    return fullRec;
  }

  public addErrorRecord(record: {
    jobId: string;
    stage: 'SEARCH' | 'PARSE' | 'ENRICH';
    errorCode: string;
    message: string;
    targetUrl?: string | null;
  }): ScrapeErrorRecord {
    return this.logError(record.jobId, record.stage, record.errorCode, record.message, record.targetUrl);
  }

  public getErrorsByJobId(jobId: string): ScrapeErrorRecord[] {
    return this.getErrors(jobId);
  }

  // ── Clear for testing ─────────────────────────────────────────────────────────
  public clearAll(): void {
    this.data = { ...DEFAULT_STORE };
    this.placeIdIndex.clear();
    this.domainIndex.clear();
    this.compositeIndex.clear();
    this.saveToDisk(this.data);
  }
}

export const scraperStorage = new ScraperStorageManager();
