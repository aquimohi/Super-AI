import React, { useState, useEffect } from 'react';
import { ComputerControlSettings, PermissionLevel, AllowlistedApp, AllowlistedFolder } from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Folder,
  Globe,
  Camera,
  FileText,
  Check,
  AlertTriangle,
  Lock,
  ExternalLink,
  Power,
  RefreshCw,
  Terminal,
} from 'lucide-react';

interface ComputerControlSectionProps {
  onRefresh?: () => Promise<void>;
}

const PERMISSION_ROWS: Array<{
  key: keyof ComputerControlSettings['permissions'];
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'openApplication',
    label: 'Open Allowlisted Applications',
    desc: 'Launch approved executables (Chrome, Edge, Notepad, Calculator, Explorer). Arbitrary paths are strictly blocked.',
    icon: <Monitor className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    key: 'openUrl',
    label: 'Open Web URLs',
    desc: 'Launch validated URLs in default browser (HTTP/HTTPS only). Script schemes and dangerous protocols are blocked.',
    icon: <Globe className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    key: 'openFolder',
    label: 'Open Permitted Safe Folders',
    desc: 'Open permitted directories (Downloads, Documents, Desktop, Workspace). System and credential folders are blocked.',
    icon: <Folder className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    key: 'openFile',
    label: 'Open Workspace Files',
    desc: 'Open safe files within designated project workspace. Secrets and credential files (.env, keys) are blocked.',
    icon: <FileText className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    key: 'screenshot',
    label: 'Capture Screenshot',
    desc: 'Capture a snapshot of the current desktop or window only when explicitly prompted by user.',
    icon: <Camera className="w-4 h-4 text-[#FFFFFF]" />,
  },
];

export const ComputerControlSection: React.FC<ComputerControlSectionProps> = ({ onRefresh }) => {
  const [settings, setSettings] = useState<ComputerControlSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getComputerControl();
      setSettings(data);
    } catch (err: any) {
      setStatusMessage(`Error loading configuration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleMasterToggle = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateComputerControl({ enabled: !settings.enabled });
      setSettings(updated);
      setStatusMessage(`Computer Control master switch turned ${!settings.enabled ? 'ON' : 'OFF'}.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update master switch: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStrictToggle = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateComputerControl({ alwaysAskConfirmation: !settings.alwaysAskConfirmation });
      setSettings(updated);
      setStatusMessage(`Strict confirmation mode ${!settings.alwaysAskConfirmation ? 'ENABLED' : 'DISABLED'}.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update confirmation mode: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = async (
    permKey: keyof ComputerControlSettings['permissions'],
    level: PermissionLevel
  ) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateComputerControlPermission(permKey, level);
      setSettings(updated);
      setStatusMessage(`Permission for "${permKey}" set to ${level}.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update permission: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAppToggle = async (appId: string) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updatedApps = settings.allowlistedApps.map((a) =>
        a.id === appId ? { ...a, enabled: !a.enabled } : a
      );
      const updated = await apiClient.updateComputerControl({ allowlistedApps: updatedApps });
      setSettings(updated);
      setStatusMessage(`Updated application allowlist.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update application: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFolderToggle = async (folderId: string) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updatedFolders = settings.allowlistedFolders.map((f) =>
        f.id === folderId ? { ...f, enabled: !f.enabled } : f
      );
      const updated = await apiClient.updateComputerControl({ allowlistedFolders: updatedFolders });
      setSettings(updated);
      setStatusMessage(`Updated safe folder allowlist.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update folder: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="h-64 flex items-center justify-center font-mono text-xs text-stone-500 space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin text-[#FFFFFF]" />
        <span>Loading Computer Control security matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl text-stone-200">
      {/* Header Banner */}
      <div className="border border-[#FFFFFF]/30 bg-[#0d0d0d] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-[#FFFFFF]" />
            <h2 className="text-base font-bold font-mono tracking-wider text-[#FFFFFF] uppercase">
              Windows Computer Control
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FFFFFF]/20 text-[#FFFFFF] border border-[#FFFFFF]/40 rounded">
              SAFE V1
            </span>
          </div>
          <p className="text-xs font-mono text-stone-400 mt-1">
            Controlled Windows desktop action layer. Super AI never receives unrestricted shell, terminal, or script access.
          </p>
        </div>

        {/* Master Switch */}
        <div className="flex items-center space-x-3 bg-black/40 border border-stone-800 p-2.5 rounded-lg">
          <span className="text-xs font-mono text-stone-300">Master Switch:</span>
          <button
            onClick={handleMasterToggle}
            disabled={saving}
            className={`px-3 py-1 text-xs font-mono font-bold rounded flex items-center space-x-1.5 cursor-pointer transition-all ${
              settings.enabled
                ? 'bg-[#FFFFFF] text-black shadow-[0_0_12px_rgba(255,255,255,0.35)]'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{settings.enabled ? 'ONLINE' : 'DISABLED'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 text-[#FFFFFF] text-xs font-mono rounded flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-stone-400 hover:text-white cursor-pointer ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Security Guardrail Card */}
      <div className="border border-stone-800 bg-[#080808] p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-stone-200 uppercase">
              Zero-Shell Security Guardrails
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-stone-400">Strict Confirmation Mode:</span>
            <button
              onClick={handleStrictToggle}
              disabled={saving}
              className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer border ${
                settings.alwaysAskConfirmation
                  ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              {settings.alwaysAskConfirmation ? 'ALWAYS ASK (ON)' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-black/40 border border-stone-800/80">
            <div className="flex items-center space-x-1.5 text-rose-400 mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-bold">Shell & PowerShell</span>
            </div>
            <p className="text-[11px] text-stone-400">
              Permanently BLOCKED. Super AI cannot run CMD, PowerShell scripts, bash, or batch commands.
            </p>
          </div>

          <div className="p-2.5 rounded bg-black/40 border border-stone-800/80">
            <div className="flex items-center space-x-1.5 text-emerald-400 mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span className="font-bold">Executable Allowlist</span>
            </div>
            <p className="text-[11px] text-stone-400">
              Only verified allowlisted executables can be opened. Arbitrary paths like C:\unknown\malware.exe are rejected.
            </p>
          </div>

          <div className="p-2.5 rounded bg-black/40 border border-stone-800/80">
            <div className="flex items-center space-x-1.5 text-[#FFFFFF] mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="font-bold">Path & Credential Guard</span>
            </div>
            <p className="text-[11px] text-stone-400">
              Windows System32, Program Files, .env, and credential directories are strictly protected.
            </p>
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="border border-stone-800 bg-[#080808] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#FFFFFF]" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-stone-200 uppercase">
              Action Permission Policy Matrix
            </h3>
          </div>
          <span className="text-[10px] font-mono text-stone-500">Default: ASK (Prompts Authorization Modal)</span>
        </div>

        <div className="space-y-2">
          {PERMISSION_ROWS.map((row) => {
            const currentLevel = settings.permissions[row.key] || 'ASK';
            return (
              <div
                key={row.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-black/40 border border-stone-800/60 gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 rounded bg-stone-900/80 border border-stone-800 mt-0.5">
                    {row.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono text-stone-200">{row.label}</h4>
                    <p className="text-[11px] font-mono text-stone-400 mt-0.5">{row.desc}</p>
                  </div>
                </div>

                {/* 3-way toggle */}
                <div className="flex items-center self-end sm:self-center bg-stone-950 p-1 rounded border border-stone-800 space-x-1">
                  {(['ALLOW', 'ASK', 'DENY'] as PermissionLevel[]).map((level) => {
                    const isSelected = currentLevel === level;
                    let activeClass = 'bg-stone-800 text-stone-300';
                    if (isSelected) {
                      if (level === 'ALLOW') activeClass = 'bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold';
                      if (level === 'ASK') activeClass = 'bg-amber-950 border border-amber-500 text-amber-300 font-bold';
                      if (level === 'DENY') activeClass = 'bg-rose-950 border border-rose-500 text-rose-300 font-bold';
                    }
                    return (
                      <button
                        key={level}
                        onClick={() => handlePermissionChange(row.key, level)}
                        disabled={saving}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-all ${
                          isSelected ? activeClass : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allowlisted Applications */}
      <div className="border border-stone-800 bg-[#080808] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-stone-200 uppercase">
              Approved Application Registry
            </h3>
          </div>
          <span className="text-[10px] font-mono text-stone-500">Only enabled applications can be opened</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {settings.allowlistedApps.map((app) => (
            <div
              key={app.id}
              className={`p-3 rounded border transition-all flex items-center justify-between ${
                app.enabled
                  ? 'bg-black/50 border-stone-800 hover:border-stone-700'
                  : 'bg-stone-950/60 border-stone-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold font-mono text-stone-200">{app.name}</span>
                  <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                    {app.executable}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-stone-400 mt-1">
                  Aliases: {app.aliases.join(', ')}
                </p>
              </div>

              <button
                onClick={() => handleAppToggle(app.id)}
                disabled={saving}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                  app.enabled
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                    : 'bg-stone-900 border-stone-700 text-stone-500'
                }`}
              >
                {app.enabled ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Allowlisted Safe Folders */}
      <div className="border border-stone-800 bg-[#080808] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-[#FFFFFF]" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-stone-200 uppercase">
              Safe Folder Allowlist
            </h3>
          </div>
          <span className="text-[10px] font-mono text-stone-500">System directories are permanently prohibited</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {settings.allowlistedFolders.map((folder) => (
            <div
              key={folder.id}
              className={`p-3 rounded border transition-all flex items-center justify-between ${
                folder.enabled
                  ? 'bg-black/50 border-stone-800 hover:border-stone-700'
                  : 'bg-stone-950/60 border-stone-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold font-mono text-stone-200">{folder.name}</span>
                  <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                    {folder.path}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-stone-400 mt-1">
                  Aliases: {folder.aliases.join(', ')}
                </p>
              </div>

              <button
                onClick={() => handleFolderToggle(folder.id)}
                disabled={saving}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                  folder.enabled
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                    : 'bg-stone-900 border-stone-700 text-stone-500'
                }`}
              >
                {folder.enabled ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
