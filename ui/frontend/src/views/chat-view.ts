import { LitElement, html } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { gateway, WebSocketMessage, ImagePayload } from '../gateway.js';
import { routerService } from '../services/router.service.js';
import type { ParsedRoute } from '../types/route.types.js';
import '../components/chat-message.js';
import '../components/model-selector.js';
import '../components/aos-image-staging-area.js';
import '../components/aos-image-lightbox.js';
import type { ChatMessageData, ToolCall } from '../components/chat-message.js';
import type { AosToastNotification } from '../components/toast-notification.js';

interface StreamingMessage {
  id: string;
  content: string;
  toolCalls: ToolCall[];
}

interface SelectedModel {
  providerId: string;
  modelId: string;
}

export interface StagedImage {
  file: File;
  dataUrl: string;
  id: string;
}

// Allowed file types for image upload
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Max number of images per message
const MAX_IMAGES = 5;

@customElement('aos-chat-view')
export class AosChatView extends LitElement {
  @state() private messages: ChatMessageData[] = [];
  @state() private inputValue = '';
  @state() private isStreaming = false;
  @state() private connectionError = false;
  @state() private streamingMessage: StreamingMessage | null = null;
  @state() private hasProject = false;
  @state() private selectedModel: SelectedModel = { providerId: 'anthropic', modelId: 'opus-4.5' };
  @state() private stagedImages: StagedImage[] = [];
  @state() private isDragOver = false;

  @query('.chat-messages') private messagesContainer!: HTMLElement;
  @query('.chat-input') private inputElement!: HTMLTextAreaElement;
  @query('input[type="file"]') private fileInput!: HTMLInputElement;

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();
  private boundRouteChangeHandler = (_route: ParsedRoute) => {
    // DLN-003: Currently only #/chat is supported (no session deep links yet).
    // Future: read sessionId from route.segments and restore session.
  };

  override connectedCallback() {
    super.connectedCallback();
    this.setupWebSocketHandlers();
    this.setupModelChangeListener();
    routerService.on('route-changed', this.boundRouteChangeHandler);
    this.requestHistory();
    this.checkProjectStatus();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupWebSocketHandlers();
    this.cleanupModelChangeListener();
    routerService.off('route-changed', this.boundRouteChangeHandler);
  }

  private setupWebSocketHandlers(): void {
    const handlers: Record<string, (msg: WebSocketMessage) => void> = {
      'chat.message': (msg) => this.handleChatMessage(msg),
      'chat.stream.start': (msg) => this.handleStreamStart(msg),
      'chat.stream': (msg) => this.handleStreamChunk(msg),
      'chat.tool': (msg) => this.handleToolCall(msg),
      'chat.tool.complete': (msg) => this.handleToolComplete(msg),
      'chat.complete': (msg) => this.handleChatComplete(msg),
      'chat.error': (msg) => this.handleChatError(msg),
      'chat.history': (msg) => this.handleHistory(msg),
      'chat.cleared': () => this.handleCleared(),
      'gateway.connected': () => this.handleConnected(),
      'gateway.disconnected': () => this.handleDisconnected(),
      'project.selected': () => this.handleProjectSelected(),
      'project.current': (msg) => this.handleProjectCurrent(msg),
      'chat.settings.response': (msg) => this.handleSettingsResponse(msg)
    };

    for (const [type, handler] of Object.entries(handlers)) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private cleanupWebSocketHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  private boundModelChangeHandler = (e: Event): void => {
    const customEvent = e as CustomEvent<{ providerId: string; modelId: string }>;
    this.selectedModel = {
      providerId: customEvent.detail.providerId,
      modelId: customEvent.detail.modelId
    };
    // Send settings update to backend
    gateway.send({
      type: 'chat.settings.update',
      providerId: customEvent.detail.providerId,
      modelId: customEvent.detail.modelId
    });
  };

  private setupModelChangeListener(): void {
    document.addEventListener('model-changed', this.boundModelChangeHandler);
  }

  private cleanupModelChangeListener(): void {
    document.removeEventListener('model-changed', this.boundModelChangeHandler);
  }

  private checkProjectStatus(): void {
    gateway.send({ type: 'project.current' });
  }

  private requestHistory(): void {
    gateway.send({ type: 'chat.history' });
  }

  private handleChatMessage(msg: WebSocketMessage): void {
    const message = msg.message as ChatMessageData;
    if (message.role === 'user') {
      this.messages = [...this.messages, message];
      this.scrollToBottom();
    }
  }

  private handleStreamStart(msg: WebSocketMessage): void {
    this.isStreaming = true;
    this.streamingMessage = {
      id: msg.messageId as string,
      content: '',
      toolCalls: []
    };
  }

  private handleStreamChunk(msg: WebSocketMessage): void {
    if (this.streamingMessage && msg.messageId === this.streamingMessage.id) {
      this.streamingMessage = {
        ...this.streamingMessage,
        content: this.streamingMessage.content + (msg.delta as string)
      };
      this.scrollToBottom();
    }
  }

  private handleToolCall(msg: WebSocketMessage): void {
    if (this.streamingMessage && msg.messageId === this.streamingMessage.id) {
      const toolCall = msg.toolCall as ToolCall;
      this.streamingMessage = {
        ...this.streamingMessage,
        toolCalls: [...this.streamingMessage.toolCalls, toolCall]
      };
    }
  }

  private handleToolComplete(msg: WebSocketMessage): void {
    if (this.streamingMessage && msg.messageId === this.streamingMessage.id) {
      const completedTool = msg.toolCall as ToolCall;
      this.streamingMessage = {
        ...this.streamingMessage,
        toolCalls: this.streamingMessage.toolCalls.map((t) =>
          t.id === completedTool.id ? completedTool : t
        )
      };
    }
  }

  private handleChatComplete(msg: WebSocketMessage): void {
    const message = msg.message as ChatMessageData;
    this.messages = [...this.messages, message];
    this.isStreaming = false;
    this.streamingMessage = null;
    this.scrollToBottom();
  }

  private handleChatError(msg: WebSocketMessage): void {
    console.error('Chat error:', msg.error);
    this.isStreaming = false;
    this.streamingMessage = null;
  }

  private handleHistory(msg: WebSocketMessage): void {
    const messages = msg.messages as ChatMessageData[];
    this.messages = messages;
    this.scrollToBottom();
  }

  private handleCleared(): void {
    this.messages = [];
  }

  private handleConnected(): void {
    this.connectionError = false;
    this.requestHistory();
    this.checkProjectStatus();
  }

  private handleDisconnected(): void {
    this.connectionError = true;
    this.isStreaming = false;
    this.streamingMessage = null;
  }

  private handleProjectSelected(): void {
    this.hasProject = true;
    this.messages = [];
    this.requestHistory();
  }

  private handleProjectCurrent(msg: WebSocketMessage): void {
    this.hasProject = msg.project !== null;
  }

  private handleSettingsResponse(msg: WebSocketMessage): void {
    const model = msg.model as SelectedModel | undefined;
    if (model) {
      this.selectedModel = model;
    }
  }

  private sendMessage(): void {
    const content = this.inputValue.trim();
    const hasImages = this.stagedImages.length > 0;

    // Allow sending with images even if no text content
    if ((!content && !hasImages) || this.isStreaming || !this.hasProject) return;

    if (hasImages) {
      // Convert staged images to ImagePayload format
      const images: ImagePayload[] = this.stagedImages.map(img => ({
        data: img.dataUrl,
        mimeType: img.file.type,
        filename: img.file.name,
        isBase64: true
      }));

      gateway.sendChatWithImages(content, images, this.selectedModel);

      // Clear staged images after sending
      this.stagedImages = [];
    } else {
      // Send regular text-only message
      gateway.send({
        type: 'chat.send',
        content,
        model: this.selectedModel
      });
    }

    this.inputValue = '';
    this.inputElement?.focus();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  private handleInput(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;

    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
  }

  private clearChat(): void {
    gateway.send({ type: 'chat.clear' });
  }

  private reconnect(): void {
    gateway.connect();
  }

  // Image Upload Methods
  private showToast(message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error'): void {
    const toast = document.querySelector('aos-toast-notification') as AosToastNotification | null;
    if (toast) {
      toast.show(message, type);
    }
  }

  private validateFile(file: File): string | null {
    // Check file type
    const isValidType = ALLOWED_MIME_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      return 'Format nicht unterstützt. Erlaubt: PNG, JPG, GIF, WebP, PDF, SVG';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'Datei ist zu groß (max. 5 MB)';
    }

    // Check max images
    if (this.stagedImages.length >= MAX_IMAGES) {
      return 'Maximal 5 Bilder pro Nachricht';
    }

    return null;
  }

  private async addFile(file: File): Promise<void> {
    const error = this.validateFile(file);
    if (error) {
      this.showToast(error, 'error');
      return;
    }

    const dataUrl = await this.readFileAsDataUrl(file);
    const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    this.stagedImages = [...this.stagedImages, { file, dataUrl, id }];
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private async handleFiles(files: FileList | File[]): Promise<void> {
    for (const file of Array.from(files)) {
      await this.addFile(file);
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.hasProject) return;
    this.isDragOver = true;
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the container entirely
    const relatedTarget = e.relatedTarget as Element | null;
    const container = (e.currentTarget as Element);
    if (!relatedTarget || !container.contains(relatedTarget)) {
      this.isDragOver = false;
    }
  }

  private async handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;

    if (!this.hasProject) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.handleFiles(files);
    }
  }

  private async handlePaste(e: ClipboardEvent): Promise<void> {
    if (!this.hasProject) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await this.handleFiles(imageFiles);
    }
  }

  private handleFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(input.files);
      // Reset input so the same file can be selected again
      input.value = '';
    }
  }

  private openFileDialog(): void {
    if (!this.hasProject) return;
    this.fileInput?.click();
  }

  private removeImage(id: string): void {
    this.stagedImages = this.stagedImages.filter(img => img.id !== id);
  }

  private handleImageRemoved(e: CustomEvent<{ id: string }>): void {
    this.removeImage(e.detail.id);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      if (this.messagesContainer) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    });
  }

  override render() {
    return html`
      <div
        class="chat-container ${this.isDragOver && this.hasProject ? 'drag-over' : ''}"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
        @paste=${this.handlePaste}
      >
        <!-- Image Lightbox (CIMG-006) - renders when open-lightbox event is dispatched -->
        <aos-image-lightbox></aos-image-lightbox>

        <div class="chat-header">
          <aos-model-selector></aos-model-selector>
        </div>

        ${this.connectionError ? this.renderConnectionError() : ''}
        ${!this.hasProject ? this.renderNoProject() : ''}

        <!-- Drop zone overlay -->
        ${this.isDragOver && this.hasProject
          ? html`
              <div class="drop-zone-overlay">
                <div class="drop-zone-content">
                  <span class="drop-zone-icon">📷</span>
                  <span class="drop-zone-text">Drop here to add images</span>
                </div>
              </div>
            `
          : ''}

        <div class="chat-messages">
          ${this.messages.length === 0 && !this.streamingMessage
            ? this.renderEmptyState()
            : ''}

          ${this.messages.map(
            (msg) => html`
              <aos-chat-message .message=${msg}></aos-chat-message>
            `
          )}

          ${this.streamingMessage
            ? html`
                <aos-chat-message
                  .message=${{
                    id: this.streamingMessage.id,
                    role: 'assistant' as const,
                    content: this.streamingMessage.content,
                    timestamp: new Date().toISOString(),
                    toolCalls: this.streamingMessage.toolCalls
                  }}
                  .streaming=${true}
                ></aos-chat-message>
              `
            : ''}
        </div>

        <div class="chat-input-container">
          <!-- Hidden file input -->
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf"
            multiple
            @change=${this.handleFileInputChange}
            style="display: none;"
          />

          <!-- Image staging area component -->
          <aos-image-staging-area
            .images=${this.stagedImages}
            @image-removed=${this.handleImageRemoved}
          ></aos-image-staging-area>

          <div class="input-wrapper">
            <!-- Upload button -->
            <button
              class="upload-btn"
              @click=${this.openFileDialog}
              ?disabled=${!this.hasProject || this.isStreaming || this.connectionError}
              aria-label="Upload image"
              title="Add image (PNG, JPG, GIF, WebP, PDF, SVG)"
            >
              <span class="upload-icon">📎</span>
            </button>

            <textarea
              class="chat-input"
              placeholder="${this.hasProject
                ? 'Message Claude...'
                : 'Select a project first...'}"
              .value=${this.inputValue}
              @input=${this.handleInput}
              @keydown=${this.handleKeyDown}
              ?disabled=${!this.hasProject || this.isStreaming || this.connectionError}
              rows="1"
            ></textarea>

            <button
              class="send-btn"
              @click=${this.sendMessage}
              ?disabled=${(!this.inputValue.trim() && this.stagedImages.length === 0) ||
              !this.hasProject ||
              this.isStreaming ||
              this.connectionError}
              aria-label="Send message"
            >
              ${this.isStreaming
                ? html`<span class="loading-spinner"></span>`
                : html`<span class="send-icon">↑</span>`}
            </button>
          </div>

          ${this.messages.length > 0
            ? html`
                <button class="clear-btn" @click=${this.clearChat}>
                  Clear chat
                </button>
              `
            : ''}
        </div>
      </div>
    `;
  }

  private renderConnectionError() {
    return html`
      <div class="connection-error">
        <span class="error-icon">⚠️</span>
        <span>Connection lost</span>
        <button class="reconnect-btn" @click=${this.reconnect}>
          Reconnect
        </button>
      </div>
    `;
  }

  private renderNoProject() {
    return html`
      <div class="no-project-banner">
        <span class="info-icon">ℹ️</span>
        <span>Select a project from the header to start chatting</span>
      </div>
    `;
  }

  private renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>Start a conversation</h3>
        <p>
          Ask Claude Code anything about your project. Try commands like:
        </p>
        <ul class="example-prompts">
          <li>"Show me the README"</li>
          <li>"Explain the project structure"</li>
          <li>"Find all TODO comments"</li>
          <li>"Help me fix the bug in..."</li>
        </ul>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-chat-view': AosChatView;
  }
}
