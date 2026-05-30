import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface TerminalKey {
  label: string;
  sequence: string;
  ariaLabel: string;
  wide?: boolean;
}

const TERMINAL_KEYS: TerminalKey[] = [
  { label: '↑', sequence: '\x1b[A', ariaLabel: 'Pfeil hoch' },
  { label: '↓', sequence: '\x1b[B', ariaLabel: 'Pfeil runter' },
  { label: '←', sequence: '\x1b[D', ariaLabel: 'Pfeil links' },
  { label: '→', sequence: '\x1b[C', ariaLabel: 'Pfeil rechts' },
  { label: 'Tab', sequence: '\t', ariaLabel: 'Tab', wide: true },
  { label: 'Esc', sequence: '\x1b', ariaLabel: 'Escape', wide: true },
  { label: 'Ctrl+C', sequence: '\x03', ariaLabel: 'Abbrechen', wide: true },
  { label: 'Enter', sequence: '\r', ariaLabel: 'Eingabe bestätigen', wide: true },
];

export interface KeySendDetail {
  sequence: string;
}

@customElement('aos-mobile-terminal-keys')
export class AosMobileTerminalKeys extends LitElement {
  @property({ type: String }) sessionId = '';

  private _onTap(key: TerminalKey): void {
    this.dispatchEvent(
      new CustomEvent<KeySendDetail>('key-send', {
        bubbles: true,
        composed: true,
        detail: { sequence: key.sequence },
      })
    );
  }

  override render() {
    return html`
      <div class="strip" role="toolbar" aria-label="Terminal-Steuerung">
        ${TERMINAL_KEYS.map(
          (key) => html`
            <button
              class="key-btn touch-target ${key.wide ? 'wide' : ''}"
              aria-label="${key.ariaLabel}"
              @click=${() => this._onTap(key)}
            >
              ${key.label}
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      background: var(--color-bg-sidebar, #0b1929);
      border-top: 1px solid var(--color-border, #1e3a5f);
    }

    .strip {
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      gap: var(--space-mobile-xs, 0.25rem);
      padding: var(--space-mobile-xs, 0.25rem) var(--space-mobile-sm, 0.5rem);
    }

    .strip::-webkit-scrollbar {
      display: none;
    }

    .key-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 10px;
      min-height: 38px;
      min-width: 42px;
      background: color-mix(
        in srgb,
        var(--color-text-primary, #e8edf2) 8%,
        transparent
      );
      border: 1px solid var(--color-border, #1e3a5f);
      border-radius: 8px;
      color: var(--color-text-primary, #e8edf2);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.12s, border-color 0.12s;
    }

    .key-btn.wide {
      padding: 0 14px;
    }

    .key-btn:active {
      background: color-mix(
        in srgb,
        var(--color-accent-primary, #00d4ff) 22%,
        transparent
      );
      border-color: var(--color-accent-primary, #00d4ff);
      color: var(--color-accent-primary, #00d4ff);
    }

    .touch-target {
      min-height: 38px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-terminal-keys': AosMobileTerminalKeys;
  }
}
