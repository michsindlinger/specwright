# Service Layer Patterns

## Service Structure

Services contain business logic and orchestrate between routes and integration layer.

```
src/server/services/
├── agent.service.ts      # Agent SDK orchestration
├── project.service.ts    # Project management
├── session.service.ts    # Session state management
└── message.service.ts    # Message processing
```

---

## Service Class Pattern

```typescript
// src/server/services/project.service.ts
import { configReader } from '@integration/config.reader';
import { IProject, IProjectWithTasks } from '@shared/types/project.types';
import { AppError } from '../middleware/error.middleware';

class ProjectService {
  private _cache: Map<string, IProject> = new Map();
  private _cacheExpiry = 60000; // 1 minute
  private _lastCacheTime = 0;

  async getAll(): Promise<IProject[]> {
    await this._refreshCacheIfNeeded();
    return Array.from(this._cache.values());
  }

  async getById(id: string): Promise<IProject> {
    await this._refreshCacheIfNeeded();
    const project = this._cache.get(id);
    if (!project) {
      throw new AppError(404, `Project not found: ${id}`);
    }
    return project;
  }

  async getWithTasks(id: string): Promise<IProjectWithTasks> {
    const project = await this.getById(id);
    // Load tasks from project specs
    const tasks = await this._loadTasks(project.path);
    return { ...project, tasks };
  }

  private async _refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this._lastCacheTime > this._cacheExpiry) {
      const config = await configReader.loadConfig();
      this._cache.clear();
      config.projects.forEach(p => this._cache.set(p.id, p));
      this._lastCacheTime = now;
    }
  }

  private async _loadTasks(projectPath: string): Promise<ITask[]> {
    // Load from agent-os/specs/
    return [];
  }

  invalidateCache(): void {
    this._lastCacheTime = 0;
  }
}

export const projectService = new ProjectService();
```

---

## Agent Service Pattern

```typescript
// src/server/services/agent.service.ts
import { agentSDK } from '@integration/agent-sdk.wrapper';
import { WebSocketHandler } from '@integration/websocket.handler';
import { IAgentSession } from '@shared/types/session.types';

interface AgentServiceDeps {
  wsHandler: WebSocketHandler;
}

class AgentService {
  private _wsHandler: WebSocketHandler | null = null;
  private _sessions: Map<string, IAgentSession> = new Map();

  inject(deps: AgentServiceDeps): void {
    this._wsHandler = deps.wsHandler;
  }

  async startSession(
    sessionId: string,
    projectPath: string
  ): Promise<IAgentSession> {
    if (this._sessions.has(sessionId)) {
      throw new AppError(400, 'Session already exists');
    }

    await agentSDK.start(projectPath);

    const session: IAgentSession = {
      id: sessionId,
      projectPath,
      status: 'idle',
      createdAt: Date.now()
    };

    this._sessions.set(sessionId, session);
    this._broadcastStatus(sessionId, 'idle');

    return session;
  }

  async sendMessage(
    sessionId: string,
    content: string
  ): Promise<void> {
    const session = this._getSession(sessionId);
    session.status = 'streaming';
    this._broadcastStatus(sessionId, 'streaming');

    try {
      await agentSDK.sendMessage(content, (chunk) => {
        this._wsHandler?.broadcast('stream:chunk', {
          sessionId,
          content: chunk
        });
      });

      session.status = 'idle';
      this._wsHandler?.broadcast('stream:complete', { sessionId });
      this._broadcastStatus(sessionId, 'idle');
    } catch (error) {
      session.status = 'error';
      this._wsHandler?.broadcast('stream:error', {
        sessionId,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      this._broadcastStatus(sessionId, 'error');
      throw error;
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    const session = this._getSession(sessionId);
    await agentSDK.cancel();
    session.status = 'idle';
    this._broadcastStatus(sessionId, 'idle');
  }

  async endSession(sessionId: string): Promise<void> {
    this._getSession(sessionId);
    await agentSDK.stop();
    this._sessions.delete(sessionId);
  }

  private _getSession(sessionId: string): IAgentSession {
    const session = this._sessions.get(sessionId);
    if (!session) {
      throw new AppError(404, `Session not found: ${sessionId}`);
    }
    return session;
  }

  private _broadcastStatus(sessionId: string, status: string): void {
    this._wsHandler?.broadcast('status:update', { sessionId, status });
  }
}

export const agentService = new AgentService();
```

---

## Session State Pattern

```typescript
// src/server/services/session.service.ts
import { IMessage } from '@shared/types/messages.types';

interface SessionState {
  projectId: string;
  messages: IMessage[];
  createdAt: number;
  lastActivityAt: number;
}

class SessionService {
  private _sessions: Map<string, SessionState> = new Map();
  private _cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive sessions every 5 minutes
    this._cleanupInterval = setInterval(() => {
      this._cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  createSession(sessionId: string, projectId: string): SessionState {
    const state: SessionState = {
      projectId,
      messages: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };
    this._sessions.set(sessionId, state);
    return state;
  }

  getSession(sessionId: string): SessionState | null {
    const session = this._sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
    return session ?? null;
  }

  addMessage(sessionId: string, message: IMessage): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.messages.push(message);
    }
  }

  getMessages(sessionId: string): IMessage[] {
    return this.getSession(sessionId)?.messages ?? [];
  }

  deleteSession(sessionId: string): void {
    this._sessions.delete(sessionId);
  }

  private _cleanupInactiveSessions(): void {
    const timeout = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    for (const [id, session] of this._sessions) {
      if (now - session.lastActivityAt > timeout) {
        this._sessions.delete(id);
      }
    }
  }

  destroy(): void {
    clearInterval(this._cleanupInterval);
  }
}

export const sessionService = new SessionService();
```

---

## Best Practices

1. **Single Responsibility** - Each service handles one domain
2. **Dependency Injection** - Use `inject()` for external dependencies
3. **Error Handling** - Throw `AppError` with appropriate status codes
4. **Caching** - Cache expensive operations with expiry
5. **Cleanup** - Implement cleanup for resources (timers, connections)
6. **State Isolation** - Services should not share mutable state directly
