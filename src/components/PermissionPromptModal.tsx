import React from 'react';
import { Mic, ShieldAlert, Check, X, Lock } from 'lucide-react';

interface PermissionPromptModalProps {
  isOpen: boolean;
  onAllowSession: () => void;
  onAlwaysAllow: () => void;
  onDeny: () => void;
  onCancel: () => void;
}

export const PermissionPromptModal: React.FC<PermissionPromptModalProps> = ({
  isOpen,
  onAllowSession,
  onAlwaysAllow,
  onDeny,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="permission-prompt-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="permission-prompt-dialog"
        className="relative w-full max-w-md bg-[#0c0c0c] border border-[#FFFFFF]/40 rounded-xl p-5 shadow-[0_0_40px_rgba(255,255,255,0.25)] text-[#FFFFFF] font-mono"
      >
        {/* Header decoration */}
        <div className="flex items-center justify-between border-b border-[#FFFFFF]/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFFFFF]/15 border border-[#FFFFFF]/40 flex items-center justify-center text-[#FFFFFF]">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs tracking-widest font-bold uppercase text-[#FFFFFF]">
                Security Policy Clearance
              </h2>
              <p className="text-[10px] text-[#FFFFFF]/60">PROTOCOL: ACOUSTIC_RECEPTOR_ACCESS</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[#FFFFFF]/40 hover:text-[#FFFFFF] p-1 rounded hover:bg-[#FFFFFF]/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="space-y-3 mb-5 text-xs">
          <div className="flex items-start gap-3 p-3 bg-black/60 border border-[#FFFFFF]/20 rounded-lg">
            <Mic className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#FFFFFF] mb-1">
                Microphone Permission Requested (ASK Mode)
              </p>
              <p className="text-[11px] text-[#FFFFFF]/70 leading-relaxed">
                Super AI is requesting permission to activate your acoustic receptor (microphone) to transcribe live voice input into commands.
              </p>
            </div>
          </div>

          <p className="text-[10px] text-[#FFFFFF]/50 italic">
            Note: System permission policies protect your hardware. Operating-system & browser permissions will also be requested upon activation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            id="perm-allow-session-btn"
            onClick={onAllowSession}
            className="w-full py-2.5 px-3 bg-[#FFFFFF]/20 hover:bg-[#FFFFFF]/30 border border-[#FFFFFF]/60 hover:border-[#FFFFFF] text-[#FFFFFF] rounded font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ALLOW FOR THIS SESSION</span>
          </button>

          <button
            id="perm-always-allow-btn"
            onClick={onAlwaysAllow}
            className="w-full py-2 px-3 bg-black/60 hover:bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 hover:border-[#FFFFFF]/60 text-[#FFFFFF]/90 rounded text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>ALWAYS ALLOW (PERSIST POLICY)</span>
          </button>

          <div className="flex gap-2 pt-1">
            <button
              id="perm-deny-btn"
              onClick={onDeny}
              className="flex-1 py-1.5 px-3 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-600/40 hover:border-rose-500 text-rose-300 rounded text-[11px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>DENY ACCESS</span>
            </button>

            <button
              id="perm-cancel-btn"
              onClick={onCancel}
              className="py-1.5 px-4 bg-transparent hover:bg-white/5 border border-[#FFFFFF]/20 text-[#FFFFFF]/60 hover:text-[#FFFFFF] rounded text-[11px] tracking-wider uppercase transition-all cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
