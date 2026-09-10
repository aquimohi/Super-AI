import React, { useState, useEffect } from 'react';
import { AIState } from '../types';
import { Send, Mic, MicOff, Square, Volume2, AudioLines } from 'lucide-react';

interface ChatInputAreaProps {
  currentState: AIState;
  onStateChange: (state: AIState) => void;
  onSendMessage: (message: string) => void;
  isStreaming?: boolean;
  onStartVoiceInput?: () => void;
  onStopVoiceInput?: () => void;
  onStopSpeaking?: () => void;
  voiceTranscript?: string;
  isListening?: boolean;
}

const PRESET_COMMANDS = [
  'Super AI, tum kya kar sakte ho?',
  'Hello Super AI, introduce yourself',
  'Run system self-diagnostic',
  'Activate vocal resonance test',
];

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  currentState,
  onStateChange,
  onSendMessage,
  isStreaming = false,
  onStartVoiceInput,
  onStopVoiceInput,
  onStopSpeaking,
  voiceTranscript = '',
  isListening = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const activeListening = isListening || currentState === 'LISTENING';
  const isSpeakingState = currentState === 'SPEAKING';

  // Live synchronizer: When listening, show "Listening..." until speech is detected, then show live transcript
  useEffect(() => {
    if (activeListening) {
      if (voiceTranscript) {
        setInputValue(voiceTranscript);
      } else {
        setInputValue('Listening...');
      }
    } else {
      // If was showing "Listening..." and returned to IDLE with no speech, clear it
      if (inputValue === 'Listening...') {
        setInputValue('');
      }
    }
  }, [activeListening, voiceTranscript]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || inputValue === 'Listening...' || isStreaming) return;

    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handlePresetClick = (cmd: string) => {
    onSendMessage(cmd);
  };

  const handleMicClick = () => {
    if (activeListening) {
      if (onStopVoiceInput) {
        onStopVoiceInput();
      } else {
        onStateChange('IDLE');
      }
    } else {
      if (onStartVoiceInput) {
        onStartVoiceInput();
      } else {
        onStateChange('LISTENING');
      }
    }
  };

  return (
    <div
      id="chat-input-area"
      className="relative z-20 w-full max-w-4xl mx-auto px-4 pb-3 sm:pb-5"
    >
      {/* Quick Tactical Preset Chips */}
      <div className="flex items-center justify-center gap-2 mb-2.5 overflow-x-auto py-1 scrollbar-none">
        <span className="text-[10px] font-mono text-[#F2A900]/50 uppercase tracking-[0.2em] hidden md:inline">
          PROTOCOLS:
        </span>
        {PRESET_COMMANDS.map((cmd, idx) => (
          <button
            key={idx}
            id={`preset-cmd-${idx}`}
            onClick={() => handlePresetClick(cmd)}
            disabled={isStreaming || activeListening}
            className="text-[10px] font-mono px-3 py-1 rounded-full border border-[#F2A900]/20 bg-black/40 text-[#F2A900]/70 hover:text-[#F2A900] hover:border-[#F2A900]/50 hover:bg-[#F2A900]/10 transition-all duration-200 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Futuristic Command Input Bar */}
      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-3 sm:gap-4 bg-white/5 border border-[#F2A900]/20 p-2.5 sm:p-3.5 backdrop-blur-xl rounded-xl transition-all duration-300 ${
          currentState === 'ERROR'
            ? 'border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
            : activeListening
            ? 'border-[#F2A900] shadow-[0_0_25px_rgba(242,169,0,0.35)] bg-[#F2A900]/10'
            : isSpeakingState
            ? 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
            : 'hover:border-[#F2A900]/40 focus-within:border-[#F2A900]/60 focus-within:shadow-[0_0_25px_rgba(242,169,0,0.2)]'
        }`}
      >
        {/* Sleek Pulse / Status Indicator Box */}
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 border rounded flex items-center justify-center shrink-0 transition-all ${
            activeListening
              ? 'border-[#F2A900] bg-[#F2A900]/30 shadow-[0_0_12px_#F2A900]'
              : isSpeakingState
              ? 'border-amber-400/80 bg-amber-400/20'
              : 'border-[#F2A900]/40 bg-black/40'
          }`}
        >
          {activeListening ? (
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 bg-[#F2A900] h-3 animate-pulse rounded-full" />
              <span className="w-1 bg-[#F2A900] h-4 animate-ping rounded-full" />
              <span className="w-1 bg-[#F2A900] h-2 animate-pulse rounded-full" />
            </div>
          ) : isSpeakingState ? (
            <Volume2 className="w-4 h-4 text-[#F2A900] animate-bounce" />
          ) : (
            <div className="w-2 h-2 bg-[#F2A900] rounded-full animate-pulse shadow-[0_0_6px_#F2A900]" />
          )}
        </div>

        {/* Input Field */}
        <input
          id="chat-command-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            activeListening
              ? 'Listening...'
              : isSpeakingState
              ? 'Super AI vocal synthesis active...'
              : 'Ready for command... Click mic or type message'
          }
          className={`flex-1 bg-transparent text-sm sm:text-base font-rajdhani tracking-wide focus:outline-none ${
            activeListening
              ? 'text-[#F2A900] font-semibold italic'
              : 'text-[#F2A900] placeholder:text-[#F2A900]/50 placeholder:italic'
          }`}
        />

        {/* Sleek Vertical Divider */}
        <div className="w-[1px] h-7 bg-[#F2A900]/20 hidden sm:block" />

        {/* Module Status Badge / Live Voice Indicator */}
        <div className="px-2 text-[10px] uppercase tracking-widest font-mono hidden md:flex items-center gap-1.5 whitespace-nowrap">
          {activeListening ? (
            <span className="text-[#F2A900] font-bold flex items-center gap-1.5 animate-pulse">
              <AudioLines className="w-3.5 h-3.5" />
              {voiceTranscript ? 'SPEECH DETECTED' : 'LISTENING...'}
            </span>
          ) : isSpeakingState ? (
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              VOCAL SYNTHESIS ACTIVE
            </span>
          ) : (
            <span className="opacity-50 text-[#F2A900]">RECEPTOR READY</span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Stop Speaking Button (when speaking) */}
          {isSpeakingState && (
            <button
              type="button"
              id="stop-speaking-btn"
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded border border-rose-500/60 bg-rose-950/70 text-rose-300 hover:bg-rose-900 font-mono text-xs tracking-wider uppercase cursor-pointer transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)]"
              title="Stop Voice Output Immediately"
            >
              <Square className="w-3 h-3 fill-rose-300" />
              <span className="hidden sm:inline font-bold">STOP VOICE</span>
            </button>
          )}

          {/* Voice Input Microphone Button */}
          <button
            type="button"
            id="mic-action-btn"
            onClick={handleMicClick}
            className={`p-2 sm:p-2.5 rounded border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeListening
                ? 'bg-red-950/90 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse'
                : 'bg-black/40 border-[#F2A900]/20 text-[#F2A900]/70 hover:text-[#F2A900] hover:border-[#F2A900]/50 hover:bg-[#F2A900]/10'
            }`}
            title={
              activeListening
                ? 'Listening... Click to stop recording'
                : 'Click to speak (Voice Input)'
            }
          >
            {activeListening ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[10px] font-mono hidden sm:inline font-bold text-red-400">STOP</span>
              </>
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Transmit / Send Button */}
          <button
            type="submit"
            id="send-command-btn"
            disabled={!inputValue.trim() || inputValue === 'Listening...' || isStreaming}
            className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded border font-mono font-bold text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer ${
              inputValue.trim() && inputValue !== 'Listening...' && !isStreaming
                ? 'bg-[#F2A900] text-black border-[#F2A900] shadow-[0_0_15px_rgba(242,169,0,0.4)] hover:bg-[#F2A900]/90'
                : 'bg-black/30 border-[#F2A900]/20 text-[#F2A900]/40 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TRANSMIT</span>
          </button>
        </div>
      </form>
    </div>
  );
};
