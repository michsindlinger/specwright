import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { gateway } from '../gateway';
import type { MessageHandler } from '../gateway';
import { themeService, type ResolvedTheme } from '../services/theme.service.js';
import { CLOUD_TERMINAL_CONFIG } from '../../../src/shared/types/cloud-terminal.protocol.js';
import '@xterm/xterm/css/xterm.css';

const DARK_THEME = {
  background: '#142840',
  foreground: '#B8C9DB',
  cursor: '#00D4FF',
  selectionBackground: '#2D4A6F',
  black: '#0F1F33',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#f59e0b',
  blue: '#00D4FF',
  magenta: '#a855f7',
  cyan: '#00B8E0',
  white: '#ffffff',
  brightBlack: '#7A92A9',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff'
} as const;

const LIGHT_THEME = {
  background: '#FFFFFF',
  foreground: '#1e293b',
  cursor: '#1E3A5F',
  selectionBackground: '#F5EDE5',
  black: '#1e293b',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#d97706',
  blue: '#1E3A5F',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#FFFBF7',
  brightBlack: '#64748b',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#f59e0b',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#ffffff'
} as const;

const BLACK_THEME = {
  background: '#1a1a1a',
  foreground: '#e0e0e0',
  cursor: '#22c55e',
  selectionBackground: '#333333',
  black: '#000000',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#ffffff',
  brightBlack: '#737373',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff'
} as const;

function getTerminalTheme(theme: ResolvedTheme) {
  if (theme === 'light') return LIGHT_THEME;
  if (theme === 'black') return BLACK_THEME;
  return DARK_THEME;
}

/**
 * Terminal component wrapping xterm.js
 *
 * Provides full terminal experience with:
 * - PTY output rendering (ANSI colors, formatting)
 * - User input (keyboard, paste)
 * - Auto-resize with container
 * - Theme integration via CSS Custom Properties
 *
 * @fires terminal-ready - Emitted when terminal is initialized
 */
@customElement('aos-terminal')
export class AosTerminal extends LitElement {
  /**
   * Terminal session ID (execution ID or cloud terminal session ID)
   * Used to route terminal I/O to correct PTY session
   */
  @property({ type: String })
  terminalSessionId = '';

  /**
   * Cloud terminal mode - uses cloud-terminal:* protocol instead of terminal.*
   */
  @property({ type: Boolean })
  cloudMode = false;

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private terminalContainer: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private terminalDataHandler: MessageHandler | null = null;
  private terminalExitHandler: MessageHandler | null = null;
  private terminalBufferResponseHandler: MessageHandler | null = null;
  private terminalResumedHandler: MessageHandler | null = null;
  private pasteImageSavedHandler: MessageHandler | null = null;
  private pasteImageErrorHandler: MessageHandler | null = null;
  /** Guard so concurrent Cmd+V presses don't fire multiple uploads */
  private _pasteInFlight = false;
  private boundThemeChangeHandler = (theme: ResolvedTheme) => this.onThemeChanged(theme);
  /** Guard to prevent multiple concurrent refreshTerminal() calls */
  private _refreshInProgress = false;

  // Touch-scroll bridge: xterm.js only scrolls on wheel events, and its scrollable
  // .xterm-viewport sits behind the .xterm-screen, so touch drags never reach it.
  // We translate single-finger vertical drags into viewport.scrollTop changes, which
  // fires xterm's own scroll handler and syncs the buffer rendering.
  private _xtermViewport: HTMLElement | null = null;
  private _touchStartY = 0;
  private _touchStartScrollTop = 0;
  private boundTouchStartHandler = (e: TouchEvent) => this._onTouchStart(e);
  private boundTouchMoveHandler = (e: TouchEvent) => this._onTouchMove(e);

  override connectedCallback(): void {
    super.connectedCallback();
    themeService.onChange(this.boundThemeChangeHandler);

    // Wait for first render before initializing terminal
    this.updateComplete.then(() => {
      this.initializeTerminal();
      // Gateway listeners are set up in _doInitializeTerminal (or deferred via ResizeObserver)
      // Only set them up here if terminal was initialized synchronously
      if (!this._pendingInit) {
        this.setupGatewayListeners();
      }
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    themeService.offChange(this.boundThemeChangeHandler);
    this.cleanupTerminal();
    this.cleanupGatewayListeners();
  }

  private onThemeChanged(theme: ResolvedTheme): void {
    if (this.terminal) {
      this.terminal.options.theme = getTerminalTheme(theme);
    }
  }

  /**
   * Refresh terminal rendering after becoming visible again.
   *
   * IMPORTANT: This method only calls fitAddon.fit() to recalculate
   * dimensions and trigger a re-render. It does NOT reset the terminal
   * or request a buffer replay from the server. The terminal's internal
   * buffer is still intact after display:none → display:block transitions -
   * xterm.js just needs to re-render the canvas at the correct size.
   *
   * Buffer replay (reset + re-fetch from server) should only be used for
   * actual reconnection scenarios (WebSocket disconnect/reconnect), not
   * for simple visibility toggles.
   */
  public refreshTerminal(): void {
    if (!this.fitAddon || !this.terminal) return;
    if (this._refreshInProgress) return;
    this._refreshInProgress = true;

    // Double requestAnimationFrame: first rAF schedules after current frame,
    // second rAF runs after the browser has completed layout reflow.
    // A single rAF is not enough after visibility changes (display:none → block).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._refreshInProgress = false;
        if (!this.fitAddon || !this.terminal || !this.terminalContainer) return;

        // Skip if container still has zero dimensions (not yet visible)
        if (this.terminalContainer.offsetWidth === 0 || this.terminalContainer.offsetHeight === 0) {
          return;
        }

        // Just refit - xterm.js re-renders its internal buffer at the new size.
        // Do NOT call reset() or request buffer replay here, as that destroys
        // the correct internal state and replaces it with a server-side buffer
        // that may contain absolute cursor positioning escape sequences.
        this.fitAddon.fit();

        // Send resize to backend PTY so new output is correctly formatted.
        if (this.terminalSessionId) {
          const cols = this.terminal.cols;
          const rows = this.terminal.rows;
          if (this.cloudMode) {
            gateway.send({
              type: 'cloud-terminal:resize',
              sessionId: this.terminalSessionId,
              cols,
              rows,
              timestamp: new Date().toISOString(),
            });
          } else {
            gateway.sendTerminalResize(this.terminalSessionId, cols, rows);
          }
        }
      });
    });
  }

  private initializeTerminal(): void {
    this.terminalContainer = this.querySelector('#terminal-container') as HTMLElement;
    if (!this.terminalContainer) {
      console.error('Terminal container not found');
      return;
    }

    // Don't initialize if container is not visible (zero dimensions).
    // This happens when the terminal is inside a hidden sidebar or tab.
    // The terminal will be initialized later via refreshTerminal() or
    // when the container becomes visible and ResizeObserver fires.
    if (this.terminalContainer.offsetWidth === 0 || this.terminalContainer.offsetHeight === 0) {
      this._pendingInit = true;
      this.setupResizeObserver();
      return;
    }

    this._doInitializeTerminal();
  }

  /** Flag indicating terminal init was deferred because container was hidden */
  private _pendingInit = false;

  private _doInitializeTerminal(): void {
    if (!this.terminalContainer) return;
    this._pendingInit = false;

    // Create xterm.js Terminal with theme
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 1.5,
      theme: getTerminalTheme(themeService.getResolvedTheme()),
      allowProposedApi: true // Required for some addons
    });

    // Create fit addon for auto-resize
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Open terminal in container
    this.terminal.open(this.terminalContainer);

    // Fit terminal to container
    this.fitAddon.fit();

    // Enable touch scrolling (no-op on non-touch devices, harmless on desktop)
    this._setupTouchScroll();

    // Custom key event handler for terminal shortcuts.
    // attachCustomKeyEventHandler is called for ALL event types: keydown, keypress, keyup.
    // Returning false blocks xterm from processing the event.
    this.terminal.attachCustomKeyEventHandler((event) => {
      // Intercept Cmd/Ctrl+C to clean up selection before copying.
      // xterm.js handles copy internally on a hidden textarea, so a normal
      // 'copy' event listener on the container never fires. We bypass xterm's
      // copy entirely by writing to the clipboard API ourselves.
      if (event.key === 'c' && (event.metaKey || event.ctrlKey) && !event.shiftKey && event.type === 'keydown') {
        if (this.terminal?.hasSelection()) {
          const cleaned = this._cleanSelection();
          if (cleaned) {
            navigator.clipboard.writeText(cleaned);
            this.terminal.clearSelection();
            return false; // Block xterm's copy
          }
        }
        // No selection → let xterm handle (sends SIGINT / \x03)
      }

      // Cmd/Ctrl+V in cloud mode: bridge browser clipboard images to the remote PTY.
      // Cloud Claude Code runs on the droplet — it can't reach the user's local
      // clipboard. We intercept the keypress, read the image via the Async Clipboard
      // API, and upload it. xterm's standard text-paste path stays intact (return true),
      // so non-image clipboards still work the usual way.
      if (this.cloudMode && event.key === 'v' && (event.metaKey || event.ctrlKey)
          && !event.shiftKey && event.type === 'keydown') {
        void this._tryHandleCloudImagePaste();
        return true;
      }

      // Shift+Enter → send newline to PTY (cloud mode only)
      // Must return false for ALL event types (keydown, keypress, keyup) to fully
      // block xterm. Previously only keydown was blocked, but keypress leaked through.
      if (this.cloudMode && event.key === 'Enter' && event.shiftKey) {
        if (event.type === 'keydown') {
          event.preventDefault();
          gateway.send({
            type: 'cloud-terminal:input',
            sessionId: this.terminalSessionId,
            data: '\n',
            timestamp: new Date().toISOString(),
          });
        }
        return false; // Block ALL Shift+Enter events
      }

      return true; // Let xterm handle all other keys
    });

    // Handle user input
    this.terminal.onData((data) => {
      if (!this.terminalSessionId) return;

      if (this.cloudMode) {
        gateway.send({
          type: 'cloud-terminal:input',
          sessionId: this.terminalSessionId,
          data,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Block Ctrl+C (0x03) - workflow should be cancelled via UI button
        if (data === '\x03') {
          console.log('[Terminal] Ctrl+C blocked - use cancel button to stop workflow');
          this.terminal?.write('\r\n⚠️  Use the "Abbrechen" button to stop the workflow\r\n');
          return;
        }
        gateway.sendTerminalInput(this.terminalSessionId, data);
      }
    });

    // Setup resize observer (only if not already set up during deferred init)
    if (!this.resizeObserver) {
      this.setupResizeObserver();
    }

    // Emit ready event
    this.dispatchEvent(new CustomEvent('terminal-ready', {
      detail: { terminal: this.terminal }
    }));

    // Request buffer if we're reconnecting
    if (this.terminalSessionId) {
      if (this.cloudMode) {
        // Request buffer from cloud terminal backend
        gateway.send({
          type: 'cloud-terminal:buffer-request',
          sessionId: this.terminalSessionId,
          timestamp: new Date().toISOString(),
        });
      } else {
        gateway.requestTerminalBuffer(this.terminalSessionId);
      }
    }
  }

  private setupGatewayListeners(): void {
    if (this.cloudMode) {
      this.setupCloudTerminalListeners();
    } else {
      this.setupWorkflowTerminalListeners();
    }
  }

  private setupCloudTerminalListeners(): void {
    this.terminalDataHandler = (message) => {
      if (message.sessionId === this.terminalSessionId && this.terminal) {
        const data = message.data as string;
        this.terminal.write(data);
        // Detect input-needed patterns in terminal output
        this._detectInputNeeded(data);
      }
    };
    gateway.on('cloud-terminal:data', this.terminalDataHandler);

    this.terminalExitHandler = (message) => {
      if (message.sessionId === this.terminalSessionId && this.terminal) {
        const exitCode = message.exitCode as number;
        this.terminal.write(`\r\n\n[Process exited with code ${exitCode}]\r\n`);
        this.terminal.options.disableStdin = true;
      }
    };
    gateway.on('cloud-terminal:closed', this.terminalExitHandler);

    // Handle buffer response for reconnection / refresh.
    // Uses reset() to fully clear terminal state (cursor position, scrollback,
    // attributes) before writing the buffer. clear() only removes scrollback
    // and leaves the cursor where it was, causing content to accumulate/shift.
    this.terminalBufferResponseHandler = (message) => {
      if (message.sessionId === this.terminalSessionId && this.terminal) {
        const buffer = message.buffer as string;
        if (buffer && buffer.length > 0) {
          this.terminal.reset();
          this.terminal.write(buffer);
        }
      }
    };
    gateway.on('cloud-terminal:buffer-response', this.terminalBufferResponseHandler);

    // After a session resume (WebSocket reconnect, e.g. mobile tab restore),
    // replay the full server-side buffer so output that arrived while
    // disconnected is not lost. The buffer-response handler resets the
    // terminal before writing, so this is safe to do on every resume.
    this.terminalResumedHandler = (message) => {
      if (message.sessionId === this.terminalSessionId && this.terminal) {
        gateway.send({
          type: 'cloud-terminal:buffer-request',
          sessionId: this.terminalSessionId,
          timestamp: new Date().toISOString(),
        });
      }
    };
    gateway.on('cloud-terminal:resumed', this.terminalResumedHandler);

    this.pasteImageSavedHandler = (message) => {
      if (message.sessionId !== this.terminalSessionId) return;
      this._pasteInFlight = false;
      this._showPasteStatus('Screenshot eingefügt', 'success');
    };
    gateway.on('cloud-terminal:paste-image-saved', this.pasteImageSavedHandler);

    this.pasteImageErrorHandler = (message) => {
      if (message.sessionId !== this.terminalSessionId) return;
      const code = (message as { code?: string }).code ?? '';
      if (!code.startsWith('PASTE_IMAGE_')) return;
      this._pasteInFlight = false;
      this._showPasteStatus(
        `Screenshot-Paste fehlgeschlagen: ${(message as { message?: string }).message ?? code}`,
        'error',
      );
    };
    gateway.on('cloud-terminal:error', this.pasteImageErrorHandler);
  }

  /** Debounce timer for input-needed detection */
  private _inputNeededTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Detect patterns in terminal output that indicate user input is needed.
   * Emits 'input-needed' event when such patterns are detected.
   * Uses a debounce (500ms) to avoid false positives from streaming output.
   *
   * Patterns detected:
   * - Lines ending with '?' (Claude CLI prompts)
   * - "Press any key" patterns
   * - Explicit input prompts (Enter X:, Password:, etc.)
   * - Yes/No confirmation prompts
   */
  /**
   * Clean terminal selection for clipboard:
   * 1. Trim trailing whitespace that xterm.js pads to fill each row
   * 2. Rejoin visually-wrapped lines into their original logical lines
   *    using the buffer's isWrapped flag
   */
  private _cleanSelection(): string {
    if (!this.terminal) return '';
    const selection = this.terminal.getSelection();
    if (!selection) return '';

    const selPos = this.terminal.getSelectionPosition();
    if (!selPos) {
      return selection.split('\n').map(line => line.trimEnd()).join('\n');
    }

    const buffer = this.terminal.buffer.active;
    const visualLines = selection.split('\n');
    const logicalLines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < visualLines.length; i++) {
      const bufferRow = selPos.start.y + i;
      const bufferLine = buffer.getLine(bufferRow);
      const isWrapped = bufferLine?.isWrapped ?? false;

      if (i === 0 || !isWrapped) {
        if (i > 0) {
          logicalLines.push(currentLine.trimEnd());
        }
        currentLine = visualLines[i];
      } else {
        currentLine += visualLines[i];
      }
    }
    logicalLines.push(currentLine.trimEnd());

    return logicalLines.join('\n');
  }

  private _detectInputNeeded(data: string): void {
    // Strip ANSI escape codes for pattern matching
    // eslint-disable-next-line no-control-regex
    const strippedData = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

    // Patterns that indicate input is needed (precise, avoiding false positives)
    const inputPatterns = [
      /\?\s*$/,                           // Lines ending with '?' (Claude prompts)
      /Press any key/i,                   // "Press any key" prompts
      /Enter.*:\s*$/i,                    // "Enter X:" prompts
      /Password\s*:\s*$/i,               // Password prompts
      /Input required/i,                  // Explicit input required
      /Bitte.*eingeben/i,                 // German input prompts
      /\[Y\/n\]/i,                        // Yes/No prompts
      /\[y\/N\]/i,                        // yes/No prompts
      /\(y\/n\)/i,                        // (y/n) prompts
    ];

    // Check if any pattern matches
    const needsInput = inputPatterns.some(pattern => pattern.test(strippedData));

    if (needsInput) {
      // Debounce: only fire after 500ms of no new output
      // This prevents false positives from streaming log lines
      if (this._inputNeededTimer) clearTimeout(this._inputNeededTimer);
      this._inputNeededTimer = setTimeout(() => {
        this._inputNeededTimer = null;
        this.dispatchEvent(new CustomEvent('input-needed', {
          detail: { sessionId: this.terminalSessionId },
          bubbles: true,
          composed: true,
        }));
      }, 500);
    }
  }

  private setupWorkflowTerminalListeners(): void {
    this.terminalDataHandler = (message) => {
      if (message.executionId === this.terminalSessionId && this.terminal) {
        this.terminal.write(message.data as string);
      }
    };
    gateway.on('terminal.data', this.terminalDataHandler);

    this.terminalExitHandler = (message) => {
      if (message.executionId === this.terminalSessionId && this.terminal) {
        const exitCode = message.exitCode as number;
        this.terminal.write(`\r\n\n[Process exited with code ${exitCode}]\r\n`);
        this.terminal.options.disableStdin = true;
      }
    };
    gateway.on('terminal.exit', this.terminalExitHandler);

    this.terminalBufferResponseHandler = (message) => {
      if (message.executionId === this.terminalSessionId && this.terminal) {
        const buffer = message.buffer as string[];
        if (buffer && buffer.length > 0) {
          this.terminal.reset();
          this.terminal.write(buffer.join('\n'));
        }
      }
    };
    gateway.on('terminal.buffer.response', this.terminalBufferResponseHandler);
  }

  /**
   * Cloud-mode paste bridge: read an image from the browser clipboard and ship it
   * to the server. The text-paste path is not blocked — this is a best-effort
   * additional handler that no-ops when no image is on the clipboard.
   */
  private async _tryHandleCloudImagePaste(): Promise<void> {
    if (!this.terminalSessionId) return;
    if (this._pasteInFlight) return;
    if (!navigator.clipboard?.read) return;

    let items: ClipboardItem[];
    try {
      items = await navigator.clipboard.read();
    } catch {
      // Permission denied or no access → silently fall back to xterm's text path
      return;
    }

    const allowed = CLOUD_TERMINAL_CONFIG.ALLOWED_PASTE_IMAGE_MIME;
    const item = items.find((i) => allowed.some((mt) => i.types.includes(mt)));
    if (!item) return;

    const mimeType = allowed.find((mt) => item.types.includes(mt))!;
    const blob = await item.getType(mimeType);
    const maxBytes = CLOUD_TERMINAL_CONFIG.MAX_PASTE_IMAGE_BYTES;
    if (blob.size > maxBytes) {
      this._showPasteStatus(
        `Screenshot ist zu groß (${(blob.size / 1024 / 1024).toFixed(1)} MB, Limit ${maxBytes / 1024 / 1024} MB)`,
        'error',
      );
      return;
    }

    this._pasteInFlight = true;
    this._showPasteStatus('Screenshot wird hochgeladen…', 'info');
    let base64: string;
    try {
      base64 = await this._blobToBase64(blob);
    } catch (err) {
      this._pasteInFlight = false;
      this._showPasteStatus(
        `Screenshot konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
      return;
    }

    gateway.send({
      type: 'cloud-terminal:paste-image',
      sessionId: this.terminalSessionId,
      base64,
      mimeType,
      timestamp: new Date().toISOString(),
    });
  }

  private _blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        const comma = r.indexOf(',');
        resolve(comma >= 0 ? r.slice(comma + 1) : r);
      };
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  }

  private _showPasteStatus(message: string, type: 'info' | 'success' | 'error'): void {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message, type },
      bubbles: true,
      composed: true,
    }));
  }

  private cleanupGatewayListeners(): void {
    if (this.terminalDataHandler) {
      const dataEvent = this.cloudMode ? 'cloud-terminal:data' : 'terminal.data';
      gateway.off(dataEvent, this.terminalDataHandler);
      this.terminalDataHandler = null;
    }
    if (this.terminalExitHandler) {
      const exitEvent = this.cloudMode ? 'cloud-terminal:closed' : 'terminal.exit';
      gateway.off(exitEvent, this.terminalExitHandler);
      this.terminalExitHandler = null;
    }
    if (this.terminalBufferResponseHandler) {
      const bufferEvent = this.cloudMode ? 'cloud-terminal:buffer-response' : 'terminal.buffer.response';
      gateway.off(bufferEvent, this.terminalBufferResponseHandler);
      this.terminalBufferResponseHandler = null;
    }
    if (this.terminalResumedHandler) {
      gateway.off('cloud-terminal:resumed', this.terminalResumedHandler);
      this.terminalResumedHandler = null;
    }
    if (this.pasteImageSavedHandler) {
      gateway.off('cloud-terminal:paste-image-saved', this.pasteImageSavedHandler);
      this.pasteImageSavedHandler = null;
    }
    if (this.pasteImageErrorHandler) {
      gateway.off('cloud-terminal:error', this.pasteImageErrorHandler);
      this.pasteImageErrorHandler = null;
    }
  }

  private setupResizeObserver(): void {
    if (!this.terminalContainer) {
      return;
    }

    // Allow setup even without terminal/fitAddon when _pendingInit is true
    // (deferred init waits for container to become visible via ResizeObserver)
    if (!this._pendingInit && (!this.terminal || !this.fitAddon)) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.terminalContainer) return;

      // Skip when container is hidden (display: none gives zero dimensions).
      // This prevents sending wrong resize to the backend PTY.
      if (this.terminalContainer.offsetWidth === 0 || this.terminalContainer.offsetHeight === 0) {
        return;
      }

      // Complete deferred initialization now that the container is visible
      if (this._pendingInit) {
        this._doInitializeTerminal();
        this.setupGatewayListeners();
        this.dispatchEvent(new CustomEvent('terminal-ready', {
          detail: { terminal: this.terminal }
        }));
        return;
      }

      if (this.fitAddon && this.terminal) {
        this.fitAddon.fit();

        // Send resize event to backend
        if (this.terminalSessionId) {
          const cols = this.terminal.cols;
          const rows = this.terminal.rows;
          if (this.cloudMode) {
            gateway.send({
              type: 'cloud-terminal:resize',
              sessionId: this.terminalSessionId,
              cols,
              rows,
              timestamp: new Date().toISOString(),
            });
          } else {
            gateway.sendTerminalResize(this.terminalSessionId, cols, rows);
          }
        }
      }
    });

    this.resizeObserver.observe(this.terminalContainer);
  }

  override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    // Handle terminalSessionId changes (e.g., after page reload) - workflow mode only
    if (changedProperties.has('terminalSessionId') && !this.cloudMode) {
      const oldSessionId = changedProperties.get('terminalSessionId') as string | undefined;
      const newSessionId = this.terminalSessionId;

      if (newSessionId && newSessionId !== oldSessionId && this.terminal) {
        gateway.requestTerminalBuffer(newSessionId);
      }
    }
  }

  /**
   * Bridge touch gestures to xterm's scrollback.
   *
   * xterm.js only reacts to `wheel` events for scrolling, so on touch devices
   * (mobile) long output is unreachable. We attach touch listeners to the
   * terminal container (events bubble up from .xterm-screen) and translate a
   * single-finger vertical drag into a `scrollTop` change on .xterm-viewport.
   * Setting scrollTop fires xterm's internal scroll handler, which keeps the
   * rendered buffer in sync — same path used by the native scrollbar.
   */
  private _setupTouchScroll(): void {
    if (!this.terminalContainer) return;
    this._xtermViewport = this.terminalContainer.querySelector('.xterm-viewport');
    this.terminalContainer.addEventListener('touchstart', this.boundTouchStartHandler, { passive: true });
    this.terminalContainer.addEventListener('touchmove', this.boundTouchMoveHandler, { passive: false });
  }

  private _onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    // Viewport may not have existed when listeners were attached (deferred render).
    if (!this._xtermViewport) {
      this._xtermViewport = this.terminalContainer?.querySelector('.xterm-viewport') ?? null;
    }
    this._touchStartY = event.touches[0].clientY;
    this._touchStartScrollTop = this._xtermViewport?.scrollTop ?? 0;
  }

  private _onTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1 || !this._xtermViewport) return;

    const maxScroll = this._xtermViewport.scrollHeight - this._xtermViewport.clientHeight;
    if (maxScroll <= 0) return; // Nothing to scroll — let the gesture pass through.

    const deltaY = this._touchStartY - event.touches[0].clientY;
    this._xtermViewport.scrollTop = this._touchStartScrollTop + deltaY;

    // Stop the surrounding overlay from scrolling / selecting text while we pan.
    event.preventDefault();
  }

  private cleanupTerminal(): void {
    if (this.terminalContainer) {
      this.terminalContainer.removeEventListener('touchstart', this.boundTouchStartHandler);
      this.terminalContainer.removeEventListener('touchmove', this.boundTouchMoveHandler);
    }
    this._xtermViewport = null;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }

    this.fitAddon = null;
    this.terminalContainer = null;
  }

  override render() {
    return html`
      <style>
        .aos-terminal-outer {
          height: calc(100vh - 250px); /* Full viewport minus header/tabs/banner */
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }
        .aos-terminal-outer.cloud-mode {
          flex: 1;
          min-height: 0;
          height: auto;
        }
        .aos-terminal-inner {
          flex: 1;
          overflow: hidden;
        }
        /* Fix: xterm.js caches explicit viewport width after visibility changes.
           Resetting to initial forces recalculation on each reflow. */
        .xterm .xterm-viewport {
          width: initial !important;
        }
      </style>
      <div class="aos-terminal-outer ${this.cloudMode ? 'cloud-mode' : ''}">
        <div id="terminal-container" class="aos-terminal-inner"></div>
      </div>
    `;
  }

  /**
   * Use light DOM (no shadow root)
   * This allows terminal styles to apply correctly
   */
  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-terminal': AosTerminal;
  }
}
