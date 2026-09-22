import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  AlertTriangle,
  Zap,
  Save,
  RotateCcw,
} from 'lucide-react';
import { CognitiveEngineConfig, JudgeMode } from '../../types';
import { apiClient } from '../../services/apiClient';

interface CognitiveEngineSectionProps {
  initialConfig?: CognitiveEngineConfig;
  onRefresh: () => void;
}

const DEFAULT_COGNITIVE_CONFIG: CognitiveEngineConfig = {
  enabled: true,
  plannerStatus: 'ACTIVE',
  specialistStatus: 'ACTIVE',
  judgeStatus: 'STANDBY',
  judgeMode: 'AUTO',
  maxModelCalls: 4,
};

export const CognitiveEngineSection: React.FC<CognitiveEngineSectionProps> = ({
  initialConfig,
  onRefresh,
}) => {
  const [config, setConfig] = useState<CognitiveEngineConfig>(
    initialConfig || DEFAULT_COGNITIVE_CONFIG
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updated = await apiClient.updateCognitiveEngineConfig(config);
      setConfig(updated);
      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save cognitive engine configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_COGNITIVE_CONFIG });
  };

  return (
    <div id="cognitive-engine-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-wide">
              Cognitive Engine Settings
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 text-[#FFFFFF]">
              Multi-Agent V1
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Lightweight sequential multi-agent reasoning architecture. Orchestrates logical{' '}
            <strong className="text-stone-200">PLANNER</strong>,{' '}
            <strong className="text-stone-200">SPECIALIST</strong>, and{' '}
            <strong className="text-stone-200">JUDGE</strong> roles on-demand without background overhead.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-900 transition-colors text-xs font-mono"
            title="Reset to recommended defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FFFFFF] text-black font-semibold hover:bg-[#FFFFFF]/90 transition-colors text-xs shadow-sm font-mono cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Apply Config'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Cognitive Brain configuration persisted to encrypted storage.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Master Toggle */}
      <div className="p-4 rounded-xl border border-stone-800 bg-[#111111] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Multi-Agent Brain Core</span>
            <span
              className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold rounded ${
                config.enabled
                  ? 'bg-emerald-950/70 border border-emerald-600/70 text-emerald-400'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {config.enabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
          <p className="text-xs text-stone-400">
            When active, requests are analyzed by the Planner, executed by the designated Specialist, and verified by the Judge when required.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FFFFFF]"></div>
        </label>
      </div>

      {/* Logical Agents Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Planner Card */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#111111] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#FFFFFF]">
              <Brain className="w-4 h-4" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase">PLANNER</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 font-bold">
              {config.plannerStatus}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Analyzes user intent, determines target task category, selects tools, and decides if verification is warranted.
          </p>
          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-500">
            <span>ROLE: Deterministic / LLM</span>
            <span>BURDEN: Zero idle RAM</span>
          </div>
        </div>

        {/* Specialist Card */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#111111] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase">SPECIALIST</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 font-bold">
              {config.specialistStatus}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Generates candidate response using domain-matched frontier models (DeepSeek R1, Qwen Coder, Llama 3.3).
          </p>
          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-500">
            <span>ROUTES: 4 Specialized Roles</span>
            <span>FAILOVER: Automatic</span>
          </div>
        </div>

        {/* Judge Card */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#111111] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase">JUDGE</span>
            </div>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold ${
                config.judgeMode === 'OFF'
                  ? 'bg-stone-800 text-stone-400'
                  : 'bg-amber-950/60 border border-amber-700/60 text-amber-400'
              }`}
            >
              {config.judgeMode === 'OFF' ? 'STANDBY (OFF)' : config.judgeStatus}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Evaluates correctness, code syntax, and reasoning integrity. Initiates a single revision cycle if flaws are discovered.
          </p>
          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-500">
            <span>MAX REVISION: 1 Cycle</span>
            <span>MODEL: Gemini 2.0 Flash</span>
          </div>
        </div>
      </div>

      {/* Judge Mode Configuration */}
      <div className="p-4 rounded-xl border border-stone-800 bg-[#111111] space-y-4">
        <div>
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FFFFFF]" />
            <span>Judge Verification Mode</span>
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Control when the automated Judge model is invoked to verify answers and perform corrections.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* AUTO */}
          <button
            type="button"
            onClick={() => setConfig({ ...config, judgeMode: 'AUTO' })}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              config.judgeMode === 'AUTO'
                ? 'bg-[#FFFFFF]/10 border-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-stone-900/50 border-stone-800 hover:border-stone-700 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-mono font-bold ${config.judgeMode === 'AUTO' ? 'text-[#FFFFFF]' : 'text-stone-300'}`}>
                AUTO (RECOMMENDED)
              </span>
              {config.judgeMode === 'AUTO' && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFFFFF]" />}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Judge activates strictly for coding, mathematical proofs, complex logic, and verification requests. Bypasses greetings and simple Q&A.
            </p>
          </button>

          {/* ALWAYS */}
          <button
            type="button"
            onClick={() => setConfig({ ...config, judgeMode: 'ALWAYS' })}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              config.judgeMode === 'ALWAYS'
                ? 'bg-[#FFFFFF]/10 border-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-stone-900/50 border-stone-800 hover:border-stone-700 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-mono font-bold ${config.judgeMode === 'ALWAYS' ? 'text-[#FFFFFF]' : 'text-stone-300'}`}>
                ALWAYS
              </span>
              {config.judgeMode === 'ALWAYS' && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFFFFF]" />}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Judge verifies every candidate response (except 1-word greetings). Maximizes correctness checks at the cost of additional latency.
            </p>
          </button>

          {/* OFF */}
          <button
            type="button"
            onClick={() => setConfig({ ...config, judgeMode: 'OFF' })}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              config.judgeMode === 'OFF'
                ? 'bg-[#FFFFFF]/10 border-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-stone-900/50 border-stone-800 hover:border-stone-700 text-stone-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-mono font-bold ${config.judgeMode === 'OFF' ? 'text-[#FFFFFF]' : 'text-stone-300'}`}>
                OFF (FASTEST)
              </span>
              {config.judgeMode === 'OFF' && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFFFFF]" />}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Judge is bypassed entirely. The Specialist model delivers candidate answers directly. Minimal latency and lowest token usage.
            </p>
          </button>
        </div>
      </div>

      {/* Architecture Visualizer & Resource Guardrails */}
      <div className="p-4 rounded-xl border border-stone-800 bg-[#111111] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-mono font-bold text-stone-200 uppercase tracking-wider">
              Sequential Cognitive Pipeline Flow
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#FFFFFF] bg-[#FFFFFF]/10 px-2 py-0.5 rounded border border-[#FFFFFF]/30">
            HARD CAP: MAX {config.maxModelCalls} MODEL CALLS
          </span>
        </div>

        {/* Pipeline Diagram */}
        <div className="flex flex-wrap items-center gap-2 py-2 px-3 rounded-lg bg-black/50 border border-stone-800 text-[11px] font-mono">
          <span className="text-stone-400">User Command</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
          <span className="text-[#FFFFFF] font-bold">[ PLANNER ]</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
          <span className="text-cyan-400 font-bold">[ SPECIALIST ]</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
          <span className="text-amber-400 font-bold">[ JUDGE ]</span>
          <span className="text-[9px] text-stone-500">(AUTO/ALWAYS)</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-600" />
          <span className="text-emerald-400 font-bold">[ FINAL RESPONSE ]</span>
        </div>

        <p className="text-[11px] text-stone-400 leading-relaxed">
          Internal planning JSON and private reasoning tokens are strictly filtered. The client HUD receives only clean, high-level telemetry traces for instant operator oversight.
        </p>
      </div>
    </div>
  );
};
