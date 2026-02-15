# Development Best Practices

> Agent OS Web UI - TypeScript/Lit/Express Stack
> Last Updated: 2026-01-30

## Context

Tech-stack-aware development best practices for the Agent OS Web UI project.

**Stack:** Node.js + Express + TypeScript (backend), Lit 3.x Web Components (frontend), Vite (build), Vitest (testing)

---

## Core Principles

### Keep It Simple
- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones
- Prefer native Web APIs over library abstractions

### Optimize for Readability
- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"
- Use TypeScript types as documentation

### DRY (Don't Repeat Yourself)
- Extract repeated business logic to utility functions
- Extract repeated UI markup to reusable Lit components
- Create shared CSS custom properties for consistent theming
- Centralize API types in dedicated `.types.ts` files

### File Structure
- Keep files focused on a single responsibility
- Group related functionality together
- Use consistent naming conventions
- Co-locate tests with source files

---

## TypeScript Best Practices

### Type-First Development
- Define interfaces before implementation
- Export types from dedicated `.types.ts` files
- Use discriminated unions for complex state

```typescript
// Define types first
interface ProjectState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: Project | null;
  error: Error | null;
}

// Discriminated union for type-safe state handling
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

### Avoid Common TypeScript Pitfalls

```typescript
// BAD: Using any
const data: any = response.json();

// GOOD: Use unknown and narrow
const data: unknown = await response.json();
if (isProjectResponse(data)) {
  // data is now typed as ProjectResponse
}

// BAD: Non-null assertion abuse
const name = user!.profile!.name!;

// GOOD: Proper null handling
const name = user?.profile?.name ?? 'Unknown';

// BAD: Type assertion for convenience
const project = response as Project;

// GOOD: Runtime validation
const project = validateProject(response);
```

### Prefer Immutability

```typescript
// Use readonly for data that shouldn't change
interface Project {
  readonly id: string;
  readonly createdAt: Date;
  name: string;  // Mutable field
}

// Use const assertions for literal types
const ROUTES = {
  home: '/',
  projects: '/projects',
  settings: '/settings',
} as const;

// Use spread for state updates
this._items = [...this._items, newItem];
```

---

## Lit Web Component Best Practices

### Component Design

**Single Responsibility**
- Each component should do one thing well
- Extract complex logic to services
- Keep render methods focused

**Composition Over Inheritance**
- Use slots for content projection
- Compose small components into larger ones
- Avoid deep inheritance hierarchies

```typescript
// GOOD: Composition with slots
@customElement('aos-card')
export class AosCard extends LitElement {
  render() {
    return html`
      <div class="card">
        <header><slot name="header"></slot></header>
        <main><slot></slot></main>
        <footer><slot name="footer"></slot></footer>
      </div>
    `;
  }
}

// Usage
html`
  <aos-card>
    <h2 slot="header">Title</h2>
    <p>Card content goes here</p>
    <aos-button slot="footer">Action</aos-button>
  </aos-card>
`;
```

### State Management

**Use @state() for Internal State**
```typescript
@state()
private _isOpen = false;

@state()
private _searchResults: SearchResult[] = [];
```

**Use @property() for External Data**
```typescript
@property({ type: String })
projectId = '';

@property({ type: Object })
config: ProjectConfig = {};
```

**Lift State When Needed**
- When multiple components need the same data, lift state to a common ancestor
- Use custom events to communicate changes upward
- Use properties to pass data downward

### Performance Optimization

**Minimize Renders**
```typescript
// Use willUpdate for derived state (computed once per render cycle)
willUpdate(changedProperties: PropertyValues): void {
  if (changedProperties.has('items')) {
    this._filteredItems = this.items.filter(item => item.active);
  }
}

// NOT in render() - would recompute on every render
render() {
  // BAD: Filtering in render
  // const filtered = this.items.filter(item => item.active);

  // GOOD: Use pre-computed value
  return html`${this._filteredItems.map(item => html`...`)}`;
}
```

**Use keyed renders for lists**
```typescript
import { repeat } from 'lit/directives/repeat.js';

render() {
  return html`
    <ul>
      ${repeat(
        this._items,
        item => item.id,  // Key function
        item => html`<li>${item.name}</li>`
      )}
    </ul>
  `;
}
```

**Lazy load heavy components**
```typescript
// Defer import until needed
async _showModal(): Promise<void> {
  await import('./aos-heavy-modal.js');
  this._modalVisible = true;
}
```

### Event Handling Best Practices

```typescript
// Always use composed: true for events that should cross shadow DOM
private _dispatchEvent(): void {
  this.dispatchEvent(new CustomEvent('project-selected', {
    detail: { project: this._selectedProject },
    bubbles: true,
    composed: true,
  }));
}

// Clean up event listeners
private _boundHandler = this._handleResize.bind(this);

connectedCallback(): void {
  super.connectedCallback();
  window.addEventListener('resize', this._boundHandler);
}

disconnectedCallback(): void {
  super.disconnectedCallback();
  window.removeEventListener('resize', this._boundHandler);
}

// Or use AbortController for cleanup
private _abortController?: AbortController;

connectedCallback(): void {
  super.connectedCallback();
  this._abortController = new AbortController();
  window.addEventListener('resize', this._handleResize, {
    signal: this._abortController.signal,
  });
}

disconnectedCallback(): void {
  super.disconnectedCallback();
  this._abortController?.abort();
}
```

---

## Express Backend Best Practices

### Route Organization

```
server/
  routes/
    index.ts          # Route aggregation
    projects.ts       # /api/projects
    settings.ts       # /api/settings
  middleware/
    error-handler.ts
    auth.ts
    validate.ts
  services/
    project.service.ts
    settings.service.ts
  types/
    api.types.ts
    project.types.ts
```

### Error Handling

**Centralized Error Handler**
```typescript
// middleware/error-handler.ts
import { ErrorRequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Don't leak internal errors in production
  res.status(500).json({
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error',
  });
};
```

**Use Async Handler Wrapper**
```typescript
// middleware/async-handler.ts
import { RequestHandler } from 'express';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.get('/:id', asyncHandler(async (req, res) => {
  const project = await ProjectService.findById(req.params.id);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }
  res.json({ data: project });
}));
```

### Request Validation

```typescript
// Use a validation library like zod
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  description: z.string().optional(),
});

router.post('/', asyncHandler(async (req, res) => {
  const validated = createProjectSchema.parse(req.body);
  const project = await ProjectService.create(validated);
  res.status(201).json({ data: project });
}));
```

### Service Layer Pattern

```typescript
// services/project.service.ts
export class ProjectService {
  static async findAll(): Promise<Project[]> {
    // Business logic and data access
    return projects;
  }

  static async findById(id: string): Promise<Project | undefined> {
    return projects.find(p => p.id === id);
  }

  static async create(data: CreateProjectData): Promise<Project> {
    // Validation, business rules, persistence
    const project: Project = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    };
    projects.push(project);
    return project;
  }
}
```

---

## WebSocket Best Practices

### Message Protocol

Define a clear message protocol:

```typescript
// types/websocket.types.ts
interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  requestId?: string;  // For request/response correlation
}

// Specific message types
interface StreamStartMessage {
  type: 'stream-start';
  payload: {
    sessionId: string;
    prompt: string;
  };
}

interface StreamChunkMessage {
  type: 'stream-chunk';
  payload: {
    sessionId: string;
    content: string;
    isComplete: boolean;
  };
}

type ClientMessage = StreamStartMessage | StreamStopMessage;
type ServerMessage = StreamChunkMessage | ErrorMessage | AckMessage;
```

### Connection Management

```typescript
// Implement heartbeat to detect stale connections
const HEARTBEAT_INTERVAL = 30000;

wss.on('connection', (ws: WebSocket) => {
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;
  });

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  ws.on('close', () => {
    clearInterval(heartbeat);
  });
});
```

### Client Reconnection

```typescript
// Implement exponential backoff for reconnection
class ReconnectingWebSocket {
  private _reconnectAttempts = 0;
  private _maxAttempts = 10;
  private _baseDelay = 1000;
  private _maxDelay = 30000;

  private _getReconnectDelay(): number {
    const delay = Math.min(
      this._baseDelay * Math.pow(2, this._reconnectAttempts),
      this._maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  private _reconnect(): void {
    if (this._reconnectAttempts >= this._maxAttempts) {
      this._emit('max-retries-exceeded');
      return;
    }

    this._reconnectAttempts++;
    const delay = this._getReconnectDelay();

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}
```

---

## Testing Best Practices

### Test Structure

```typescript
describe('ComponentName', () => {
  // Group by functionality
  describe('rendering', () => {
    it('renders with default properties', async () => {});
    it('renders loading state', async () => {});
    it('renders error state', async () => {});
  });

  describe('user interactions', () => {
    it('handles click events', async () => {});
    it('validates input', async () => {});
  });

  describe('api integration', () => {
    it('fetches data on mount', async () => {});
    it('handles api errors gracefully', async () => {});
  });
});
```

### Component Testing with Lit

```typescript
import { fixture, html, expect, oneEvent } from '@open-wc/testing';

describe('AosProjectCard', () => {
  it('emits project-selected event on click', async () => {
    const el = await fixture(html`
      <aos-project-card .project=${{ id: '1', name: 'Test' }}>
      </aos-project-card>
    `);

    const eventPromise = oneEvent(el, 'project-selected');
    el.shadowRoot?.querySelector('.card')?.click();
    const event = await eventPromise;

    expect(event.detail.project.id).to.equal('1');
  });

  it('shows loading state while fetching', async () => {
    const el = await fixture<AosProjectCard>(html`
      <aos-project-card loading></aos-project-card>
    `);

    const spinner = el.shadowRoot?.querySelector('aos-spinner');
    expect(spinner).to.exist;
  });
});
```

### Mocking in Vitest

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock modules
vi.mock('./services/api', () => ({
  fetchProjects: vi.fn(),
}));

import { fetchProjects } from './services/api';

describe('ProjectList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('displays fetched projects', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { id: '1', name: 'Project 1' },
    ]);

    const el = await fixture(html`<aos-project-list></aos-project-list>`);
    await el.updateComplete;

    expect(el.shadowRoot?.textContent).to.contain('Project 1');
  });
});
```

### Test Coverage Goals

- **Unit tests:** 80%+ coverage for services and utilities
- **Component tests:** All user-facing components
- **Integration tests:** Critical user flows
- **E2E tests:** Happy path scenarios

---

## Dependencies

### Choose Libraries Wisely

When adding third-party dependencies:
- Select the most popular and actively maintained option
- Check the library's GitHub repository for:
  - Recent commits (within last 6 months)
  - Active issue resolution
  - Number of stars/downloads
  - Clear documentation
- Prefer libraries with TypeScript support
- Consider bundle size impact (check bundlephobia.com)

### Minimize Dependencies

- Prefer native Web APIs over polyfills when browser support allows
- Avoid libraries for simple utilities (write them yourself)
- Regularly audit dependencies with `npm audit`
- Remove unused dependencies

---

## Performance Guidelines

### Frontend Performance

**Bundle Size**
- Use dynamic imports for route-level code splitting
- Tree-shake unused code (Vite handles this automatically)
- Monitor bundle size with `vite-bundle-visualizer`

**Runtime Performance**
- Avoid layout thrashing (batch DOM reads/writes)
- Use `requestAnimationFrame` for animations
- Debounce expensive operations (search, resize handlers)
- Use CSS containment for isolated components

```typescript
static styles = css`
  :host {
    contain: content;  /* Isolate layout/paint */
  }
`;
```

### Backend Performance

- Use connection pooling for databases
- Implement caching for expensive operations
- Use streaming for large responses
- Profile with Node.js inspector

---

## Security Guidelines

### Frontend Security

- Sanitize user input in templates (Lit does this automatically)
- Use Content Security Policy headers
- Never store sensitive data in localStorage
- Validate file uploads on client and server

### Backend Security

- Validate all input (never trust client data)
- Use parameterized queries (when database is added)
- Implement rate limiting
- Set security headers (helmet middleware)
- Keep dependencies updated

```typescript
import helmet from 'helmet';

app.use(helmet());
app.use(express.json({ limit: '10kb' }));  // Limit body size
```

---

## Documentation Standards

### Code Documentation

```typescript
/**
 * Manages WebSocket connection to the Claude Code backend.
 * Handles automatic reconnection with exponential backoff.
 *
 * @example
 * ```typescript
 * const client = new WebSocketClient();
 * await client.connect('ws://localhost:3001/ws');
 * client.on('stream-chunk', (data) => console.log(data));
 * ```
 */
export class WebSocketClient {
  /**
   * Establishes WebSocket connection to the specified URL.
   * @param url - WebSocket server URL
   * @returns Promise that resolves when connection is established
   * @throws Error if connection fails after max retries
   */
  async connect(url: string): Promise<void> {
    // ...
  }
}
```

### Component Documentation

```typescript
/**
 * Displays a project card with metadata and actions.
 *
 * @fires project-selected - When user clicks the card
 * @fires project-deleted - When user confirms deletion
 *
 * @slot - Default slot for additional content
 * @slot actions - Slot for action buttons
 *
 * @csspart card - The card container
 * @csspart title - The project title
 *
 * @cssprop --aos-card-bg - Card background color
 * @cssprop --aos-card-radius - Card border radius
 */
@customElement('aos-project-card')
export class AosProjectCard extends LitElement {
  /** The project data to display */
  @property({ type: Object })
  project?: Project;

  /** Whether the card is in loading state */
  @property({ type: Boolean, reflect: true })
  loading = false;
}
```

---

## Usage

**This file provides:** TypeScript/Lit/Express-specific best practices.

**Global standards provide:** Universal development principles.

**Definition of Done enforces:** Both during code review.
