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
  Database
} from 'lucide-react';

interface TopNavigationProps {
  currentState: AIState;
  onOpenControlPanel?: (section?: ControlPanelSection) => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ currentState, onOpenControlPanel }) => {
  const [timeString, setTimeString] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

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
        return 'text-[#F2A900] border-[#F2A900]/60 bg-[#F2A900]/20 shadow-[0_0_12px_rgba(242,169,0,0.4)]';
      case 'THINKING':
        return 'text-[#F2A900] border-[#F2A900]/40 bg-[#F2A900]/15';
      case 'PROCESSING':
        return 'text-[#F2A900] border-[#F2A900]/40 bg-[#F2A900]/15';
      case 'LISTENING':
        return 'text-[#F2A900] border-[#F2A900]/50 bg-[#F2A900]/20';
      case 'IDLE':
      default:
        return 'text-[#F2A900]/90 border-[#F2A900]/30 bg-[#F2A900]/10';
    }
  };

  return (
    <header
      id="top-hud-bar"
      className="relative z-20 w-full px-4 sm:px-8 py-3.5 flex justify-between items-end border-b border-[#F2A900]/30 pb-4 bg-[#050505]/80 backdrop-blur-md"
    >
      {/* Left: Brand / Title - Sleek Interface Typography */}
      <div>
        <div className="text-[10px] tracking-[0.3em] uppercase opacity-60 mb-1 text-[#F2A900]">
          Neural Link Established
        </div>
        <div className="flex items-baseline">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter italic text-[#F2A900] leading-none">
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
          <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#F2A900]">
            System Integrity
          </span>
          <span className="text-sm sm:text-base font-mono text-[#F2A900] font-semibold">
            NOMINAL
          </span>
        </div>

        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#F2A900]">
            Quantum Flux
          </span>
          <span className="text-sm sm:text-base font-mono text-[#F2A900] font-semibold">
            1.42 THz
          </span>
        </div>

        {/* Active State Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] font-mono font-bold tracking-widest uppercase transition-all duration-300 ${getStateColor(
            currentState
          )}`}
        >
          <div className="w-2 h-2 rounded-full bg-[#F2A900] shadow-[0_0_8px_#F2A900] animate-pulse" />
          <span>{currentState}</span>
        </div>

        {/* Tactical Clock */}
        <div className="hidden lg:flex flex-col text-right font-mono">
          <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#F2A900]">
            Sync Time
          </span>
          <span className="text-xs sm:text-sm text-[#F2A900]/90">
            {timeString || '00:00:00'}
          </span>
        </div>

        {/* Action icons & Control Panel */}
        <div className="flex items-center gap-2">
          {/* Direct Memory Matrix Access */}
          {onOpenControlPanel && (
            <button
              id="btn-open-memory-matrix"
              onClick={() => onOpenControlPanel('memory')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded border border-[#F2A900]/30 bg-black/60 hover:bg-[#F2A900]/15 text-[#F2A900] transition-all cursor-pointer"
              title="Inspect AI Memory Matrix (Long-Term, Working, and Session)"
            >
              <Database className="w-3.5 h-3.5 text-[#F2A900]" />
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
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded border border-[#F2A900]/50 bg-[#F2A900]/10 hover:bg-[#F2A900]/25 text-[#F2A900] transition-all cursor-pointer shadow-[0_0_12px_rgba(242,169,0,0.2)]"
              title="Open Admin Control Panel (API Keys, Models, Permissions)"
            >
              <Sliders className="w-3.5 h-3.5 text-[#F2A900]" />
              <span className="text-[11px] font-mono tracking-wider font-semibold uppercase">
                CONTROL PANEL
              </span>
            </button>
          )}

          <button
            id="audio-toggle-btn"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1.5 sm:p-2 rounded border border-[#F2A900]/20 bg-black/40 text-[#F2A900] hover:text-[#F2A900] hover:border-[#F2A900]/50 transition-colors cursor-pointer"
            title={audioEnabled ? 'Holographic Audio Enabled' : 'Audio Muted'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-[#F2A900]/40" />}
          </button>

          <button
            id="fullscreen-toggle-btn"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded border border-[#F2A900]/20 bg-black/40 text-[#F2A900] hover:text-[#F2A900] hover:border-[#F2A900]/50 transition-colors cursor-pointer hidden sm:block"
            title="Toggle Fullscreen Interface"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
