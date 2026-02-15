# State Management Patterns

## State Types

### Component State (`@state`)
For UI state local to a component.

```typescript
@state() private _isExpanded = false;
@state() private _searchQuery = '';
```

### Shared Application State
For state shared across components, use a simple store pattern.

---

## Store Pattern

### Store Definition

```typescript
// src/client/services/app.store.ts
import { LitElement, ReactiveController, ReactiveControllerHost } from 'lit';

interface AppState {
  currentProject: string | null;
  isConnected: boolean;
  messages: IMessage[];
}

class AppStore {
  private _state: AppState = {
    currentProject: null,
    isConnected: false,
    messages: []
  };

  private _listeners = new Set<() => void>();

  get state() {
    return this._state;
  }

  subscribe(callback: () => void) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  private _notify() {
    this._listeners.forEach(cb => cb());
  }

  // Actions
  setProject(projectId: string) {
    this._state = { ...this._state, currentProject: projectId };
    this._notify();
  }

  setConnected(connected: boolean) {
    this._state = { ...this._state, isConnected: connected };
    this._notify();
  }

  addMessage(message: IMessage) {
    this._state = {
      ...this._state,
      messages: [...this._state.messages, message]
    };
    this._notify();
  }
}

export const appStore = new AppStore();
```

### Store Controller (Reactive)

```typescript
// src/client/services/store.controller.ts
export class StoreController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _unsubscribe?: () => void;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  hostConnected() {
    this._unsubscribe = appStore.subscribe(() => {
      this._host.requestUpdate();
    });
  }

  hostDisconnected() {
    this._unsubscribe?.();
  }

  get state() {
    return appStore.state;
  }
}
```

### Using Store in Components

```typescript
@customElement('aos-header')
export class AosHeader extends LitElement {
  private _store = new StoreController(this);

  render() {
    const { currentProject, isConnected } = this._store.state;

    return html`
      <header>
        <span>${currentProject ?? 'No project'}</span>
        <span class="status ${isConnected ? 'connected' : 'disconnected'}">
          ${isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </header>
    `;
  }
}
```

---

## State Patterns

### Derived State

```typescript
@customElement('aos-task-list')
export class AosTaskList extends LitElement {
  @property({ type: Array }) tasks: ITask[] = [];
  @property({ type: String }) filter = 'all';

  // Computed in render, not stored
  private get _filteredTasks() {
    if (this.filter === 'all') return this.tasks;
    return this.tasks.filter(t => t.status === this.filter);
  }

  render() {
    return html`
      <div class="task-count">${this._filteredTasks.length} tasks</div>
      ${this._filteredTasks.map(task => html`
        <aos-task-card .task=${task}></aos-task-card>
      `)}
    `;
  }
}
```

### Async State Pattern

```typescript
@customElement('aos-project-list')
export class AosProjectList extends LitElement {
  @state() private _status: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @state() private _projects: IProject[] = [];
  @state() private _error: string | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this._loadProjects();
  }

  private async _loadProjects() {
    this._status = 'loading';
    try {
      this._projects = await apiClient.getProjects();
      this._status = 'success';
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Unknown error';
      this._status = 'error';
    }
  }

  render() {
    switch (this._status) {
      case 'loading':
        return html`<aos-spinner></aos-spinner>`;
      case 'error':
        return html`<aos-error-banner>${this._error}</aos-error-banner>`;
      case 'success':
        return html`${this._projects.map(p => html`<aos-project-card .project=${p}></aos-project-card>`)}`;
      default:
        return nothing;
    }
  }
}
```

---

## URL State (Routing)

```typescript
// Simple hash-based routing for SPA
@customElement('aos-app')
export class AosApp extends LitElement {
  @state() private _currentRoute = window.location.hash.slice(1) || '/dashboard';

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this._handleRouteChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this._handleRouteChange);
  }

  private _handleRouteChange = () => {
    this._currentRoute = window.location.hash.slice(1) || '/dashboard';
  };

  render() {
    return html`
      <aos-sidebar .currentRoute=${this._currentRoute}></aos-sidebar>
      <main>
        ${this._renderRoute()}
      </main>
    `;
  }

  private _renderRoute() {
    switch (this._currentRoute) {
      case '/dashboard':
        return html`<aos-dashboard-view></aos-dashboard-view>`;
      case '/chat':
        return html`<aos-chat-view></aos-chat-view>`;
      case '/workflows':
        return html`<aos-workflow-view></aos-workflow-view>`;
      default:
        return html`<aos-dashboard-view></aos-dashboard-view>`;
    }
  }
}
```

---

## Best Practices

1. **Keep state minimal** - Only store what you need
2. **Derive when possible** - Calculate from existing state
3. **Single source of truth** - One place for each piece of state
4. **Immutable updates** - Create new objects, don't mutate
5. **Cleanup subscriptions** - Unsubscribe in disconnectedCallback
