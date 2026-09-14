import { useState, useRef, useCallback, useEffect } from 'react';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/voice`;

export function useVoiceStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'start' }));
        setIsStreaming(true);

        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextConstructor();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Note: ScriptProcessorNode is deprecated but reliable across all older browsers for simple PCM extraction.
        // In a full production app, an AudioWorklet should be used.
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate volume for UI visualizer
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setVolume(rms);

          // Convert Float32Array to Int16Array PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          if (ws.readyState === WebSocket.OPEN) {
            // Send binary PCM chunk over websocket
            ws.send(pcm16.buffer);
          }
        };
      };

      ws.onclose = () => {
        stopStream();
      };
      
      ws.onerror = (err) => {
        console.error('[useVoiceStream] WebSocket error', err);
        stopStream();
      };

    } catch (err) {
      console.error('[useVoiceStream] Failed to start stream:', err);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsStreaming(false);
    setVolume(0);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    volume,
    startStream,
    stopStream,
  };
}
