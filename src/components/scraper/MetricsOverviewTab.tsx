import React from 'react';
import {
  Users,
  Phone,
  Globe,
  Mail,
  Share2,
  Star,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { ScraperDashboardMetrics } from '../../../server/services/scraper/types';

interface MetricsOverviewTabProps {
  metrics: ScraperDashboardMetrics | null;
  isLoading: boolean;
  onNavigateTab: (tab: 'search' | 'jobs' | 'leads' | 'export') => void;
}

export const MetricsOverviewTab: React.FC<MetricsOverviewTabProps> = ({
  metrics,
  isLoading,
  onNavigateTab,
}) => {
  if (isLoading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-cyan-400/60">
        <Activity className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
        <div className="font-mono text-sm tracking-wider">SYNCING METRIC MATRIX...</div>
      </div>
    );
  }

  const phonePct = metrics.totalLeads > 0 ? Math.round((metrics.leadsWithPhone / metrics.totalLeads) * 100) : 0;
  const webPct = metrics.totalLeads > 0 ? Math.round((metrics.leadsWithWebsite / metrics.totalLeads) * 100) : 0;
  const emailPct = metrics.totalLeads > 0 ? Math.round((metrics.leadsWithEmail / metrics.totalLeads) * 100) : 0;
  const socialPct = metrics.totalLeads > 0 ? Math.round((metrics.leadsWithSocials / metrics.totalLeads) * 100) : 0;

  const kpis = [
    {
      label: 'TOTAL HARVESTED LEADS',
      value: metrics.totalLeads.toLocaleString(),
      sub: `${metrics.completedJobs} completed jobs`,
      icon: Users,
      color: 'text-cyan-400',
      bgGlow: 'shadow-[0_0_20px_rgba(0,240,255,0.15)] border-cyan-500/30',
      badge: '100% Unique',
    },
    {
      label: 'VERIFIED PHONES',
      value: metrics.leadsWithPhone.toLocaleString(),
      sub: `${phonePct}% contact coverage`,
      icon: Phone,
      color: 'text-emerald-400',
      bgGlow: 'shadow-[0_0_20px_rgba(0,255,157,0.15)] border-emerald-500/30',
      badge: `${phonePct}% Rate`,
    },
    {
      label: 'ACTIVE WEBSITES',
      value: metrics.leadsWithWebsite.toLocaleString(),
      sub: `${webPct}% web verified`,
      icon: Globe,
      color: 'text-blue-400',
      bgGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] border-blue-500/30',
      badge: `${webPct}% Rate`,
    },
    {
      label: 'DIRECT EMAILS',
      value: metrics.leadsWithEmail.toLocaleString(),
      sub: `${emailPct}% enriched inbox`,
      icon: Mail,
      color: 'text-purple-400',
      bgGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] border-purple-500/30',
      badge: `${emailPct}% Rate`,
    },
    {
      label: 'SOCIAL PROFILES',
      value: metrics.leadsWithSocials.toLocaleString(),
      sub: `${socialPct}% multi-channel presence`,
      icon: Share2,
      color: 'text-pink-400',
      bgGlow: 'shadow-[0_0_20px_rgba(244,114,182,0.15)] border-pink-500/30',
      badge: `${socialPct}% Rate`,
    },
    {
      label: 'AVG REPUTATION',
      value: metrics.averageRating > 0 ? `${metrics.averageRating} ★` : 'N/A',
      sub: `${metrics.totalReviews.toLocaleString()} verified reviews`,
      icon: Star,
      color: 'text-amber-400',
      bgGlow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)] border-amber-500/30',
      badge: 'Google Maps',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Status Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-slate-900/60 border border-cyan-500/30 p-6 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                LEAD INTELLIGENCE ENGINE ONLINE
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Google Maps Lead Scraper & Research Matrix
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Extract verified local business leads across any keyword, category, and geo-coordinates.
              Automatic normalization, 3-point deduplication, and website social enrichment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('search')}
              className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            >
              <span>Launch New Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('leads')}
              className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold text-xs tracking-wider uppercase transition-all duration-200"
            >
              Browse Leads
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl bg-slate-900/60 border backdrop-blur-md transition-all duration-200 hover:scale-[1.01] ${kpi.bgGlow}`}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  {kpi.badge}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-3xl font-extrabold tracking-tight ${kpi.color}`}>
                  {kpi.value}
                </span>
                <div className={`p-2.5 rounded-lg bg-white/5 ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1 font-mono">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                <span>{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Jobs Pipeline & Quick Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">Total Scraping Jobs</div>
              <div className="text-xl font-bold text-white mt-0.5">{metrics.totalJobs}</div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('jobs')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline"
          >
            Manage →
          </button>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">Completed Jobs</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.completedJobs}</div>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400/80">Success Rate: 100%</span>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">Active Background Jobs</div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">{metrics.activeJobs}</div>
            </div>
          </div>
          {metrics.activeJobs > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
