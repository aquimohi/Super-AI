import React from 'react';
import { AIState } from '../types';
import { 
  Play, 
  Mic, 
  BrainCircuit, 
  Cpu, 
  Volume2, 
  AlertTriangle,
  ShieldAlert,
  Terminal,
} from 'lucide-react';

interface StateControllerProps {
  currentState: AIState;
  onStateChange: (state: AIState) => void;
}

interface StateButtonConfig {
  id: AIState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  desc: string;
}

const STATES: StateButtonConfig[] = [
  { id: 'IDLE', label: 'IDLE', icon: Play, hotkey: '1', desc: 'Slow rotation, low particle activity, gentle breathing pulse' },
  { id: 'LISTENING', label: 'LISTEN', icon: Mic, hotkey: '2', desc: 'Active particles, acoustic ear sensors, expanding holographic rings' },
  { id: 'THINKING', label: 'THINK', icon: BrainCircuit, hotkey: '3', desc: 'Neural circuit pulse, eye glow intensification, orbital acceleration' },
  { id: 'PROCESSING', label: 'PROCESS', icon: Cpu, hotkey: '4', desc: 'Vertical holographic laser scan across facial geometry' },
  { id: 'EXECUTING', label: 'EXECUTE', icon: Terminal, hotkey: '5', desc: 'Autonomous tool execution, cyan/amber neural surge & telemetry lock' },
  { id: 'SPEAKING', label: 'SPEAK', icon: Volume2, hotkey: '6', desc: 'Harmonic vocal waves, mouth visualizer reaction & radiating wavefronts' },
  { id: 'AUTHORIZATION', label: 'AUTH', icon: ShieldAlert, hotkey: '7', desc: 'Tool clearance gate & security biometric radar scan' },
  { id: 'ERROR', label: 'ERROR', icon: AlertTriangle, hotkey: '8', desc: 'Glitch distortion, chromatic aberration & particle displacement' },
];

export const StateController: React.FC<StateControllerProps> = ({
  currentState,
  onStateChange,
}) => {
  return (
    <div
      id="state-controller"
      className="hud-panel rounded-xl p-2 sm:p-2.5 border border-[#FFFFFF]/20 bg-black/50 backdrop-blur-xl shadow-2xl transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF] shadow-[0_0_6px_#FFFFFF] animate-pulse" />
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#FFFFFF] font-semibold uppercase opacity-70">
            Core State Matrix
          </span>
        </div>
        <span className="text-[9px] font-mono text-[#FFFFFF]/40 hidden sm:inline">
          CORE STATES [1-7]
        </span>
      </div>

      {/* State Switcher Buttons: Sleek Interface minimal pill design */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {STATES.map((s) => {
          const isActive = currentState === s.id;
          const Icon = s.icon;
          const isError = s.id === 'ERROR';
          const isAuth = s.id === 'AUTHORIZATION';

          return (
            <button
              key={s.id}
              id={`state-btn-${s.id.toLowerCase()}`}
              onClick={() => onStateChange(s.id)}
              title={s.desc}
              className={`group flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded border text-[9px] sm:text-[10px] uppercase tracking-widest font-mono transition-all duration-200 cursor-pointer ${
                isActive
                  ? isError
                    ? 'bg-red-950/70 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)] font-bold'
                    : isAuth
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold animate-pulse'
                    : 'bg-[#FFFFFF]/20 border-[#FFFFFF]/60 text-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.3)] font-bold'
                  : isError
                  ? 'border-red-500/20 text-red-400/60 hover:text-red-300 hover:bg-red-500/10'
                  : isAuth
                  ? 'border-amber-500/20 text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10'
                  : 'border-[#FFFFFF]/20 bg-black/40 text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:border-[#FFFFFF]/40 hover:bg-[#FFFFFF]/10'
              }`}
            >
              <Icon
                className={`w-3 h-3 transition-transform group-hover:scale-110 ${
                  isActive
                    ? isError
                      ? 'text-red-400'
                      : isAuth
                      ? 'text-amber-300'
                      : 'text-[#FFFFFF] animate-pulse'
                    : ''
                }`}
              />
              <span>{s.label}</span>
              <span className="text-[8px] opacity-40">[{s.hotkey}]</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
