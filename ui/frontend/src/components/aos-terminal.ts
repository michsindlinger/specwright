import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { gateway } from '../gateway';
import type { MessageHandler } from '../gateway';
import { themeService, type ResolvedTheme } from '../services/theme.service.js';
import { CLOUD_TERMINAL_CONFIG } from '../../../src/shared/types/cloud-terminal.protocol.js';
import type { PromptTemplate } from '../../../src/shared/types/prompt-templates.protocol.js';
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

/** True on touch-capable devices (mobile/tablet), where the native xterm
 *  scrollbar is too thin to grab reliably and we render a wide custom one. */
function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
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

  /** Reusable prompt templates shown in the terminal picker. */
  @state() private _templates: PromptTemplate[] = [];
  /** Whether the prompt-templates dropdown is currently open. */
  @state() private _templatesOpen = false;

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

  // Custom touch scrollbar: iOS Safari ignores ::-webkit-scrollbar styling for its
  // overlay scrollbars, so the native bar stays a hard-to-hit ~3px sliver. On touch
  // devices we hide the native bar and render a wide (28px hit zone) draggable thumb
  // synced to .xterm-viewport.scrollTop.
  private readonly _isTouch = isTouchDevice();

  // Copy-all button: native text selection is unreliable inside xterm (and on
  // touch devices our scroll handler preventDefaults touchmove, killing selection
  // entirely). A dedicated button copies the full buffer to the clipboard so the
  // user can always get the text out — on desktop and mobile alike.
  private _copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  // Scroll arrow buttons (touch): press-and-hold repeats the scroll step.
  private _scrollRepeatTimer: ReturnType<typeof setInterval> | null = null;

  private _scrollbarEl: HTMLElement | null = null;
  private _scrollbarThumb: HTMLElement | null = null;
  private _scrollbarDragging = false;
  private _scrollbarRenderDisposable: { dispose(): void } | null = null;
  private boundViewportScroll = () => this._updateScrollbarThumb();
  // Pointer Events (not Touch Events) so the drag stays glued to the thumb via
  // setPointerCapture even if the finger drifts off the thin hit zone — otherwise
  // iOS Safari hijacks the gesture into native viewport scrolling.
  private boundScrollbarPointerDown = (e: PointerEvent) => this._onScrollbarPointerDown(e);
  private boundScrollbarPointerMove = (e: PointerEvent) => this._onScrollbarPointerMove(e);
  private boundScrollbarPointerUp = (e: PointerEvent) => this._onScrollbarPointerUp(e);

  // Prompt templates picker: a button next to copy/paste that lists reusable
  // prompts and inserts the selected one into the terminal (and submits it).
  private boundTemplatesHandler: MessageHandler = (msg) => {
    this._templates = (msg.templates as PromptTemplate[]) ?? [];
  };
  private boundDocMouseDown = (e: MouseEvent) => this._onDocMouseDown(e);
  // xterm renders its selection on a canvas, so it is NOT a native DOM selection
  // (`window.getSelection()` is empty). A native Cmd/Ctrl+C therefore copies
  // nothing. We listen for the browser's `copy` event — which fires for both
  // Cmd+C and Ctrl+C regardless of which element holds focus — and inject the
  // terminal's selection into the clipboard synchronously.
  private boundDocCopy = (e: ClipboardEvent) => this._onDocCopy(e);

  override connectedCallback(): void {
    super.connectedCallback();
    themeService.onChange(this.boundThemeChangeHandler);
    gateway.on('prompt-templates:list', this.boundTemplatesHandler);
    gateway.send({ type: 'prompt-templates:list.get' });
    document.addEventListener('mousedown', this.boundDocMouseDown);
    document.addEventListener('copy', this.boundDocCopy);

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
    gateway.off('prompt-templates:list', this.boundTemplatesHandler);
    document.removeEventListener('mousedown', this.boundDocMouseDown);
    document.removeEventListener('copy', this.boundDocCopy);
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

    // Wide custom scrollbar for touch devices (no-op on desktop)
    this._setupCustomScrollbar();

    // Custom key event handler for terminal shortcuts.
    // attachCustomKeyEventHandler is called for ALL event types: keydown, keypress, keyup.
    // Returning false blocks xterm from processing the event.
    this.terminal.attachCustomKeyEventHandler((event) => {
      // Cmd/Ctrl+C with an active selection → copy, don't interrupt.
      // The actual clipboard write happens in _onDocCopy (the native `copy`
      // event). Here we only return false (when a selection exists) to stop
      // xterm from sending SIGINT (\x03) on Ctrl+C — crucially WITHOUT calling
      // preventDefault(), so the browser still fires its native `copy` event
      // that _onDocCopy services. With no selection we fall through and let
      // xterm handle Ctrl+C normally (sends SIGINT).
      if (event.key === 'c' && (event.metaKey || event.ctrlKey) && !event.shiftKey && event.type === 'keydown') {
        if (this.terminal?.hasSelection()) {
          return false; // Block xterm's SIGINT; native copy event still fires
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

  /**
   * Service the browser's native `copy` event. xterm's selection lives on a
   * canvas, so `window.getSelection()` is empty and a plain Cmd/Ctrl+C copies
   * nothing. When the terminal has a selection — and the user isn't copying a
   * real native selection elsewhere (e.g. chat text) — we write the cleaned
   * terminal selection into the clipboard synchronously via clipboardData.
   */
  private _onDocCopy(e: ClipboardEvent): void {
    // --- TEMP DIAGNOSTIC (remove after debugging cloud copy) ---
    const root = this.getRootNode();
    const rootGetSel = (root as { getSelection?: () => Selection | null }).getSelection;
    const shadowSel = typeof rootGetSel === 'function' ? (rootGetSel.call(root)?.toString() ?? '') : '(none)';
    console.log('[DocCopy]', {
      hasSelection: this.terminal?.hasSelection(),
      xtermSel: (this.terminal?.getSelection() ?? '').slice(0, 40),
      windowSel: (window.getSelection()?.toString() ?? '').slice(0, 40),
      shadowSel: (shadowSel ?? '').slice(0, 40),
      rootType: root?.constructor?.name,
    });
    // --- END DIAGNOSTIC ---
    if (!this.terminal?.hasSelection()) return;
    // Respect a genuine native selection: don't hijack copies made outside the
    // terminal while a terminal selection happens to linger.
    const nativeSelection = window.getSelection()?.toString() ?? '';
    if (nativeSelection.trim().length > 0) return;

    const cleaned = this._cleanSelection();
    if (!cleaned || !e.clipboardData) return;

    e.clipboardData.setData('text/plain', cleaned);
    e.preventDefault();
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

  /**
   * Extract the full terminal buffer (scrollback + viewport) as clean text:
   * - trims the trailing padding xterm adds to fill each row
   * - rejoins visually-wrapped rows into their original logical lines via the
   *   buffer's isWrapped flag
   * - strips leading/trailing blank lines
   */
  private _getFullBufferText(): string {
    if (!this.terminal) return '';
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (!line) continue;
      const text = line.translateToString(true);
      if (i > 0 && line.isWrapped) {
        currentLine += text;
      } else {
        if (i > 0) lines.push(currentLine);
        currentLine = text;
      }
    }
    lines.push(currentLine);

    return lines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
  }

  /**
   * Copy the entire terminal content to the clipboard. Triggered by the
   * floating copy button — works on touch devices where text selection is
   * blocked by our scroll handling.
   */
  private async _onCopyAllClick(): Promise<void> {
    const text = this._getFullBufferText();
    if (!text) {
      this._showPasteStatus('Terminal ist leer – nichts zu kopieren', 'info');
      return;
    }
    if (!navigator.clipboard?.writeText) {
      this._showPasteStatus('Kopieren nicht verfügbar (Zwischenablage gesperrt)', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this._flashCopied();
      this._showPasteStatus('Terminal-Inhalt kopiert', 'success');
    } catch (err) {
      this._showPasteStatus(
        `Kopieren fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    }
  }

  /** Briefly swap the copy icon for a checkmark to confirm the copy. */
  private _flashCopied(): void {
    const btn = this.querySelector('.aos-term-copy');
    if (!btn) return;
    btn.classList.add('is-copied');
    if (this._copyResetTimer) clearTimeout(this._copyResetTimer);
    this._copyResetTimer = setTimeout(() => {
      btn.classList.remove('is-copied');
      this._copyResetTimer = null;
    }, 1500);
  }

  /**
   * Read the browser clipboard and send it to the PTY as input, followed by a
   * carriage return so it is submitted immediately — same as typing the text
   * and pressing Enter. Internal newlines are preserved (sent as \n, matching
   * the Shift+Enter prompt-newline path), and a trailing newline is dropped so
   * the input is submitted exactly once.
   */
  private async _onPasteAndSendClick(): Promise<void> {
    if (!this.terminalSessionId) return;
    if (!navigator.clipboard?.readText) {
      this._showPasteStatus('Einfügen nicht verfügbar (Zwischenablage gesperrt)', 'error');
      return;
    }
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      this._showPasteStatus(
        `Einfügen fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
      return;
    }
    if (!text) {
      this._showPasteStatus('Zwischenablage ist leer', 'info');
      return;
    }

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
    this._sendInput(normalized + '\r');
    this._showPasteStatus('Eingefügt und abgeschickt', 'success');
  }

  /** Toggle the prompt-templates dropdown, refreshing the list when opening. */
  private _onTemplatesClick(): void {
    this._templatesOpen = !this._templatesOpen;
    if (this._templatesOpen) {
      gateway.send({ type: 'prompt-templates:list.get' });
    }
  }

  /**
   * Insert the selected template into the terminal and submit it immediately
   * (mirrors the paste-and-send normalization: \r\n/\r → \n, trailing newlines
   * stripped, single trailing \r to press Enter).
   */
  private _onSelectTemplate(template: PromptTemplate): void {
    this._templatesOpen = false;
    if (!this.terminalSessionId) {
      this._showPasteStatus('Kein aktives Terminal', 'error');
      return;
    }
    const normalized = template.content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n+$/, '');
    this._sendInput(normalized + '\r');
    this._showPasteStatus(`Vorlage "${template.name}" eingefügt`, 'success');
  }

  /** Close the templates dropdown when clicking outside of it. */
  private _onDocMouseDown(e: MouseEvent): void {
    if (!this._templatesOpen) return;
    const wrap = this.querySelector('.aos-term-templates-wrap');
    if (wrap && !e.composedPath().includes(wrap)) {
      this._templatesOpen = false;
    }
  }

  /** Send raw input to the active PTY, routing by cloud vs. workflow mode. */
  private _sendInput(data: string): void {
    if (!this.terminalSessionId) return;
    if (this.cloudMode) {
      gateway.send({
        type: 'cloud-terminal:input',
        sessionId: this.terminalSessionId,
        data,
        timestamp: new Date().toISOString(),
      });
    } else {
      gateway.sendTerminalInput(this.terminalSessionId, data);
    }
  }

  /**
   * Start scrolling when an up/down arrow button is pressed. Uses `pointerdown`
   * (not `click`) for an immediate response on touch, plus a repeat timer so
   * holding the button keeps scrolling.
   */
  private _onScrollPress(event: PointerEvent, direction: 'up' | 'down'): void {
    event.preventDefault();
    event.stopPropagation();
    this._stopScrollRepeat();
    this._scrollStep(direction); // immediate response to the tap
    this._scrollRepeatTimer = setInterval(() => this._scrollStep(direction), 90);
    const btn = event.currentTarget as HTMLElement | null;
    try {
      btn?.setPointerCapture(event.pointerId);
    } catch {
      // Older engines without pointer capture — harmless.
    }
  }

  /** Stop the press-and-hold scroll repeat. */
  private _stopScrollRepeat = (): void => {
    if (this._scrollRepeatTimer !== null) {
      clearInterval(this._scrollRepeatTimer);
      this._scrollRepeatTimer = null;
    }
  };

  /**
   * Scroll one step. Two cases:
   *
   * 1. Full-screen apps (the Claude Code TUI) run on the alternate screen with
   *    mouse tracking enabled and NO scrollback — xterm has nothing to scroll.
   *    We send mouse-wheel events so the app scrolls its own view, exactly as a
   *    real mouse wheel would.
   * 2. Plain shell output: scroll the same `.xterm-viewport` the custom
   *    scrollbar drives, via programmatic scrollTop, and refresh the thumb.
   */
  private _scrollStep(direction: 'up' | 'down'): void {
    const term = this.terminal;
    if (!term) return;

    if (term.modes.mouseTrackingMode !== 'none') {
      this._sendWheel(direction);
      return;
    }

    const vp = this._resolveViewport();
    if (!vp) return;
    const maxScroll = vp.scrollHeight - vp.clientHeight;
    if (maxScroll <= 0) return;
    const step = Math.max(40, vp.clientHeight * 0.3);
    vp.scrollTop = Math.min(
      maxScroll,
      Math.max(0, vp.scrollTop + (direction === 'up' ? -step : step)),
    );
    this._updateScrollbarThumb();
  }

  /**
   * Emulate mouse-wheel scrolling by sending SGR (1006) mouse events to the
   * PTY: button 64 = wheel up, 65 = wheel down, reported at the centre of the
   * grid. A few notches per press for a useful step.
   */
  private _sendWheel(direction: 'up' | 'down', notches = 3): void {
    const term = this.terminal;
    if (!term) return;
    const col = Math.max(1, Math.floor(term.cols / 2));
    const row = Math.max(1, Math.floor(term.rows / 2));
    const cb = direction === 'up' ? 64 : 65;
    let seq = '';
    for (let i = 0; i < notches; i++) {
      seq += `\x1b[<${cb};${col};${row}M`;
    }
    this._sendInput(seq);
  }

  /** Lazily resolve the xterm viewport element (it renders after open()). */
  private _resolveViewport(): HTMLElement | null {
    if (!this._xtermViewport) {
      this._xtermViewport = this.terminalContainer?.querySelector('.xterm-viewport') ?? null;
    }
    return this._xtermViewport;
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

  /**
   * Wire up the wide custom scrollbar (touch devices only).
   *
   * The native overlay scrollbar is hidden via CSS (`.touch .xterm-viewport`);
   * here we keep our thumb in sync with `.xterm-viewport.scrollTop` (via the
   * viewport's `scroll` event and xterm's `onRender`, which fires on new output)
   * and translate drags inside the 28px hit zone into scroll position.
   */
  private _setupCustomScrollbar(): void {
    if (!this._isTouch) return;
    this._scrollbarEl = this.querySelector('.aos-term-scrollbar');
    this._scrollbarThumb = this.querySelector('.aos-term-scrollbar__thumb');
    if (!this._scrollbarEl || !this._scrollbarThumb || !this._xtermViewport) return;

    this._xtermViewport.addEventListener('scroll', this.boundViewportScroll, { passive: true });
    this._scrollbarEl.addEventListener('pointerdown', this.boundScrollbarPointerDown);
    this._scrollbarEl.addEventListener('pointermove', this.boundScrollbarPointerMove);
    this._scrollbarEl.addEventListener('pointerup', this.boundScrollbarPointerUp);
    this._scrollbarEl.addEventListener('pointercancel', this.boundScrollbarPointerUp);

    // Re-measure whenever xterm repaints (new output grows scrollHeight).
    this._scrollbarRenderDisposable = this.terminal?.onRender(() => this._updateScrollbarThumb()) ?? null;
    this._updateScrollbarThumb();
  }

  /** Resize/reposition the thumb to mirror the viewport's scroll metrics. */
  private _updateScrollbarThumb(): void {
    if (!this._scrollbarEl || !this._scrollbarThumb || !this._xtermViewport) return;
    const vp = this._xtermViewport;
    const maxScroll = vp.scrollHeight - vp.clientHeight;
    if (maxScroll <= 0) {
      this._scrollbarEl.classList.remove('is-scrollable');
      return;
    }
    this._scrollbarEl.classList.add('is-scrollable');
    const trackH = this._scrollbarEl.clientHeight;
    const thumbH = Math.max(36, (vp.clientHeight / vp.scrollHeight) * trackH);
    const top = (vp.scrollTop / maxScroll) * (trackH - thumbH);
    this._scrollbarThumb.style.height = `${thumbH}px`;
    this._scrollbarThumb.style.transform = `translateY(${top}px)`;
  }

  private _onScrollbarPointerDown(event: PointerEvent): void {
    if (!this._xtermViewport) return;
    this._scrollbarDragging = true;
    this._scrollbarEl?.classList.add('is-active');
    // Capture the pointer so every subsequent move/up fires on the scrollbar even
    // if the finger drifts off the 28px hit zone. Without this iOS reassigns the
    // gesture to the viewport and starts native scrolling.
    try {
      this._scrollbarEl?.setPointerCapture(event.pointerId);
    } catch {
      // Older engines without pointer capture — touch-action:none still guards us.
    }
    this._scrollToTouch(event.clientY);
    event.preventDefault();
  }

  private _onScrollbarPointerMove(event: PointerEvent): void {
    if (!this._scrollbarDragging) return;
    this._scrollToTouch(event.clientY);
    event.preventDefault();
  }

  private _onScrollbarPointerUp(event: PointerEvent): void {
    if (!this._scrollbarDragging) return;
    this._scrollbarDragging = false;
    this._scrollbarEl?.classList.remove('is-active');
    try {
      this._scrollbarEl?.releasePointerCapture(event.pointerId);
    } catch {
      // No-op if capture was never acquired.
    }
  }

  /**
   * Map an absolute finger Y to a scroll position, centering the thumb on the
   * finger. Setting `scrollTop` fires xterm's own scroll handler, keeping the
   * rendered buffer in sync (same path as the native scrollbar).
   */
  private _scrollToTouch(clientY: number): void {
    if (!this._scrollbarEl || !this._xtermViewport) return;
    const vp = this._xtermViewport;
    const maxScroll = vp.scrollHeight - vp.clientHeight;
    if (maxScroll <= 0) return;
    const rect = this._scrollbarEl.getBoundingClientRect();
    const thumbH = Math.max(36, (vp.clientHeight / vp.scrollHeight) * rect.height);
    const usableTrack = rect.height - thumbH;
    const ratio = usableTrack > 0
      ? Math.min(1, Math.max(0, (clientY - rect.top - thumbH / 2) / usableTrack))
      : 0;
    vp.scrollTop = ratio * maxScroll;
    this._updateScrollbarThumb();
  }

  private cleanupTerminal(): void {
    if (this.terminalContainer) {
      this.terminalContainer.removeEventListener('touchstart', this.boundTouchStartHandler);
      this.terminalContainer.removeEventListener('touchmove', this.boundTouchMoveHandler);
    }
    if (this._xtermViewport) {
      this._xtermViewport.removeEventListener('scroll', this.boundViewportScroll);
    }
    if (this._scrollbarEl) {
      this._scrollbarEl.removeEventListener('pointerdown', this.boundScrollbarPointerDown);
      this._scrollbarEl.removeEventListener('pointermove', this.boundScrollbarPointerMove);
      this._scrollbarEl.removeEventListener('pointerup', this.boundScrollbarPointerUp);
      this._scrollbarEl.removeEventListener('pointercancel', this.boundScrollbarPointerUp);
    }
    this._scrollbarRenderDisposable?.dispose();
    this._scrollbarRenderDisposable = null;
    if (this._copyResetTimer) {
      clearTimeout(this._copyResetTimer);
      this._copyResetTimer = null;
    }
    this._stopScrollRepeat();
    this._scrollbarEl = null;
    this._scrollbarThumb = null;
    this._scrollbarDragging = false;
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
          position: relative;
        }
        .aos-terminal-host {
          position: absolute;
          inset: 0;
        }
        /* Fix: xterm.js caches explicit viewport width after visibility changes.
           Resetting to initial forces recalculation on each reflow. */
        .xterm .xterm-viewport {
          width: initial !important;
        }
        /* Touch devices: fully disable the native scroll behaviour and replace it
           with the wide custom .aos-term-scrollbar below.

           overflow:hidden stops iOS Safari from showing its own overlay scroll
           indicator and from hijacking a scrollbar drag into native viewport
           scrolling — programmatic scrollTop (driven by both the body touch-drag
           bridge and the custom scrollbar) still works on a hidden-overflow box.
           This is the key fix: on iOS, ::-webkit-scrollbar can't suppress the
           native overlay indicator, only removing overflow scrolling can. */
        .aos-terminal-inner.touch .xterm-viewport {
          overflow: hidden !important;
          scrollbar-width: none;
          -ms-overflow-style: none;
          overscroll-behavior: contain;
        }
        .aos-terminal-inner.touch .xterm-viewport::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        /* Wide custom scrollbar: 28px hit zone, 7px visible thumb. */
        .aos-term-scrollbar {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 28px;
          z-index: 5;
          display: none;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
        }
        .aos-term-scrollbar.is-scrollable {
          display: block;
        }
        .aos-term-scrollbar__thumb {
          position: absolute;
          top: 0;
          right: 6px;
          width: 7px;
          min-height: 36px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.4);
          opacity: 0.6;
          transition: opacity 0.15s ease, width 0.12s ease, background 0.15s ease;
          will-change: transform, height;
        }
        .aos-term-scrollbar.is-active .aos-term-scrollbar__thumb {
          opacity: 0.95;
          width: 11px;
          background: var(--accent-color, #00d4ff);
        }
        /* Floating action toolbar (paste + copy). Sits top-right, clear of the
           custom scrollbar's 28px hit zone so dragging the scrollbar still works. */
        .aos-term-actions {
          position: absolute;
          top: 8px;
          right: 36px;
          z-index: 6;
          display: flex;
          gap: 6px;
        }
        .aos-term-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.18));
          border-radius: 8px;
          background: var(--color-bg-sidebar, rgba(15, 31, 51, 0.78));
          color: var(--color-text-secondary, #B8C9DB);
          cursor: pointer;
          opacity: 0.55;
          transition: opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(4px);
        }
        .aos-term-action:hover {
          opacity: 1;
        }
        .aos-term-action:active {
          background: var(--color-bg-hover, rgba(45, 74, 111, 0.9));
        }
        /* On touch devices keep them permanently visible (no hover). */
        .aos-terminal-inner.touch .aos-term-action {
          opacity: 0.85;
        }
        .aos-term-copy .icon-check {
          display: none;
        }
        .aos-term-copy.is-copied {
          opacity: 1;
          color: var(--color-success, #22c55e);
          border-color: var(--color-success, #22c55e);
        }
        .aos-term-copy.is-copied .icon-copy {
          display: none;
        }
        .aos-term-copy.is-copied .icon-check {
          display: block;
        }
        /* Prompt templates picker (button + dropdown menu). */
        .aos-term-templates-wrap {
          position: relative;
          display: flex;
        }
        .aos-term-templates-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 200px;
          max-width: 320px;
          max-height: 320px;
          overflow-y: auto;
          padding: 4px;
          background: var(--color-bg-sidebar, rgba(15, 31, 51, 0.96));
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.18));
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(8px);
          z-index: 10;
        }
        .aos-term-templates-item {
          display: block;
          width: 100%;
          padding: 8px 10px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--color-text-primary, #E6F0FA);
          font-size: 13px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }
        .aos-term-templates-item:hover {
          background: var(--color-bg-hover, rgba(45, 74, 111, 0.9));
        }
        .aos-term-templates-empty {
          padding: 10px;
          color: var(--color-text-secondary, #B8C9DB);
          font-size: 13px;
          white-space: nowrap;
        }
      </style>
      <div class="aos-terminal-outer ${this.cloudMode ? 'cloud-mode' : ''}">
        <div class="aos-terminal-inner ${this._isTouch ? 'touch' : ''}">
          <div id="terminal-container" class="aos-terminal-host"></div>
          <div class="aos-term-actions">
            <div class="aos-term-templates-wrap">
              <button
                class="aos-term-action aos-term-templates"
                type="button"
                title="Prompt-Vorlagen"
                aria-label="Prompt-Vorlagen einfügen"
                aria-haspopup="true"
                aria-expanded=${this._templatesOpen ? 'true' : 'false'}
                @click=${() => this._onTemplatesClick()}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2.5" y="1.5" width="9" height="13" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M5 5h4M5 8h4M5 11h2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
              ${this._templatesOpen
                ? html`<div class="aos-term-templates-menu" role="menu">
                    ${this._templates.length === 0
                      ? html`<div class="aos-term-templates-empty">Keine Vorlagen vorhanden</div>`
                      : this._templates.map(
                          (t) => html`<button
                            class="aos-term-templates-item"
                            type="button"
                            role="menuitem"
                            title=${t.content}
                            @click=${() => this._onSelectTemplate(t)}
                          >${t.name}</button>`
                        )}
                  </div>`
                : ''}
            </div>
            <button
              class="aos-term-action aos-term-paste"
              type="button"
              title="Zwischenablage einfügen & abschicken"
              aria-label="Zwischenablage einfügen und abschicken"
              @click=${() => void this._onPasteAndSendClick()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5.5 2.5h5A1.5 1.5 0 0 1 12 4v8.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="5.5" y="1.5" width="4" height="2.4" rx="0.8" stroke="currentColor" stroke-width="1.3"/>
                <path d="M5 9.5h4.5m0 0L8 8m1.5 1.5L8 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              class="aos-term-action aos-term-copy"
              type="button"
              title="Terminal-Inhalt kopieren"
              aria-label="Terminal-Inhalt kopieren"
              @click=${() => void this._onCopyAllClick()}
            >
              <svg class="icon-copy" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
                <path d="M3.5 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
              <svg class="icon-check" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            ${this._isTouch
              ? html`
                  <button
                    class="aos-term-action aos-term-scroll-up"
                    type="button"
                    title="Nach oben scrollen"
                    aria-label="Terminal nach oben scrollen"
                    @pointerdown=${(e: PointerEvent) => this._onScrollPress(e, 'up')}
                    @pointerup=${this._stopScrollRepeat}
                    @pointercancel=${this._stopScrollRepeat}
                    @pointerleave=${this._stopScrollRepeat}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button
                    class="aos-term-action aos-term-scroll-down"
                    type="button"
                    title="Nach unten scrollen"
                    aria-label="Terminal nach unten scrollen"
                    @pointerdown=${(e: PointerEvent) => this._onScrollPress(e, 'down')}
                    @pointerup=${this._stopScrollRepeat}
                    @pointercancel=${this._stopScrollRepeat}
                    @pointerleave=${this._stopScrollRepeat}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                `
              : ''}
          </div>
          ${this._isTouch
            ? html`<div class="aos-term-scrollbar"><div class="aos-term-scrollbar__thumb"></div></div>`
            : ''}
        </div>
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
