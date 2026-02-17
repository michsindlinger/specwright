import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';
import './aos-terminal-tabs.js';
import './aos-terminal-session.js';
import type { AosTerminalSession } from './aos-terminal-session.js';

export interface TerminalSession {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'disconnected' | 'error';
  createdAt: Date;
  errorMessage?: string;
  /** Project path this session belongs to */
  projectPath: string;
  /** Backend terminal session ID (set after connection) */
  terminalSessionId?: string;
  /** Terminal type: 'shell' for plain terminal, 'claude-code' for AI session (defaults to 'claude-code') */
  terminalType?: 'shell' | 'claude-code';
  /** Workflow session flag - if true, this is a workflow execution tab */
  isWorkflow?: boolean;
  /** Workflow name (e.g., "execute-tasks") - used as tab title prefix */
  workflowName?: string;
  /** Workflow context (e.g., "FE-001") - used as tab title suffix */
  workflowContext?: string;
  /** Indicates workflow needs user input - used for tab notifications */
  needsInput?: boolean;
  /** Model ID for workflow sessions (e.g., 'claude-sonnet-4-5-20250929') */
  modelId?: string;
  /** Provider ID for workflow sessions (e.g., 'anthropic') */
  providerId?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

/**
 * Cloud Terminal Sidebar Component
 *
 * A sliding sidebar container for managing Cloud Terminal sessions.
 * Features:
 * - Slide in/out animation from the right
 * - Tab bar for multiple sessions
 * - Session management (create, switch, close)
 * - Integration with CloudTerminalService
 */
@customElement('aos-cloud-terminal-sidebar')
export class AosCloudTerminalSidebar extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: Array }) sessions: TerminalSession[] = [];
  @property({ type: String }) activeSessionId: string | null = null;
  @state() private sidebarWidth = 500;
  @state() private isResizing = false;
  @state() private loadingState: LoadingState = { isLoading: false, message: '' };
  @state() private errorMessage: string | null = null;
  private readonly minSidebarWidth = 400;
  private get maxSidebarWidth() {
    return window.innerWidth * 0.75;
  }

  // Use light DOM for styling compatibility
  override createRenderRoot() {
    return this;
  }

  private static stylesInjected = false;

  private ensureStyles() {
    if (AosCloudTerminalSidebar.stylesInjected) return;
    AosCloudTerminalSidebar.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      aos-cloud-terminal-sidebar {
        display: block;
      }

      .terminal-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: var(--sidebar-width, 500px);
        background: var(--bg-color-secondary, #1e1e1e);
        border-left: 1px solid var(--border-color, #404040);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        box-shadow: -5px 0 15px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }

      .terminal-sidebar.open {
        transform: translateX(0);
      }

      .sidebar-resizer {
        position: fixed;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: col-resize;
        z-index: 1001;
        background: transparent;
        transition: background 0.2s;
      }

      .sidebar-resizer:hover,
      .sidebar-resizer.resizing {
        background: var(--accent-color, #007acc);
      }

      .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color, #404040);
        background: var(--bg-color-tertiary, #252526);
      }

      .sidebar-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color-primary, #e0e0e0);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sidebar-title-icon {
        width: 16px;
        height: 16px;
        color: var(--accent-color, #007acc);
      }

      .sidebar-actions {
        display: flex;
        gap: 8px;
      }

      .action-btn {
        background: transparent;
        border: none;
        color: var(--text-color-secondary, #a0a0a0);
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .action-btn:hover {
        background: var(--bg-color-hover, #3c3c3c);
        color: var(--text-color-primary, #e0e0e0);
      }

      .action-btn svg {
        width: 16px;
        height: 16px;
      }

      .new-session-btn {
        background: var(--accent-color, #007acc);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background 0.2s;
      }

      .new-session-btn:hover {
        background: var(--accent-color-hover, #005a9e);
      }

      .new-session-btn svg {
        width: 14px;
        height: 14px;
      }

      .sidebar-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: var(--text-color-secondary, #a0a0a0);
      }

      .empty-state-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        color: var(--text-color-muted, #606060);
      }

      .empty-state-title {
        font-size: 16px;
        font-weight: 500;
        color: var(--text-color-primary, #e0e0e0);
        margin-bottom: 8px;
      }

      .empty-state-text {
        font-size: 13px;
        margin-bottom: 20px;
        max-width: 280px;
      }

      .empty-state-btn {
        background: var(--accent-color, #007acc);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
      }

      .empty-state-btn svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .empty-state-btn:hover {
        background: var(--accent-color-hover, #005a9e);
      }

      .terminal-sessions-container {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .session-panel {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: none;
      }

      .session-panel.active {
        display: block;
      }

      .session-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;
        background: var(--bg-color-tertiary, #252526);
        color: var(--text-color-secondary, #a0a0a0);
      }

      .session-indicator.active {
        background: rgba(0, 122, 204, 0.2);
        color: var(--accent-color, #007acc);
      }

      .session-indicator-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(30, 30, 30, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 100;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-color, #404040);
        border-top-color: var(--accent-color, #007acc);
        border-radius: 50%;
        animation: cct-spin 1s linear infinite;
      }

      @keyframes cct-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        font-size: 14px;
        color: var(--text-color-secondary, #a0a0a0);
      }

      .error-banner {
        position: absolute;
        top: 16px;
        left: 16px;
        right: 16px;
        background: rgba(244, 67, 54, 0.15);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 6px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 101;
      }

      .error-banner .error-message {
        font-size: 13px;
        color: #f44336;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .error-actions {
        display: flex;
        gap: 8px;
      }

      .retry-btn {
        background: transparent;
        border: 1px solid rgba(244, 67, 54, 0.5);
        color: #f44336;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .retry-btn:hover {
        background: rgba(244, 67, 54, 0.1);
      }

      .dismiss-btn {
        background: transparent;
        border: none;
        color: var(--text-color-secondary, #a0a0a0);
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      .dismiss-btn:hover {
        color: var(--text-color-primary, #e0e0e0);
      }

      .paused-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-color-tertiary, #252526);
        border: 1px solid var(--border-color, #404040);
        border-radius: 8px;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        z-index: 50;
      }

      .paused-icon {
        width: 32px;
        height: 32px;
        color: var(--accent-color, #007acc);
      }

      .paused-text {
        font-size: 14px;
        color: var(--text-color-primary, #e0e0e0);
      }

      .paused-subtext {
        font-size: 12px;
        color: var(--text-color-secondary, #a0a0a0);
      }

      .resume-btn {
        background: var(--accent-color, #007acc);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        margin-top: 4px;
        transition: background 0.2s;
      }

      .resume-btn:hover {
        background: var(--accent-color-hover, #005a9e);
      }
    `;
    document.head.appendChild(style);
  }

  override render() {
    this.ensureStyles();

    const sidebarStyles = {
      '--sidebar-width': `${this.sidebarWidth}px`,
      right: this.isOpen ? '0' : `-${this.sidebarWidth}px`,
    };

    const resizerStyles = {
      right: this.isOpen ? `${this.sidebarWidth - 3}px` : '-10px',
    };

    return html`
      <div
        class="sidebar-resizer ${this.isResizing ? 'resizing' : ''}"
        style=${styleMap(resizerStyles)}
        @mousedown=${this._handleResizeStart}
      ></div>

      <div
        class="terminal-sidebar ${this.isOpen ? 'open' : ''}"
        style=${styleMap(sidebarStyles)}
      >
        <div class="sidebar-header">
          <div class="sidebar-title">
            <svg class="sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Cloud Terminal
            ${this.sessions.length > 0
              ? html`
                  <span class="session-indicator active">
                    <span class="session-indicator-dot"></span>
                    ${this.sessions.length} Session${this.sessions.length !== 1 ? 's' : ''}
                  </span>
                `
              : ''}
          </div>
          <div class="sidebar-actions">
            <button
              class="new-session-btn"
              @click=${this._handleNewSession}
              title="Neue Session starten"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Neue Session
            </button>
            <button
              class="action-btn"
              @click=${this._handleClose}
              title="Sidebar schließen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="sidebar-content">
          ${this.sessions.length === 0
            ? this._renderEmptyState()
            : this._renderTerminalContent()}
        </div>
      </div>
    `;
  }

  private _renderEmptyState() {
    return html`
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
          <polyline points="8 9 12 13 16 9"></polyline>
        </svg>
        <div class="empty-state-title">Keine aktiven Sessions</div>
        <div class="empty-state-text">
          Starten Sie eine neue Cloud Terminal Session, um mit der Entwicklung zu beginnen.
        </div>
        <button class="empty-state-btn" @click=${this._handleNewSession}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Neue Session starten
        </button>
      </div>
    `;
  }

  private _renderTerminalContent() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    const isPaused = activeSession?.status === 'paused';

    return html`
      ${this.errorMessage ? this._renderErrorBanner() : ''}
      <aos-terminal-tabs
        .sessions=${this.sessions}
        .activeSessionId=${this.activeSessionId}
        @session-select=${this._handleSessionSelect}
        @session-close=${this._handleSessionClose}
      ></aos-terminal-tabs>
      <div class="terminal-sessions-container">
        ${this.loadingState.isLoading ? this._renderLoadingOverlay() : ''}
        ${isPaused ? this._renderPausedIndicator(activeSession!) : ''}
        ${repeat(
          this.sessions,
          (session) => session.id,
          (session) => html`
            <aos-terminal-session
              .session=${session}
              .isActive=${session.id === this.activeSessionId}
              .terminalSessionId=${session.terminalSessionId || null}
              class="session-panel ${session.id === this.activeSessionId ? 'active' : 'inactive'}"
              @session-connected=${this._handleSessionConnected}
              @input-needed=${this._handleInputNeeded}
            ></aos-terminal-session>
          `
        )}
      </div>
    `;
  }

  private _renderLoadingOverlay() {
    return html`
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">${this.loadingState.message}</div>
      </div>
    `;
  }

  private _renderErrorBanner() {
    return html`
      <div class="error-banner">
        <div class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          ${this.errorMessage}
        </div>
        <div class="error-actions">
          <button class="retry-btn" @click=${this._handleRetry}>Erneut versuchen</button>
          <button class="dismiss-btn" @click=${this._handleDismissError}>Schließen</button>
        </div>
      </div>
    `;
  }

  private _renderPausedIndicator(session: TerminalSession) {
    return html`
      <div class="paused-indicator">
        <svg class="paused-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <div class="paused-text">Session pausiert</div>
        <div class="paused-subtext">Wegen Inaktivität pausiert</div>
        <button class="resume-btn" @click=${() => this._handleResumeSession(session.id)}>Fortsetzen</button>
      </div>
    `;
  }

  private _handleSessionConnected(e: CustomEvent<{ sessionId: string; terminalSessionId: string }>) {
    // Forward the event to parent (app.ts) to update the session in terminalSessions
    this.dispatchEvent(
      new CustomEvent('session-connected', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleClose() {
    this.dispatchEvent(
      new CustomEvent('sidebar-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleNewSession() {
    this.dispatchEvent(
      new CustomEvent('new-session', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleSessionSelect(e: CustomEvent<{ sessionId: string }>) {
    const sessionId = e.detail.sessionId;
    this.activeSessionId = sessionId;

    // Emit event to parent (app.ts) to clear needsInput flag when tab becomes active
    // WTT-004: Tab-Notifications bei Input-Bedarf
    this.dispatchEvent(
      new CustomEvent('session-select', {
        detail: { sessionId, clearNeedsInput: true },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleSessionClose(e: CustomEvent<{ sessionId: string; isWorkflow?: boolean; status?: string }>) {
    // WTT-005: Tab-Close Confirmation
    // Check if this is an active workflow that needs confirmation
    const { sessionId, isWorkflow, status } = e.detail;

    if (isWorkflow && status === 'active') {
      // Show confirmation dialog for active workflow tabs
      const confirmed = confirm('Workflow läuft noch - wirklich abbrechen?');

      if (!confirmed) {
        // User declined - keep tab open, workflow continues
        return;
      }
    }

    // Either: not a workflow, workflow not active, or user confirmed
    this.dispatchEvent(
      new CustomEvent('session-close', {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Handle input-needed event from aos-terminal-session.
   * Forwards the event to parent (app.ts) to update the session's needsInput flag.
   * WTT-004: Tab-Notifications bei Input-Bedarf
   */
  private _handleInputNeeded(e: CustomEvent<{ sessionId: string }>) {
    const sessionId = e.detail.sessionId;

    // Only set needsInput if this session is NOT currently active
    // (active sessions clear needsInput automatically)
    if (sessionId === this.activeSessionId) return;

    // Forward event to parent (app.ts) so it can update terminalSessions state
    this.dispatchEvent(
      new CustomEvent('input-needed', {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Show loading state with message
   */
  showLoading(message: string = 'Session wird gestartet...') {
    this.loadingState = { isLoading: true, message };
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.loadingState = { isLoading: false, message: '' };
  }

  /**
   * Show error message
   */
  showError(message: string) {
    this.errorMessage = message;
  }

  /**
   * Clear error message
   */
  clearError() {
    this.errorMessage = null;
  }

  /**
   * Open a workflow tab programmatically.
   * Creates a new workflow session and opens the sidebar if closed.
   *
   * @param workflowName - Workflow name (e.g., 'execute-tasks')
   * @param workflowContext - Context identifier (e.g., spec ID, story ID)
   * @param projectPath - Project path for the session
   * @param options - Optional workflow configuration
   * @returns The created session ID
   */
  openWorkflowTab(
    workflowName: string,
    workflowContext: string,
    projectPath: string,
    options?: {
      specId?: string;
      storyId?: string;
      modelId?: string;
      providerId?: string;
    }
  ): string {
    // Generate unique session ID
    const sessionId = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Create session title: "workflowName: workflowContext"
    const tabTitle = `${workflowName}: ${workflowContext}`;

    // Create new workflow session
    const newSession: TerminalSession = {
      id: sessionId,
      name: tabTitle,
      status: 'active',
      createdAt: new Date(),
      projectPath,
      terminalType: 'claude-code',
      isWorkflow: true,
      workflowName,
      workflowContext,
      needsInput: false,
      modelId: options?.modelId,
      providerId: options?.providerId,
    };

    // Add to sessions array
    this.sessions = [...this.sessions, newSession];

    // Set as active session
    this.activeSessionId = sessionId;

    // Open sidebar if closed
    if (!this.isOpen) {
      this.isOpen = true;
    }

    return sessionId;
  }

  private _handleRetry() {
    this.dispatchEvent(
      new CustomEvent('retry-session', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDismissError() {
    this.errorMessage = null;
  }

  private _handleResumeSession(sessionId: string) {
    this.dispatchEvent(
      new CustomEvent('resume-session', {
        detail: { sessionId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleResizeStart(e: MouseEvent) {
    this.isResizing = true;
    const startX = e.clientX;
    const startWidth = this.sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(
        this.minSidebarWidth,
        Math.min(this.maxSidebarWidth, startWidth + delta)
      );
      this.sidebarWidth = newWidth;
    };

    const handleMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Save preference
      try {
        localStorage.setItem('cloud-terminal-sidebar-width', String(this.sidebarWidth));
      } catch {
        // localStorage unavailable
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  override updated(changed: PropertyValues): void {
    // Refresh terminal rendering after sidebar opens (wait for CSS transition)
    if (changed.has('isOpen') && this.isOpen) {
      setTimeout(() => {
        const activeSession = this.querySelector('.session-panel.active') as AosTerminalSession | null;
        activeSession?.refreshTerminal();
      }, 320); // slightly after the 0.3s CSS transition
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    // Load saved width preference
    try {
      const savedWidth = localStorage.getItem('cloud-terminal-sidebar-width');
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= this.minSidebarWidth && width <= this.maxSidebarWidth) {
          this.sidebarWidth = width;
        }
      }
    } catch {
      // localStorage unavailable
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-cloud-terminal-sidebar': AosCloudTerminalSidebar;
  }
}
