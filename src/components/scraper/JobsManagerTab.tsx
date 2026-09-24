import React, { useEffect, useState } from 'react';
import {
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  StopCircle,
  ArrowRight,
  MapPin,
  Calendar,
  Zap,
} from 'lucide-react';
import { SearchJob } from '../../../server/services/scraper/types';
import { scraperApi } from '../../services/scraperApi';

interface JobsManagerTabProps {
  onViewJobLeads: (jobId: string) => void;
  activeJobId?: string | null;
}

export const JobsManagerTab: React.FC<JobsManagerTabProps> = ({ onViewJobLeads, activeJobId }) => {
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const fetchJobs = async () => {
    try {
      const data = await scraperApi.getJobs();
      setJobs(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Auto-polling when any job is active
  useEffect(() => {
    const hasActiveJob = jobs.some((j) => j.status === 'RUNNING' || j.status === 'PENDING');
    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 1500);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleCancel = async (jobId: string) => {
    try {
      setCancellingIds((prev) => new Set(prev).add(jobId));
      await scraperApi.cancelJob(jobId);
      await fetchJobs();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: SearchJob['status']) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>RUNNING</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>COMPLETED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <StopCircle className="w-3.5 h-3.5" />
            <span>CANCELLED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-500/10 text-slate-400 border border-white/10">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const getStrategyBadge = (strat: SearchJob['strategy']) => {
    switch (strat) {
      case 'FAST':
        return <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">FAST</span>;
      case 'DETAILED':
        return <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">DETAILED</span>;
      case 'GEOGRAPHIC':
        return <span className="font-mono text-[10px] text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">GEOGRAPHIC</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Scraping Jobs Queue</span>
          </h3>
          <p className="text-sm text-slate-400">
            Monitor real-time search progress, execution status, and review harvested batches.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          title="Refresh Jobs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-2xl bg-slate-900/40 border border-white/10">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-white">No Scraping Jobs Initiated</h4>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Configure your first search in the 'New Search' tab to launch the Google Maps scraper.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isHighlighted = job.id === activeJobId;
            const isRunning = job.status === 'RUNNING';
            const isCancelling = cancellingIds.has(job.id);

            return (
              <div
                key={job.id}
                className={`p-5 rounded-2xl border transition-all duration-200 backdrop-blur-xl ${
                  isHighlighted
                    ? 'bg-cyan-950/20 border-cyan-400/50 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                    : isRunning
                    ? 'bg-slate-900/80 border-cyan-500/30'
                    : 'bg-slate-900/50 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-white text-base tracking-wide">
                      {job.keyword}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{job.location}, {job.country}</span>
                    </span>
                    {getStrategyBadge(job.strategy)}
                    {job.enrichWebsites && (
                      <span className="font-mono text-[10px] text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                        +ENRICHED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Details */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>Harvest Progress:</span>
                      <span className="text-cyan-400 font-bold">
                        {job.collectedResults} / {job.requestedResults} leads collected
                      </span>
                    </div>
                    <span className="text-slate-400">{job.progressPercent}%</span>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden border border-white/10 p-[1px]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        job.status === 'COMPLETED'
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          : job.status === 'FAILED'
                          ? 'bg-red-500'
                          : job.status === 'CANCELLED'
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, job.progressPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Error Banner if any */}
                {job.errorMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-300 font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{job.errorMessage}</span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="mt-4 flex items-center justify-between pt-2">
                  <div className="text-[11px] font-mono text-slate-500">
                    Job ID: <span className="text-slate-400">{job.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(job.status === 'RUNNING' || job.status === 'PENDING') && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={isCancelling}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono transition-colors flex items-center gap-1.5"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>{isCancelling ? 'Cancelling...' : 'Cancel Job'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onViewJobLeads(job.id)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-colors flex items-center gap-1.5"
                    >
                      <span>View Leads ({job.collectedResults})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
