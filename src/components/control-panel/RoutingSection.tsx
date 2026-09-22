import React, { useState } from 'react';
import { AIRoutingConfig } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Sliders, Check, RotateCw, Shuffle } from 'lucide-react';

interface RoutingSectionProps {
  initialRouting: AIRoutingConfig;
  onRefresh: () => Promise<void>;
}

export const RoutingSection: React.FC<RoutingSectionProps> = ({ initialRouting, onRefresh }) => {
  const [routing, setRouting] = useState<AIRoutingConfig>(initialRouting);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateConfigSection('routing', routing);
      await onRefresh();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save routing configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded border border-[#FFFFFF]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Shuffle className="w-5 h-5 text-[#FFFFFF]" />
          <h3 className="text-sm font-mono tracking-widest text-[#FFFFFF] uppercase">
            AI Routing & Failover Orchestrator
          </h3>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Configure how requests route across providers, how rate limits (HTTP 429) trigger automatic key rotation, and baseline inference parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Default Provider */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white font-semibold uppercase">Default Provider</div>
            <div className="text-[11px] font-mono text-stone-400">Primary gateway for incoming user commands</div>
          </div>
          <select
            value={routing.defaultProvider}
            onChange={(e) => setRouting({ ...routing, defaultProvider: e.target.value as any })}
            className="px-3 py-1.5 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-[#FFFFFF]"
          >
            <option value="openrouter">OpenRouter (Active)</option>
            <option value="openai">OpenAI (Direct)</option>
            <option value="anthropic">Anthropic (Direct)</option>
            <option value="groq">Groq (Direct)</option>
          </select>
        </div>

        {/* Multi-Key Fallback & Failover Toggle */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white font-semibold uppercase">Auto-Key Rotation on 429</div>
            <div className="text-[11px] font-mono text-stone-400">
              When a provider key encounters rate limits, automatically try other enabled keys in the pool
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRouting({ ...routing, autoRetryOnRateLimit: !routing.autoRetryOnRateLimit })}
            className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
              routing.autoRetryOnRateLimit
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
          >
            {routing.autoRetryOnRateLimit ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Enable Fallback Pool */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white font-semibold uppercase">Multi-Key Fallback Pool</div>
            <div className="text-[11px] font-mono text-stone-400">
              Maintain secondary backup keys in hot standby mode
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRouting({ ...routing, enableFallback: !routing.enableFallback })}
            className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
              routing.enableFallback
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
          >
            {routing.enableFallback ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Temperature */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white font-semibold uppercase">Sampling Temperature</span>
            <span className="text-xs font-mono text-[#FFFFFF]">{routing.temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={routing.temperature}
            onChange={(e) => setRouting({ ...routing, temperature: parseFloat(e.target.value) })}
            className="w-full accent-[#FFFFFF] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-stone-500">
            <span>0.0 (Strict & Deterministic)</span>
            <span>0.7 (Balanced)</span>
            <span>1.5 (Creative & Diverse)</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white font-semibold uppercase">Max Response Tokens</span>
            <span className="text-xs font-mono text-[#FFFFFF]">{routing.maxTokens}</span>
          </div>
          <input
            type="range"
            min="512"
            max="8192"
            step="256"
            value={routing.maxTokens}
            onChange={(e) => setRouting({ ...routing, maxTokens: parseInt(e.target.value, 10) })}
            className="w-full accent-[#FFFFFF] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-stone-500">
            <span>512</span>
            <span>2048</span>
            <span>8192</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded text-xs font-mono bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Routing parameters successfully updated!</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-mono font-semibold text-black bg-[#FFFFFF] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE ROUTING POLICIES'}
          </button>
        </div>
      </form>
    </div>
  );
};
