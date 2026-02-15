import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { QueueItem } from './aos-queue-item.js';
import './aos-queue-section.js';
import './aos-specs-section.js';
import './aos-execution-log-tab.js';

/**
 * Global Queue Panel Component
 *
 * A collapsible bottom panel that provides access to Queue & Specs
 * and Execution Log from any view. Uses Light DOM for global styling.
 *
 * Features:
 * - Slide-up animation from bottom
 * - Resizable via drag handle (min 200px, max 60vh)
 * - Persistent height and active tab via localStorage
 * - Two tabs: "Queue & Specs" and "Log"
 * - Keyboard accessible with ARIA labels
 */
@customElement('aos-global-queue-panel')
export class AosGlobalQueuePanel extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: String }) activeTab: 'queue-specs' | 'log' = 'queue-specs';
  @property({ type: Array }) queue: QueueItem[] = [];
  @property({ type: Boolean }) isQueueRunning = false;
  @state() private panelHeight = 350;
  @state() private isResizing = false;

  private readonly minPanelHeight = 200;
  private readonly maxPanelHeightVh = 60;

  private get maxPanelHeight(): number {
    return window.innerHeight * (this.maxPanelHeightVh / 100);
  }

  override createRenderRoot() {
    return this;
  }

  private static stylesInjected = false;

  private ensureStyles() {
    if (AosGlobalQueuePanel.stylesInjected) return;
    AosGlobalQueuePanel.stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      aos-global-queue-panel {
        display: block;
      }

      .gqp-panel {
        position: fixed;
        bottom: 0;
        left: var(--sidebar-width, 280px);
        right: 0;
        z-index: 999;
        background: var(--color-bg-secondary, #1a1a1a);
        border-top: 1px solid var(--color-border, #333333);
        display: flex;
        flex-direction: column;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
        transform: translateY(100%);
        transition: transform 0.3s ease;
      }

      .gqp-panel.open {
        transform: translateY(0);
      }

      .gqp-resize-handle {
        position: absolute;
        top: -3px;
        left: 0;
        right: 0;
        height: 6px;
        cursor: row-resize;
        z-index: 1000;
        background: transparent;
        transition: background 0.2s;
      }

      .gqp-resize-handle:hover,
      .gqp-resize-handle.resizing {
        background: var(--color-accent-secondary, #3b82f6);
      }

      .gqp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        height: 40px;
        min-height: 40px;
        border-bottom: 1px solid var(--color-border, #333333);
        background: var(--color-bg-tertiary, #262626);
        user-select: none;
      }

      .gqp-tabs {
        display: flex;
        gap: 0;
        height: 100%;
      }

      .gqp-tab {
        background: transparent;
        border: none;
        color: var(--color-text-secondary, #a3a3a3);
        cursor: pointer;
        padding: 0 16px;
        font-size: 13px;
        font-weight: 500;
        height: 100%;
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }

      .gqp-tab:hover {
        color: var(--color-text-primary, #ffffff);
        background: var(--color-bg-elevated, #2d2d2d);
      }

      .gqp-tab.active {
        color: var(--color-text-primary, #ffffff);
        border-bottom-color: var(--color-accent-secondary, #3b82f6);
      }

      .gqp-tab svg {
        width: 14px;
        height: 14px;
      }

      .gqp-header-actions {
        display: flex;
        gap: 4px;
      }

      .gqp-action-btn {
        background: transparent;
        border: none;
        color: var(--color-text-secondary, #a3a3a3);
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .gqp-action-btn:hover {
        background: var(--color-bg-elevated, #2d2d2d);
        color: var(--color-text-primary, #ffffff);
      }

      .gqp-action-btn svg {
        width: 16px;
        height: 16px;
      }

      .gqp-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .gqp-tab-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow-y: auto;
        display: none;
      }

      .gqp-tab-content.active {
        display: block;
      }

      .gqp-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-secondary, #a3a3a3);
        font-size: 13px;
      }

      .gqp-split-view {
        display: grid;
        grid-template-columns: 1fr 1fr;
        height: 100%;
      }

      .gqp-split-left {
        overflow: hidden;
      }

      .gqp-split-right {
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  override render() {
    this.ensureStyles();

    const panelStyles = {
      height: `${this.panelHeight}px`,
    };

    return html`
      <div
        class="gqp-panel ${this.isOpen ? 'open' : ''}"
        style=${styleMap(panelStyles)}
        role="region"
        aria-label="Global Queue Panel"
      >
        <div
          class="gqp-resize-handle ${this.isResizing ? 'resizing' : ''}"
          @pointerdown=${this._handleResizeStart}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Panel-Größe ändern"
          tabindex="0"
          @keydown=${this._handleResizeKeydown}
        ></div>

        <div class="gqp-header">
          <div class="gqp-tabs" role="tablist" aria-label="Panel-Tabs">
            <button
              class="gqp-tab ${this.activeTab === 'queue-specs' ? 'active' : ''}"
              role="tab"
              aria-selected="${this.activeTab === 'queue-specs'}"
              aria-controls="gqp-tabpanel-queue-specs"
              id="gqp-tab-queue-specs"
              @click=${() => this._handleTabChange('queue-specs')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              Queue & Specs
            </button>
            <button
              class="gqp-tab ${this.activeTab === 'log' ? 'active' : ''}"
              role="tab"
              aria-selected="${this.activeTab === 'log'}"
              aria-controls="gqp-tabpanel-log"
              id="gqp-tab-log"
              @click=${() => this._handleTabChange('log')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Log
            </button>
          </div>
          <div class="gqp-header-actions">
            <button
              class="gqp-action-btn"
              @click=${this._handleClose}
              title="Panel schließen"
              aria-label="Panel schließen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="gqp-content">
          <div
            class="gqp-tab-content ${this.activeTab === 'queue-specs' ? 'active' : ''}"
            role="tabpanel"
            id="gqp-tabpanel-queue-specs"
            aria-labelledby="gqp-tab-queue-specs"
          >
            <div class="gqp-split-view">
              <div class="gqp-split-left">
                <aos-queue-section
                  .queue=${this.queue}
                  .isQueueRunning=${this.isQueueRunning}
                ></aos-queue-section>
              </div>
              <div class="gqp-split-right">
                <aos-specs-section></aos-specs-section>
              </div>
            </div>
          </div>
          <div
            class="gqp-tab-content ${this.activeTab === 'log' ? 'active' : ''}"
            role="tabpanel"
            id="gqp-tabpanel-log"
            aria-labelledby="gqp-tab-log"
          >
            <aos-execution-log-tab></aos-execution-log-tab>
          </div>
        </div>
      </div>
    `;
  }

  private _handleTabChange(tab: 'queue-specs' | 'log') {
    this.activeTab = tab;
    try {
      localStorage.setItem('global-queue-panel-tab', tab);
    } catch {
      // localStorage unavailable
    }
    this.dispatchEvent(
      new CustomEvent('tab-change', {
        detail: { tab },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleClose() {
    this.dispatchEvent(
      new CustomEvent('panel-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleResizeStart(e: PointerEvent) {
    e.preventDefault();
    this.isResizing = true;
    const startY = e.clientY;
    const startHeight = this.panelHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.max(
        this.minPanelHeight,
        Math.min(this.maxPanelHeight, startHeight + delta)
      );
      this.panelHeight = newHeight;
    };

    const handlePointerUp = () => {
      this.isResizing = false;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);

      try {
        localStorage.setItem('global-queue-panel-height', String(this.panelHeight));
      } catch {
        // localStorage unavailable
      }
      this.dispatchEvent(
        new CustomEvent('panel-resize', {
          detail: { height: this.panelHeight },
          bubbles: true,
          composed: true,
        })
      );
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }

  private _handleResizeKeydown(e: KeyboardEvent) {
    const step = 20;
    let newHeight = this.panelHeight;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      newHeight = Math.min(this.maxPanelHeight, this.panelHeight + step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      newHeight = Math.max(this.minPanelHeight, this.panelHeight - step);
    } else {
      return;
    }

    this.panelHeight = newHeight;
    try {
      localStorage.setItem('global-queue-panel-height', String(this.panelHeight));
    } catch {
      // localStorage unavailable
    }
    this.dispatchEvent(
      new CustomEvent('panel-resize', {
        detail: { height: this.panelHeight },
        bubbles: true,
        composed: true,
      })
    );
  }

  override connectedCallback() {
    super.connectedCallback();

    try {
      const savedHeight = localStorage.getItem('global-queue-panel-height');
      if (savedHeight) {
        const height = parseInt(savedHeight, 10);
        if (height >= this.minPanelHeight && height <= this.maxPanelHeight) {
          this.panelHeight = height;
        }
      }

      const savedTab = localStorage.getItem('global-queue-panel-tab');
      if (savedTab === 'queue-specs' || savedTab === 'log') {
        this.activeTab = savedTab;
      }
    } catch {
      // localStorage unavailable
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-global-queue-panel': AosGlobalQueuePanel;
  }
}
