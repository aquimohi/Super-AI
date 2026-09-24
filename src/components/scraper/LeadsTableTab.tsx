import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Phone,
  Mail,
  Globe,
  Star,
  ExternalLink,
  Trash2,
  Eye,
  Download,
  Copy,
  Check,
  RotateCcw,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { LeadItem, LeadFilterParams } from '../../../server/services/scraper/types';
import { scraperApi } from '../../services/scraperApi';
import { LeadDetailModal } from './LeadDetailModal';

interface LeadsTableTabProps {
  initialJobId?: string | null;
  onClearJobFilter?: () => void;
}

export const LeadsTableTab: React.FC<LeadsTableTabProps> = ({
  initialJobId,
  onClearJobFilter,
}) => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [hasPhone, setHasPhone] = useState<boolean | undefined>(undefined);
  const [hasWebsite, setHasWebsite] = useState<boolean | undefined>(undefined);
  const [hasEmail, setHasEmail] = useState<boolean | undefined>(undefined);
  const [hasSocials, setHasSocials] = useState<boolean | undefined>(undefined);
  const [jobId, setJobId] = useState<string | undefined>(initialJobId || undefined);

  // Sorting
  const [sortBy, setSortBy] = useState<keyof LeadItem>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dossier modal
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  // Quick feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialJobId !== undefined) {
      setJobId(initialJobId || undefined);
    }
  }, [initialJobId]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const params: LeadFilterParams = {
        search: search.trim() || undefined,
        location: location.trim() || undefined,
        category: category.trim() || undefined,
        minRating,
        hasPhone,
        hasWebsite,
        hasEmail,
        hasSocials,
        jobId,
        page,
        pageSize,
        sortBy,
        sortOrder,
      };

      const res = await scraperApi.getLeads(params);
      setLeads(res.leads);
      setTotalLeads(res.total);
      setTotalPages(res.totalPages || 1);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to query leads:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, pageSize, sortBy, sortOrder, minRating, hasPhone, hasWebsite, hasEmail, hasSocials, jobId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const resetFilters = () => {
    setSearch('');
    setLocation('');
    setCategory('');
    setMinRating(undefined);
    setHasPhone(undefined);
    setHasWebsite(undefined);
    setHasEmail(undefined);
    setHasSocials(undefined);
    setJobId(undefined);
    onClearJobFilter?.();
    setPage(1);
  };

  const toggleSort = (col: keyof LeadItem) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Delete this lead record permanently?')) return;
    try {
      await scraperApi.deleteLead(id);
      fetchLeads();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return;
    const idsParam = Array.from(selectedIds).join(',');
    const exportUrl = `/api/scraper/export?format=csv&ids=${encodeURIComponent(idsParam)}`;

    // Trigger authentic browser HTTP download (no blob URL, guaranteed .csv extension in Edge/Chrome)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = exportUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 10000);
  };

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, keyword, phone, email, address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Location Input */}
          <div className="relative w-full md:w-56">
            <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City / Region"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Rating Dropdown */}
          <select
            value={minRating === undefined ? '' : minRating}
            onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full md:w-40 py-2.5 px-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="">Any Rating</option>
            <option value="4.5">★ 4.5 & up</option>
            <option value="4.0">★ 4.0 & up</option>
            <option value="3.5">★ 3.5 & up</option>
          </select>

          <button
            type="submit"
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs tracking-wider uppercase font-mono transition-colors shrink-0"
          >
            Search
          </button>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {jobId && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                <span>Job: {jobId.slice(0, 14)}...</span>
                <button
                  type="button"
                  onClick={() => {
                    setJobId(undefined);
                    onClearJobFilter?.();
                  }}
                  className="hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => setHasPhone((prev) => (prev === true ? undefined : true))}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                hasPhone === true
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              📞 Phone Only
            </button>

            <button
              type="button"
              onClick={() => setHasWebsite((prev) => (prev === true ? undefined : true))}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                hasWebsite === true
                  ? 'bg-blue-500/20 border-blue-400 text-blue-300 font-bold'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              🌐 Website Only
            </button>

            <button
              type="button"
              onClick={() => setHasEmail((prev) => (prev === true ? undefined : true))}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                hasEmail === true
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              ✉️ Email Only
            </button>

            <button
              type="button"
              onClick={() => setHasSocials((prev) => (prev === true ? undefined : true))}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                hasSocials === true
                  ? 'bg-pink-500/20 border-pink-400 text-pink-300 font-bold'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              🔗 Socials Only
            </button>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </form>

      {/* Bulk Action Banner */}
      {selectedIds.size > 0 && (
        <div className="p-3 px-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between animate-in fade-in duration-150">
          <div className="text-xs font-mono text-cyan-300 flex items-center gap-2">
            <span className="font-bold">{selectedIds.size}</span>
            <span>of {leads.length} leads selected on this page</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkExport}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/10 transition-colors"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/40 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded accent-cyan-400 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => toggleSort('businessName')}
                  className="p-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Business</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Location</th>
                <th
                  onClick={() => toggleSort('rating')}
                  className="p-3.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Rating</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3.5">Links</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-cyan-400/60">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>QUERYING LEAD MATRIX...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <p className="font-semibold text-white">No businesses match query criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting keywords, location, or clearing active filters.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors duration-150 ${
                        isSelected ? 'bg-cyan-950/20' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 pl-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(lead.id)}
                          className="rounded accent-cyan-400 cursor-pointer"
                        />
                      </td>

                      {/* Business Name & Category */}
                      <td className="p-3.5 max-w-xs">
                        <div
                          onClick={() => setActiveLeadId(lead.id)}
                          className="font-bold text-white hover:text-cyan-400 cursor-pointer truncate transition-colors"
                          title={lead.businessName}
                        >
                          {lead.businessName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {lead.category || 'General Business'}
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="p-3.5 whitespace-nowrap">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{lead.phone}</span>
                            <button
                              onClick={() => copyText(lead.phone!, lead.id + '_phone')}
                              className="text-slate-500 hover:text-white"
                              title="Copy Phone"
                            >
                              {copiedId === lead.id + '_phone' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic text-[11px]">No phone</span>
                        )}

                        {lead.email ? (
                          <div className="flex items-center gap-1.5 text-purple-300 mt-1">
                            <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{lead.email}</span>
                            <button
                              onClick={() => copyText(lead.email!, lead.id + '_email')}
                              className="text-slate-500 hover:text-white"
                              title="Copy Email"
                            >
                              {copiedId === lead.id + '_email' ? (
                                <Check className="w-3 h-3 text-purple-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : null}
                      </td>

                      {/* Location */}
                      <td className="p-3.5 text-slate-300 max-w-[140px] truncate" title={lead.address || ''}>
                        <div className="truncate">{lead.city || 'Unknown City'}</div>
                        <div className="text-[10px] text-slate-500 truncate">{lead.country}</div>
                      </td>

                      {/* Rating */}
                      <td className="p-3.5 whitespace-nowrap">
                        {lead.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-bold text-amber-300">{lead.rating}</span>
                            <span className="text-[10px] text-slate-500">({lead.reviewCount || 0})</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Links */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                              title={lead.website}
                            >
                              <Globe className="w-3.5 h-3.5" />
                            </a>
                          ) : null}

                          {lead.googleMapsUrl ? (
                            <a
                              href={lead.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="View on Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                          ) : null}

                          {lead.enrichmentStatus === 'ENRICHED' && (
                            <span className="p-1 rounded bg-purple-500/10 text-purple-400" title="Enriched">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveLeadId(lead.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
                            title="View Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing {leads.length} of {totalLeads} total records</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>Page size:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-white"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dossier Modal */}
      {activeLeadId && (
        <LeadDetailModal
          leadId={activeLeadId}
          onClose={() => setActiveLeadId(null)}
          onLeadUpdated={() => fetchLeads()}
        />
      )}
    </div>
  );
};
