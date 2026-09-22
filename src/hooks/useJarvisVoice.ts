import { useState, useRef, useCallback, useEffect } from 'react';

interface UseJarvisVoiceReturn {
  playAudioBase64: (base64Audio: string) => Promise<void>;
  stopAudio: () => void;
  unlockAudio: () => void;
  isPlaying: boolean;
  volume: number; // For lip-sync (0.0 to 1.0)
}

export function useJarvisVoice(): UseJarvisVoiceReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextConstructor();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setVolume(0);
  }, []);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current || !isPlaying) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sumSquares = 0.0;
    for (let i = 0; i < dataArray.length; i++) {
      const norm = (dataArray[i] / 128.0) - 1.0;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    
    // Scale RMS for better lip-sync responsiveness (approx 0 to 1)
    const scaledVolume = Math.min(rms * 5.0, 1.0);
    setVolume(scaledVolume);

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setVolume(0);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, updateVolume]);

  const playAudioBase64 = useCallback(async (base64Audio: string) => {
    try {
      stopAudio(); // Stop any currently playing audio

      const ctx = initAudioContext();
      
      // Convert Base64 to ArrayBuffer
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      
      // Setup nodes
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      sourceNodeRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      source.onended = () => {
        setIsPlaying(false);
        setVolume(0);
      };

      source.start(0);
      setIsPlaying(true);
      
    } catch (err) {
      console.error('[useJarvisVoice] Failed to play audio:', err);
      setIsPlaying(false);
      setVolume(0);
    }
  }, [stopAudio]);

  const unlockAudio = useCallback(() => {
    initAudioContext();
  }, []);

  return { playAudioBase64, stopAudio, unlockAudio, isPlaying, volume };
}
