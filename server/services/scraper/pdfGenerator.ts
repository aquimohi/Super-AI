import { LeadItem, LeadSocialProfiles } from './types.js';

export class LeadPdfGenerator {
  /**
   * Escapes text for PDF literal strings (parentheses, backslashes, non-ASCII to clean ASCII)
   */
  private static escapePdfText(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' ') // sanitize non-ASCII characters to spaces for standard Helvetica
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a fully compliant, self-contained multi-page PDF 1.4 document.
   */
  static generateReport(
    leads: LeadItem[],
    socialsMap: Record<string, LeadSocialProfiles | null>,
    metadata: {
      generatedAt: string;
      totalCount: number;
      filterSummary?: string;
    }
  ): Buffer {
    const PAGE_WIDTH = 595.28; // A4 width in pt
    const PAGE_HEIGHT = 841.89; // A4 height in pt
    const MARGIN_LEFT = 36;
    const MARGIN_RIGHT = 36;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    const pagesContent: string[] = [];
    let currentStream = '';
    let currentY = PAGE_HEIGHT - 45;

    const startNewPage = (isFirstPage: boolean) => {
      if (currentStream) {
        pagesContent.push(currentStream);
      }
      currentStream = '';
      currentY = PAGE_HEIGHT - 45;

      // Page Header
      currentStream += `
0.03 0.05 0.1 rg
${MARGIN_LEFT} ${currentY - 20} ${CONTENT_WIDTH} 32 re f
0.0 0.85 0.95 RG
1.5 w
${MARGIN_LEFT} ${currentY - 20} ${CONTENT_WIDTH} 32 re S
BT
/F2 13 Tf
0.0 0.94 1.0 rg
${MARGIN_LEFT + 12} ${currentY - 6} Td
(GOOGLE MAPS LEAD RESEARCH DOSSIER - SUPER AI INTELLIGENCE) Tj
ET
`;
      currentY -= 35;

      if (isFirstPage) {
        // Meta summary block
        currentStream += `
0.07 0.1 0.16 rg
${MARGIN_LEFT} ${currentY - 28} ${CONTENT_WIDTH} 26 re f
0.2 0.3 0.4 RG
0.5 w
${MARGIN_LEFT} ${currentY - 28} ${CONTENT_WIDTH} 26 re S
BT
/F1 8.5 Tf
0.75 0.85 0.95 rg
${MARGIN_LEFT + 10} ${currentY - 14} Td
(Exported: ${metadata.generatedAt}   |   Verified Records: ${metadata.totalCount}   |   Engine: Google Maps Scraper v2.0) Tj
ET
`;
        currentY -= 40;
      } else {
        currentY -= 15;
      }
    };

    startNewPage(true);

    const ITEM_HEIGHT = 88; // Height per lead card

    leads.forEach((lead, idx) => {
      // Check if we need to wrap to a new page
      if (currentY - ITEM_HEIGHT < 55) {
        startNewPage(false);
      }

      const cardY = currentY - ITEM_HEIGHT;
      const socials = socialsMap[lead.id];

      const name = this.escapePdfText(lead.businessName) || 'Unknown Business';
      const category = this.escapePdfText(lead.category) || 'General Business';
      const address = this.escapePdfText(lead.address) || `${lead.city || ''}, ${lead.country || ''}`;
      const phone = this.escapePdfText(lead.phone) || 'N/A';
      const email = this.escapePdfText(lead.email) || 'N/A';
      const website = this.escapePdfText(lead.website) || 'N/A';
      const ratingStr = lead.rating ? `${lead.rating} Stars (${lead.reviewCount || 0} reviews)` : 'No ratings yet';

      const socList: string[] = [];
      if (socials?.facebook) socList.push('FB');
      if (socials?.instagram) socList.push('IG');
      if (socials?.linkedin) socList.push('LI');
      if (socials?.twitter) socList.push('TW');
      if (socials?.youtube) socList.push('YT');
      const socialsStr = socList.length > 0 ? `Socials: ${socList.join(', ')}` : 'Socials: None';

      // Card Background & Border
      currentStream += `
0.96 0.97 0.99 rg
${MARGIN_LEFT} ${cardY} ${CONTENT_WIDTH} ${ITEM_HEIGHT - 6} re f
0.8 0.85 0.92 RG
0.75 w
${MARGIN_LEFT} ${cardY} ${CONTENT_WIDTH} ${ITEM_HEIGHT - 6} re S

0.0 0.5 0.8 RG
2 w
${MARGIN_LEFT} ${cardY} 0 ${ITEM_HEIGHT - 6} re S

BT
/F2 10.5 Tf
0.05 0.1 0.25 rg
${MARGIN_LEFT + 10} ${cardY + ITEM_HEIGHT - 20} Td
(${idx + 1}. ${name.slice(0, 48)}) Tj
ET

BT
/F1 8.5 Tf
0.35 0.45 0.55 rg
${MARGIN_LEFT + 340} ${cardY + ITEM_HEIGHT - 20} Td
([${category.slice(0, 25)}] - ${ratingStr}) Tj
ET

BT
/F1 8 Tf
0.15 0.2 0.3 rg
${MARGIN_LEFT + 10} ${cardY + ITEM_HEIGHT - 35} Td
(Address: ${address.slice(0, 95)}) Tj
ET

BT
/F2 8 Tf
0.0 0.5 0.3 rg
${MARGIN_LEFT + 10} ${cardY + ITEM_HEIGHT - 50} Td
(Phone: ${phone}) Tj
ET

BT
/F2 8 Tf
0.4 0.1 0.6 rg
${MARGIN_LEFT + 175} ${cardY + ITEM_HEIGHT - 50} Td
(Email: ${email.slice(0, 30)}) Tj
ET

BT
/F1 8 Tf
0.0 0.35 0.7 rg
${MARGIN_LEFT + 340} ${cardY + ITEM_HEIGHT - 50} Td
(Web: ${website.slice(0, 35)}) Tj
ET

BT
/F1 7.5 Tf
0.45 0.5 0.55 rg
${MARGIN_LEFT + 10} ${cardY + ITEM_HEIGHT - 66} Td
(${socialsStr}   |   Status: ${lead.businessStatus || 'OPERATIONAL'}   |   Enrichment: ${lead.enrichmentStatus || 'PENDING'}) Tj
ET
`;
      currentY -= ITEM_HEIGHT;
    });

    if (currentStream) {
      pagesContent.push(currentStream);
    }

    const totalPages = pagesContent.length;

    // Add page numbering & footer to each page stream
    const finalStreams = pagesContent.map((stream, pIdx) => {
      const footerY = 22;
      return (
        stream +
        `
0.75 0.8 0.85 RG
0.5 w
${MARGIN_LEFT} ${footerY + 12} ${CONTENT_WIDTH} 0.5 re S
BT
/F1 7.5 Tf
0.45 0.5 0.55 rg
${MARGIN_LEFT} ${footerY} Td
(CONFIDENTIAL LEAD DATA - EXTRACTED VIA SUPER AI - NOT FOR PUBLIC DISTRIBUTION) Tj
ET
BT
/F2 7.5 Tf
0.1 0.2 0.35 rg
${PAGE_WIDTH - MARGIN_RIGHT - 65} ${footerY} Td
(Page ${pIdx + 1} of ${totalPages}) Tj
ET
`
      );
    });

    // Assemble PDF Object Graph
    // 1: Catalog
    // 2: Pages Parent
    // 3: Font Helvetica
    // 4: Font Helvetica-Bold
    // 5...: Page objects and Stream objects
    const objects: string[] = [];
    const offsets: number[] = [];

    const font1Obj = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
    const font2Obj = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

    const pageObjStart = 5;
    const pageKidsRefs: string[] = [];

    const pageAndStreamObjs: string[] = [];

    finalStreams.forEach((streamText, i) => {
      const pageNum = pageObjStart + i * 2;
      const contentNum = pageNum + 1;
      pageKidsRefs.push(`${pageNum} 0 R`);

      const streamBuffer = Buffer.from(streamText, 'utf-8');

      const pageObj = `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`;

      const contentObj = `${contentNum} 0 obj\n<< /Length ${streamBuffer.length} >>\nstream\n${streamText}\nendstream\nendobj\n`;

      pageAndStreamObjs.push(pageObj);
      pageAndStreamObjs.push(contentObj);
    });

    const catalogObj = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const pagesParentObj = `2 0 obj\n<< /Type /Pages /Kids [${pageKidsRefs.join(' ')}] /Count ${totalPages} >>\nendobj\n`;

    const allObjects = [catalogObj, pagesParentObj, font1Obj, font2Obj, ...pageAndStreamObjs];

    let pdfBody = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
    const startXrefOffset = pdfBody.length;

    let currentOffset = startXrefOffset;
    allObjects.forEach((objStr) => {
      offsets.push(currentOffset);
      pdfBody += objStr;
      currentOffset = pdfBody.length;
    });

    const xrefOffset = pdfBody.length;
    let xref = `xref\n0 ${allObjects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((off) => {
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    });

    const trailer = `trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdfBody + xref + trailer, 'binary');
  }
}
