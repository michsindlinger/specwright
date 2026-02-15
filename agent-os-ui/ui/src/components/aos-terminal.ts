import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { gateway } from '../gateway';
import type { MessageHandler } from '../gateway';
import '@xterm/xterm/css/xterm.css';

/** Dark theme colors matching the application design */
const DARK_THEME = {
  background: '#1e1e1e',
  foreground: '#e0e0e0',
  cursor: '#007acc',
  selectionBackground: '#264f78',
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

  override connectedCallback(): void {
    super.connectedCallback();

    // Wait for first render before initializing terminal
    this.updateComplete.then(() => {
      this.initializeTerminal();
      this.setupGatewayListeners();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupTerminal();
    this.cleanupGatewayListeners();
  }

  /**
   * Refresh terminal rendering after becoming visible again.
   * Refits dimensions and requests the full buffer from the server
   * for a clean re-render (clear + write).
   */
  public refreshTerminal(): void {
    if (this.fitAddon && this.terminal) {
      this.fitAddon.fit();

      // Request full buffer from server for a clean re-render.
      // The buffer-response handler does clear() + write(buffer).
      if (this.terminalSessionId) {
        if (this.cloudMode) {
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
  }

  private initializeTerminal(): void {
    this.terminalContainer = this.querySelector('#terminal-container') as HTMLElement;
    if (!this.terminalContainer) {
      console.error('Terminal container not found');
      return;
    }

    // Create xterm.js Terminal with theme
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 1.5,
      theme: DARK_THEME,
      allowProposedApi: true // Required for some addons
    });

    // Create fit addon for auto-resize
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Open terminal in container
    this.terminal.open(this.terminalContainer);

    // Fit terminal to container
    this.fitAddon.fit();

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

    // Setup resize observer
    this.setupResizeObserver();

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
        this.terminal.write(message.data as string);
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

    // Handle buffer response for reconnection
    this.terminalBufferResponseHandler = (message) => {
      if (message.sessionId === this.terminalSessionId && this.terminal) {
        const buffer = message.buffer as string;
        if (buffer && buffer.length > 0) {
          this.terminal.clear();
          this.terminal.write(buffer);
        }
      }
    };
    gateway.on('cloud-terminal:buffer-response', this.terminalBufferResponseHandler);
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
          this.terminal.clear();
          this.terminal.write(buffer.join('\n'));
        }
      }
    };
    gateway.on('terminal.buffer.response', this.terminalBufferResponseHandler);
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
  }

  private setupResizeObserver(): void {
    if (!this.terminalContainer || !this.terminal || !this.fitAddon) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.fitAddon && this.terminal && this.terminalContainer) {
        // Skip when container is hidden (display: none gives zero dimensions).
        // This prevents sending wrong resize to the backend PTY.
        if (this.terminalContainer.offsetWidth === 0 || this.terminalContainer.offsetHeight === 0) {
          return;
        }

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

  private cleanupTerminal(): void {
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
        .terminal-wrapper {
          height: calc(100vh - 250px); /* Full viewport minus header/tabs/banner */
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }
        .terminal-wrapper.cloud-mode {
          height: 100%;
          min-height: 0;
        }
        .terminal-container {
          flex: 1;
          overflow: hidden;
        }
      </style>
      <div class="terminal-wrapper ${this.cloudMode ? 'cloud-mode' : ''}">
        <div id="terminal-container" class="terminal-container"></div>
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
