# Backend Testing Patterns

## Test Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';

beforeAll(async () => {
  // Setup test environment
});

afterAll(async () => {
  // Cleanup
});

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
});
```

---

## Route Testing with Supertest

```typescript
// tests/unit/server/routes/projects.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectRoutes from '../../../../src/server/presentation/routes/projects.routes';
import { projectService } from '../../../../src/server/services/project.service';

// Mock the service
vi.mock('../../../../src/server/services/project.service');

const app = express();
app.use(express.json());
app.use('/api/projects', projectRoutes);

describe('Projects Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('returns list of projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', path: '/path/1' },
        { id: '2', name: 'Project 2', path: '/path/2' }
      ];

      vi.mocked(projectService.getAll).mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.data).toEqual(mockProjects);
      expect(projectService.getAll).toHaveBeenCalledOnce();
    });

    it('handles service errors', async () => {
      vi.mocked(projectService.getAll).mockRejectedValue(
        new Error('Config not found')
      );

      const response = await request(app)
        .get('/api/projects')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns single project', async () => {
      const mockProject = { id: '1', name: 'Project 1', path: '/path/1' };

      vi.mocked(projectService.getById).mockResolvedValue(mockProject);

      const response = await request(app)
        .get('/api/projects/1')
        .expect(200);

      expect(response.body.data).toEqual(mockProject);
      expect(projectService.getById).toHaveBeenCalledWith('1');
    });

    it('returns 404 for unknown project', async () => {
      vi.mocked(projectService.getById).mockRejectedValue(
        new AppError(404, 'Project not found')
      );

      const response = await request(app)
        .get('/api/projects/unknown')
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });
  });
});
```

---

## Service Testing

```typescript
// tests/unit/server/services/project.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from '../../../../src/server/services/project.service';
import { configReader } from '../../../../src/server/integration/config.reader';

vi.mock('../../../../src/server/integration/config.reader');

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectService.invalidateCache();
  });

  describe('getAll', () => {
    it('returns projects from config', async () => {
      const mockConfig = {
        projects: [
          { id: '1', name: 'Project 1', path: '/path/1' }
        ]
      };

      vi.mocked(configReader.loadConfig).mockResolvedValue(mockConfig);

      const projects = await projectService.getAll();

      expect(projects).toEqual(mockConfig.projects);
    });

    it('caches results', async () => {
      const mockConfig = { projects: [{ id: '1', name: 'P1', path: '/p1' }] };
      vi.mocked(configReader.loadConfig).mockResolvedValue(mockConfig);

      await projectService.getAll();
      await projectService.getAll();

      expect(configReader.loadConfig).toHaveBeenCalledOnce();
    });
  });

  describe('getById', () => {
    it('returns project by id', async () => {
      const mockConfig = {
        projects: [
          { id: '1', name: 'Project 1', path: '/path/1' },
          { id: '2', name: 'Project 2', path: '/path/2' }
        ]
      };

      vi.mocked(configReader.loadConfig).mockResolvedValue(mockConfig);

      const project = await projectService.getById('2');

      expect(project.name).toBe('Project 2');
    });

    it('throws for unknown id', async () => {
      vi.mocked(configReader.loadConfig).mockResolvedValue({ projects: [] });

      await expect(projectService.getById('unknown'))
        .rejects.toThrow('Project not found');
    });
  });
});
```

---

## WebSocket Testing

```typescript
// tests/integration/websocket.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import WebSocket from 'ws';
import { WebSocketHandler } from '../../src/server/integration/websocket.handler';

describe('WebSocket Handler', () => {
  let server: Server;
  let wsHandler: WebSocketHandler;
  const PORT = 3099;

  beforeAll((done) => {
    server = createServer();
    wsHandler = new WebSocketHandler(server);
    server.listen(PORT, done);
  });

  afterAll((done) => {
    wsHandler.destroy();
    server.close(done);
  });

  it('accepts connections', (done) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('connection:established');
      expect(message.payload.clientId).toBeDefined();
      ws.close();
      done();
    });
  });

  it('responds to ping with pong', (done) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);

    ws.on('open', () => {
      // Skip welcome message
      ws.once('message', () => {
        // Send ping
        ws.send(JSON.stringify({
          type: 'ping',
          payload: {},
          timestamp: Date.now(),
          correlationId: 'test-123'
        }));
      });
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pong') {
        expect(message.correlationId).toBe('test-123');
        ws.close();
        done();
      }
    });
  });

  it('handles invalid JSON gracefully', (done) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);

    ws.on('open', () => {
      ws.send('not valid json');
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'error') {
        expect(message.payload.message).toBe('Invalid message format');
        ws.close();
        done();
      }
    });
  });
});
```

---

## Mocking Patterns

### Mock Module

```typescript
vi.mock('@services/project.service', () => ({
  projectService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getWithTasks: vi.fn()
  }
}));
```

### Mock Implementation

```typescript
vi.mocked(projectService.getAll).mockResolvedValue([]);
vi.mocked(projectService.getById).mockRejectedValue(new Error('Not found'));
```

### Spy on Method

```typescript
const spy = vi.spyOn(projectService, 'getAll');
// ... call code
expect(spy).toHaveBeenCalledWith(expectedArgs);
```

---

## Test Organization

```
tests/
├── unit/
│   └── server/
│       ├── routes/           # Route handler tests
│       ├── services/         # Service logic tests
│       └── integration/      # Integration wrapper tests
├── integration/
│   ├── api/                  # Full API flow tests
│   └── websocket/            # WebSocket flow tests
└── setup.ts                  # Test configuration
```

---

## Best Practices

1. **Isolate tests** - Mock dependencies, don't use real services
2. **Test error cases** - Not just happy path
3. **Use meaningful names** - Describe what's being tested
4. **Keep tests fast** - Mock I/O operations
5. **Test one thing** - Single assertion per test when possible
6. **Cleanup after** - Reset mocks, close connections
