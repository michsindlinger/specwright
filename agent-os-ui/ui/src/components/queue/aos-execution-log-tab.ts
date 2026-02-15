import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway } from '../../gateway.js';
import type { WebSocketMessage } from '../../gateway.js';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'spec-start' | 'story-start' | 'story-complete' | 'spec-complete' | 'queue-complete' | 'error';
  projectPath: string;
  projectName: string;
  specId: string;
  specName: string;
  storyId?: string;
  storyTitle?: string;
  message: string;
}

/**
 * aos-execution-log-tab: Execution Log tab for the bottom panel.
 * Displays a scrollable, monospace log of queue execution events in real-time.
 *
 * Features:
 * - Initial load via gateway `queue.log.state`
 * - Real-time updates via gateway `queue.log.entry`
 * - Auto-scroll with scroll-lock on manual scroll
 * - Color-coded log entries by type
 * - Clear log button
 */
@customElement('aos-execution-log-tab')
export class AosExecutionLogTab extends LitElement {
  @state() private entries: LogEntry[] = [];
  @state() private autoScroll = true;

  private boundMessageHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private scrollContainer: HTMLElement | null = null;
  private readonly scrollThreshold = 30;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupMessageHandlers();
    this.requestLogState();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeMessageHandlers();
  }

  protected override createRenderRoot() {
    return this;
  }

  private setupMessageHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['queue.log.state', (msg) => this.handleLogState(msg)],
      ['queue.log.entry', (msg) => this.handleLogEntry(msg)]
    ];

    for (const [type, handler] of handlers) {
      this.boundMessageHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeMessageHandlers(): void {
    for (const [type, handler] of this.boundMessageHandlers) {
      gateway.off(type, handler);
    }
    this.boundMessageHandlers.clear();
  }

  private requestLogState(): void {
    gateway.send({ type: 'queue.log.state', timestamp: new Date().toISOString() });
  }

  private handleLogState(msg: WebSocketMessage): void {
    const entries = msg.entries as LogEntry[] | undefined;
    this.entries = entries || [];
    this.scheduleAutoScroll();
  }

  private handleLogEntry(msg: WebSocketMessage): void {
    const entry = msg.entry as LogEntry | undefined;
    if (!entry) return;
    this.entries = [...this.entries, entry];
    this.scheduleAutoScroll();
  }

  private scheduleAutoScroll(): void {
    if (!this.autoScroll) return;
    requestAnimationFrame(() => {
      const container = this.getScrollContainer();
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  private getScrollContainer(): HTMLElement | null {
    if (!this.scrollContainer) {
      this.scrollContainer = this.querySelector('.elt-entries');
    }
    return this.scrollContainer;
  }

  private handleScroll(e: Event): void {
    const container = e.target as HTMLElement;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom > this.scrollThreshold) {
      this.autoScroll = false;
    } else {
      this.autoScroll = true;
    }
  }

  private handleClear(): void {
    this.entries = [];
  }

  private formatTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '??:??:??';
    }
  }

  private getEntryClass(type: string): string {
    switch (type) {
      case 'spec-start':
      case 'story-start':
        return 'elt-entry-start';
      case 'story-complete':
      case 'spec-complete':
        return 'elt-entry-complete';
      case 'error':
        return 'elt-entry-error';
      case 'queue-complete':
        return 'elt-entry-queue-complete';
      default:
        return '';
    }
  }

  private renderEntry(entry: LogEntry) {
    const time = this.formatTime(entry.timestamp);
    const entryClass = this.getEntryClass(entry.type);
    const storyPart = entry.storyId ? ` [${entry.storyId}]` : '';

    return html`
      <div class="elt-entry ${entryClass}" role="listitem">
        <span class="elt-time">[${time}]</span>
        <span class="elt-project">[${entry.projectName}]</span>
        <span class="elt-spec">[${entry.specName}]</span>
        ${storyPart ? html`<span class="elt-story">${storyPart}</span>` : null}
        <span class="elt-message">${entry.message}</span>
      </div>
    `;
  }

  private renderEmptyState() {
    return html`
      <div class="elt-empty">
        Keine Log-Eintr&auml;ge. Starte die Queue um Eintr&auml;ge zu sehen.
      </div>
    `;
  }

  override render() {
    return html`
      <div class="elt-section">
        <div class="elt-header">
          <div class="elt-header-left">
            <h3 class="elt-title">Execution Log</h3>
            <span class="elt-count">${this.entries.length}</span>
            ${!this.autoScroll
              ? html`<span class="elt-scroll-lock" title="Auto-Scroll deaktiviert">SCROLL LOCK</span>`
              : null}
          </div>
          <div class="elt-header-actions">
            <button
              class="elt-clear-btn"
              @click=${this.handleClear}
              ?disabled=${this.entries.length === 0}
              title="Log leeren"
              aria-label="Log leeren"
            >
              Clear
            </button>
          </div>
        </div>

        <div
          class="elt-entries"
          role="log"
          aria-label="Execution Log Eintr&auml;ge"
          aria-live="polite"
          @scroll=${this.handleScroll}
        >
          ${this.entries.length === 0
            ? this.renderEmptyState()
            : this.entries.map(entry => this.renderEntry(entry))}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-execution-log-tab': AosExecutionLogTab;
  }
}
