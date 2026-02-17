import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';
import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';
import type { ModelSelectedDetail } from './aos-model-dropdown.js';
import '../aos-terminal.js';
import type { AosTerminal } from '../aos-terminal.js';
import './aos-model-dropdown.js';
import xtermCss from '@xterm/xterm/css/xterm.css?inline';

/**
 * Terminal Session Component
 *
 * Manages a single terminal session with:
 * - WebSocket connection state handling
 * - Terminal I/O via aos-terminal component
 * - Session lifecycle (create, connect, disconnect, reconnect)
 * - Error handling and reconnection UI
 */
@customElement('aos-terminal-session')
export class AosTerminalSession extends LitElement {
  @property({ type: Object }) session!: TerminalSession;
  @property({ type: Boolean }) isActive = false;
  @property({ type: String }) terminalSessionId: string | null = null;

  @state() private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'connecting';
  @state() private errorMessage: string | null = null;
  @state() private showModelSelector = false;
  /** Tracks the selected terminal type for this session */
  @state() private selectedTerminalType: 'shell' | 'claude-code' = 'claude-code';
  /** When true, session expired on server - show "new session" instead of "reconnect" */
  @state() private isSessionExpired = false;

  // Gateway handlers
  private boundHandleSessionCreated = this.handleSessionCreated.bind(this);
  private boundHandleSessionError = this.handleSessionError.bind(this);
  private boundHandleSessionResumed = this.handleSessionResumed.bind(this);
  private boundHandleSessionClosed = this.handleSessionClosed.bind(this);
  private boundHandleGatewayConnected = this.handleGatewayConnected.bind(this);
  private boundHandleGatewayDisconnected = this.handleGatewayDisconnected.bind(this);

  static override styles = [
    unsafeCSS(xtermCss),
    css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .session-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-color-secondary, #1e1e1e);
    }

    .session-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-color-tertiary, #252526);
      border-bottom: 1px solid var(--border-color, #404040);
      font-size: 12px;
    }

    .session-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .session-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }

    .session-status.connecting {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }

    .session-status.connected {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .session-status.disconnected,
    .session-status.reconnecting {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .session-status.connected .status-dot {
      animation: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .session-id {
      color: var(--text-color-muted, #606060);
      font-family: var(--font-family-mono, monospace);
      font-size: 11px;
    }

    .terminal-wrapper {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .terminal-wrapper.hidden {
      display: none;
    }

    aos-terminal {
      height: 100%;
      display: block;
    }

    .error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-color-secondary, #1e1e1e);
      gap: 16px;
      padding: 20px;
      text-align: center;
    }

    .error-icon {
      width: 48px;
      height: 48px;
      color: #f44336;
    }

    .error-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color-primary, #e0e0e0);
    }

    .error-message {
      font-size: 13px;
      color: var(--text-color-secondary, #a0a0a0);
      max-width: 300px;
    }

    .reconnect-btn {
      background: var(--accent-color, #007acc);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .reconnect-btn:hover {
      background: var(--accent-color-hover, #005a9e);
    }

    .reconnect-btn svg {
      width: 16px;
      height: 16px;
    }

    .model-selector-overlay {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-color-secondary, #1e1e1e);
      gap: 16px;
      padding: 20px;
      text-align: center;
      overflow: visible;
    }

    .model-selector-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color-primary, #e0e0e0);
    }

    .model-selector-hint {
      font-size: 13px;
      color: var(--text-color-secondary, #a0a0a0);
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-color-secondary, #1e1e1e);
      gap: 12px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color, #404040);
      border-top-color: var(--accent-color, #007acc);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 13px;
      color: var(--text-color-secondary, #a0a0a0);
    }
  `];

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupGatewayHandlers();
    this.syncStateFromProps();
  }

  override updated(changed: PropertyValues): void {
    // Sync state when terminalSessionId property changes (e.g., after project switch)
    if (changed.has('terminalSessionId')) {
      this.syncStateFromProps();
    }

    // Handle session initialization when becoming active
    if (changed.has('isActive') && this.isActive && !this.terminalSessionId) {
      // Workflow sessions auto-connect without model selector
      if (this.session.isWorkflow) {
        this.startWorkflowSession();
      } else if (!this.showModelSelector) {
        // Regular sessions show model selector
        this.showModelSelector = true;
      }
    }

    // Refresh terminal when session becomes active (tab switch, sidebar reopen)
    if (changed.has('isActive') && this.isActive && this.terminalSessionId) {
      this.refreshTerminal();
    }
  }

  /**
   * Refresh the underlying terminal rendering.
   * Public so parent components can trigger refresh (e.g., on sidebar open).
   */
  public refreshTerminal(): void {
    // Use requestAnimationFrame to ensure the DOM is visible before fitting
    requestAnimationFrame(() => {
      const terminal = this.renderRoot.querySelector('aos-terminal') as AosTerminal | null;
      terminal?.refreshTerminal();
    });
  }

  /**
   * Synchronize internal state based on current properties.
   * Called on mount and when terminalSessionId changes.
   */
  private syncStateFromProps(): void {
    if (this.terminalSessionId) {
      // We have a backend session - show as connected
      this.connectionStatus = 'connected';
      this.showModelSelector = false;
      this.errorMessage = null;
    } else if (this.isActive) {
      // No session yet
      if (this.session.isWorkflow) {
        // Workflow sessions auto-connect without model selector
        this.showModelSelector = false;
        this.connectionStatus = 'connecting';
      } else {
        // Regular sessions show model selector
        this.showModelSelector = true;
        this.connectionStatus = 'connecting';
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupGatewayHandlers();
  }

  private setupGatewayHandlers(): void {
    gateway.on('cloud-terminal:created', this.boundHandleSessionCreated);
    gateway.on('cloud-terminal:error', this.boundHandleSessionError);
    gateway.on('cloud-terminal:resumed', this.boundHandleSessionResumed);
    gateway.on('cloud-terminal:closed', this.boundHandleSessionClosed);
    gateway.on('gateway.connected', this.boundHandleGatewayConnected);
    gateway.on('gateway.disconnected', this.boundHandleGatewayDisconnected);
  }

  private cleanupGatewayHandlers(): void {
    gateway.off('cloud-terminal:created', this.boundHandleSessionCreated);
    gateway.off('cloud-terminal:error', this.boundHandleSessionError);
    gateway.off('cloud-terminal:resumed', this.boundHandleSessionResumed);
    gateway.off('cloud-terminal:closed', this.boundHandleSessionClosed);
    gateway.off('gateway.connected', this.boundHandleGatewayConnected);
    gateway.off('gateway.disconnected', this.boundHandleGatewayDisconnected);
  }

  private handleSessionCreated(message: WebSocketMessage): void {
    // Only accept events for our own request (correlation ID)
    if (message.requestId !== this.session.id) return;

    const sessionId = message.sessionId as string;
    if (sessionId) {
      this.terminalSessionId = sessionId;
      this.connectionStatus = 'connected';
      this.errorMessage = null;
      this.showModelSelector = false;

      // Notify parent with terminalType so app.ts can update session name/type
      this.dispatchEvent(
        new CustomEvent('session-connected', {
          detail: {
            sessionId: this.session.id,
            terminalSessionId: sessionId,
            terminalType: this.selectedTerminalType,
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private handleSessionError(message: WebSocketMessage): void {
    // Filter: only handle errors for our session or errors without sessionId (create errors)
    const errorSessionId = message.sessionId as string | undefined;
    if (errorSessionId && errorSessionId !== this.terminalSessionId) return;

    const errorCode = message.code as string | undefined;

    if (errorCode === 'SESSION_NOT_FOUND') {
      // Session expired on server - offer to start a new one
      this.isSessionExpired = true;
      this.connectionStatus = 'disconnected';
      this.errorMessage = 'Die Session ist abgelaufen. Bitte starten Sie eine neue Session.';
      return;
    }

    this.connectionStatus = 'disconnected';
    this.errorMessage = (message.message as string) || (message.error as string) || 'Verbindung zum Terminal-Server fehlgeschlagen';
  }

  private handleSessionResumed(message: WebSocketMessage): void {
    if (message.sessionId !== this.terminalSessionId) return;

    this.connectionStatus = 'connected';
    this.errorMessage = null;
    this.isSessionExpired = false;
    console.log(`[AosTerminalSession] Session ${this.terminalSessionId} resumed successfully`);
  }

  private handleSessionClosed(message: WebSocketMessage): void {
    if (message.sessionId !== this.terminalSessionId) return;

    // Server killed the session (timeout or process exit)
    this.isSessionExpired = true;
    this.connectionStatus = 'disconnected';
    const exitCode = message.exitCode as number | undefined;
    this.errorMessage = exitCode !== undefined
      ? `Prozess beendet (Exit Code: ${exitCode}). Starten Sie eine neue Session.`
      : 'Die Session wurde vom Server beendet.';
    console.log(`[AosTerminalSession] Session ${this.terminalSessionId} closed by server`);
  }

  private handleGatewayConnected(): void {
    if (this.connectionStatus === 'disconnected' && this.terminalSessionId && !this.isSessionExpired) {
      // Try to reconnect existing session
      this.connectionStatus = 'reconnecting';
      this.requestReconnect();
    }
  }

  private handleGatewayDisconnected(): void {
    if (this.connectionStatus === 'connected') {
      this.connectionStatus = 'disconnected';
    }
  }

  private requestReconnect(): void {
    if (this.terminalSessionId) {
      gateway.send({
        type: 'cloud-terminal:resume',
        sessionId: this.terminalSessionId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleReconnect(): void {
    this.errorMessage = null;

    if (this.isSessionExpired) {
      // Session is gone on server - reset and show model selector for new session
      this.resetToNewSession();
      return;
    }

    this.connectionStatus = 'connecting';

    if (gateway.getConnectionStatus()) {
      this.requestReconnect();
    } else {
      // Gateway will auto-reconnect, then we'll try to reconnect session
      gateway.connect();
    }
  }

  /**
   * Reset session state and show model selector for a fresh start
   * (or auto-start for workflow sessions)
   */
  private resetToNewSession(): void {
    const oldSessionId = this.terminalSessionId;
    this.terminalSessionId = null;
    this.connectionStatus = 'connecting';
    this.isSessionExpired = false;
    this.errorMessage = null;

    // Workflow sessions auto-start without model selector
    if (this.session.isWorkflow) {
      this.showModelSelector = false;
      // Start workflow session after reset
      this.startWorkflowSession();
    } else {
      this.showModelSelector = true;
    }

    // Notify parent that this session needs reset
    this.dispatchEvent(
      new CustomEvent('session-expired', {
        detail: { sessionId: this.session.id, terminalSessionId: oldSessionId },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Start a workflow session - auto-connects without model selector.
   * Uses the backend's cloud-terminal:create-workflow endpoint.
   * Sends structured workflowMetadata and modelConfig per CloudTerminalCreateWorkflowMessage protocol.
   */
  private startWorkflowSession(): void {
    if (!this.session.isWorkflow) return;

    this.showModelSelector = false;
    this.connectionStatus = 'connecting';
    this.selectedTerminalType = 'claude-code';

    const workflowName = this.session.workflowName || 'unknown';

    // Send workflow creation request with structured objects per protocol
    gateway.send({
      type: 'cloud-terminal:create-workflow',
      requestId: this.session.id,
      projectPath: this.session.projectPath,
      workflowMetadata: {
        workflowCommand: `/${workflowName}`,
        workflowName,
        workflowContext: this.session.workflowContext,
      },
      modelConfig: {
        model: this.session.modelId || 'claude-sonnet-4-5-20250929',
        provider: this.session.providerId || 'anthropic',
      },
      timestamp: new Date().toISOString(),
    });
  }

  /** Handle model-selected event with discriminated union detail */
  private handleModelSelected(e: CustomEvent<ModelSelectedDetail>): void {
    e.stopPropagation();
    const detail = e.detail;

    this.showModelSelector = false;
    this.connectionStatus = 'connecting';

    if ('terminalType' in detail) {
      // Shell terminal - no modelConfig needed
      this.selectedTerminalType = 'shell';
      gateway.send({
        type: 'cloud-terminal:create',
        requestId: this.session.id,
        projectPath: this.session.projectPath,
        terminalType: 'shell' as const,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Cloud Code session - send with modelConfig and terminalType
      this.selectedTerminalType = 'claude-code';
      gateway.send({
        type: 'cloud-terminal:create',
        requestId: this.session.id,
        projectPath: this.session.projectPath,
        terminalType: 'claude-code' as const,
        modelConfig: {
          model: detail.modelId,
          provider: detail.providerId,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle input-needed event from aos-terminal.
   * Forwards the event to parent to update needsInput state.
   */
  private _handleInputNeeded(_e: CustomEvent<{ sessionId: string }>): void {
    // Only handle for workflow sessions
    if (!this.session.isWorkflow) return;

    // Forward event to parent (aos-cloud-terminal-sidebar)
    this.dispatchEvent(
      new CustomEvent('input-needed', {
        detail: { sessionId: this.session.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getStatusText(): string {
    switch (this.connectionStatus) {
      case 'connecting':
        return 'Verbinden...';
      case 'connected':
        return 'Verbunden';
      case 'disconnected':
        return 'Getrennt';
      case 'reconnecting':
        return 'Wiederverbinden...';
      default:
        return 'Unbekannt';
    }
  }

  override render() {
    const showModelOverlay = this.showModelSelector && !this.terminalSessionId;
    const showHeader = !showModelOverlay;

    return html`
      <div class="session-container">
        ${showHeader ? html`
          <div class="session-header">
            <div class="session-info">
              <div class="session-status ${this.connectionStatus}">
                <span class="status-dot"></span>
                ${this.getStatusText()}
              </div>
              ${this.terminalSessionId
                ? html`<span class="session-id">${this.terminalSessionId.slice(0, 8)}...</span>`
                : ''}
            </div>
          </div>
        ` : ''}

        ${showModelOverlay
          ? this.renderModelSelector()
          : html`
            <div class="terminal-wrapper ${!this.isActive ? 'hidden' : ''}">
              ${this.renderContent()}
            </div>
          `}
      </div>
    `;
  }

  private renderModelSelector() {
    return html`
      <div class="model-selector-overlay">
        <div class="model-selector-title">Neue Session</div>
        <div class="model-selector-hint">
          Terminal oder Cloud Code Session starten
        </div>
        <aos-model-dropdown
          @model-selected=${this.handleModelSelected}
        ></aos-model-dropdown>
      </div>
    `;
  }

  private renderContent() {
    // Show loading while connecting
    if (this.connectionStatus === 'connecting' || this.connectionStatus === 'reconnecting') {
      return html`
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">
            ${this.connectionStatus === 'reconnecting'
              ? 'Session wird wiederhergestellt...'
              : 'Terminal-Session wird gestartet...'}
          </div>
        </div>
      `;
    }

    // Show error overlay if disconnected
    if (this.connectionStatus === 'disconnected') {
      return html`
        <div class="error-overlay">
          <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="error-title">${this.isSessionExpired ? 'Session beendet' : 'Verbindung verloren'}</div>
          <div class="error-message">
            ${this.errorMessage || 'Die Verbindung zum Terminal-Server wurde unterbrochen.'}
          </div>
          <button class="reconnect-btn" @click=${this.handleReconnect}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${this.isSessionExpired
                ? html`<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`
                : html`<polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>`}
            </svg>
            ${this.isSessionExpired ? 'Neue Session starten' : 'Wiederverbinden'}
          </button>
        </div>
      `;
    }

    // Show terminal when connected
    if (this.connectionStatus === 'connected' && this.terminalSessionId) {
      return html`
        <aos-terminal
          .terminalSessionId=${this.terminalSessionId}
          .cloudMode=${true}
          @input-needed=${this._handleInputNeeded}
        ></aos-terminal>
      `;
    }

    return '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-terminal-session': AosTerminalSession;
  }
}
