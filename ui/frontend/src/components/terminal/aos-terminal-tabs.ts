import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';
import { getTabTitle } from './tab-title.js';

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
  @state() private renamingSessionId: string | null = null;
  @state() private renameDraft = '';

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

      .tab-close,
      .tab-edit {
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
      .tab.active .tab-close,
      .tab:hover .tab-edit,
      .tab.active .tab-edit {
        opacity: 1;
      }

      .tab-close:hover,
      .tab-edit:hover {
        background: var(--bg-color-hover, #3c3c3c);
        color: var(--text-color-primary, #e0e0e0);
      }

      .tab-close svg,
      .tab-edit svg {
        width: 12px;
        height: 12px;
      }

      .tab.editing {
        max-width: none;
        min-width: 240px;
      }

      .tab-rename-input {
        flex: 1;
        min-width: 180px;
        background: transparent;
        border: 1px solid var(--accent-color, #007acc);
        border-radius: 3px;
        padding: 1px 4px;
        color: var(--text-color-primary, #e0e0e0);
        font-size: 12px;
        font-family: inherit;
        outline: none;
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
            const tabTitle = getTabTitle(session);
            const isEditing = this.renamingSessionId === session.id;

            // Note: a single click selects the tab before @dblclick fires.
            // That's intentional — matches Finder-style "click to select, dblclick to rename".
            return html`
              <div
                class="tab ${session.id === this.activeSessionId ? 'active' : ''} ${isWorkflow ? 'workflow' : ''} ${needsInput ? 'needs-input' : ''} ${isEditing ? 'editing' : ''}"
                @click=${() => this._handleTabClick(session.id)}
                @dblclick=${(e: Event) => this._handleRenameStart(e, session, tabTitle)}
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
                ${isEditing
                  ? html`
                    <input
                      class="tab-rename-input"
                      .value=${this.renameDraft}
                      @click=${(e: Event) => e.stopPropagation()}
                      @input=${(e: Event) => { this.renameDraft = (e.target as HTMLInputElement).value; }}
                      @keydown=${(e: KeyboardEvent) => this._handleRenameKey(e, session)}
                      @blur=${() => this._handleRenameCommit(session)}
                    />
                  `
                  : html`<span class="tab-name">${tabTitle}</span>`
                }
                ${needsInput
                  ? html`<span class="input-badge" title="Eingabe erforderlich">!</span>`
                  : ''
                }
                ${!isEditing
                  ? html`
                    <button
                      class="tab-edit"
                      @click=${(e: Event) => this._handleRenameStart(e, session, tabTitle)}
                      title="Tab umbenennen"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  `
                  : ''
                }
                <button
                  class="tab-close"
                  @click=${(e: Event) => this._handleCloseClick(e, session)}
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

  private _handleCloseClick(e: Event, session: TerminalSession) {
    e.stopPropagation();

    // WTT-005: Include session info for close confirmation check
    this.dispatchEvent(
      new CustomEvent('session-close', {
        detail: {
          sessionId: session.id,
          isWorkflow: session.isWorkflow ?? false,
          status: session.status,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _handleRenameStart(e: Event, session: TerminalSession, currentTitle: string) {
    e.stopPropagation();
    if (this.renamingSessionId === session.id) return;
    this.renamingSessionId = session.id;
    this.renameDraft = currentTitle;
    await this.updateComplete;
    const input = this.querySelector('.tab-rename-input') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  private _handleRenameCommit(session: TerminalSession) {
    if (this.renamingSessionId !== session.id) return;
    const trimmed = this.renameDraft.trim();
    const currentTitle = getTabTitle(session);
    if (trimmed && trimmed !== currentTitle) {
      this.dispatchEvent(
        new CustomEvent('session-rename', {
          detail: { sessionId: session.id, name: trimmed },
          bubbles: true,
          composed: true,
        })
      );
    }
    this.renamingSessionId = null;
    this.renameDraft = '';
  }

  private _handleRenameCancel() {
    this.renamingSessionId = null;
    this.renameDraft = '';
  }

  private _handleRenameKey(e: KeyboardEvent, session: TerminalSession) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._handleRenameCommit(session);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this._handleRenameCancel();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-terminal-tabs': AosTerminalTabs;
  }
}
