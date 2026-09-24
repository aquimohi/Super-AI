import {
  SearchJob,
  LeadItem,
  LeadSocialProfiles,
  LeadEnrichmentRecord,
  CreateJobInput,
  LeadFilterParams,
  ScraperDashboardMetrics,
} from '../../server/services/scraper/types';

export interface PaginatedLeadsResponse {
  success: boolean;
  leads: LeadItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeadDetailResponse {
  success: boolean;
  lead: LeadItem;
  socials: LeadSocialProfiles | null;
  enrichments?: LeadEnrichmentRecord[];
  enrichment?: LeadEnrichmentRecord | null;
}

export interface CreateJobResponse {
  success: boolean;
  message: string;
  job: SearchJob;
}

export interface JobsListResponse {
  success: boolean;
  jobs: SearchJob[];
}

export interface MetricsResponse {
  success: boolean;
  metrics: ScraperDashboardMetrics;
}

export const scraperApi = {
  async getMetrics(): Promise<ScraperDashboardMetrics> {
    const res = await fetch('/api/scraper/metrics');
    if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
    const data: MetricsResponse = await res.json();
    return data.metrics;
  },

  async createJob(input: CreateJobInput): Promise<SearchJob> {
    const res = await fetch('/api/scraper/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Job creation failed' }));
      throw new Error(err.error || 'Failed to create job');
    }
    const data: CreateJobResponse = await res.json();
    return data.job;
  },

  async getJobs(): Promise<SearchJob[]> {
    const res = await fetch('/api/scraper/jobs');
    if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.statusText}`);
    const data: JobsListResponse = await res.json();
    return data.jobs;
  },

  async getJob(id: string): Promise<SearchJob> {
    const res = await fetch(`/api/scraper/jobs/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch job ${id}`);
    const data = await res.json();
    return data.job;
  },

  async cancelJob(id: string): Promise<void> {
    const res = await fetch(`/api/scraper/jobs/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to cancel job ${id}`);
  },

  async getLeads(params: LeadFilterParams = {}): Promise<PaginatedLeadsResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.location) query.set('location', params.location);
    if (params.category) query.set('category', params.category);
    if (params.minRating !== undefined) query.set('minRating', String(params.minRating));
    if (params.minReviews !== undefined) query.set('minReviews', String(params.minReviews));
    if (params.hasPhone !== undefined) query.set('hasPhone', String(params.hasPhone));
    if (params.hasWebsite !== undefined) query.set('hasWebsite', String(params.hasWebsite));
    if (params.hasEmail !== undefined) query.set('hasEmail', String(params.hasEmail));
    if (params.hasSocials !== undefined) query.set('hasSocials', String(params.hasSocials));
    if (params.businessStatus) query.set('businessStatus', params.businessStatus);
    if (params.jobId) query.set('jobId', params.jobId);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    if (params.sortBy) query.set('sortBy', String(params.sortBy));
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const res = await fetch(`/api/scraper/leads?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch leads: ${res.statusText}`);
    return res.json();
  },

  async getLead(id: string): Promise<LeadDetailResponse> {
    const res = await fetch(`/api/scraper/leads/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch lead ${id}`);
    return res.json();
  },

  async enrichLead(id: string): Promise<LeadDetailResponse> {
    const res = await fetch(`/api/scraper/leads/${encodeURIComponent(id)}/enrich`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Enrichment failed' }));
      throw new Error(err.error || 'Failed to enrich lead');
    }
    return res.json();
  },

  async deleteLead(id: string): Promise<void> {
    const res = await fetch(`/api/scraper/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete lead ${id}`);
  },

  getExportUrl(params: LeadFilterParams = {}, format: 'csv' | 'excel' | 'json' | 'pdf' = 'csv', inline?: boolean): string {
    const query = new URLSearchParams();
    query.set('format', format);
    if (inline) query.set('inline', 'true');
    if (params.search) query.set('search', params.search);
    if (params.location) query.set('location', params.location);
    if (params.category) query.set('category', params.category);
    if (params.minRating !== undefined) query.set('minRating', String(params.minRating));
    if (params.hasPhone !== undefined) query.set('hasPhone', String(params.hasPhone));
    if (params.hasWebsite !== undefined) query.set('hasWebsite', String(params.hasWebsite));
    if (params.hasEmail !== undefined) query.set('hasEmail', String(params.hasEmail));
    if (params.hasSocials !== undefined) query.set('hasSocials', String(params.hasSocials));
    if (params.jobId) query.set('jobId', params.jobId);
    return `/api/scraper/export?${query.toString()}`;
  },

  async getSavedExports(): Promise<SavedExportFile[]> {
    const res = await fetch('/api/scraper/exports/saved');
    if (!res.ok) throw new Error('Failed to fetch saved exports');
    const data = await res.json();
    return data.files || [];
  },

  async openExportFolder(): Promise<{ success: boolean; path: string }> {
    const res = await fetch('/api/scraper/exports/open-folder', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to open export folder');
    return res.json();
  },

  async downloadExportBlob(
    params: LeadFilterParams = {},
    format: 'csv' | 'excel' | 'json' | 'pdf' = 'csv'
  ): Promise<{ blob: Blob; fileName: string; localPath?: string }> {
    const url = this.getExportUrl(params, format);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to download export');
    const blob = await res.blob();
    const savedName = res.headers.get('X-Saved-File-Name');
    const localPath = res.headers.get('X-Saved-File-Path') || undefined;
    const dateStr = new Date().toISOString().slice(0, 10);
    const ext = format === 'excel' ? 'xls' : format;
    const fallbackName = `leads_export_${dateStr}.${ext}`;
    return {
      blob,
      fileName: savedName || fallbackName,
      localPath,
    };
  },
};

export interface SavedExportFile {
  name: string;
  sizeBytes: number;
  lastModified: string;
  fullPath: string;
  downloadUrl: string;
}

