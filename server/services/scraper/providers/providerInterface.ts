import { SearchJob, LeadItem, ScrapeErrorRecord } from '../types.js';

export interface ProviderSearchResult {
  leads: Partial<LeadItem>[];
  errors: Omit<ScrapeErrorRecord, 'id' | 'jobId' | 'timestamp'>[];
}

export interface SearchProvider {
  name: string;
  search(
    job: SearchJob,
    onProgress?: (collected: number, message?: string) => void,
    isCancelled?: () => boolean
  ): Promise<ProviderSearchResult>;
}
