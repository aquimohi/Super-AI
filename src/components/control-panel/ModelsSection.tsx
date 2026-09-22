import React, { useState } from 'react';
import { ModelRoleConfig } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Cpu, Check, RotateCcw, Sparkles, ArrowDown, GitFork, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ModelsSectionProps {
  initialModels: ModelRoleConfig;
  onRefresh: () => Promise<void>;
}

const PRESET_OPTIONS = {
  general: [
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
  ],
  reasoning: [
    'deepseek/deepseek-r1',
    'openai/o3-mini',
    'google/gemini-2.0-flash-thinking-exp:free',
    'qwen/qwq-32b-preview',
  ],
  coding: [
    'qwen/qwen-2.5-coder-32b-instruct',
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.3-70b-instruct',
  ],
  vision: [
    'meta-llama/llama-3.2-11b-vision-instruct',
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
  ],
  judge: [
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o-mini',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.3-70b-instruct',
  ],
};

export const ModelsSection: React.FC<ModelsSectionProps> = ({ initialModels, onRefresh }) => {
  const [models, setModels] = useState<ModelRoleConfig>(initialModels);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);
    try {
      await apiClient.updateConfigSection('models', models);
      await onRefresh();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save model configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (role: keyof ModelRoleConfig, val: string) => {
    setModels((prev) => ({ ...prev, [role]: val }));
  };

  // Dynamic Status Badge Helpers
  const getStatusBadge = (role: keyof ModelRoleConfig) => {
    const val = (models[role] || '').trim();
    if (role === 'judge') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-800 text-stone-400 border border-stone-700">
            DISABLED IN FLOW
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800">
            STANDBY
          </span>
        </div>
      );
    }

    if (!val) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-950/40 text-amber-400 border border-amber-800 flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          FALLBACK → GENERAL
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/50 text-emerald-400 border border-emerald-800 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE
        </span>
        {role === 'general' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#FFFFFF]/10 text-[#FFFFFF] border border-[#FFFFFF]/30">
            FALLBACK TARGET
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded border border-[#FFFFFF]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#FFFFFF]" />
          <h3 className="text-sm font-mono tracking-widest text-[#FFFFFF] uppercase">
            Super AI Model Orchestration Matrix
          </h3>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          The Super AI Orchestrator classifies incoming requests and routes them to specialized AI models. If a specialized model encounters an error, the system automatically falls back to your configured General model.
        </p>
      </div>

      {/* Routing Visualization */}
      <div className="p-4 rounded border border-[#FFFFFF]/25 bg-black/60 font-mono">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#FFFFFF]/20 text-[11px] uppercase tracking-wider text-[#FFFFFF]">
          <GitFork className="w-4 h-4 text-[#FFFFFF]" />
          <span>Active Cognitive Routing Pipeline</span>
        </div>

        <div className="flex flex-col items-center gap-1 text-[11px] text-stone-300 py-1">
          {/* Step 1: User Request */}
          <div className="px-3 py-1 rounded bg-stone-900 border border-stone-800 text-stone-200 text-center w-full max-w-xs shadow-sm">
            USER REQUEST
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-[#FFFFFF]" />

          {/* Step 2: Task Classifier */}
          <div className="px-3 py-1 rounded bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 text-[#FFFFFF] text-center w-full max-w-xs font-semibold">
            TASK CLASSIFIER (Deterministic Rules)
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-[#FFFFFF]" />

          {/* Step 3: Model Router */}
          <div className="px-3 py-1 rounded bg-cyan-950/30 border border-cyan-800/60 text-cyan-300 text-center w-full max-w-xs font-semibold">
            MODEL ROUTER
          </div>
          <ArrowDown className="w-3.5 h-3.5 text-[#FFFFFF]" />

          {/* Step 4: Specialized Model Nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full text-[10px] my-1">
            <div className="p-1.5 rounded bg-stone-950 border border-emerald-800/60 text-center">
              <div className="text-emerald-400 font-bold">GENERAL</div>
              <div className="text-stone-400 text-[9px] truncate" title={models.general}>
                {models.general || 'Fallback'}
              </div>
            </div>
            <div className="p-1.5 rounded bg-stone-950 border border-indigo-800/60 text-center">
              <div className="text-indigo-400 font-bold">REASONING</div>
              <div className="text-stone-400 text-[9px] truncate" title={models.reasoning}>
                {models.reasoning || 'General'}
              </div>
            </div>
            <div className="p-1.5 rounded bg-stone-950 border border-amber-800/60 text-center">
              <div className="text-amber-400 font-bold">CODING</div>
              <div className="text-stone-400 text-[9px] truncate" title={models.coding}>
                {models.coding || 'General'}
              </div>
            </div>
            <div className="p-1.5 rounded bg-stone-950 border border-purple-800/60 text-center">
              <div className="text-purple-400 font-bold">VISION</div>
              <div className="text-stone-400 text-[9px] truncate" title={models.vision}>
                {models.vision || 'General'}
              </div>
            </div>
          </div>

          <ArrowDown className="w-3.5 h-3.5 text-[#FFFFFF]" />

          {/* Step 5: OpenRouter Execution */}
          <div className="px-3 py-1 rounded bg-[#FFFFFF]/15 border border-[#FFFFFF]/50 text-[#FFFFFF] text-center w-full max-w-xs font-bold tracking-wide">
            OPENROUTER GATEWAY (Auto Key Rotation + Fallback)
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* GENERAL MODEL */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                GENERAL MODEL
              </label>
              {getStatusBadge('general')}
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              Primary dialogue, daily queries & assistant responses
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={models.general}
              onChange={(e) => handleChange('general', e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
              placeholder="e.g. deepseek/deepseek-chat"
            />
            <select
              onChange={(e) => e.target.value && handleChange('general', e.target.value)}
              value=""
              className="px-3 py-2 text-xs font-mono rounded bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
            >
              <option value="">Presets...</option>
              {PRESET_OPTIONS.general.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* REASONING MODEL */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                REASONING MODEL
              </label>
              {getStatusBadge('reasoning')}
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              Multi-step logic, math, planning, recursion & algorithm complexity
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={models.reasoning}
              onChange={(e) => handleChange('reasoning', e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
              placeholder="e.g. deepseek/deepseek-r1"
            />
            <select
              onChange={(e) => e.target.value && handleChange('reasoning', e.target.value)}
              value=""
              className="px-3 py-2 text-xs font-mono rounded bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
            >
              <option value="">Presets...</option>
              {PRESET_OPTIONS.reasoning.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CODING MODEL */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                CODING MODEL
              </label>
              {getStatusBadge('coding')}
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              Programming, debugging, terminal scripts, functions & refactoring
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={models.coding}
              onChange={(e) => handleChange('coding', e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
              placeholder="e.g. qwen/qwen-2.5-coder-32b-instruct"
            />
            <select
              onChange={(e) => e.target.value && handleChange('coding', e.target.value)}
              value=""
              className="px-3 py-2 text-xs font-mono rounded bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
            >
              <option value="">Presets...</option>
              {PRESET_OPTIONS.coding.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* VISION MODEL */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                VISION MODEL
              </label>
              {getStatusBadge('vision')}
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              Image comprehension, screen analysis, diagrams & visual feeds
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={models.vision}
              onChange={(e) => handleChange('vision', e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
              placeholder="e.g. meta-llama/llama-3.2-11b-vision-instruct"
            />
            <select
              onChange={(e) => e.target.value && handleChange('vision', e.target.value)}
              value=""
              className="px-3 py-2 text-xs font-mono rounded bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
            >
              <option value="">Presets...</option>
              {PRESET_OPTIONS.vision.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* JUDGE MODEL */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                JUDGE MODEL
              </label>
              {getStatusBadge('judge')}
            </div>
            <span className="text-[10px] font-mono text-stone-500">
              Output verification, safety checks & response rating architecture
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={models.judge}
              onChange={(e) => handleChange('judge', e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
              placeholder="e.g. google/gemini-2.0-flash-001"
            />
            <select
              onChange={(e) => e.target.value && handleChange('judge', e.target.value)}
              value=""
              className="px-3 py-2 text-xs font-mono rounded bg-stone-900 border border-stone-800 text-stone-300 focus:outline-none"
            >
              <option value="">Presets...</option>
              {PRESET_OPTIONS.judge.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
            <span>Model assignments successfully saved to backend configuration!</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-mono font-semibold text-black bg-[#FFFFFF] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{saving ? 'SAVING CONFIG...' : 'APPLY MODEL CONFIGURATION'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
