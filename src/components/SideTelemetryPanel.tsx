import React, { useState, useEffect } from 'react';
import { AIState, CognitiveTraceEvent } from '../types';
import { subscribeSpeechState } from '../utils/speech';
import { 
  Zap, 
  Activity, 
  Layers, 
  RotateCw, 
  Sparkles, 
  Wifi, 
  ChevronLeft, 
  ChevronRight,
  Gauge,
  Brain
} from 'lucide-react';

interface SideTelemetryPanelProps {
  state: AIState;
  collapsed: boolean;
  onToggleCollapse: () => void;
  latestTrace?: CognitiveTraceEvent[];
}

const STATE_DETAILS: Record<
  AIState,
  {
    title: string;
    description: string;
    rotationRate: string;
    particleFlow: string;
    hologramWave: string;
    coherence: string;
    flux: string;
  }
> = {
  IDLE: {
    title: 'STANDBY MATRIX',
    description: 'Quantum core in low-energy equilibrium. Ambient harmonic breathing cycle active.',
    rotationRate: '0.50x RAD/S',
    particleFlow: 'LOW (140 VTX/S)',
    hologramWave: 'SINUSOIDAL 1.8 Hz',
    coherence: '99.94%',
    flux: '340.2 T-FLUX',
  },
  LISTENING: {
    title: 'ACOUSTIC RECEPTOR',
    description: 'Acoustic / data sensor array engaged. Holographic rings expanding and contracting.',
    rotationRate: '1.20x RAD/S',
    particleFlow: 'MEDIUM-HIGH (480 VTX/S)',
    hologramWave: 'AUDIOMETRIC 3.5 Hz',
    coherence: '98.80%',
    flux: '512.6 T-FLUX',
  },
  THINKING: {
    title: 'SYNAPTIC DELIBERATION',
    description: 'Multi-layer neural synthesis. Multi-ring differential rotation and rapid particle orbits.',
    rotationRate: '2.40x RAD/S',
    particleFlow: 'ACCELERATED (890 VTX/S)',
    hologramWave: 'COMPLEX HARMONIC 6.0 Hz',
    coherence: '97.25%',
    flux: '870.4 T-FLUX',
  },
  PROCESSING: {
    title: 'DATA SCAN CYCLE',
    description: 'Volumetric data scanning plane traversing vertically. Helical particle streams active.',
    rotationRate: '1.50x RAD/S',
    particleFlow: 'STREAMING (720 VTX/S)',
    hologramWave: 'LASER SWEEP 2.5 Hz',
    coherence: '99.12%',
    flux: '684.0 T-FLUX',
  },
  EXECUTING: {
    title: 'AUTONOMOUS EXECUTION',
    description: 'Active tool execution and system invocation. High-energy cyan and amber orbital particle surge.',
    rotationRate: '2.80x RAD/S',
    particleFlow: 'SURGE (980 VTX/S)',
    hologramWave: 'PULSED TELEMETRY 7.0 Hz',
    coherence: '99.88%',
    flux: '920.5 T-FLUX',
  },
  SPEAKING: {
    title: 'HARMONIC EMISSION',
    description: 'Vocal modulation waves projecting outwards. Core pulses rhythmically with vocal waves.',
    rotationRate: '1.40x RAD/S',
    particleFlow: 'REACTIVE (650 VTX/S)',
    hologramWave: 'SPHERICAL ACOUSTIC 8.0 Hz',
    coherence: '99.70%',
    flux: '760.8 T-FLUX',
  },
  AUTHORIZATION: {
    title: 'CLEARANCE GATE ACTIVE',
    description: 'Security policy clearance gate engaged. Core holding in amber alert resonance awaiting clearance.',
    rotationRate: '0.90x RAD/S',
    particleFlow: 'GATE LOCK (320 VTX/S)',
    hologramWave: 'SECURITY RADAR 6.5 Hz',
    coherence: '99.85%',
    flux: '445.0 T-FLUX',
  },
  ERROR: {
    title: 'QUANTUM FLUX ANOMALY',
    description: 'Brief glitch distortion and chromatic aberration detected. Re-calibrating to IDLE.',
    rotationRate: '3.50x JITTER',
    particleFlow: 'TURBULENT (ERRATIC)',
    hologramWave: 'DE-PHASED 12.0 Hz',
    coherence: '62.40%',
    flux: '1,240.0 T-FLUX [WARN]',
  },
  RECOVERING: {
    title: 'RESTORATIVE RECOVERY',
    description: 'Self-healing reliability layer active. Realigning execution state and stabilizing neural matrix.',
    rotationRate: '1.80x RAD/S',
    particleFlow: 'STABILIZATION (540 VTX/S)',
    hologramWave: 'RESTORATIVE HARMONIC 5.2 Hz',
    coherence: '99.50%',
    flux: '580.0 T-FLUX',
  },
};

export const SideTelemetryPanel: React.FC<SideTelemetryPanelProps> = ({
  state,
  collapsed,
  onToggleCollapse,
  latestTrace,
}) => {
  const currentDetails = STATE_DETAILS[state];
  const [isSpeakingLive, setIsSpeakingLive] = useState(false);
  const [waveSeed, setWaveSeed] = useState(0);

  useEffect(() => {
    const unsub = subscribeSpeechState((speaking) => {
      setIsSpeakingLive(speaking);
    });
    return unsub;
  }, []);

  // Periodic subtle ripple oscillation for waveform bars during active speech or listening
  useEffect(() => {
    const active = isSpeakingLive || state === 'SPEAKING' || state === 'LISTENING';
    if (!active) return;

    const interval = setInterval(() => {
      setWaveSeed((s) => (s + 1) % 100);
    }, 120);

    return () => clearInterval(interval);
  }, [isSpeakingLive, state]);

  return (
    <aside
      id="side-telemetry-panel"
      className={`fixed left-4 top-24 bottom-28 z-20 flex transition-all duration-300 pointer-events-none ${
        collapsed ? '-translate-x-[calc(100%-12px)]' : 'translate-x-0'
      }`}
    >
      <div className="hud-panel rounded-xl w-72 sm:w-80 h-full p-4 flex flex-col justify-between overflow-y-auto pointer-events-auto border border-[#FFFFFF]/20 bg-black/50 backdrop-blur-xl">
        {/* Top Header & Environment Card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#FFFFFF]/20">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#FFFFFF]" />
              <span className="text-[11px] font-mono tracking-[0.2em] text-[#FFFFFF] font-bold uppercase">
                Core Telemetry
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 text-[#FFFFFF]">
              SYS-01
            </span>
          </div>

          {/* Sleek Interface Environment Card with Left Accent Border */}
          <div className="sleek-accent-card p-3 rounded-r-md">
            <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2 text-[#FFFFFF]">
              Environment
            </div>
            <div className="text-xs font-mono space-y-1 text-[#FFFFFF]/90">
              <div className="flex justify-between">
                <span className="opacity-60">TEMP</span>
                <span className="font-semibold">24.5°C</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">DIST</span>
                <span className="font-semibold">0.85m</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">SYNC</span>
                <span className="font-semibold text-[#FFFFFF]">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Active State Card */}
          <div className="p-3 rounded-lg bg-black/40 border border-[#FFFFFF]/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase opacity-50 text-[#FFFFFF] tracking-wider">
                Active: {state}
              </span>
              <div className="w-2 h-2 rounded-full bg-[#FFFFFF] shadow-[0_0_8px_#FFFFFF] animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-[#FFFFFF] tracking-wide italic">
              {currentDetails.title}
            </h3>
            <p className="text-xs text-[#FFFFFF]/70 mt-1 leading-relaxed font-rajdhani">
              {currentDetails.description}
            </p>
          </div>

          {/* LIVE COGNITIVE TRACE CARD */}
          {latestTrace && latestTrace.length > 0 && (
            <div className="p-3 rounded-lg bg-black/60 border border-[#FFFFFF]/30 space-y-2 font-mono text-[10px]">
              <div className="flex items-center justify-between text-[#FFFFFF] border-b border-[#FFFFFF]/20 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase">
                  <Brain className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  <span>LIVE COGNITIVE TRACE</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {latestTrace.map((tr) => (
                  <div key={tr.id} className="flex items-start gap-1.5 text-[9px] leading-tight">
                    <span
                      className={`font-bold ${
                        tr.agent === 'PLANNER'
                          ? 'text-[#FFFFFF]'
                          : tr.agent === 'TASK'
                          ? 'text-cyan-300'
                          : tr.agent === 'RECOVERY'
                          ? 'text-amber-300'
                          : tr.agent === 'RESULT'
                          ? 'text-emerald-300'
                          : tr.agent === 'SKILL'
                          ? 'text-purple-400'
                          : tr.agent === 'SPECIALIST'
                          ? 'text-cyan-400'
                          : tr.agent === 'JUDGE'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      [{tr.agent}]
                    </span>
                    <span className="text-stone-300 break-words">{tr.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Metrics Grid */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-[#FFFFFF]/10">
              <div className="flex items-center gap-2 text-[#FFFFFF]/60">
                <RotateCw className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span>Rotation Velocity</span>
              </div>
              <span className="text-[#FFFFFF] font-semibold">{currentDetails.rotationRate}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-[#FFFFFF]/10">
              <div className="flex items-center gap-2 text-[#FFFFFF]/60">
                <Sparkles className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span>Particle Stream</span>
              </div>
              <span className="text-[#FFFFFF] font-semibold">{currentDetails.particleFlow}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-[#FFFFFF]/10">
              <div className="flex items-center gap-2 text-[#FFFFFF]/60">
                <Activity className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span>Holo Frequency</span>
              </div>
              <span className="text-[#FFFFFF] font-semibold">{currentDetails.hologramWave}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-[#FFFFFF]/10">
              <div className="flex items-center gap-2 text-[#FFFFFF]/60">
                <Layers className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span>Quantum Coherence</span>
              </div>
              <span className="text-[#FFFFFF] font-semibold">{currentDetails.coherence}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-black/30 border border-[#FFFFFF]/10">
              <div className="flex items-center gap-2 text-[#FFFFFF]/60">
                <Zap className="w-3.5 h-3.5 text-[#FFFFFF]" />
                <span>Core Flux</span>
              </div>
              <span
                className={`font-semibold ${
                  state === 'ERROR' ? 'text-red-400 animate-pulse' : 'text-[#FFFFFF]'
                }`}
              >
                {currentDetails.flux}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Audio / Reactive Waveform Visualizer Preview */}
        <div className="mt-4 pt-3 border-t border-[#FFFFFF]/20">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#FFFFFF]/60 mb-2">
            <span className="tracking-widest uppercase">Acoustic Resonance</span>
            <span className="text-[#FFFFFF]">STANDBY READY</span>
          </div>
          {/* Animated Waveform Bars with Sleek #FFFFFF styling */}
          <div className="flex items-end justify-between gap-1 h-9 px-1.5 py-1 rounded bg-black/40 border border-[#FFFFFF]/20">
            {[45, 75, 30, 90, 60, 100, 40, 85, 70, 95, 50, 80, 65, 90, 35, 70].map(
              (baseHeight, idx) => {
                const isSpeakingNow = isSpeakingLive || state === 'SPEAKING';
                let multiplier = 0.25;

                if (isSpeakingNow) {
                  // Live dynamic vocal ripple
                  const waveOsc = Math.sin((waveSeed * 0.4) + (idx * 0.5)) * 0.35 + 0.65;
                  multiplier = Math.min(1.0, Math.max(0.2, waveOsc));
                } else if (state === 'LISTENING') {
                  const earOsc = Math.sin((waveSeed * 0.3) + (idx * 0.4)) * 0.25 + 0.5;
                  multiplier = earOsc;
                } else if (state === 'THINKING') {
                  multiplier = 0.75;
                }

                const actualHeight = Math.max(12, Math.min(100, Math.round(baseHeight * multiplier)));

                return (
                  <div
                    key={idx}
                    className={`w-1 rounded-t transition-all duration-100 ${
                      state === 'ERROR'
                        ? 'bg-red-400'
                        : isSpeakingNow
                        ? 'bg-[#FFFFFF] shadow-[0_0_6px_#FFFFFF]'
                        : state === 'LISTENING'
                        ? 'bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.6)]'
                        : 'bg-[#FFFFFF]/50'
                    }`}
                    style={{ height: `${actualHeight}%` }}
                  />
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Collapse Toggle Tab */}
      <button
        id="toggle-telemetry-btn"
        onClick={onToggleCollapse}
        className="pointer-events-auto self-center -ml-px px-1 py-4 rounded-r-md hud-panel border border-l-0 border-[#FFFFFF]/30 text-[#FFFFFF] hover:text-white transition-colors cursor-pointer"
        title={collapsed ? 'Expand Telemetry Panel' : 'Collapse Telemetry Panel'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
};
