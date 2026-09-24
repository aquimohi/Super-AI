import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { scraperStorage } from '../services/scraper/scraperStorage.js';
import { scraperJobQueue } from '../services/scraper/jobQueue.js';
import { WebsiteEnricher } from '../services/scraper/websiteEnricher.js';
import { LeadFilterParams, SearchStrategy, BusinessStatus, LeadItem } from '../services/scraper/types.js';
import { LeadPdfGenerator } from '../services/scraper/pdfGenerator.js';

export const scraperRouter = Router();

/**
 * POST /api/scraper/jobs
 * Creates and queues a new scraping job.
 */
scraperRouter.post('/jobs', async (req: Request, res: Response) => {
  try {
    const {
      keyword,
      category,
      location,
      country,
      radiusKm,
      strategy,
      requestedResults,
      enrichWebsites,
    } = req.body;

    if (!keyword || !keyword.trim()) {
      res.status(400).json({ error: 'Search keyword is required.' });
      return;
    }
    if (!location || !location.trim()) {
      res.status(400).json({ error: 'City / Location is required.' });
      return;
    }

    const job = scraperStorage.createJob({
      keyword: keyword.trim(),
      category: category?.trim() || keyword.trim(),
      location: location.trim(),
      country: country?.trim() || 'India',
      radiusKm: radiusKm ? Math.max(1, Math.min(100, Number(radiusKm))) : 15,
      strategy: (strategy as SearchStrategy) || 'FAST',
      requestedResults: requestedResults ? Math.max(1, Math.min(250, Number(requestedResults))) : 25,
      enrichWebsites: Boolean(enrichWebsites),
    });

    // Start background processing
    scraperJobQueue.enqueue(job.id);

    res.status(201).json({
      success: true,
      message: 'Job created and enqueued successfully',
      job,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create job' });
  }
});

/**
 * GET /api/scraper/jobs
 * Returns all jobs.
 */
scraperRouter.get('/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = scraperStorage.getAllJobs();
    res.json({ success: true, jobs });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list jobs' });
  }
});

/**
 * GET /api/scraper/jobs/:id
 * Returns a specific job by ID.
 */
scraperRouter.get('/jobs/:id', (req: Request, res: Response) => {
  try {
    const job = scraperStorage.getJobById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    const errors = scraperStorage.getErrorsByJobId(job.id);
    res.json({ success: true, job, errors });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch job' });
  }
});

/**
 * POST /api/scraper/jobs/:id/cancel
 * Cancels an active or pending job.
 */
scraperRouter.post('/jobs/:id/cancel', (req: Request, res: Response) => {
  try {
    const success = scraperJobQueue.cancelJob(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Job not found or already terminated' });
      return;
    }
    res.json({ success: true, message: 'Job cancellation requested' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to cancel job' });
  }
});

/**
 * GET /api/scraper/leads
 * Queries leads with multi-filter, search, pagination, and sorting.
 */
scraperRouter.get('/leads', (req: Request, res: Response) => {
  try {
    const filters: LeadFilterParams = {
      search: req.query.search as string | undefined,
      location: req.query.location as string | undefined,
      category: req.query.category as string | undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      minReviews: req.query.minReviews ? Number(req.query.minReviews) : undefined,
      hasPhone: req.query.hasPhone === 'true' ? true : req.query.hasPhone === 'false' ? false : undefined,
      hasWebsite: req.query.hasWebsite === 'true' ? true : req.query.hasWebsite === 'false' ? false : undefined,
      hasEmail: req.query.hasEmail === 'true' ? true : req.query.hasEmail === 'false' ? false : undefined,
      hasSocials: req.query.hasSocials === 'true' ? true : req.query.hasSocials === 'false' ? false : undefined,
      businessStatus: req.query.businessStatus as BusinessStatus | undefined,
      jobId: req.query.jobId as string | undefined,
      page: req.query.page ? Math.max(1, Number(req.query.page)) : 1,
      pageSize: req.query.pageSize ? Math.max(1, Math.min(100, Number(req.query.pageSize))) : 25,
      sortBy: (req.query.sortBy as keyof LeadItem) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = scraperStorage.queryLeads(filters);
    res.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to query leads' });
  }
});

/**
 * GET /api/scraper/leads/:id
 * Fetches single lead with its social profiles and enrichment records.
 */
scraperRouter.get('/leads/:id', (req: Request, res: Response) => {
  try {
    const lead = scraperStorage.getLeadById(req.params.id);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    const socials = scraperStorage.getSocialsByLeadId(lead.id);
    const enrichments = scraperStorage.getEnrichmentRecordsByLeadId(lead.id);
    res.json({ success: true, lead, socials, enrichments });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch lead' });
  }
});

/**
 * POST /api/scraper/leads/:id/enrich
 * Manually enriches a specific lead's website.
 */
scraperRouter.post('/leads/:id/enrich', async (req: Request, res: Response) => {
  try {
    const lead = scraperStorage.getLeadById(req.params.id);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (!lead.website) {
      res.status(400).json({ error: 'This lead does not have a website URL to enrich.' });
      return;
    }

    const enrichRes = await WebsiteEnricher.enrichLeadWebsite(lead);

    // Save Socials
    const socials = scraperStorage.saveSocialProfiles({
      leadId: lead.id,
      facebook: enrichRes.socials.facebook,
      instagram: enrichRes.socials.instagram,
      linkedin: enrichRes.socials.linkedin,
      twitter: enrichRes.socials.twitter,
      youtube: enrichRes.socials.youtube,
      otherLinks: enrichRes.socials.otherLinks,
    });

    // Save Log
    const enrichment = scraperStorage.addEnrichmentRecord({
      leadId: lead.id,
      pagesScraped: enrichRes.enrichment.pagesScraped,
      emailsFound: enrichRes.enrichment.emailsFound,
      phonesFound: enrichRes.enrichment.phonesFound,
      socialsFound: enrichRes.enrichment.socialsFound,
      status: enrichRes.enrichment.status,
      httpStatus: enrichRes.enrichment.httpStatus,
      errorMessage: enrichRes.enrichment.errorMessage,
    });

    const leadUpdates: Partial<LeadItem> = {
      enrichmentStatus: enrichRes.enrichment.status === 'SUCCESS' ? 'ENRICHED' : 'FAILED',
    };
    if (!lead.email && enrichRes.primaryEmail) {
      leadUpdates.email = enrichRes.primaryEmail;
    }
    if (!lead.phone && enrichRes.primaryPhone) {
      leadUpdates.phone = enrichRes.primaryPhone;
    }
    const updatedLead = scraperStorage.updateLead(lead.id, leadUpdates);

    res.json({
      success: true,
      lead: updatedLead,
      socials,
      enrichment,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to enrich lead' });
  }
});

/**
 * DELETE /api/scraper/leads/:id
 * Deletes a lead.
 */
scraperRouter.delete('/leads/:id', (req: Request, res: Response) => {
  try {
    const success = scraperStorage.deleteLead(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete lead' });
  }
});

/**
 * GET /api/scraper/metrics
 * Returns comprehensive dashboard KPI metrics.
 */
scraperRouter.get('/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = scraperStorage.getMetrics();
    res.json({ success: true, metrics });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch metrics' });
  }
});

/**
 * Generates Microsoft Excel XML Spreadsheet 2003 (.xls) content
 * Opens natively in all Microsoft Excel versions without format mismatch warnings.
 */
function generateExcelXml(leads: LeadItem[], socialsMap: Record<string, any>): string {
  const escapeXml = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const headers = [
    'Business Name',
    'Category',
    'Phone',
    'Email',
    'Website',
    'Address',
    'City',
    'State',
    'Country',
    'Postal Code',
    'Rating',
    'Review Count',
    'Business Status',
    'Facebook',
    'Instagram',
    'LinkedIn',
    'Twitter',
    'YouTube',
    'Google Maps URL',
    'Place ID',
  ];

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('');

  const rowsXml = leads
    .map((lead) => {
      const s = socialsMap[lead.id];
      const fields = [
        { val: lead.businessName, type: 'String' },
        { val: lead.category, type: 'String' },
        { val: lead.phone, type: 'String' },
        { val: lead.email, type: 'String' },
        { val: lead.website, type: 'String' },
        { val: lead.address, type: 'String' },
        { val: lead.city, type: 'String' },
        { val: lead.state, type: 'String' },
        { val: lead.country, type: 'String' },
        { val: lead.postalCode, type: 'String' },
        { val: lead.rating ?? '', type: typeof lead.rating === 'number' ? 'Number' : 'String' },
        { val: lead.reviewCount ?? '', type: typeof lead.reviewCount === 'number' ? 'Number' : 'String' },
        { val: lead.businessStatus, type: 'String' },
        { val: s?.facebook, type: 'String' },
        { val: s?.instagram, type: 'String' },
        { val: s?.linkedin, type: 'String' },
        { val: s?.twitter, type: 'String' },
        { val: s?.youtube, type: 'String' },
        { val: lead.googleMapsUrl, type: 'String' },
        { val: lead.googlePlaceId, type: 'String' },
      ];

      const cells = fields
        .map((f) => `<Cell><Data ss:Type="${f.type}">${escapeXml(f.val)}</Data></Cell>`)
        .join('');
      return `<Row ss:Height="18">${cells}</Row>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0891B2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Verified Leads">
  <Table ss:DefaultRowHeight="20">
   <Row ss:Height="26">${headerCells}</Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * GET /api/scraper/leads/export
 * Exports leads matching filters in CSV, Excel, or JSON.
 */
scraperRouter.get('/export', (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';

    const filters: LeadFilterParams = {
      search: req.query.search as string | undefined,
      location: req.query.location as string | undefined,
      category: req.query.category as string | undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      minReviews: req.query.minReviews ? Number(req.query.minReviews) : undefined,
      hasPhone: req.query.hasPhone === 'true' ? true : req.query.hasPhone === 'false' ? false : undefined,
      hasWebsite: req.query.hasWebsite === 'true' ? true : req.query.hasWebsite === 'false' ? false : undefined,
      hasEmail: req.query.hasEmail === 'true' ? true : req.query.hasEmail === 'false' ? false : undefined,
      hasSocials: req.query.hasSocials === 'true' ? true : req.query.hasSocials === 'false' ? false : undefined,
      businessStatus: req.query.businessStatus as BusinessStatus | undefined,
      jobId: req.query.jobId as string | undefined,
      page: 1,
      pageSize: 5000, // Export up to 5,000 matches
      sortBy: (req.query.sortBy as keyof LeadItem) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    let { leads } = scraperStorage.queryLeads(filters);

    // If specific lead IDs are passed (e.g. from table selection bulk export)
    if (req.query.ids) {
      const idSet = new Set(
        (req.query.ids as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      if (idSet.size > 0) {
        leads = leads.filter((l) => idSet.has(l.id));
      }
    }

    const safeDate = new Date().toISOString().slice(0, 10);
    const fileBase = `leads_export_${safeDate}_${Date.now().toString().slice(-4)}`;
    const isInline = req.query.inline === 'true';

    // Ensure exports directory exists on disk
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    if (format === 'json') {
      const fileName = `${fileBase}.json`;
      const localFilePath = path.join(exportsDir, fileName);
      const jsonContent = JSON.stringify(leads, null, 2);
      fs.writeFileSync(localFilePath, jsonContent, 'utf-8');

      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Saved-File-Name, X-Saved-File-Path');
      res.setHeader('X-Saved-File-Name', fileName);
      res.setHeader('X-Saved-File-Path', localFilePath);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.send(jsonContent);
      return;
    }

    if (format === 'pdf') {
      const fileName = `${fileBase}.pdf`;
      const localFilePath = path.join(exportsDir, fileName);
      const socialsMap: Record<string, any> = {};
      for (const lead of leads) {
        socialsMap[lead.id] = scraperStorage.getSocialsByLeadId(lead.id);
      }
      const pdfBuffer = LeadPdfGenerator.generateReport(leads, socialsMap, {
        generatedAt: new Date().toLocaleString(),
        totalCount: leads.length,
      });

      fs.writeFileSync(localFilePath, pdfBuffer);

      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Saved-File-Name, X-Saved-File-Path');
      res.setHeader('X-Saved-File-Name', fileName);
      res.setHeader('X-Saved-File-Path', localFilePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        isInline
          ? `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
          : `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
      return;
    }

    if (format === 'excel') {
      const fileName = `${fileBase}.xls`;
      const localFilePath = path.join(exportsDir, fileName);
      const socialsMap: Record<string, any> = {};
      for (const lead of leads) {
        socialsMap[lead.id] = scraperStorage.getSocialsByLeadId(lead.id);
      }
      const excelXmlContent = generateExcelXml(leads, socialsMap);
      fs.writeFileSync(localFilePath, excelXmlContent, 'utf-8');

      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Saved-File-Name, X-Saved-File-Path');
      res.setHeader('X-Saved-File-Name', fileName);
      res.setHeader('X-Saved-File-Path', localFilePath);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.send(excelXmlContent);
      return;
    }

    // Default CSV
    const headers = [
      'Business Name',
      'Category',
      'Phone',
      'Email',
      'Website',
      'Address',
      'City',
      'State',
      'Country',
      'Postal Code',
      'Rating',
      'Review Count',
      'Business Status',
      'Facebook',
      'Instagram',
      'LinkedIn',
      'Twitter',
      'YouTube',
      'Google Maps URL',
      'Place ID',
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((lead) => {
      const socials = scraperStorage.getSocialsByLeadId(lead.id);
      return [
        escapeCsv(lead.businessName),
        escapeCsv(lead.category),
        escapeCsv(lead.phone),
        escapeCsv(lead.email),
        escapeCsv(lead.website),
        escapeCsv(lead.address),
        escapeCsv(lead.city),
        escapeCsv(lead.state),
        escapeCsv(lead.country),
        escapeCsv(lead.postalCode),
        escapeCsv(lead.rating),
        escapeCsv(lead.reviewCount),
        escapeCsv(lead.businessStatus),
        escapeCsv(socials?.facebook),
        escapeCsv(socials?.instagram),
        escapeCsv(socials?.linkedin),
        escapeCsv(socials?.twitter),
        escapeCsv(socials?.youtube),
        escapeCsv(lead.googleMapsUrl),
        escapeCsv(lead.googlePlaceId),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const fileName = `${fileBase}.csv`;
    const localFilePath = path.join(exportsDir, fileName);
    const csvContentWithBom = '\uFEFF' + csvContent;
    fs.writeFileSync(localFilePath, csvContentWithBom, 'utf-8');

    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Saved-File-Name, X-Saved-File-Path');
    res.setHeader('X-Saved-File-Name', fileName);
    res.setHeader('X-Saved-File-Path', localFilePath);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    res.send(csvContentWithBom);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
});

/**
 * GET /api/scraper/exports/saved
 * Returns list of export files stored in exports/ directory.
 */
scraperRouter.get('/exports/saved', (_req: Request, res: Response) => {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      res.json({ success: true, files: [] });
      return;
    }
    const dirents = fs.readdirSync(exportsDir, { withFileTypes: true });
    const files = dirents
      .filter((d) => d.isFile())
      .map((d) => {
        const fullPath = path.join(exportsDir, d.name);
        const stat = fs.statSync(fullPath);
        return {
          name: d.name,
          sizeBytes: stat.size,
          lastModified: stat.mtime.toISOString(),
          fullPath,
          downloadUrl: `/api/scraper/exports/file/${encodeURIComponent(d.name)}`,
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    res.json({ success: true, files });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list saved files' });
  }
});

/**
 * GET /api/scraper/exports/file/:fileName
 * Direct download for previously saved export file.
 */
scraperRouter.get('/exports/file/:fileName', (req: Request, res: Response) => {
  try {
    const fileName = path.basename(req.params.fileName);
    const exportsDir = path.join(process.cwd(), 'exports');
    const filePath = path.join(exportsDir, fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.download(filePath, fileName);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Download failed' });
  }
});

/**
 * POST /api/scraper/exports/open-folder
 * Opens exports folder in Windows File Explorer.
 */
scraperRouter.post('/exports/open-folder', (_req: Request, res: Response) => {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    exec(`explorer.exe "${exportsDir}"`, (err) => {
      if (err) {
        console.warn('Failed to open explorer:', err);
      }
    });
    res.json({ success: true, path: exportsDir });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to open folder' });
  }
});
