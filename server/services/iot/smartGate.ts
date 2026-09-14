/**
 * smartGate.ts — Smart Gate Actuator Service
 *
 * Fires secure HTTP POST commands to an ESP32 relay micro-controller
 * to physically UNLOCK, LOCK, or PULSE_UNLOCK a smart gate/door.
 *
 * Configuration (via .env):
 *   SMART_GATE_ENDPOINT  — e.g. http://192.168.1.50/gate
 *   SMART_GATE_AUTH_TOKEN — Optional Bearer token for ESP32 security
 *
 * If SMART_GATE_ENDPOINT is not configured, all commands return a clean
 * error without throwing — the main server is never affected.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GateCommand = 'UNLOCK' | 'LOCK' | 'PULSE_UNLOCK';

export type GateState = 'OPEN' | 'CLOSED' | 'UNKNOWN' | 'ERROR';

export interface GateResult {
  success: boolean;
  action: GateCommand | null;
  state: GateState;
  message: string;
  latencyMs: number;
  error?: string;
}

// ─── In-Memory State ───────────────────────────────────────────────────────────

let currentGateState: GateState = 'UNKNOWN';
let lastCommandAt: string | null = null;
let lastCommand: GateCommand | null = null;

export function getGateState(): {
  state: GateState;
  lastCommand: GateCommand | null;
  lastCommandAt: string | null;
  endpointConfigured: boolean;
} {
  return {
    state: currentGateState,
    lastCommand,
    lastCommandAt,
    endpointConfigured: Boolean(process.env.SMART_GATE_ENDPOINT?.trim()),
  };
}

// ─── HTTP Command Dispatcher ───────────────────────────────────────────────────

const GATE_TIMEOUT_MS = 8_000;
const MAX_RETRIES     = 1;

async function dispatchToESP32(
  endpoint: string,
  command: GateCommand,
  reason: string,
  authToken?: string
): Promise<{ ok: boolean; body: any; status: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const body = JSON.stringify({
    command,
    reason,
    timestamp: new Date().toISOString(),
    source: 'super-ai',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GATE_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    const responseBody = await res.json().catch(() => ({}));
    return { ok: res.ok, body: responseBody, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main Gate Trigger ─────────────────────────────────────────────────────────

export async function triggerGate(
  command: GateCommand,
  reason = 'User command via Super AI'
): Promise<GateResult> {
  const startTime = Date.now();

  const endpoint = process.env.SMART_GATE_ENDPOINT?.trim();
  const authToken = process.env.SMART_GATE_AUTH_TOKEN?.trim();

  // Guard: hardware not configured
  if (!endpoint) {
    console.warn('[SmartGate] SMART_GATE_ENDPOINT not configured — gate command skipped.');
    return {
      success: false,
      action: command,
      state: 'UNKNOWN',
      message: 'Smart gate endpoint not configured. Set SMART_GATE_ENDPOINT in .env to enable.',
      latencyMs: Date.now() - startTime,
      error: 'ENDPOINT_NOT_CONFIGURED',
    };
  }

  let lastErr: string = '';

  // Attempt with one retry
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[SmartGate] Sending ${command} to ${endpoint} (attempt ${attempt + 1})`);
      const result = await dispatchToESP32(endpoint, command, reason, authToken);

      if (result.ok) {
        // Update state based on command
        const newState: GateState =
          command === 'LOCK'         ? 'CLOSED' :
          command === 'UNLOCK'       ? 'OPEN'   :
          command === 'PULSE_UNLOCK' ? 'OPEN'   : // will re-close after 5s
          'UNKNOWN';

        currentGateState = newState;
        lastCommand      = command;
        lastCommandAt    = new Date().toISOString();

        // PULSE_UNLOCK: schedule state update back to CLOSED after 5s
        if (command === 'PULSE_UNLOCK') {
          setTimeout(() => {
            if (currentGateState === 'OPEN') {
              currentGateState = 'CLOSED';
              console.log('[SmartGate] PULSE_UNLOCK: gate auto-relocked.');
            }
          }, 5_500).unref();
        }

        console.log(`[SmartGate] ✅ ${command} success → state: ${newState}`);
        return {
          success: true,
          action: command,
          state: newState,
          message: `Gate ${command === 'LOCK' ? 'locked' : command === 'PULSE_UNLOCK' ? 'pulse-unlocked (auto-relock in 5s)' : 'unlocked'} successfully.`,
          latencyMs: Date.now() - startTime,
        };
      }

      lastErr = `HTTP ${result.status}: ${JSON.stringify(result.body)}`;
      console.warn(`[SmartGate] Attempt ${attempt + 1} failed: ${lastErr}`);

    } catch (err: any) {
      lastErr = err.name === 'AbortError'
        ? `Timeout after ${GATE_TIMEOUT_MS}ms — ESP32 not responding`
        : `Network error: ${err.message}`;
      console.warn(`[SmartGate] Attempt ${attempt + 1} error: ${lastErr}`);
    }

    // Brief pause before retry
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // All attempts failed
  currentGateState = 'ERROR';
  return {
    success: false,
    action: command,
    state: 'ERROR',
    message: `Gate command failed after ${MAX_RETRIES + 1} attempt(s).`,
    latencyMs: Date.now() - startTime,
    error: lastErr,
  };
}
