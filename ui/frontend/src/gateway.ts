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
  private currentProjectPath: string | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '3001';
    this.url = `${protocol}//${host}:${port}`;
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
   * Spec Methods
   * Spec management operations
   *
   * Incoming Messages (received via on() handlers):
   * - specs.list: List of available specs
   * - specs.delete: Confirmation of spec deletion
   */

  /**
   * Request list of available specs
   */
  public requestSpecsList(): void {
    this.send({
      type: 'specs.list',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request list of files for a specific spec
   * @param specId - The spec ID to get files for
   */
  public requestSpecFiles(specId: string): void {
    this.send({
      type: 'specs.files',
      specId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Delete a spec
   * @param specId - The spec ID to delete
   */
  public sendSpecDelete(specId: string): void {
    this.send({
      type: 'specs.delete',
      specId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Queue Methods (SKQ-004)
   * Spec execution queue management
   *
   * Incoming Messages (received via on() handlers):
   * - queue.state: Current queue state (items array, currentlyRunning)
   * - queue.add.ack: Confirmation of adding item to queue
   * - queue.add.error: Error when adding to queue
   * - queue.remove.ack: Confirmation of removing item from queue
   * - queue.remove.error: Error when removing from queue
   * - queue.reorder.ack: Confirmation of reordering queue
   * - queue.reorder.error: Error when reordering queue
   * - queue.clear.ack: Confirmation of clearing queue
   * - queue.clearCompleted.ack: Confirmation of clearing completed items
   */

  /**
   * Add a spec to the global queue
   * @param specId - The spec ID to add
   * @param specName - Display name of the spec
   * @param projectPath - Project path the spec belongs to
   * @param projectName - Display name of the project
   * @param gitStrategy - Git strategy (branch or worktree)
   * @param position - Optional position (defaults to end)
   */
  public sendQueueAdd(
    specId: string,
    specName: string,
    projectPath: string,
    projectName: string,
    gitStrategy?: 'branch' | 'worktree' | 'current-branch',
    position?: number,
    itemType?: 'spec' | 'backlog'
  ): void {
    this.send({
      type: 'queue.add',
      specId,
      specName,
      projectPath,
      projectName,
      gitStrategy,
      position,
      itemType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Remove an item from the queue
   * @param queueItemId - The queue item ID to remove
   */
  public sendQueueRemove(queueItemId: string): void {
    this.send({
      type: 'queue.remove',
      queueItemId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reorder a queue item to a new position
   * @param queueItemId - The queue item ID to move
   * @param newPosition - The new position index
   */
  public sendQueueReorder(queueItemId: string, newPosition: number): void {
    this.send({
      type: 'queue.reorder',
      queueItemId,
      newPosition,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request current queue state
   */
  public requestQueueState(): void {
    this.send({
      type: 'queue.state',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clear all items from the queue
   */
  public sendQueueClear(): void {
    this.send({
      type: 'queue.clear',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clear completed, failed, and skipped items from the queue
   */
  public sendQueueClearCompleted(): void {
    this.send({
      type: 'queue.clearCompleted',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * SKQ-005: Queue Execution Methods
   * Start/stop queue execution
   *
   * Incoming Messages (received via on() handlers):
   * - queue.start.ack: Queue started, first spec is running
   * - queue.start.error: Failed to start queue (empty or already running)
   * - queue.stop.ack: Queue stopped
   * - queue.complete: Queue finished all specs
   */

  /**
   * Start queue execution
   * Begins processing specs sequentially
   */
  public sendQueueStart(): void {
    this.send({
      type: 'queue.start',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Stop queue execution
   * Current spec continues, but no auto-advance to next
   */
  public sendQueueStop(): void {
    this.send({
      type: 'queue.stop',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Git Methods
   * Git operations via WebSocket
   *
   * Incoming Messages (received via on() handlers):
   * - git:status:response: Git status data (branch, ahead/behind, files)
   * - git:branches:response: List of local branches
   * - git:commit:response: Commit result
   * - git:pull:response: Pull result
   * - git:push:response: Push result
   * - git:checkout:response: Checkout result
   * - git:error: Git operation error
   */

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
   * @param rebase - If true, uses --rebase instead of merge
   */
  public requestGitPull(rebase = false): void {
    this.send({
      type: 'git:pull',
      rebase,
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

  // ============================================================================
  // Attachment Methods (SCA-002)
  // Attachment operations via WebSocket
  //
  // Incoming Messages (received via on() handlers):
  // - attachment:upload:response: Upload result
  // - attachment:list:response: List of attachments
  // - attachment:delete:response: Delete confirmation
  // - attachment:error: Error response
  // ============================================================================

  /**
   * Upload an attachment to a spec story or backlog item
   * @param contextType - 'spec' or 'backlog'
   * @param specId - Spec ID (if contextType is 'spec')
   * @param storyId - Story ID (if contextType is 'spec')
   * @param itemId - Item ID (if contextType is 'backlog')
   * @param data - Base64-encoded file data
   * @param filename - Original filename
   * @param mimeType - MIME type of the file
   */
  public sendAttachmentUpload(
    contextType: 'spec' | 'backlog',
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    data: string,
    filename: string,
    mimeType: string
  ): void {
    this.send({
      type: 'attachment:upload',
      contextType,
      specId,
      storyId,
      itemId,
      data,
      filename,
      mimeType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request list of attachments for a spec story or backlog item
   * @param contextType - 'spec' or 'backlog'
   * @param specId - Spec ID (if contextType is 'spec')
   * @param storyId - Story ID (if contextType is 'spec')
   * @param itemId - Item ID (if contextType is 'backlog')
   */
  public requestAttachmentList(
    contextType: 'spec' | 'backlog',
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined
  ): void {
    this.send({
      type: 'attachment:list',
      contextType,
      specId,
      storyId,
      itemId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Delete an attachment from a spec story or backlog item
   * @param contextType - 'spec' or 'backlog'
   * @param specId - Spec ID (if contextType is 'spec')
   * @param storyId - Story ID (if contextType is 'spec')
   * @param itemId - Item ID (if contextType is 'backlog')
   * @param filename - Filename to delete
   */
  public sendAttachmentDelete(
    contextType: 'spec' | 'backlog',
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    filename: string
  ): void {
    this.send({
      type: 'attachment:delete',
      contextType,
      specId,
      storyId,
      itemId,
      filename,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Read attachment content for preview
   * @param contextType - 'spec' or 'backlog'
   * @param specId - Spec ID (if contextType is 'spec')
   * @param storyId - Story ID (if contextType is 'spec')
   * @param itemId - Item ID (if contextType is 'backlog')
   * @param filename - Filename to read
   */
  public requestAttachmentRead(
    contextType: 'spec' | 'backlog',
    specId: string | undefined,
    storyId: string | undefined,
    itemId: string | undefined,
    filename: string
  ): void {
    this.send({
      type: 'attachment:read',
      contextType,
      specId,
      storyId,
      itemId,
      filename,
      timestamp: new Date().toISOString()
    });
  }

}

export const gateway = new Gateway();
