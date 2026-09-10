import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  History,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Trash2,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { RecoveryObservabilityConfig, TaskHistoryItem } from '../../types';

interface Props {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const FAILURE_MATRIX = [
  { category: 'NETWORK_ERROR', strategy: 'RETRY_NETWORK', desc: 'Transient network failure detected. Retries once with clean connection.' },
  { category: 'RATE_LIMIT', strategy: 'FAILOVER_MODEL', desc: '429 or quota exhausted. Triggers fallback model or next available API key.' },
  { category: 'TIMEOUT', strategy: 'RETRY_ONCE', desc: 'Step execution timed out. Retries once safely.' },
  { category: 'TOOL_UNAVAILABLE', strategy: 'SWITCH_ALTERNATIVE_TOOL', desc: 'Primary tool offline. Switches to permitted alternative (e.g., search -> browser).' },
  { category: 'INVALID_ARGUMENT', strategy: 'PLANNER_CORRECT_ARGUMENTS', desc: 'Malformed argument format. Planner automatically repairs parameters.' },
  { category: 'BROWSER_ERROR', strategy: 'RETRY_ONCE', desc: 'Browser automation target error. Cleans state and retries once.' },
  { category: 'WINDOWS_ACTION_ERROR', strategy: 'RETRY_ONCE', desc: 'System app execution glitch. Retries application launch once.' },
  { category: 'SKILL_DISABLED', strategy: 'STOP_INFORM_USER', desc: 'Required skill is disabled. Halts immediately and requests user enablement.' },
  { category: 'AUTHORIZATION_DENIED', strategy: 'STOP_AUTHORIZATION_DENIED', desc: 'Permission denied by user. Halts task immediately and protects system.' },
  { category: 'API_ERROR', strategy: 'RETRY_ONCE', desc: 'Upstream 500/502/503. Retries once before safe termination.' },
  { category: 'UNKNOWN_ERROR', strategy: 'STOP_SAFE', desc: 'Unrecognized exception. Safely halts without looping.' },
];

export const RecoveryObservabilitySection: React.FC<Props> = ({ onNotify }) => {
  const [config, setConfig] = useState<RecoveryObservabilityConfig>({
    enabled: true,
    maxRecoveryAttempts: 3,
    retryFailedNetworkRequests: true,
    logTraceObservability: true,
    autoAlternativeTools: true,
    failoverOnRateLimit: true,
  });
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    fetchConfigAndHistory();
  }, []);

  const fetchConfigAndHistory = async () => {
    try {
      setLoading(true);
      const [cfgRes, histRes] = await Promise.all([
        fetch('/api/tasks/recovery/config'),
        fetch('/api/tasks/history'),
      ]);
      const cfgData = await cfgRes.json();
      const histData = await histRes.json();

      if (cfgData.success && cfgData.config) {
        setConfig(cfgData.config);
      }
      if (histData.success && histData.history) {
        setHistory(histData.history);
      }
    } catch (err: any) {
      console.error('Failed to load recovery settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<RecoveryObservabilityConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    setSaving(true);
    try {
      const res = await fetch('/api/tasks/recovery/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        if (onNotify) onNotify('Recovery & Observability configuration saved', 'success');
      }
    } catch (err: any) {
      if (onNotify) onNotify('Failed to save configuration: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/tasks/history/clear', { method: 'POST' });
      setHistory([]);
      if (onNotify) onNotify('Task history cleared', 'info');
    } catch (err: any) {
      if (onNotify) onNotify('Failed to clear history: ' + err.message, 'error');
    }
  };

  const runScenario = async (name: string, payload: any) => {
    setRunningTest(name);
    setTestResult(null);
    try {
      const res = await fetch('/api/tasks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResult(data.result || data);
      await fetchConfigAndHistory();
      if (onNotify) onNotify(`Scenario "${name}" finished`, 'success');
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      if (onNotify) onNotify(`Scenario failed: ${err.message}`, 'error');
    } finally {
      setRunningTest(null);
    }
  };

  return (
    <div id="recovery-observability-section" className="space-y-6 text-sm text-cyan-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <RotateCcw className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-cyan-300 uppercase tracking-wider">
              Autonomous Recovery & Observability Engine
            </h2>
            <p className="text-xs text-cyan-400/60">
              Deterministic failure detection, safe retry limits, live step telemetry, and audit logging
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded border ${
            config.enabled
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
              : 'bg-red-950/60 text-red-400 border-red-500/40'
          }`}>
            {config.enabled ? 'RECOVERY ACTIVE' : 'RECOVERY DISABLED'}
          </span>
        </div>
      </div>

      {/* Primary Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Settings */}
        <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-200">Recovery Engine Master Switch</span>
            <input
              type="checkbox"
              id="toggle-recovery-enabled"
              checked={config.enabled}
              onChange={(e) => handleUpdateConfig({ enabled: e.target.checked })}
              className="toggle-checkbox"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
            <div>
              <div className="font-medium text-cyan-200">Max Recovery Attempts Per Task</div>
              <div className="text-xs text-cyan-400/60">Hard safety ceiling. Task halts safely once reached.</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="5"
                value={config.maxRecoveryAttempts}
                onChange={(e) =>
                  handleUpdateConfig({
                    maxRecoveryAttempts: Math.min(5, Math.max(1, parseInt(e.target.value) || 3)),
                  })
                }
                className="w-16 bg-cyan-950/60 border border-cyan-500/30 rounded px-2 py-1 text-center font-mono text-cyan-300"
              />
              <span className="text-xs text-cyan-400/50">Attempts</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
            <div>
              <div className="font-medium text-cyan-200">Retry Failed Network Requests</div>
              <div className="text-xs text-cyan-400/60">Automatic 1x retry on ECONNRESET / timeout</div>
            </div>
            <input
              type="checkbox"
              id="toggle-retry-network"
              checked={config.retryFailedNetworkRequests}
              onChange={(e) => handleUpdateConfig({ retryFailedNetworkRequests: e.target.checked })}
              className="toggle-checkbox"
            />
          </div>
        </div>

        {/* Intelligence & Fallback Switches */}
        <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-cyan-200">Alternative Tool Switching</div>
              <div className="text-xs text-cyan-400/60">Auto-switch to allowed alternative tool if offline</div>
            </div>
            <input
              type="checkbox"
              id="toggle-alt-tools"
              checked={config.autoAlternativeTools}
              onChange={(e) => handleUpdateConfig({ autoAlternativeTools: e.target.checked })}
              className="toggle-checkbox"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
            <div>
              <div className="font-medium text-cyan-200">Failover on Model Rate Limit (429)</div>
              <div className="text-xs text-cyan-400/60">Auto-rotate to backup API key or fallback model</div>
            </div>
            <input
              type="checkbox"
              id="toggle-rate-limit-failover"
              checked={config.failoverOnRateLimit}
              onChange={(e) => handleUpdateConfig({ failoverOnRateLimit: e.target.checked })}
              className="toggle-checkbox"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
            <div>
              <div className="font-medium text-cyan-200">Log Live Telemetry Traces</div>
              <div className="text-xs text-cyan-400/60">Emits [TASK], [TOOL], [RECOVERY], [RESULT] events</div>
            </div>
            <input
              type="checkbox"
              id="toggle-log-traces"
              checked={config.logTraceObservability}
              onChange={(e) => handleUpdateConfig({ logTraceObservability: e.target.checked })}
              className="toggle-checkbox"
            />
          </div>
        </div>
      </div>

      {/* Deterministic Failure Classification Matrix */}
      <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-cyan-200 uppercase tracking-wider text-xs">
            Deterministic Recovery Strategy Matrix (Safe Bound Rules)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {FAILURE_MATRIX.map((item) => (
            <div
              key={item.category}
              className="bg-cyan-950/30 border border-cyan-500/20 rounded p-2.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono font-bold text-cyan-300">{item.category}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                  {item.strategy}
                </span>
              </div>
              <p className="text-cyan-400/70 text-[11px] leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Verification Test Bench */}
      <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-cyan-200 uppercase tracking-wider text-xs">
              Deterministic Verification Test Bench (Phase 9 Scenarios)
            </h3>
          </div>
          {runningTest && (
            <span className="text-xs font-mono text-amber-300 animate-pulse">
              Executing Scenario: {runningTest}...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <button
            id="btn-test-normal"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Normal Multi-Step', {
                userPrompt: 'Open Google and search for Super AI autonomous architecture',
                taskScopedAuthorization: true,
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">1. Normal Task</div>
            <div className="text-[10px] text-cyan-400/60">Clean multi-step</div>
          </button>

          <button
            id="btn-test-network-failure"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Network Failure Once', {
                userPrompt: 'Research quantum neural architectures and give me a summary',
                taskScopedAuthorization: true,
                simulationFlags: { networkFailureOnce: true },
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">2. Network Failure</div>
            <div className="text-[10px] text-cyan-400/60">Simulate 1x retry</div>
          </button>

          <button
            id="btn-test-repeated-failure"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Repeated Failure', {
                userPrompt: 'Search for recent machine learning papers and summarize',
                taskScopedAuthorization: true,
                simulationFlags: { repeatedFailure: true },
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">3. Repeated Failure</div>
            <div className="text-[10px] text-cyan-400/60">Budget exhausted (Safe)</div>
          </button>

          <button
            id="btn-test-invalid-args"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Invalid Arguments', {
                userPrompt: 'Open Google and search for latest AI research',
                taskScopedAuthorization: true,
                simulationFlags: { invalidArgumentOnce: true },
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">4. Invalid Args</div>
            <div className="text-[10px] text-cyan-400/60">Planner correction</div>
          </button>

          <button
            id="btn-test-auth-denied"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Authorization Denied', {
                userPrompt: 'Launch notepad and write my daily agenda',
                simulationFlags: { authorizationDenied: true },
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-amber-950/50 border border-amber-500/30 text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">5. Auth Denied</div>
            <div className="text-[10px] text-amber-400/60">Step permission blocked</div>
          </button>

          <button
            id="btn-test-skill-disabled"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Skill Disabled', {
                userPrompt: 'Open Chrome and navigate to github.com',
                taskScopedAuthorization: true,
                simulationFlags: { skillDisabled: true },
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-amber-950/50 border border-amber-500/30 text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">6. Skill Disabled</div>
            <div className="text-[10px] text-amber-400/60">Control Panel notice</div>
          </button>

          <button
            id="btn-test-judge-revision"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Judge Rejection', {
                userPrompt: 'Compare Transformer and Mamba architectures in detail',
                taskScopedAuthorization: true,
                simulationFlags: { judgeRejectionOnce: true },
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">7. Judge Revision</div>
            <div className="text-[10px] text-cyan-400/60">1x revision cycle</div>
          </button>

          <button
            id="btn-test-cancel-command"
            disabled={Boolean(runningTest)}
            onClick={() =>
              runScenario('Voice Cancel', {
                userPrompt: 'task cancel karo',
              })
            }
            className="px-3 py-2 text-xs font-medium rounded bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/40 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-[11px]">8. Voice/Text Cancel</div>
            <div className="text-[10px] text-red-400/60">Immediate HALT</div>
          </button>
        </div>

        {testResult && (
          <div className="mt-3 p-3 rounded bg-black/60 border border-cyan-500/30 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyan-400 font-bold">Scenario Result:</span>
              <span className={`px-2 py-0.5 rounded uppercase ${
                testResult.state === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  : testResult.state === 'CANCELLED'
                  ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                  : 'bg-red-950 text-red-400 border border-red-500/40'
              }`}>
                {testResult.state || (testResult.success ? 'SUCCESS' : 'FAILED')}
              </span>
            </div>
            <div className="text-cyan-200 whitespace-pre-wrap">{testResult.text}</div>
            {testResult.traces && (
              <div className="border-t border-cyan-500/20 pt-2 text-[10px] text-cyan-400/70 space-y-0.5">
                <div className="font-semibold text-cyan-300">Live Traces:</div>
                {testResult.traces.slice(-4).map((t: any) => (
                  <div key={t.id} className="truncate">
                    [{t.agent}] {t.action}: {t.detail}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact Task History */}
      <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-cyan-200 uppercase tracking-wider text-xs">
              Compact Task History View ({history.length})
            </h3>
          </div>
          {history.length > 0 && (
            <button
              id="btn-clear-task-history"
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-xs text-red-400/80 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-6 text-cyan-400/40 text-xs font-mono">
            No autonomous tasks executed yet in this session.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-cyan-950/20 border border-cyan-500/20 rounded p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold">{item.taskId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'CANCELLED'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                          : 'bg-red-950/80 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.recoveryCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                        {item.recoveryCount} {item.recoveryCount === 1 ? 'Recovery' : 'Recoveries'} Used
                      </span>
                    )}
                  </div>
                  <div className="text-cyan-100 font-medium truncate max-w-xl">{item.taskGoal}</div>
                  <div className="text-cyan-400/60 text-[11px] truncate max-w-xl">{item.finalResult}</div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between text-[11px] font-mono text-cyan-400/60 whitespace-nowrap">
                  <div>{item.stepsCompleted}/{item.totalSteps} Steps Completed</div>
                  <div>{item.durationSeconds}s Duration</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
