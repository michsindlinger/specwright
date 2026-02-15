---
description: Express.js + TypeScript backend development patterns for Agent OS Web UI
globs:
  - "src/server/**/*.ts"
alwaysApply: false
---

# Backend Express Skill

> Project: Agent OS Web UI
> Generated: 2026-01-30
> Framework: Express.js 4.x
> Language: TypeScript 5.x
> Agent SDK: @anthropic-ai/claude-code

## Quick Reference

### Route Handler Pattern
```typescript
// src/server/presentation/routes/projects.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '@services/project.service';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await projectService.getAll();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Service Pattern
```typescript
// src/server/services/project.service.ts
import { configReader } from '@integration/config.reader';
import { IProject } from '@shared/types/project.types';

class ProjectService {
  async getAll(): Promise<IProject[]> {
    const config = await configReader.loadConfig();
    return config.projects;
  }

  async getById(id: string): Promise<IProject | null> {
    const projects = await this.getAll();
    return projects.find(p => p.id === id) ?? null;
  }
}

export const projectService = new ProjectService();
```

### Layer Structure
```
src/server/
├── presentation/routes/    # Express route handlers (Presentation)
├── services/               # Business logic (Service Layer)
└── integration/            # Agent SDK, WebSocket, Config (Integration)
```

---

## Sub-Documents

- [Services](./services.md) - Service layer patterns
- [API Design](./api-design.md) - REST endpoint patterns
- [WebSocket](./websocket.md) - Real-time communication
- [Testing](./testing.md) - Backend testing patterns
- [Dos & Don'ts](./dos-and-donts.md) - Project learnings (self-updating)

---

## Key Patterns

### Error Handling Middleware

```typescript
// src/server/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Don't expose internal errors
  res.status(500).json({
    error: 'Internal server error'
  });
}
```

### Request Validation

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schema definition
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo')
});

// Validation middleware
export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
}

// Usage
router.post('/', validate(createTaskSchema), async (req, res, next) => {
  // req.body is now typed and validated
});
```

### Health Check Endpoint

```typescript
// src/server/presentation/routes/health.routes.ts
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
```

---

## WebSocket Integration

```typescript
// src/server/integration/websocket.handler.ts
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { IWebSocketMessage } from '@shared/types/messages.types';

export class WebSocketHandler {
  private _wss: WebSocketServer;
  private _clients = new Set<WebSocket>();

  constructor(server: http.Server) {
    this._wss = new WebSocketServer({ server, path: '/ws' });

    this._wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this._clients.add(ws);
      console.log('Client connected');

      ws.on('message', (data: Buffer) => {
        try {
          const message: IWebSocketMessage = JSON.parse(data.toString());
          this._handleMessage(ws, message);
        } catch (error) {
          this._sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this._clients.delete(ws);
        console.log('Client disconnected');
      });
    });
  }

  private _handleMessage(ws: WebSocket, message: IWebSocketMessage) {
    switch (message.type) {
      case 'agent:start':
        this._handleAgentStart(ws, message);
        break;
      case 'agent:message':
        this._handleAgentMessage(ws, message);
        break;
      case 'agent:cancel':
        this._handleAgentCancel(ws, message);
        break;
      default:
        this._sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private _send(ws: WebSocket, type: string, payload: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        payload,
        timestamp: Date.now()
      }));
    }
  }

  private _sendError(ws: WebSocket, message: string) {
    this._send(ws, 'stream:error', { message });
  }

  broadcast(type: string, payload: unknown) {
    this._clients.forEach(client => {
      this._send(client, type, payload);
    });
  }
}
```

---

## Agent SDK Integration

```typescript
// src/server/integration/agent-sdk.wrapper.ts
import { ClaudeAgent } from '@anthropic-ai/claude-code';

export class AgentSDKWrapper {
  private _agent: ClaudeAgent | null = null;

  async start(projectPath: string): Promise<void> {
    this._agent = new ClaudeAgent({
      cwd: projectPath
    });
  }

  async sendMessage(
    content: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    if (!this._agent) {
      throw new Error('Agent not started');
    }

    let fullResponse = '';

    const response = await this._agent.send(content, {
      onText: (text) => {
        fullResponse += text;
        onChunk(text);
      }
    });

    return fullResponse;
  }

  async cancel(): Promise<void> {
    // Implement cancellation logic
  }

  async stop(): Promise<void> {
    this._agent = null;
  }
}

export const agentSDK = new AgentSDKWrapper();
```

---

## Import Aliases

```typescript
// Use path aliases from tsconfig.json
import { projectService } from '@services/project.service';
import { agentSDK } from '@integration/agent-sdk.wrapper';
import { IProject } from '@shared/types/project.types';
```

---

## Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/projects', () => {
  it('returns list of projects', async () => {
    const response = await request(app)
      .get('/api/projects')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns 404 for unknown project', async () => {
    const response = await request(app)
      .get('/api/projects/unknown-id')
      .expect(404);

    expect(response.body.error).toBe('Project not found');
  });
});
```
