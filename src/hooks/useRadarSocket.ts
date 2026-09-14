/**
 * useRadarSocket.ts — Auto-reconnecting WebSocket hook for live radar data
 *
 * Connects to ws://localhost:3000/api/ws/radar and exposes:
 *   - radarData: latest RadarReading from the ESP32 sensor (null if offline)
 *   - socketState: 'connecting' | 'connected' | 'disconnected' | 'error'
 *   - presenceFrames / motionFrames: consecutive detection counters
 *
 * Auto-reconnects with exponential backoff (1s → 2s → 4s → max 30s).
 * Cleans up on component unmount. Never throws.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RadarReading, RadarSocketState } from '../types';

export interface UseRadarSocketResult {
  radarData: RadarReading | null;
  socketState: RadarSocketState;
  presenceFrames: number;
  motionFrames: number;
  isOnline: boolean;
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/radar`;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS     = 30_000;

export function useRadarSocket(): UseRadarSocketResult {
  const [radarData,     setRadarData]     = useState<RadarReading | null>(null);
  const [socketState,   setSocketState]   = useState<RadarSocketState>('connecting');
  const [presenceFrames, setPresenceFrames] = useState(0);
  const [motionFrames,   setMotionFrames]   = useState(0);
  const [isOnline,      setIsOnline]      = useState(false);

  const wsRef        = useRef<WebSocket | null>(null);
  const backoffRef   = useRef(INITIAL_BACKOFF_MS);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    try {
      setSocketState('connecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        setSocketState('connected');
        backoffRef.current = INITIAL_BACKOFF_MS; // reset backoff on success
        console.log('[RadarSocket] Connected to', WS_URL);
      };

      ws.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === 'radar_reading' || msg.type === 'radar_state') {
            if (msg.reading) {
              setRadarData(msg.reading as RadarReading);
              setPresenceFrames(msg.presenceFrames ?? 0);
              setMotionFrames(msg.motionFrames ?? 0);
              setIsOnline(msg.online !== false);
            }
          } else if (msg.type === 'radar_offline') {
            // Sensor went offline — clear data so UI resets to default state
            setRadarData(prev =>
              prev && prev.sensorId === msg.sensorId
                ? { ...prev, presence: false, motion: false, breathingRate: null }
                : prev
            );
            setPresenceFrames(0);
            setMotionFrames(0);
            setIsOnline(false);
          }
        } catch (err) {
          console.warn('[RadarSocket] Message parse error:', err);
        }
      };

      ws.onclose = (event) => {
        if (unmountedRef.current) return;
        console.log(`[RadarSocket] Disconnected (code: ${event.code}). Reconnecting in ${backoffRef.current}ms...`);
        setSocketState('disconnected');
        setIsOnline(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (unmountedRef.current) return;
        setSocketState('error');
        // onclose will fire after onerror — handles reconnect
      };

    } catch (err: any) {
      console.warn('[RadarSocket] Connection failed:', err.message);
      setSocketState('error');
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    retryTimerRef.current = setTimeout(() => {
      if (!unmountedRef.current) {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        connect();
      }
    }, backoffRef.current);
  }, [connect]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { radarData, socketState, presenceFrames, motionFrames, isOnline };
}
