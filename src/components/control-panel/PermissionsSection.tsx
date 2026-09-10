import React, { useState } from 'react';
import { SystemPermissions, PermissionLevel } from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Shield,
  Mic,
  Camera,
  FileText,
  FileEdit,
  Trash2,
  Globe,
  Search,
  Terminal,
  PlaySquare,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';

interface PermissionsSectionProps {
  initialPermissions: SystemPermissions;
  onRefresh: () => Promise<void>;
}

const PERMISSION_CONFIG: Array<{
  key: keyof SystemPermissions;
  label: string;
  category: 'hardware' | 'filesystem' | 'network' | 'system';
  icon: React.ReactNode;
  desc: string;
}> = [
  {
    key: 'microphone',
    label: 'Microphone Access',
    category: 'hardware',
    icon: <Mic className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Real-time audio capture and speech recognition matrix',
  },
  {
    key: 'camera',
    label: 'Camera / Optical Feed',
    category: 'hardware',
    icon: <Camera className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Visual frame acquisition and computer vision input',
  },
  {
    key: 'readFiles',
    label: 'Read Local Files',
    category: 'filesystem',
    icon: <FileText className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Inspect documents, workspace files, code, and transcripts',
  },
  {
    key: 'writeFiles',
    label: 'Write / Modify Files',
    category: 'filesystem',
    icon: <FileEdit className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Create and update local files in designated workspace folders',
  },
  {
    key: 'deleteFiles',
    label: 'Delete Files',
    category: 'filesystem',
    icon: <Trash2 className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Permanent deletion of files and directory trees',
  },
  {
    key: 'browser',
    label: 'Automated Browser Control',
    category: 'network',
    icon: <Globe className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Headless / interactive browser navigation and form filling',
  },
  {
    key: 'webSearch',
    label: 'Live Web Search',
    category: 'network',
    icon: <Search className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Query external search engines and retrieve ground truth data',
  },
  {
    key: 'executeTerminal',
    label: 'Execute Terminal Commands',
    category: 'system',
    icon: <Terminal className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Run shell commands, CLI utilities, and background processes',
  },
  {
    key: 'runApplications',
    label: 'Launch Local Applications',
    category: 'system',
    icon: <PlaySquare className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Execute desktop applications on user operating system',
  },
  {
    key: 'systemSettings',
    label: 'System & Hardware Settings',
    category: 'system',
    icon: <Sliders className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Modify OS volume, display brightness, networking, and power states',
  },
  {
    key: 'browserOpenPage',
    label: 'Browser: Open Safe Web Page',
    category: 'network',
    icon: <Globe className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Navigate to validated HTTP/HTTPS URLs in the dedicated Super AI browser sandbox',
  },
  {
    key: 'browserReadPage',
    label: 'Browser: Read Page Content',
    category: 'network',
    icon: <FileText className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Extract clean text from active web page with scripts and styles stripped',
  },
  {
    key: 'browserFindText',
    label: 'Browser: Find Text on Page',
    category: 'network',
    icon: <Search className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Search for keywords and phrases in sanitized web page content',
  },
  {
    key: 'browserFindLinks',
    label: 'Browser: Extract Links',
    category: 'network',
    icon: <Globe className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Extract anchor links matching search queries from the active web page',
  },
  {
    key: 'browserClickLink',
    label: 'Browser: Click Safe Link',
    category: 'network',
    icon: <PlaySquare className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Navigate to target link destination after validating URL safety',
  },
  {
    key: 'browserGoBack',
    label: 'Browser: Navigate Back',
    category: 'network',
    icon: <Sliders className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Return to previous page in session browser navigation history',
  },
  {
    key: 'browserGoForward',
    label: 'Browser: Navigate Forward',
    category: 'network',
    icon: <Sliders className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Advance to forward page in session browser navigation history',
  },
  {
    key: 'browserRefreshPage',
    label: 'Browser: Refresh Page',
    category: 'network',
    icon: <Globe className="w-4 h-4 text-[#F2A900]" />,
    desc: 'Reload the active page in isolated browser session',
  },
];

export const PermissionsSection: React.FC<PermissionsSectionProps> = ({
  initialPermissions,
  onRefresh,
}) => {
  const [permissions, setPermissions] = useState<SystemPermissions>(initialPermissions);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live tester
  const [testAction, setTestAction] = useState<string>('executeTerminal');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleLevelChange = (key: keyof SystemPermissions, level: PermissionLevel) => {
    setPermissions((prev) => ({ ...prev, [key]: level }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateConfigSection('permissions', permissions);
      await onRefresh();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEvaluation = async () => {
    setTestLoading(true);
    try {
      const res = await apiClient.testPermission(testAction);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ granted: false, level: 'DENY', reason: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded border border-[#F2A900]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#F2A900]" />
          <h3 className="text-sm font-mono tracking-widest text-[#F2A900] uppercase">
            System & Hardware Permission Architecture
          </h3>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Configure security policy for local machine and hardware access. All requests are evaluated by the backend permission engine before tool execution.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="divide-y divide-stone-900 border border-stone-800 rounded bg-[#080808] overflow-hidden">
          {PERMISSION_CONFIG.map((item) => {
            const currentLevel = permissions[item.key] || 'ASK';
            return (
              <div
                key={item.key}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-950/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-stone-900 shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-semibold text-white">
                      {item.label}
                    </div>
                    <div className="text-[11px] font-mono text-stone-400">
                      {item.desc}
                    </div>
                  </div>
                </div>

                {/* 3-State Segmented Control */}
                <div className="flex items-center rounded bg-stone-950 border border-stone-800 p-0.5 shrink-0 self-start sm:self-auto font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleLevelChange(item.key, 'ALLOW')}
                    className={`px-3 py-1 rounded transition-all cursor-pointer ${
                      currentLevel === 'ALLOW'
                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    ALLOW
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLevelChange(item.key, 'ASK')}
                    className={`px-3 py-1 rounded transition-all cursor-pointer ${
                      currentLevel === 'ASK'
                        ? 'bg-amber-950 border border-amber-700 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    ASK
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLevelChange(item.key, 'DENY')}
                    className={`px-3 py-1 rounded transition-all cursor-pointer ${
                      currentLevel === 'DENY'
                        ? 'bg-rose-950 border border-rose-700 text-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        : 'text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    DENY
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded text-xs font-mono bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Permission rules successfully updated across backend services!</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-mono font-semibold text-black bg-[#F2A900] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'COMMIT PERMISSION POLICIES'}
          </button>
        </div>
      </form>

      {/* Interactive Permission Policy Tester */}
      <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#F2A900]" />
          <h4 className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
            Live Permission Evaluation Simulator
          </h4>
        </div>
        <p className="text-[11px] font-mono text-stone-400">
          Verify how the backend permission architecture evaluates execution requests based on current policies.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={testAction}
            onChange={(e) => {
              setTestAction(e.target.value);
              setTestResult(null);
            }}
            className="flex-1 w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none"
          >
            {PERMISSION_CONFIG.map((p) => (
              <option key={p.key} value={p.key}>
                Action: {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleTestEvaluation}
            disabled={testLoading}
            className="w-full sm:w-auto px-4 py-2 text-xs font-mono rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 cursor-pointer"
          >
            {testLoading ? 'CHECKING...' : 'TEST EVALUATION'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded text-xs font-mono border ${
              testResult.level === 'ALLOW'
                ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                : testResult.level === 'ASK'
                ? 'bg-amber-950/30 border-amber-800 text-amber-300'
                : 'bg-rose-950/30 border-rose-800 text-rose-300'
            }`}
          >
            <div className="font-bold">
              POLICY RESULT: [{testResult.level}] — Granted: {testResult.granted ? 'YES' : 'NO'}
            </div>
            <div className="text-[11px] mt-1 opacity-80">
              {testResult.reason || 'Permitted automatically by security policy.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
