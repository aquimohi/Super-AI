import React, { useState } from 'react';
import { StoredApiKey, AIProvider } from '../../types';
import { apiClient, KeyTestResponse } from '../../services/apiClient';
import {
  Key,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';

interface ApiKeysSectionProps {
  keys: StoredApiKey[];
  onRefresh: () => Promise<void>;
}

export const ApiKeysSection: React.FC<ApiKeysSectionProps> = ({ keys, onRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<StoredApiKey | null>(null);

  // Form states for Add
  const [provider, setProvider] = useState<AIProvider>('openrouter');
  const [keyName, setKeyName] = useState('');
  const [rawKeyValue, setRawKeyValue] = useState('');
  const [showRawKey, setShowRawKey] = useState(false);
  const [setActiveImmediately, setSetActiveImmediately] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Pre-save test state
  const [preTestLoading, setPreTestLoading] = useState(false);
  const [preTestResult, setPreTestResult] = useState<KeyTestResponse | null>(null);

  // Row testing state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, KeyTestResponse>>({});

  // Reset Add Form
  const resetAddForm = () => {
    setKeyName('');
    setRawKeyValue('');
    setShowRawKey(false);
    setSetActiveImmediately(true);
    setFormError(null);
    setPreTestResult(null);
    setIsAddModalOpen(false);
  };

  // Pre-test key before saving
  const handlePreTestKey = async () => {
    if (!rawKeyValue.trim()) {
      setFormError('Please enter an API key to test.');
      return;
    }
    setFormError(null);
    setPreTestLoading(true);
    setPreTestResult(null);
    try {
      const res = await apiClient.testRawKey(rawKeyValue.trim(), provider);
      setPreTestResult(res);
      if (!res.valid) {
        setFormError(res.error || 'Key validation failed.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect to provider.');
    } finally {
      setPreTestLoading(false);
    }
  };

  // Submit Add Key
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKeyValue.trim()) {
      setFormError('API Key value is required.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      await apiClient.addKey({
        provider,
        name: keyName.trim() || undefined,
        key: rawKeyValue.trim(),
        isActive: setActiveImmediately,
      });
      await onRefresh();
      resetAddForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to store API key.');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Key Save
  const handleEditKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    setFormLoading(true);
    setFormError(null);
    try {
      await apiClient.updateKey(editingKey.id, {
        name: keyName.trim() || undefined,
        key: rawKeyValue.trim() ? rawKeyValue.trim() : undefined,
      });
      await onRefresh();
      setEditingKey(null);
      setKeyName('');
      setRawKeyValue('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to update key.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Key
  const handleDeleteKey = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the key "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.deleteKey(id);
      await onRefresh();
    } catch (err: any) {
      alert(`Error deleting key: ${err.message}`);
    }
  };

  // Toggle Key Enable/Disable
  const handleToggleKey = async (id: string) => {
    try {
      await apiClient.toggleKey(id);
      await onRefresh();
    } catch (err: any) {
      alert(`Error toggling key: ${err.message}`);
    }
  };

  // Set as Active
  const handleSetActive = async (id: string) => {
    try {
      await apiClient.setActiveKey(id);
      await onRefresh();
    } catch (err: any) {
      alert(`Error activating key: ${err.message}`);
    }
  };

  // Test individual key
  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await apiClient.testKey(id);
      setTestResults((prev) => ({ ...prev, [id]: res }));
      await onRefresh();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { valid: false, error: err.message || 'Test failed' },
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const openRouterKeys = keys.filter((k) => k.provider === 'openrouter');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded border border-[#FFFFFF]/20 bg-[#0a0a0a]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FFFFFF]" />
            <h3 className="text-sm font-mono tracking-widest text-[#FFFFFF] uppercase">
              Encrypted API Key Manager
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Keys are encrypted using AES-256-GCM at rest and never exposed to the browser. Multi-key automatic failover and rate limit rotation are enabled.
          </p>
        </div>

        <button
          id="btn-add-api-key"
          onClick={() => {
            setKeyName('');
            setRawKeyValue('');
            setFormError(null);
            setPreTestResult(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono tracking-wider text-black bg-[#FFFFFF] hover:bg-[#ffbe26] transition-all rounded font-semibold cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)]"
        >
          <Plus className="w-4 h-4" />
          <span>ADD API KEY</span>
        </button>
      </div>

      {/* Provider Group: OpenRouter */}
      <div className="border border-stone-800 rounded bg-[#080808] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-[#0c0c0c]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="font-mono text-xs tracking-wider text-white font-semibold uppercase">
              OpenRouter
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 text-[#FFFFFF]">
              {openRouterKeys.length} {openRouterKeys.length === 1 ? 'Key' : 'Keys'} Registered
            </span>
          </div>

          <div className="text-[11px] font-mono text-stone-400">
            Endpoint: <span className="text-stone-300">openrouter.ai/api/v1</span>
          </div>
        </div>

        {openRouterKeys.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500">
              <Key className="w-5 h-5" />
            </div>
            <div className="text-sm font-mono text-stone-300">No OpenRouter API Keys Configured</div>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Add your OpenRouter key to unlock live AI chat capabilities across DeepSeek, Llama 3.3, Qwen 2.5, and Gemini models.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#FFFFFF] bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 rounded hover:bg-[#FFFFFF]/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Key</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-900">
            {openRouterKeys.map((k) => {
              const testRes = testResults[k.id];
              return (
                <div
                  key={k.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    k.isActive
                      ? 'bg-[#FFFFFF]/[0.03] border-l-2 border-l-[#FFFFFF]'
                      : 'hover:bg-stone-900/30'
                  }`}
                >
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-white font-medium truncate">
                        {k.name}
                      </span>

                      {/* Active Badge */}
                      {k.isActive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold bg-[#FFFFFF]/20 border border-[#FFFFFF] text-[#FFFFFF]">
                          <Star className="w-3 h-3 fill-[#FFFFFF]" />
                          ACTIVE KEY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-stone-900 border border-stone-800 text-stone-400">
                          {k.isEnabled ? 'STANDBY' : 'DISABLED'}
                        </span>
                      )}

                      {/* Status indicator */}
                      {k.status === 'valid' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          VALIDATED
                        </span>
                      )}
                      {k.status === 'invalid' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-800">
                          <XCircle className="w-3 h-3" />
                          AUTH FAILED
                        </span>
                      )}
                      {k.status === 'rate_limited' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          RATE LIMITED
                        </span>
                      )}
                      {k.status === 'untested' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-stone-500 bg-stone-900 border border-stone-800">
                          UNTESTED
                        </span>
                      )}
                    </div>

                    {/* Masked Key Display */}
                    <div className="flex items-center gap-3 text-xs font-mono text-stone-400">
                      <span className="tracking-widest bg-black/60 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                        {k.maskedKey}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Created: {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Live test message / metadata if available */}
                    {testRes && (
                      <div
                        className={`text-[11px] font-mono p-2 rounded border mt-2 ${
                          testRes.valid
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                            : 'bg-rose-950/20 border-rose-800/40 text-rose-400'
                        }`}
                      >
                        {testRes.valid ? (
                          <div className="flex items-center gap-3">
                            <span>OpenRouter Auth OK: {testRes.label || 'Standard Key'}</span>
                            {testRes.limit !== undefined && (
                              <span>Limit: ${testRes.limit.toFixed(2)}</span>
                            )}
                            {testRes.usage !== undefined && (
                              <span>Usage: ${testRes.usage.toFixed(4)}</span>
                            )}
                          </div>
                        ) : (
                          <div>Validation Error: {testRes.error}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Test Button */}
                    <button
                      id={`btn-test-key-${k.id}`}
                      onClick={() => handleTestKey(k.id)}
                      disabled={testingKeyId === k.id}
                      title="Test live connection to OpenRouter"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 ${testingKeyId === k.id ? 'animate-spin text-[#FFFFFF]' : ''}`}
                      />
                      <span>{testingKeyId === k.id ? 'TESTING...' : 'TEST'}</span>
                    </button>

                    {/* Set Active Button */}
                    {!k.isActive && (
                      <button
                        id={`btn-active-key-${k.id}`}
                        onClick={() => handleSetActive(k.id)}
                        title="Set as active primary key for OpenRouter"
                        className="px-2.5 py-1.5 text-xs font-mono rounded bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 border border-[#FFFFFF]/30 text-[#FFFFFF] transition-all cursor-pointer"
                      >
                        SET ACTIVE
                      </button>
                    )}

                    {/* Enable / Disable Toggle */}
                    <button
                      id={`btn-toggle-key-${k.id}`}
                      onClick={() => handleToggleKey(k.id)}
                      title={k.isEnabled ? 'Disable key' : 'Enable key'}
                      className={`px-2.5 py-1.5 text-xs font-mono rounded border transition-all cursor-pointer ${
                        k.isEnabled
                          ? 'bg-stone-900 border-stone-800 text-emerald-400 hover:bg-stone-800'
                          : 'bg-stone-900 border-stone-800 text-stone-500 hover:bg-stone-800'
                      }`}
                    >
                      {k.isEnabled ? 'ENABLED' : 'OFF'}
                    </button>

                    {/* Edit Button */}
                    <button
                      id={`btn-edit-key-${k.id}`}
                      onClick={() => {
                        setEditingKey(k);
                        setKeyName(k.name);
                        setRawKeyValue('');
                        setFormError(null);
                      }}
                      title="Edit key label or rotate secret"
                      className="p-1.5 text-xs font-mono rounded bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      id={`btn-delete-key-${k.id}`}
                      onClick={() => handleDeleteKey(k.id, k.name)}
                      title="Permanently remove key"
                      className="p-1.5 text-xs font-mono rounded bg-stone-900 hover:bg-rose-950/40 border border-stone-800 hover:border-rose-800 text-stone-400 hover:text-rose-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Future Providers Teaser (Multi-provider architecture ready) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded border border-stone-900 bg-[#070707] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-stone-300 font-medium">Anthropic Direct</div>
            <div className="text-[10px] text-stone-500 font-mono">Claude 3.7 Sonnet / Haiku</div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
            VIA OPENROUTER
          </span>
        </div>

        <div className="p-3.5 rounded border border-stone-900 bg-[#070707] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-stone-300 font-medium">DeepSeek Direct</div>
            <div className="text-[10px] text-stone-500 font-mono">DeepSeek V3 / R1</div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
            VIA OPENROUTER
          </span>
        </div>

        <div className="p-3.5 rounded border border-stone-900 bg-[#070707] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-stone-300 font-medium">Groq / LPU Cloud</div>
            <div className="text-[10px] text-stone-500 font-mono">Ultra-fast inference</div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
            PLANNED
          </span>
        </div>
      </div>

      {/* ADD API KEY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-lg border border-[#FFFFFF]/40 bg-[#0c0c0c] p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#FFFFFF]" />
                <h4 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">
                  Add New API Key
                </h4>
              </div>
              <button
                onClick={resetAddForm}
                className="text-stone-400 hover:text-white font-mono text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddKey} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1">
                  AI Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                  className="w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
                >
                  <option value="openrouter">OpenRouter (Unified Gateway)</option>
                  <option value="openai">OpenAI (Direct API)</option>
                  <option value="anthropic">Anthropic (Direct API)</option>
                  <option value="groq">Groq (Ultra-Fast LPU)</option>
                  <option value="gemini">Google Gemini (Direct)</option>
                </select>
              </div>

              {/* Key Label */}
              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1">
                  Key Label / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Production OpenRouter"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
                />
              </div>

              {/* Raw Key Secret */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-stone-300">
                    Secret API Key <span className="text-[#FFFFFF]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRawKey(!showRawKey)}
                    className="flex items-center gap-1 text-[11px] font-mono text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    {showRawKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showRawKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showRawKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-..."
                  value={rawKeyValue}
                  onChange={(e) => {
                    setRawKeyValue(e.target.value);
                    setPreTestResult(null);
                    setFormError(null);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white tracking-wider focus:outline-none focus:border-[#FFFFFF]"
                />
                <p className="text-[10px] font-mono text-stone-500 mt-1">
                  Encrypted at rest with AES-256. Masked permanently upon saving.
                </p>
              </div>

              {/* Test Connection Button */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded border border-stone-900 bg-stone-950">
                <div className="text-[11px] font-mono text-stone-400">
                  Verify key validity against provider before saving:
                </div>
                <button
                  type="button"
                  onClick={handlePreTestKey}
                  disabled={preTestLoading || !rawKeyValue.trim()}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded bg-stone-900 border border-stone-700 hover:border-[#FFFFFF] text-stone-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${preTestLoading ? 'animate-spin text-[#FFFFFF]' : ''}`} />
                  <span>{preTestLoading ? 'CHECKING...' : 'TEST KEY'}</span>
                </button>
              </div>

              {/* Pre-test Feedback */}
              {preTestResult && (
                <div
                  className={`p-2.5 rounded text-xs font-mono border ${
                    preTestResult.valid
                      ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400'
                      : 'bg-rose-950/30 border-rose-800 text-rose-400'
                  }`}
                >
                  {preTestResult.valid ? (
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Key is valid and authenticated!</span>
                      </div>
                      <div className="text-[11px] mt-1 text-emerald-300">
                        Label: {preTestResult.label || 'Active'}
                        {preTestResult.limit !== undefined && ` | Limit: $${preTestResult.limit}`}
                        {preTestResult.usage !== undefined && ` | Current Usage: $${preTestResult.usage}`}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" />
                      <span>{preTestResult.error || 'Validation failed.'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Set Active Checkbox */}
              <label className="flex items-center gap-2 text-xs font-mono text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setActiveImmediately}
                  onChange={(e) => setSetActiveImmediately(e.target.checked)}
                  className="rounded border-stone-800 text-[#FFFFFF] focus:ring-0"
                />
                <span>Set as primary active key for {provider.toUpperCase()}</span>
              </label>

              {formError && (
                <div className="p-2.5 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={resetAddForm}
                  className="px-4 py-2 text-xs font-mono text-stone-400 hover:text-white cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-xs font-mono font-semibold text-black bg-[#FFFFFF] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? 'SAVING...' : 'ENCRYPT & SAVE KEY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT KEY MODAL */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-lg border border-[#FFFFFF]/40 bg-[#0c0c0c] p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#FFFFFF]" />
                <h4 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">
                  Edit API Key
                </h4>
              </div>
              <button
                onClick={() => setEditingKey(null)}
                className="text-stone-400 hover:text-white font-mono text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditKey} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1">
                  Key Label
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1">
                  Current Masked Key
                </label>
                <div className="px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-stone-400">
                  {editingKey.maskedKey}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1">
                  Rotate / Replace Secret (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="Enter new sk-or-v1-... to replace"
                  value={rawKeyValue}
                  onChange={(e) => setRawKeyValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="px-4 py-2 text-xs font-mono text-stone-400 hover:text-white cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-xs font-mono font-semibold text-black bg-[#FFFFFF] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? 'UPDATING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
