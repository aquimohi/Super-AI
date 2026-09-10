import { VoiceSettings, VoiceQualityPreference } from '../types';

/**
 * TTS Preprocessing layer:
 * Sanitizes and normalizes raw text so browser SpeechSynthesis produces
 * natural, pleasant speech without pronouncing symbols, markdown, URLs, JSON, or code blocks.
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Remove code blocks completely or replace with short spoken explanation
  s = s.replace(/```[\s\S]*?```/g, ' Code omitted. ');

  // 2. Remove inline code backticks, keeping inner content
  s = s.replace(/`([^`]+)`/g, '$1');

  // 3. Remove raw JSON blocks or multi-line curly structures
  s = s.replace(/\{[\s\S]*?\}/g, ' ');

  // 4. Markdown links: [Title](https://...) -> Title
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Clean Markdown formatting:
  // - Bold, italics, strikethrough: **text**, *text*, __text__, _text_, ~~text~~
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');
  s = s.replace(/~~([^~]+)~~/g, '$1');

  // - Markdown headers (# Header) -> Header.
  s = s.replace(/^[#]+\s+(.*)$/gm, '$1. ');

  // - Markdown list bullets (*, -, +, 1., 2.)
  s = s.replace(/^[-*+]\s+/gm, ' ');
  s = s.replace(/^\d+\.\s+/gm, ' ');

  // 6. URLs: Do NOT pronounce http:// or path character-by-character
  // e.g. "https://openrouter.ai/models" -> "openrouter link"
  // e.g. "https://google.com" -> "google link"
  s = s.replace(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+)(?:\.[a-zA-Z0-9-]+)*(?:\/[^\s]*)?/gi, '$1 link');

  // 7. Parentheses with status codes or technical parameters:
  // e.g. "OpenRouter (HTTP 200)" -> "OpenRouter, HTTP 200"
  s = s.replace(/\(([^)]+)\)/g, ', $1');

  // 8. Slashes and Hyphens between technical terms:
  // e.g. "API / server / database" -> "API, server, database"
  // e.g. "OpenRouter / API / deepseek-chat is working correctly." -> "OpenRouter, API, deepseek chat is working correctly."
  s = s.replace(/\s*\/\s*/g, ', ');

  // Hyphen inside model identifiers like deepseek-chat, gpt-4o -> deepseek chat, gpt 4o
  s = s.replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, '$1 $2');

  // 9. Technical brackets, special characters, symbols browser TTS shouldn't pronounce
  s = s.replace(/[{}\[\]<>|\^~@#$%&*\\/]/g, ' ');

  // 10. Strip unicode emojis
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '');

  // 11. Normalize excessive punctuation and whitespace
  s = s.replace(/[=_-]{2,}/g, ' ');
  s = s.replace(/!+/g, '.');
  s = s.replace(/\?{2,}/g, '?');
  s = s.replace(/\.{2,}/g, '.');
  s = s.replace(/,\s*,+/g, ',');
  s = s.replace(/\s*,\s*/g, ', ');
  s = s.replace(/\s+/g, ' ');

  return s.trim();
}

/**
 * Backwards-compatible alias for sanitizeForSpeech
 */
export function cleanMarkdownForSpeech(text: string): string {
  return sanitizeForSpeech(text);
}

// -------------------------------------------------------------
// VOICE STATE OBSERVER & REAL-TIME EVENT BUS
// -------------------------------------------------------------

export type SpeechStateListener = (speaking: boolean, text?: string) => void;
const speechListeners = new Set<SpeechStateListener>();

export function subscribeSpeechState(listener: SpeechStateListener): () => void {
  speechListeners.add(listener);
  return () => {
    speechListeners.delete(listener);
  };
}

function notifySpeechState(speaking: boolean, text?: string) {
  speechListeners.forEach((fn) => {
    try {
      fn(speaking, text);
    } catch (e) {
      console.warn('Speech listener callback error:', e);
    }
  });
}

// -------------------------------------------------------------
// VOICE RANKING & SPEECH SYNTHESIS (TTS)
// -------------------------------------------------------------

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

/**
 * Rates the quality and acoustic suitability of a browser voice.
 * Super AI is a FEMALE AI assistant:
 * Prioritizes natural female voices (e.g. Swara, Neerja, Heera, Zira, Google हिन्दी, etc.)
 */
function scoreVoice(
  voice: SpeechSynthesisVoice,
  quality: VoiceQualityPreference = 'AUTO',
  language: 'Hindi' | 'Hinglish' | 'English' = 'Hinglish'
): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  let score = 0;

  // Bonus for natural / neural / online cloud voices
  const isHighQuality =
    name.includes('natural') ||
    name.includes('online') ||
    name.includes('neural') ||
    name.includes('google') ||
    name.includes('microsoft') ||
    name.includes('premium') ||
    name.includes('enhanced');

  if (isHighQuality) score += 30;

  // Female voice bias for Super AI female persona
  const isFemale =
    name.includes('female') ||
    name.includes('woman') ||
    name.includes('swara') ||
    name.includes('neerja') ||
    name.includes('heera') ||
    name.includes('zira') ||
    name.includes('raveena') ||
    name.includes('kavya') ||
    name.includes('priya') ||
    name.includes('aditi') ||
    name.includes('ananya') ||
    name.includes('sangeeta') ||
    name.includes('veena') ||
    name.includes('geeta') ||
    name.includes('hazel') ||
    name.includes('susan') ||
    name.includes('samantha') ||
    name.includes('victoria') ||
    name.includes('jenny') ||
    name.includes('aria') ||
    name.includes('sonia') ||
    name.includes('kalpana') ||
    name.includes('google हिन्दी');

  const isMale =
    name.includes('male') ||
    name.includes('man') ||
    name.includes('david') ||
    name.includes('mark') ||
    name.includes('george') ||
    name.includes('ravi') ||
    name.includes('hemant') ||
    name.includes('madhav') ||
    name.includes('prabhat') ||
    name.includes('ajay');

  if (isFemale) score += 60;
  if (isMale) score -= 80;

  const isHindi = lang.startsWith('hi');
  const isIndianEnglish = lang === 'en-in' || (lang.startsWith('en') && (name.includes('india') || name.includes('indian')));
  const isGeneralEnglish = lang.startsWith('en');

  switch (quality) {
    case 'NATURAL_HINDI':
      if (isHindi) score += 100;
      else if (isIndianEnglish) score += 50;
      else if (isGeneralEnglish) score += 20;
      break;

    case 'INDIAN_ENGLISH':
      if (isIndianEnglish) score += 100;
      else if (isHindi) score += 50;
      else if (isGeneralEnglish) score += 30;
      break;

    case 'ENGLISH':
      if (isIndianEnglish) score += 90;
      else if (lang === 'en-us' || lang === 'en-gb') score += 80;
      else if (isGeneralEnglish) score += 70;
      break;

    case 'AUTO':
    default:
      if (language === 'Hinglish') {
        // For Hinglish: Indian English female voice is preferred for mixed language pronunciation
        // because it speaks conversational Roman Hindi and English technical terms smoothly
        if (isIndianEnglish) score += 100;
        else if (isHindi && isHighQuality) score += 70;
        else if (isHindi) score += 40;
        else if (isGeneralEnglish) score += 30;
      } else if (language === 'Hindi') {
        if (isHindi && isHighQuality) score += 100;
        else if (isHindi) score += 80;
        else if (isIndianEnglish) score += 50;
        else if (isGeneralEnglish) score += 20;
      } else {
        // English
        if (isIndianEnglish) score += 100;
        else if (isGeneralEnglish && isHighQuality) score += 90;
        else if (isGeneralEnglish) score += 70;
      }
      break;
  }

  return score;
}

/**
 * Returns available voices ordered by quality and preference.
 */
export function getRankedVoices(
  quality: VoiceQualityPreference = 'AUTO',
  language: 'Hindi' | 'Hinglish' | 'English' = 'Hinglish'
): SpeechSynthesisVoice[] {
  const voices = getAvailableVoices();
  if (voices.length === 0) return [];

  return [...voices].sort((a, b) => {
    const scoreB = scoreVoice(b, quality, language);
    const scoreA = scoreVoice(a, quality, language);
    return scoreB - scoreA;
  });
}

/**
 * Finds the best voice according to preferences or selected name.
 */
export function findBestVoice(settings?: VoiceSettings): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  // 1. User selected a specific preferred voice name
  if (settings?.preferredVoiceName) {
    const exactMatch = voices.find((v) => v.name === settings.preferredVoiceName);
    if (exactMatch) return exactMatch;
  }

  // 2. Rank voices according to quality selector and language
  const quality = settings?.voiceQuality || 'AUTO';
  const language = settings?.language || 'Hinglish';
  const ranked = getRankedVoices(quality, language);

  return ranked.length > 0 ? ranked[0] : voices[0];
}

/**
 * Speaks text using the browser's native SpeechSynthesis API.
 */
export function speakText(
  text: string,
  settings?: VoiceSettings,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (!isSpeechSynthesisSupported()) {
    return false;
  }

  if (settings && settings.voiceOutputEnabled === false) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const cleanText = sanitizeForSpeech(text);
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = findBestVoice(settings);

    if (voice) {
      utterance.voice = voice;
      // Match utterance language directly to the chosen voice
      utterance.lang = voice.lang || 'en-IN';
    } else {
      if (settings?.language === 'Hindi') {
        utterance.lang = 'hi-IN';
      } else {
        utterance.lang = 'en-IN';
      }
    }

    if (settings) {
      utterance.rate = Math.max(0.5, Math.min(2.0, settings.voiceSpeed || 1.0));
      utterance.pitch = Math.max(0.5, Math.min(1.5, settings.pitch ?? 1.05));
      utterance.volume = Math.max(0, Math.min(1.0, (settings.voiceVolume ?? 85) / 100));
    }

    let hasEnded = false;
    const safeEnd = () => {
      if (!hasEnded) {
        hasEnded = true;
        notifySpeechState(false);
        if (onEnd) onEnd();
      }
    };

    utterance.onstart = () => {
      notifySpeechState(true, cleanText);
      if (onStart) onStart();
    };

    utterance.onend = safeEnd;

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Speech synthesis acoustic warning:', e.error);
      }
      safeEnd();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('Failed to execute speech synthesis:', err);
    notifySpeechState(false);
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Stops any active speech synthesis output.
 */
export function stopSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  notifySpeechState(false);
}

export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
}

// -------------------------------------------------------------
// SPEECH RECOGNITION (VOICE INPUT / STT)
// -------------------------------------------------------------

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onAudioStart?: () => void;
  onSpeechStart?: () => void;
  onInterimTranscript?: (interim: string) => void;
  onFinalTranscript?: (final: string) => void;
  onSpeechEnd?: () => void;
  onAudioEnd?: () => void;
  onError?: (errorMessage: string, isPermissionError?: boolean) => void;
  onEnd?: (finalTranscript: string) => void;
}

export interface SpeechRecognitionController {
  stop: () => void;
  abort: () => void;
}

/**
 * Initializes and starts Web Speech Recognition for command capture.
 * Follows continuous=false, interimResults=true, maxAlternatives=1.
 * Handled events: onstart, onaudiostart, onspeechstart, onresult, onspeechend, onaudioend, onerror, onend.
 */
export function startSpeechRecognition(
  language: 'Hindi' | 'Hinglish' | 'English' = 'Hinglish',
  handlers: SpeechRecognitionHandlers = {}
): SpeechRecognitionController | null {
  if (!isSpeechRecognitionSupported()) {
    handlers.onError?.('Speech Recognition is not supported in this browser. Please use Chrome or Edge.', false);
    return null;
  }

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  try {
    const recognizer = new SpeechRecognitionConstructor();
    recognizer.continuous = false; // Normal command mode single-turn
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;

    // Language configuration:
    // Hindi: hi-IN
    // Hinglish: hi-IN (users pronounce Hindi and English words together)
    // English: en-IN (Indian English acoustic model)
    if (language === 'Hindi' || language === 'Hinglish') {
      recognizer.lang = 'hi-IN';
    } else {
      recognizer.lang = 'en-IN';
    }

    let capturedFinal = '';
    let capturedInterim = '';
    let latestText = '';
    let stoppedManually = false;
    let hasSpeechStarted = false;
    let errorReported = false;

    recognizer.onstart = () => {
      handlers.onStart?.();
    };

    recognizer.onaudiostart = () => {
      handlers.onAudioStart?.();
    };

    recognizer.onspeechstart = () => {
      hasSpeechStarted = true;
      handlers.onSpeechStart?.();
    };

    recognizer.onresult = (event: any) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          currentFinal += (currentFinal ? ' ' : '') + text;
        } else {
          currentInterim += (currentInterim ? ' ' : '') + text;
        }
      }

      if (currentFinal) {
        capturedFinal = currentFinal;
        latestText = currentFinal;
        handlers.onFinalTranscript?.(currentFinal);
      }

      if (currentInterim) {
        capturedInterim = currentInterim;
        latestText = capturedFinal ? `${capturedFinal} ${currentInterim}` : currentInterim;
        handlers.onInterimTranscript?.(latestText);
      }
    };

    recognizer.onspeechend = () => {
      handlers.onSpeechEnd?.();
    };

    recognizer.onaudioend = () => {
      handlers.onAudioEnd?.();
    };

    recognizer.onerror = (event: any) => {
      const err = event.error;
      if (stoppedManually || err === 'aborted') {
        return;
      }

      errorReported = true;
      let errorMsg = 'Speech recognition error.';
      let isPermission = false;

      switch (err) {
        case 'not-allowed':
          errorMsg = 'Microphone permission denied.';
          isPermission = true;
          break;
        case 'no-speech':
          errorMsg = 'No speech detected.';
          break;
        case 'audio-capture':
          errorMsg = 'Microphone hardware unavailable or disconnected.';
          break;
        case 'network':
          errorMsg = 'Speech recognition network error.';
          break;
        case 'service-not-allowed':
          errorMsg = 'Speech recognition service not allowed by browser.';
          break;
        default:
          errorMsg = `Speech recognition error: ${err}`;
          break;
      }

      handlers.onError?.(errorMsg, isPermission);
    };

    recognizer.onend = () => {
      const finalResult = (capturedFinal || capturedInterim || latestText).trim();
      handlers.onEnd?.(finalResult);
    };

    recognizer.start();

    return {
      stop: () => {
        stoppedManually = true;
        try {
          recognizer.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        stoppedManually = true;
        try {
          recognizer.abort();
        } catch {
          // ignore
        }
      },
    };
  } catch (err: any) {
    handlers.onError?.(`Failed to initiate microphone: ${err?.message || err}`, false);
    return null;
  }
}
