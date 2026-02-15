# WebSocket Patterns

## Server Setup

```typescript
// src/server/integration/websocket.handler.ts
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { IWebSocketMessage } from '@shared/types/messages.types';
import { agentService } from '@services/agent.service';

export class WebSocketHandler {
  private _wss: WebSocketServer;
  private _clients = new Map<string, WebSocket>();
  private _heartbeatInterval: NodeJS.Timeout;

  constructor(server: HttpServer) {
    this._wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this._wss.on('connection', this._handleConnection.bind(this));

    // Heartbeat to detect stale connections
    this._heartbeatInterval = setInterval(() => {
      this._checkConnections();
    }, 30000);
  }

  private _handleConnection(ws: WebSocket) {
    const clientId = this._generateClientId();
    this._clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    // Send welcome message
    this._send(ws, 'connection:established', { clientId });

    ws.on('message', (data: Buffer) => {
      try {
        const message: IWebSocketMessage = JSON.parse(data.toString());
        this._handleMessage(clientId, ws, message);
      } catch (error) {
        this._sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      this._clients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this._clients.delete(clientId);
    });

    // Mark as alive for heartbeat
    (ws as any).isAlive = true;
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
  }

  private async _handleMessage(
    clientId: string,
    ws: WebSocket,
    message: IWebSocketMessage
  ) {
    const { type, payload, correlationId } = message;

    console.log(`Message from ${clientId}:`, type);

    try {
      switch (type) {
        case 'agent:start':
          await this._handleAgentStart(clientId, ws, payload, correlationId);
          break;

        case 'agent:message':
          await this._handleAgentMessage(clientId, ws, payload, correlationId);
          break;

        case 'agent:cancel':
          await this._handleAgentCancel(clientId, ws, correlationId);
          break;

        case 'ping':
          this._send(ws, 'pong', {}, correlationId);
          break;

        default:
          this._sendError(ws, `Unknown message type: ${type}`, correlationId);
      }
    } catch (error) {
      this._sendError(
        ws,
        error instanceof Error ? error.message : 'Unknown error',
        correlationId
      );
    }
  }

  private async _handleAgentStart(
    clientId: string,
    ws: WebSocket,
    payload: unknown,
    correlationId?: string
  ) {
    const { projectId, projectPath } = payload as { projectId: string; projectPath: string };
    await agentService.startSession(clientId, projectPath);
    this._send(ws, 'agent:started', { sessionId: clientId }, correlationId);
  }

  private async _handleAgentMessage(
    clientId: string,
    ws: WebSocket,
    payload: unknown,
    correlationId?: string
  ) {
    const { content } = payload as { content: string };
    // agentService will broadcast stream chunks via this handler
    await agentService.sendMessage(clientId, content);
  }

  private async _handleAgentCancel(
    clientId: string,
    ws: WebSocket,
    correlationId?: string
  ) {
    await agentService.cancelSession(clientId);
    this._send(ws, 'agent:cancelled', { sessionId: clientId }, correlationId);
  }

  private _send(
    ws: WebSocket,
    type: string,
    payload: unknown,
    correlationId?: string
  ) {
    if (ws.readyState === WebSocket.OPEN) {
      const message: IWebSocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
        ...(correlationId && { correlationId })
      };
      ws.send(JSON.stringify(message));
    }
  }

  private _sendError(ws: WebSocket, message: string, correlationId?: string) {
    this._send(ws, 'error', { message }, correlationId);
  }

  broadcast(type: string, payload: unknown) {
    const message: IWebSocketMessage = {
      type,
      payload,
      timestamp: Date.now()
    };
    const data = JSON.stringify(message);

    this._clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  sendToClient(clientId: string, type: string, payload: unknown) {
    const ws = this._clients.get(clientId);
    if (ws) {
      this._send(ws, type, payload);
    }
  }

  private _checkConnections() {
    this._clients.forEach((ws, clientId) => {
      if ((ws as any).isAlive === false) {
        console.log(`Terminating stale connection: ${clientId}`);
        ws.terminate();
        this._clients.delete(clientId);
        return;
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }

  private _generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy() {
    clearInterval(this._heartbeatInterval);
    this._wss.close();
  }
}
```

---

## Message Types

```typescript
// src/shared/types/messages.types.ts
export interface IWebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

// Client -> Server
export type ClientMessageType =
  | 'agent:start'
  | 'agent:message'
  | 'agent:cancel'
  | 'ping';

// Server -> Client
export type ServerMessageType =
  | 'connection:established'
  | 'agent:started'
  | 'agent:cancelled'
  | 'stream:chunk'
  | 'stream:complete'
  | 'stream:error'
  | 'status:update'
  | 'pong'
  | 'error';

// Payloads
export interface IAgentStartPayload {
  projectId: string;
  projectPath: string;
}

export interface IAgentMessagePayload {
  content: string;
}

export interface IStreamChunkPayload {
  sessionId: string;
  content: string;
}

export interface IStatusUpdatePayload {
  sessionId: string;
  status: 'idle' | 'thinking' | 'streaming' | 'error';
}
```

---

## Integration with Express

```typescript
// src/server/index.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketHandler } from '@integration/websocket.handler';
import { agentService } from '@services/agent.service';
import routes from './presentation/routes';

const app = express();
const server = createServer(app);

// Setup WebSocket
const wsHandler = new WebSocketHandler(server);

// Inject WebSocket handler into services that need it
agentService.inject({ wsHandler });

// Express middleware and routes
app.use(express.json());
app.use('/api', routes);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  wsHandler.destroy();
  server.close();
});
```

---

## Best Practices

1. **Use correlation IDs** - Track request-response pairs
2. **Implement heartbeat** - Detect stale connections
3. **Handle errors gracefully** - Don't crash on bad messages
4. **Log connections** - Track connects/disconnects
5. **Cleanup on shutdown** - Close connections gracefully
6. **Buffer messages** - Queue if client temporarily disconnected
