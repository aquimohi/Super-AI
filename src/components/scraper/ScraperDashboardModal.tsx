import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Search,
  Layers,
  Table,
  Download,
  BarChart3,
  MapPin,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MetricsOverviewTab } from './MetricsOverviewTab';
import { ScraperSearchTab } from './ScraperSearchTab';
import { JobsManagerTab } from './JobsManagerTab';
import { LeadsTableTab } from './LeadsTableTab';
import { ExportTab } from './ExportTab';
import { scraperApi } from '../../services/scraperApi';
import { ScraperDashboardMetrics } from '../../../server/services/scraper/types';

interface ScraperDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'overview' | 'search' | 'jobs' | 'leads' | 'export';
  selectedJobId?: string | null;
}

export const ScraperDashboardModal: React.FC<ScraperDashboardModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  selectedJobId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'jobs' | 'leads' | 'export'>(initialTab || 'overview');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<ScraperDashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [filterJobId, setFilterJobId] = useState<string | null>(selectedJobId || null);
  const [newlyCreatedJobId, setNewlyCreatedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (selectedJobId) {
        setFilterJobId(selectedJobId);
      }
    }
  }, [isOpen, initialTab, selectedJobId]);

  const fetchMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await scraperApi.getMetrics();
      setMetrics(data);
      setIsLoadingMetrics(false);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  // Periodic metrics refresh if active jobs
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      scraperApi.getMetrics().then((m) => setMetrics(m)).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleJobCreated = (jobId: string) => {
    setNewlyCreatedJobId(jobId);
    setActiveTab('jobs');
    fetchMetrics();
  };

  const handleViewJobLeads = (jobId: string) => {
    setFilterJobId(jobId);
    setActiveTab('leads');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`relative flex flex-col rounded-2xl bg-[#07090e] border border-cyan-500/40 shadow-[0_0_60px_rgba(0,240,255,0.25)] transition-all duration-300 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-7xl h-[92vh] max-h-[920px]'
        }`}
      >
        {/* Top Window Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-slate-950/80 select-none">
          {/* Brand & Status */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base tracking-wide font-mono">
                  GOOGLE MAPS LEAD SCRAPER
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  v2.0 PRO
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Independent Intelligence & Business Harvester Engine
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>New Search</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all relative ${
                activeTab === 'jobs'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Jobs Queue</span>
              {metrics && metrics.activeJobs > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'leads'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Leads Table</span>
              {metrics && (
                <span className="text-[10px] text-slate-500">({metrics.totalLeads})</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'export'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isFullscreen ? 'Restore window size' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Close window (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#07090e] to-[#040609]">
          {activeTab === 'overview' && (
            <MetricsOverviewTab
              metrics={metrics}
              isLoading={isLoadingMetrics}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'search' && (
            <ScraperSearchTab onJobCreated={handleJobCreated} />
          )}

          {activeTab === 'jobs' && (
            <JobsManagerTab
              onViewJobLeads={handleViewJobLeads}
              activeJobId={newlyCreatedJobId}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsTableTab
              initialJobId={filterJobId}
              onClearJobFilter={() => setFilterJobId(null)}
            />
          )}

          {activeTab === 'export' && <ExportTab />}
        </div>
      </div>
    </div>
  );
};
