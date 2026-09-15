export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Image payload for chat messages
 */
export interface ImagePayload {
  /** Base64 encoded image data or path reference */
  data: string;
  /** MIME type (image/png, image/jpeg, etc.) */
  mimeType: string;
  /** Original filename */
  filename: string;
  /** True if data is base64, false if path reference */
  isBase64: boolean;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export class Gateway {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 800; // Moltbot-pattern: start at 800ms
  private maxReconnectDelay = 15000; // Moltbot-pattern: max 15 seconds
  private isConnected = false;
  private isReconnecting = false;
  private livenessCheckInProgress = false;
  private currentProjectPath: string | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Dev (Vite :5173) forces backend port 3001; prod (served by backend or behind a
    // reverse-proxy/tunnel like Cloudflare) uses window.location.host as-is, so the
    // WebSocket follows the same hostname/port the page was loaded from.
    const host = import.meta.env.DEV
      ? `${window.location.hostname}:3001`
      : window.location.host;
    this.url = `${protocol}//${host}`;

    this.setupLifecycleHandlers();
  }

  /**
   * Mobile Safari (and other mobile browsers) freeze JS timers and silently
   * kill WebSockets when the tab is backgrounded. When the user returns,
   * the socket is often a "zombie" (readyState OPEN but server already
   * terminated it via heartbeat) or a scheduled reconnect is stuck in a
   * long backoff. These handlers force an immediate connection check the
   * moment the page becomes visible/focused/online again.
   */
  private setupLifecycleHandlers(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.ensureConnected();
      }
    });
    // pageshow fires on bfcache restore (iOS back/forward navigation)
    window.addEventListener('pageshow', () => this.ensureConnected());
    window.addEventListener('online', () => this.ensureConnected());
    window.addEventListener('focus', () => this.ensureConnected());
  }

  /**
   * Verify the connection is alive and reconnect immediately if not.
   * - Pending backoff reconnect: fire it now instead of waiting.
   * - Closed/missing socket: connect immediately.
   * - Seemingly open socket: send an app-level ping and force-close if no
   *   pong arrives (zombie connection detection after tab suspend).
   */
  public ensureConnected(): void {
    // Reset backoff - user is actively returning to the app
    this.reconnectDelay = 800;

    if (this.reconnectTimeout !== null) {
      // A delayed reconnect is scheduled - fire it immediately instead
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      this.connect();
      return;
    }

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect();
      return;
    }

    if (this.ws.readyState === WebSocket.OPEN && !this.livenessCheckInProgress) {
      // Socket claims to be open - verify with app-level ping/pong.
      // After iOS tab suspension the socket can be dead without onclose firing.
      this.livenessCheckInProgress = true;
      const ws = this.ws;
      this.waitFor('pong', 3000)
        .catch(() => {
          // No pong - zombie connection. Force close to trigger reconnect.
          if (this.ws === ws) {
            console.warn('Gateway liveness check failed, forcing reconnect');
            ws.close();
          }
        })
        .finally(() => {
          this.livenessCheckInProgress = false;
        });
      this.send({ type: 'ping' });
    }
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Gateway connected');
      this.isConnected = true;
      this.isReconnecting = false;
      this.reconnectDelay = 800; // Reset to initial delay on successful connect

      // Re-register project context after reconnect
      if (this.currentProjectPath) {
        this.send({ type: 'project.switch', path: this.currentProjectPath });
      }

      this.emit({ type: 'gateway.connected' });
    };

    this.ws.onclose = () => {
      console.log('Gateway disconnected');
      const wasConnected = this.isConnected;
      this.isConnected = false;
      this.emit({ type: 'gateway.disconnected' });
      if (wasConnected) {
        // Only emit reconnecting if we were previously connected
        this.isReconnecting = true;
        this.emit({ type: 'gateway.reconnecting', delay: this.reconnectDelay });
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = (event) => {
      console.error('Gateway error:', event);
      this.emit({ type: 'gateway.error' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.emit(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  public send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  public on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  public off(type: string, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /**
   * Register a one-time handler that removes itself after being called.
   */
  public once(type: string, handler: MessageHandler): void {
    const wrappedHandler: MessageHandler = (message) => {
      this.off(type, wrappedHandler);
      handler(message);
    };
    this.on(type, wrappedHandler);
  }

  /**
   * Wait for a specific message type with optional timeout.
   * Returns a Promise that resolves with the message or rejects on timeout.
   */
  public waitFor(type: string, timeoutMs = 5000): Promise<WebSocketMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(type, handler);
        reject(new Error(`Timeout waiting for ${type}`));
      }, timeoutMs);

      const handler: MessageHandler = (message) => {
        clearTimeout(timeoutId);
        this.off(type, handler);
        resolve(message);
      };

      this.on(type, handler);
    });
  }

  private emit(message: WebSocketMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Check if WebSocket is currently in CONNECTING state or about to connect.
   * Used for optimistic UI during initial connection.
   */
  public isConnecting(): boolean {
    // Consider "connecting" if:
    // 1. WebSocket exists and is in CONNECTING state
    // 2. OR a reconnect is scheduled (will connect soon)
    return (
      (this.ws !== null && this.ws.readyState === WebSocket.CONNECTING) ||
      this.reconnectTimeout !== null
    );
  }

  public getReconnectingStatus(): boolean {
    return this.isReconnecting;
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  /**
   * Set the current project path for this connection.
   * Used for reconnection and message routing.
   */
  public setProjectPath(path: string | null): void {
    this.currentProjectPath = path;
    if (path && this.isConnected) {
      this.send({ type: 'project.switch', path });
    }
  }

  /**
   * Get the current project path.
   */
  public getProjectPath(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Chat Settings Methods
   * Model selection and chat configuration
   *
   * Incoming Messages (received via on() handlers):
   * - chat.settings.response: Backend confirmation of settings update
   */

  /**
   * Send model settings update to backend
   * @param providerId - The provider ID (e.g., 'anthropic', 'glm')
   * @param modelId - The model ID (e.g., 'opus-4.5', 'sonnet-4.5')
   */
  public sendModelSettings(providerId: string, modelId: string): void {
    this.send({
      type: 'chat.settings.update',
      providerId,
      modelId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Terminal I/O Methods
   * Bidirectional communication for terminal sessions
   *
   * Incoming Messages (received via on() handlers):
   * - terminal.data: PTY output data from backend
   * - terminal.exit: PTY process exit event
   * - terminal.buffer.response: Buffered output for reconnect restore
   * - terminal.error: Terminal operation errors
   */

  /**
   * Send terminal input to backend
   * @param executionId - Terminal session ID
   * @param data - User input data (keystrokes, paste)
   */
  public sendTerminalInput(executionId: string, data: string): void {
    this.send({
      type: 'terminal.input',
      executionId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send terminal resize event to backend
   * @param executionId - Terminal session ID
   * @param cols - Number of columns
   * @param rows - Number of rows
   */
  public sendTerminalResize(executionId: string, cols: number, rows: number): void {
    this.send({
      type: 'terminal.resize',
      executionId,
      cols,
      rows,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request terminal buffer restore on reconnect
   * @param executionId - Terminal session ID
   */
  public requestTerminalBuffer(executionId: string): void {
    this.send({
      type: 'terminal.buffer.request',
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Chat with Images Methods
   * Send chat messages with attached images
   *
   * Incoming Messages (received via on() handlers):
   * - chat.send.with-images.ack: Backend acknowledgment of image message
   * - chat.send.with-images.error: Error processing image message
   */

  /**
   * Send a chat message with attached images.
   * Images are sent as part of the WebSocket message.
   *
   * @param content - The text content of the message
   * @param images - Array of image payloads to attach
   * @param model - Selected model configuration
   */
  public sendChatWithImages(
    content: string,
    images: ImagePayload[],
    model?: { providerId: string; modelId: string }
  ): void {
    this.send({
      type: 'chat.send.with-images',
      content,
      images,
      model,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request git status for the current project
   */
  public requestGitStatus(): void {
    this.send({
      type: 'git:status',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request list of local branches
   */
  public requestGitBranches(): void {
    this.send({
      type: 'git:branches',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Pull from remote
   * @param strategy - Pull strategy: 'merge' | 'rebase' | 'ff-only'. If omitted, uses default git behavior.
   */
  public requestGitPull(strategy?: 'merge' | 'rebase' | 'ff-only'): void {
    this.send({
      type: 'git:pull',
      strategy,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Push to remote
   */
  public requestGitPush(): void {
    this.send({
      type: 'git:push',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Commit selected files with a message
   * @param files - Array of file paths to stage and commit
   * @param message - Commit message
   */
  public sendGitCommit(files: string[], message: string): void {
    this.send({
      type: 'git:commit',
      files,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Checkout a branch
   * @param branch - Branch name to checkout
   */
  public sendGitCheckout(branch: string): void {
    this.send({
      type: 'git:checkout',
      branch,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request PR info for the current branch
   *
   * Incoming Messages:
   * - git:pr-info:response: PR info data (number, state, url, title) or null
   */
  public requestGitPrInfo(): void {
    this.send({
      type: 'git:pr-info',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Revert files to their last committed state
   * @param files - Array of file paths to revert
   *
   * Incoming Messages:
   * - git:revert:response: Revert result with revertedFiles[] and failedFiles[]
   */
  public sendGitRevert(files: string[]): void {
    this.send({
      type: 'git:revert',
      files,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Delete an untracked file
   * @param file - File path to delete
   *
   * Incoming Messages:
   * - git:delete-untracked:response: Result with { file, success }
   */
  public sendGitDeleteUntracked(file: string): void {
    this.send({
      type: 'git:delete-untracked',
      file,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request auto-generated commit message based on file changes
   * @param files - Array of file paths to analyze
   *
   * Incoming Messages:
   * - git:generate-commit-message:response: Generated commit message { message: string }
   */
  public requestGenerateCommitMessage(files: string[]): void {
    this.send({
      type: 'git:generate-commit-message',
      files,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request the read-only diff of a single file
   * @param file - File path (relative to repo root) to diff
   *
   * Incoming Messages:
   * - git:diff:response: GitFileDiffResult (diff text, isBinary, isUntracked, truncated)
   */
  public requestGitDiff(file: string): void {
    this.send({
      type: 'git:diff',
      file,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start a voice call session
   * @param callId - Unique call identifier
   */
  public sendVoiceCallStart(callId: string): void {
    this.send({
      type: 'voice:call:start',
      callId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * End a voice call session
   * @param callId - Call identifier to end
   */
  public sendVoiceCallEnd(callId: string): void {
    this.send({
      type: 'voice:call:end',
      callId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send an audio chunk for STT processing
   * @param callId - Call identifier
   * @param audio - Base64-encoded PCM audio data
   * @param sampleRate - Audio sample rate (default 16000)
   * @param encoding - Audio encoding (default 'pcm16')
   */
  public sendVoiceAudioChunk(
    callId: string,
    audio: string,
    sampleRate = 16000,
    encoding = 'pcm16'
  ): void {
    this.send({
      type: 'voice:audio:chunk',
      callId,
      audio,
      sampleRate,
      encoding,
      timestamp: new Date().toISOString()
    });
  }

}

export const gateway = new Gateway();
