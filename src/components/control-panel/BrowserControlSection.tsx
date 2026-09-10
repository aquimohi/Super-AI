import React, { useState, useEffect } from 'react';
import { BrowserControlSettings, PermissionLevel } from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Search,
  Link,
  MousePointer,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Power,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';

interface BrowserControlSectionProps {
  onRefresh?: () => Promise<void>;
}

const BROWSER_PERMISSION_ROWS: Array<{
  key: keyof BrowserControlSettings['permissions'];
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'browserOpenPage',
    label: 'Open Safe Web Page',
    desc: 'Navigate to validated HTTP/HTTPS URLs in the dedicated Super AI browser. Dangerous schemes (javascript:, file:, data:) are rejected.',
    icon: <Globe className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserReadPage',
    label: 'Read Page Content',
    desc: 'Extract and clean text from the active page with scripts, styles, forms, and tracking tags automatically stripped.',
    icon: <FileText className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserFindText',
    label: 'Find Text on Page',
    desc: 'Search for specific keywords and sentences within sanitized page text without modifying or manipulating the DOM.',
    icon: <Search className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserFindLinks',
    label: 'Extract Links',
    desc: 'Read anchor elements and extract relevant documentation or navigation links matching user query.',
    icon: <Link className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserClickLink',
    label: 'Click Safe Link',
    desc: 'Navigate to target links found on the current page after validating destination URL security.',
    icon: <MousePointer className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserGoBack',
    label: 'Navigate Back',
    desc: 'Go back to the previous page in the current conversation browser history stack.',
    icon: <ArrowLeft className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserGoForward',
    label: 'Navigate Forward',
    desc: 'Go forward in the session browser navigation history stack.',
    icon: <ArrowRight className="w-4 h-4 text-[#F2A900]" />,
  },
  {
    key: 'browserRefreshPage',
    label: 'Refresh Page',
    desc: 'Reload the current page while maintaining security sanitization and session state.',
    icon: <RotateCw className="w-4 h-4 text-[#F2A900]" />,
  },
];

const SECURITY_GUARDRAILS = [
  {
    title: 'Zero Arbitrary JavaScript',
    desc: 'AI cannot execute arbitrary eval(), script tags, or console snippets in browser sessions.',
    status: 'PERMANENTLY BLOCKED',
  },
  {
    title: 'Dedicated Browser Profile Isolation',
    desc: 'AI runs in an isolated Super AI sandbox. Personal Chrome/Edge profiles and cookies are never accessed.',
    status: 'ENFORCED',
  },
  {
    title: 'Credential & Secret Shield',
    desc: 'Password fields, session tokens, autofill credentials, and secret cookies are blocked from extraction.',
    status: 'PERMANENTLY BLOCKED',
  },
  {
    title: 'Executable Download Guardrail',
    desc: 'Automatic downloads of .exe, .msi, .bat, .ps1, or binary packages are strictly forbidden.',
    status: 'PERMANENTLY BLOCKED',
  },
  {
    title: 'Login & Payment Prohibition',
    desc: 'AI cannot automate login submission forms, enter passwords, or perform checkout/payment flows.',
    status: 'PERMANENTLY BLOCKED',
  },
  {
    title: 'Prohibited Protocol Guard',
    desc: 'Rejects javascript:, file:, data:, vbscript:, chrome:, edge:, about: protocols instantly.',
    status: 'ACTIVE FILTER',
  },
];

export const BrowserControlSection: React.FC<BrowserControlSectionProps> = ({ onRefresh }) => {
  const [settings, setSettings] = useState<BrowserControlSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBrowserControl();
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
      const updated = await apiClient.updateBrowserControl({ enabled: !settings.enabled });
      setSettings(updated);
      setStatusMessage(`Browser Control master switch turned ${!settings.enabled ? 'ON' : 'OFF'}.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update master switch: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = async (
    key: keyof BrowserControlSettings['permissions'],
    level: PermissionLevel
  ) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateBrowserControlPermission(key, level);
      setSettings(updated);
      setStatusMessage(`Permission for ${key} set to ${level}.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage(`Failed to update permission: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A0AEC0]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F2A900] mb-3" />
        <p className="text-sm font-mono tracking-wider">INITIALIZING CONTROLLED BROWSER SUBSYSTEM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Master Switch */}
      <div className="p-4 rounded-lg bg-black/40 border border-[#F2A900]/30 relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-lg border ${
                settings?.enabled
                  ? 'bg-[#F2A900]/10 border-[#F2A900]/40 text-[#F2A900]'
                  : 'bg-zinc-800/40 border-zinc-700 text-zinc-500'
              }`}
            >
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Controlled Browser Automation
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F2A900]/20 text-[#F2A900] border border-[#F2A900]/40">
                  SAFE V1
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  ISOLATED PROFILE
                </span>
              </div>
              <p className="text-xs text-[#A0AEC0] mt-1 max-w-xl leading-relaxed">
                Super AI can safely browse, read sanitized documentation, and search text using an
                isolated sandbox profile. Zero arbitrary scripts, zero hidden control, and zero credential harvesting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMasterToggle}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wider transition-all border ${
                settings?.enabled
                  ? 'bg-[#F2A900] text-black border-[#F2A900] hover:bg-[#F2A900]/90 shadow-[0_0_15px_rgba(242,169,0,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {settings?.enabled ? 'SUBSYSTEM ACTIVE' : 'SUBSYSTEM DISABLED'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 text-xs font-mono text-[#F2A900] bg-[#F2A900]/10 px-3 py-1.5 rounded border border-[#F2A900]/20 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs opacity-70 hover:opacity-100">
              ×
            </button>
          </div>
        )}
      </div>

      {/* Security Architecture Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-zinc-950/60 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
              Permitted V1 Capabilities
            </h4>
          </div>
          <ul className="text-xs text-[#A0AEC0] space-y-1.5 list-disc list-inside">
            <li>HTTP & HTTPS web navigation with strict URL validation</li>
            <li>Sanitized text extraction with scripts/styles/forms stripped</li>
            <li>Page text search and keyword occurrence matching</li>
            <li>Hyperlink discovery and safe link navigation</li>
            <li>Session navigation history (Back / Forward / Refresh)</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg bg-zinc-950/60 border border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-400 mb-2">
            <ShieldAlert className="w-4 h-4" />
            <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
              Zero-Risk Security Guardrails
            </h4>
          </div>
          <ul className="text-xs text-[#A0AEC0] space-y-1.5 list-disc list-inside">
            <li>No arbitrary JavaScript or DOM script execution</li>
            <li>No access to user Chrome/Edge private browser profiles</li>
            <li>No password entry, credential autofill, or form automation</li>
            <li>No automatic executable downloads (.exe, .msi, .bat)</li>
            <li>Permanent rejection of dangerous schemes (javascript:, file:)</li>
          </ul>
        </div>
      </div>

      {/* Action Permission Matrix */}
      <div className="rounded-lg bg-black/40 border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/30">
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Browser Action Permission Matrix
            </h4>
            <p className="text-xs text-[#A0AEC0] mt-0.5">
              Configure access levels for each browser action (ALLOW / ASK / DENY). Defaults to ASK for safety.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#F2A900] bg-[#F2A900]/10 px-2 py-0.5 rounded border border-[#F2A900]/20">
            8 ACTIONS
          </span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {BROWSER_PERMISSION_ROWS.map((row) => {
            const currentLevel = settings?.permissions[row.key] || 'ASK';
            return (
              <div
                key={row.key}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800 mt-0.5">
                    {row.icon}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-100">{row.label}</h5>
                    <p className="text-[11px] text-[#A0AEC0] mt-0.5 max-w-md leading-normal">
                      {row.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {(['ALLOW', 'ASK', 'DENY'] as PermissionLevel[]).map((level) => {
                    const isSelected = currentLevel === level;
                    let style = 'text-zinc-400 bg-zinc-900/80 border-zinc-800 hover:border-zinc-700';

                    if (isSelected) {
                      if (level === 'ALLOW') {
                        style = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold';
                      } else if (level === 'ASK') {
                        style = 'bg-[#F2A900]/20 text-[#F2A900] border-[#F2A900]/60 font-bold shadow-[0_0_8px_rgba(242,169,0,0.2)]';
                      } else {
                        style = 'bg-rose-500/20 text-rose-300 border-rose-500/60 font-bold';
                      }
                    }

                    return (
                      <button
                        key={level}
                        onClick={() => handlePermissionChange(row.key, level)}
                        disabled={saving}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-all ${style}`}
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

      {/* Security Guardrails Matrix (Non-Bypassable) */}
      <div className="rounded-lg bg-black/40 border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#F2A900]" />
            <h4 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
              Permanent Security Enforcements
            </h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            NON-BYPASSABLE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SECURITY_GUARDRAILS.map((g, idx) => (
            <div
              key={idx}
              className="p-3 rounded bg-zinc-950/60 border border-zinc-800/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-200">{g.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                    {g.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#A0AEC0] leading-snug">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
