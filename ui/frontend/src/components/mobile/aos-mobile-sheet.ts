import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('aos-mobile-sheet')
export class AosMobileSheet extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) position: 'bottom' | 'top' | 'left' = 'bottom';
  @property({ type: Boolean }) dismissible = true;
  @property({ type: String }) label = '';

  @state() private _dragOffset = 0;
  @state() private _dragging = false;

  private _touchStartPrimary = 0;
  private _prevFocus: Element | null = null;

  private static readonly _FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeyDown);
    document.body.style.overflow = '';
  }

  override updated(changedProps: Map<string, unknown>): void {
    super.updated(changedProps);
    if (changedProps.has('open')) {
      if (this.open) {
        this._prevFocus = document.activeElement;
        document.body.style.overflow = 'hidden';
        this._focusFirst();
      } else {
        this._dragOffset = 0;
        this._dragging = false;
        document.body.style.overflow = '';
        if (this._prevFocus instanceof HTMLElement) {
          this._prevFocus.focus();
        }
        this._prevFocus = null;
      }
    }
  }

  private _focusFirst(): void {
    requestAnimationFrame(() => {
      const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
      if (!slot) return;
      for (const el of slot.assignedElements({ flatten: true })) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.matches?.(AosMobileSheet._FOCUSABLE)) {
          htmlEl.focus();
          return;
        }
        const child = htmlEl.querySelector<HTMLElement>(AosMobileSheet._FOCUSABLE);
        if (child) {
          child.focus();
          return;
        }
      }
    });
  }

  private _getAllFocusable(): HTMLElement[] {
    const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (!slot) return [];
    const result: HTMLElement[] = [];
    for (const el of slot.assignedElements({ flatten: true })) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.matches?.(AosMobileSheet._FOCUSABLE)) result.push(htmlEl);
      const children = htmlEl.querySelectorAll<HTMLElement>(AosMobileSheet._FOCUSABLE);
      result.push(...Array.from(children));
    }
    return result;
  }

  private readonly _handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.open) return;

    if (e.key === 'Escape' && this.dismissible) {
      e.preventDefault();
      this._dismiss();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = this._getAllFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  private _dismiss(): void {
    this.dispatchEvent(new CustomEvent('sheet-close', { bubbles: true, composed: true }));
  }

  private _handleBackdropClick(e: MouseEvent): void {
    if (this.dismissible && e.target === e.currentTarget) {
      this._dismiss();
    }
  }

  private _handleTouchStart(e: TouchEvent): void {
    if (!this.dismissible) return;
    const touch = e.touches[0];
    this._touchStartPrimary = this.position === 'left' ? touch.clientX : touch.clientY;
    this._dragging = true;
    this._dragOffset = 0;
  }

  private _handleTouchMove(e: TouchEvent): void {
    if (!this._dragging || !this.dismissible) return;
    const touch = e.touches[0];
    let delta: number;

    if (this.position === 'bottom') {
      delta = touch.clientY - this._touchStartPrimary;
    } else if (this.position === 'top') {
      delta = this._touchStartPrimary - touch.clientY;
    } else {
      delta = touch.clientX - this._touchStartPrimary;
    }

    if (delta > 0) {
      e.preventDefault();
      this._dragOffset = delta;
    }
  }

  private _handleTouchEnd(): void {
    if (!this._dragging) return;
    this._dragging = false;
    if (this._dragOffset >= 100) {
      this._dismiss();
    } else {
      this._dragOffset = 0;
    }
  }

  private _getPanelStyle(): string {
    if (this._dragOffset <= 0) return '';
    if (this.position === 'bottom') return `transform: translateY(${this._dragOffset}px); transition: none;`;
    if (this.position === 'top') return `transform: translateY(-${this._dragOffset}px); transition: none;`;
    return `transform: translateX(${this._dragOffset}px); transition: none;`;
  }

  override render() {
    if (!this.open) return nothing;

    return html`
      <div
        class="sheet-backdrop"
        @click=${this._handleBackdropClick}
        role="presentation"
      ></div>
      <div
        class="sheet-panel sheet-panel--${this.position}"
        role="dialog"
        aria-modal="true"
        aria-label=${this.label || 'Sheet'}
        style=${this._getPanelStyle()}
        @touchstart=${this._handleTouchStart}
        @touchmove=${this._handleTouchMove}
        @touchend=${this._handleTouchEnd}
      >
        ${this.position === 'bottom'
          ? html`<div class="sheet-handle" aria-hidden="true"></div>`
          : nothing}
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
      animation: backdrop-in 0.2s ease forwards;
    }

    .sheet-panel {
      position: fixed;
      z-index: 201;
      background: var(--color-bg-secondary, #171717);
      overflow: hidden auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      will-change: transform;
    }

    .sheet-panel--bottom {
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 90dvh;
      border-radius: var(--mobile-sheet-radius, 16px) var(--mobile-sheet-radius, 16px) 0 0;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
      animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    .sheet-panel--top {
      left: 0;
      right: 0;
      top: 0;
      max-height: 90dvh;
      border-radius: 0 0 var(--mobile-sheet-radius, 16px) var(--mobile-sheet-radius, 16px);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      animation: slide-down 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    .sheet-panel--left {
      left: 0;
      top: 0;
      bottom: 0;
      width: min(320px, 85vw);
      border-radius: 0 var(--mobile-sheet-radius, 16px) var(--mobile-sheet-radius, 16px) 0;
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
      animation: slide-right 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    .sheet-handle {
      width: var(--mobile-sheet-handle-width, 32px);
      height: var(--mobile-sheet-handle-height, 4px);
      background: var(--color-text-secondary, #a1a1aa);
      border-radius: 2px;
      margin: 12px auto 8px;
      opacity: 0.4;
    }

    @keyframes backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @keyframes slide-down {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }

    @keyframes slide-right {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-sheet': AosMobileSheet;
  }
}
