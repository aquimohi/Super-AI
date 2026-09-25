import express from 'express';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { apiKeysRouter } from './server/routes/apiKeys.js';
import { configRouter } from './server/routes/config.js';
import { chatRouter } from './server/routes/chat.js';
import { memoryRouter } from './server/routes/memory.js';
import { taskRouter } from './server/routes/tasks.js';
import { sandboxRouter } from './server/routes/sandbox.js';
import { iotRouter } from './server/routes/iot.js';
import { scraperRouter } from './server/routes/scraper.js';
import { emailRouter } from './server/routes/email.js';
import { RadarEventBus, RadarEventPayload, getLatestRadarState } from './server/services/iot/radarSensor.js';
import { initTelegramBot, stopTelegramBot } from './server/services/telegramBot.js';
import { initVoiceStreamingServer } from './server/services/voice/streamingSocket.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard JSON middleware for API endpoints
  app.use(express.json());

  // ── API Routes ──────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/keys', apiKeysRouter);
  app.use('/api/config', configRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/memory', memoryRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/sandbox', sandboxRouter);
  // Phase 3 — IoT Hardware Integration
  app.use('/api/iot', iotRouter);
  // Google Maps Lead Scraper Module
  app.use('/api/scraper', scraperRouter);
  // SMTP Outgoing Email Module
  app.use('/api/email', emailRouter);

  // Serve static assets from public folder (including GLB models)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) });
    }
  });

  // ── Shared HTTP server (Express + WebSocket share port 3000) ───────────────
  const httpServer = http.createServer(app);

  // ── WebSocket Server: /api/ws/radar ────────────────────────────────────────
  const MAX_WS_CLIENTS    = 20;
  const WS_PING_INTERVAL  = 30_000;

  const wss = new WebSocketServer({ noServer: true });

  // Mount the Voice Streaming Server (handles /api/ws/voice)
  initVoiceStreamingServer(httpServer);

  // Upgrade handler for /api/ws/radar
  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
      if (url.pathname === '/api/ws/radar') {
        if (wss.clients.size >= MAX_WS_CLIENTS) {
          socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
      // Note: /api/ws/voice is handled by initVoiceStreamingServer
      // which also listens to httpServer.on('upgrade')
      // To prevent socket destruction collisions, we only destroy if neither matched.
      else if (url.pathname !== '/api/ws/voice') {
        socket.destroy();
      }
    } catch (err: any) {
      console.warn('[RadarWS] Upgrade error:', err.message);
      socket.destroy();
    }
  });

  // WS connection lifecycle
  wss.on('connection', (ws: WebSocket) => {
    console.log(`[RadarWS] Client connected (active: ${wss.clients.size})`);

    (ws as any).isAlive = true;
    ws.on('pong', () => { (ws as any).isAlive = true; });

    ws.on('close', () => {
      console.log(`[RadarWS] Client disconnected (active: ${wss.clients.size})`);
    });

    ws.on('error', (err) => {
      console.warn('[RadarWS] Client error:', err.message);
    });

    // Send current radar snapshot immediately on connect (synchronous getter)
    try {
      const snap = getLatestRadarState();
      if (snap.reading) {
        ws.send(JSON.stringify({ type: 'radar_state', ...snap }));
      }
    } catch { /* module may not have data yet */ }
  });

  // 30s heartbeat — terminate zombie connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        ws.terminate();
        return;
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, WS_PING_INTERVAL);

  wss.on('close', () => clearInterval(heartbeatInterval));

  // ── Radar Event → WS Broadcast ─────────────────────────────────────────────
  RadarEventBus.on('reading', (payload: RadarEventPayload) => {
    if (wss.clients.size === 0) return;
    const message = JSON.stringify({ type: 'radar_reading', ...payload });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, (err) => {
          if (err) console.warn('[RadarWS] Send error:', err.message);
        });
      }
    });
  });

  RadarEventBus.on('offline', (info: { sensorId: string }) => {
    if (wss.clients.size === 0) return;
    const message = JSON.stringify({ type: 'radar_offline', sensorId: info.sensorId });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // ── Start listening ─────────────────────────────────────────────────────────
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Super AI server running on http://0.0.0.0:${PORT}`);
    console.log(`[RadarWS]    WebSocket: ws://localhost:${PORT}/api/ws/radar`);
    console.log(`[IoT]        Radar webhook: POST http://localhost:${PORT}/api/iot/radar/event`);

    // Start Telegram bridge concurrently — never blocks server startup
    initTelegramBot().catch((err) =>
      console.error('[TelegramBot] Startup failed (server continues):', err?.message || err)
    );
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async () => {
    console.log('\n[Server] Shutting down gracefully...');
    clearInterval(heartbeatInterval);
    wss.close();
    await stopTelegramBot();
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer();
