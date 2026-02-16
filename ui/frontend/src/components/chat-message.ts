import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderMarkdown, renderMarkdownStreaming } from '../utils/markdown-renderer.js';
import mermaid from 'mermaid';
import { themeService, type ResolvedTheme } from '../services/theme.service.js';
import './tool-call-badge.js';

function initializeMermaidTheme(theme: ResolvedTheme): void {
  if (theme === 'dark') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-mono)',
      themeVariables: {
        primaryColor: '#00D4FF',
        primaryTextColor: '#B8C9DB',
        primaryBorderColor: '#2A4A6A',
        lineColor: '#7A92A9',
        secondaryColor: '#1E3A5F',
        tertiaryColor: '#0F1F33',
        background: '#142840',
        mainBkg: '#1E3A5F',
        nodeBorder: '#2A4A6A',
        clusterBkg: '#142840',
        clusterBorder: '#2A4A6A',
        titleColor: '#ffffff',
        edgeLabelBackground: '#1E3A5F',
      }
    });
  } else if (theme === 'black') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-mono)',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#e5e5e5',
        primaryBorderColor: '#404040',
        lineColor: '#737373',
        secondaryColor: '#262626',
        tertiaryColor: '#171717',
        background: '#1a1a1a',
        mainBkg: '#262626',
        nodeBorder: '#525252',
        clusterBkg: '#1a1a1a',
        clusterBorder: '#404040',
        titleColor: '#e5e5e5',
        edgeLabelBackground: '#262626',
      }
    });
  } else {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-mono)',
      themeVariables: {
        primaryColor: '#1E3A5F',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#E8E0D8',
        lineColor: '#64748b',
        secondaryColor: '#FFF8F3',
        tertiaryColor: '#FFFBF7',
        background: '#FFFFFF',
        mainBkg: '#FFF8F3',
        nodeBorder: '#E8E0D8',
        clusterBkg: '#FFFFFF',
        clusterBorder: '#E8E0D8',
        titleColor: '#1e293b',
        edgeLabelBackground: '#FFFFFF',
      }
    });
  }
}

// Initialize with current theme
initializeMermaidTheme(themeService.getResolvedTheme());
themeService.onChange((theme) => initializeMermaidTheme(theme));

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

/**
 * Image attached to a chat message (CIMG-005)
 */
export interface MessageImage {
  /** Relative path to the image file */
  path: string;
  /** MIME type of the image */
  mimeType: string;
  /** Original filename */
  filename: string;
}

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  /** Images attached to this message (CIMG-005) */
  images?: MessageImage[];
}

// Debounce interval for streaming rendering (ms)
const STREAMING_DEBOUNCE_MS = 50;

@customElement('aos-chat-message')
export class AosChatMessage extends LitElement {
  @property({ type: Object }) message!: ChatMessageData;
  @property({ type: Boolean }) streaming = false;

  // Internal state for debounced rendering
  @state() private _renderedContent = '';
  @state() private _lastRenderedContent = '';

  // RAF handle for debouncing
  private _rafId: number | null = null;
  private _debounceTimerId: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.handleCopyClick);
    this.addEventListener('keydown', this.handleCopyKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleCopyClick);
    this.removeEventListener('keydown', this.handleCopyKeydown);
    // Clean up any pending RAF or debounce timer
    this.cancelPendingRender();
  }

  private cancelPendingRender(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._debounceTimerId !== null) {
      clearTimeout(this._debounceTimerId);
      this._debounceTimerId = null;
    }
  }

  override async updated(): Promise<void> {
    // Render mermaid diagrams after DOM update
    await this.renderMermaidDiagrams();
  }

  private async renderMermaidDiagrams(): Promise<void> {
    const containers = this.querySelectorAll('.mermaid-container[data-mermaid]');

    for (const container of containers) {
      const diagramDiv = container.querySelector('.mermaid-diagram') as HTMLElement | null;
      const fallbackDiv = container.querySelector('.mermaid-fallback') as HTMLElement | null;

      // Skip if already rendered (has SVG child)
      if (diagramDiv?.querySelector('svg')) {
        continue;
      }

      const mermaidCode = container.getAttribute('data-mermaid');
      const mermaidId = container.getAttribute('data-mermaid-id');

      if (!mermaidCode || !diagramDiv || !mermaidId) {
        continue;
      }

      try {
        // Render the mermaid diagram
        const { svg } = await mermaid.render(mermaidId, mermaidCode);
        diagramDiv.innerHTML = svg;

        // Hide fallback on success
        if (fallbackDiv) {
          fallbackDiv.style.display = 'none';
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);

        // Show fallback with error message
        if (fallbackDiv) {
          const errorMessage = error instanceof Error ? error.message : 'Invalid mermaid syntax';
          fallbackDiv.innerHTML = `
            <div class="mermaid-error">
              <span class="mermaid-error-icon">⚠️</span>
              <span class="mermaid-error-text">Diagram rendering failed: ${this.escapeHtml(errorMessage)}</span>
            </div>
            <pre><code class="language-mermaid">${this.escapeHtml(mermaidCode)}</code></pre>
          `;
          fallbackDiv.style.display = 'block';
        }

        // Hide the diagram container
        diagramDiv.style.display = 'none';
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private handleCopyClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    const button = target.closest('.copy-btn') as HTMLButtonElement | null;
    if (button) {
      this.copyCode(button);
    }
  };

  private handleCopyKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target as HTMLElement;
      if (target.classList.contains('copy-btn')) {
        event.preventDefault();
        this.copyCode(target as HTMLButtonElement);
      }
    }
  };

  private async copyCode(button: HTMLButtonElement): Promise<void> {
    const code = button.dataset.code;
    if (!code) return;

    const textSpan = button.querySelector('.copy-btn-text');
    const originalText = textSpan?.textContent || 'Copy';

    try {
      await navigator.clipboard.writeText(code);
      // Success feedback
      button.classList.add('copy-btn--copied');
      button.classList.remove('copy-btn--error');
      if (textSpan) textSpan.textContent = 'Copied!';

      setTimeout(() => {
        button.classList.remove('copy-btn--copied');
        if (textSpan) textSpan.textContent = originalText;
      }, 2000);
    } catch {
      // Error feedback
      button.classList.add('copy-btn--error');
      button.classList.remove('copy-btn--copied');
      if (textSpan) textSpan.textContent = 'Failed';

      setTimeout(() => {
        button.classList.remove('copy-btn--error');
        if (textSpan) textSpan.textContent = originalText;
      }, 2000);
    }
  }

  override render() {
    const isUser = this.message.role === 'user';
    const messageClass = isUser ? 'chat-message user' : 'chat-message assistant';

    return html`
      <div class="${messageClass}">
        <div class="message-header">
          <span class="role-badge ${this.message.role}">
            ${isUser ? 'You' : 'Claude'}
          </span>
          <span class="timestamp">${this.formatTime(this.message.timestamp)}</span>
        </div>

        ${this.message.toolCalls?.map(
          (tool) => html`
            <aos-tool-call-badge .toolCall=${tool}></aos-tool-call-badge>
          `
        )}

        <div class="message-content">
          ${this.renderContent()}
        </div>

        ${this.renderMessageImages()}

        ${this.streaming ? html`<span class="cursor"></span>` : ''}
      </div>
    `;
  }

  /**
   * Render attached images as thumbnails (CIMG-005)
   * Images are shown below the message content with clickable thumbnails
   */
  private renderMessageImages() {
    const images = this.message.images;
    if (!images || images.length === 0) {
      return '';
    }

    return html`
      <div class="message-images">
        ${images.map((image) => this.renderImageThumbnail(image))}
      </div>
    `;
  }

  /**
   * Render a single image thumbnail (CIMG-005)
   * PDFs show an icon, images show a thumbnail
   * Click dispatches open-lightbox event
   */
  private renderImageThumbnail(image: MessageImage) {
    const isPdf = image.mimeType === 'application/pdf';

    if (isPdf) {
      return html`
        <div
          class="message-image-thumbnail message-image-thumbnail--pdf"
          @click=${() => this.handleImageClick(image)}
          @keydown=${(e: KeyboardEvent) => this.handleImageKeydown(e, image)}
          tabindex="0"
          role="button"
          aria-label="Open ${image.filename}"
        >
          <div class="message-image-thumbnail__pdf-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <text x="7" y="18" font-size="6" font-weight="bold" fill="currentColor" stroke="none">PDF</text>
            </svg>
          </div>
          <span class="message-image-thumbnail__filename">${this.truncateFilename(image.filename)}</span>
        </div>
      `;
    }

    // Regular image thumbnail
    const imageUrl = this.getImageUrl(image.path);

    return html`
      <div
        class="message-image-thumbnail"
        @click=${() => this.handleImageClick(image)}
        @keydown=${(e: KeyboardEvent) => this.handleImageKeydown(e, image)}
        tabindex="0"
        role="button"
        aria-label="Open ${image.filename} in lightbox"
      >
        <img
          src="${imageUrl}"
          alt="${image.filename}"
          class="message-image-thumbnail__img"
          loading="lazy"
          @error=${(e: Event) => this.handleImageError(e)}
        />
      </div>
    `;
  }

  /**
   * Get the URL for an image based on its path (CIMG-005)
   */
  private getImageUrl(imagePath: string): string {
    // Images are served via the /api/images/:projectPath/* route
    // The path is relative to the project, so we need to construct the full URL
    // Format: /api/images/{projectPath}/{imagePath}
    // For now, we assume the project path is available from context
    // The backend serves images at /api/images/:projectPath/*
    return `/api/images/${encodeURIComponent(imagePath)}`;
  }

  /**
   * Handle click on image thumbnail - dispatch open-lightbox event (CIMG-005)
   */
  private handleImageClick(image: MessageImage): void {
    this.dispatchEvent(new CustomEvent('open-lightbox', {
      bubbles: true,
      composed: true,
      detail: {
        imagePath: image.path,
        images: this.message.images || [],
        filename: image.filename,
        mimeType: image.mimeType
      }
    }));
  }

  /**
   * Handle keyboard navigation on image thumbnails (CIMG-005)
   */
  private handleImageKeydown(event: KeyboardEvent, image: MessageImage): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleImageClick(image);
    }
  }

  /**
   * Handle image load error - show placeholder (CIMG-005)
   */
  private handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const container = img.closest('.message-image-thumbnail');
    if (container) {
      container.classList.add('message-image-thumbnail--error');
      img.style.display = 'none';
      // Insert error placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'message-image-thumbnail__error';
      placeholder.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Bild nicht verfügbar</span>
      `;
      container.appendChild(placeholder);
    }
  }

  /**
   * Truncate filename for display (CIMG-005)
   */
  private truncateFilename(filename: string, maxLength = 20): string {
    if (filename.length <= maxLength) {
      return filename;
    }
    const ext = filename.split('.').pop() || '';
    const name = filename.slice(0, filename.length - ext.length - 1);
    const truncatedName = name.slice(0, maxLength - ext.length - 4) + '...';
    return `${truncatedName}.${ext}`;
  }

  private renderContent() {
    const content = this.message.content;
    if (!content) {
      return '';
    }

    // During streaming, use cached content if available and schedule update
    if (this.streaming) {
      // Only re-render if content has actually changed
      if (content !== this._lastRenderedContent) {
        this.scheduleStreamingRender(content);
      }
      // Return cached content or render with streaming-aware parser
      if (this._renderedContent) {
        return unsafeHTML(this._renderedContent);
      }
      // First render during streaming - use streaming renderer
      const renderedHtml = renderMarkdownStreaming(content);
      this._renderedContent = renderedHtml;
      this._lastRenderedContent = content;
      return unsafeHTML(renderedHtml);
    }

    // Not streaming - render with full markdown support
    const renderedHtml = renderMarkdown(content);
    // Clear streaming cache
    this._renderedContent = '';
    this._lastRenderedContent = '';
    return unsafeHTML(renderedHtml);
  }

  /**
   * Schedule a debounced render for streaming content
   * Uses requestAnimationFrame + setTimeout for optimal performance
   */
  private scheduleStreamingRender(content: string): void {
    // Cancel any pending render
    this.cancelPendingRender();

    // Debounce with timeout, then use RAF for smooth rendering
    this._debounceTimerId = setTimeout(() => {
      this._rafId = requestAnimationFrame(() => {
        // Re-check that we're still streaming and content is still different
        if (this.streaming && content === this.message.content) {
          this._renderedContent = renderMarkdownStreaming(content);
          this._lastRenderedContent = content;
          this.requestUpdate();
        }
        this._rafId = null;
      });
      this._debounceTimerId = null;
    }, STREAMING_DEBOUNCE_MS);
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-chat-message': AosChatMessage;
  }
}
