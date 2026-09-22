import React from 'react';
import { PendingToolAuthorization, ToolRiskLevel } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Check,
  X,
  Lock,
  Code2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface ToolAuthorizationModalProps {
  isOpen: boolean;
  pendingAuth: PendingToolAuthorization | null;
  onApprove: () => void;
  onAuthorizeSession: () => void;
  onAuthorizeTask?: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export const ToolAuthorizationModal: React.FC<ToolAuthorizationModalProps> = ({
  isOpen,
  pendingAuth,
  onApprove,
  onAuthorizeSession,
  onAuthorizeTask,
  onReject,
  onCancel,
}) => {
  if (!isOpen || !pendingAuth) return null;

  const isAutonomousTask = Boolean(pendingAuth.isAutonomousTask);

  const getRiskBadge = (risk: ToolRiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-950/90 border border-red-700 text-red-300 font-bold uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse">
            <ShieldX className="w-3 h-3" /> CRITICAL RISK
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-orange-950/90 border border-orange-700 text-orange-300 font-bold uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(249,115,22,0.4)]">
            <AlertTriangle className="w-3 h-3" /> HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-950/90 border border-amber-600 text-amber-300 uppercase flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> MEDIUM RISK
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950/90 border border-emerald-700 text-emerald-300 uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> LOW RISK
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-stone-900 border border-stone-800 text-stone-400 uppercase">
            SAFE
          </span>
        );
    }
  };

  const formattedArgs = JSON.stringify(pendingAuth.arguments || {}, null, 2);

  return (
    <div
      id="tool-auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn select-text"
    >
      <div
        id="tool-auth-modal-dialog"
        className="relative w-full max-w-lg bg-[#0a0a0a] border-2 border-amber-500/60 rounded-xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-[#FFFFFF] font-mono"
      >
        {/* Radar / Alert pulse line on top */}
        <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm tracking-widest font-bold uppercase text-amber-300 flex items-center gap-2">
                {isAutonomousTask ? 'Task Step Authorization' : 'Tool Execution Authorization'}
              </h2>
              <p className="text-[10px] text-amber-400/70 font-mono tracking-wider">
                {isAutonomousTask
                  ? `AUTONOMOUS TASK [${pendingAuth.taskId || 'ACTIVE'}] • STEP #${pendingAuth.stepId || 1}`
                  : 'SECURITY GATE PROTOCOL: REQUIRE_USER_CLEARANCE'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-stone-500 hover:text-amber-300 p-1 rounded hover:bg-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="space-y-3.5 mb-5 text-xs">
          {/* Tool Identity Card */}
          <div className="p-3 bg-black/80 border border-amber-500/30 rounded-lg space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm tracking-wide">
                  {pendingAuth.toolName}
                </span>
                <span className="text-[10px] text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/60">
                  {pendingAuth.tool}
                </span>
              </div>
              {getRiskBadge(pendingAuth.risk)}
            </div>

            <div className="text-[11px] text-stone-300 leading-relaxed font-sans">
              {pendingAuth.actionDescription}
            </div>

            <div className="text-[10px] text-amber-400/70 flex items-center gap-1.5 pt-1 border-t border-stone-800">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Governing Permission: <strong className="text-amber-300">{pendingAuth.requiredPermission}</strong></span>
            </div>
          </div>

          {/* Tool Arguments Inspector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-stone-400 uppercase tracking-wider">
              <span className="flex items-center gap-1 text-amber-300">
                <Code2 className="w-3 h-3" />
                Execution Parameters
              </span>
              <span className="text-stone-500 font-mono">JSON PAYLOAD</span>
            </div>
            <pre className="p-2.5 bg-[#050505] border border-stone-800 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap select-text">
              {formattedArgs}
            </pre>
          </div>

          {/* Security Notice */}
          <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-400/80 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              The Super AI Orchestrator paused model generation until you authorize this function call. If denied, the model receives a security refusal.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Option 1: Allow once */}
          <button
            id="tool-auth-approve-btn"
            onClick={onApprove}
            className="w-full py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 hover:border-amber-300 text-amber-300 rounded font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            <Check className="w-4 h-4" />
            <span>{isAutonomousTask ? 'ALLOW ONCE (STEP ONLY)' : 'AUTHORIZE & EXECUTE ONCE'}</span>
          </button>

          {/* Option 2: Allow for this task / Allow in session */}
          <button
            id="tool-auth-task-btn"
            onClick={isAutonomousTask && onAuthorizeTask ? onAuthorizeTask : onAuthorizeSession}
            className="w-full py-2 px-3 bg-black/60 hover:bg-amber-500/10 border border-stone-700 hover:border-amber-500/60 text-stone-300 hover:text-amber-300 rounded text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAutonomousTask ? 'ALLOW FOR THIS TASK' : 'ALWAYS ALLOW THIS TOOL IN CURRENT SESSION'}</span>
          </button>

          {/* Option 3: Deny / Cancel */}
          <div className="flex gap-2 pt-1">
            <button
              id="tool-auth-reject-btn"
              onClick={onReject}
              className="flex-1 py-1.5 px-3 bg-red-950/50 hover:bg-red-950/80 border border-red-700/60 hover:border-red-500 text-red-300 rounded text-[11px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isAutonomousTask ? 'DENY (STOP TASK)' : 'DENY ACTION'}</span>
            </button>

            <button
              id="tool-auth-cancel-btn"
              onClick={onCancel}
              className="px-4 py-1.5 bg-black/40 hover:bg-stone-900 border border-stone-800 text-stone-400 hover:text-white rounded text-[11px] tracking-wider uppercase transition-all cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
