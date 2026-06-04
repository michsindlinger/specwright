import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { CLOUD_TERMINAL_CONFIG } from '../../../../src/shared/types/cloud-terminal.protocol.js';

interface TerminalKey {
  label: string;
  sequence: string;
  ariaLabel: string;
  wide?: boolean;
  /** Highlight with the accent color (e.g. shortcut for a slash command). */
  accent?: boolean;
}

const TERMINAL_KEYS: TerminalKey[] = [
  // Shortcut: types `/resume` and presses Enter in one tap.
  { label: '/resume', sequence: '/resume\r', ariaLabel: 'Resume-Command ausführen', wide: true, accent: true },
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

export interface ImageSendDetail {
  /** Base64-encoded image payload (no data-URL prefix) */
  base64: string;
  /** Image MIME type, guaranteed to be in CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME */
  mimeType: string;
}

@customElement('aos-mobile-terminal-keys')
export class AosMobileTerminalKeys extends LitElement {
  @property({ type: String }) sessionId = '';

  @query('#img-input') private _imgInput!: HTMLInputElement;

  private _onTap(key: TerminalKey): void {
    this.dispatchEvent(
      new CustomEvent<KeySendDetail>('key-send', {
        bubbles: true,
        composed: true,
        detail: { sequence: key.sequence },
      })
    );
  }

  /** Opens the native picker (iOS: Fotomediathek / Foto aufnehmen / Datei). */
  private _onPickImage(): void {
    this._imgInput?.click();
  }

  /**
   * Reads the chosen image, validates it against the same constraints as the
   * desktop clipboard-paste path, and emits `image-send`. The parent forwards
   * it as a `cloud-terminal:paste-image` message; the backend persists the file
   * and injects its path into the PTY — identical to the Cmd/Ctrl+V flow.
   */
  private async _onFileSelected(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so picking the same screenshot again still fires `change`.
    input.value = '';
    if (!file) return;

    const allowed = CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME as readonly string[];
    if (!allowed.includes(file.type)) {
      this._toast(`Dateityp wird nicht unterstützt (${file.type || 'unbekannt'})`, 'error');
      return;
    }

    const maxBytes = CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES;
    if (file.size > maxBytes) {
      this._toast(
        `Bild ist zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB, Limit ${maxBytes / 1024 / 1024} MB)`,
        'error',
      );
      return;
    }

    let base64: string;
    try {
      base64 = await this._fileToBase64(file);
    } catch (err) {
      this._toast(
        `Bild konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
      return;
    }

    this._toast('Screenshot wird hochgeladen…', 'info');
    this.dispatchEvent(
      new CustomEvent<ImageSendDetail>('image-send', {
        bubbles: true,
        composed: true,
        detail: { base64, mimeType: file.type },
      })
    );
  }

  private _fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        const comma = r.indexOf(',');
        resolve(comma >= 0 ? r.slice(comma + 1) : r);
      };
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsDataURL(file);
    });
  }

  private _toast(message: string, type: 'info' | 'success' | 'error'): void {
    this.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message, type },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <div class="strip" role="toolbar" aria-label="Terminal-Steuerung">
        <button
          class="key-btn img-btn touch-target"
          aria-label="Screenshot oder Bild einfügen"
          @click=${this._onPickImage}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <path d="M21 15l-5-5L5 21"></path>
          </svg>
        </button>
        ${TERMINAL_KEYS.map(
          (key) => html`
            <button
              class="key-btn touch-target ${key.wide ? 'wide' : ''} ${key.accent ? 'accent' : ''}"
              aria-label="${key.ariaLabel}"
              @click=${() => this._onTap(key)}
            >
              ${key.label}
            </button>
          `
        )}
        <input
          id="img-input"
          type="file"
          accept="image/*"
          hidden
          @change=${this._onFileSelected}
        />
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

    /* Accent keys (slash-command shortcuts) stand out from plain keystrokes. */
    .key-btn.accent {
      color: var(--color-accent-primary, #00d4ff);
      border-color: color-mix(
        in srgb,
        var(--color-accent-primary, #00d4ff) 50%,
        var(--color-border, #1e3a5f)
      );
      background: color-mix(
        in srgb,
        var(--color-accent-primary, #00d4ff) 12%,
        transparent
      );
    }

    /* Pin the image button to the left so it stays reachable while the key
       strip scrolls horizontally. */
    .key-btn.img-btn {
      position: sticky;
      left: 0;
      z-index: 1;
      padding: 0 10px;
      color: var(--color-accent-primary, #00d4ff);
      background: var(--color-bg-sidebar, #0b1929);
    }

    .key-btn.img-btn svg {
      display: block;
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
