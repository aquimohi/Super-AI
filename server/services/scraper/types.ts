export type SearchStrategy = 'FAST' | 'DETAILED' | 'GEOGRAPHIC';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type BusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

export type EnrichmentStatus = 'PENDING' | 'ENRICHED' | 'FAILED' | 'SKIPPED';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface SearchJob {
  id: string;
  userId: string;
  keyword: string;
  category: string;
  location: string;
  country: string;
  radiusKm?: number | null;
  strategy: SearchStrategy;
  requestedResults: number;
  collectedResults: number;
  enrichWebsites: boolean;
  status: JobStatus;
  startTime: string;
  endTime?: string | null;
  progressPercent: number;
  errorMessage?: string | null;
  createdAt: string;
}

export interface LeadSocialProfiles {
  id: string;
  leadId: string;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  otherLinks: string[];
}

export interface LeadEnrichmentRecord {
  id: string;
  leadId: string;
  enrichedAt: string;
  pagesScraped: string[];
  emailsFound: string[];
  phonesFound: string[];
  socialsFound: Record<string, string>;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  httpStatus?: number | null;
  errorMessage?: string | null;
}

export interface LeadItem {
  id: string;
  jobId: string;
  userId: string;
  businessName: string;
  category: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  businessStatus?: BusinessStatus | null;
  openingHours?: string[] | null;
  description?: string | null;
  email?: string | null;
  socials?: LeadSocialProfiles;
  enrichmentStatus: EnrichmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeErrorRecord {
  id: string;
  jobId: string;
  timestamp: string;
  stage: 'SEARCH' | 'PARSE' | 'ENRICH';
  targetUrl?: string | null;
  errorCode: string;
  message: string;
}

export interface CreateJobInput {
  keyword: string;
  category?: string;
  location: string;
  country?: string;
  radiusKm?: number;
  strategy?: SearchStrategy;
  requestedResults?: number;
  enrichWebsites?: boolean;
}

export interface LeadFilterParams {
  search?: string;
  location?: string;
  category?: string;
  minRating?: number;
  minReviews?: number;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  hasEmail?: boolean;
  hasSocials?: boolean;
  businessStatus?: BusinessStatus;
  jobId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: keyof LeadItem;
  sortOrder?: 'asc' | 'desc';
}

export interface ScraperDashboardMetrics {
  totalLeads: number;
  leadsWithPhone: number;
  leadsWithWebsite: number;
  leadsWithEmail: number;
  leadsWithSocials: number;
  averageRating: number;
  totalReviews: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
}
