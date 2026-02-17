import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import './aos-file-tree.js';
import './aos-file-context-menu.js';
import type { AosFileTree } from './aos-file-tree.js';
import type { AosFileContextMenu } from './aos-file-context-menu.js';

/**
 * File Tree Sidebar Component
 *
 * A sliding overlay sidebar from the left for browsing project files.
 * Features:
 * - Slide in/out animation from the left
 * - Resizable width via drag handle on the right edge
 * - Contains aos-file-tree for directory browsing
 * - Dispatches file-open events to parent
 *
 * Follows the aos-cloud-terminal-sidebar pattern (mirrored to left side).
 */
@customElement('aos-file-tree-sidebar')
export class AosFileTreeSidebar extends LitElement {
  @property({ type: Boolean }) isOpen = false;

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('isOpen')) {
      this.updateContentOffset();
      if (this.isOpen) {
        // Retry loading when sidebar opens, in case initial load failed
        const tree = this.querySelector('aos-file-tree') as AosFileTree | null;
        if (tree) {
          tree.reload();
        }
      }
    }
  }
  @state() private sidebarWidth = 280;
  @state() private isResizing = false;
  @state() private filterText = '';
  private readonly minSidebarWidth = 200;
  private get maxSidebarWidth() {
    return window.innerWidth * 0.5;
  }

  // Use light DOM for styling compatibility
  override createRenderRoot() {
    return this;
  }

  private static stylesInjected = false;

  private ensureStyles() {
    if (AosFileTreeSidebar.stylesInjected) return;
    AosFileTreeSidebar.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      aos-file-tree-sidebar {
        display: block;
      }

      .file-tree-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: var(--file-tree-sidebar-width, 280px);
        background: var(--color-bg-secondary, #1e1e1e);
        border-right: 1px solid var(--color-border, #404040);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        box-shadow: 5px 0 15px rgba(0, 0, 0, 0.3);
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .file-tree-sidebar.open {
        transform: translateX(0);
      }

      .file-tree-sidebar-resizer {
        position: fixed;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: col-resize;
        z-index: 1001;
        background: transparent;
        transition: background 0.2s;
      }

      .file-tree-sidebar-resizer:hover,
      .file-tree-sidebar-resizer.resizing {
        background: var(--color-accent-primary, #007acc);
      }

      .file-tree-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border, #404040);
        background: var(--color-bg-tertiary, #252526);
      }

      .file-tree-sidebar-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary, #e0e0e0);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .file-tree-sidebar-title-icon {
        width: 16px;
        height: 16px;
        color: var(--color-accent-primary, #007acc);
      }

      .file-tree-sidebar-actions {
        display: flex;
        gap: 8px;
      }

      .file-tree-sidebar-close-btn {
        background: transparent;
        border: none;
        color: var(--color-text-secondary, #a0a0a0);
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .file-tree-sidebar-close-btn:hover {
        background: var(--color-bg-hover, #3c3c3c);
        color: var(--color-text-primary, #e0e0e0);
      }

      .file-tree-sidebar-close-btn svg {
        width: 16px;
        height: 16px;
      }

      .file-tree-sidebar-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .file-tree-sidebar-search {
        padding: 8px 12px;
        border-bottom: 1px solid var(--color-border, #404040);
      }

      .file-tree-sidebar-search-input {
        width: 100%;
        padding: 6px 10px;
        background: var(--color-bg-primary, #1a1a1a);
        border: 1px solid var(--color-border, #404040);
        border-radius: var(--radius-sm, 4px);
        color: var(--color-text-primary, #e0e0e0);
        font-size: var(--font-size-sm, 13px);
        font-family: var(--font-family-sans);
        outline: none;
        box-sizing: border-box;
        transition: border-color var(--transition-fast, 0.15s);
      }

      .file-tree-sidebar-search-input:focus {
        border-color: var(--color-accent-primary, #007acc);
      }

      .file-tree-sidebar-search-input::placeholder {
        color: var(--color-text-muted, #666);
      }
    `;
    document.head.appendChild(style);
  }

  override render() {
    this.ensureStyles();

    const sidebarStyles = {
      '--file-tree-sidebar-width': `${this.sidebarWidth}px`,
    };

    const resizerStyles = {
      left: this.isOpen ? `${this.sidebarWidth - 3}px` : '-10px',
    };

    return html`
      <div
        class="file-tree-sidebar-resizer ${this.isResizing ? 'resizing' : ''}"
        style=${styleMap(resizerStyles)}
        @mousedown=${this._handleResizeStart}
      ></div>

      <div
        class="file-tree-sidebar ${this.isOpen ? 'open' : ''}"
        style=${styleMap(sidebarStyles)}
      >
        <div class="file-tree-sidebar-header">
          <div class="file-tree-sidebar-title">
            <svg class="file-tree-sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Dateien
          </div>
          <div class="file-tree-sidebar-actions">
            <button
              class="file-tree-sidebar-close-btn"
              @click=${this._handleClose}
              title="Sidebar schliessen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="file-tree-sidebar-search">
          <input
            class="file-tree-sidebar-search-input"
            type="text"
            placeholder="Dateien suchen..."
            .value=${this.filterText}
            @input=${this._handleFilterInput}
          />
        </div>

        <div class="file-tree-sidebar-content">
          <aos-file-tree
            rootPath="."
            .filterText=${this.filterText}
            @file-open=${this._handleFileOpen}
            @file-contextmenu=${this._handleFileContextMenu}
          ></aos-file-tree>
        </div>
      </div>

      <aos-file-context-menu
        @tree-refresh=${this._handleTreeRefresh}
      ></aos-file-context-menu>
    `;
  }

  private _handleFilterInput(e: Event) {
    this.filterText = (e.target as HTMLInputElement).value;
  }

  private _handleClose() {
    this.dispatchEvent(
      new CustomEvent('sidebar-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFileOpen(e: CustomEvent<{ path: string; filename: string }>) {
    // Re-dispatch file-open event so parent (app.ts) can handle it
    this.dispatchEvent(
      new CustomEvent('file-open', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFileContextMenu(e: CustomEvent<{ path: string; filename: string; type: 'file' | 'directory'; x: number; y: number }>) {
    const menu = this.querySelector('aos-file-context-menu') as AosFileContextMenu | null;
    if (menu) {
      menu.show(e.detail.x, e.detail.y, e.detail.path, e.detail.filename, e.detail.type);
    }
  }

  private _handleTreeRefresh(e: CustomEvent<{ path: string }>) {
    const tree = this.querySelector('aos-file-tree') as AosFileTree | null;
    if (tree) {
      tree.refreshDirectory(e.detail.path);
    }
  }

  /**
   * Set a CSS custom property on the document root so that the main content
   * area can shift right when the file-tree sidebar is open.
   */
  private updateContentOffset(): void {
    const width = this.isOpen ? this.sidebarWidth : 0;
    document.documentElement.style.setProperty('--file-tree-open-width', `${width}px`);
  }

  private _handleResizeStart(e: MouseEvent) {
    this.isResizing = true;
    const startX = e.clientX;
    const startWidth = this.sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
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
        localStorage.setItem('file-tree-sidebar-width', String(this.sidebarWidth));
      } catch {
        // localStorage unavailable
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  override connectedCallback() {
    super.connectedCallback();

    // Load saved width preference
    try {
      const savedWidth = localStorage.getItem('file-tree-sidebar-width');
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= this.minSidebarWidth && width <= this.maxSidebarWidth) {
          this.sidebarWidth = width;
        }
      }
    } catch {
      // localStorage unavailable
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-file-tree-sidebar': AosFileTreeSidebar;
  }
}
