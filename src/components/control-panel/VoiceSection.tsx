import React, { useState, useEffect, useRef } from 'react';
import { VoiceSettings, VoiceQualityPreference, VoiceProviderType } from '../../types';
import { apiClient } from '../../services/apiClient';
import {
  Mic,
  Volume2,
  Check,
  VolumeX,
  MicOff,
  Cpu,
  Cloud,
  Radio,
  Sparkles,
  Play,
  Square,
  Activity,
  AlertCircle,
} from 'lucide-react';
import {
  isSpeechSynthesisSupported,
  getAvailableVoices,
  findBestVoice,
  speakText,
  stopSpeech,
} from '../../utils/speech';

interface VoiceSectionProps {
  initialVoice: VoiceSettings;
  onRefresh: () => Promise<void>;
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({ initialVoice, onRefresh }) => {
  const [voice, setVoice] = useState<VoiceSettings>({
    ...initialVoice,
    voiceProvider: initialVoice.voiceProvider || 'LOCAL_BROWSER',
    voiceQuality: initialVoice.voiceQuality || 'AUTO',
    preferredVoiceName: initialVoice.preferredVoiceName || '',
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available system voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [micPermissionStatus, setMicPermissionStatus] = useState<'AVAILABLE' | 'BLOCKED' | 'UNKNOWN'>('UNKNOWN');

  // Diagnostics & interactive testing state
  const [isTestMicActive, setIsTestMicActive] = useState(false);
  const [testMicTranscript, setTestMicTranscript] = useState('');
  const [testMicStatus, setTestMicStatus] = useState<string>('Ready');
  const [isTestSpeaking, setIsTestSpeaking] = useState(false);
  const testRecognizerRef = useRef<any>(null);

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const v = getAvailableVoices();
      setAvailableVoices(v);
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Check microphone permission status if supported
    if (navigator.permissions && (navigator.permissions as any).query) {
      (navigator.permissions as any)
        .query({ name: 'microphone' })
        .then((res: any) => {
          if (res.state === 'granted') setMicPermissionStatus('AVAILABLE');
          else if (res.state === 'denied') setMicPermissionStatus('BLOCKED');
          else setMicPermissionStatus('UNKNOWN');

          res.onchange = () => {
            if (res.state === 'granted') setMicPermissionStatus('AVAILABLE');
            else if (res.state === 'denied') setMicPermissionStatus('BLOCKED');
            else setMicPermissionStatus('UNKNOWN');
          };
        })
        .catch(() => {
          setMicPermissionStatus('UNKNOWN');
        });
    }

    return () => {
      stopSpeech();
      if (testRecognizerRef.current) {
        testRecognizerRef.current.abort();
      }
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateConfigSection('voice', voice);
      await onRefresh();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save voice parameters.');
    } finally {
      setSaving(false);
    }
  };

  // Test Microphone (Recognition ONLY - does NOT send to OpenRouter)
  const handleToggleTestMic = () => {
    if (isTestMicActive) {
      if (testRecognizerRef.current) {
        testRecognizerRef.current.abort();
        testRecognizerRef.current = null;
      }
      setIsTestMicActive(false);
      setTestMicStatus('Test stopped.');
      return;
    }

    setTestMicTranscript('');
    setTestMicStatus('Listening for speech...');
    setIsTestMicActive(true);

    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setTestMicStatus('Speech Recognition not supported in this browser.');
      setIsTestMicActive(false);
      return;
    }

    try {
      const recognizer = new SpeechRecognitionConstructor();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = voice.language === 'English' ? 'en-IN' : 'hi-IN';

      recognizer.onstart = () => setTestMicStatus('Microphone active. Speak now...');
      recognizer.onspeechstart = () => setTestMicStatus('Speech detected! Capturing audio stream...');
      recognizer.onresult = (event: any) => {
        let final = '';
        let interim = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        setTestMicTranscript(final || interim);
      };
      recognizer.onerror = (event: any) => {
        setTestMicStatus(`Recognition Error: ${event.error}`);
        setIsTestMicActive(false);
        testRecognizerRef.current = null;
      };
      recognizer.onend = () => {
        setIsTestMicActive(false);
        testRecognizerRef.current = null;
        setTestMicStatus('Listening finished.');
      };

      recognizer.start();
      testRecognizerRef.current = recognizer;
    } catch (err: any) {
      setTestMicStatus(`Failed to start: ${err.message}`);
      setIsTestMicActive(false);
    }
  };

  // Test Speech Synthesis
  const handleTestSpeech = () => {
    if (isTestSpeaking) {
      stopSpeech();
      setIsTestSpeaking(false);
      return;
    }

    setIsTestSpeaking(true);

    const sample =
      voice.language === 'Hindi'
        ? 'नमस्ते। मैं सुपर एआई हूँ। वोकल सिंथेसिस पूरी तरह से कार्यशील है।'
        : voice.language === 'Hinglish'
        ? 'Samajh gaya. Main Super AI hoon, aur voice system bilkul ready hai. Aap batao kya kaam karna hai.'
        : 'Acoustic neural core online. All speech recognition and synthesis vectors are fully operational.';

    speakText(
      sample,
      { ...voice, voiceOutputEnabled: true },
      () => setIsTestSpeaking(true),
      () => setIsTestSpeaking(false)
    );
  };

  const selectedVoice = findBestVoice(voice);
  const recognitionLang = voice.language === 'English' ? 'en-IN' : 'hi-IN';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded border border-[#FFFFFF]/20 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-[#FFFFFF]" />
          <h3 className="text-sm font-mono tracking-widest text-[#FFFFFF] uppercase">
            Acoustic & Voice Synthesis Architecture
          </h3>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Precision speech recognition and high-fidelity vocal synthesis calibrated for Delhi/North-Indian Hinglish and English.
        </p>
      </div>

      {/* VOICE ENGINE DASHBOARD HUD */}
      <div className="p-4 rounded border border-[#FFFFFF]/30 bg-stone-950/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#FFFFFF]" />
            <h4 className="text-xs font-mono font-bold tracking-widest text-[#FFFFFF] uppercase">
              VOICE ENGINE
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestSpeech}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
                isTestSpeaking
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-[#FFFFFF]/15 border-[#FFFFFF] text-[#FFFFFF] hover:bg-[#FFFFFF]/25'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isTestSpeaking ? 'SPEAKING TEST...' : 'TEST VOICE'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setIsTestSpeaking(false);
              }}
              className="px-3 py-1.5 text-xs font-mono font-bold rounded border border-stone-700 bg-stone-900 text-stone-300 hover:text-white hover:border-stone-500 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Square className="w-3 h-3" />
              <span>STOP VOICE</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Provider</div>
            <div className="text-emerald-400 font-bold truncate">{voice.voiceProvider || 'AUTO'}</div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Voice</div>
            <div className="text-white font-bold truncate" title={selectedVoice?.name || 'Auto (Ranked Best)'}>
              {selectedVoice ? selectedVoice.name.split(' ')[0] : 'Auto'}
            </div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Language</div>
            <div className="text-[#FFFFFF] font-bold">{voice.language}</div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Gender</div>
            <div className="text-pink-400 font-bold">Female</div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Rate</div>
            <div className="text-stone-300 font-bold">{voice.voiceSpeed.toFixed(1)}x</div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Pitch</div>
            <div className="text-stone-300 font-bold">{(voice.pitch ?? 1.05).toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Volume</div>
            <div className="text-stone-300 font-bold">{voice.voiceVolume}%</div>
          </div>
          <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-0.5">
            <div className="text-[10px] text-stone-500 uppercase">Status</div>
            <div className={isTestSpeaking ? 'text-rose-400 font-bold animate-pulse' : isSpeechSynthesisSupported() ? 'text-emerald-400 font-bold' : 'text-stone-500 font-bold'}>
              {isTestSpeaking ? 'SPEAKING' : isSpeechSynthesisSupported() ? 'READY' : 'STANDBY'}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Toggle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Voice Input */}
          <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white uppercase">
                {voice.voiceInputEnabled ? (
                  <Mic className="w-4 h-4 text-emerald-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-stone-500" />
                )}
                <span>Voice Input (STT)</span>
              </div>
              <p className="text-[11px] font-mono text-stone-400">Microphone speech command capture</p>
            </div>
            <button
              type="button"
              onClick={() => setVoice({ ...voice, voiceInputEnabled: !voice.voiceInputEnabled })}
              className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
                voice.voiceInputEnabled
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 font-bold'
                  : 'bg-stone-900 border-stone-800 text-stone-500'
              }`}
            >
              {voice.voiceInputEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Voice Output */}
          <div className="p-4 rounded border border-stone-800 bg-[#080808] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white uppercase">
                {voice.voiceOutputEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-stone-500" />
                )}
                <span>Voice Output (TTS)</span>
              </div>
              <p className="text-[11px] font-mono text-stone-400">Read AI responses aloud automatically</p>
            </div>
            <button
              type="button"
              onClick={() => setVoice({ ...voice, voiceOutputEnabled: !voice.voiceOutputEnabled })}
              className={`px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
                voice.voiceOutputEnabled
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 font-bold'
                  : 'bg-stone-900 border-stone-800 text-stone-500'
              }`}
            >
              {voice.voiceOutputEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Voice Provider Architecture */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-white uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#FFFFFF]" />
              <span>Voice Synthesis Engine Provider</span>
            </label>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
              {voice.voiceProvider || 'AUTO'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setVoice({ ...voice, voiceProvider: 'AUTO' })}
              className={`p-3 rounded border text-left transition-all cursor-pointer ${
                (voice.voiceProvider || 'AUTO') === 'AUTO'
                  ? 'border-[#FFFFFF] bg-[#FFFFFF]/10 text-white'
                  : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#FFFFFF]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AUTO</span>
              </div>
              <p className="text-[11px] font-mono text-stone-400 mt-1">
                Prefers configured Cloud TTS if active; automatically falls back to optimized browser TTS.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setVoice({ ...voice, voiceProvider: 'LOCAL_BROWSER' })}
              className={`p-3 rounded border text-left transition-all cursor-pointer ${
                voice.voiceProvider === 'LOCAL_BROWSER'
                  ? 'border-[#FFFFFF] bg-[#FFFFFF]/10 text-white'
                  : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#FFFFFF]">
                <Radio className="w-3.5 h-3.5" />
                <span>LOCAL_BROWSER</span>
              </div>
              <p className="text-[11px] font-mono text-stone-400 mt-1">
                Zero-latency client SpeechSynthesis. Uses ranked Indian/Hinglish female voices.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setVoice({ ...voice, voiceProvider: 'CLOUD_TTS' })}
              className={`p-3 rounded border text-left transition-all cursor-pointer ${
                voice.voiceProvider === 'CLOUD_TTS'
                  ? 'border-[#FFFFFF] bg-[#FFFFFF]/10 text-white'
                  : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs font-bold text-[#FFFFFF]">
                <span className="flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>CLOUD_TTS</span>
                </span>
                {voice.cloudTtsApiKey && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-800 bg-emerald-950/60 text-emerald-400">
                    CONFIGURED
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-stone-400 mt-1">
                Neural cloud vocal synthesis using secure server-side credentials.
              </p>
            </button>
          </div>

          {/* Cloud TTS Configuration Panel */}
          {(voice.voiceProvider === 'CLOUD_TTS' || voice.voiceProvider === 'AUTO') && (
            <div className="mt-3 p-3.5 rounded border border-stone-800 bg-stone-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-stone-300 uppercase flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  <span>Cloud TTS Credentials & Endpoint</span>
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  SERVER-SIDE SECURE STORAGE
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-stone-400">Cloud TTS API Key</label>
                  <input
                    type="password"
                    placeholder={voice.cloudTtsApiKey ? '•••••••• (Stored Securely)' : 'Enter Cloud TTS API Key'}
                    value={voice.cloudTtsApiKey || ''}
                    onChange={(e) => setVoice({ ...voice, cloudTtsApiKey: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-black border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-stone-400">Endpoint URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://api.cloudtts.provider/v1"
                    value={voice.cloudTtsEndpoint || ''}
                    onChange={(e) => setVoice({ ...voice, cloudTtsEndpoint: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-black border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>
              </div>
              <p className="text-[10px] font-mono text-stone-500">
                Key is never exposed to browser localStorage or client code. Kept on server backend.
              </p>
            </div>
          )}
        </div>

        {/* Primary Language & Persona Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
            <label className="block text-xs font-mono font-semibold text-white uppercase">
              Acoustic Language & Dialogue Model
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Hinglish', 'Hindi', 'English'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setVoice({ ...voice, language: lang })}
                  className={`py-2 text-xs font-mono rounded border text-center transition-all cursor-pointer ${
                    voice.language === lang
                      ? 'bg-[#FFFFFF]/20 border-[#FFFFFF] text-[#FFFFFF] font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-mono text-stone-400">
              {voice.language === 'Hinglish'
                ? 'Hinglish: Conversational Delhi/North-Indian cadence; natural blend of Hindi and English.'
                : voice.language === 'Hindi'
                ? 'Hindi: Natural colloquial Hindi dialogue with feminine verb inflections.'
                : 'English: Natural Indian English dialect.'}
            </p>
          </div>

          <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
            <label className="block text-xs font-mono font-semibold text-white uppercase">
              Voice Gender Persona
            </label>
            <div className="h-9 px-3 rounded border border-pink-500/40 bg-pink-950/20 text-pink-300 font-mono text-xs font-bold flex items-center justify-between">
              <span>FEMALE</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-900/60 border border-pink-700/50 text-pink-200">
                SUPER AI IDENTITY
              </span>
            </div>
            <p className="text-[11px] font-mono text-stone-400">
              Super AI identity is calibrated as an intelligent, calm female assistant.
            </p>
          </div>
        </div>

        {/* Voice Quality Selector */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-white uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span>Voice Quality Preference</span>
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'AUTO', label: 'AUTO' },
                { id: 'NATURAL_HINDI', label: 'NATURAL HINDI' },
                { id: 'INDIAN_ENGLISH', label: 'INDIAN ENGLISH' },
                { id: 'ENGLISH', label: 'ENGLISH' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVoice({ ...voice, voiceQuality: opt.id })}
                className={`py-2 px-1 text-[11px] font-mono rounded border text-center transition-all cursor-pointer ${
                  voice.voiceQuality === opt.id
                    ? 'bg-[#FFFFFF]/20 border-[#FFFFFF] text-[#FFFFFF] font-bold'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-mono text-stone-400">
            {voice.voiceQuality === 'AUTO'
              ? 'Automatically selects the highest-scoring voice for natural Indian pronunciation.'
              : voice.voiceQuality === 'NATURAL_HINDI'
              ? 'Prioritizes high-quality Hindi India (hi-IN) voices.'
              : voice.voiceQuality === 'INDIAN_ENGLISH'
              ? 'Prioritizes natural Indian English (en-IN) voices for superior mixed Hinglish pronunciation.'
              : 'Prioritizes standard English voices.'}
          </p>
        </div>

        {/* Voice Selection Dropdown */}
        <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-white uppercase">
              Specific Browser Voice (Optional Override)
            </label>
            <span className="text-[11px] font-mono text-stone-400">
              {availableVoices.length} voices detected
            </span>
          </div>
          <select
            value={voice.preferredVoiceName || ''}
            onChange={(e) => setVoice({ ...voice, preferredVoiceName: e.target.value })}
            className="w-full px-3 py-2 text-xs font-mono rounded bg-stone-950 border border-stone-800 text-white focus:outline-none focus:border-[#FFFFFF]"
          >
            <option value="">Auto (Use Ranked Best Matching Voice)</option>
            {availableVoices.map((v, i) => (
              <option key={`${v.name}-${i}`} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          {selectedVoice && (
            <p className="text-[11px] font-mono text-[#FFFFFF]/80">
              Active Voice:{' '}
              <span className="font-semibold text-white">{selectedVoice.name}</span>{' '}
              [{selectedVoice.lang}]
            </p>
          )}
        </div>

        {/* Voice Speed, Pitch & Volume */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-white uppercase">Speaking Rate</span>
              <span className="text-xs font-mono text-[#FFFFFF]">{voice.voiceSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voice.voiceSpeed}
              onChange={(e) => setVoice({ ...voice, voiceSpeed: parseFloat(e.target.value) })}
              className="w-full accent-[#FFFFFF] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-500">
              <span>0.5x Slow</span>
              <span>1.0x Normal</span>
              <span>2.0x Fast</span>
            </div>
          </div>

          <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-white uppercase">Vocal Pitch</span>
              <span className="text-xs font-mono text-[#FFFFFF]">{(voice.pitch ?? 1.05).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={voice.pitch ?? 1.05}
              onChange={(e) => setVoice({ ...voice, pitch: parseFloat(e.target.value) })}
              className="w-full accent-[#FFFFFF] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-500">
              <span>0.5 Low</span>
              <span>1.05 Natural</span>
              <span>1.5 High</span>
            </div>
          </div>

          <div className="p-4 rounded border border-stone-800 bg-[#080808] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-white uppercase">Acoustic Volume</span>
              <span className="text-xs font-mono text-[#FFFFFF]">{voice.voiceVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={voice.voiceVolume}
              onChange={(e) => setVoice({ ...voice, voiceVolume: parseInt(e.target.value, 10) })}
              className="w-full accent-[#FFFFFF] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-500">
              <span>Mute</span>
              <span>Default</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Diagnostics & Live Test Card */}
        <div className="p-4 rounded border border-[#FFFFFF]/30 bg-[#060606] space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <Activity className="w-4 h-4 text-[#FFFFFF]" />
            <h4 className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-wider">
              Acoustic Hardware & Recognition Diagnostics
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-1">
              <div className="text-stone-400 text-[10px] uppercase">Speech Recognition</div>
              <div className={('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? 'SUPPORTED' : 'UNSUPPORTED'}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-1">
              <div className="text-stone-400 text-[10px] uppercase">Microphone Hardware</div>
              <div
                className={
                  micPermissionStatus === 'AVAILABLE'
                    ? 'text-emerald-400 font-bold'
                    : micPermissionStatus === 'BLOCKED'
                    ? 'text-rose-400 font-bold'
                    : 'text-amber-400 font-bold'
                }
              >
                {micPermissionStatus}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-1">
              <div className="text-stone-400 text-[10px] uppercase">Speech Synthesis</div>
              <div className={isSpeechSynthesisSupported() ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {isSpeechSynthesisSupported() ? 'AVAILABLE' : 'UNAVAILABLE'}
              </div>
            </div>

            <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-1">
              <div className="text-stone-400 text-[10px] uppercase">Recognition Language</div>
              <div className="text-[#FFFFFF] font-bold">{recognitionLang}</div>
            </div>

            <div className="p-2.5 rounded bg-black/60 border border-stone-800 space-y-1 col-span-2">
              <div className="text-stone-400 text-[10px] uppercase">Selected TTS Voice</div>
              <div className="text-white truncate font-medium" title={selectedVoice?.name || 'Default'}>
                {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : 'Default'}
              </div>
            </div>
          </div>

          {/* Interactive Test Panel */}
          <div className="p-3 rounded border border-stone-800 bg-black/40 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Test Microphone Button */}
              <button
                type="button"
                onClick={handleToggleTestMic}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isTestMicActive
                    ? 'bg-red-950/80 border border-red-600 text-red-300 animate-pulse'
                    : 'bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 text-[#FFFFFF] hover:bg-[#FFFFFF]/20'
                }`}
              >
                {isTestMicActive ? <Square className="w-3 h-3 fill-red-300" /> : <Play className="w-3 h-3 fill-[#FFFFFF]" />}
                <span>{isTestMicActive ? 'STOP TEST' : 'TEST MICROPHONE'}</span>
              </button>

              {/* Test Voice Button */}
              <button
                type="button"
                onClick={handleTestSpeech}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isTestSpeaking
                    ? 'bg-rose-950/80 border border-rose-600 text-rose-300 animate-pulse'
                    : 'bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 text-[#FFFFFF] hover:bg-[#FFFFFF]/20'
                }`}
              >
                {isTestSpeaking ? <Square className="w-3 h-3 fill-rose-300" /> : <Volume2 className="w-3 h-3" />}
                <span>{isTestSpeaking ? 'STOP VOICE' : 'TEST VOICE'}</span>
              </button>

              {/* Explicit Stop Voice button */}
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsTestSpeaking(false);
                }}
                className="px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-700"
                title="Cancel any active speech output immediately"
              >
                <Square className="w-3 h-3" />
                <span>STOP VOICE</span>
              </button>
            </div>

            {/* Test Status & Live Transcript Box */}
            <div className="p-2.5 rounded bg-black border border-stone-800/80 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-400">Live Diagnostic Monitor:</span>
                <span className={isTestMicActive ? 'text-amber-400 animate-pulse' : 'text-stone-500'}>
                  {testMicStatus}
                </span>
              </div>
              <div className="min-h-[38px] p-2 rounded bg-stone-950 border border-stone-900 text-[#FFFFFF] select-text">
                {testMicTranscript ? (
                  <span>"{testMicTranscript}"</span>
                ) : (
                  <span className="text-stone-600 italic">
                    {isTestMicActive ? 'Awaiting spoken input...' : 'Click [TEST MICROPHONE] to test recognition without sending to AI.'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded text-xs font-mono bg-rose-950/40 border border-rose-800 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded text-xs font-mono bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Voice configuration saved and applied to neural pipeline!</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-mono font-semibold text-black bg-[#FFFFFF] hover:bg-[#ffbe26] rounded transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            {saving ? 'SAVING...' : 'SAVE VOICE PARAMETERS'}
          </button>
        </div>
      </form>
    </div>
  );
};
