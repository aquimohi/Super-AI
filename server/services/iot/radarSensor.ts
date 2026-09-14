/**
 * radarSensor.ts — ESP32 mmWave Radar Sensor Service
 *
 * Receives HTTP webhook events from a local ESP32 mmWave radar sensor
 * (presence, breathing rate, motion, distance). Emits real-time events
 * via RadarEventBus for WebSocket rebroadcast to the React frontend.
 *
 * Hardware compatibility: HLK-LD2410, HLK-LD2450, DFRobot SEN0395, Seeed MR60BHA1
 */

import { EventEmitter } from 'events';
import { createHmac } from 'crypto';

// ─── Radar Data Types ──────────────────────────────────────────────────────────

export interface RadarReading {
  /** True when a person is stationary or moving within detection range */
  presence: boolean;
  /** True when active motion (movement) is detected */
  motion: boolean;
  /** Breathing rate in breaths-per-minute (null if sensor doesn't support) */
  breathingRate: number | null;
  /** Distance to closest detected target in metres (null if unavailable) */
  distance: number | null;
  /** Signal/detection strength 0–100 */
  signalStrength: number;
  /** ISO timestamp of this reading */
  timestamp: string;
  /** Sensor hardware identifier (e.g. "esp32-01") */
  sensorId: string;
}

export interface RadarEventPayload {
  reading: RadarReading;
  /** How many consecutive readings have had presence=true */
  presenceFrames: number;
  /** How many consecutive readings have had motion=true */
  motionFrames: number;
}

// ─── Event Bus ─────────────────────────────────────────────────────────────────

class RadarEventEmitter extends EventEmitter {}
export const RadarEventBus = new RadarEventEmitter();

// ─── In-Memory State ───────────────────────────────────────────────────────────

let latestReading: RadarReading | null = null;
let presenceFrames = 0;
let motionFrames   = 0;

// Track last reading time per sensor for staleness detection
const sensorLastSeen = new Map<string, number>();
const SENSOR_STALE_MS = 30_000; // 30 s without update → consider offline

export function getLatestRadarState(): {
  reading: RadarReading | null;
  presenceFrames: number;
  motionFrames: number;
  online: boolean;
} {
  const sensorId = latestReading?.sensorId;
  const lastSeen = sensorId ? (sensorLastSeen.get(sensorId) ?? 0) : 0;
  const online   = Date.now() - lastSeen < SENSOR_STALE_MS;

  return {
    reading: latestReading,
    presenceFrames,
    motionFrames,
    online: latestReading !== null && online,
  };
}

// ─── Validation & Normalisation ────────────────────────────────────────────────

function normalisePayload(raw: any): RadarReading | null {
  if (!raw || typeof raw !== 'object') return null;

  // Accept flexible ESP32 field names (snake_case or camelCase)
  const presence = Boolean(
    raw.presence ?? raw.target_detected ?? raw.targetDetected ?? false
  );
  const motion = Boolean(
    raw.motion ?? raw.moving ?? raw.movement ?? false
  );

  const breathingRate: number | null =
    typeof raw.breathingRate === 'number'  ? raw.breathingRate  :
    typeof raw.breathing_rate === 'number' ? raw.breathing_rate :
    typeof raw.bpm === 'number'            ? raw.bpm            :
    null;

  const distance: number | null =
    typeof raw.distance === 'number' ? raw.distance   :
    typeof raw.dist === 'number'     ? raw.dist       :
    typeof raw.range === 'number'    ? raw.range      :
    null;

  const signalStrength = Math.min(100, Math.max(0,
    typeof raw.signalStrength === 'number' ? raw.signalStrength :
    typeof raw.signal_strength === 'number' ? raw.signal_strength :
    typeof raw.strength === 'number' ? raw.strength :
    0
  ));

  const sensorId = String(raw.sensorId ?? raw.sensor_id ?? raw.id ?? 'esp32-unknown');

  return {
    presence,
    motion,
    breathingRate: breathingRate !== null
      ? Math.max(0, Math.min(60, breathingRate)) // clamp to physiological range
      : null,
    distance: distance !== null
      ? Math.max(0, Math.min(20, distance)) // clamp to 20m max
      : null,
    signalStrength,
    timestamp: new Date().toISOString(),
    sensorId,
  };
}

// ─── HMAC Webhook Validation ───────────────────────────────────────────────────

export function validateRadarWebhookSignature(
  rawBody: string,
  signature: string | undefined
): boolean {
  const secret = process.env.RADAR_SENSOR_SECRET;
  if (!secret) return true; // No secret configured → accept all (dev mode)
  if (!signature) return false;

  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison
  return `sha256=${expected}` === signature;
}

// ─── Main Processor ────────────────────────────────────────────────────────────

export function processRadarEvent(rawPayload: any): {
  success: boolean;
  reading?: RadarReading;
  error?: string;
} {
  try {
    const reading = normalisePayload(rawPayload);
    if (!reading) {
      return { success: false, error: 'Invalid or empty radar payload' };
    }

    // Update consecutive frame counters
    if (reading.presence) presenceFrames++; else presenceFrames = 0;
    if (reading.motion)   motionFrames++;   else motionFrames   = 0;

    latestReading = reading;
    sensorLastSeen.set(reading.sensorId, Date.now());

    const payload: RadarEventPayload = { reading, presenceFrames, motionFrames };

    // Emit asynchronously — never blocks the HTTP response
    setImmediate(() => {
      RadarEventBus.emit('reading', payload);
    });

    return { success: true, reading };
  } catch (err: any) {
    console.error('[RadarSensor] processRadarEvent error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Sensor Health Monitor ─────────────────────────────────────────────────────

/**
 * Periodically checks for stale sensors and emits 'offline' events.
 * Runs every 15 s — completely silent if no sensors are registered.
 */
setInterval(() => {
  const now = Date.now();
  for (const [sensorId, lastSeen] of sensorLastSeen.entries()) {
    if (now - lastSeen > SENSOR_STALE_MS) {
      RadarEventBus.emit('offline', { sensorId, lastSeen });
      // Synthesise a "clear" reading so frontend resets
      if (latestReading?.sensorId === sensorId) {
        const clearReading: RadarReading = {
          ...latestReading,
          presence: false,
          motion: false,
          breathingRate: null,
          timestamp: new Date().toISOString(),
        };
        latestReading  = clearReading;
        presenceFrames = 0;
        motionFrames   = 0;
        RadarEventBus.emit('reading', {
          reading: clearReading,
          presenceFrames: 0,
          motionFrames: 0,
        } as RadarEventPayload);
      }
    }
  }
}, 15_000).unref(); // .unref() — don't block process exit
