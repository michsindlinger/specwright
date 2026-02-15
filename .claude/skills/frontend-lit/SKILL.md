---
description: Lit Web Components development patterns for Agent OS Web UI
globs:
  - "src/client/**/*.ts"
  - "src/client/**/*.css"
alwaysApply: false
---

# Frontend Lit Skill

> Project: Agent OS Web UI
> Generated: 2026-01-30
> Framework: Lit 3.x
> Build Tool: Vite 5.x

## Quick Reference

### Component Structure
```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('aos-example')
export class AosExample extends LitElement {
  @property({ type: String }) label = '';
  @state() private _count = 0;

  static styles = css`
    :host {
      display: block;
      --aos-spacing: var(--space-md, 16px);
    }
  `;

  render() {
    return html`
      <button @click=${this._handleClick}>
        ${this.label}: ${this._count}
      </button>
    `;
  }

  private _handleClick() {
    this._count++;
    this.dispatchEvent(new CustomEvent('count-changed', {
      detail: { count: this._count },
      bubbles: true,
      composed: true
    }));
  }
}
```

### Naming Conventions
- Component tag: `aos-[name]` (kebab-case with aos- prefix)
- Component class: `Aos[Name]` (PascalCase with Aos prefix)
- File name: `[name].ts` (kebab-case)
- Private properties: `_propertyName`
- Event handlers: `_handleEventName`

### CSS Custom Properties (Dark Theme)
```css
/* Colors */
--color-bg-primary: #0a0a0a;
--color-bg-secondary: #171717;
--color-bg-tertiary: #262626;
--color-text-primary: #e4e4e7;
--color-text-secondary: #a1a1aa;
--color-accent: #3b82f6;
--color-error: #ef4444;
--color-success: #22c55e;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Focus */
--focus-ring: 2px solid var(--color-accent);
--focus-ring-offset: 2px;
```

---

## Sub-Documents

- [Components](./components.md) - Component patterns and composition
- [State Management](./state-management.md) - Application state patterns
- [API Integration](./api-integration.md) - REST and WebSocket clients
- [Forms & Validation](./forms-validation.md) - Form handling patterns
- [Dos & Don'ts](./dos-and-donts.md) - Project learnings (self-updating)

---

## Key Patterns

### Reactive Properties vs State

```typescript
// @property - External, passed by parent, triggers render
@property({ type: String }) projectId = '';

// @state - Internal, component-only, triggers render
@state() private _isLoading = false;
```

### Event Handling

```typescript
// Always use CustomEvent with bubbles and composed
this.dispatchEvent(new CustomEvent('task-moved', {
  detail: { taskId, fromColumn, toColumn },
  bubbles: true,      // Allows event to bubble up
  composed: true      // Crosses shadow DOM boundaries
}));
```

### Conditional Rendering

```typescript
render() {
  return html`
    ${this._isLoading
      ? html`<aos-spinner></aos-spinner>`
      : html`<div>${this._content}</div>`
    }
    ${this._error ? html`<aos-error-banner>${this._error}</aos-error-banner>` : nothing}
  `;
}
```

### List Rendering with Keys

```typescript
render() {
  return html`
    ${repeat(
      this.tasks,
      (task) => task.id,  // Key function
      (task) => html`<aos-task-card .task=${task}></aos-task-card>`
    )}
  `;
}
```

### Lifecycle Methods

```typescript
// Called after first render
firstUpdated() {
  this._setupWebSocket();
}

// Called before each render
willUpdate(changedProperties: PropertyValues) {
  if (changedProperties.has('projectId')) {
    this._loadProject();
  }
}

// Cleanup
disconnectedCallback() {
  super.disconnectedCallback();
  this._cleanupSubscriptions();
}
```

---

## Accessibility Patterns

### Keyboard Navigation
```typescript
@property({ type: Number }) tabindex = 0;

render() {
  return html`
    <button
      tabindex=${this.tabindex}
      @keydown=${this._handleKeydown}
    >
      ${this.label}
    </button>
  `;
}

private _handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    this._handleClick();
  }
}
```

### ARIA Labels
```typescript
render() {
  return html`
    <button
      aria-label=${this.label}
      aria-busy=${this._isLoading}
      aria-disabled=${this.disabled}
    >
      <aos-icon name="send"></aos-icon>
    </button>
  `;
}
```

### Focus Management
```css
:host(:focus-visible) {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
```

---

## Testing Patterns

```typescript
import { fixture, html, expect } from '@open-wc/testing';
import './button.ts';

describe('aos-button', () => {
  it('renders with label', async () => {
    const el = await fixture(html`<aos-button label="Click me"></aos-button>`);
    expect(el.shadowRoot?.textContent).to.include('Click me');
  });

  it('dispatches click event', async () => {
    const el = await fixture(html`<aos-button></aos-button>`);
    let clicked = false;
    el.addEventListener('click', () => clicked = true);
    el.shadowRoot?.querySelector('button')?.click();
    expect(clicked).to.be.true;
  });
});
```

---

## Import Aliases

```typescript
// Use path aliases from vite.config.ts
import { AosButton } from '@components/common/button';
import { apiClient } from '@services/api.client';
import { theme } from '@styles/theme.css';
import { IMessage } from '@shared/types/messages.types';
```
