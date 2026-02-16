import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { gateway, WebSocketMessage } from '../../gateway.js';

/**
 * aos-file-context-menu - Context menu for file tree operations.
 *
 * Provides right-click menu with: New File, New Folder, Rename, Delete.
 * Positioned at mouse coordinates with viewport-bounds adjustment.
 * Communicates with backend via gateway messages (files:create, files:mkdir, files:rename, files:delete).
 * Dispatches `tree-refresh` event after successful operations so the tree can update.
 *
 * @fires tree-refresh - Fired after a successful file operation. Detail: { path: string }
 */
@customElement('aos-file-context-menu')
export class AosFileContextMenu extends LitElement {
  @state() private isOpen = false;
  @state() private position = { x: 0, y: 0 };

  /** Path of the file/folder that was right-clicked */
  @state() private targetPath = '';

  /** Name of the file/folder that was right-clicked */
  @state() private targetName = '';

  /** Type of the target: 'file' or 'directory' */
  @state() private targetType: 'file' | 'directory' = 'file';

  /** Stores the old path during a rename operation for tab-sync events */
  private pendingRenameOldPath = '';

  private boundKeyDownHandler = this.handleKeyDown.bind(this);
  private boundClickOutsideHandler = this.handleClickOutside.bind(this);
  private boundHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  private static stylesInjected = false;

  override connectedCallback() {
    super.connectedCallback();
    this.setupGatewayHandlers();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeGlobalListeners();
    this.removeGatewayHandlers();
  }

  private setupGatewayHandlers(): void {
    const handlers: [string, (msg: WebSocketMessage) => void][] = [
      ['files:create:response', (msg) => this.onOperationSuccess(msg)],
      ['files:mkdir:response', (msg) => this.onOperationSuccess(msg)],
      ['files:rename:response', (msg) => this.onRenameSuccess(msg)],
      ['files:delete:response', (msg) => this.onDeleteSuccess(msg)],
      ['files:create:error', (msg) => this.onOperationError(msg)],
      ['files:mkdir:error', (msg) => this.onOperationError(msg)],
      ['files:rename:error', (msg) => this.onOperationError(msg)],
      ['files:delete:error', (msg) => this.onOperationError(msg)],
    ];

    for (const [type, handler] of handlers) {
      this.boundHandlers.set(type, handler);
      gateway.on(type, handler);
    }
  }

  private removeGatewayHandlers(): void {
    for (const [type, handler] of this.boundHandlers) {
      gateway.off(type, handler);
    }
    this.boundHandlers.clear();
  }

  /**
   * Show the context menu for a specific file/folder at mouse coordinates.
   */
  show(x: number, y: number, path: string, name: string, type: 'file' | 'directory'): void {
    this.targetPath = path;
    this.targetName = name;
    this.targetType = type;
    this.position = this.adjustPosition(x, y);
    this.isOpen = true;
    this.addGlobalListeners();
  }

  /**
   * Hide the context menu.
   */
  hide(): void {
    this.isOpen = false;
    this.removeGlobalListeners();
  }

  /**
   * Adjust position to keep menu within viewport bounds.
   * Follows the same pattern as aos-context-menu.
   */
  private adjustPosition(x: number, y: number): { x: number; y: number } {
    const estimatedWidth = 200;
    const estimatedHeight = 160;
    const padding = 10;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + estimatedWidth > viewportWidth - padding) {
      adjustedX = Math.max(padding, x - estimatedWidth);
    }

    if (y + estimatedHeight > viewportHeight - padding) {
      adjustedY = Math.max(padding, y - estimatedHeight);
    }

    adjustedX = Math.max(padding, adjustedX);
    adjustedY = Math.max(padding, adjustedY);

    requestAnimationFrame(() => {
      const menu = this.querySelector('.file-context-menu') as HTMLElement;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();

      let finalX = adjustedX;
      let finalY = adjustedY;

      if (adjustedX + rect.width > viewportWidth - padding) {
        finalX = viewportWidth - rect.width - padding;
      }

      if (adjustedY + rect.height > viewportHeight - padding) {
        finalY = viewportHeight - rect.height - padding;
      }

      finalX = Math.max(padding, finalX);
      finalY = Math.max(padding, finalY);

      if (Math.abs(finalX - adjustedX) > 1 || Math.abs(finalY - adjustedY) > 1) {
        this.position = { x: finalX, y: finalY };
      }
    });

    return { x: adjustedX, y: adjustedY };
  }

  private addGlobalListeners(): void {
    document.addEventListener('keydown', this.boundKeyDownHandler);
    document.addEventListener('click', this.boundClickOutsideHandler);
  }

  private removeGlobalListeners(): void {
    document.removeEventListener('keydown', this.boundKeyDownHandler);
    document.removeEventListener('click', this.boundClickOutsideHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    }
  }

  private handleClickOutside(e: MouseEvent): void {
    const target = e.target as Node;
    if (!this.contains(target)) {
      this.hide();
    }
  }

  /**
   * Get the parent directory path for the target.
   * If the target is a directory, returns the target path itself.
   * If the target is a file, returns the parent directory.
   */
  private getParentDir(): string {
    if (this.targetType === 'directory') {
      return this.targetPath;
    }
    const parts = this.targetPath.split('/');
    parts.pop();
    return parts.length > 0 ? parts.join('/') : '.';
  }

  private handleNewFile(e: Event): void {
    e.stopPropagation();
    this.hide();

    const name = window.prompt('Dateiname:');
    if (!name || !name.trim()) return;

    const parentDir = this.getParentDir();
    const newPath = parentDir === '.' ? name.trim() : `${parentDir}/${name.trim()}`;

    gateway.send({ type: 'files:create', path: newPath });
  }

  private handleNewFolder(e: Event): void {
    e.stopPropagation();
    this.hide();

    const name = window.prompt('Ordnername:');
    if (!name || !name.trim()) return;

    const parentDir = this.getParentDir();
    const newPath = parentDir === '.' ? name.trim() : `${parentDir}/${name.trim()}`;

    gateway.send({ type: 'files:mkdir', path: newPath });
  }

  private handleRename(e: Event): void {
    e.stopPropagation();
    this.hide();

    const newName = window.prompt('Neuer Name:', this.targetName);
    if (!newName || !newName.trim() || newName.trim() === this.targetName) return;

    const parts = this.targetPath.split('/');
    parts.pop();
    const parentDir = parts.length > 0 ? parts.join('/') : '.';
    const newPath = parentDir === '.' ? newName.trim() : `${parentDir}/${newName.trim()}`;

    // Store old path for tab-sync event dispatch on success
    this.pendingRenameOldPath = this.targetPath;

    gateway.send({ type: 'files:rename', oldPath: this.targetPath, newPath });
  }

  private handleDelete(e: Event): void {
    e.stopPropagation();
    const deletePath = this.targetPath;
    this.hide();

    const confirmed = window.confirm(`Moechten Sie '${this.targetName}' wirklich loeschen?`);
    if (!confirmed) return;

    gateway.send({ type: 'files:delete', path: deletePath });
  }

  private onOperationSuccess(msg: WebSocketMessage): void {
    const path = (msg.path as string) || (msg.oldPath as string) || '';
    const parts = path.split('/');
    parts.pop();
    const parentDir = parts.length > 0 ? parts.join('/') : '.';

    this.dispatchEvent(
      new CustomEvent('tree-refresh', {
        detail: { path: parentDir },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Handle rename success: refresh tree + dispatch document event for tab sync.
   */
  private onRenameSuccess(msg: WebSocketMessage): void {
    this.onOperationSuccess(msg);

    const oldPath = this.pendingRenameOldPath || (msg.oldPath as string) || '';
    const newPath = (msg.newPath as string) || (msg.path as string) || '';
    this.pendingRenameOldPath = '';

    if (oldPath && newPath) {
      document.dispatchEvent(
        new CustomEvent('file-renamed', {
          detail: { oldPath, newPath },
        })
      );
    }
  }

  /**
   * Handle delete success: refresh tree + dispatch document event for tab sync.
   */
  private onDeleteSuccess(msg: WebSocketMessage): void {
    const deletedPath = (msg.path as string) || '';
    this.onOperationSuccess(msg);

    if (deletedPath) {
      document.dispatchEvent(
        new CustomEvent('file-deleted', {
          detail: { path: deletedPath },
        })
      );
    }
  }

  private onOperationError(msg: WebSocketMessage): void {
    const errorMessage = (msg.error as string) || 'Operation fehlgeschlagen';
    window.alert(errorMessage);
  }

  private ensureStyles(): void {
    if (AosFileContextMenu.stylesInjected) return;
    AosFileContextMenu.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      .file-context-menu {
        position: fixed;
        z-index: 2000;
        min-width: 180px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.3));
        padding: var(--spacing-xs) 0;
        font-family: var(--font-family-sans);
        font-size: var(--font-size-sm);
      }

      .file-context-menu__item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-md);
        cursor: pointer;
        color: var(--color-text-secondary);
        transition: background-color var(--transition-fast), color var(--transition-fast);
        white-space: nowrap;
      }

      .file-context-menu__item:hover {
        background-color: var(--color-bg-hover);
        color: var(--color-text-primary);
      }

      .file-context-menu__item--danger:hover {
        background-color: rgba(var(--color-accent-error-rgb, 239, 68, 68), 0.15);
        color: var(--color-accent-error);
      }

      .file-context-menu__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .file-context-menu__label {
        flex: 1;
      }

      .file-context-menu__separator {
        height: 1px;
        background: var(--color-border);
        margin: var(--spacing-xs) 0;
      }
    `;
    document.head.appendChild(style);
  }

  override render() {
    this.ensureStyles();

    if (!this.isOpen) {
      return nothing;
    }

    return html`
      <div
        class="file-context-menu"
        style="left: ${this.position.x}px; top: ${this.position.y}px;"
        role="menu"
        aria-label="File context menu"
      >
        <div class="file-context-menu__item" role="menuitem" @click=${(e: Event) => this.handleNewFile(e)}>
          <span class="file-context-menu__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </span>
          <span class="file-context-menu__label">Neue Datei</span>
        </div>
        <div class="file-context-menu__item" role="menuitem" @click=${(e: Event) => this.handleNewFolder(e)}>
          <span class="file-context-menu__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </span>
          <span class="file-context-menu__label">Neuer Ordner</span>
        </div>
        <div class="file-context-menu__separator"></div>
        <div class="file-context-menu__item" role="menuitem" @click=${(e: Event) => this.handleRename(e)}>
          <span class="file-context-menu__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </span>
          <span class="file-context-menu__label">Umbenennen</span>
        </div>
        <div class="file-context-menu__separator"></div>
        <div class="file-context-menu__item file-context-menu__item--danger" role="menuitem" @click=${(e: Event) => this.handleDelete(e)}>
          <span class="file-context-menu__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </span>
          <span class="file-context-menu__label">Löschen</span>
        </div>
      </div>
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-file-context-menu': AosFileContextMenu;
  }
}
