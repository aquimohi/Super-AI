import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Globe,
  Sliders,
  Sparkles,
  Zap,
  Compass,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { CreateJobInput, SearchStrategy } from '../../../server/services/scraper/types';
import { scraperApi } from '../../services/scraperApi';

interface ScraperSearchTabProps {
  onJobCreated: (jobId: string) => void;
}

export const ScraperSearchTab: React.FC<ScraperSearchTabProps> = ({ onJobCreated }) => {
  const [keyword, setKeyword] = useState('Dentist');
  const [category, setCategory] = useState('Dental Clinic');
  const [location, setLocation] = useState('Delhi');
  const [country, setCountry] = useState('India');
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [strategy, setStrategy] = useState<SearchStrategy>('FAST');
  const [requestedResults, setRequestedResults] = useState<number>(25);
  const [enrichWebsites, setEnrichWebsites] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const PRESETS = [
    { kw: 'Dentist', cat: 'Dental Clinic', loc: 'Delhi', ctry: 'India', strat: 'FAST' as SearchStrategy },
    { kw: 'AI Software', cat: 'Tech Agency', loc: 'Bangalore', ctry: 'India', strat: 'DETAILED' as SearchStrategy },
    { kw: 'Real Estate Agency', cat: 'Property Consultants', loc: 'Mumbai', ctry: 'India', strat: 'GEOGRAPHIC' as SearchStrategy },
    { kw: 'Italian Restaurant', cat: 'Restaurant', loc: 'New York', ctry: 'United States', strat: 'FAST' as SearchStrategy },
    { kw: 'Commercial Law Firm', cat: 'Legal Services', loc: 'London', ctry: 'United Kingdom', strat: 'DETAILED' as SearchStrategy },
  ];

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setKeyword(preset.kw);
    setCategory(preset.cat);
    setLocation(preset.loc);
    setCountry(preset.ctry);
    setStrategy(preset.strat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!keyword.trim()) {
      setErrorMsg('Please specify a business search keyword.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please specify a city or target location.');
      return;
    }

    try {
      setIsSubmitting(true);
      const input: CreateJobInput = {
        keyword: keyword.trim(),
        category: category.trim() || keyword.trim(),
        location: location.trim(),
        country: country.trim() || 'India',
        radiusKm,
        strategy,
        requestedResults,
        enrichWebsites,
      };

      const job = await scraperApi.createJob(input);
      setIsSubmitting(false);
      onJobCreated(job.id);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch scraping job');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          <span>Configure Scraping Job</span>
        </h3>
        <p className="text-sm text-slate-400">
          Define your target criteria, geo-boundary, collection depth, and enrichment pipeline.
        </p>
      </div>

      {/* Preset Pills */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Preset Templates:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-colors duration-150 flex items-center gap-1.5"
            >
              <span>{p.kw}</span>
              <span className="text-slate-500">in</span>
              <span className="text-cyan-400">{p.loc}</span>
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Keyword */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Search Keyword *</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Dentist, Plumber, Gym, Law Firm"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono text-sm transition-all"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Business Category</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Dental Clinic, Medical Service, Contractor"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono text-sm transition-all"
            />
          </div>

          {/* Location / City */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>City / Location *</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Delhi, Mumbai, London, New York"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono text-sm transition-all"
            />
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>Country</span>
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India, United States, United Kingdom"
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono text-sm transition-all"
            />
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Search Strategy</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'FAST',
                title: 'FAST DISCOVERY',
                desc: 'High velocity batch extraction. Instant contact details & ratings.',
                icon: Zap,
                borderActive: 'border-cyan-400 bg-cyan-950/30 text-cyan-300',
              },
              {
                id: 'DETAILED',
                title: 'DEEP HARVEST',
                desc: 'Comprehensive attributes including opening hours & full details.',
                icon: Sparkles,
                borderActive: 'border-emerald-400 bg-emerald-950/30 text-emerald-300',
              },
              {
                id: 'GEOGRAPHIC',
                title: 'RADIAL GRID MESH',
                desc: 'Subdivides target city into radial grid zones to maximize depth.',
                icon: Compass,
                borderActive: 'border-purple-400 bg-purple-950/30 text-purple-300',
              },
            ].map((strat) => {
              const Icon = strat.icon;
              const isSelected = strategy === strat.id;
              return (
                <div
                  key={strat.id}
                  onClick={() => setStrategy(strat.id as SearchStrategy)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                    isSelected
                      ? `${strat.borderActive} shadow-[0_0_15px_rgba(0,240,255,0.2)]`
                      : 'border-white/10 bg-black/30 hover:border-white/20 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold tracking-wide flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {strat.title}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80">{strat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sliders: Radius & Max Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 uppercase tracking-wider">Search Radius (Km)</span>
              <span className="text-cyan-400 font-bold">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1 km (Hyperlocal)</span>
              <span>25 km (Metropolitan)</span>
              <span>50 km (Regional)</span>
            </div>
          </div>

          {/* Max Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 uppercase tracking-wider">Max Lead Count</span>
              <span className="text-emerald-400 font-bold">{requestedResults} leads</span>
            </div>
            <div className="flex gap-2">
              {[10, 25, 50, 100, 200].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRequestedResults(num)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    requestedResults === num
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enrichment Toggle */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-white font-bold uppercase">
                Automatic Website & Social Enrichment
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Crawl business websites for hidden emails, direct phones, and social links (Facebook, LinkedIn, Instagram, X).
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enrichWebsites}
              onChange={(e) => setEnrichWebsites(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold text-sm tracking-wider uppercase transition-all duration-200 shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Initializing Worker...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black" />
                <span>Start Scraping Job</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
