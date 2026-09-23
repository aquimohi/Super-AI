import React, { useState, useEffect, useRef } from 'react';
import { AIState, AttachedFile } from '../types';
import { Send, Mic, MicOff, Square, Volume2, AudioLines, Radio, Paperclip, FileCode, X, Sparkles } from 'lucide-react';

interface ChatInputAreaProps {
  currentState: AIState;
  onStateChange: (state: AIState) => void;
  onSendMessage: (message: string, attachedFiles?: AttachedFile[]) => void;
  onOpenInCanvas?: (file: AttachedFile) => void;
  isStreaming?: boolean;
  onStartVoiceInput?: () => void;
  onStopVoiceInput?: () => void;
  onStopSpeaking?: () => void;
  voiceTranscript?: string;
  isListening?: boolean;
  isLiveVoice?: boolean;
  onToggleLiveVoice?: () => void;
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
  onOpenInCanvas,
  isStreaming = false,
  onStartVoiceInput,
  onStopVoiceInput,
  onStopSpeaking,
  voiceTranscript = '',
  isListening = false,
  isLiveVoice = false,
  onToggleLiveVoice,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeListening = isListening || currentState === 'LISTENING';
  const isSpeakingState = currentState === 'SPEAKING';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const text = await file.text();
        newFiles.push({
          id: `file-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: text,
        });
      } catch (err) {
        console.warn('Failed to read file text:', file.name, err);
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasText = Boolean(inputValue.trim() && inputValue !== 'Listening...');
    const hasFiles = attachedFiles.length > 0;
    if ((!hasText && !hasFiles) || isStreaming) return;

    const messageText = hasText
      ? inputValue.trim()
      : 'Attached files ko analyze karke un par kaam karo aur modifications batao.';

    onSendMessage(messageText, hasFiles ? attachedFiles : undefined);
    setInputValue('');
    setAttachedFiles([]);
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
      {/* Live Transcript Overlay */}
      {(activeListening && voiceTranscript) && (
        <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 z-30">
          <div className="bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-sm px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.3)] backdrop-blur-md max-w-[80%] text-center line-clamp-2">
            {voiceTranscript}
          </div>
        </div>
      )}

      {/* Quick Tactical Preset Chips */}
      <div className="flex items-center justify-center gap-2 mb-2.5 overflow-x-auto py-1 scrollbar-none">
        <span className="text-[10px] font-mono text-[#FFFFFF]/50 uppercase tracking-[0.2em] hidden md:inline">
          PROTOCOLS:
        </span>
        {PRESET_COMMANDS.map((cmd, idx) => (
          <button
            key={idx}
            id={`preset-cmd-${idx}`}
            onClick={() => handlePresetClick(cmd)}
            disabled={isStreaming || activeListening}
            className="text-[10px] font-mono px-3 py-1 rounded-full border border-[#FFFFFF]/20 bg-black/40 text-[#FFFFFF]/70 hover:text-[#FFFFFF] hover:border-[#FFFFFF]/50 hover:bg-[#FFFFFF]/10 transition-all duration-200 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Attached Files Preview Bar */}
      {attachedFiles.length > 0 && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
            <Paperclip className="w-3 h-3" />
            ATTACHED ({attachedFiles.length}):
          </span>
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-200 text-xs font-mono shadow-md backdrop-blur-md shrink-0"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="max-w-[140px] truncate font-medium">{file.name}</span>
              <span className="text-[10px] opacity-60">({formatFileSize(file.size)})</span>

              {onOpenInCanvas && (
                <button
                  type="button"
                  onClick={() => onOpenInCanvas(file)}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[9px] text-cyan-300 hover:bg-cyan-500/40 transition-colors ml-1"
                  title="Open file in Live Canvas Studio"
                >
                  CANVAS ↗
                </button>
              )}

              <button
                type="button"
                onClick={() => removeAttachedFile(file.id)}
                className="text-gray-400 hover:text-rose-400 transition-colors p-0.5 ml-0.5"
                title="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Futuristic Command Input Bar */}
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center gap-3 sm:gap-4 bg-white/5 border border-[#FFFFFF]/20 p-2.5 sm:p-3.5 backdrop-blur-xl rounded-xl transition-all duration-300 ${
          isDragging
            ? 'border-cyan-400 border-dashed bg-cyan-950/40 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
            : currentState === 'ERROR'
            ? 'border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
            : activeListening
            ? 'border-[#FFFFFF] shadow-[0_0_25px_rgba(255,255,255,0.35)] bg-[#FFFFFF]/10'
            : isSpeakingState
            ? 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
            : 'hover:border-[#FFFFFF]/40 focus-within:border-[#FFFFFF]/60 focus-within:shadow-[0_0_25px_rgba(255,255,255,0.2)]'
        }`}
      >
        {/* Drag & Drop Visual Overlay */}
        {isDragging && (
          <div className="absolute inset-0 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 border-dashed flex items-center justify-center gap-2 z-30 pointer-events-none text-cyan-300 font-mono text-sm animate-pulse">
            <Paperclip className="w-4 h-4" />
            <span>Drop files here to attach and work on them with Super AI</span>
          </div>
        )}

        {/* Sleek Pulse / Status Indicator Box */}
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 border rounded flex items-center justify-center shrink-0 transition-all ${
            activeListening
              ? 'border-[#FFFFFF] bg-[#FFFFFF]/30 shadow-[0_0_12px_#FFFFFF]'
              : isSpeakingState
              ? 'border-amber-400/80 bg-amber-400/20'
              : 'border-[#FFFFFF]/40 bg-black/40'
          }`}
        >
          {activeListening ? (
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 bg-[#FFFFFF] h-3 animate-pulse rounded-full" />
              <span className="w-1 bg-[#FFFFFF] h-4 animate-ping rounded-full" />
              <span className="w-1 bg-[#FFFFFF] h-2 animate-pulse rounded-full" />
            </div>
          ) : isSpeakingState ? (
            <Volume2 className="w-4 h-4 text-[#FFFFFF] animate-bounce" />
          ) : (
            <div className="w-2 h-2 bg-[#FFFFFF] rounded-full animate-pulse shadow-[0_0_6px_#FFFFFF]" />
          )}
        </div>

        {/* Paperclip File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 sm:p-2 rounded border border-white/15 bg-black/40 text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-950/30 transition-all cursor-pointer shrink-0"
          title="Attach files (Code, Text, HTML, CSS, JS, Python, Markdown)"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Input Field */}
        <input
          id="chat-command-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            activeListening
              ? 'Listening for command...'
              : isSpeakingState
              ? 'Super AI vocal synthesis active...'
              : attachedFiles.length > 0
              ? 'Tell Super AI what to do with attached files (or press Transmit)...'
              : 'Ready for command... Attach files, click mic, or type message'
          }
          className={`flex-1 bg-transparent text-sm sm:text-base font-rajdhani tracking-wide focus:outline-none ${
            activeListening
              ? 'text-[#FFFFFF] font-semibold italic'
              : 'text-[#FFFFFF] placeholder:text-[#FFFFFF]/50 placeholder:italic'
          }`}
        />

        {/* Sleek Vertical Divider */}
        <div className="w-[1px] h-7 bg-[#FFFFFF]/20 hidden sm:block" />

        {/* Module Status Badge / Live Voice Indicator */}
        <div className="px-2 text-[10px] uppercase tracking-widest font-mono hidden md:flex items-center gap-1.5 whitespace-nowrap">
          {activeListening ? (
            <span className="text-[#FFFFFF] font-bold flex items-center gap-1.5 animate-pulse">
              <AudioLines className="w-3.5 h-3.5" />
              {voiceTranscript ? 'SPEECH DETECTED' : 'LISTENING...'}
            </span>
          ) : isSpeakingState ? (
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              VOCAL SYNTHESIS ACTIVE
            </span>
          ) : (
            <span className="opacity-50 text-[#FFFFFF]">RECEPTOR READY</span>
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
                : 'bg-black/40 border-[#FFFFFF]/20 text-[#FFFFFF]/70 hover:text-[#FFFFFF] hover:border-[#FFFFFF]/50 hover:bg-[#FFFFFF]/10'
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

          {/* Live Voice Streaming Toggle */}
          <button
            type="button"
            onClick={onToggleLiveVoice}
            className={`p-2 sm:p-2.5 rounded border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              isLiveVoice
                ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse'
                : 'bg-black/40 border-cyan-500/20 text-cyan-500/70 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10'
            }`}
            title={isLiveVoice ? 'Stop Live Voice Stream' : 'Start Live Voice Stream (Real-Time)'}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono hidden sm:inline font-bold">
              LIVE
            </span>
          </button>

          {/* Transmit / Send Button */}
          <button
            type="submit"
            id="send-command-btn"
            disabled={(!inputValue.trim() && attachedFiles.length === 0) || inputValue === 'Listening...' || isStreaming}
            className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded border font-mono font-bold text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer ${
              (inputValue.trim() || attachedFiles.length > 0) && inputValue !== 'Listening...' && !isStreaming
                ? 'bg-[#FFFFFF] text-black border-[#FFFFFF] shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-[#FFFFFF]/90'
                : 'bg-black/30 border-[#FFFFFF]/20 text-[#FFFFFF]/40 cursor-not-allowed'
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
