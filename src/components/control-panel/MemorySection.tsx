import React, { useState } from 'react';
import { MemorySettings } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Database, Check, HardDrive, Eye, Trash2, Shield, Cpu, Clock, Brain } from 'lucide-react';
import { ViewMemoryModal } from '../ViewMemoryModal';

interface MemorySectionProps {
  initialMemory: MemorySettings;
  onRefresh: () => Promise<void>;
  conversationId?: string;
}

export const MemorySection: React.FC<MemorySectionProps> = ({
  initialMemory,
  onRefresh,
  conversationId,
}) => {
  const [memory, setMemory] = useState<MemorySettings>({
    shortTermMemoryEnabled: initialMemory?.shortTermMemoryEnabled ?? true,
    longTermMemoryEnabled: initialMemory?.longTermMemoryEnabled ?? true,
    workingMemoryEnabled: initialMemory?.workingMemoryEnabled ?? true,
    storageType: 'LOCAL',
    retention: initialMemory?.retention || 'session',
    contextWindowLimit: initialMemory?.contextWindowLimit || 8192,
    vectorStoreEnabled: initialMemory?.vectorStoreEnabled ?? false,
    autoSummarization: initialMemory?.autoSummarization ?? true,
    maxContextMessages: initialMemory?.maxContextMessages || 10,
    maxLongTermItemsToInject: initialMemory?.maxLongTermItemsToInject || 6,
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateConfigSection('memory', memory);
      await apiClient.updateMemoryConfig(memory);
      await onRefresh();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save memory settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSession = async () => {
    if (!window.confirm('Clear all conversation messages in current session?')) return;
    try {
      if (conversationId) {
        await apiClient.clearConversation(conversationId);
      } else {
        await apiClient.clearAllConversations();
      }
      setActionNotice('Conversation session successfully purged.');
      setTimeout(() => setActionNotice(null), 3500);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to clear conversation session.');
    }
  };

  const handleClearLongTerm = async () => {
    if (!window.confirm('Purge all stored long-term memory facts? This cannot be undone.')) return;
    try {
      const count = await apiClient.clearLongTermMemories();
      setActionNotice(`Cleared ${count} long-term memory records.`);
      setTimeout(() => setActionNotice(null), 3500);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to clear long-term memories.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl border border-[#F2A900]/20 bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#F2A900]" />
            <h3 className="text-sm font-mono tracking-widest text-[#F2A900] uppercase font-bold">
              Memory Subsystem Architecture
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2A900]/10 border border-[#F2A900]/30 text-[#F2A900]">
            3-TIER MEMORY
          </span>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Separated into Conversation Memory, Long-Term Explicit Memory, and Working Memory.
          Strict policy: Zero unsolicited personal memories created without user request.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Tier Toggles: Short-Term, Long-Term, Working Memory */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#080808] space-y-3">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-1 border-b border-stone-800 flex items-center justify-between">
            <span>Memory Engines</span>
            <span className="text-[10px] text-stone-500 lowercase font-normal">toggle individual memory layers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Short-Term (Conversation) */}
            <div className="p-3 rounded-lg border border-stone-800 bg-black/60 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                  <Clock className="w-3.5 h-3.5 text-[#F2A900]" />
                  <span>Short-Term</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                  Current chat turns & recent context
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMemory({ ...memory, shortTermMemoryEnabled: !memory.shortTermMemoryEnabled })
                }
                className={`w-full py-1.5 text-xs font-mono font-bold rounded border transition-all cursor-pointer ${
                  memory.shortTermMemoryEnabled
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-stone-900 border-stone-800 text-stone-500'
                }`}
              >
                {memory.shortTermMemoryEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Long-Term Memory */}
            <div className="p-3 rounded-lg border border-stone-800 bg-black/60 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                  <Brain className="w-3.5 h-3.5 text-[#F2A900]" />
                  <span>Long-Term</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                  Explicit user facts & preferences
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMemory({ ...memory, longTermMemoryEnabled: !memory.longTermMemoryEnabled })
                }
                className={`w-full py-1.5 text-xs font-mono font-bold rounded border transition-all cursor-pointer ${
                  memory.longTermMemoryEnabled
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-stone-900 border-stone-800 text-stone-500'
                }`}
              >
                {memory.longTermMemoryEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Working Memory */}
            <div className="p-3 rounded-lg border border-stone-800 bg-black/60 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                  <Cpu className="w-3.5 h-3.5 text-[#F2A900]" />
                  <span>Working Memory</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                  Active objective & tool variables
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMemory({ ...memory, workingMemoryEnabled: !memory.workingMemoryEnabled })
                }
                className={`w-full py-1.5 text-xs font-mono font-bold rounded border transition-all cursor-pointer ${
                  memory.workingMemoryEnabled
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-stone-900 border-stone-800 text-stone-500'
                }`}
              >
                {memory.workingMemoryEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Storage Info: LOCAL */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-stone-900 border border-stone-800 text-[#F2A900]">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-white uppercase">Storage Layer</div>
              <div className="text-[11px] font-mono text-stone-400">
                LOCAL (Encrypted at rest: <span className="text-stone-300">.data/superai-memory.json</span>)
              </div>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-400 font-bold">
            LOCAL
          </span>
        </div>

        {/* Retention Period */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono font-bold text-white uppercase">
              Retention Policy
            </label>
            <span className="text-[11px] font-mono text-stone-400 uppercase">Configurable</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'session', label: 'Session Only' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'infinite', label: 'Infinite' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMemory({ ...memory, retention: p.id as any })}
                className={`py-2 text-xs font-mono rounded-lg border text-center transition-all cursor-pointer ${
                  memory.retention === p.id
                    ? 'bg-[#F2A900]/20 border-[#F2A900] text-[#F2A900] font-bold'
                    : 'bg-black/60 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context Window Limit */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase">Context Window Limit</span>
            <span className="text-xs font-mono text-[#F2A900] font-bold">{memory.contextWindowLimit} tokens</span>
          </div>
          <input
            type="range"
            min="2048"
            max="32768"
            step="1024"
            value={memory.contextWindowLimit}
            onChange={(e) => setMemory({ ...memory, contextWindowLimit: parseInt(e.target.value, 10) })}
            className="w-full accent-[#F2A900] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-stone-500">
            <span>2K (Minimal)</span>
            <span>8K (Default Balanced)</span>
            <span>32K (Deep Context)</span>
          </div>
        </div>

        {/* Auto Summarization */}
        <div className="p-4 rounded-xl border border-stone-800 bg-[#080808] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white font-bold uppercase">Automatic Dialogue Summarization</div>
            <div className="text-[11px] font-mono text-stone-400">
              Condenses older turns to conserve API token costs
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMemory({ ...memory, autoSummarization: !memory.autoSummarization })}
            className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
              memory.autoSummarization
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 font-bold'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
          >
            {memory.autoSummarization ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Feedback Notices */}
        {actionNotice && (
          <div className="p-3 rounded-lg text-xs font-mono bg-blue-950/40 border border-blue-800 text-blue-300">
            {actionNotice}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded-lg text-xs font-mono bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Memory configuration successfully saved!</span>
          </div>
        )}

        {/* Action Controls Required by User Specification:
            [ VIEW MEMORY ] [ CLEAR SESSION ] [ CLEAR LONG-TERM MEMORY ] */}
        <div className="pt-2 p-4 rounded-xl border border-stone-800 bg-[#0a0a0a] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsViewModalOpen(true)}
              className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-[#F2A900]/15 border border-[#F2A900]/40 text-[#F2A900] hover:bg-[#F2A900]/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>VIEW MEMORY</span>
            </button>

            <button
              type="button"
              onClick={handleClearSession}
              className="px-3.5 py-2 text-xs font-mono rounded-lg bg-stone-900 border border-stone-700 text-stone-300 hover:text-white hover:border-stone-500 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-stone-400" />
              <span>CLEAR SESSION</span>
            </button>

            <button
              type="button"
              onClick={handleClearLongTerm}
              className="px-3.5 py-2 text-xs font-mono rounded-lg bg-rose-950/30 border border-rose-800/80 text-rose-400 hover:bg-rose-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR LONG-TERM MEMORY</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-mono font-bold text-black bg-[#F2A900] hover:bg-[#ffbe26] rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
          </button>
        </div>
      </form>

      {/* Full View Memory Modal */}
      <ViewMemoryModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        conversationId={conversationId}
        onMemoryCleared={onRefresh}
      />
    </div>
  );
};
