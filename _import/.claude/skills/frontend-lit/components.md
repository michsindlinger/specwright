# Lit Component Patterns

## Component Categories

### Common Components (`src/client/components/common/`)

Reusable UI elements used across all views:
- `aos-button` - Primary, secondary, ghost, destructive variants
- `aos-card` - Container with shadow and padding
- `aos-input` - Text input with validation
- `aos-modal` - Dialog overlay with focus trap
- `aos-spinner` - Loading indicator
- `aos-toast` - Notification messages
- `aos-icon` - Lucide icon wrapper

### View Components (`src/client/views/`)

Page-level components for routing:
- `aos-dashboard-view` - Kanban board view
- `aos-chat-view` - Chat interface view
- `aos-workflow-view` - Workflow execution view

### Feature Components

Grouped by feature in `src/client/components/`:
- `dashboard/` - Kanban board, column, card
- `chat/` - Message list, input, bubble
- `workflow/` - Task list, progress, output

---

## Smart vs Dumb Components

### Smart Components (Containers)
- Connect to services/stores
- Handle data fetching
- Manage complex state
- Example: `aos-chat-view`

```typescript
@customElement('aos-chat-view')
export class AosChatView extends LitElement {
  @state() private _messages: IMessage[] = [];
  @state() private _isConnected = false;

  private _wsClient = new WebSocketClient();

  connectedCallback() {
    super.connectedCallback();
    this._wsClient.connect();
    this._wsClient.onMessage(msg => this._handleMessage(msg));
  }
}
```

### Dumb Components (Presentational)
- Receive data via properties
- Emit events, don't mutate state
- Pure rendering
- Example: `aos-message-bubble`

```typescript
@customElement('aos-message-bubble')
export class AosMessageBubble extends LitElement {
  @property({ type: Object }) message!: IMessage;
  @property({ type: Boolean }) isStreaming = false;

  render() {
    return html`
      <div class="bubble ${this.message.role}">
        ${this.message.content}
        ${this.isStreaming ? html`<span class="cursor"></span>` : nothing}
      </div>
    `;
  }
}
```

---

## Composition Patterns

### Slots for Content Projection

```typescript
@customElement('aos-card')
export class AosCard extends LitElement {
  static styles = css`
    ::slotted([slot="header"]) { font-weight: bold; }
    ::slotted([slot="footer"]) { border-top: 1px solid var(--color-border); }
  `;

  render() {
    return html`
      <div class="card">
        <slot name="header"></slot>
        <slot></slot>
        <slot name="footer"></slot>
      </div>
    `;
  }
}

// Usage
html`
  <aos-card>
    <h2 slot="header">Title</h2>
    <p>Content goes here</p>
    <div slot="footer">Actions</div>
  </aos-card>
`;
```

### Component Composition

```typescript
// Build complex components from simpler ones
@customElement('aos-kanban-board')
export class AosKanbanBoard extends LitElement {
  @property({ type: Array }) columns: IColumn[] = [];

  render() {
    return html`
      <div class="board">
        ${this.columns.map(col => html`
          <aos-kanban-column
            .column=${col}
            @card-dropped=${this._handleCardDrop}
          ></aos-kanban-column>
        `)}
      </div>
    `;
  }
}
```

---

## Styling Patterns

### Shadow DOM Scoped Styles

```typescript
static styles = css`
  :host {
    display: block;
    contain: content;
  }

  :host([hidden]) {
    display: none;
  }

  :host([disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }

  .button {
    background: var(--color-accent);
    color: var(--color-text-primary);
    padding: var(--space-sm) var(--space-md);
  }
`;
```

### CSS Parts for External Styling

```typescript
render() {
  return html`
    <button part="button">
      <span part="label"><slot></slot></span>
    </button>
  `;
}

// External styling
aos-button::part(button) {
  border-radius: 8px;
}
```

### Theming with CSS Custom Properties

```typescript
static styles = css`
  :host {
    /* Component-level defaults that can be overridden */
    --button-padding: var(--space-sm) var(--space-md);
    --button-radius: 4px;
  }

  .button {
    padding: var(--button-padding);
    border-radius: var(--button-radius);
  }
`;
```

---

## Performance Patterns

### Lazy Loading Components

```typescript
// Dynamic import for rarely used components
async _showModal() {
  await import('./modal.js');
  this._modalVisible = true;
}
```

### Efficient List Rendering

```typescript
import { repeat } from 'lit/directives/repeat.js';

render() {
  // Use repeat() with key for efficient updates
  return html`
    ${repeat(
      this.items,
      item => item.id,  // Stable key
      item => html`<aos-item .data=${item}></aos-item>`
    )}
  `;
}
```

### Avoiding Unnecessary Renders

```typescript
// Use @state only for render-affecting state
@state() private _visibleItems: Item[] = [];  // Affects render

// Use regular properties for non-render state
private _scrollPosition = 0;  // Doesn't affect render
```
