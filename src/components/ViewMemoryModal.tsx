import React, { useState, useEffect } from 'react';
import { Database, X, Brain, Clock, Trash2, Plus, Search, Tag, Eye, ShieldCheck, RefreshCw, Cpu, BookOpen } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { LongTermMemoryItem } from '../types';

interface ViewMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  onMemoryCleared?: () => void;
}

export const ViewMemoryModal: React.FC<ViewMemoryModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onMemoryCleared,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'working' | 'longterm'>('longterm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Long-term state
  const [longTermItems, setLongTermItems] = useState<LongTermMemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'user_preference' | 'project_fact' | 'instruction' | 'general'>('user_preference');
  const [showAddForm, setShowAddForm] = useState(false);

  // Session & Working memory state
  const [conversationData, setConversationData] = useState<any>(null);
  const [workingMemoryData, setWorkingMemoryData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Long-Term Memories
      const ltRes = await apiClient.getLongTermMemories({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
      });
      setLongTermItems(ltRes.items || []);

      // 2. Fetch Conversation Memory & Working Memory
      const convs = await apiClient.getConversations();
      if (convs && convs.length > 0) {
        // Pick current or most recent
        const targetId = conversationId || convs[0].id;
        const currentConv = await apiClient.getConversation(targetId);
        setConversationData(currentConv);
        setWorkingMemoryData(currentConv?.workingMemory || null);
      } else {
        setConversationData(null);
        setWorkingMemoryData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve neural memory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, selectedCategory]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiClient.deleteLongTermMemory(id);
      setLongTermItems((prev) => prev.filter((item) => item.id !== id));
      if (onMemoryCleared) onMemoryCleared();
    } catch (err: any) {
      setError(err.message || 'Failed to delete memory item.');
    }
  };

  const handleClearLongTerm = async () => {
    if (!window.confirm('Are you sure you want to purge all long-term memories? This action is irreversible.')) {
      return;
    }
    try {
      await apiClient.clearLongTermMemories();
      setLongTermItems([]);
      if (onMemoryCleared) onMemoryCleared();
    } catch (err: any) {
      setError(err.message || 'Failed to clear long-term memory.');
    }
  };

  const handleClearConversation = async () => {
    if (!conversationData?.id) return;
    try {
      await apiClient.clearConversation(conversationData.id);
      setConversationData(null);
      setWorkingMemoryData(null);
      if (onMemoryCleared) onMemoryCleared();
    } catch (err: any) {
      setError(err.message || 'Failed to clear conversation session.');
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newContent.trim()) return;
    try {
      const created = await apiClient.addLongTermMemory({
        key: newKey.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
      setLongTermItems((prev) => [created, ...prev]);
      setNewKey('');
      setNewContent('');
      setShowAddForm(false);
      if (onMemoryCleared) onMemoryCleared();
    } catch (err: any) {
      setError(err.message || 'Failed to store memory.');
    }
  };

  // Token estimate for session
  const totalCharacters = (conversationData?.messages || []).reduce(
    (acc: number, m: any) => acc + (m.content?.length || 0),
    0
  );
  const estimatedTokens = Math.ceil(totalCharacters / 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="hud-panel rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-[#FFFFFF]/30 bg-[#080808] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#FFFFFF]/20 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 text-[#FFFFFF]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-bold uppercase tracking-wider text-[#FFFFFF]">
                  Super AI Memory Matrix
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                  PERSISTENCE: LOCAL
                </span>
              </div>
              <p className="text-xs font-mono text-stone-400">
                Encrypted storage located in local data vault. Secrets redacted automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded border border-stone-800 hover:border-[#FFFFFF]/50 text-stone-400 hover:text-[#FFFFFF] transition-colors cursor-pointer"
              title="Refresh Memory Matrix"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FFFFFF]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded border border-stone-800 hover:border-stone-600 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-[#0c0c0c] px-6 gap-2">
          <button
            onClick={() => setActiveTab('longterm')}
            className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'longterm'
                ? 'border-[#FFFFFF] text-[#FFFFFF]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Long-Term Memory ({longTermItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('working')}
            className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'working'
                ? 'border-[#FFFFFF] text-[#FFFFFF]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Working Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('conversation')}
            className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'conversation'
                ? 'border-[#FFFFFF] text-[#FFFFFF]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Conversation Memory</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: LONG-TERM MEMORY */}
          {activeTab === 'longterm' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search memory keys or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-black border border-stone-800 rounded text-stone-200 placeholder-stone-600 focus:border-[#FFFFFF] focus:outline-none"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="py-1.5 px-3 text-xs font-mono bg-black border border-stone-800 rounded text-stone-300 focus:border-[#FFFFFF] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="user_preference">User Preferences</option>
                    <option value="project_fact">Project Facts</option>
                    <option value="instruction">Instructions</option>
                    <option value="general">General</option>
                  </select>
                </form>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-3 py-1.5 text-xs font-mono font-bold rounded bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 text-[#FFFFFF] hover:bg-[#FFFFFF]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Store Fact</span>
                  </button>

                  {longTermItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearLongTerm}
                      className="px-3 py-1.5 text-xs font-mono rounded bg-rose-950/40 border border-rose-800 text-rose-400 hover:bg-rose-900/60 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Purge All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Memory Form */}
              {showAddForm && (
                <form
                  onSubmit={handleCreateMemory}
                  className="p-4 rounded-xl border border-[#FFFFFF]/30 bg-[#0d0d0d] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                    <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase">
                      Record Explicit Fact into Long-Term Vault
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-stone-400 mb-1">KEY IDENTIFIER</label>
                      <input
                        type="text"
                        placeholder="e.g. project_name, preferred_framework"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-xs font-mono bg-black border border-stone-800 rounded text-stone-200 focus:border-[#FFFFFF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-stone-400 mb-1">CATEGORY</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-black border border-stone-800 rounded text-stone-200 focus:border-[#FFFFFF] focus:outline-none cursor-pointer"
                      >
                        <option value="user_preference">User Preference</option>
                        <option value="project_fact">Project Fact</option>
                        <option value="instruction">System Instruction</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-stone-400 mb-1">FACT / MEMORY CONTENT</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. The Super AI project uses TypeScript, Express, and Vite."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-mono bg-black border border-stone-800 rounded text-stone-200 focus:border-[#FFFFFF] focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs font-mono rounded border border-stone-800 text-stone-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-mono font-bold rounded bg-[#FFFFFF] text-black hover:bg-[#ffbe26] cursor-pointer"
                    >
                      Save to Vault
                    </button>
                  </div>
                </form>
              )}

              {/* Memory Items List */}
              {longTermItems.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-stone-800 bg-black/40">
                  <Brain className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-stone-400">
                    No long-term memories stored yet.
                  </p>
                  <p className="text-[11px] font-mono text-stone-600 mt-1">
                    Say <span className="text-[#FFFFFF]">"Remember that my project is called Super AI"</span> or click "Store Fact" above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {longTermItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-stone-800 bg-black/50 hover:border-[#FFFFFF]/40 transition-colors flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#FFFFFF] tracking-wide">
                            {item.key}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 uppercase">
                            {item.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            Added: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            Recalls: {item.accessCount}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-stone-200 leading-relaxed bg-[#0a0a0a] p-2.5 rounded border border-stone-900">
                          {item.content}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-colors cursor-pointer"
                        title="Delete this memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WORKING MEMORY */}
          {activeTab === 'working' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-stone-800 bg-black/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFFFFF] uppercase">
                  <Cpu className="w-4 h-4" />
                  <span>Current Objective & Task State</span>
                </div>
                <div className="p-3 rounded bg-[#0a0a0a] border border-stone-900 text-xs font-mono text-stone-300">
                  {workingMemoryData?.currentObjective ? (
                    <span>{workingMemoryData.currentObjective}</span>
                  ) : (
                    <span className="text-stone-500 italic">No active task objective set.</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-800 bg-black/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFFFFF] uppercase">
                  <Brain className="w-4 h-4" />
                  <span>Active Tool Execution State</span>
                </div>
                {workingMemoryData?.currentToolExecution ? (
                  <div className="p-3 rounded bg-[#0a0a0a] border border-stone-900 text-xs font-mono space-y-1.5 text-stone-300">
                    <div className="flex items-center justify-between text-[#FFFFFF]">
                      <span className="font-bold">Tool: {workingMemoryData.currentToolExecution.tool}</span>
                      <span className="text-[10px] opacity-70">
                        {workingMemoryData.currentToolExecution.startedAt}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-stone-400 overflow-x-auto bg-black p-2 rounded border border-stone-800">
                      {JSON.stringify(workingMemoryData.currentToolExecution.arguments, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-[#0a0a0a] border border-stone-900 text-xs font-mono text-stone-500 italic">
                    No tool actively running.
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-stone-800 bg-black/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFFFFF] uppercase">
                  <Database className="w-4 h-4" />
                  <span>Temporary Variables</span>
                </div>
                {workingMemoryData?.temporaryVariables && Object.keys(workingMemoryData.temporaryVariables).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(workingMemoryData.temporaryVariables).map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded bg-[#0a0a0a] border border-stone-900 font-mono text-xs">
                        <div className="text-[#FFFFFF] font-semibold text-[11px]">{k}</div>
                        <div className="text-stone-300 text-xs truncate" title={String(v)}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded bg-[#0a0a0a] border border-stone-900 text-xs font-mono text-stone-500 italic">
                    No temporary variables cached.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONVERSATION MEMORY */}
          {activeTab === 'conversation' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-800 bg-black/50 space-y-1">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Session Status</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">ACTIVE</div>
                </div>
                <div className="p-3.5 rounded-xl border border-stone-800 bg-black/50 space-y-1">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Message Count</div>
                  <div className="text-sm font-mono font-bold text-[#FFFFFF]">
                    {conversationData?.messages?.length || 0}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-stone-800 bg-black/50 space-y-1">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Est. Tokens Stored</div>
                  <div className="text-sm font-mono font-bold text-stone-200">
                    ~{estimatedTokens} tokens
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase">
                  Recent Session Transcript
                </span>
                {conversationData && (
                  <button
                    onClick={handleClearConversation}
                    className="px-3 py-1.5 text-xs font-mono rounded bg-rose-950/40 border border-rose-800 text-rose-400 hover:bg-rose-900/60 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Current Session</span>
                  </button>
                )}
              </div>

              {!conversationData || !conversationData.messages || conversationData.messages.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-stone-800 bg-black/40">
                  <Clock className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-stone-400">
                    No conversation history recorded in this session.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {conversationData.messages.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                        m.role === 'user'
                          ? 'bg-black/60 border-stone-800 text-stone-200'
                          : m.role === 'assistant'
                          ? 'bg-[#FFFFFF]/10 border-[#FFFFFF]/30 text-[#FFFFFF]'
                          : 'bg-stone-950 border-stone-900 text-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-60">
                        <span className="font-bold uppercase tracking-wider">{m.role}</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#FFFFFF]/20 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Unsolicited Memory Creation Policy Enforced</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-bold rounded bg-stone-800 hover:bg-stone-700 text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
