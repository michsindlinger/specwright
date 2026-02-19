import { LitElement, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../../gateway.js';

/**
 * File entry returned from the backend files:list response.
 */
export interface FileEntry {
  /** File or folder name */
  name: string;
  /** Full relative path from project root */
  path: string;
  /** Type: 'file' or 'directory' */
  type: 'file' | 'directory';
  /** File size in bytes (0 for directories) */
  size: number;
}

/**
 * aos-file-tree - Tree-view component for project directory browsing.
 *
 * Renders a collapsible file tree with lazy-loading of directory contents.
 * Communicates with the backend via gateway `files:list` messages.
 * Dispatches `file-open` custom event when a file is clicked.
 * Dispatches `contextmenu` events for right-click handling (used by FE-006).
 */
@customElement('aos-file-tree')
export class AosFileTree extends LitElement {
  /** Root path to list (defaults to '.' for project root) */
  @property({ type: String }) rootPath = '.';

  /** Currently selected file path */
  @property({ type: String }) selectedPath: string | null = null;

  /** Client-side filter text - only entries matching this string are shown */
  @property({ type: String }) filterText = '';

  /** Whether to show hidden (dot) files */
  @property({ type: Boolean }) showHidden = false;

  /** Map of directory path -> entries (lazy-loaded per folder) */
  @state() private entries: Map<string, FileEntry[]> = new Map();

  /** Set of currently expanded directory paths */
  @state() private expandedDirs: Set<string> = new Set();

  /** Set of directories currently loading */
  @state() private loadingDirs: Set<string> = new Set();

  /** Whether initial root load is in progress */
  @state() private initialLoading = true;

  /** Error message if root loading failed */
  @state() private error = '';

  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  private static stylesInjected = false;

  override connectedCallback() {
    super.connectedCallback();
    this.setupHandlers();
    this.loadDirectory(this.rootPath);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeHandlers();
  }

  private setupHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['files:list:response', (msg) => this.onFilesList(msg)],
      ['files:list:error', (msg) => this.onFilesError(msg)],
      ['gateway.connected', () => this.onGatewayConnected()],
    ];

    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('showHidden') && changedProperties.get('showHidden') !== undefined) {
      this.entries = new Map();
      this.expandedDirs = new Set();
      this.initialLoading = true;
      this.loadDirectory(this.rootPath);
    }
  }

  private loadDirectory(dirPath: string): void {
    this.loadingDirs = new Set([...this.loadingDirs, dirPath]);
    this.requestUpdate();
    gateway.send({ type: 'files:list', path: dirPath, showHidden: this.showHidden });
  }

  private onFilesList(msg: WebSocketMessage): void {
    const dirPath = msg.path as string;
    const files = msg.entries as FileEntry[] | undefined;

    if (!files) return;

    // Sort: directories first, then files, alphabetical within each group
    const sorted = [...files].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const newEntries = new Map(this.entries);
    newEntries.set(dirPath, sorted);
    this.entries = newEntries;

    const newLoading = new Set(this.loadingDirs);
    newLoading.delete(dirPath);
    this.loadingDirs = newLoading;

    if (dirPath === this.rootPath) {
      this.initialLoading = false;
      this.error = '';
    }
  }

  private onFilesError(msg: WebSocketMessage): void {
    const dirPath = (msg.path as string | undefined) ?? this.rootPath;
    const errorMessage = (msg.message as string) || (msg.error as string) || 'Fehler beim Laden';

    const newLoading = new Set(this.loadingDirs);
    newLoading.delete(dirPath);
    this.loadingDirs = newLoading;

    if (dirPath === this.rootPath) {
      this.initialLoading = false;
      this.error = errorMessage;
    }
  }

  /**
   * Re-trigger initial load when gateway reconnects.
   * Handles the case where the component mounted before WebSocket was ready.
   */
  private onGatewayConnected(): void {
    if (this.initialLoading || this.error) {
      this.initialLoading = true;
      this.error = '';
      this.loadDirectory(this.rootPath);
    }
  }

  /**
   * Reload the root directory if data hasn't loaded yet.
   * Called by the sidebar when it becomes visible.
   */
  reload(): void {
    if (this.initialLoading || this.error) {
      this.initialLoading = true;
      this.error = '';
      this.loadDirectory(this.rootPath);
    }
  }

  /**
   * Refresh a directory's contents by re-fetching from the backend.
   * Used by aos-file-context-menu after file operations (create, rename, delete).
   */
  refreshDirectory(dirPath: string): void {
    const newEntries = new Map(this.entries);
    newEntries.delete(dirPath);
    this.entries = newEntries;
    this.loadDirectory(dirPath);
  }

  private toggleDir(dirPath: string): void {
    const newExpanded = new Set(this.expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
      // Lazy-load: only fetch if not already loaded
      if (!this.entries.has(dirPath)) {
        this.loadDirectory(dirPath);
      }
    }
    this.expandedDirs = newExpanded;
  }

  private selectFile(entry: FileEntry): void {
    this.selectedPath = entry.path;
    this.dispatchEvent(
      new CustomEvent('file-open', {
        detail: { path: entry.path, filename: entry.name },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleContextMenu(e: MouseEvent, entry: FileEntry): void {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('file-contextmenu', {
        detail: { path: entry.path, filename: entry.name, type: entry.type, x: e.clientX, y: e.clientY },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getFileIcon(entry: FileEntry): string {
    if (entry.type === 'directory') return this.getFolderIcon();

    const ext = entry.name.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3178c6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'js':
      case 'jsx':
      case 'mjs':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f7df1e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'json':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'md':
      case 'mdx':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A92A9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
      case 'css':
      case 'scss':
      case 'less':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'html':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'yml':
      case 'yaml':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'svg':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      default:
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    }
  }

  private getFolderIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  }

  private getChevronIcon(expanded: boolean): string {
    if (expanded) {
      return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    }
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  }

  private ensureStyles(): void {
    if (AosFileTree.stylesInjected) return;
    AosFileTree.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      .file-tree {
        font-family: var(--font-family-sans);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        overflow-y: auto;
        overflow-x: hidden;
        height: 100%;
        user-select: none;
      }

      .file-tree-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xl);
        gap: var(--spacing-sm);
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
      }

      .file-tree-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xl);
        gap: var(--spacing-sm);
        color: var(--color-accent-error);
        font-size: var(--font-size-sm);
        text-align: center;
      }

      .file-tree-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-lg);
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
        font-style: italic;
      }

      .file-tree-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: 2px var(--spacing-sm);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-radius: var(--radius-sm);
        transition: background-color var(--transition-fast);
        line-height: 1.6;
      }

      .file-tree-item:hover {
        background-color: var(--color-bg-hover);
      }

      .file-tree-item:focus-visible {
        outline: 1px solid var(--color-accent-primary);
        outline-offset: -1px;
      }

      .file-tree-item--selected {
        background-color: rgba(var(--color-accent-primary-rgb), 0.15);
        color: var(--color-text-primary);
      }

      .file-tree-item--selected:hover {
        background-color: rgba(var(--color-accent-primary-rgb), 0.2);
      }

      .file-tree-item__chevron {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: var(--color-text-muted);
      }

      .file-tree-item__chevron--hidden {
        visibility: hidden;
      }

      .file-tree-item__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .file-tree-item__name {
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
      }

      .file-tree-item__loading {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: 2px var(--spacing-sm);
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  private renderEntry(entry: FileEntry, depth: number): TemplateResult {
    const isDir = entry.type === 'directory';
    const isExpanded = this.expandedDirs.has(entry.path);
    const isSelected = this.selectedPath === entry.path;
    const isLoading = this.loadingDirs.has(entry.path);
    const paddingLeft = depth * 16;

    const itemClasses = [
      'file-tree-item',
      isSelected ? 'file-tree-item--selected' : '',
    ].filter(Boolean).join(' ');

    const onClick = () => {
      if (isDir) {
        this.toggleDir(entry.path);
      } else {
        this.selectFile(entry);
      }
    };

    const onContextMenu = (e: MouseEvent) => this.handleContextMenu(e, entry);

    return html`
      <div
        class=${itemClasses}
        style="padding-left: ${paddingLeft}px"
        @click=${onClick}
        @contextmenu=${onContextMenu}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        role="treeitem"
        tabindex="0"
        title=${entry.name}
        aria-expanded=${isDir ? String(isExpanded) : nothing}
      >
        <span class="file-tree-item__chevron ${isDir ? '' : 'file-tree-item__chevron--hidden'}">
          ${isDir ? html`<span .innerHTML=${this.getChevronIcon(isExpanded)}></span>` : nothing}
        </span>
        <span class="file-tree-item__icon">
          <span .innerHTML=${this.getFileIcon(entry)}></span>
        </span>
        <span class="file-tree-item__name">${entry.name}</span>
      </div>
      ${isDir && isExpanded ? this.renderDirContents(entry.path, depth + 1, isLoading) : nothing}
    `;
  }

  /**
   * Check if a file entry matches the current filter text.
   * For directories, returns true if any descendant matches.
   */
  private matchesFilter(entry: FileEntry): boolean {
    if (!this.filterText) return true;

    const query = this.filterText.toLowerCase();

    if (entry.name.toLowerCase().includes(query)) return true;

    // For directories, check if any loaded child matches recursively
    if (entry.type === 'directory') {
      const children = this.entries.get(entry.path);
      if (children) {
        return children.some((child) => this.matchesFilter(child));
      }
      // Directory not yet loaded - keep visible so user can expand it
      return true;
    }

    return false;
  }

  private renderDirContents(dirPath: string, depth: number, isLoading: boolean): TemplateResult | TemplateResult[] {
    if (isLoading) {
      const paddingLeft = depth * 16;
      return html`
        <div class="file-tree-item__loading" style="padding-left: ${paddingLeft}px">
          <div class="loading-spinner" style="width: 12px; height: 12px; border-width: 1.5px;"></div>
          Laden...
        </div>
      `;
    }

    const children = this.entries.get(dirPath);
    if (!children || children.length === 0) {
      const paddingLeft = depth * 16;
      return html`
        <div class="file-tree-empty" style="padding-left: ${paddingLeft}px">
          Leerer Ordner
        </div>
      `;
    }

    const filtered = this.filterText ? children.filter((child) => this.matchesFilter(child)) : children;

    if (filtered.length === 0) {
      return html``;
    }

    return filtered.map((child) => this.renderEntry(child, depth));
  }

  override render() {
    this.ensureStyles();

    if (this.initialLoading) {
      return html`
        <div class="file-tree">
          <div class="file-tree-loading">
            <div class="loading-spinner"></div>
            <span>Dateien werden geladen...</span>
          </div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="file-tree">
          <div class="file-tree-error">
            <span>${this.error}</span>
          </div>
        </div>
      `;
    }

    const rootEntries = this.entries.get(this.rootPath);
    if (!rootEntries || rootEntries.length === 0) {
      return html`
        <div class="file-tree">
          <div class="file-tree-empty">
            Keine Dateien gefunden
          </div>
        </div>
      `;
    }

    const filtered = this.filterText ? rootEntries.filter((entry) => this.matchesFilter(entry)) : rootEntries;

    if (filtered.length === 0) {
      return html`
        <div class="file-tree">
          <div class="file-tree-empty">
            Keine Treffer fuer "${this.filterText}"
          </div>
        </div>
      `;
    }

    return html`
      <div class="file-tree" role="tree">
        ${filtered.map((entry) => this.renderEntry(entry, 0))}
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-file-tree': AosFileTree;
  }
}
