import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Priority } from '../../../src/shared/types/spec-dependencies.protocol.js';

const PRIORITIES: readonly Priority[] = ['P0', 'P1', 'P2', 'P3'];

function priorityClass(p: Priority | null | undefined): string {
  switch (p) {
    case 'P0': return 'priority-badge--p0';
    case 'P1': return 'priority-badge--p1';
    case 'P2': return 'priority-badge--p2';
    case 'P3': return 'priority-badge--p3';
    default:   return 'priority-badge--unset';
  }
}

/**
 * SPD-004: Priority badge + inline selector.
 * Fires `priority-change` with `{ priority: Priority | null }` on selection.
 */
@customElement('aos-priority-badge')
export class AosPriorityBadge extends LitElement {
  @property({ type: String }) priority: Priority | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private isOpen = false;

  private _closeHandler: (() => void) | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._removeCloseHandler();
  }

  private _removeCloseHandler(): void {
    if (this._closeHandler) {
      document.removeEventListener('click', this._closeHandler);
      this._closeHandler = null;
    }
  }

  private handleBadgeClick(e: Event): void {
    if (this.readonly) return;
    e.stopPropagation();
    if (this.isOpen) {
      this.isOpen = false;
      this._removeCloseHandler();
      return;
    }
    this.isOpen = true;
    this._closeHandler = () => {
      this.isOpen = false;
      this._closeHandler = null;
    };
    // Defer so this click doesn't immediately close the dropdown
    setTimeout(() => {
      document.addEventListener('click', this._closeHandler!, { once: true });
    }, 0);
  }

  private handleSelect(e: Event, p: Priority | null): void {
    e.stopPropagation();
    this._removeCloseHandler();
    this.isOpen = false;
    if (p !== this.priority) {
      this.dispatchEvent(new CustomEvent('priority-change', {
        detail: { priority: p },
        bubbles: true,
        composed: true,
      }));
    }
  }

  override render() {
    const cls = priorityClass(this.priority);
    return html`
      <span class="priority-badge-wrapper">
        <button
          class="priority-badge ${cls}${this.readonly ? ' priority-badge--readonly' : ''}"
          @click=${this.handleBadgeClick}
          title="${this.readonly ? `Priorität: ${this.priority ?? 'keine'}` : 'Priorität ändern'}"
          aria-expanded="${this.isOpen}"
          aria-haspopup="listbox"
        >${this.priority ?? '—'}</button>
        ${this.isOpen ? html`
          <ul
            class="priority-dropdown"
            role="listbox"
            @click=${(e: Event) => e.stopPropagation()}
          >
            ${PRIORITIES.map(p => html`
              <li
                class="priority-dropdown__item ${priorityClass(p)}${p === this.priority ? ' selected' : ''}"
                role="option"
                aria-selected="${p === this.priority}"
                @click=${(e: Event) => this.handleSelect(e, p)}
              >${p}</li>
            `)}
            <li
              class="priority-dropdown__item priority-dropdown__item--clear${this.priority == null ? ' selected' : ''}"
              role="option"
              aria-selected="${this.priority == null}"
              @click=${(e: Event) => this.handleSelect(e, null)}
            >— Löschen</li>
          </ul>
        ` : ''}
      </span>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-priority-badge': AosPriorityBadge;
  }
}
