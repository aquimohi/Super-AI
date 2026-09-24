import { EventEmitter } from 'events';
import { SearchJob, LeadItem, LeadSocialProfiles, LeadEnrichmentRecord } from './types.js';
import { scraperStorage } from './scraperStorage.js';
import { GoogleMapsProvider } from './providers/googleMapsProvider.js';
import { WebsiteEnricher } from './websiteEnricher.js';

export class ScraperJobQueue extends EventEmitter {
  private isProcessing = false;
  private cancelledJobs = new Set<string>();
  private provider = new GoogleMapsProvider();

  constructor() {
    super();
  }

  /**
   * Enqueue a job ID to be processed asynchronously.
   */
  enqueue(jobId: string): void {
    this.emit('jobQueued', jobId);
    // Non-blocking invocation of worker loop
    setImmediate(() => this.processNext());
  }

  /**
   * Request cancellation of a running or pending job.
   */
  cancelJob(jobId: string): boolean {
    const job = scraperStorage.getJobById(jobId);
    if (!job) return false;

    this.cancelledJobs.add(jobId);
    scraperStorage.updateJob(jobId, {
      status: 'CANCELLED',
      endTime: new Date().toISOString(),
      errorMessage: 'Job cancelled by user',
    });

    this.emit('jobCancelled', jobId);
    return true;
  }

  /**
   * Check if a job is currently marked as cancelled.
   */
  isCancelled(jobId: string): boolean {
    return this.cancelledJobs.has(jobId);
  }

  /**
   * Core worker loop. Picks up pending jobs and executes them one at a time.
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingJobs = scraperStorage.getPendingJobs();
      if (pendingJobs.length === 0) {
        this.isProcessing = false;
        return;
      }

      const job = pendingJobs[0];
      if (this.isCancelled(job.id)) {
        this.cancelledJobs.delete(job.id);
        this.isProcessing = false;
        this.processNext();
        return;
      }

      await this.runJob(job);
    } catch (err) {
      console.error('[ScraperJobQueue] Error in processNext worker loop:', err);
    } finally {
      this.isProcessing = false;
      // Check if more jobs are waiting
      const remaining = scraperStorage.getPendingJobs();
      if (remaining.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  /**
   * Executes a single job from start to finish.
   * Public runner accessible by autonomous agents.
   */
  public async runJob(job: SearchJob): Promise<LeadItem[]> {
    scraperStorage.updateJob(job.id, {
      status: 'RUNNING',
      startTime: new Date().toISOString(),
      progressPercent: 5,
    });
    this.emit('jobStarted', job.id);
    const savedLeads: LeadItem[] = [];

    try {
      const isCancelled = () => this.isCancelled(job.id);

      // Phase 1: Search Listings via Provider
      const searchResult = await this.provider.search(
        job,
        (collected, msg) => {
          if (isCancelled()) return;
          const pct = Math.min(80, Math.max(5, Math.round((collected / (job.requestedResults || 20)) * 75)));
          scraperStorage.updateJob(job.id, {
            collectedResults: collected,
            progressPercent: pct,
          });
          this.emit('jobProgress', { jobId: job.id, collected, progressPercent: pct, message: msg });
        },
        isCancelled
      );

      // Record any search stage errors
      for (const err of searchResult.errors) {
        scraperStorage.addErrorRecord({
          jobId: job.id,
          stage: err.stage,
          errorCode: err.errorCode,
          message: err.message,
          targetUrl: err.targetUrl,
        });
      }

      if (isCancelled()) {
        this.cancelledJobs.delete(job.id);
        return [];
      }

      // Phase 2: Save and Deduplicate Leads
      for (const rawLead of searchResult.leads) {
        if (isCancelled()) break;
        const saved = scraperStorage.upsertLead({
          ...rawLead,
          jobId: job.id,
          userId: job.userId,
        });
        savedLeads.push(saved);
      }

      scraperStorage.updateJob(job.id, {
        collectedResults: savedLeads.length,
        progressPercent: job.enrichWebsites ? 80 : 100,
      });

      // Phase 3: Optional Website Enrichment
      if (job.enrichWebsites && !isCancelled()) {
        const totalToEnrich = savedLeads.filter((l) => l.website).length;
        let enrichedCount = 0;

        for (const lead of savedLeads) {
          if (isCancelled()) break;
          if (!lead.website) continue;

          try {
            const enrichRes = await WebsiteEnricher.enrichLeadWebsite(lead);

            // Save Social Profiles
            scraperStorage.saveSocialProfiles({
              leadId: lead.id,
              facebook: enrichRes.socials.facebook,
              instagram: enrichRes.socials.instagram,
              linkedin: enrichRes.socials.linkedin,
              twitter: enrichRes.socials.twitter,
              youtube: enrichRes.socials.youtube,
              otherLinks: enrichRes.socials.otherLinks,
            });

            // Save Enrichment Log
            scraperStorage.addEnrichmentRecord({
              leadId: lead.id,
              pagesScraped: enrichRes.enrichment.pagesScraped,
              emailsFound: enrichRes.enrichment.emailsFound,
              phonesFound: enrichRes.enrichment.phonesFound,
              socialsFound: enrichRes.enrichment.socialsFound,
              status: enrichRes.enrichment.status,
              httpStatus: enrichRes.enrichment.httpStatus,
              errorMessage: enrichRes.enrichment.errorMessage,
            });

            // Update lead with discovered email / phone if previously missing
            const leadUpdates: Partial<LeadItem> = {
              enrichmentStatus: enrichRes.enrichment.status === 'SUCCESS' ? 'ENRICHED' : 'FAILED',
            };
            if (!lead.email && enrichRes.primaryEmail) {
              leadUpdates.email = enrichRes.primaryEmail;
            }
            if (!lead.phone && enrichRes.primaryPhone) {
              leadUpdates.phone = enrichRes.primaryPhone;
            }
            scraperStorage.updateLead(lead.id, leadUpdates);
          } catch (err: unknown) {
            scraperStorage.addErrorRecord({
              jobId: job.id,
              stage: 'ENRICH',
              errorCode: 'ENRICH_EXCEPTION',
              message: err instanceof Error ? err.message : String(err),
              targetUrl: lead.website,
            });
          }

          enrichedCount++;
          const enrichPct = 80 + Math.round((enrichedCount / Math.max(1, totalToEnrich)) * 20);
          scraperStorage.updateJob(job.id, { progressPercent: Math.min(99, enrichPct) });
          this.emit('jobProgress', {
            jobId: job.id,
            collected: savedLeads.length,
            progressPercent: enrichPct,
            message: `Enriched ${enrichedCount} of ${totalToEnrich} websites...`,
          });
        }
      }

      if (isCancelled()) {
        this.cancelledJobs.delete(job.id);
        return savedLeads;
      }

      // Mark Job as Completed
      scraperStorage.updateJob(job.id, {
        status: 'COMPLETED',
        progressPercent: 100,
        endTime: new Date().toISOString(),
      });
      this.emit('jobCompleted', job.id);
      return savedLeads;
    } catch (err: unknown) {
      console.error(`[ScraperJobQueue] Job ${job.id} failed:`, err);
      scraperStorage.updateJob(job.id, {
        status: 'FAILED',
        endTime: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Unknown execution failure',
      });
      this.emit('jobFailed', { jobId: job.id, error: err });
      return savedLeads;
    } finally {
      this.cancelledJobs.delete(job.id);
    }
  }
}

export const scraperJobQueue = new ScraperJobQueue();
