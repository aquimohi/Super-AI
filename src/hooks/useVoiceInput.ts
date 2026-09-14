import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
const SpeechRecognition =
  (window as unknown as IWindow).SpeechRecognition ||
  (window as unknown as IWindow).webkitSpeechRecognition;

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  startWakeWordMode: () => void;
  stopWakeWordMode: () => void;
  startPushToTalk: () => void;
  stopPushToTalk: () => void;
  isWakeWordMode: boolean;
  error: string | null;
  setLanguage: (lang: string) => void;
}

export interface UseVoiceInputProps {
  onWakeWordDetected?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  pauseRecognition?: boolean; // Used to temporarily stop listening while AI speaks
}

export function useVoiceInput({
  onWakeWordDetected,
  onFinalTranscript,
  pauseRecognition = false,
}: UseVoiceInputProps = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('en-IN');

  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to avoid dependency cycles in callbacks
  const isWakeWordModeRef = useRef(false);
  const isPushToTalkRef = useRef(false);
  const isPausedRef = useRef(pauseRecognition);
  const langRef = useRef(language);

  // Keep refs in sync
  useEffect(() => {
    isPausedRef.current = pauseRecognition;
    // If paused while we were actively listening, we should stop it,
    // and if wake word mode is active, it will auto-restart once unpaused.
    if (pauseRecognition && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }, [pauseRecognition]);

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  const clearRestartTimeout = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  const initRecognition = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Browser doesn't support speech recognition.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langRef.current;
    
    // In Wake Word mode, we want continuous and interim results
    // In PTT mode, continuous=false, interimResults=true (for live feedback)
    recognition.continuous = isWakeWordModeRef.current;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      if (isPausedRef.current) return;

      let interimStr = '';
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalStr += result[0].transcript;
        } else {
          interimStr += result[0].transcript;
        }
      }

      const currentText = finalStr || interimStr;
      setTranscript(currentText);

      // Handle Wake Word Logic
      if (isWakeWordModeRef.current && finalStr) {
        const lower = finalStr.toLowerCase();
        if (lower.includes('jarvis') || lower.includes('hey jarvis')) {
          // Strip the wake word
          let cleaned = lower.replace(/hey jarvis|jarvis/g, '').trim();
          if (cleaned && onWakeWordDetected) {
            onWakeWordDetected(finalStr.replace(/hey jarvis|jarvis/gi, '').trim());
          }
        }
        // Clear transcript after processing final in wake word mode
        setTranscript('');
      }

      // Handle Push To Talk Logic
      if (isPushToTalkRef.current && finalStr) {
        setTranscript('');
        if (onFinalTranscript) {
          onFinalTranscript(finalStr.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError("Mic permission denied \u2014 Chrome settings se allow karein");
        stopListening(true);
      } else if (event.error === 'no-speech') {
        // Ignore silent no-speech, let it naturally restart if in wake word mode
      } else if (event.error === 'aborted') {
        // Expected when we manually abort
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Auto-restart logic for Wake Word mode (if not paused)
      if (isWakeWordModeRef.current && !isPausedRef.current) {
        clearRestartTimeout();
        restartTimeoutRef.current = setTimeout(() => {
          if (isWakeWordModeRef.current && !isPausedRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              // Ignore start errors (often caused by already started)
            }
          }
        }, 300);
      } else if (isPushToTalkRef.current) {
        // Push to talk finished normally (user stopped speaking and we got onend)
        isPushToTalkRef.current = false;
        setTranscript('');
      }
    };

    return recognition;
  }, [onWakeWordDetected, onFinalTranscript]);

  const stopListening = useCallback((hardStop = false) => {
    isPushToTalkRef.current = false;
    if (hardStop) {
      isWakeWordModeRef.current = false;
      setIsWakeWordMode(false);
    }
    clearRestartTimeout();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
  }, []);

  const startWakeWordMode = useCallback(() => {
    stopListening();
    isWakeWordModeRef.current = true;
    setIsWakeWordMode(true);
    isPushToTalkRef.current = false;
    
    recognitionRef.current = initRecognition();
    if (recognitionRef.current && !isPausedRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }, [initRecognition, stopListening]);

  const stopWakeWordMode = useCallback(() => {
    stopListening(true);
  }, [stopListening]);

  const startPushToTalk = useCallback(() => {
    stopListening();
    isPushToTalkRef.current = true;
    isWakeWordModeRef.current = false;
    setIsWakeWordMode(false);

    recognitionRef.current = initRecognition();
    if (recognitionRef.current && !isPausedRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }, [initRecognition, stopListening]);

  const stopPushToTalk = useCallback(() => {
    // Calling stop() allows final transcript to be processed, unlike abort()
    if (recognitionRef.current && isPushToTalkRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, []);

  // Effect: Auto-restart Wake Word if unpaused
  useEffect(() => {
    if (!pauseRecognition && isWakeWordMode && !isListening) {
      // Re-initiate listening
      clearRestartTimeout();
      restartTimeoutRef.current = setTimeout(() => {
        if (isWakeWordModeRef.current && !isPausedRef.current) {
          recognitionRef.current = initRecognition();
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }
      }, 500);
    }
  }, [pauseRecognition, isWakeWordMode, isListening, initRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening(true);
    };
  }, [stopListening]);

  // Clear error automatically when starting to listen
  useEffect(() => {
    if (isListening && error) {
      setError(null);
    }
  }, [isListening, error]);

  return {
    isListening,
    transcript,
    startWakeWordMode,
    stopWakeWordMode,
    startPushToTalk,
    stopPushToTalk,
    isWakeWordMode,
    error,
    setLanguage
  };
}
