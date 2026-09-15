import express, { Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketHandler } from './websocket.js';
import projectRouter from './routes/project.routes.js';
import imageUploadRouter from './routes/image-upload.routes.js';
import versionRouter from './routes/version.routes.js';
import teamRouter from './routes/team.routes.js';
import { createCloudTerminalRouter } from './routes/cloud-terminal.routes.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST ?? '0.0.0.0';
const __dirname = dirname(fileURLToPath(import.meta.url));

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
  websocketClients: number;
}

const app = express();
let server: Server;
let wsHandler: WebSocketHandler;

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

// Middleware
app.use(express.json({ limit: '30mb' }));

// API Routes
app.use('/api/project', projectRouter);
app.use('/api/images', imageUploadRouter);
app.use('/api/version', versionRouter);
app.use('/api/team', teamRouter);
// Stop-hook callback (agent-finished bell). Resolves wsHandler lazily — it does
// not exist until server.listen (same reason /health reads it lazily).
app.use('/api/cloud-terminal', createCloudTerminalRouter(() => wsHandler?.getCloudTerminalManager()));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    websocketClients: wsHandler ? wsHandler.getClientCount() : 0
  };
  res.json(response);
});

// Deploy-readiness gate (localhost-only, unauthenticated — bound to HOST=127.0.0.1
// in production). Polled by the auto-deploy script before restarting the service so
// a redeploy is deferred while a review answer was sent but not yet confirmed by
// the session (INT-2026-004, FA-34 — at most 10 s).
// Reads `wsHandler` lazily (same pattern as /health): if it's still null the server
// is mid-startup, so we report ready=true (fail-open — a restart now is harmless).
// JSON keys stay additive (`ready`, `reason`, `autoMode`, `reviewSend`); the host
// script reads the HTTP status. `autoMode` stays as a constant for older readers —
// the auto-mode itself went with the story path (INT-2026-004, stage 3).
app.get('/api/status/deploy-readiness', (_req: Request, res: Response) => {
  const autoMode = { specOrchestrators: 0, backlogOrchestrators: 0 };
  if (!wsHandler) {
    res.status(200).json({ ready: true, reason: 'starting', autoMode, reviewSend: { pending: false } });
    return;
  }
  const reviewPending = wsHandler.getVorhabenService().hasPendingSend();
  res.status(reviewPending ? 423 : 200).json({
    ready: !reviewPending,
    reason: reviewPending ? 'review-send-pending' : 'idle',
    autoMode,
    reviewSend: { pending: reviewPending },
  });
});

// Serve frontend in production mode (built files from frontend/dist)
const frontendDist = join(__dirname, '../../frontend/dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (wsHandler) {
    wsHandler.shutdown();
  }

  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start server
function startServer(): void {
  server = createServer(app);

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} already in use`);
      process.exit(1);
    }
    throw error;
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);

    // Initialize WebSocket handler after server starts
    wsHandler = new WebSocketHandler(server);
    console.log(`WebSocket server ready on ws://${HOST}:${PORT}`);
  });
}

startServer();
