# Code Style Guide

> Agent OS Web UI - TypeScript/Lit/Express Stack
> Last Updated: 2026-01-30

## Context

Tech-stack-aware code style rules for the Agent OS Web UI project.

**Stack:** Node.js + Express + TypeScript (backend), Lit 3.x Web Components (frontend), Vite (build)

---

## General Formatting

### Indentation
- Use 2 spaces for indentation (never tabs)
- Maintain consistent indentation throughout files
- Align nested structures for readability

### Naming Conventions

**TypeScript/JavaScript:**
- **Variables and Functions**: Use camelCase (e.g., `userProfile`, `calculateTotal`)
- **Classes and Interfaces**: Use PascalCase (e.g., `UserProfile`, `PaymentProcessor`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Private Members**: Prefix with underscore (e.g., `_internalState`)
- **Type Parameters**: Single uppercase letter or descriptive PascalCase (e.g., `T`, `TElement`)

**Lit Web Components:**
- **Custom Element Names**: Use kebab-case with prefix (e.g., `aos-sidebar`, `aos-chat-panel`)
- **Component Classes**: PascalCase matching element name (e.g., `AosSidebar`, `AosChatPanel`)
- **CSS Custom Properties**: Use `--aos-` prefix (e.g., `--aos-primary-color`)

**Files:**
- **Component Files**: kebab-case matching element name (e.g., `aos-sidebar.ts`)
- **Utility Files**: kebab-case (e.g., `websocket-client.ts`)
- **Type Definition Files**: kebab-case with `.types.ts` suffix (e.g., `project.types.ts`)

### String Formatting
- Use single quotes for strings: `'Hello World'`
- Use template literals for interpolation: `` `Hello ${name}` ``
- Use template literals for multi-line strings
- Use double quotes only in HTML attributes within Lit templates

### Code Comments
- Add brief comments above non-obvious business logic
- Document complex algorithms or calculations
- Explain the "why" behind implementation choices
- Use JSDoc for public APIs and exported functions
- Never remove existing comments unless removing the associated code
- Update comments when modifying code to maintain accuracy

### File Organization
- One component/class per file
- Group related files in directories
- Use index.ts files for clean exports
- Keep files focused and cohesive

### Code Readability
- Maximum line length: 100-120 characters
- Blank lines between logical sections
- Consistent spacing around operators
- Clear variable and function names (self-documenting)

---

## TypeScript Strict Mode Conventions

### Type Safety
- **Never use `any`** - Use `unknown` and narrow types, or create proper interfaces
- Enable all strict compiler options
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and mapped types

```typescript
// Good
interface UserConfig {
  name: string;
  settings: UserSettings;
}

type Status = 'idle' | 'loading' | 'error' | 'success';

// Bad
const config: any = getConfig();
```

### Null Safety
- Use optional chaining: `user?.profile?.name`
- Use nullish coalescing: `value ?? defaultValue`
- Prefer `undefined` over `null` (except for explicit "no value" semantics)
- Always handle potential undefined/null values

```typescript
// Good
const name = user?.profile?.name ?? 'Anonymous';

// Bad
const name = user && user.profile && user.profile.name ? user.profile.name : 'Anonymous';
```

### Type Assertions
- Avoid type assertions (`as`) when possible
- Use type guards for runtime narrowing
- When assertions are necessary, prefer `as const` for literals

```typescript
// Good - Type guard
function isProject(obj: unknown): obj is Project {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// Acceptable - const assertion
const status = 'active' as const;

// Avoid
const project = data as Project; // Only when absolutely certain
```

### Generics
- Use descriptive names for complex generics
- Constrain generics when possible
- Provide defaults for optional type parameters

```typescript
// Good
interface Repository<TEntity extends BaseEntity> {
  findById(id: string): Promise<TEntity | undefined>;
}

// Acceptable for simple cases
function identity<T>(value: T): T {
  return value;
}
```

---

## Lit Web Component Patterns

### Component Structure

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('aos-example')
export class AosExample extends LitElement {
  // 1. Static styles
  static styles = css`
    :host {
      display: block;
    }
  `;

  // 2. Public reactive properties (from attributes)
  @property({ type: String })
  title = '';

  @property({ type: Boolean, reflect: true })
  active = false;

  // 3. Internal reactive state
  @state()
  private _loading = false;

  @state()
  private _items: Item[] = [];

  // 4. Non-reactive private fields
  private _abortController?: AbortController;

  // 5. Lifecycle methods
  connectedCallback(): void {
    super.connectedCallback();
    this._abortController = new AbortController();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._abortController?.abort();
  }

  // 6. Public methods
  async refresh(): Promise<void> {
    // ...
  }

  // 7. Private methods
  private _handleClick(e: Event): void {
    this.dispatchEvent(new CustomEvent('item-selected', {
      detail: { /* ... */ },
      bubbles: true,
      composed: true,
    }));
  }

  // 8. Render method (always last)
  render() {
    return html`
      <div class="container">
        <h2>${this.title}</h2>
        ${this._loading
          ? html`<aos-spinner></aos-spinner>`
          : this._renderItems()}
      </div>
    `;
  }

  private _renderItems() {
    return html`
      <ul>
        ${this._items.map(item => html`
          <li @click=${this._handleClick}>${item.name}</li>
        `)}
      </ul>
    `;
  }
}
```

### Reactive Properties

```typescript
// Public properties (can be set via attributes)
@property({ type: String })
projectId = '';

@property({ type: Number })
maxItems = 10;

@property({ type: Boolean, reflect: true })  // reflect: syncs to attribute
disabled = false;

@property({ type: Object })
config: ProjectConfig = {};

@property({ type: Array })
items: string[] = [];

// Internal state (triggers re-render but not exposed as attributes)
@state()
private _isLoading = false;

@state()
private _error: Error | null = null;
```

### Event Handling

```typescript
// Dispatching custom events
private _dispatchChange(): void {
  this.dispatchEvent(new CustomEvent('project-changed', {
    detail: { projectId: this.projectId, name: this._name },
    bubbles: true,
    composed: true,  // Crosses shadow DOM boundaries
  }));
}

// Listening to events in templates
render() {
  return html`
    <button @click=${this._handleClick}>Click</button>
    <input @input=${this._handleInput} />
    <aos-child @child-event=${this._handleChildEvent}></aos-child>
  `;
}

// Event handler methods
private _handleClick(e: MouseEvent): void {
  e.stopPropagation();
  // ...
}

private _handleInput(e: InputEvent): void {
  const target = e.target as HTMLInputElement;
  this._value = target.value;
}
```

### CSS Styling

```typescript
static styles = css`
  /* Host element styling */
  :host {
    display: block;
    --_internal-spacing: var(--aos-spacing-md, 16px);
  }

  :host([disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }

  :host([hidden]) {
    display: none;
  }

  /* Use CSS custom properties for theming */
  .container {
    background: var(--aos-bg-secondary);
    color: var(--aos-text-primary);
    padding: var(--_internal-spacing);
    border-radius: var(--aos-radius-md);
  }

  /* Slotted content styling */
  ::slotted(*) {
    margin-block: var(--aos-spacing-sm);
  }

  ::slotted([slot="header"]) {
    font-weight: bold;
  }
`;
```

### Lifecycle Best Practices

```typescript
// Use connectedCallback for setup
connectedCallback(): void {
  super.connectedCallback();  // Always call super first
  this._setupEventListeners();
  this._loadInitialData();
}

// Use disconnectedCallback for cleanup
disconnectedCallback(): void {
  super.disconnectedCallback();  // Always call super
  this._removeEventListeners();
  this._abortController?.abort();
}

// Use willUpdate for pre-render logic based on changed properties
willUpdate(changedProperties: PropertyValues): void {
  if (changedProperties.has('projectId')) {
    this._loadProjectData();
  }
}

// Use updated for post-render DOM access
updated(changedProperties: PropertyValues): void {
  if (changedProperties.has('active') && this.active) {
    this.shadowRoot?.querySelector('input')?.focus();
  }
}

// Use firstUpdated for one-time post-render setup
firstUpdated(): void {
  this._initializeChart();
}
```

---

## Express Route Patterns

### Route Organization

```typescript
// routes/projects.ts
import { Router, Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';

const router = Router();

// GET /api/projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await ProjectService.findAll();
    res.json({ data: projects });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await ProjectService.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Request/Response Types

```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

// Typed request handlers
interface CreateProjectBody {
  name: string;
  path: string;
}

router.post('/', async (
  req: Request<{}, ApiResponse<Project>, CreateProjectBody>,
  res: Response<ApiResponse<Project> | ApiError>,
  next: NextFunction
) => {
  // req.body is typed as CreateProjectBody
});
```

### Middleware Patterns

```typescript
// middleware/error-handler.ts
import { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
  });
};

// middleware/async-handler.ts
import { RequestHandler } from 'express';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

---

## WebSocket Streaming Patterns

### Server-Side WebSocket

```typescript
// websocket/claude-stream.ts
import WebSocket from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server): void {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

async function handleMessage(ws: WebSocket, message: WsMessage): Promise<void> {
  switch (message.type) {
    case 'stream-start':
      await startClaudeStream(ws, message.payload);
      break;
    case 'stream-stop':
      stopClaudeStream(message.payload.sessionId);
      break;
    default:
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: `Unknown message type: ${message.type}` },
      }));
  }
}
```

### Client-Side WebSocket (Lit)

```typescript
// services/websocket-client.ts
export class WebSocketClient {
  private _ws: WebSocket | null = null;
  private _reconnectAttempts = 0;
  private _maxReconnectAttempts = 5;
  private _listeners = new Map<string, Set<(data: unknown) => void>>();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._ws = new WebSocket(url);

      this._ws.onopen = () => {
        this._reconnectAttempts = 0;
        resolve();
      };

      this._ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this._emit(message.type, message.payload);
      };

      this._ws.onclose = () => {
        this._handleReconnect(url);
      };

      this._ws.onerror = (error) => {
        reject(error);
      };
    });
  }

  send(type: string, payload: unknown): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(type: string, callback: (data: unknown) => void): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this._listeners.get(type)?.delete(callback);
    };
  }

  private _emit(type: string, data: unknown): void {
    this._listeners.get(type)?.forEach(callback => callback(data));
  }

  private _handleReconnect(url: string): void {
    if (this._reconnectAttempts < this._maxReconnectAttempts) {
      this._reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 30000);
      setTimeout(() => this.connect(url), delay);
    }
  }

  disconnect(): void {
    this._ws?.close();
    this._ws = null;
  }
}
```

---

## Vite Configuration Conventions

### vite.config.ts

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  // Development server
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },

  // Build configuration
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lit: ['lit'],
        },
      },
    },
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services',
    },
  },

  // Environment variables
  envPrefix: 'AOS_',
});
```

---

## Vitest Testing Patterns

### Component Testing with @open-wc/testing

```typescript
// aos-button.test.ts
import { fixture, html, expect } from '@open-wc/testing';
import { AosButton } from './aos-button';
import './aos-button';

describe('AosButton', () => {
  it('renders with default properties', async () => {
    const el = await fixture<AosButton>(html`<aos-button>Click me</aos-button>`);

    expect(el).to.exist;
    expect(el.disabled).to.be.false;
    expect(el.variant).to.equal('primary');
  });

  it('reflects disabled state to attribute', async () => {
    const el = await fixture<AosButton>(html`<aos-button disabled>Click me</aos-button>`);

    expect(el.disabled).to.be.true;
    expect(el.hasAttribute('disabled')).to.be.true;
  });

  it('dispatches click event when clicked', async () => {
    const el = await fixture<AosButton>(html`<aos-button>Click me</aos-button>`);

    let clicked = false;
    el.addEventListener('click', () => { clicked = true; });

    el.shadowRoot?.querySelector('button')?.click();

    expect(clicked).to.be.true;
  });

  it('does not dispatch click when disabled', async () => {
    const el = await fixture<AosButton>(html`<aos-button disabled>Click me</aos-button>`);

    let clicked = false;
    el.addEventListener('click', () => { clicked = true; });

    el.shadowRoot?.querySelector('button')?.click();

    expect(clicked).to.be.false;
  });
});
```

### Service Testing

```typescript
// project.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches all projects', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockProjects }),
    });

    const projects = await ProjectService.findAll();

    expect(fetch).toHaveBeenCalledWith('/api/projects');
    expect(projects).toEqual(mockProjects);
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(ProjectService.findAll()).rejects.toThrow('Network error');
  });
});
```

### Test File Organization

```
src/
  components/
    aos-button/
      aos-button.ts
      aos-button.test.ts      # Co-located with component
      aos-button.styles.ts
  services/
    project.service.ts
    project.service.test.ts   # Co-located with service
  __tests__/
    integration/              # Integration tests
      app.integration.test.ts
    e2e/                      # End-to-end tests
      user-flow.e2e.test.ts
```

---

## Import Order

Organize imports in this order, with blank lines between groups:

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External packages
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import express from 'express';

// 3. Internal aliases (@/)
import { ProjectService } from '@services/project.service';
import { formatDate } from '@/utils/date';

// 4. Relative imports
import { ProjectCard } from './project-card';
import type { Project } from './project.types';

// 5. Style imports (for Lit components with external styles)
import { buttonStyles } from './button.styles';
```

---

## Usage

**This file provides:** TypeScript/Lit/Express-specific code style rules.

**Global standards provide:** Universal formatting (indentation, comments, etc.).

**Definition of Done enforces:** Both style guides during code review.
