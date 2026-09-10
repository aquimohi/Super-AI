import React, { useState, useEffect } from 'react';
import {
  AutonomousTaskConfig,
  TaskPlanSummary,
  JudgeMode,
} from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Workflow,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AutonomousTaskSectionProps {
  conversationId?: string;
  onRefresh?: () => void;
}

export const AutonomousTaskSection: React.FC<AutonomousTaskSectionProps> = ({
  conversationId,
}) => {
  const [config, setConfig] = useState<AutonomousTaskConfig>({
    enabled: true,
    maxSteps: 8,
    retryPerStep: 1,
    judgeVerification: 'AUTO',
    authorization: 'REQUIRED',
  });
  const [currentTask, setCurrentTask] = useState<TaskPlanSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTaskState = async () => {
    try {
      const [fetchedConfig, fetchedTask] = await Promise.all([
        apiClient.getAutonomousTaskConfig(),
        apiClient.getCurrentTask(conversationId),
      ]);
      if (fetchedConfig) setConfig(fetchedConfig);
      setCurrentTask(fetchedTask);
    } catch (err: any) {
      console.error('Failed to load task engine state:', err);
    }
  };

  useEffect(() => {
    fetchTaskState();
    const interval = setInterval(fetchTaskState, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleUpdate = async (updates: Partial<AutonomousTaskConfig>) => {
    setSaving(true);
    try {
      const updated = await apiClient.updateAutonomousTaskConfig(updates);
      setConfig(updated);
      setStatusMessage('Autonomous Task Engine settings saved.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (taskId: string) => {
    setLoading(true);
    try {
      await apiClient.pauseTask(taskId);
      await fetchTaskState();
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (taskId: string) => {
    setLoading(true);
    try {
      await apiClient.resumeTask(taskId);
      await fetchTaskState();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (taskId: string) => {
    setLoading(true);
    try {
      await apiClient.cancelTask(taskId);
      await fetchTaskState();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-lg flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 mt-1">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-cyan-300">
                Autonomous Task Engine V1
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CONTROLLED MULTI-STEP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Decomposes complex goals into at most 8 sequential executable steps.
              Strictly integrated with the tool permission engine, skills registry, and verification judge.
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-autonomous-task-engine"
            onClick={() => handleUpdate({ enabled: !config.enabled })}
            disabled={saving}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
              config.enabled
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {config.enabled ? 'ENGINE: ACTIVE' : 'ENGINE: DISABLED'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-cyan-900/30 border border-cyan-500/40 rounded text-xs text-cyan-200">
          {statusMessage}
        </div>
      )}

      {/* Engine Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Maximum Steps */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Maximum Steps Limit
            </label>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {config.maxSteps} Steps (Ceiling: 8)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Enforces a hard boundary. If a plan requires more than 8 steps, the engine stops and requires user confirmation.
          </p>
          <div className="flex gap-2 pt-1">
            {[4, 6, 8].map((val) => (
              <button
                key={val}
                onClick={() => handleUpdate({ maxSteps: val })}
                className={`flex-1 py-1 text-xs font-mono rounded border ${
                  config.maxSteps === val
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {val} Steps
              </button>
            ))}
          </div>
        </div>

        {/* Retry Per Step */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Retry Per Step
            </label>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {config.retryPerStep} Retry Max
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            If an individual step fails, it retries at most once. If it fails again, execution safely halts. Infinite loops are strictly prohibited.
          </p>
          <div className="flex gap-2 pt-1">
            {[0, 1].map((val) => (
              <button
                key={val}
                onClick={() => handleUpdate({ retryPerStep: val })}
                className={`flex-1 py-1 text-xs font-mono rounded border ${
                  config.retryPerStep === val
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {val === 0 ? 'No Retry' : '1 Safe Retry'}
              </button>
            ))}
          </div>
        </div>

        {/* Judge Verification Mode */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Judge Verification
            </label>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {config.judgeVerification}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Evaluates final deductions against user objectives and initiates at most one specialist revision loop.
          </p>
          <div className="flex gap-2 pt-1">
            {(['AUTO', 'ALWAYS', 'OFF'] as JudgeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleUpdate({ judgeVerification: mode })}
                className={`flex-1 py-1 text-xs font-mono rounded border ${
                  config.judgeVerification === mode
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Authorization Policy */}
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Authorization Gate
            </label>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              ALWAYS REQUIRED
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Autonomous engine cannot bypass permissions. Tools with ASK policy will pause execution and request user approval.
          </p>
          <div className="p-1.5 bg-emerald-950/20 border border-emerald-500/30 rounded text-[11px] text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Zero-Bypass Policy Enforced</span>
          </div>
        </div>
      </div>

      {/* Active Task Monitor */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono uppercase font-bold text-slate-300">
              Active Task Monitor
            </h4>
          </div>
          {currentTask && (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  currentTask.state === 'RECOVERING'
                    ? 'bg-amber-600/30 text-amber-200 border border-amber-500/60 animate-pulse'
                    : currentTask.state === 'EXECUTING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : currentTask.state === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : currentTask.state === 'FAILED'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : currentTask.state === 'CANCELLED'
                    ? 'bg-slate-700 text-slate-300 border border-slate-600'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {currentTask.state}
              </span>
            </div>
          )}
        </div>

        {currentTask ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">
                TASK ID: <strong className="text-cyan-300">{currentTask.taskId}</strong>
              </span>
              <span className="text-slate-400 font-mono">
                PROGRESS: {currentTask.currentStepIndex} / {currentTask.totalSteps} STEPS
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded text-xs text-slate-200">
              <span className="text-slate-400 font-mono">GOAL: </span>
              {currentTask.goal}
            </div>

            {/* Task Controls: PAUSE, RESUME, CANCEL */}
            <div className="flex items-center gap-2 pt-1">
              {currentTask.state === 'EXECUTING' && (
                <button
                  id="btn-pause-task"
                  onClick={() => handlePause(currentTask.taskId)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-xs font-mono hover:bg-amber-500/30"
                >
                  <Pause className="w-3.5 h-3.5" />
                  PAUSE TASK
                </button>
              )}

              {currentTask.state === 'WAITING_AUTHORIZATION' && (
                <button
                  id="btn-resume-task"
                  onClick={() => handleResume(currentTask.taskId)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono hover:bg-cyan-500/30"
                >
                  <Play className="w-3.5 h-3.5" />
                  RESUME TASK
                </button>
              )}

              {currentTask.state !== 'COMPLETED' &&
                currentTask.state !== 'CANCELLED' &&
                currentTask.state !== 'FAILED' && (
                  <button
                    id="btn-cancel-task"
                    onClick={() => handleCancel(currentTask.taskId)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-xs font-mono hover:bg-red-500/30"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    CANCEL TASK
                  </button>
                )}
            </div>

            {/* Step List */}
            <div className="space-y-1.5 pt-2">
              {currentTask.steps.map((step) => (
                <div
                  key={step.id}
                  className={`p-2 rounded border text-xs flex items-center justify-between ${
                    step.status === 'COMPLETED'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : step.status === 'EXECUTING'
                      ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200 animate-pulse'
                      : step.status === 'FAILED'
                      ? 'bg-red-950/20 border-red-500/30 text-red-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-400">
                      #{step.id}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {step.skill}
                    </span>
                    <span>{step.description}</span>
                  </div>
                  <span className="font-mono text-[11px] uppercase">
                    {step.status || 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            No autonomous task currently running. Engine is in IDLE state.
          </div>
        )}
      </div>

      {/* Strict Security Guardrails Card */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2">
        <h4 className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Autonomous Security Guardrails
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
          <div className="p-1.5 bg-slate-950/50 border border-slate-800 rounded text-slate-400">
            Shell Commands: <span className="text-red-400 font-bold">BLOCKED</span>
          </div>
          <div className="p-1.5 bg-slate-950/50 border border-slate-800 rounded text-slate-400">
            PowerShell: <span className="text-red-400 font-bold">BLOCKED</span>
          </div>
          <div className="p-1.5 bg-slate-950/50 border border-slate-800 rounded text-slate-400">
            Arbitrary JS: <span className="text-red-400 font-bold">BLOCKED</span>
          </div>
          <div className="p-1.5 bg-slate-950/50 border border-slate-800 rounded text-slate-400">
            Credential Access: <span className="text-red-400 font-bold">BLOCKED</span>
          </div>
          <div className="p-1.5 bg-slate-950/50 border border-slate-800 rounded text-slate-400">
            Personal Browser: <span className="text-red-400 font-bold">BLOCKED</span>
          </div>
          <div className="p-1.5 bg-slate-950/50 border border-slate-800 rounded text-slate-400">
            Unrestricted Paths: <span className="text-red-400 font-bold">BLOCKED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
