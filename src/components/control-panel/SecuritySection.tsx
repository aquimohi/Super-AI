import React, { useState } from 'react';
import { SecuritySettings } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Lock, ShieldCheck, FileText, Check, AlertTriangle, Key } from 'lucide-react';

interface SecuritySectionProps {
  initialSecurity: SecuritySettings;
  auditLogs: any[];
  onRefresh: () => Promise<void>;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  initialSecurity,
  auditLogs,
  onRefresh,
}) => {
  const [security, setSecurity] = useState<SecuritySettings>(initialSecurity);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateConfigSection('security', security);
      await onRefresh();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save security settings.');
    } finally {
      setSaving(false);
    }
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (filterSeverity === 'all') return true;
    return l.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      <div className="p-4 rounded border border-[#FFFFFF]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#FFFFFF]" />
          <h3 className="text-sm font-mono tracking-widest text-[#FFFFFF] uppercase">
            Local Security & Cryptographic Auditing
          </h3>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Encryption status at rest, machine salt verification, tamper prevention, and chronological security audit trail.
        </p>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded border border-stone-800 bg-[#080808] space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>ENCRYPTION AT REST</span>
          </div>
          <div className="text-xs font-mono text-stone-300 font-semibold">AES-256-GCM + IV</div>
          <p className="text-[10px] font-mono text-stone-500">API keys never stored in plaintext on disk.</p>
        </div>

        <div className="p-3.5 rounded border border-stone-800 bg-[#080808] space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
            <Key className="w-4 h-4" />
            <span>ZERO CLIENT LEAKAGE</span>
          </div>
          <div className="text-xs font-mono text-stone-300 font-semibold">Masked Transmissions</div>
          <p className="text-[10px] font-mono text-stone-500">Browser receives only partial masked strings.</p>
        </div>

        <div className="p-3.5 rounded border border-stone-800 bg-[#080808] space-y-1">
          <div className="flex items-center gap-2 text-[#FFFFFF] text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>RATE LIMIT FAILOVER</span>
          </div>
          <div className="text-xs font-mono text-stone-300 font-semibold">Auto-Rotation Pool</div>
          <p className="text-[10px] font-mono text-stone-500">Gracefully steps to secondary enabled key on 429.</p>
        </div>
      </div>

      {/* Config Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white font-semibold uppercase">Audit Logging</div>
            <div className="text-[11px] font-mono text-stone-400">Record all key operations and model routing events</div>
          </div>
          <button
            type="button"
            onClick={() => setSecurity({ ...security, auditLogging: !security.auditLogging })}
            className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
              security.auditLogging
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 font-bold'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
          >
            {security.auditLogging ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white font-semibold uppercase">Prompt Safety Guard</div>
            <div className="text-[11px] font-mono text-stone-400">Sanitize inbound prompt structures to mitigate prompt injection</div>
          </div>
          <button
            type="button"
            onClick={() => setSecurity({ ...security, promptSafetyGuard: !security.promptSafetyGuard })}
            className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
              security.promptSafetyGuard
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 font-bold'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
          >
            {security.promptSafetyGuard ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white font-semibold uppercase">API Key Rotation Reminder</span>
            <span className="text-xs font-mono text-[#FFFFFF]">{security.keyRotationAlertDays} days</span>
          </div>
          <input
            type="range"
            min="30"
            max="180"
            step="15"
            value={security.keyRotationAlertDays}
            onChange={(e) => setSecurity({ ...security, keyRotationAlertDays: parseInt(e.target.value, 10) })}
            className="w-full accent-[#FFFFFF] cursor-pointer"
          />
        </div>

        {error && (
          <div className="p-3 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded text-xs font-mono bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Security preferences saved!</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-mono font-semibold text-black bg-[#FFFFFF] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE SECURITY SETTINGS'}
          </button>
        </div>
      </form>

      {/* Security Audit Log Explorer */}
      <div className="border border-stone-800 rounded bg-[#080808] overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b border-stone-800 bg-[#0c0c0c] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FFFFFF]" />
            <span className="font-mono text-xs text-white font-semibold tracking-wider uppercase">
              Chronological Security Audit Log ({filteredLogs.length})
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs">
            {['all', 'info', 'warn', 'error'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterSeverity(s)}
                className={`px-2 py-0.5 rounded uppercase text-[10px] transition-all cursor-pointer ${
                  filterSeverity === s
                    ? 'bg-[#FFFFFF] text-black font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-stone-900 max-h-64 overflow-y-auto font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-4 text-center text-stone-500 font-mono text-xs">
              No audit records match the selected filter.
            </div>
          ) : (
            filteredLogs.map((log: any) => (
              <div key={log.id} className="p-3 flex items-start gap-3 hover:bg-stone-950/40">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 font-bold ${
                    log.severity === 'error'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : log.severity === 'warn'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-stone-900 text-stone-300 border border-stone-800'
                  }`}
                >
                  {log.action}
                </span>
                <span className="text-stone-300 flex-1 break-words">{log.details}</span>
                <span className="text-[10px] text-stone-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
