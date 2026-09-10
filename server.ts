import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiKeysRouter } from './server/routes/apiKeys.js';
import { configRouter } from './server/routes/config.js';
import { chatRouter } from './server/routes/chat.js';
import { memoryRouter } from './server/routes/memory.js';
import { taskRouter } from './server/routes/tasks.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard JSON middleware for API endpoints
  app.use(express.json());

  // API routes mounted FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/keys', apiKeysRouter);
  app.use('/api/config', configRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/memory', memoryRouter);
  app.use('/api/tasks', taskRouter);

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Super AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
