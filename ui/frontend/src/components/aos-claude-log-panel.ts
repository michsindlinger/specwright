import { LitElement, html, css } from 'lit';
import type { PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway } from '../gateway.js';
import type { MessageHandler } from '../gateway.js';
import { stripAnsi } from '../utils/ansi-strip.js';

const MAX_BUFFER_CHARS = 200_000;
const SCROLL_BOTTOM_TOLERANCE = 4;

@customElement('aos-claude-log-panel')
export class AosClaudeLogPanel extends LitElement {
  @property({ type: String }) sessionId = '';
  @property({ type: Boolean, reflect: true }) fullscreen = false;

  @state() private logText = '';
  @state() private userScrolledUp = false;
  @state() private copyState: 'idle' | 'ok' | 'err' = 'idle';

  private pendingChunks: string[] = [];
  private rafHandle: number | null = null;
  private dataHandler: MessageHandler | null = null;
  private bufferResponseHandler: MessageHandler | null = null;
  private connectedHandler: MessageHandler | null = null;
  private currentSubscriptionId: string | null = null;
  private copyResetHandle: number | null = null;

  static override styles = css`
    :host {
      display: block;
      position: relative;
    }
    :host([fullscreen]) {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: var(--color-bg-primary, #0F1F33);
      padding: 16px;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: flex-end;
      margin-bottom: 6px;
    }
    .icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: var(--font-family-mono, 'JetBrains Mono', ui-monospace, monospace);
      font-size: 10.5px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: var(--radius-sm, 0.25rem);
      background: rgba(0, 212, 255, 0.08);
      border: 1px solid rgba(0, 212, 255, 0.25);
      color: var(--color-accent-primary, #00D4FF);
      cursor: pointer;
      user-select: none;
      transition: background 150ms ease, border-color 150ms ease;
    }
    .icon-btn:hover:not([disabled]) {
      background: rgba(0, 212, 255, 0.14);
      border-color: rgba(0, 212, 255, 0.45);
    }
    .icon-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .copy-feedback {
      font-size: 10px;
      color: var(--color-success, #10B981);
      align-self: center;
      opacity: 0;
      transition: opacity 200ms ease;
      pointer-events: none;
    }
    .copy-feedback.visible {
      opacity: 1;
    }
    .copy-feedback.err {
      color: var(--color-error, #EF4444);
    }
    .log-panel {
      max-height: 300px;
      overflow-y: auto;
      overflow-x: hidden;
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 11px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--color-bg-secondary, #0a1929);
      color: var(--color-text-primary, #B8C9DB);
      border: 1px solid var(--color-border, #1E3A5F);
      border-radius: var(--radius-sm, 0.25rem);
      padding: 8px;
    }
    :host([fullscreen]) .log-panel {
      max-height: none;
      flex: 1;
      font-size: 12px;
    }
    .log-panel.empty::before {
      content: 'Warte auf Output…';
      color: var(--color-text-muted, #7A92A9);
      font-style: italic;
    }
    .scroll-hint {
      position: sticky;
      bottom: 0;
      align-self: flex-end;
      margin-top: -22px;
      padding: 2px 8px;
      font-size: 10px;
      background: var(--color-bg-primary, #142840);
      color: var(--color-text-muted, #7A92A9);
      border: 1px solid var(--color-border, #1E3A5F);
      border-radius: 9999px;
      cursor: pointer;
      user-select: none;
    }
    :host([fullscreen]) .scroll-hint {
      position: absolute;
      bottom: 24px;
      right: 24px;
      margin-top: 0;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.refreshSubscription();
    document.addEventListener('keydown', this.onKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.teardownSubscription();
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.pendingChunks = [];
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.copyResetHandle !== null) {
      clearTimeout(this.copyResetHandle);
      this.copyResetHandle = null;
    }
    this.fullscreen = false;
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('sessionId') && this.isConnected) {
      this.refreshSubscription();
    }
    if (changed.has('fullscreen')) {
      this.userScrolledUp = false;
    }
  }

  override updated(_changed: PropertyValues): void {
    super.updated(_changed);

    if (!this.userScrolledUp) {
      const el = this.renderRoot.querySelector('.log-panel') as HTMLDivElement | null;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }

  private refreshSubscription(): void {
    if (!this.isConnected) return;
    if (this.currentSubscriptionId === this.sessionId) return;

    if (this.currentSubscriptionId !== null) {
      this.teardownSubscription();
      this.logText = '';
      this.pendingChunks = [];
      this.userScrolledUp = false;
    }

    if (this.sessionId) {
      this.subscribe();
      this.requestBuffer();
      this.currentSubscriptionId = this.sessionId;
    } else {
      this.currentSubscriptionId = null;
    }
  }

  private subscribe(): void {
    this.dataHandler = (msg) => {
      if (msg.sessionId !== this.sessionId) return;
      const data = msg.data;
      if (typeof data !== 'string' || data.length === 0) return;
      this.appendChunk(data);
    };
    gateway.on('cloud-terminal:data', this.dataHandler);

    this.bufferResponseHandler = (msg) => {
      if (msg.sessionId !== this.sessionId) return;
      const buffer = msg.buffer;
      if (typeof buffer !== 'string') return;
      this.logText = this.trimToCap(stripAnsi(buffer));
      this.userScrolledUp = false;
    };
    gateway.on('cloud-terminal:buffer-response', this.bufferResponseHandler);

    this.connectedHandler = () => {
      if (this.sessionId) this.requestBuffer();
    };
    gateway.on('gateway.connected', this.connectedHandler);
  }

  private teardownSubscription(): void {
    if (this.dataHandler) {
      gateway.off('cloud-terminal:data', this.dataHandler);
      this.dataHandler = null;
    }
    if (this.bufferResponseHandler) {
      gateway.off('cloud-terminal:buffer-response', this.bufferResponseHandler);
      this.bufferResponseHandler = null;
    }
    if (this.connectedHandler) {
      gateway.off('gateway.connected', this.connectedHandler);
      this.connectedHandler = null;
    }
    this.currentSubscriptionId = null;
  }

  private requestBuffer(): void {
    if (!this.sessionId) return;
    gateway.send({
      type: 'cloud-terminal:buffer-request',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private appendChunk(rawChunk: string): void {
    this.pendingChunks.push(rawChunk);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this.flushPending();
    });
  }

  private flushPending(): void {
    if (this.pendingChunks.length === 0) return;
    const merged = this.pendingChunks.join('');
    this.pendingChunks = [];
    const stripped = stripAnsi(merged);
    if (stripped.length === 0) return;
    this.logText = this.trimToCap(this.logText + stripped);
  }

  private trimToCap(text: string): string {
    if (text.length <= MAX_BUFFER_CHARS) return text;
    return text.slice(text.length - MAX_BUFFER_CHARS);
  }

  private onScroll = (e: Event): void => {
    const el = e.currentTarget as HTMLDivElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.userScrolledUp = distanceFromBottom > SCROLL_BOTTOM_TOLERANCE;
  };

  private resumeAutoScroll = (): void => {
    this.userScrolledUp = false;
    const el = this.renderRoot.querySelector('.log-panel') as HTMLDivElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  };

  private handleCopy = async (e: Event): Promise<void> => {
    e.stopPropagation();
    if (!this.logText) return;
    try {
      await navigator.clipboard.writeText(this.logText);
      this.copyState = 'ok';
    } catch {
      this.copyState = 'err';
    }
    if (this.copyResetHandle !== null) {
      clearTimeout(this.copyResetHandle);
    }
    this.copyResetHandle = window.setTimeout(() => {
      this.copyState = 'idle';
      this.copyResetHandle = null;
    }, 1500);
  };

  private toggleFullscreen = (e: Event): void => {
    e.stopPropagation();
    this.fullscreen = !this.fullscreen;
  };

  private handleOpenTerminal = (e: Event): void => {
    e.stopPropagation();
    if (!this.sessionId) return;
    this.dispatchEvent(new CustomEvent('open-terminal-session', {
      detail: { sessionId: this.sessionId },
      bubbles: true,
      composed: true,
    }));
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.fullscreen) {
      e.stopPropagation();
      this.fullscreen = false;
    }
  };

  private stopClickPropagation = (e: Event): void => {
    e.stopPropagation();
  };

  override render() {
    const empty = this.logText.length === 0;
    const fbClass = `copy-feedback${this.copyState !== 'idle' ? ' visible' : ''}${this.copyState === 'err' ? ' err' : ''}`;
    const fbText = this.copyState === 'err' ? 'Fehler' : this.copyState === 'ok' ? 'Kopiert' : '';
    return html`
      <div class="toolbar" @click=${this.stopClickPropagation}>
        <button
          class="icon-btn"
          type="button"
          title="Logs kopieren"
          aria-label="Logs in Zwischenablage kopieren"
          ?disabled=${empty}
          @click=${this.handleCopy}
        >📋 Copy</button>
        <span class=${fbClass} aria-live="polite">${fbText}</span>
        <button
          class="icon-btn"
          type="button"
          title="Im Cloud-Terminal öffnen"
          aria-label="Im Cloud-Terminal öffnen"
          ?disabled=${!this.sessionId}
          @click=${this.handleOpenTerminal}
        >⚡ Terminal</button>
        <button
          class="icon-btn"
          type="button"
          title="${this.fullscreen ? 'Fullscreen verlassen (Esc)' : 'Fullscreen'}"
          aria-label="${this.fullscreen ? 'Fullscreen verlassen' : 'Fullscreen aktivieren'}"
          aria-pressed=${this.fullscreen ? 'true' : 'false'}
          @click=${this.toggleFullscreen}
        >${this.fullscreen ? '⤡ Exit' : '⤢ Full'}</button>
      </div>
      <div
        class="log-panel ${empty ? 'empty' : ''}"
        @scroll=${this.onScroll}
        role="log"
        aria-live="polite"
        aria-label="Claude Code Log"
      >${this.logText}</div>
      ${this.userScrolledUp
        ? html`<div class="scroll-hint" @click=${this.resumeAutoScroll}>↓ Live folgen</div>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-claude-log-panel': AosClaudeLogPanel;
  }
}
