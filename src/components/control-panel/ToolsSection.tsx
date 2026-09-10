import React, { useState, useEffect } from 'react';
import { ToolItem, PermissionLevel, ToolRiskLevel } from '../../types';
import {
  Wrench,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Check,
  RefreshCw,
  Power,
  Sliders,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const ToolsSection: React.FC = () => {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingTool, setUpdatingTool] = useState<string | null>(null);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/tools');
      const json = await res.json();
      if (json.success && Array.isArray(json.tools)) {
        setTools(json.tools);
      }
    } catch (err: any) {
      console.error('Failed to load tools config', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleToggleEnabled = async (tool: ToolItem) => {
    const newEnabled = !tool.enabled;
    setUpdatingTool(tool.id);

    try {
      const res = await fetch(`/api/config/tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: newEnabled,
          permission: tool.permission,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, enabled: newEnabled } : t))
        );
        setNotice(`Tool "${tool.name}" ${newEnabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (err: any) {
      console.error('Failed to update tool enabled state', err);
    } finally {
      setUpdatingTool(null);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handlePermissionChange = async (tool: ToolItem, newLevel: PermissionLevel) => {
    setUpdatingTool(tool.id);

    try {
      const res = await fetch(`/api/config/tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: tool.enabled,
          permission: newLevel,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, permission: newLevel } : t))
        );
        setNotice(`Permission policy for "${tool.name}" set to ${newLevel}.`);
      }
    } catch (err: any) {
      console.error('Failed to update tool permission', err);
    } finally {
      setUpdatingTool(null);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const getRiskBadge = (risk: ToolRiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-red-950/80 border border-red-800 text-red-400 font-bold uppercase flex items-center gap-1">
            <ShieldX className="w-2.5 h-2.5" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-orange-950/80 border border-orange-800 text-orange-400 font-bold uppercase flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-amber-950/80 border border-amber-800 text-amber-400 uppercase flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" /> MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400 uppercase flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> LOW RISK
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-stone-900 border border-stone-800 text-stone-400 uppercase">
            SAFE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded border border-[#F2A900]/20 bg-[#0a0a0a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#F2A900]" />
            <h3 className="text-sm font-mono tracking-widest text-[#F2A900] uppercase font-bold">
              Secure Tool Execution Layer
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Configure function calling tools and their authorization gate policies. The AI model is NEVER trusted to execute tools directly.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchTools}
          className="self-start sm:self-auto px-3 py-1.5 text-xs font-mono rounded border border-stone-800 bg-black/60 text-stone-300 hover:border-[#F2A900]/50 hover:text-[#F2A900] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F2A900]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tools List */}
      <div className="border border-stone-800 rounded bg-[#080808] divide-y divide-stone-900">
        {tools.map((tool) => {
          const isUpdating = updatingTool === tool.id;
          const isTerminal = tool.id === 'execute_terminal';

          return (
            <div
              key={tool.id}
              id={`tool-item-${tool.id}`}
              className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-stone-950/40 transition-colors"
            >
              {/* Tool Information */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-white tracking-wide">
                    {tool.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 font-medium">
                    id: {tool.identifier}
                  </span>
                  {getRiskBadge(tool.risk)}
                  <span className="text-[10px] font-mono text-[#F2A900] flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Permission: {tool.requiredPermission}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-stone-400">{tool.description}</p>
                {isTerminal && (
                  <p className="text-[10px] font-mono text-red-400/80 bg-red-950/30 p-1.5 rounded border border-red-900/30">
                    Security Mandate: Arbitrary terminal and shell command execution is permanently blocked by policy.
                  </p>
                )}
              </div>

              {/* Tool Controls: Permission Level Selector & Enable Toggle */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                {/* 3-State Permission Level Selector (ALLOW / ASK / DENY) */}
                <div className="flex items-center bg-black/60 rounded border border-stone-800 p-0.5">
                  {(['ALLOW', 'ASK', 'DENY'] as PermissionLevel[]).map((lvl) => {
                    const isSelected = tool.permission === lvl;
                    return (
                      <button
                        key={lvl}
                        id={`tool-perm-${tool.id}-${lvl.toLowerCase()}`}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handlePermissionChange(tool, lvl)}
                        className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                          isSelected
                            ? lvl === 'ALLOW'
                              ? 'bg-emerald-950/90 text-emerald-300 font-bold border border-emerald-700/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : lvl === 'ASK'
                              ? 'bg-amber-950/90 text-amber-300 font-bold border border-amber-700/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                              : 'bg-red-950/90 text-red-300 font-bold border border-red-700/80 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                            : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/40'
                        }`}
                        title={
                          lvl === 'ALLOW'
                            ? 'Permit execution immediately'
                            : lvl === 'ASK'
                            ? 'Prompt user for approval in HUD modal before running'
                            : 'Block model from calling this tool'
                        }
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>

                {/* Enable/Disable Master Switch */}
                <button
                  id={`tool-toggle-${tool.id}`}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleToggleEnabled(tool)}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
                    tool.enabled
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 font-bold hover:bg-emerald-900/40'
                      : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{tool.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {notice && (
        <div className="p-3 rounded text-xs font-mono bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
};
