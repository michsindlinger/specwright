import express, { Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { WebSocketHandler } from './websocket.js';
import specsRouter from './routes/specs.js';
import projectRouter from './routes/project.routes.js';
import imageUploadRouter from './routes/image-upload.routes.js';
import quickTodoRouter from './routes/quick-todo.routes.js';
import attachmentFileRouter from './routes/attachment-file.routes.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
  websocketClients: number;
}

const app = express();
let server: Server;
let wsHandler: WebSocketHandler;

// Middleware
app.use(express.json({ limit: '30mb' }));

// API Routes
app.use('/api/project', projectRouter);
app.use('/api/specs/:specId', specsRouter);
app.use('/api/images', imageUploadRouter);
app.use('/api/backlog', quickTodoRouter);
app.use('/api/attachments', attachmentFileRouter);

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

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Initialize WebSocket handler after server starts
    wsHandler = new WebSocketHandler(server);
    console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  });
}

startServer();
