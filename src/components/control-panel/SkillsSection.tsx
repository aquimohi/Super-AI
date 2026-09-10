import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Code,
  Brain,
  Globe,
  Monitor,
  Database,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Shield,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { SkillConfig, SkillId } from '../../types';
import { apiClient } from '../../services/apiClient';

interface SkillsSectionProps {
  initialSkills?: Record<SkillId, SkillConfig>;
  onRefresh: () => void;
}

const SKILL_ICONS: Record<SkillId, React.ReactNode> = {
  GENERAL: <Sparkles className="w-5 h-5 text-cyan-400" />,
  CODING: <Code className="w-5 h-5 text-emerald-400" />,
  REASONING: <Brain className="w-5 h-5 text-purple-400" />,
  BROWSER: <Globe className="w-5 h-5 text-blue-400" />,
  WINDOWS: <Monitor className="w-5 h-5 text-amber-400" />,
  MEMORY: <Database className="w-5 h-5 text-pink-400" />,
  VISION: <Eye className="w-5 h-5 text-teal-400" />,
};

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  calculator: 'Calculator',
  current_time: 'Current Time',
  current_date: 'Current Date',
  web_search: 'Web Search',
  read_file: 'Read File',
  browser_open_page: 'Open Web Page',
  browser_read_page: 'Read Page Content',
  browser_find_text: 'Find Text in Page',
  browser_find_links: 'Find Links in Page',
  browser_click_link: 'Click Link',
  browser_go_back: 'Browser Back',
  browser_go_forward: 'Browser Forward',
  browser_refresh_page: 'Refresh Page',
  open_application: 'Open Application',
  open_url: 'Open URL',
  open_folder: 'Open Folder',
  open_file: 'Open File',
  get_active_window: 'Active Window Telemetry',
  screenshot: 'Capture Screenshot',
  camera: 'Camera Stream',
};

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  initialSkills,
  onRefresh,
}) => {
  const [skills, setSkills] = useState<Record<SkillId, SkillConfig>>(initialSkills || {} as any);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSkills && Object.keys(initialSkills).length > 0) {
      setSkills(initialSkills);
    } else {
      fetchSkills();
    }
  }, [initialSkills]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getSkills();
      setSkills(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch skills configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = async (id: SkillId) => {
    const current = skills[id];
    if (!current) return;

    const nextState = !current.enabled;
    const updatedSkills = {
      ...skills,
      [id]: {
        ...current,
        enabled: nextState,
      },
    };
    setSkills(updatedSkills);

    try {
      await apiClient.updateSkill(id, { enabled: nextState });
      onRefresh();
    } catch (err: any) {
      // Revert on error
      setSkills(skills);
      setError(err.message || `Failed to update skill ${id}`);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updated = await apiClient.updateAllSkills(skills);
      setSkills(updated);
      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save skills configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = async () => {
    const next: Record<SkillId, SkillConfig> = {} as any;
    for (const [key, val] of Object.entries(skills) as [SkillId, SkillConfig][]) {
      next[key] = { ...val, enabled: true };
    }
    setSkills(next);
    try {
      await apiClient.updateAllSkills(next);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to enable all skills');
    }
  };

  const handleDisableAll = async () => {
    const next: Record<SkillId, SkillConfig> = {} as any;
    for (const [key, val] of Object.entries(skills) as [SkillId, SkillConfig][]) {
      next[key] = { ...val, enabled: false };
    }
    setSkills(next);
    try {
      await apiClient.updateAllSkills(next);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to disable skills');
    }
  };

  const skillsList: SkillConfig[] = Object.values(skills) as SkillConfig[];
  const enabledCount = skillsList.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6 text-white font-mono">
      {/* SECTION HEADER */}
      <div className="p-4 rounded-xl border border-[#F2A900]/30 bg-black/60 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#F2A900]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#F2A900]/10 border border-[#F2A900]/40 flex items-center justify-center text-[#F2A900] shadow-[0_0_15px_rgba(242,169,0,0.2)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wider text-[#F2A900]">
                  SUPER AI SKILLS SYSTEM
                </h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded border border-[#F2A900]/40 text-[#F2A900] bg-[#F2A900]/10">
                  V1 ARCHITECTURE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Modular capability registry, policy isolation, and runtime skill enforcement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnableAll}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              ENABLE ALL
            </button>
            <button
              onClick={handleDisableAll}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              DISABLE ALL
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-[#F2A900] text-black hover:bg-[#F2A900]/90 transition-all shadow-[0_0_15px_rgba(242,169,0,0.3)] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'SAVING...' : 'SAVE CONFIG'}
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-800">
          <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase">Registered Skills</div>
            <div className="text-lg font-bold text-white mt-0.5">{skillsList.length}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase">Active Status</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {enabledCount} / {skillsList.length} ONLINE
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase">Enforcement Layer</div>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">ALLOW / ASK / DENY</div>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase">Security Isolation</div>
            <div className="text-lg font-bold text-[#F2A900] mt-0.5">ZERO-SHELL SECURE</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Skills configuration successfully persisted to storage.</span>
        </div>
      )}

      {/* SKILLS CARDS GRID */}
      <div className="space-y-4">
        {skillsList.map((skill) => {
          const isEnabled = skill.enabled;
          const riskColor =
            skill.riskLevel === 'HIGH'
              ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
              : skill.riskLevel === 'MEDIUM'
              ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
              : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

          return (
            <div
              key={skill.skillId}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isEnabled
                  ? 'border-neutral-700 bg-neutral-900/60 hover:border-[#F2A900]/40'
                  : 'border-neutral-800/80 bg-neutral-950/40 opacity-75'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                      isEnabled
                        ? 'border-[#F2A900]/30 bg-[#F2A900]/10'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-600'
                    }`}
                  >
                    {SKILL_ICONS[skill.skillId] || <Layers className="w-5 h-5 text-neutral-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{skill.name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {skill.skillId}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">{skill.description}</p>
                  </div>
                </div>

                {/* STATUS TOGGLE */}
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
                      isEnabled
                        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                        : 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                    }`}
                  >
                    {isEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>

                  <button
                    onClick={() => toggleSkill(skill.skillId)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${
                      isEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 pt-1 text-xs">
                {/* STATUS & ROLE */}
                <div>
                  <div className="text-[10px] uppercase text-neutral-400 font-semibold mb-1">
                    Model Role
                  </div>
                  <span className="px-2 py-1 rounded text-[11px] font-bold uppercase bg-neutral-800 border border-neutral-700 text-cyan-300">
                    {skill.preferredModelRole}
                  </span>
                </div>

                {/* RISK LEVEL */}
                <div>
                  <div className="text-[10px] uppercase text-neutral-400 font-semibold mb-1">
                    Risk Level
                  </div>
                  <span className={`px-2 py-1 rounded text-[11px] font-bold border ${riskColor}`}>
                    {skill.riskLevel}
                  </span>
                </div>

                {/* REQUIRED PERMISSIONS */}
                <div>
                  <div className="text-[10px] uppercase text-neutral-400 font-semibold mb-1">
                    Policy Enforcement
                  </div>
                  {skill.requiredPermissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {skill.requiredPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800/80 text-amber-300 border border-neutral-700"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-[11px]">No extra elevation needed</span>
                  )}
                </div>

                {/* AVAILABLE TOOLS */}
                <div>
                  <div className="text-[10px] uppercase text-neutral-400 font-semibold mb-1">
                    Registered Tools ({skill.availableTools.length})
                  </div>
                  {skill.availableTools.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                      {skill.availableTools.map((tool) => (
                        <span
                          key={tool}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700"
                          title={tool}
                        >
                          {TOOL_DISPLAY_NAMES[tool] || tool}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-[11px]">Pure algorithmic / semantic</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
