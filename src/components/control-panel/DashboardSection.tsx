import React from 'react';
import { StoredApiKey, SystemConfig, ControlPanelSection } from '../../types';
import {
  ShieldCheck,
  Key,
  Cpu,
  Sliders,
  Mic,
  Database,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Monitor,
  Globe,
} from 'lucide-react';

interface DashboardSectionProps {
  keys: StoredApiKey[];
  config: SystemConfig & { auditLogs?: any[] };
  onNavigate: (section: ControlPanelSection) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  keys,
  config,
  onNavigate,
}) => {
  const activeKey = keys.find((k) => k.isActive && k.isEnabled);
  const totalEnabled = keys.filter((k) => k.isEnabled).length;

  const permissionsList = Object.entries(config.permissions || {});
  const allowCount = permissionsList.filter(([_, level]) => level === 'ALLOW').length;
  const askCount = permissionsList.filter(([_, level]) => level === 'ASK').length;
  const denyCount = permissionsList.filter(([_, level]) => level === 'DENY').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-lg border border-[#F2A900]/30 bg-gradient-to-r from-[#0d0d0d] via-[#121008] to-[#0a0a0a] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-mono text-sm font-semibold text-white tracking-wider">
              SUPER AI CENTRAL COMMAND HUB
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Encrypted local control layer. All provider API keys and hardware access permissions are managed here without modifying codebase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-stone-400">ACTIVE AI PROVIDER</div>
            <div className="text-xs font-mono font-bold text-[#F2A900]">
              {activeKey ? `OPENROUTER (${activeKey.name})` : 'STANDBY (NO KEY ACTIVE)'}
            </div>
          </div>
          <button
            onClick={() => onNavigate('api-keys')}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded bg-[#F2A900] hover:bg-[#ffbe26] text-black transition-all cursor-pointer flex items-center gap-1"
          >
            <span>MANAGE KEYS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of Key Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. API Keys Status Card */}
        <div
          onClick={() => onNavigate('api-keys')}
          className="p-4 rounded border border-stone-800 bg-[#080808] hover:border-[#F2A900]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-stone-900 text-[#F2A900]">
              <Key className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-stone-500 group-hover:text-[#F2A900] transition-colors">
              OPEN →
            </span>
          </div>
          <div className="text-xs font-mono text-stone-400">API Key Manager</div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {keys.length} <span className="text-xs text-stone-500 font-normal">registered</span>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-900 flex items-center justify-between text-[11px] font-mono">
            <span className="text-stone-400">Active Pool:</span>
            <span className={totalEnabled > 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {totalEnabled} Enabled
            </span>
          </div>
        </div>

        {/* 2. Models Routing Card */}
        <div
          onClick={() => onNavigate('models')}
          className="p-4 rounded border border-stone-800 bg-[#080808] hover:border-[#F2A900]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-stone-900 text-[#F2A900]">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-stone-500 group-hover:text-[#F2A900] transition-colors">
              OPEN →
            </span>
          </div>
          <div className="text-xs font-mono text-stone-400">Core Models</div>
          <div className="text-sm font-mono font-bold text-white mt-1 truncate">
            {config.models?.general || 'deepseek/deepseek-chat'}
          </div>
          <div className="mt-3 pt-2 border-t border-stone-900 flex items-center justify-between text-[11px] font-mono">
            <span className="text-stone-400">Reasoning Core:</span>
            <span className="text-stone-300 truncate max-w-[120px]">
              {config.models?.reasoning?.split('/')?.[1] || 'deepseek-r1'}
            </span>
          </div>
        </div>

        {/* 3. Security & Permissions Card */}
        <div
          onClick={() => onNavigate('permissions')}
          className="p-4 rounded border border-stone-800 bg-[#080808] hover:border-[#F2A900]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-stone-900 text-[#F2A900]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-stone-500 group-hover:text-[#F2A900] transition-colors">
              OPEN →
            </span>
          </div>
          <div className="text-xs font-mono text-stone-400">Permissions Shield</div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {allowCount} <span className="text-xs text-emerald-400 font-normal">ALLOW</span> ·{' '}
            {askCount} <span className="text-xs text-amber-400 font-normal">ASK</span>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-900 flex items-center justify-between text-[11px] font-mono">
            <span className="text-stone-400">Policy Guard:</span>
            <span className="text-emerald-400">Active</span>
          </div>
        </div>

        {/* 4. Windows Computer Control Card */}
        <div
          onClick={() => onNavigate('computer-control')}
          className="p-4 rounded border border-stone-800 bg-[#080808] hover:border-[#F2A900]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-stone-900 text-[#F2A900]">
              <Monitor className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-stone-500 group-hover:text-[#F2A900] transition-colors">
              OPEN →
            </span>
          </div>
          <div className="text-xs font-mono text-stone-400">Computer Control</div>
          <div className="text-xl font-mono font-bold text-white mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>SAFE V1</span>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-900 flex items-center justify-between text-[11px] font-mono">
            <span className="text-stone-400">Shell Access:</span>
            <span className="text-rose-400 font-semibold">BLOCKED</span>
          </div>
        </div>

        {/* 5. Controlled Browser Automation Card */}
        <div
          onClick={() => onNavigate('browser-control')}
          className="p-4 rounded border border-stone-800 bg-[#080808] hover:border-[#F2A900]/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-stone-900 text-[#F2A900]">
              <Globe className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-stone-500 group-hover:text-[#F2A900] transition-colors">
              OPEN →
            </span>
          </div>
          <div className="text-xs font-mono text-stone-400">Browser Control</div>
          <div className="text-xl font-mono font-bold text-white mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>SAFE V1</span>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-900 flex items-center justify-between text-[11px] font-mono">
            <span className="text-stone-400">Profile & Scripts:</span>
            <span className="text-emerald-400 font-semibold">ISOLATED</span>
          </div>
        </div>
      </div>

      {/* Security At Rest Status */}
      <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#F2A900]" />
            <h4 className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
              Cryptographic Enclave & Local Storage
            </h4>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-400">
            AES-256-GCM ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-stone-950 border border-stone-900">
            <span className="text-stone-500 block text-[10px]">ENCRYPTION STANDARD</span>
            <span className="text-stone-200 font-semibold">AES-256-GCM + SHA-256</span>
          </div>
          <div className="p-3 rounded bg-stone-950 border border-stone-900">
            <span className="text-stone-500 block text-[10px]">MACHINE SALT</span>
            <span className="text-stone-200 font-semibold">Protected Local Seed (0600)</span>
          </div>
          <div className="p-3 rounded bg-stone-950 border border-stone-900">
            <span className="text-stone-500 block text-[10px]">CLIENT EXPOSURE</span>
            <span className="text-emerald-400 font-semibold">Zero Raw Keys to Browser</span>
          </div>
          <div className="p-3 rounded bg-stone-950 border border-stone-900">
            <span className="text-stone-500 block text-[10px]">RATE LIMIT ROTATION</span>
            <span className="text-[#F2A900] font-semibold">Auto-Failover Active</span>
          </div>
        </div>
      </div>

      {/* Recent Security & Execution Audit Trail */}
      <div className="border border-stone-800 rounded bg-[#080808] overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-800 bg-[#0c0c0c] flex items-center justify-between">
          <span className="font-mono text-xs text-white font-semibold tracking-wider uppercase">
            Recent System Security & Key Audit Logs
          </span>
          <button
            onClick={() => onNavigate('security')}
            className="text-[11px] font-mono text-[#F2A900] hover:underline cursor-pointer"
          >
            VIEW ALL LOGS →
          </button>
        </div>
        <div className="divide-y divide-stone-900 max-h-48 overflow-y-auto font-mono text-xs">
          {(config.auditLogs || []).slice(0, 5).map((log: any) => (
            <div key={log.id} className="p-3 flex items-start gap-3">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 ${
                  log.severity === 'error'
                    ? 'bg-rose-950 text-rose-400'
                    : log.severity === 'warn'
                    ? 'bg-amber-950 text-amber-400'
                    : 'bg-stone-900 text-stone-400'
                }`}
              >
                {log.action}
              </span>
              <span className="text-stone-300 flex-1">{log.details}</span>
              <span className="text-[10px] text-stone-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
