# API Integration Patterns

## REST API Client

### Client Setup

```typescript
// src/client/services/api.client.ts
const API_BASE = 'http://localhost:3001/api';

class ApiClient {
  private async _fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'Request failed');
    }

    return response.json();
  }

  // Projects
  async getProjects(): Promise<IProject[]> {
    return this._fetch('/projects');
  }

  async getProject(id: string): Promise<IProject> {
    return this._fetch(`/projects/${id}`);
  }

  // Tasks
  async getTasks(projectId: string): Promise<ITask[]> {
    return this._fetch(`/projects/${projectId}/tasks`);
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ITask> {
    return this._fetch(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiClient = new ApiClient();
```

### Error Handling

```typescript
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Usage in component
private async _loadData() {
  try {
    this._data = await apiClient.getProjects();
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 404) {
        this._error = 'Project not found';
      } else if (e.status >= 500) {
        this._error = 'Server error. Please try again.';
      }
    } else {
      this._error = 'Network error. Check your connection.';
    }
  }
}
```

---

## WebSocket Client

### Client Setup

```typescript
// src/client/services/websocket.client.ts
import { IWebSocketMessage } from '@shared/types/messages.types';

type MessageHandler = (message: IWebSocketMessage) => void;

class WebSocketClient {
  private _ws: WebSocket | null = null;
  private _handlers = new Map<string, Set<MessageHandler>>();
  private _reconnectAttempts = 0;
  private _maxReconnectAttempts = 5;

  connect(url = 'ws://localhost:3001/ws') {
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      console.log('WebSocket connected');
      this._reconnectAttempts = 0;
      this._emit('connection', { type: 'status:connected', payload: null, timestamp: Date.now() });
    };

    this._ws.onmessage = (event) => {
      const message: IWebSocketMessage = JSON.parse(event.data);
      this._emit(message.type, message);
    };

    this._ws.onclose = () => {
      console.log('WebSocket disconnected');
      this._emit('connection', { type: 'status:disconnected', payload: null, timestamp: Date.now() });
      this._scheduleReconnect();
    };

    this._ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    this._ws?.close();
    this._ws = null;
  }

  send(type: string, payload: unknown) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      const message: IWebSocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };
      this._ws.send(JSON.stringify(message));
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this._handlers.has(type)) {
      this._handlers.set(type, new Set());
    }
    this._handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => this._handlers.get(type)?.delete(handler);
  }

  private _emit(type: string, message: IWebSocketMessage) {
    this._handlers.get(type)?.forEach(handler => handler(message));
    this._handlers.get('*')?.forEach(handler => handler(message));
  }

  private _scheduleReconnect() {
    if (this._reconnectAttempts < this._maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 30000);
      this._reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    }
  }
}

export const wsClient = new WebSocketClient();
```

### Using WebSocket in Components

```typescript
@customElement('aos-chat-view')
export class AosChatView extends LitElement {
  @state() private _messages: IMessage[] = [];
  @state() private _isStreaming = false;
  @state() private _streamingContent = '';

  private _unsubscribes: (() => void)[] = [];

  connectedCallback() {
    super.connectedCallback();

    // Subscribe to WebSocket events
    this._unsubscribes.push(
      wsClient.on('stream:chunk', this._handleStreamChunk),
      wsClient.on('stream:complete', this._handleStreamComplete),
      wsClient.on('stream:error', this._handleStreamError)
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribes.forEach(unsub => unsub());
  }

  private _handleStreamChunk = (msg: IWebSocketMessage) => {
    this._isStreaming = true;
    this._streamingContent += msg.payload as string;
  };

  private _handleStreamComplete = (msg: IWebSocketMessage) => {
    this._isStreaming = false;
    this._messages = [...this._messages, {
      role: 'assistant',
      content: this._streamingContent,
      timestamp: Date.now()
    }];
    this._streamingContent = '';
  };

  private _handleStreamError = (msg: IWebSocketMessage) => {
    this._isStreaming = false;
    // Show error toast
  };

  private _sendMessage(content: string) {
    this._messages = [...this._messages, {
      role: 'user',
      content,
      timestamp: Date.now()
    }];
    wsClient.send('agent:message', { content });
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
export interface IAgentStartPayload {
  projectId: string;
}

export interface IAgentMessagePayload {
  content: string;
}

// Server -> Client
export interface IStreamChunkPayload {
  content: string;
}

export interface IStatusUpdatePayload {
  status: 'idle' | 'thinking' | 'streaming' | 'error';
}
```

---

## Best Practices

1. **Centralize API calls** - Single source for all HTTP requests
2. **Type all responses** - Use TypeScript interfaces
3. **Handle all error states** - Network, 4xx, 5xx errors
4. **Cleanup subscriptions** - Unsubscribe in disconnectedCallback
5. **Use reconnection logic** - Exponential backoff for WebSocket
6. **Show connection status** - User should know if disconnected
