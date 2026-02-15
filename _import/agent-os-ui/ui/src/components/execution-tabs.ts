import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './execution-tab.js';
import './command-selector.js';
import type { ExecutionTabData } from './execution-tab.js';
import type { WorkflowCommand } from './workflow-card.js';

@customElement('aos-execution-tabs')
export class AosExecutionTabs extends LitElement {
  @property({ type: Array }) tabs: ExecutionTabData[] = [];
  @property({ type: String }) activeTabId: string | null = null;
  @property({ type: Array }) commands: WorkflowCommand[] = [];

  @state() private selectorOpen = false;
  @state() private confirmCloseTabId: string | null = null;
  @state() private addButtonRef: Element | null = null;

  override firstUpdated(): void {
    // Use the wrapper instead of the button - it contains both button and selector
    this.addButtonRef = this.querySelector('.execution-tabs__add-wrapper');
    console.log('[execution-tabs] firstUpdated, addButtonRef:', this.addButtonRef);
  }

  private handleTabSelect(e: CustomEvent<{ tabId: string }>): void {
    this.dispatchEvent(
      new CustomEvent('tab-select', {
        detail: { tabId: e.detail.tabId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleTabClose(e: CustomEvent<{ tabId: string }>): void {
    const tabId = e.detail.tabId;
    const tab = this.tabs.find(t => t.id === tabId);

    // If execution is running or waiting, show confirmation dialog
    if (tab && (tab.status === 'running' || tab.status === 'starting' || tab.status === 'waiting_input')) {
      this.confirmCloseTabId = tabId;
      return;
    }

    // Otherwise close directly
    this.dispatchEvent(
      new CustomEvent('tab-close', {
        detail: { tabId },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleConfirmClose(): void {
    if (!this.confirmCloseTabId) return;

    // Dispatch cancel event first (to kill the process)
    this.dispatchEvent(
      new CustomEvent('tab-cancel', {
        detail: { tabId: this.confirmCloseTabId },
        bubbles: true,
        composed: true
      })
    );

    // Then close the tab
    this.dispatchEvent(
      new CustomEvent('tab-close', {
        detail: { tabId: this.confirmCloseTabId },
        bubbles: true,
        composed: true
      })
    );

    this.confirmCloseTabId = null;
  }

  private handleDismissConfirm(): void {
    this.confirmCloseTabId = null;
  }

  private handleAddClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();
    console.log('[execution-tabs] handleAddClick', {
      selectorOpenBefore: this.selectorOpen,
      eventType: e.type,
      eventTarget: e.target,
      currentTarget: e.currentTarget,
      timeStamp: e.timeStamp,
      isTrusted: e.isTrusted
    });
    this.selectorOpen = !this.selectorOpen;
  }

  private handleCommandSelect(e: CustomEvent<{ commandId: string; commandName: string }>): void {
    this.selectorOpen = false;
    this.dispatchEvent(
      new CustomEvent('tab-add', {
        detail: { commandId: e.detail.commandId, commandName: e.detail.commandName },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleSelectorClose(): void {
    this.selectorOpen = false;
  }

  private renderConfirmDialog() {
    if (!this.confirmCloseTabId) return nothing;

    const tab = this.tabs.find(t => t.id === this.confirmCloseTabId);
    if (!tab) return nothing;

    return html`
      <div class="cancel-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="cancel-confirm-dialog">
          <div class="cancel-confirm-icon">⚠️</div>
          <div class="cancel-confirm-title" id="confirm-title">Laufende Execution abbrechen?</div>
          <div class="cancel-confirm-message">
            "${tab.commandName}" wird noch ausgeführt. Möchten Sie den Prozess wirklich beenden?
          </div>
          <div class="cancel-confirm-actions">
            <button class="cancel-confirm-btn secondary" @click=${this.handleDismissConfirm}>
              Weiter ausführen
            </button>
            <button class="cancel-confirm-btn primary" @click=${this.handleConfirmClose}>
              Abbrechen bestätigen
            </button>
          </div>
        </div>
      </div>
    `;
  }

  override render() {
    const hasTabs = this.tabs.length > 0;

    return html`
      <div class="execution-tabs" role="tablist" aria-label="Workflow executions">
        ${hasTabs
          ? this.tabs.map(
              (tab) => html`
                <aos-execution-tab
                  .tab=${tab}
                  .active=${tab.id === this.activeTabId}
                  @tab-select=${this.handleTabSelect}
                  @tab-close=${this.handleTabClose}
                ></aos-execution-tab>
              `
            )
          : nothing}
        <div class="execution-tabs__add-wrapper">
          <button
            class="execution-tabs__add"
            @click=${this.handleAddClick}
            title="Start new workflow"
            aria-label="Start new workflow"
          >
            +
          </button>
          <aos-command-selector
            .commands=${this.commands}
            .open=${this.selectorOpen}
            .triggerElement=${this.addButtonRef}
            @command-select=${this.handleCommandSelect}
            @selector-close=${this.handleSelectorClose}
          ></aos-command-selector>
        </div>
      </div>
      ${this.renderConfirmDialog()}
    `;
  }

  protected override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-execution-tabs': AosExecutionTabs;
  }
}
