import { LitElement, html, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';
import './aos-terminal-tabs.js';
import './aos-terminal-session.js';
import './aos-auto-review-toggle.js';
import type { AosTerminalSession } from './aos-terminal-session.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';
import type { AvailableProvider, ReviewerConfig } from './aos-auto-review-toggle.js';
import { MobileBreakpointController } from '../../controllers/mobile-breakpoint-controller.js';
import '../mobile/aos-mobile-terminal-header.js';
import '../mobile/aos-mobile-session-tabs.js';
import '../mobile/aos-mobile-connection-bar.js';
import '../mobile/aos-mobile-quick-replies.js';
import '../mobile/aos-mobile-terminal-keys.js';
import '../mobile/aos-mobile-input-bar-idle.js';
import '../aos-claude-log-panel.js';

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
  /** Setup session flag - if true, this is an install/migrate terminal */
  isSetupSession?: boolean;
  /** Setup type: 'install' for fresh installation, 'migrate' for agent-os migration, 'update' for framework update */
  setupType?: 'install' | 'migrate' | 'update';
  /** True once the user has explicitly renamed this tab — guards against auto-overwrite from connect/sync handlers. */
  customNameSet?: boolean;
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
  /** All sessions across every project — source for the cross-project pane picker. */
  @property({ attribute: false }) allSessions: TerminalSession[] = [];
  /** Map projectPath -> display name, for the pane dropdown's <optgroup> labels. */
  @property({ attribute: false }) projectNames: Record<string, string> = {};
  @state() private sidebarWidth = 500;
  @state() private isResizing = false;
  @state() private isFullscreen = false;
  /** Split-screen layout: single pane, 2 rows (top/bottom), or 2x2 quad (fullscreen only). */
  @state() private layoutMode: 'single' | 'split-2' | 'quad-4' = 'single';
  /** Session id per pane slot (length 2 for split-2, 4 for quad-4). null = empty slot. */
  @state() private paneSessionIds: (string | null)[] = [];
  /** Which pane currently owns toolbar/keyboard intent (visual focus ring + session-select sync). */
  @state() private focusedPaneIndex = 0;
  /** Resizable-splitter ratios (clamped 0.15–0.85). split-2: one row split; quad: column + per-column rows. */
  @state() private splitRowRatio = 0.5;
  @state() private quadColRatio = 0.5;
  @state() private quadLeftRowRatio = 0.5;
  @state() private quadRightRowRatio = 0.5;
  @state() private loadingState: LoadingState = { isLoading: false, message: '' };
  @state() private errorMessage: string | null = null;
  private readonly minSidebarWidth = 400;
  private get maxSidebarWidth() {
    return window.innerWidth * 0.75;
  }

  @state() private availableProviders: AvailableProvider[] = [];
  @state() private sessionReviewConfigs: Record<string, { enabled: boolean; reviewers: ReviewerConfig[] }> = {};

  private readonly _mobileController = new MobileBreakpointController(this);

  private boundHandleProvidersListResponse = this._handleProvidersListResponse.bind(this);
  private boundHandleConfigSnapshot = this._handleConfigSnapshot.bind(this);
  private boundHandleGatewayConnected = this._handleGatewayConnectedForProviders.bind(this);
  private boundHandleFullscreenKeydown = this._handleFullscreenKeydown.bind(this);

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
        display: grid;
        gap: 1px;
      }

      .terminal-sessions-container.single { grid-template: 1fr / 1fr; }
      /* Split/quad: panes are absolutely positioned from ratio CSS vars; splitter bars are the seams. */
      .terminal-sessions-container.split-2,
      .terminal-sessions-container.quad-4 {
        display: block;
        background: var(--bg-color-secondary, #1e1e1e);
      }

      /* Single-mode: terminal is a grid item; split/quad: absolutely positioned (inline geometry). */
      .session-panel {
        display: none;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }

      .split-2 .session-panel,
      .quad-4 .session-panel {
        position: absolute;
        padding-top: 30px; /* room for the pane header overlay */
        border: 1px solid var(--border-color, #404040);
        outline-offset: -2px;
      }

      .split-2 .session-panel.focused,
      .quad-4 .session-panel.focused {
        outline: 2px solid var(--accent-color, #007acc);
        z-index: 1;
      }

      /* Header overlay: full-bleed, headers absolutely positioned per pane; only headers interactive. */
      .pane-headers {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 5;
      }

      .pane-header {
        position: absolute;
        height: 30px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 8px;
        background: var(--bg-color-tertiary, #252526);
        border-bottom: 1px solid var(--border-color, #404040);
        pointer-events: auto;
      }

      .pane-header.focused {
        border-bottom-color: var(--accent-color, #007acc);
      }

      .pane-project {
        flex: 0 1 auto;
        max-width: 38%;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pane-project.empty {
        background: var(--bg-color-secondary, #1e1e1e);
        color: var(--text-color-muted, #606060);
        font-weight: 400;
        font-style: italic;
      }

      .pane-select {
        flex: 1 1 auto;
        min-width: 0;
        max-width: 100%;
        background: var(--bg-color-secondary, #1e1e1e);
        color: var(--text-color-primary, #e0e0e0);
        border: 1px solid var(--border-color, #404040);
        border-radius: 4px;
        font-size: 11px;
        padding: 2px 4px;
        cursor: pointer;
      }

      .pane-review-toggle {
        flex: 0 0 auto;
      }

      /* Drag-to-resize splitters (split/quad): wide hit area, thin visible line. */
      .pane-splitter {
        position: absolute;
        z-index: 10;
        background: transparent;
        touch-action: none;
      }
      .pane-splitter.vertical { width: 6px; cursor: col-resize; }
      .pane-splitter.horizontal { height: 6px; cursor: row-resize; }
      .pane-splitter::before {
        content: '';
        position: absolute;
        background: var(--border-color, #404040);
        transition: background 0.15s;
      }
      .pane-splitter.vertical::before { left: 2px; top: 0; bottom: 0; width: 2px; }
      .pane-splitter.horizontal::before { top: 2px; left: 0; right: 0; height: 2px; }
      .pane-splitter:hover::before,
      .pane-splitter.dragging::before { background: var(--accent-color, #007acc); }

      .layout-switcher {
        display: inline-flex;
        gap: 2px;
        margin-right: 4px;
      }

      .layout-btn {
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

      .layout-btn:hover {
        background: var(--bg-color-hover, #3c3c3c);
        color: var(--text-color-primary, #e0e0e0);
      }

      .layout-btn.active {
        background: rgba(0, 122, 204, 0.2);
        color: var(--accent-color, #007acc);
      }

      .layout-btn svg {
        width: 16px;
        height: 16px;
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

      .mobile-terminal-overlay {
        position: fixed;
        inset: 0;
        z-index: 1001;
        display: flex;
        flex-direction: column;
        background: var(--bg-color-secondary, #1e1e1e);
        overscroll-behavior: contain;
      }

      .mobile-log-area {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
        min-height: 0;
      }

      .mobile-log-area aos-claude-log-panel {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .mobile-log-area aos-terminal-session {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  private renderMobile() {
    if (!this.isOpen) return nothing;

    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    const isPaused = activeSession?.status === 'paused';

    return html`
      <div class="mobile-terminal-overlay">
        <aos-mobile-terminal-header
          .sessionsCount=${this.sessions.length}
          .activeModel=${activeSession?.modelId ?? ''}
          @back-tap=${this._handleClose}
          @new-session=${this._handleNewSession}
        ></aos-mobile-terminal-header>

        ${this.sessions.length > 0 ? html`
          <aos-mobile-session-tabs
            .sessions=${this.sessions}
            .activeSessionId=${this.activeSessionId}
            @session-select=${this._handleSessionSelect}
            @session-close=${this._handleSessionClose}
          ></aos-mobile-session-tabs>
        ` : nothing}

        <aos-mobile-connection-bar
          ?connected=${gateway.getConnectionStatus()}
          cloudHost=${activeSession?.projectPath ?? ''}
          branch=""
        ></aos-mobile-connection-bar>

        <div class="mobile-log-area">
          ${this.errorMessage ? this._renderErrorBanner() : nothing}
          ${this.loadingState.isLoading ? this._renderLoadingOverlay() : nothing}
          ${isPaused && activeSession ? this._renderPausedIndicator(activeSession) : nothing}
          ${this._renderMobileLogAreaContent(activeSession)}
        </div>

        ${activeSession?.terminalSessionId ? html`
          <aos-mobile-quick-replies
            .sessionId=${activeSession.terminalSessionId}
            @reply-send=${this._handleMobileTextSend}
          ></aos-mobile-quick-replies>
          <aos-mobile-terminal-keys
            .sessionId=${activeSession.terminalSessionId}
            @key-send=${this._handleMobileKeySend}
            @image-send=${this._handleMobileImageSend}
          ></aos-mobile-terminal-keys>
        ` : nothing}

        <aos-mobile-input-bar-idle
          .sessionId=${activeSession?.terminalSessionId ?? ''}
          @text-send=${this._handleMobileTextSend}
        ></aos-mobile-input-bar-idle>
      </div>
    `;
  }

  private _handleMobileTextSend(e: CustomEvent<{ text: string }>) {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (!activeSession?.terminalSessionId) return;
    // Claude Code TUI submits prompts on CR (0x0D), matching xterm.js Enter default.
    // LF (0x0A) would be treated as in-buffer newline (multiline input), not submit.
    gateway.send({
      type: 'cloud-terminal:input',
      sessionId: activeSession.terminalSessionId,
      data: e.detail.text + '\r',
      timestamp: new Date().toISOString(),
    });
  }

  private _handleMobileKeySend(e: CustomEvent<{ sequence: string }>) {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (!activeSession?.terminalSessionId) return;
    gateway.send({
      type: 'cloud-terminal:input',
      sessionId: activeSession.terminalSessionId,
      data: e.detail.sequence,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mobile image insertion. The keys bar has already validated MIME/size and
   * base64-encoded the file; we forward it via the same `cloud-terminal:paste-image`
   * message the desktop Cmd/Ctrl+V path uses. The backend persists the image and
   * injects its path into the PTY (see cloud-terminal-manager.savePastedImage).
   */
  private _handleMobileImageSend(e: CustomEvent<{ base64: string; mimeType: string }>) {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    if (!activeSession?.terminalSessionId) return;
    gateway.send({
      type: 'cloud-terminal:paste-image',
      sessionId: activeSession.terminalSessionId,
      base64: e.detail.base64,
      mimeType: e.detail.mimeType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mobile log-area content. Delegates ALL session sub-states (picker, connecting,
   * connected, error, expired) to `aos-terminal-session`, which renders an inline
   * model picker when terminalSessionId is null and the xterm session once connected.
   */
  private _renderMobileLogAreaContent(session: TerminalSession | undefined) {
    if (!session) {
      return this._renderEmptyState();
    }
    return html`<aos-terminal-session
      compact
      .session=${session}
      .isActive=${true}
      .terminalSessionId=${session.terminalSessionId ?? null}
      @session-connected=${this._handleSessionConnected}
      @input-needed=${this._handleInputNeeded}
    ></aos-terminal-session>`;
  }

  override render() {
    this.ensureStyles();

    if (this._mobileController.isMobile) {
      return this.renderMobile();
    }

    const effectiveWidth = this.isFullscreen ? window.innerWidth : this.sidebarWidth;

    const sidebarStyles = {
      '--sidebar-width': `${effectiveWidth}px`,
    };

    // Resizer is positioned relative to the sidebar's left edge via calc().
    // Hidden in fullscreen so the full-width view can't be accidentally dragged.
    const resizerStyles = {
      right: this.isOpen && !this.isFullscreen ? `${this.sidebarWidth - 3}px` : '-10px',
      display: this.isFullscreen ? 'none' : '',
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
            ${this._renderLayoutSwitcher()}
            <button
              class="action-btn"
              @click=${this._toggleFullscreen}
              title=${this.isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
            >
              ${this.isFullscreen
                ? html`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="4 14 10 14 10 20"></polyline>
                      <polyline points="20 10 14 10 14 4"></polyline>
                      <line x1="14" y1="10" x2="21" y2="3"></line>
                      <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                  `
                : html`
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <polyline points="9 21 3 21 3 15"></polyline>
                      <line x1="21" y1="3" x2="14" y2="10"></line>
                      <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                  `}
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

  private get _paneCount(): number {
    return this.layoutMode === 'quad-4' ? 4 : this.layoutMode === 'split-2' ? 2 : 1;
  }

  private get _isSplit(): boolean {
    return this.layoutMode !== 'single';
  }

  /** Container CSS vars holding the current splitter ratios (geometry calc()s read these). */
  private _containerVars(): Record<string, string> {
    return {
      '--sr': String(this.splitRowRatio),
      '--c': String(this.quadColRatio),
      '--rl': String(this.quadLeftRowRatio),
      '--rr': String(this.quadRightRowRatio),
    };
  }

  /**
   * Absolute geometry (inline style) for a pane index in split/quad mode, driven by ratio
   * vars (`--sr`/`--c`/`--rl`/`--rr`). G=3px gap → 1.5px inset around each splitter line.
   * Pane index map: 0=TL, 1=TR, 2=BL, 3=BR.
   */
  private _paneGeom(idx: number): Record<string, string> {
    if (this.layoutMode === 'quad-4') {
      const isRight = idx === 1 || idx === 3;
      const isBottom = idx === 2 || idx === 3;
      const rv = isRight ? '--rr' : '--rl';
      return {
        left: isRight ? 'calc(var(--c) * 100% + 1.5px)' : '0',
        width: isRight ? 'calc((1 - var(--c)) * 100% - 1.5px)' : 'calc(var(--c) * 100% - 1.5px)',
        top: isBottom ? `calc(var(${rv}) * 100% + 1.5px)` : '0',
        height: isBottom ? `calc((1 - var(${rv})) * 100% - 1.5px)` : `calc(var(${rv}) * 100% - 1.5px)`,
      };
    }
    // split-2: full width, stacked rows
    const isBottom = idx === 1;
    return {
      left: '0',
      width: '100%',
      top: isBottom ? 'calc(var(--sr) * 100% + 1.5px)' : '0',
      height: isBottom ? 'calc((1 - var(--sr)) * 100% - 1.5px)' : 'calc(var(--sr) * 100% - 1.5px)',
    };
  }

  /** Header sits at the top of its pane: same left/top/width, fixed 30px height. */
  private _headerGeom(idx: number): Record<string, string> {
    const g = this._paneGeom(idx);
    return { left: g.left, top: g.top, width: g.width, height: '30px' };
  }

  /** Pane index a session currently occupies in the active layout, or -1. */
  private _paneIndexForSession(id: string): number {
    return this.paneSessionIds.slice(0, this._paneCount).indexOf(id);
  }

  /**
   * Sessions that must keep a live xterm element mounted. Single-mode keeps every
   * current-project session mounted (tab switching without buffer refetch). Split/quad
   * additionally keep every pane-assigned session (cross-project). One flat keyed repeat
   * over this union means toggling layout never re-parents a surviving terminal.
   */
  private _mountedSessions(): TerminalSession[] {
    const map = new Map<string, TerminalSession>();
    for (const s of this.sessions) map.set(s.id, s);
    if (this._isSplit) {
      for (const id of this.paneSessionIds) {
        if (!id) continue;
        const s = this.allSessions.find(x => x.id === id);
        if (s) map.set(s.id, s);
      }
    }
    return Array.from(map.values());
  }

  private _projectLabel(path: string): string {
    return this.projectNames[path] ?? (path.split('/').filter(Boolean).pop() ?? path);
  }

  private _renderTerminalContent() {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    const isPaused = !this._isSplit && activeSession?.status === 'paused';

    return html`
      ${this.errorMessage ? this._renderErrorBanner() : ''}
      ${this._isSplit
        ? nothing
        : html`<aos-terminal-tabs
            .sessions=${this.sessions}
            .activeSessionId=${this.activeSessionId}
            .availableProviders=${this.availableProviders}
            .activeTerminalSessionId=${this.sessions.find(s => s.id === this.activeSessionId)?.terminalSessionId ?? ''}
            .activeSessionReviewEnabled=${this._getActiveReviewConfig().enabled}
            .activeSessionReviewReviewers=${this._getActiveReviewConfig().reviewers}
            @session-select=${this._handleSessionSelect}
            @session-close=${this._handleSessionClose}
            @session-rename=${this._handleSessionRename}
            @auto-review-config-changed=${this._handleAutoReviewConfigChanged}
            @auto-review-trigger-manual=${this._handleAutoReviewTriggerManual}
          ></aos-terminal-tabs>`}
      <div
        class="terminal-sessions-container ${this.layoutMode}"
        style=${styleMap(this._isSplit ? this._containerVars() : {})}
      >
        ${this.loadingState.isLoading ? this._renderLoadingOverlay() : ''}
        ${isPaused ? this._renderPausedIndicator(activeSession!) : ''}
        ${this._isSplit ? this._renderPaneHeaders() : nothing}
        ${this._isSplit ? this._renderSplitters() : nothing}
        ${repeat(
          this._mountedSessions(),
          (session) => session.id,
          (session) => {
            const paneIdx = this._isSplit ? this._paneIndexForSession(session.id) : -1;
            const visible = this._isSplit
              ? paneIdx >= 0
              : session.id === this.activeSessionId;
            const styles: Record<string, string> = visible
              ? (this._isSplit ? { display: 'flex', ...this._paneGeom(paneIdx) } : { display: 'flex' })
              : { display: 'none' };
            const focused = this._isSplit && paneIdx === this.focusedPaneIndex;
            return html`
              <aos-terminal-session
                .session=${session}
                .isActive=${visible}
                .terminalSessionId=${session.terminalSessionId || null}
                data-session-id="${session.id}"
                class="session-panel ${focused ? 'focused' : ''}"
                style=${styleMap(styles)}
                @focusin=${() => this._handlePaneFocus(paneIdx, session.id)}
                @session-connected=${this._handleSessionConnected}
                @input-needed=${this._handleInputNeeded}
              ></aos-terminal-session>
            `;
          }
        )}
      </div>
    `;
  }

  /** Deterministic hue (0-359) per project path — same project, same badge colour everywhere. */
  private _projectHue(path: string): number {
    let h = 0;
    for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) % 360;
    return h;
  }

  private _renderPaneHeaders() {
    const panes = Array.from({ length: this._paneCount }, (_, i) => i);
    return html`
      <div class="pane-headers ${this.layoutMode}">
        ${repeat(
          panes,
          (i) => i,
          (i) => {
            const sessionId = this.paneSessionIds[i];
            const session = sessionId ? this.allSessions.find((s) => s.id === sessionId) : undefined;
            const label = session ? this._projectLabel(session.projectPath) : '';
            const badgeStyle = session
              ? {
                  background: `hsl(${this._projectHue(session.projectPath)} 55% 22%)`,
                  color: `hsl(${this._projectHue(session.projectPath)} 70% 80%)`,
                }
              : {};
            return html`<div
              class="pane-header ${i === this.focusedPaneIndex ? 'focused' : ''}"
              style=${styleMap(this._headerGeom(i))}
            >
              <span
                class="pane-project ${session ? '' : 'empty'}"
                style=${styleMap(badgeStyle)}
                title=${label || 'Kein Projekt'}
              >${label || 'Kein Projekt'}</span>
              ${this._renderPaneDropdown(i)}
              ${session?.terminalSessionId
                ? html`<aos-auto-review-toggle
                    class="pane-review-toggle"
                    .sessionId=${session.terminalSessionId}
                    .enabled=${this._getReviewConfigFor(session.terminalSessionId).enabled}
                    .reviewers=${this._getReviewConfigFor(session.terminalSessionId).reviewers}
                    .availableProviders=${this.availableProviders}
                    @auto-review-config-changed=${this._handleAutoReviewConfigChanged}
                    @auto-review-trigger-manual=${this._handleAutoReviewTriggerManual}
                  ></aos-auto-review-toggle>`
                : nothing}
            </div>`;
          }
        )}
      </div>
    `;
  }

  /** Drag handles between panes: one per divider, driven by ratio CSS vars. */
  private _renderSplitters() {
    if (this.layoutMode === 'split-2') {
      return html`<div
        class="pane-splitter horizontal"
        style=${styleMap({ left: '0', width: '100%', top: 'calc(var(--sr) * 100% - 3px)' })}
        @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'row')}
      ></div>`;
    }
    if (this.layoutMode === 'quad-4') {
      return html`
        <div
          class="pane-splitter vertical"
          style=${styleMap({ top: '0', bottom: '0', left: 'calc(var(--c) * 100% - 3px)' })}
          @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'col')}
        ></div>
        <div
          class="pane-splitter horizontal"
          style=${styleMap({ left: '0', width: 'calc(var(--c) * 100% - 1.5px)', top: 'calc(var(--rl) * 100% - 3px)' })}
          @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'rowL')}
        ></div>
        <div
          class="pane-splitter horizontal"
          style=${styleMap({ left: 'calc(var(--c) * 100% + 1.5px)', width: 'calc((1 - var(--c)) * 100% - 1.5px)', top: 'calc(var(--rr) * 100% - 3px)' })}
          @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'rowR')}
        ></div>
      `;
    }
    return nothing;
  }

  private _dragRatio: number | null = null;

  /** Live-update the relevant ratio CSS var during drag (no Lit re-render); commit to state on release. */
  private _startSplitterDrag(e: PointerEvent, kind: 'col' | 'rowL' | 'rowR' | 'row') {
    e.preventDefault();
    const splitter = e.currentTarget as HTMLElement;
    const container = this.querySelector('.terminal-sessions-container') as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const varName = kind === 'col' ? '--c' : kind === 'rowL' ? '--rl' : kind === 'rowR' ? '--rr' : '--sr';
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('dragging');

    const move = (ev: PointerEvent) => {
      const raw = kind === 'col'
        ? (ev.clientX - rect.left) / rect.width
        : (ev.clientY - rect.top) / rect.height;
      const ratio = Math.min(0.85, Math.max(0.15, raw));
      this._dragRatio = ratio;
      container.style.setProperty(varName, String(ratio));
    };
    const up = (ev: PointerEvent) => {
      splitter.releasePointerCapture(ev.pointerId);
      splitter.classList.remove('dragging');
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      const r = this._dragRatio;
      this._dragRatio = null;
      if (r == null) return;
      if (kind === 'col') this.quadColRatio = r;
      else if (kind === 'rowL') this.quadLeftRowRatio = r;
      else if (kind === 'rowR') this.quadRightRowRatio = r;
      else this.splitRowRatio = r;
      this._persistLayout();
      this._refreshVisibleTerminals();
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  }

  private _renderPaneDropdown(paneIndex: number) {
    const currentId = this.paneSessionIds[paneIndex] ?? '';
    const found = !currentId || this.allSessions.some(s => s.id === currentId);
    const assignedElsewhere = new Set(
      this.paneSessionIds.filter((id, i) => !!id && i !== paneIndex) as string[]
    );

    // Group sessions by project path for <optgroup> labels.
    const groups = new Map<string, TerminalSession[]>();
    for (const s of this.allSessions) {
      const arr = groups.get(s.projectPath) ?? [];
      arr.push(s);
      groups.set(s.projectPath, arr);
    }

    return html`
      <select
        class="pane-select"
        @change=${(e: Event) =>
          this._assignPaneSession(paneIndex, (e.target as HTMLSelectElement).value || null)}
      >
        <option value="" ?selected=${!currentId}>— Session wählen —</option>
        ${currentId && !found
          ? html`<option value=${currentId} selected>(nicht verfügbar)</option>`
          : ''}
        ${repeat(
          [...groups.entries()],
          ([path]) => path,
          ([path, list]) => html`
            <optgroup label=${this._projectLabel(path)}>
              ${list.map(
                (s) => html`<option
                  value=${s.id}
                  ?disabled=${assignedElsewhere.has(s.id)}
                  ?selected=${s.id === currentId}
                >
                  ${s.name}
                </option>`
              )}
            </optgroup>
          `
        )}
      </select>
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

  /**
   * Toggle the desktop sidebar between its resizable width and full window width.
   * Width changes are not CSS-transitioned (only `transform` is animated), so the
   * new size applies immediately — we refit xterm after a layout reflow.
   */
  private _toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    // Quad is fullscreen-only — leaving fullscreen downgrades to 2-split (top row survives).
    if (!this.isFullscreen && this.layoutMode === 'quad-4') {
      this._setLayout('split-2');
    }
    this.updateContentOffset();
    this._refreshVisibleTerminals();
  }

  /** Refit every currently-visible terminal after a layout reflow (double rAF). */
  private _refreshVisibleTerminals() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.querySelectorAll('aos-terminal-session.session-panel').forEach((el) => {
          const node = el as AosTerminalSession & HTMLElement;
          if (node.style.display !== 'none') node.refreshTerminal();
        });
      });
    });
  }

  private _handleFullscreenKeydown(e: KeyboardEvent) {
    // Desktop-only; the mobile overlay is already fullscreen.
    if (!this.isOpen || this._mobileController.isMobile) return;

    // Cmd/Ctrl+Shift+F toggles fullscreen
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      this._toggleFullscreen();
      return;
    }

    // Escape leaves fullscreen (only consume the event when actually fullscreen)
    if (e.key === 'Escape' && this.isFullscreen) {
      e.preventDefault();
      this.isFullscreen = false;
      if (this.layoutMode === 'quad-4') this._setLayout('split-2');
      this.updateContentOffset();
      this._refreshVisibleTerminals();
    }
  }

  // ---- Split-screen layout management ----

  private _renderLayoutSwitcher() {
    const btn = (mode: 'single' | 'split-2' | 'quad-4', title: string, paths: unknown) => html`
      <button
        class="layout-btn ${this.layoutMode === mode ? 'active' : ''}"
        title=${title}
        @click=${() => this._setLayout(mode)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>
      </button>
    `;
    return html`
      <div class="layout-switcher">
        ${btn('single', 'Einzelansicht', svg`<rect x="3" y="4" width="18" height="16" rx="1"></rect>`)}
        ${btn(
          'split-2',
          'Geteilt (oben/unten)',
          svg`<rect x="3" y="4" width="18" height="16" rx="1"></rect><line x1="3" y1="12" x2="21" y2="12"></line>`
        )}
        ${this.isFullscreen
          ? btn(
              'quad-4',
              'Vier Quadranten',
              svg`<rect x="3" y="4" width="18" height="16" rx="1"></rect><line x1="3" y1="12" x2="21" y2="12"></line><line x1="12" y1="4" x2="12" y2="20"></line>`
            )
          : nothing}
      </div>
    `;
  }

  private _setLayout(mode: 'single' | 'split-2' | 'quad-4') {
    // Quad requires fullscreen — entering it from the sidebar forces fullscreen on.
    if (mode === 'quad-4' && !this.isFullscreen) {
      this.isFullscreen = true;
      this.updateContentOffset();
    }
    const count = mode === 'quad-4' ? 4 : mode === 'split-2' ? 2 : 0;
    if (count > 0) {
      // Keep existing assignments (down-size keeps the top rows), pad/truncate to count.
      const next: (string | null)[] = this.paneSessionIds.slice(0, count);
      while (next.length < count) next.push(null);
      this._autoFillPanes(next);
      this.paneSessionIds = next;
      if (this.focusedPaneIndex >= count) this.focusedPaneIndex = 0;
    }
    this.layoutMode = mode;
    this._persistLayout();
    this._refreshVisibleTerminals();
  }

  /** Fill only the null slots — never overwrites a slot the user assigned manually. */
  private _autoFillPanes(arr: (string | null)[]) {
    const used = new Set(arr.filter((id): id is string => !!id));
    const pool: string[] = [];
    if (this.activeSessionId && !used.has(this.activeSessionId)) pool.push(this.activeSessionId);
    for (const s of this.allSessions) {
      if (s.id !== this.activeSessionId && !used.has(s.id)) pool.push(s.id);
    }
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == null) {
        const pick = pool.shift();
        if (pick) {
          arr[i] = pick;
          used.add(pick);
        }
      }
    }
  }

  private _assignPaneSession(paneIndex: number, sessionId: string | null) {
    const next = this.paneSessionIds.slice();
    // Move-semantics: a session lives in at most one pane (avoids duplicate xterm on one
    // backend session, which would fight over cloud-terminal:resize).
    if (sessionId) {
      for (let i = 0; i < next.length; i++) {
        if (i !== paneIndex && next[i] === sessionId) next[i] = null;
      }
    }
    next[paneIndex] = sessionId;
    this.paneSessionIds = next;
    this.focusedPaneIndex = paneIndex;
    this._persistLayout();
    this._refreshVisibleTerminals();
    if (sessionId) this._emitSessionSelect(sessionId);
  }

  private _handlePaneFocus(paneIndex: number, sessionId: string) {
    if (paneIndex < 0) return;
    this.focusedPaneIndex = paneIndex;
    this._emitSessionSelect(sessionId);
  }

  /** Keep app.ts' activeTerminalSessionId in sync with the focused pane (toolbar/shortcuts). */
  private _emitSessionSelect(sessionId: string) {
    if (this.activeSessionId === sessionId) return;
    this.activeSessionId = sessionId;
    this.dispatchEvent(
      new CustomEvent('session-select', {
        detail: { sessionId, clearNeedsInput: true },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _persistLayout() {
    try {
      localStorage.setItem('cloud-terminal-layout-mode', this.layoutMode);
      localStorage.setItem('cloud-terminal-pane-sessions', JSON.stringify(this.paneSessionIds));
      localStorage.setItem('cloud-terminal-split-ratios', JSON.stringify({
        sr: this.splitRowRatio,
        c: this.quadColRatio,
        rl: this.quadLeftRowRatio,
        rr: this.quadRightRowRatio,
      }));
    } catch {
      // localStorage unavailable
    }
  }

  private _restoreLayout() {
    try {
      const mode = localStorage.getItem('cloud-terminal-layout-mode');
      if (mode === 'single' || mode === 'split-2' || mode === 'quad-4') {
        this.layoutMode = mode;
      }
      const raw = localStorage.getItem('cloud-terminal-pane-sessions');
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.paneSessionIds = parsed.map((x) => (typeof x === 'string' ? x : null));
        }
      }
      // Normalize array length to the restored mode.
      const count = this.layoutMode === 'quad-4' ? 4 : this.layoutMode === 'split-2' ? 2 : 0;
      if (count > 0) {
        const norm = this.paneSessionIds.slice(0, count);
        while (norm.length < count) norm.push(null);
        this.paneSessionIds = norm;
      } else {
        this.paneSessionIds = [];
      }
      // Quad is only usable in fullscreen.
      if (this.layoutMode === 'quad-4') this.isFullscreen = true;

      // Restore splitter ratios (clamp 0.15–0.85, default 0.5).
      const ratiosRaw = localStorage.getItem('cloud-terminal-split-ratios');
      if (ratiosRaw) {
        const r: unknown = JSON.parse(ratiosRaw);
        if (r && typeof r === 'object') {
          const clamp = (v: unknown) =>
            typeof v === 'number' && isFinite(v) ? Math.min(0.85, Math.max(0.15, v)) : 0.5;
          const obj = r as Record<string, unknown>;
          this.splitRowRatio = clamp(obj.sr);
          this.quadColRatio = clamp(obj.c);
          this.quadLeftRowRatio = clamp(obj.rl);
          this.quadRightRowRatio = clamp(obj.rr);
        }
      }
    } catch {
      this.layoutMode = 'single';
      this.paneSessionIds = [];
    }
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

  private _handleSessionRename(e: CustomEvent<{ sessionId: string; name: string }>) {
    this.dispatchEvent(
      new CustomEvent('session-rename', {
        detail: e.detail,
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

    // Create session title: "workflowName: argument" or just "workflowName"
    const tabTitle = workflowContext ? `${workflowName}: ${workflowContext}` : workflowName;

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
      customNameSet: false,
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

  private _getActiveReviewConfig(): { enabled: boolean; reviewers: ReviewerConfig[] } {
    const activeSession = this.sessions.find(s => s.id === this.activeSessionId);
    const termId = activeSession?.terminalSessionId;
    return termId ? this._getReviewConfigFor(termId) : { enabled: false, reviewers: [] };
  }

  /** Review config for any backend terminalSessionId (used by per-pane toggles in split mode). */
  private _getReviewConfigFor(termId: string): { enabled: boolean; reviewers: ReviewerConfig[] } {
    return this.sessionReviewConfigs[termId] ?? { enabled: false, reviewers: [] };
  }

  private _handleProvidersListResponse(msg: WebSocketMessage): void {
    const providers = msg.providers as AvailableProvider[] | undefined;
    if (providers) {
      this.availableProviders = providers;
    }
  }

  private _handleConfigSnapshot(msg: WebSocketMessage): void {
    const sessionId = msg.sessionId as string | undefined;
    if (!sessionId) return;
    const enabled = (msg.enabled as boolean) ?? false;
    const incomingReviewers = (msg.reviewers as ReviewerConfig[]) ?? [];
    const migrated = this._migrateLegacyReviewers(incomingReviewers);

    const didMigrate = migrated.length !== incomingReviewers.length
      || migrated.some((r, i) => r.modelId !== incomingReviewers[i]?.modelId
        || r.providerId !== incomingReviewers[i]?.providerId);

    this.sessionReviewConfigs = {
      ...this.sessionReviewConfigs,
      [sessionId]: { enabled, reviewers: migrated },
    };

    if (didMigrate) {
      const session = this.allSessions.find(s => s.terminalSessionId === sessionId);
      if (session) {
        const el = this.querySelector(`[data-session-id="${session.id}"]`) as AosTerminalSession | null;
        el?.sendPlanReviewConfigUpdate(enabled, migrated);
      }
    }
  }

  private _migrateLegacyReviewers(reviewers: ReviewerConfig[]): ReviewerConfig[] {
    const result: ReviewerConfig[] = [];
    const seen = new Set<string>();

    for (const r of reviewers) {
      if (r.modelId !== undefined) {
        const key = `${r.providerId}:${r.modelId}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(r);
        }
        continue;
      }

      const provider = this.availableProviders.find(p => p.id === r.providerId);
      if (provider && provider.models && provider.models.length > 0) {
        const firstModel = provider.models[0];
        const key = `${r.providerId}:${firstModel.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ providerId: r.providerId, modelId: firstModel.id });
        }
      } else {
        const key = `${r.providerId}:undefined`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(r);
        }
      }
    }
    return result;
  }

  private _handleGatewayConnectedForProviders(): void {
    gateway.send({ type: 'model.providers.list' });
  }

  private _handleAutoReviewConfigChanged(e: CustomEvent<{ sessionId: string; enabled: boolean; reviewers: ReviewerConfig[] }>): void {
    const { sessionId: terminalSessionId, enabled, reviewers } = e.detail;
    const session = this.allSessions.find(s => s.terminalSessionId === terminalSessionId);
    if (!session) return;
    const el = this.querySelector(`[data-session-id="${session.id}"]`) as AosTerminalSession | null;
    el?.sendPlanReviewConfigUpdate(enabled, reviewers);
    // Update local config so toggle state stays in sync without waiting for snapshot
    this.sessionReviewConfigs = {
      ...this.sessionReviewConfigs,
      [terminalSessionId]: { enabled, reviewers },
    };
  }

  private _handleAutoReviewTriggerManual(e: CustomEvent<{ sessionId: string }>): void {
    const { sessionId: terminalSessionId } = e.detail;
    const session = this.allSessions.find(s => s.terminalSessionId === terminalSessionId);
    if (!session) return;
    const el = this.querySelector(`[data-session-id="${session.id}"]`) as AosTerminalSession | null;
    el?.sendPlanReviewTriggerManual();
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

  /**
   * Set a CSS custom property on the document root so that the main content
   * area can shift left when the cloud terminal sidebar is open. Mirrors the
   * pattern used by aos-file-tree-sidebar.
   */
  private updateContentOffset(): void {
    const openWidth = this.isFullscreen ? window.innerWidth : this.sidebarWidth;
    const width = (this.isOpen && !this._mobileController.isMobile) ? openWidth : 0;
    document.documentElement.style.setProperty('--terminal-open-width', `${width}px`);
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
      this.updateContentOffset();
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

  /** Prevent double-firing of refresh from transitionend + fallback */
  private _refreshScheduled = false;

  override updated(changed: PropertyValues): void {
    if (changed.has('isOpen')) {
      // No fullscreen persistence for the manual toggle — a fresh open starts in normal mode,
      // EXCEPT a restored quad layout, which is only usable in fullscreen.
      if (!this.isOpen && this.isFullscreen && this.layoutMode !== 'quad-4') {
        this.isFullscreen = false;
      }
      if (this.isOpen && this.layoutMode === 'quad-4') {
        this.isFullscreen = true;
      }
      this.updateContentOffset();
      if (this._mobileController.isMobile) {
        document.body.style.overflow = this.isOpen ? 'hidden' : '';
      }
    }
    // Refresh terminal rendering after sidebar opens (desktop only — mobile uses aos-claude-log-panel)
    if (changed.has('isOpen') && this.isOpen && !this._mobileController.isMobile) {
      this._refreshScheduled = false;
      const sidebar = this.querySelector('.terminal-sidebar') as HTMLElement | null;
      if (sidebar) {
        const doRefresh = () => {
          if (this._refreshScheduled) return;
          this._refreshScheduled = true;
          sidebar.removeEventListener('transitionend', handler);
          this._refreshVisibleTerminals();
        };

        const handler = (e: TransitionEvent) => {
          if (e.propertyName !== 'transform') return;
          doRefresh();
        };
        sidebar.addEventListener('transitionend', handler);

        // Safety fallback in case transitionend doesn't fire (e.g., no transition active)
        setTimeout(() => doRefresh(), 400);
      }
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    // Restore split-screen layout + pane assignments (best-effort).
    this._restoreLayout();

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

    this._mobileController.onChange((isMobile) => {
      if (!isMobile && this.isOpen) {
        this._handleClose();
      }
    });

    gateway.on('model.providers.list', this.boundHandleProvidersListResponse);
    gateway.on('plan-review:config.snapshot', this.boundHandleConfigSnapshot);
    gateway.on('gateway.connected', this.boundHandleGatewayConnected);
    document.addEventListener('keydown', this.boundHandleFullscreenKeydown);
    if (gateway.getConnectionStatus()) {
      gateway.send({ type: 'model.providers.list' });
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.body.style.overflow = '';
    document.documentElement.style.setProperty('--terminal-open-width', '0px');
    gateway.off('model.providers.list', this.boundHandleProvidersListResponse);
    gateway.off('plan-review:config.snapshot', this.boundHandleConfigSnapshot);
    gateway.off('gateway.connected', this.boundHandleGatewayConnected);
    document.removeEventListener('keydown', this.boundHandleFullscreenKeydown);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-cloud-terminal-sidebar': AosCloudTerminalSidebar;
  }
}
