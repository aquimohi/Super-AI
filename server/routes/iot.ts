/**
 * IoT Routes — ESP32 Radar Webhook + Gate Status
 *
 * POST /api/iot/radar/event  — receive ESP32 mmWave sensor data
 * GET  /api/iot/radar/state  — poll latest radar state
 * GET  /api/iot/gate/status  — poll current gate state
 */

import { Router, Request, Response } from 'express';
import {
  processRadarEvent,
  getLatestRadarState,
  validateRadarWebhookSignature,
} from '../services/iot/radarSensor.js';
import { getGateState } from '../services/iot/smartGate.js';

export const iotRouter = Router();

// ─── Radar Webhook ─────────────────────────────────────────────────────────────

iotRouter.post('/radar/event', (req: Request, res: Response) => {
  try {
    // Optional HMAC signature validation
    const rawBody = JSON.stringify(req.body);
    const sig     = req.headers['x-radar-signature'] as string | undefined;

    if (!validateRadarWebhookSignature(rawBody, sig)) {
      console.warn('[IoT] Radar webhook signature validation failed');
      return res.status(401).json({ ok: false, error: 'Invalid webhook signature' });
    }

    const result = processRadarEvent(req.body);

    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    return res.json({
      ok: true,
      reading: result.reading,
      ts: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[IoT] Radar webhook error:', err.message);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ─── Radar State Poll (HTTP fallback) ─────────────────────────────────────────

iotRouter.get('/radar/state', (_req: Request, res: Response) => {
  try {
    const state = getLatestRadarState();
    return res.json({ ok: true, ...state });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Gate Status Poll ──────────────────────────────────────────────────────────

iotRouter.get('/gate/status', (_req: Request, res: Response) => {
  try {
    const status = getGateState();
    return res.json({ ok: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});
