import React, { useState, useEffect } from 'react';
import { AIState, ControlPanelSection } from '../types';
import { 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX,
  Sparkles,
  Sliders,
  Key,
  Database,
  AudioLines,
  Code2
} from 'lucide-react';

interface TopNavigationProps {
  currentState: AIState;
  onOpenControlPanel?: (section?: ControlPanelSection) => void;
  isWakeWordMode?: boolean;
  onStartWakeWord?: () => void;
  onStopWakeWord?: () => void;
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
  isCanvasOpen?: boolean;
  onToggleCanvas?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ 
  currentState, 
  onOpenControlPanel,
  isWakeWordMode,
  onStartWakeWord,
  onStopWakeWord,
  audioEnabled = true,
  onToggleAudio,
  isCanvasOpen = false,
  onToggleCanvas
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeString(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getStateColor = (state: AIState) => {
    switch (state) {
      case 'ERROR':
        return 'text-red-400 border-red-500/50 bg-red-950/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]';
      case 'SPEAKING':
        return 'text-[#FFFFFF] border-[#FFFFFF]/60 bg-[#FFFFFF]/20 shadow-[0_0_12px_rgba(255,255,255,0.4)]';
      case 'THINKING':
        return 'text-[#FFFFFF] border-[#FFFFFF]/40 bg-[#FFFFFF]/15';
      case 'PROCESSING':
        return 'text-[#FFFFFF] border-[#FFFFFF]/40 bg-[#FFFFFF]/15';
      case 'LISTENING':
        return 'text-[#FFFFFF] border-[#FFFFFF]/50 bg-[#FFFFFF]/20';
      case 'IDLE':
      default:
        return 'text-[#FFFFFF]/90 border-[#FFFFFF]/30 bg-[#FFFFFF]/10';
    }
  };

  return (
    <header
      id="top-hud-bar"
      className="relative z-20 w-full px-4 sm:px-8 py-3.5 flex justify-between items-end border-b border-[#FFFFFF]/30 pb-4 bg-[#050505]/80 backdrop-blur-md"
    >
      {/* Left: Brand / Title - Sleek Interface Typography */}
      <div>
        <div className="text-[10px] tracking-[0.3em] uppercase opacity-60 mb-1 text-[#FFFFFF]">
          Neural Link Established
        </div>
        <div className="flex items-baseline">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter italic text-[#FFFFFF] leading-none">
            SUPER AI
            <span className="text-xs sm:text-sm font-normal not-italic tracking-widest opacity-40 ml-2.5">
              VER 4.0.2
            </span>
          </h1>
        </div>
      </div>

      {/* Middle/Right: Sleek Telemetry Readouts */}
      <div className="flex items-center gap-6 sm:gap-10 text-right">
        <div className="hidden md:flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#FFFFFF]">
            System Integrity
          </span>
          <span className="text-sm sm:text-base font-mono text-[#FFFFFF] font-semibold">
            NOMINAL
          </span>
        </div>

        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#FFFFFF]">
            Quantum Flux
          </span>
          <span className="text-sm sm:text-base font-mono text-[#FFFFFF] font-semibold">
            1.42 THz
          </span>
        </div>

        {/* Active State Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] font-mono font-bold tracking-widest uppercase transition-all duration-300 ${getStateColor(
            currentState
          )}`}
        >
          <div className="w-2 h-2 rounded-full bg-[#FFFFFF] shadow-[0_0_8px_#FFFFFF] animate-pulse" />
          <span>{currentState}</span>
        </div>

        {/* Tactical Clock */}
        <div className="hidden lg:flex flex-col text-right font-mono">
          <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#FFFFFF]">
            Sync Time
          </span>
          <span className="text-xs sm:text-sm text-[#FFFFFF]/90">
            {timeString || '00:00:00'}
          </span>
        </div>

        {/* Action icons & Control Panel */}
        <div className="flex items-center gap-2">
          {/* Wake Word Toggle */}
          {(onStartWakeWord && onStopWakeWord) && (
            <button
              onClick={() => isWakeWordMode ? onStopWakeWord() : onStartWakeWord()}
              className={`p-1.5 sm:p-2 rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isWakeWordMode 
                  ? 'border-[#FFFFFF] bg-[#FFFFFF]/20 text-[#FFFFFF] shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                  : 'border-[#FFFFFF]/20 bg-black/40 text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:border-[#FFFFFF]/50'
              }`}
              title="Toggle Wake Word Mode (Always Listening for 'Super AI')"
            >
              <AudioLines className={`w-3.5 h-3.5 ${isWakeWordMode ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline text-[11px] font-mono tracking-wider font-semibold uppercase">
                Wake Word
              </span>
            </button>
          )}

          {/* Canvas Studio Button */}
          {onToggleCanvas && (
            <button
              id="btn-toggle-canvas"
              onClick={onToggleCanvas}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded border transition-all cursor-pointer ${
                isCanvasOpen
                  ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                  : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
              }`}
              title="Open Live Canvas Studio (Code Editor & Real-Time Preview)"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono tracking-wider font-semibold uppercase">
                CANVAS
              </span>
            </button>
          )}

          {/* Direct Memory Matrix Access */}
          {onOpenControlPanel && (
            <button
              id="btn-open-memory-matrix"
              onClick={() => onOpenControlPanel('memory')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded border border-[#FFFFFF]/30 bg-black/60 hover:bg-[#FFFFFF]/15 text-[#FFFFFF] transition-all cursor-pointer"
              title="Inspect AI Memory Matrix (Long-Term, Working, and Session)"
            >
              <Database className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span className="text-[11px] font-mono tracking-wider font-semibold uppercase">
                MEMORY
              </span>
            </button>
          )}

          {/* Admin Control Panel Button */}
          {onOpenControlPanel && (
            <button
              id="btn-open-control-panel"
              onClick={() => onOpenControlPanel('api-keys')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded border border-[#FFFFFF]/50 bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/25 text-[#FFFFFF] transition-all cursor-pointer shadow-[0_0_12px_rgba(255,255,255,0.2)]"
              title="Open Admin Control Panel (API Keys, Models, Permissions)"
            >
              <Sliders className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span className="text-[11px] font-mono tracking-wider font-semibold uppercase">
                CONTROL PANEL
              </span>
            </button>
          )}

          <button
            id="audio-toggle-btn"
            onClick={onToggleAudio}
            className="p-1.5 sm:p-2 rounded border border-[#FFFFFF]/20 bg-black/40 text-[#FFFFFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF]/50 transition-colors cursor-pointer"
            title={audioEnabled ? 'Holographic Audio Enabled' : 'Audio Muted'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-[#FFFFFF]/40" />}
          </button>

          <button
            id="fullscreen-toggle-btn"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded border border-[#FFFFFF]/20 bg-black/40 text-[#FFFFFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF]/50 transition-colors cursor-pointer hidden sm:block"
            title="Toggle Fullscreen Interface"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
