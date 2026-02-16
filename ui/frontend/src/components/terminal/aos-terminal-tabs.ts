import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';

/**
 * Terminal Tabs Component
 *
 * A tab bar for managing multiple terminal sessions.
 * Features:
 * - Horizontal tab list with session names
 * - Active tab highlighting
 * - Close button per tab
 * - Scrollable when many tabs
 */
@customElement('aos-terminal-tabs')
export class AosTerminalTabs extends LitElement {
  @property({ type: Array }) sessions: TerminalSession[] = [];
  @property({ type: String }) activeSessionId: string | null = null;

  // Use light DOM for styling compatibility
  override createRenderRoot() {
    return this;
  }

  private static stylesInjected = false;

  private ensureStyles() {
    if (AosTerminalTabs.stylesInjected) return;
    AosTerminalTabs.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      aos-terminal-tabs {
        display: block;
      }

      .tabs-container {
        display: flex;
        align-items: center;
        background: var(--bg-color-tertiary, #252526);
        border-bottom: 1px solid var(--border-color, #404040);
        overflow-x: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--border-color, #404040) transparent;
      }

      .tabs-container::-webkit-scrollbar {
        height: 4px;
      }

      .tabs-container::-webkit-scrollbar-track {
        background: transparent;
      }

      .tabs-container::-webkit-scrollbar-thumb {
        background: var(--border-color, #404040);
        border-radius: 2px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        min-width: 120px;
        max-width: 200px;
        background: var(--bg-color-tertiary, #252526);
        border: none;
        border-right: 1px solid var(--border-color, #404040);
        color: var(--text-color-secondary, #a0a0a0);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        user-select: none;
      }

      .tab:hover {
        background: var(--bg-color-hover, #3c3c3c);
        color: var(--text-color-primary, #e0e0e0);
      }

      .tab.active {
        background: var(--bg-color-secondary, #1e1e1e);
        color: var(--text-color-primary, #e0e0e0);
        border-bottom: 2px solid var(--accent-color, #007acc);
        margin-bottom: -1px;
      }

      .tab-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .tab-status.active {
        background: #4caf50;
      }

      .tab-status.paused {
        background: #ff9800;
      }

      .tab-status.disconnected {
        background: #f44336;
      }

      .tab-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tab-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 3px;
        color: var(--text-color-muted, #606060);
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .tab:hover .tab-close,
      .tab.active .tab-close {
        opacity: 1;
      }

      .tab-close:hover {
        background: var(--bg-color-hover, #3c3c3c);
        color: var(--text-color-primary, #e0e0e0);
      }

      .tab-close svg {
        width: 12px;
        height: 12px;
      }

      .empty-tabs {
        padding: 12px 16px;
        color: var(--text-color-muted, #606060);
        font-size: 12px;
        font-style: italic;
      }

      /* Workflow Tab Styles */
      .tab.workflow {
        background: linear-gradient(135deg, var(--bg-color-tertiary, #252526) 0%, rgba(0, 122, 204, 0.1) 100%);
      }

      .tab.workflow:hover {
        background: linear-gradient(135deg, var(--bg-color-hover, #3c3c3c) 0%, rgba(0, 122, 204, 0.15) 100%);
      }

      .tab.workflow.active {
        background: linear-gradient(135deg, var(--bg-color-secondary, #1e1e1e) 0%, rgba(0, 122, 204, 0.2) 100%);
        border-bottom-color: #4caf50;
      }

      .tab-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        color: var(--accent-color, #007acc);
      }

      .tab.workflow .tab-icon {
        color: #4caf50;
      }

      .tab.needs-input {
        animation: pulse-input 1.5s ease-in-out infinite;
      }

      @keyframes pulse-input {
        0%, 100% {
          background: linear-gradient(135deg, var(--bg-color-tertiary, #252526) 0%, rgba(255, 152, 0, 0.1) 100%);
        }
        50% {
          background: linear-gradient(135deg, var(--bg-color-tertiary, #252526) 0%, rgba(255, 152, 0, 0.25) 100%);
        }
      }

      .input-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        background: #ff9800;
        border-radius: 50%;
        font-size: 9px;
        font-weight: 600;
        color: white;
        flex-shrink: 0;
        margin-left: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  override render() {
    this.ensureStyles();

    if (this.sessions.length === 0) {
      return html`
        <div class="tabs-container">
          <div class="empty-tabs">Keine Sessions aktiv</div>
        </div>
      `;
    }

    return html`
      <div class="tabs-container">
        ${this.sessions.map(
          (session) => {
            const isWorkflow = session.isWorkflow ?? false;
            const needsInput = session.needsInput ?? false;
            // Tab title: "workflowName: workflowContext" for workflows, otherwise session.name
            const tabTitle = isWorkflow && session.workflowName
              ? `${session.workflowName}: ${session.workflowContext ?? ''}`
              : session.name;

            return html`
              <div
                class="tab ${session.id === this.activeSessionId ? 'active' : ''} ${isWorkflow ? 'workflow' : ''} ${needsInput ? 'needs-input' : ''}"
                @click=${() => this._handleTabClick(session.id)}
                title="${tabTitle} (${session.status})"
              >
                ${isWorkflow
                  ? html`
                    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                  `
                  : html`<span class="tab-status ${session.status}"></span>`
                }
                <span class="tab-name">${tabTitle}</span>
                ${needsInput
                  ? html`<span class="input-badge" title="Eingabe erforderlich">!</span>`
                  : ''
                }
                <button
                  class="tab-close"
                  @click=${(e: Event) => this._handleCloseClick(e, session.id)}
                  title="Session schließen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            `;
          }
        )}
      </div>
    `;
  }

  private _handleTabClick(sessionId: string) {
    this.dispatchEvent(
      new CustomEvent('session-select', {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleCloseClick(e: Event, sessionId: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('session-close', {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-terminal-tabs': AosTerminalTabs;
  }
}
