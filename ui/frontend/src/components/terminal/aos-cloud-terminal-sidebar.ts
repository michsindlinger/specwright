import { LitElement, html, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';
import './aos-terminal-tabs.js';
import './aos-terminal-session.js';
import './aos-auto-review-toggle.js';
import type { AosTerminalSession } from './aos-terminal-session.js';
import { gateway, type WebSocketMessage } from '../../gateway.js';
import { hiddenRowPane, clampRowRatio } from './pane-visibility.js';
import { effectiveZoomedPane, nextZoomedPane, paneShowingProject, ZOOM_GEOM } from './pane-zoom.js';
import { syncSelectValue } from './pane-select-sync.js';
import { isPaneZoomShortcut, isEditableTarget } from '../../utils/keyboard-shortcuts.js';
import { resolveJumpTarget, formatRelativeTime, type AgentNotification } from './agent-notifications.js';
import { isBellSoundEnabled, setBellSoundEnabled, playAgentDoneChime } from './notification-sound.js';
import type { AvailableProvider, ReviewerConfig } from './aos-auto-review-toggle.js';
import { MobileBreakpointController } from '../../controllers/mobile-breakpoint-controller.js';
import '../mobile/aos-mobile-terminal-header.js';
import '../mobile/aos-mobile-session-tabs.js';
import '../mobile/aos-mobile-connection-bar.js';
import '../mobile/aos-mobile-quick-replies.js';
import '../mobile/aos-mobile-terminal-keys.js';
import '../mobile/aos-mobile-input-bar-idle.js';
import '../aos-claude-log-panel.js';
import type { CloudTerminalAgentStatus } from '../../../../src/shared/types/cloud-terminal.protocol.js';

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
  /**
   * Directory the backend actually spawned the PTY in (session worktree, an
   * existing worktree, or the project dir). Reported by the server, so it is
   * ground truth rather than what was requested — shown in the tab/pane title
   * so a session running outside the project dir is never invisible.
   */
  effectiveCwd?: string;
  /** Server-reduced agent status (claude-code sessions only; see agent-status.ts). */
  agentStatus?: CloudTerminalAgentStatus;
  /** Epoch ms of the last agent status change (never a Date — formatRelativeTime expects ms). */
  agentStatusAt?: number;
  /** Reason for blocked / error, when the hook delivered one. */
  agentStatusReason?: string;
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
/** Per-column row-ratio state keys that the pane-maximize toggle can drive. */
type RowKey = 'splitRowRatio' | 'quadLeftRowRatio' | 'quadRightRowRatio';

@customElement('aos-cloud-terminal-sidebar')
export class AosCloudTerminalSidebar extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: Array }) sessions: TerminalSession[] = [];
  @property({ type: String }) activeSessionId: string | null = null;
  /** All sessions across every project — source for the cross-project pane picker. */
  @property({ attribute: false }) allSessions: TerminalSession[] = [];
  /** Map projectPath -> display name, for the pane dropdown's <optgroup> labels. */
  @property({ attribute: false }) projectNames: Record<string, string> = {};

  /** "Agent finished" entries for the header bell (owned by app.ts, see agent-notifications.ts). */
  @property({ attribute: false }) agentNotifications: AgentNotification[] = [];

  @state() private _bellOpen = false;
  @state() private _bellSound = isBellSoundEnabled();
  /** Re-renders the relative times while the bell list is open. */
  private _bellTicker: ReturnType<typeof setInterval> | null = null;
  @state() private sidebarWidth = 500;
  @state() private isResizing = false;
  @state() private isFullscreen = false;
  /** Split-screen layout: single pane, 2 rows (top/bottom), or 2x2 quad (fullscreen only). */
  @state() private layoutMode: 'single' | 'split-2' | 'quad-4' = 'single';
  /** Session id per pane slot (length 2 for split-2, 4 for quad-4). null = empty slot. */
  @state() private paneSessionIds: (string | null)[] = [];
  /** Which pane currently owns toolbar/keyboard intent (visual focus ring + session-select sync). */
  @state() private focusedPaneIndex = 0;
  /** Pending "+"-new-session: adopt the freshly created session into this pane once it arrives. */
  private _pendingNewSession: { paneIndex: number; projectPath: string } | null = null;
  /** Transient last-known project per pane (non-persisted) — lets close-fallback pick a sibling. */
  private _paneProjectCache: (string | null)[] = [];
  /**
   * Write-once restore intent (non-persisted): persisted per-pane projects to re-resolve to live
   * sessions after reload. Sessions load incrementally (one cloud-terminal:list per project), so
   * _reconcilePanes keeps retrying until each pane's project surfaces a session. Cleared per pane
   * once resolved or on any manual pane change; whole field nulled when nothing remains pending.
   */
  private _paneRestoreProjects: (string | null)[] | null = null;
  /** Resizable-splitter ratios (clamped 0.15–0.85). split-2: one row split; quad: column + per-column rows. */
  @state() private splitRowRatio = 0.5;
  @state() private quadColRatio = 0.5;
  @state() private quadLeftRowRatio = 0.5;
  @state() private quadRightRowRatio = 0.5;
  /**
   * Which pane is currently maximized per row-axis. TRANSIENT maximize flag ONLY — it never
   * carries ratio state. `_togglePaneMaximize` must NOT mutate the row ratios (Option-2
   * decoupling): the soloed-axis geometry is derived from this flag via `hiddenRowPane`, so
   * the persisted ratio stays a real drag value and can never strand a pane after reload.
   * Discrete (not inferred from the ratio) so a manual drag near the extreme isn't mistaken
   * for "maximized". Not persisted — a fresh load/layout-switch starts un-maximized.
   */
  @state() private _maxAxis: Partial<Record<RowKey, { pane: number }>> = {};
  /**
   * Pane index zoomed to the WHOLE terminal area (both axes), or null. Transient like
   * `_maxAxis` and independent of it: zooming does not touch `_maxAxis` or any ratio, so
   * un-zooming restores exactly the previous arrangement. Resolved through
   * `_effectiveZoom` (pane-zoom.ts) so an emptied slot silently un-zooms. Not persisted.
   */
  @state() private _zoomedPane: number | null = null;
  /**
   * Live pixel height of the split-panes container. Drives the "too small to render → hide"
   * decision (see PANE_MIN_PX). Measured via a ResizeObserver so it tracks window/fullscreen
   * changes; 0 until first measured (→ nothing is hidden while unmeasured).
   */
  @state() private _containerHeightPx = 0;
  private _containerResizeObserver: ResizeObserver | null = null;
  private _observedContainer: HTMLElement | null = null;
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

      /* ── Agent-finished bell ─────────────────────────────────────── */
      .bell-wrap {
        position: relative;
        display: flex;
      }

      .bell-btn {
        position: relative;
        opacity: 0.55;
      }

      .bell-btn.has-items,
      .bell-btn:hover,
      .bell-btn.open {
        opacity: 1;
      }

      .bell-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        background: var(--color-accent-error, #ef4444);
        border-radius: 7px;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .bell-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        width: 340px;
        max-width: calc(100vw - 24px);
        max-height: 60vh;
        overflow-y: auto;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
        z-index: 200;
        padding: 4px 0;
        color: #e0e0e0;
        text-align: left;
      }

      .bell-dropdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px 4px 12px;
        font-size: 10px;
        font-weight: 700;
        color: #c0c0c0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #444;
        margin-bottom: 4px;
      }

      .bell-sound-btn {
        background: transparent;
        border: none;
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
        color: #a0a0a0;
        display: flex;
        align-items: center;
        transition: color 0.1s, background 0.1s;
      }

      .bell-sound-btn:hover {
        background: #3a3a3a;
        color: #e0e0e0;
      }

      .bell-sound-btn.muted {
        color: #6a6a6a;
      }

      .bell-sound-btn svg {
        width: 14px;
        height: 14px;
      }

      .bell-empty {
        padding: 10px 12px;
        font-size: 12px;
        color: #a0a0a0;
      }

      .bell-row {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 6px 12px;
        cursor: pointer;
        border-bottom: 1px solid #383838;
        transition: background 0.1s;
      }

      .bell-row:last-child {
        border-bottom: none;
      }

      .bell-row:hover {
        background: #3a3a3a;
      }

      .bell-row-top {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .bell-project {
        flex: 0 1 auto;
        max-width: 120px;
        padding: 1px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bell-name {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 12px;
        font-weight: 600;
        color: #e0e0e0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bell-time {
        flex: 0 0 auto;
        font-size: 10px;
        color: #a0a0a0;
        white-space: nowrap;
      }

      .bell-preview {
        font-size: 11px;
        color: #b0b0b0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        padding-top: 62px; /* room for the pane header overlay (project row + tab bar) */
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
        height: 62px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background: var(--bg-color-tertiary, #252526);
        border-bottom: 1px solid var(--border-color, #404040);
        pointer-events: auto;
      }

      .pane-header.focused {
        border-bottom-color: var(--accent-color, #007acc);
      }

      .pane-header-row {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        flex: 0 0 auto;
        padding: 0 8px;
        box-sizing: border-box;
      }

      .pane-header-tabs {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }

      .pane-new-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        /* Reset the global button padding from theme.css: with box-sizing
           border-box + fixed 22px width it would collapse the icon's content
           box to 0 width, hiding the inline SVG. */
        padding: 0;
        background: var(--bg-color-secondary, #1e1e1e);
        color: var(--text-color-primary, #e0e0e0);
        border: 1px solid var(--border-color, #404040);
        border-radius: 4px;
        cursor: pointer;
      }

      .pane-maximize-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        background: var(--bg-color-secondary, #1e1e1e);
        color: var(--text-color-muted, #909090);
        border: 1px solid var(--border-color, #404040);
        border-radius: 4px;
        cursor: pointer;
      }

      .pane-maximize-btn:hover {
        border-color: var(--accent-color, #007acc);
        color: var(--text-color-primary, #e0e0e0);
      }

      .pane-maximize-btn.active {
        border-color: var(--accent-color, #007acc);
        color: var(--accent-color, #007acc);
      }

      .pane-maximize-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .pane-maximize-btn:disabled:hover {
        border-color: var(--border-color, #404040);
        color: var(--text-color-muted, #909090);
      }

      .pane-zoom-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        background: var(--bg-color-secondary, #1e1e1e);
        color: var(--text-color-muted, #909090);
        border: 1px solid var(--border-color, #404040);
        border-radius: 4px;
        cursor: pointer;
      }

      .pane-zoom-btn:hover:not(:disabled) {
        border-color: var(--accent-color, #007acc);
        color: var(--text-color-primary, #e0e0e0);
      }

      .pane-zoom-btn.active {
        border-color: var(--accent-color, #007acc);
        color: var(--accent-color, #007acc);
      }

      .pane-zoom-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .pane-new-btn:hover:not(:disabled) {
        border-color: var(--accent-color, #007acc);
      }

      .pane-new-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .pane-tabs-hint {
        display: flex;
        align-items: center;
        height: 100%;
        padding: 0 10px;
        font-size: 11px;
        font-style: italic;
        color: var(--text-color-muted, #606060);
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
            ${this._renderBell()}
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

  /** The pane currently zoomed to the full terminal area, or null (see `_zoomedPane`). */
  private get _effectiveZoom(): number | null {
    if (!this._isSplit) return null;
    return effectiveZoomedPane(this._zoomedPane, this._paneCount, this.paneSessionIds);
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
    // Zoomed pane owns the whole container regardless of any ratio / maximize state.
    if (this._effectiveZoom === idx) return { ...ZOOM_GEOM };
    // When the row-axis sibling is collapsed (maximize / too-small), this pane owns the full
    // column height — top:0, height:100% — instead of its ratio slice.
    const fullAxis = this._isPaneFullAxis(idx);
    if (this.layoutMode === 'quad-4') {
      const isRight = idx === 1 || idx === 3;
      const isBottom = idx === 2 || idx === 3;
      const rv = isRight ? '--rr' : '--rl';
      const left = isRight ? 'calc(var(--c) * 100% + 1.5px)' : '0';
      const width = isRight ? 'calc((1 - var(--c)) * 100% - 1.5px)' : 'calc(var(--c) * 100% - 1.5px)';
      if (fullAxis) {
        return { left, width, top: '0', height: '100%' };
      }
      return {
        left,
        width,
        top: isBottom ? `calc(var(${rv}) * 100% + 1.5px)` : '0',
        height: isBottom ? `calc((1 - var(${rv})) * 100% - 1.5px)` : `calc(var(${rv}) * 100% - 1.5px)`,
      };
    }
    // split-2: full width, stacked rows
    if (fullAxis) {
      return { left: '0', width: '100%', top: '0', height: '100%' };
    }
    const isBottom = idx === 1;
    return {
      left: '0',
      width: '100%',
      top: isBottom ? 'calc(var(--sr) * 100% + 1.5px)' : '0',
      height: isBottom ? 'calc((1 - var(--sr)) * 100% - 1.5px)' : 'calc(var(--sr) * 100% - 1.5px)',
    };
  }

  /** Header sits at the top of its pane: same left/top/width, fixed height (project row + tabs). */
  private _headerGeom(idx: number): Record<string, string> {
    const g = this._paneGeom(idx);
    return { left: g.left, top: g.top, width: g.width, height: '62px' };
  }

  /** Which row-ratio governs pane `idx`, and whether it's the top pane of its column. */
  private _paneRowAxis(idx: number): { key: RowKey; isTop: boolean } {
    if (this.layoutMode === 'quad-4') {
      const isRight = idx === 1 || idx === 3;
      const isBottom = idx === 2 || idx === 3;
      return { key: isRight ? 'quadRightRowRatio' : 'quadLeftRowRatio', isTop: !isBottom };
    }
    // split-2: idx 0 = top, idx 1 = bottom, both on the single row split.
    return { key: 'splitRowRatio', isTop: idx === 0 };
  }

  private _getRowRatio(key: RowKey): number {
    switch (key) {
      case 'splitRowRatio': return this.splitRowRatio;
      case 'quadLeftRowRatio': return this.quadLeftRowRatio;
      case 'quadRightRowRatio': return this.quadRightRowRatio;
    }
  }

  private _setRowRatio(key: RowKey, v: number): void {
    switch (key) {
      case 'splitRowRatio': this.splitRowRatio = v; break;
      case 'quadLeftRowRatio': this.quadLeftRowRatio = v; break;
      case 'quadRightRowRatio': this.quadRightRowRatio = v; break;
    }
  }

  /**
   * Invariant-keeper for the persisted row ratios: once the container height is measured, pull
   * every active row ratio back into the usable band ({@link clampRowRatio}). Two reasons this
   * exists as a runtime pass rather than a one-shot migration:
   *  - Self-heals LEGACY persisted maximize-extremes (0.85/0.15 written by the pre-Option-2
   *    maximize button) — the exact state that stranded a quad column to a single pane.
   *  - Handles window-shrink: a ratio that was safe at the old height gets nudged in so both
   *    panes stay ≥ MIN, instead of `hiddenRowPane` collapsing one away.
   * Idempotent: writes only when a ratio actually changes, so it can't feed an update loop. Sole
   * owner that corrects row ratios from the update cycle. Runs after the height measurement in the
   * SAME `updated()` tick, so the first measured render already carries safe ratios (no 2-pane
   * flash between measure and heal). `_restoreLayout`'s static 0.15/0.85 clamp is only a coarse
   * first pass (no container height at connect time); this refines it height-aware.
   */
  private _healRowRatios(): void {
    if (!this._isSplit || !(this._containerHeightPx > 0)) return;
    const keys: RowKey[] = this.layoutMode === 'quad-4'
      ? ['quadLeftRowRatio', 'quadRightRowRatio']
      : ['splitRowRatio'];
    let changed = false;
    for (const key of keys) {
      const cur = this._getRowRatio(key);
      const safe = clampRowRatio(cur, this._containerHeightPx);
      if (safe !== cur) {
        this._setRowRatio(key, safe);
        changed = true;
      }
    }
    if (changed) {
      this._persistLayout();
      this._refreshVisibleTerminals();
    }
  }

  /** True when pane `idx` is the one currently maximized on its row-axis (discrete, not ratio-based). */
  private _isPaneMaximized(idx: number): boolean {
    return this._maxAxis[this._paneRowAxis(idx).key]?.pane === idx;
  }

  /**
   * Toggle vertical maximize for pane `idx` within its column. Pure flag flip — the soloed-axis
   * geometry is derived from `_maxAxis` via `hiddenRowPane`/`_isPaneFullAxis`, so we deliberately
   * do NOT touch the row ratio (Option-2 decoupling). Restoring just clears the flag; both panes
   * reappear at whatever real (drag/default) ratio is current. The flag is transient, so nothing
   * to persist here.
   */
  private _togglePaneMaximize(idx: number): void {
    const { key } = this._paneRowAxis(idx);
    const next = { ...this._maxAxis };
    if (next[key]?.pane === idx) delete next[key];
    else next[key] = { pane: idx };
    this._maxAxis = next;
    this._refreshVisibleTerminals();
  }

  /**
   * Zoom pane `idx` to the full terminal area, or un-zoom if it is already zoomed (header
   * button). Pane headers are siblings of the session panels, so a header click never fires the
   * panel's focusin — focus is set explicitly here, then handed to the pane's xterm once Lit has
   * committed the new geometry.
   */
  private _zoomPane(idx: number): void {
    if (!this.paneSessionIds[idx]) return; // empty pane — nothing to zoom (button is disabled anyway)
    this._zoomedPane = this._effectiveZoom === idx ? null : idx;
    this._afterZoomChange(idx);
  }

  /** Keyboard toggle (Cmd/Ctrl+Shift+Enter): zoom the focused pane, or un-zoom. No-op in single layout / empty pane. */
  private _toggleZoom(): void {
    const next = nextZoomedPane(this._zoomedPane, this.focusedPaneIndex, this._paneCount, this.paneSessionIds);
    if (next === this._zoomedPane) return;
    this._zoomedPane = next;
    this._afterZoomChange(next ?? this.focusedPaneIndex);
  }

  /**
   * Shared tail of a zoom change: focus bookkeeping, refit and xterm focus. Like
   * `_togglePaneMaximize`, the refit is requested before Lit's flush — each terminal's own
   * double-rAF scheduler lands after it (see `_refreshVisibleTerminals`).
   */
  private _afterZoomChange(focusIdx: number): void {
    const sessionId = this.paneSessionIds[focusIdx] ?? null;
    if (sessionId) {
      this.focusedPaneIndex = focusIdx;
      this._emitSessionSelect(sessionId);
    }
    this._refreshVisibleTerminals();
    if (sessionId) this._focusSessionTerminal(sessionId);
  }

  /** Puts keyboard focus into a session's xterm once the pending render has landed. */
  private _focusSessionTerminal(sessionId: string): void {
    void this.updateComplete.then(() => {
      const panel = this.querySelector(
        `aos-terminal-session.session-panel[data-session-id="${sessionId}"]`
      ) as AosTerminalSession | null;
      panel?.focusTerminal();
    });
  }

  // ── Agent-finished bell ──────────────────────────────────────────────────

  /** Entries whose session still exists (app.ts prunes too; this is belt-and-braces). */
  private _visibleNotifications(): AgentNotification[] {
    return this.agentNotifications.filter((n) => this.allSessions.some((s) => s.id === n.sessionId));
  }

  private _renderBell() {
    const items = this._visibleNotifications();
    const count = items.length;
    const title = count === 0
      ? 'Keine fertigen Agenten'
      : `${count} Agent${count === 1 ? '' : 'en'} fertig`;
    return html`
      <div class="bell-wrap">
        <button
          class="action-btn bell-btn ${count > 0 ? 'has-items' : ''} ${this._bellOpen ? 'open' : ''}"
          @click=${this._toggleBell}
          title=${title}
          aria-label=${title}
          aria-haspopup="true"
          aria-expanded=${this._bellOpen ? 'true' : 'false'}
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 2a1 1 0 0 1 1 1v.26A6 6 0 0 1 16 9v3l1.707 1.707A1 1 0 0 1 17 15.5H3a1 1 0 0 1-.707-1.793L4 12V9a6 6 0 0 1 5-5.74V3a1 1 0 0 1 1-1zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="currentColor"></path>
          </svg>
          ${count > 0
            ? html`<span class="bell-badge" aria-hidden="true">${count > 9 ? '9+' : count}</span>`
            : nothing}
        </button>
        ${this._bellOpen
          ? html`
              <div class="bell-dropdown" role="menu">
                <div class="bell-dropdown-header">
                  <span>Fertige Agenten</span>
                  ${this._renderSoundToggle()}
                </div>
                ${count === 0
                  ? html`<div class="bell-empty">Keine fertigen Agenten</div>`
                  : repeat(items, (n) => n.sessionId, (n) => this._renderBellRow(n))}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderBellRow(n: AgentNotification) {
    const session = this.allSessions.find((s) => s.id === n.sessionId);
    if (!session) return nothing;
    const hue = this._projectHue(session.projectPath);
    const badgeStyle = { background: `hsl(${hue} 55% 22%)`, color: `hsl(${hue} 70% 80%)` };
    return html`
      <div class="bell-row" role="menuitem" @click=${() => this._jumpToNotification(n)}>
        <div class="bell-row-top">
          <span class="bell-project" style=${styleMap(badgeStyle)} title=${session.projectPath}>
            ${this._projectLabel(session.projectPath)}
          </span>
          <span class="bell-name" title=${session.name}>${session.name}</span>
          <span class="bell-time">${formatRelativeTime(n.finishedAt)}</span>
        </div>
        ${n.preview ? html`<div class="bell-preview" title=${n.preview}>${n.preview}</div>` : nothing}
      </div>
    `;
  }

  /** Speaker toggle in the dropdown header; unmuting previews the chime. */
  private _renderSoundToggle() {
    const on = this._bellSound;
    return html`
      <button
        class="bell-sound-btn ${on ? '' : 'muted'}"
        @click=${this._toggleBellSound}
        title=${on ? 'Ton aus' : 'Ton an'}
        aria-label=${on ? 'Ton ausschalten' : 'Ton einschalten'}
        aria-pressed=${on ? 'true' : 'false'}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M4 7.5h3L11 4v12L7 12.5H4z" fill="currentColor" stroke-linejoin="round"></path>
          ${on
            ? svg`<path d="M13.5 7a4 4 0 0 1 0 6M15.8 5a7 7 0 0 1 0 10" stroke-linecap="round"></path>`
            : svg`<path d="M14 8l4 4M18 8l-4 4" stroke-linecap="round"></path>`}
        </svg>
      </button>
    `;
  }

  private _toggleBellSound = (e: Event): void => {
    e.stopPropagation();
    this._bellSound = !this._bellSound;
    setBellSoundEnabled(this._bellSound);
    // Preview on unmute so the user hears what they just enabled.
    if (this._bellSound) playAgentDoneChime(true);
  };

  private _toggleBell = (e: Event): void => {
    e.stopPropagation();
    if (this._bellOpen) this._closeBell();
    else this._openBell();
  };

  private _openBell(): void {
    this._bellOpen = true;
    document.addEventListener('click', this.boundBellOutsideClick);
    document.addEventListener('keydown', this.boundBellKeydown);
    this._bellTicker = setInterval(() => this.requestUpdate(), 30_000);
  }

  private _closeBell(): void {
    if (!this._bellOpen) return;
    this._bellOpen = false;
    document.removeEventListener('click', this.boundBellOutsideClick);
    document.removeEventListener('keydown', this.boundBellKeydown);
    if (this._bellTicker) {
      clearInterval(this._bellTicker);
      this._bellTicker = null;
    }
  }

  private boundBellOutsideClick = (e: MouseEvent): void => {
    const wrap = this.querySelector('.bell-wrap');
    if (wrap && e.composedPath().includes(wrap)) return;
    this._closeBell();
  };

  private boundBellKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this._closeBell();
  };

  /**
   * Bell entry clicked: bring that session into view. Every branch ends in a
   * `session-select` reaching app.ts, whose willUpdate() drops the entry.
   */
  private _jumpToNotification(n: AgentNotification): void {
    this._closeBell();
    const session = this.allSessions.find((s) => s.id === n.sessionId);
    if (!session) return;
    // Jumping onto the already-active session emits nothing below (early return), and app.ts
    // only drops an entry when activeTerminalSessionId actually changes — force the event so
    // the row cannot survive the click.
    if (this.activeSessionId === session.id) this._emitSessionSelect(session.id, true);
    const target = resolveJumpTarget({
      isSplit: this._isSplit,
      paneSessionIds: this.paneSessionIds,
      paneCount: this._paneCount,
      paneProjects: Array.from({ length: this._paneCount }, (_, i) => this._projectOf(i)),
      zoomedPane: this._effectiveZoom,
      focusedPane: this.focusedPaneIndex,
      sessionId: session.id,
      sessionProject: session.projectPath,
    });
    switch (target.kind) {
      case 'select-tab':
        if (this.sessions.some((s) => s.id === session.id)) {
          this._emitSessionSelect(session.id);
        } else {
          // Other project in single mode: app.ts switches project and lands on this session.
          this.dispatchEvent(
            new CustomEvent('session-jump', {
              detail: { sessionId: session.id, projectPath: session.projectPath },
              bubbles: true,
              composed: true,
            })
          );
        }
        this._focusSessionTerminal(session.id);
        return;
      case 'focus-pane':
        this._handlePaneFocus(target.pane, session.id);
        this._focusSessionTerminal(session.id);
        return;
      case 'zoom-pane':
        this._zoomedPane = target.pane;
        this._afterZoomChange(target.pane);
        return;
      case 'assign-pane':
        // Set the zoom target BEFORE assigning: _assignPaneSession keeps the zoom only
        // when it targets the zoomed pane itself, and drops it for any other pane.
        if (target.keepZoom) this._zoomedPane = target.pane;
        this._assignPaneSession(target.pane, session.id);
        if (target.keepZoom) this._afterZoomChange(target.pane);
        else this._focusSessionTerminal(session.id);
        return;
    }
  }

  /** Drop the maximize indicator for a row-axis (e.g. after a manual splitter drag repositions it). */
  private _clearMaxAxis(key: RowKey): void {
    if (!this._maxAxis[key]) return;
    const next = { ...this._maxAxis };
    delete next[key];
    this._maxAxis = next;
  }

  /** The two pane indices sharing a row-axis, ordered [top, bottom]. */
  private _axisPanes(key: RowKey): [number, number] {
    switch (key) {
      case 'splitRowRatio': return [0, 1];
      case 'quadLeftRowRatio': return [0, 2];
      case 'quadRightRowRatio': return [1, 3];
    }
  }

  /**
   * Which pane on a row-axis (if any) must be hidden so no pane renders below a usable height.
   * Two sources:
   *  - an explicit maximize → solo the axis (the non-maximized pane is hidden), height-independent;
   *  - a splitter position / restored ratio that would leave one pane shorter than MIN_ROWS.
   * Returns null when both fit, when the container isn't measured yet, or when both would be too
   * small (never blank the whole axis — the splitter drag clamp already prevents that in practice).
   */
  private _hiddenPaneOnAxis(key: RowKey): number | null {
    const [top, bottom] = this._axisPanes(key);
    const max = this._maxAxis[key];
    const maximized = max ? (max.pane === top ? 'top' : 'bottom') : null;
    const which = hiddenRowPane(this._getRowRatio(key), this._containerHeightPx, maximized);
    return which === 'top' ? top : which === 'bottom' ? bottom : null;
  }

  /** True when pane `idx` is collapsed away on its row-axis (maximize sibling, or too small). */
  private _isPaneHidden(idx: number): boolean {
    if (!this._isSplit) return false;
    // Zoom hides every pane but the zoomed one, independent of the row-axis logic.
    const zoom = this._effectiveZoom;
    if (zoom !== null) return idx !== zoom;
    return this._hiddenPaneOnAxis(this._paneRowAxis(idx).key) === idx;
  }

  /** True when pane `idx`'s row-axis sibling is hidden, so `idx` should span the full axis. */
  private _isPaneFullAxis(idx: number): boolean {
    if (!this._isSplit) return false;
    const hidden = this._hiddenPaneOnAxis(this._paneRowAxis(idx).key);
    return hidden !== null && hidden !== idx;
  }

  /**
   * (Re)attach the ResizeObserver that tracks the split-panes container height. Idempotent:
   * only re-observes when the observed element actually changes (layout enters/leaves split,
   * or the container element is re-created).
   */
  private _syncContainerObserver(): void {
    const container = this._isSplit
      ? (this.querySelector('.terminal-sessions-container') as HTMLElement | null)
      : null;
    if (container === this._observedContainer) return;

    this._containerResizeObserver?.disconnect();
    this._containerResizeObserver = null;
    this._observedContainer = container;

    if (!container) {
      this._containerHeightPx = 0;
      return;
    }
    this._containerHeightPx = container.clientHeight;
    this._containerResizeObserver = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = e.contentRect.height;
        // Container height is fixed by the sidebar layout; hiding a pane never changes it, so
        // updating this state cannot feed back into a resize loop. Threshold avoids sub-pixel churn.
        if (Math.abs(h - this._containerHeightPx) >= 1) this._containerHeightPx = h;
      }
    });
    this._containerResizeObserver.observe(container);
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
      // Mount every session of each pane's (derived) project so in-pane tab switching is
      // buffer-free, same as single-mode keeps the active project's sessions mounted.
      const paneProjects = new Set<string>();
      for (let i = 0; i < this._paneCount; i++) {
        const p = this._projectOf(i);
        if (p) paneProjects.add(p);
      }
      for (const s of this.allSessions) {
        if (s.projectPath && paneProjects.has(s.projectPath)) map.set(s.id, s);
      }
    }
    return Array.from(map.values());
  }

  private _projectLabel(path: string): string {
    return this.projectNames[path] ?? (path.split('/').filter(Boolean).pop() ?? path);
  }

  /** Project a pane currently shows — derived from its active session (single source of truth). */
  private _projectOf(paneIndex: number): string | null {
    const id = this.paneSessionIds[paneIndex];
    if (!id) return null;
    return this.allSessions.find(s => s.id === id)?.projectPath ?? null;
  }

  /** Distinct project paths present in allSessions, in first-seen order (non-empty only). */
  private _distinctProjects(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of this.allSessions) {
      if (s.projectPath && !seen.has(s.projectPath)) {
        seen.add(s.projectPath);
        out.push(s.projectPath);
      }
    }
    return out;
  }

  /** Newest (latest createdAt) session id of a project, or null if it has none. */
  private _newestSessionIdOfProject(path: string): string | null {
    let best: TerminalSession | null = null;
    for (const s of this.allSessions) {
      if (s.projectPath !== path) continue;
      if (!best || new Date(s.createdAt).getTime() > new Date(best.createdAt).getTime()) best = s;
    }
    return best?.id ?? null;
  }

  /** Dropdown handler: select a project for a pane → activate its newest session (or empty it). */
  private _assignPaneProject(paneIndex: number, projectPath: string | null) {
    if (!projectPath) {
      this._assignPaneSession(paneIndex, null);
      return;
    }
    // Zoomed pane + project already shown in another (hidden) pane → jump the zoom there.
    // The arrangement stays untouched, so un-zooming later shows the panes exactly as before.
    if (this._effectiveZoom === paneIndex) {
      const projects = Array.from({ length: this._paneCount }, (_, i) => this._projectOf(i));
      const other = paneShowingProject(projects, projectPath, paneIndex);
      if (other >= 0) {
        this._zoomedPane = other;
        this._afterZoomChange(other);
        return;
      }
    }
    this._assignPaneSession(paneIndex, this._newestSessionIdOfProject(projectPath));
  }

  /**
   * Keep pane assignments consistent when allSessions changes. Idempotent — only writes when a
   * value actually changes (no requestUpdate loop). Runs from updated() (post-render), never
   * willUpdate(). Handles: "+"-adoption, duplicate-project dedup, and close/vanish fallback.
   */
  private _reconcilePanes() {
    if (!this._isSplit) return;
    const count = this._paneCount;
    const next = this.paneSessionIds.slice(0, count);
    while (next.length < count) next.push(null);
    let changed = false;

    // Refresh last-known project per pane (for close fallback) while the mapping still resolves.
    for (let i = 0; i < count; i++) {
      const id = next[i];
      const proj = id ? this.allSessions.find((s) => s.id === id)?.projectPath ?? null : null;
      if (proj) this._paneProjectCache[i] = proj;
    }

    // 0. Restore phase: re-resolve persisted per-pane projects to live sessions. Sessions arrive
    //    incrementally (one cloud-terminal:list-response per project), so keep retrying until each
    //    pane's project surfaces a session. Re-seeding _paneProjectCache here heals stage 2's wipe
    //    for still-pending panes. (A project whose sessions were all closed while away stays
    //    pending forever — benign: the loop is cheap and the dropdown can't offer it anyway.)
    if (this._paneRestoreProjects) {
      let anyPending = false;
      for (let i = 0; i < count; i++) {
        const proj = this._paneRestoreProjects[i];
        if (!proj) continue;
        this._paneProjectCache[i] = proj;
        const sid = this._newestSessionIdOfProject(proj);
        if (sid) {
          if (next[i] !== sid) { next[i] = sid; changed = true; }
          this._paneRestoreProjects[i] = null;
        } else {
          anyPending = true;
        }
      }
      if (!anyPending) this._paneRestoreProjects = null;
    }

    // 1. Adopt the "+"-created session into the requesting pane once it arrives.
    if (this._pendingNewSession) {
      const { paneIndex, projectPath } = this._pendingNewSession;
      const active = this.activeSessionId;
      const s = active ? this.allSessions.find((x) => x.id === active) : undefined;
      if (s && s.projectPath === projectPath && paneIndex < count) {
        if (next[paneIndex] !== active) {
          next[paneIndex] = active;
          changed = true;
        }
        this.focusedPaneIndex = paneIndex;
        this._paneProjectCache[paneIndex] = projectPath;
        this._pendingNewSession = null;
      }
    }

    // 2. Close/vanish fallback: assigned session gone → newest sibling of same project, or null.
    for (let i = 0; i < count; i++) {
      const id = next[i];
      if (!id || this.allSessions.some((x) => x.id === id)) continue;
      const proj = this._paneProjectCache[i];
      const fallback = proj ? this._newestSessionIdOfProject(proj) : null;
      if (next[i] !== fallback) {
        next[i] = fallback;
        changed = true;
      }
      if (!fallback) this._paneProjectCache[i] = null;
    }

    // 3. Dedup: same project must not occupy two panes (defensive, esp. after restoring old state).
    const seenProjects = new Set<string>();
    for (let i = 0; i < count; i++) {
      const id = next[i];
      if (!id) continue;
      const proj = this.allSessions.find((x) => x.id === id)?.projectPath;
      if (!proj) continue;
      if (seenProjects.has(proj)) {
        next[i] = null;
        this._paneProjectCache[i] = null;
        changed = true;
      } else {
        seenProjects.add(proj);
      }
    }

    if (changed) {
      // The zoomed slot lost its session → drop the zoom for good, so the next session
      // assigned to that slot does not pop up zoomed unexpectedly.
      if (this._zoomedPane !== null && !next[this._zoomedPane]) this._zoomedPane = null;
      this.paneSessionIds = next;
      this._persistLayout();
      this._refreshVisibleTerminals();
    }
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
              ? paneIdx >= 0 && !this._isPaneHidden(paneIdx)
              : session.id === this.activeSessionId;
            const styles: Record<string, string> = visible
              ? (this._isSplit ? { display: 'flex', ...this._paneGeom(paneIdx) } : { display: 'flex' })
              : { display: 'none' };
            const focused = this._isSplit && paneIdx === this.focusedPaneIndex;
            return html`
              <aos-terminal-session
                .session=${session}
                .isActive=${visible}
                ?pane-mode=${this._isSplit}
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

  /** Platform-aware label for the pane-zoom shortcut shown in tooltips. */
  private _zoomShortcutLabel(): string {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
    return isMac ? '⌘⇧↩' : 'Strg+Umschalt+Enter';
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
            // A collapsed pane (maximize sibling / too small) shows no header.
            if (this._isPaneHidden(i)) return nothing;
            const projectPath = this._projectOf(i);
            const label = projectPath ? this._projectLabel(projectPath) : '';
            const badgeStyle = projectPath
              ? {
                  background: `hsl(${this._projectHue(projectPath)} 55% 22%)`,
                  color: `hsl(${this._projectHue(projectPath)} 70% 80%)`,
                }
              : {};
            const activeId = this.paneSessionIds[i];
            const activeSession = activeId
              ? this.allSessions.find((s) => s.id === activeId)
              : undefined;
            const paneSessions = projectPath
              ? this.allSessions.filter((s) => s.projectPath === projectPath)
              : [];
            const termId = activeSession?.terminalSessionId ?? '';
            const reviewCfg = termId
              ? this._getReviewConfigFor(termId)
              : { enabled: false, reviewers: [] };
            const zoomActive = this._effectiveZoom !== null;
            const isZoomed = this._effectiveZoom === i;
            return html`<div
              class="pane-header ${i === this.focusedPaneIndex ? 'focused' : ''}"
              style=${styleMap(this._headerGeom(i))}
            >
              <div class="pane-header-row">
                <span
                  class="pane-project ${projectPath ? '' : 'empty'}"
                  style=${styleMap(badgeStyle)}
                  title=${label || 'Kein Projekt'}
                >${label || 'Kein Projekt'}</span>
                ${this._renderPaneDropdown(i)}
                <button
                  class="pane-new-btn"
                  ?disabled=${!projectPath}
                  title="Neue Session in diesem Projekt"
                  @click=${() => this._handleNewSession(projectPath ?? undefined, i)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                ${this.layoutMode !== 'single'
                  ? html`<button
                      class="pane-maximize-btn ${this._isPaneMaximized(i) ? 'active' : ''}"
                      ?disabled=${zoomActive}
                      title=${zoomActive
                        ? 'Während des Zooms nicht verfügbar'
                        : this._isPaneMaximized(i)
                          ? 'Auf 50/50 zurücksetzen'
                          : 'Dieses Pane vertikal maximieren'}
                      aria-label=${this._isPaneMaximized(i)
                        ? 'Pane-Größe zurücksetzen'
                        : 'Pane vertikal maximieren'}
                      aria-pressed=${this._isPaneMaximized(i) ? 'true' : 'false'}
                      @click=${() => this._togglePaneMaximize(i)}
                    >
                      ${this._isPaneMaximized(i)
                        ? html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="7 4 12 9 17 4"></polyline>
                            <polyline points="7 20 12 15 17 20"></polyline>
                          </svg>`
                        : html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="7 9 12 4 17 9"></polyline>
                            <polyline points="7 15 12 20 17 15"></polyline>
                          </svg>`}
                    </button>
                    <button
                      class="pane-zoom-btn ${isZoomed ? 'active' : ''}"
                      ?disabled=${!activeId}
                      title=${isZoomed
                        ? `Zoom beenden (${this._zoomShortcutLabel()})`
                        : `Pane auf volle Fläche zoomen (${this._zoomShortcutLabel()})`}
                      aria-label=${isZoomed ? 'Zoom beenden' : 'Pane zoomen'}
                      aria-pressed=${isZoomed ? 'true' : 'false'}
                      @click=${() => this._zoomPane(i)}
                    >
                      ${isZoomed
                        ? html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="4 14 10 14 10 20"></polyline>
                            <polyline points="20 10 14 10 14 4"></polyline>
                            <line x1="14" y1="10" x2="21" y2="3"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                          </svg>`
                        : html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                          </svg>`}
                    </button>`
                  : nothing}
              </div>
              <div class="pane-header-tabs">
                ${projectPath && paneSessions.length
                  ? html`<aos-terminal-tabs
                      .sessions=${paneSessions}
                      .activeSessionId=${activeId}
                      .availableProviders=${this.availableProviders}
                      .activeTerminalSessionId=${termId}
                      .activeSessionReviewEnabled=${reviewCfg.enabled}
                      .activeSessionReviewReviewers=${reviewCfg.reviewers}
                      @session-select=${(e: CustomEvent<{ sessionId: string }>) =>
                        this._assignPaneSession(i, e.detail.sessionId)}
                      @session-close=${this._handleSessionClose}
                      @session-rename=${this._handleSessionRename}
                      @auto-review-config-changed=${this._handleAutoReviewConfigChanged}
                      @auto-review-trigger-manual=${this._handleAutoReviewTriggerManual}
                    ></aos-terminal-tabs>`
                  : html`<span class="pane-tabs-hint"
                      >${projectPath ? 'Keine Sessions' : 'Projekt wählen'}</span
                    >`}
              </div>
            </div>`;
          }
        )}
      </div>
    `;
  }

  /** Drag handles between panes: one per divider, driven by ratio CSS vars. */
  private _renderSplitters() {
    // No splitters while a pane is zoomed — there is nothing to divide.
    if (this._effectiveZoom !== null) return nothing;
    if (this.layoutMode === 'split-2') {
      // No row splitter while one pane is collapsed to full height — reverse via the maximize button.
      if (this._hiddenPaneOnAxis('splitRowRatio') !== null) return nothing;
      return html`<div
        class="pane-splitter horizontal"
        style=${styleMap({ left: '0', width: '100%', top: 'calc(var(--sr) * 100% - 3px)' })}
        @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'row')}
      ></div>`;
    }
    if (this.layoutMode === 'quad-4') {
      const showRowL = this._hiddenPaneOnAxis('quadLeftRowRatio') === null;
      const showRowR = this._hiddenPaneOnAxis('quadRightRowRatio') === null;
      return html`
        <div
          class="pane-splitter vertical"
          style=${styleMap({ top: '0', bottom: '0', left: 'calc(var(--c) * 100% - 3px)' })}
          @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'col')}
        ></div>
        ${showRowL ? html`<div
          class="pane-splitter horizontal"
          style=${styleMap({ left: '0', width: 'calc(var(--c) * 100% - 1.5px)', top: 'calc(var(--rl) * 100% - 3px)' })}
          @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'rowL')}
        ></div>` : nothing}
        ${showRowR ? html`<div
          class="pane-splitter horizontal"
          style=${styleMap({ left: 'calc(var(--c) * 100% + 1.5px)', width: 'calc((1 - var(--c)) * 100% - 1.5px)', top: 'calc(var(--rr) * 100% - 3px)' })}
          @pointerdown=${(e: PointerEvent) => this._startSplitterDrag(e, 'rowR')}
        ></div>` : nothing}
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
      // Columns clamp to the static band; rows keep BOTH panes at least MIN_ROWS tall so a drag
      // can never create a sub-usable pane (which would flood Claude Code with SIGWINCH redraws).
      // `clampRowRatio` is the single source of the row safe-band, shared with `_healRowRatios`.
      const ratio = kind === 'col'
        ? Math.min(0.85, Math.max(0.15, raw))
        : clampRowRatio(raw, rect.height);
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
      else if (kind === 'rowL') { this.quadLeftRowRatio = r; this._clearMaxAxis('quadLeftRowRatio'); }
      else if (kind === 'rowR') { this.quadRightRowRatio = r; this._clearMaxAxis('quadRightRowRatio'); }
      else { this.splitRowRatio = r; this._clearMaxAxis('splitRowRatio'); }
      this._persistLayout();
      this._refreshVisibleTerminals();
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  }

  private _renderPaneDropdown(paneIndex: number) {
    const current = this._projectOf(paneIndex) ?? '';
    // Exclusivity: a project shown in another pane can't be picked here — except while this pane
    // is zoomed: the other panes are invisible, so picking their project JUMPS the zoom there
    // (see _assignPaneProject) instead of duplicating it.
    const zoomed = this._effectiveZoom === paneIndex;
    const usedElsewhere = new Set<string>();
    for (let i = 0; i < this._paneCount; i++) {
      if (i === paneIndex) continue;
      const p = this._projectOf(i);
      if (p) usedElsewhere.add(p);
    }

    // `?selected` below is only correct on the first paint — the displayed selection is
    // corrected imperatively afterwards by _syncPaneSelects() (see pane-select-sync.ts).
    return html`
      <select
        class="pane-select"
        data-pane=${paneIndex}
        @change=${(e: Event) =>
          this._assignPaneProject(paneIndex, (e.target as HTMLSelectElement).value || null)}
      >
        <option value="" ?selected=${!current}>— Projekt wählen —</option>
        ${repeat(
          this._distinctProjects(),
          (path) => path,
          (path) => html`<option
            value=${path}
            ?disabled=${!zoomed && usedElsewhere.has(path) && path !== current}
            ?selected=${path === current}
            title=${zoomed && usedElsewhere.has(path) ? 'Springt zu diesem Pane' : nothing}
          >
            ${this._projectLabel(path)}
          </option>`
        )}
      </select>
    `;
  }

  /**
   * A <select>'s selection is DOM state, not template state: once the user has picked an
   * option, `?selected` attribute changes are ignored (dirty options), and lit commits an
   * element's own parts before its child option parts — so neither binding can move the
   * selection reliably (see pane-select-sync.ts). The pane dropdowns are therefore corrected
   * imperatively after every render.
   *
   * `data-pane` is required rather than DOM order: a hidden pane renders no header at all
   * (`_isPaneHidden`), so the n-th `.pane-select` is not pane n — while zoomed there is
   * exactly one, and it is not necessarily pane 0.
   */
  private _syncPaneSelects(): void {
    if (!this._isSplit) return;
    const count = this._paneCount;
    for (const select of this.querySelectorAll<HTMLSelectElement>('select.pane-select[data-pane]')) {
      const idx = Number.parseInt(select.dataset.pane ?? '', 10);
      if (!Number.isInteger(idx) || idx < 0 || idx >= count) continue;
      syncSelectValue(select, this._projectOf(idx) ?? '');
    }
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

  /**
   * Refit every currently-visible terminal after a layout change. Each terminal's own
   * refreshTerminal() schedules a coalesced, settled refit (double-rAF + cancel-and-reschedule),
   * so the sidebar must NOT add its own rAF wrapper — that just stacked latency (4 frames) with
   * no benefit. The per-terminal scheduler already lands after Lit's flush and forces layout on read.
   */
  private _refreshVisibleTerminals() {
    this.querySelectorAll('aos-terminal-session.session-panel').forEach((el) => {
      const node = el as AosTerminalSession & HTMLElement;
      if (node.style.display !== 'none') node.refreshTerminal();
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

    // Cmd/Ctrl+Shift+Enter toggles pane zoom (xterm blocks the same combo, so it never reaches
    // the PTY). Ignored while typing in an editable outside the sidebar (e.g. the notepad).
    if (isPaneZoomShortcut(e)) {
      if (isEditableTarget(e.target) && !this.contains(e.target as Node)) return;
      e.preventDefault();
      this._toggleZoom();
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
    // Layout change invalidates a pending "+" adoption (pane indices may shift).
    this._pendingNewSession = null;
    // Maximize/zoom tracking is per-axis/index — meaningless across a layout switch.
    this._maxAxis = {};
    this._zoomedPane = null;
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

  /**
   * Fill only the null slots — never overwrites an assigned slot. Project-exclusive: each filled
   * pane gets the newest session of a DISTINCT project not already shown (active project first).
   */
  private _autoFillPanes(arr: (string | null)[]) {
    const usedProjects = new Set<string>();
    for (const id of arr) {
      if (!id) continue;
      const p = this.allSessions.find((s) => s.id === id)?.projectPath;
      if (p) usedProjects.add(p);
    }
    const pool: string[] = [];
    const addProject = (path: string | undefined | null) => {
      if (!path || usedProjects.has(path)) return;
      const id = this._newestSessionIdOfProject(path);
      if (id) {
        pool.push(id);
        usedProjects.add(path);
      }
    };
    const activeProj = this.activeSessionId
      ? this.allSessions.find((s) => s.id === this.activeSessionId)?.projectPath
      : undefined;
    addProject(activeProj);
    for (const path of this._distinctProjects()) addProject(path);

    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == null) {
        const pick = pool.shift();
        if (pick) arr[i] = pick;
      }
    }
  }

  private _assignPaneSession(paneIndex: number, sessionId: string | null) {
    // A manual pane change wins over a pending restore — drop this pane's restore intent so a
    // late list-response can't override the user's choice in _reconcilePanes step 0.
    if (this._paneRestoreProjects) {
      this._paneRestoreProjects[paneIndex] = null;
      if (!this._paneRestoreProjects.some(Boolean)) this._paneRestoreProjects = null;
    }
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
    // Switching the session INSIDE the zoomed pane (tab click, "+", project dropdown) keeps the
    // zoom — that is the pane the user is looking at. Only a change to another pane, or emptying
    // the zoomed pane, is a new arrangement that drops the zoom.
    if (this._zoomedPane !== null && (paneIndex !== this._zoomedPane || !sessionId)) {
      this._zoomedPane = null;
    }
    this._persistLayout();
    this._refreshVisibleTerminals();
    if (sessionId) this._emitSessionSelect(sessionId);
  }

  private _handlePaneFocus(paneIndex: number, sessionId: string) {
    if (paneIndex < 0) return;
    this.focusedPaneIndex = paneIndex;
    this._emitSessionSelect(sessionId);
  }

  /**
   * Keep app.ts' activeTerminalSessionId in sync with the focused pane (toolbar/shortcuts).
   * `force` re-emits for the already-active session — app.ts reacts to a property CHANGE, so
   * without it a bell jump onto the active session would silently keep its entry.
   */
  private _emitSessionSelect(sessionId: string, force = false) {
    if (!force && this.activeSessionId === sessionId) return;
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
      // Per-pane project path — the stable anchor for restore (session ids are ephemeral).
      localStorage.setItem(
        'cloud-terminal-pane-projects',
        JSON.stringify(this.paneSessionIds.map((_, i) => this._projectOf(i)))
      );
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

        // Per-pane projects: the persisted session ids above are stale after reload (regenerate as
        // `restored-…`); the project path is the stable anchor. Stash it as restore intent and seed
        // the close-fallback cache so _reconcilePanes can re-resolve each pane to a live session.
        const projRaw = localStorage.getItem('cloud-terminal-pane-projects');
        if (projRaw) {
          const parsedProj: unknown = JSON.parse(projRaw);
          if (Array.isArray(parsedProj)) {
            const projs = parsedProj
              .map((x) => (typeof x === 'string' ? x : null))
              .slice(0, count);
            while (projs.length < count) projs.push(null);
            if (projs.some(Boolean)) {
              this._paneRestoreProjects = projs;
              this._paneProjectCache = projs.slice();
            }
          }
        }
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

  /**
   * New session. Existing bindings call this as an event handler (first arg = Event) → that arg
   * is ignored and app.ts falls back to the active project. The per-pane "+" passes an explicit
   * projectPath (string) + paneIndex, and the freshly created session is adopted into that pane
   * via `_pendingNewSession` in `_reconcilePanes`.
   */
  private _handleNewSession(projectPathOrEvent?: string | Event, paneIndex?: number) {
    const projectPath = typeof projectPathOrEvent === 'string' ? projectPathOrEvent : undefined;
    if (this._isSplit && projectPath && paneIndex != null && paneIndex >= 0) {
      this._pendingNewSession = { paneIndex, projectPath };
    }
    this.dispatchEvent(
      new CustomEvent('new-session', {
        detail: projectPath ? { projectPath } : undefined,
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
    if (changed.has('allSessions') || changed.has('activeSessionId') || this._pendingNewSession) {
      this._reconcilePanes();
    }
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

    // Keep the container-height measurement (drives the too-small-pane hide) attached to the
    // current split-panes container. Idempotent — no-op when the element hasn't changed.
    this._syncContainerObserver();

    // Correct any unsafe row ratios once the height is known. Called unconditionally (NOT gated on
    // a `_containerHeightPx` change): single→quad-4 keeps the container height constant, so a
    // change-gate would never heal legacy 0.85 ratios on that transition. Placed right after the
    // measurement above so a first measure + heal batch into one render (no 2-pane flash), and the
    // internal idempotency guard makes the every-update call a cheap no-op when ratios are safe.
    this._healRowRatios();

    // Last on purpose: _reconcilePanes() above may still rewrite paneSessionIds, which (being
    // @state) schedules another update whose sync then sees the settled value.
    this._syncPaneSelects();
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
    this._containerResizeObserver?.disconnect();
    this._containerResizeObserver = null;
    this._observedContainer = null;
    document.body.style.overflow = '';
    document.documentElement.style.setProperty('--terminal-open-width', '0px');
    gateway.off('model.providers.list', this.boundHandleProvidersListResponse);
    gateway.off('plan-review:config.snapshot', this.boundHandleConfigSnapshot);
    gateway.off('gateway.connected', this.boundHandleGatewayConnected);
    document.removeEventListener('keydown', this.boundHandleFullscreenKeydown);
    this._closeBell();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-cloud-terminal-sidebar': AosCloudTerminalSidebar;
  }
}
