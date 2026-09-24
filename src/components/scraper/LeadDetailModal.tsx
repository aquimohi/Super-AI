import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Clock,
  Info,
  ShieldCheck,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Navigation,
} from 'lucide-react';
import { LeadItem, LeadSocialProfiles, LeadEnrichmentRecord } from '../../../server/services/scraper/types';
import { scraperApi } from '../../services/scraperApi';

interface LeadDetailModalProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: (updated: LeadItem) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  leadId,
  onClose,
  onLeadUpdated,
}) => {
  const [lead, setLead] = useState<LeadItem | null>(null);
  const [socials, setSocials] = useState<LeadSocialProfiles | null>(null);
  const [enrichments, setEnrichments] = useState<LeadEnrichmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;
    setIsLoading(true);
    scraperApi
      .getLead(leadId)
      .then((data) => {
        setLead(data.lead);
        setSocials(data.socials);
        setEnrichments(data.enrichments || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load lead details:', err);
        setIsLoading(false);
      });
  }, [leadId]);

  if (!leadId) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReEnrich = async () => {
    if (!lead) return;
    try {
      setIsEnriching(true);
      const res = await scraperApi.enrichLead(lead.id);
      setLead(res.lead);
      setSocials(res.socials);
      setEnrichments(res.enrichment ? [res.enrichment] : []);
      onLeadUpdated?.(res.lead);
    } catch (err) {
      console.error('Enrichment failed:', err);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0a0d14] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                Verified Business Dossier
              </div>
              <h3 className="text-lg font-bold text-white truncate max-w-md">
                {lead?.businessName || 'Loading business profile...'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lead?.website && (
              <button
                onClick={handleReEnrich}
                disabled={isEnriching}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all flex items-center gap-1.5"
                title="Re-run website crawler and discover emails/socials"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
                <span>{isEnriching ? 'Enriching...' : 'Re-enrich Lead'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !lead ? (
            <div className="flex flex-col items-center justify-center py-20 text-cyan-400/60">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
              <div className="font-mono text-sm tracking-wider">RETRIEVING BUSINESS DOSSIER...</div>
            </div>
          ) : (
            <>
              {/* Primary Header Card */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                      {lead.category}
                    </span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {lead.businessStatus || 'OPERATIONAL'}
                    </span>
                  </div>

                  {lead.rating && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-amber-300 text-sm">{lead.rating}</span>
                      <span className="text-xs text-slate-400">({lead.reviewCount || 0} reviews)</span>
                    </div>
                  )}
                </div>

                <div className="text-sm text-slate-300 leading-relaxed">
                  {lead.description || 'Verified Google Maps business entity with active customer engagements.'}
                </div>
              </div>

              {/* Contact & Location Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phone Number</span>
                  </div>
                  {lead.phone ? (
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-white font-mono text-sm hover:text-emerald-400 transition-colors"
                      >
                        {lead.phone}
                      </a>
                      <button
                        onClick={() => copyToClipboard(lead.phone!, 'phone')}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Copy phone"
                      >
                        {copiedField === 'phone' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono italic">No phone listing discovered</div>
                  )}
                </div>

                {/* Email */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span>Direct Email</span>
                  </div>
                  {lead.email ? (
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-white font-mono text-sm hover:text-purple-400 transition-colors truncate max-w-[200px]"
                      >
                        {lead.email}
                      </a>
                      <button
                        onClick={() => copyToClipboard(lead.email!, 'email')}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Copy email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono italic">
                      {lead.website ? 'Use Re-enrich Lead to crawl website' : 'No website available to crawl'}
                    </div>
                  )}
                </div>

                {/* Website */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Official Website</span>
                  </div>
                  {lead.website ? (
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 font-mono text-sm hover:underline truncate max-w-[220px] flex items-center gap-1.5"
                      >
                        <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(lead.website!, 'web')}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Copy URL"
                      >
                        {copiedField === 'web' ? (
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono italic">No website URL recorded</div>
                  )}
                </div>

                {/* Google Maps Link */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Google Maps Listing</span>
                  </div>
                  {lead.googleMapsUrl ? (
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={lead.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-400 font-mono text-sm hover:underline flex items-center gap-1.5"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(lead.googleMapsUrl!, 'gmaps')}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedField === 'gmaps' ? (
                          <Check className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono italic">Listing URL unavailable</div>
                  )}
                </div>
              </div>

              {/* Address Details */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-2">
                <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Physical Address & Coordinates</span>
                </div>
                <div className="text-sm text-slate-200 font-mono">
                  {lead.address || 'Address not listed'}
                </div>
                {lead.latitude && lead.longitude && (
                  <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                    <span>LAT: {lead.latitude}</span>
                    <span>LNG: {lead.longitude}</span>
                    {lead.postalCode && <span>PIN: {lead.postalCode}</span>}
                  </div>
                )}
              </div>

              {/* Social Profiles Matrix */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-3">
                <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Discovered Social Media Profiles</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Facebook */}
                  {socials?.facebook ? (
                    <a
                      href={socials.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30 text-blue-300 text-xs font-mono flex items-center gap-2 hover:bg-blue-900/40 transition-colors"
                    >
                      <Facebook className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">Facebook</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-slate-600 text-xs font-mono flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>Facebook</span>
                    </div>
                  )}

                  {/* Instagram */}
                  {socials?.instagram ? (
                    <a
                      href={socials.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-pink-950/30 border border-pink-500/30 text-pink-300 text-xs font-mono flex items-center gap-2 hover:bg-pink-900/40 transition-colors"
                    >
                      <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
                      <span className="truncate">Instagram</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-slate-600 text-xs font-mono flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>Instagram</span>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {socials?.linkedin ? (
                    <a
                      href={socials.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 hover:bg-cyan-900/40 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">LinkedIn</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-slate-600 text-xs font-mono flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>LinkedIn</span>
                    </div>
                  )}

                  {/* Twitter / X */}
                  {socials?.twitter ? (
                    <a
                      href={socials.twitter}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-slate-800/40 border border-white/20 text-slate-200 text-xs font-mono flex items-center gap-2 hover:bg-slate-800/80 transition-colors"
                    >
                      <Twitter className="w-4 h-4 text-slate-300 shrink-0" />
                      <span className="truncate">Twitter / X</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-slate-600 text-xs font-mono flex items-center gap-2">
                      <Twitter className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>Twitter / X</span>
                    </div>
                  )}

                  {/* YouTube */}
                  {socials?.youtube ? (
                    <a
                      href={socials.youtube}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2 hover:bg-red-900/40 transition-colors"
                    >
                      <Youtube className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="truncate">YouTube</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-slate-600 text-xs font-mono flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>YouTube</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Opening Hours */}
              {lead.openingHours && lead.openingHours.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 space-y-2">
                  <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Operating Hours Schedule</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {lead.openingHours.map((h, i) => (
                      <div key={i} className="text-xs font-mono text-slate-300 py-0.5">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enrichment Audit Log */}
              {enrichments.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/30 border border-white/10 space-y-2">
                  <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enrichment Audit Log</span>
                  </div>
                  {enrichments.map((enr) => (
                    <div key={enr.id} className="text-xs font-mono text-slate-400 space-y-1">
                      <div>Status: <span className="text-emerald-400 font-bold">{enr.status}</span></div>
                      <div>Crawled Pages: {enr.pagesScraped.join(', ') || 'None'}</div>
                      <div>Emails Found: {enr.emailsFound.length} | Phones Found: {enr.phonesFound.length}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
