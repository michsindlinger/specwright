import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
}

export interface MenuSelectEventDetail {
  action: string;
}

/**
 * Context menu component that appears at mouse position on right-click.
 * Shows workflow action items and closes on outside click or ESC key.
 *
 * @fires menu-item-select - Fired when a menu item is clicked. Detail: { action: string }
 */
@customElement('aos-context-menu')
export class AosContextMenu extends LitElement {
  @state() private isOpen = false;
  @state() private position = { x: 0, y: 0 };

  private boundKeyDownHandler = this.handleKeyDown.bind(this);
  private boundClickOutsideHandler = this.handleClickOutside.bind(this);

  /**
   * Show the context menu at the specified position
   */
  show(x: number, y: number): void {
    this.position = this.adjustPosition(x, y);
    this.isOpen = true;
    this.addGlobalListeners();
  }

  /**
   * Hide the context menu
   */
  hide(): void {
    this.isOpen = false;
    this.removeGlobalListeners();
  }

  /**
   * Adjust position to keep menu within viewport bounds
   * Estimates menu dimensions before rendering for accurate positioning
   */
  private adjustPosition(x: number, y: number): { x: number; y: number } {
    // Estimate menu dimensions (will be refined after render)
    const estimatedWidth = 240;  // Approximate width based on menu items
    const estimatedHeight = 220; // Approximate height based on 5 menu items
    const padding = 10;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Check right edge - position menu to the left of cursor if needed
    if (x + estimatedWidth > viewportWidth - padding) {
      adjustedX = Math.max(padding, x - estimatedWidth);
    }

    // Check bottom edge - position menu above cursor if needed
    if (y + estimatedHeight > viewportHeight - padding) {
      adjustedY = Math.max(padding, y - estimatedHeight);
    }

    // Ensure menu doesn't go off left or top edge
    adjustedX = Math.max(padding, adjustedX);
    adjustedY = Math.max(padding, adjustedY);

    // Refine position after menu is rendered
    requestAnimationFrame(() => {
      const menu = this.querySelector('.context-menu') as HTMLElement;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();

      // Fine-tune position with actual dimensions
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

      // Only update if position changed significantly
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

  private handleMenuItemClick(action: string, e: Event): void {
    e.stopPropagation();
    this.hide();

    this.dispatchEvent(
      new CustomEvent('menu-item-select', {
        detail: { action } as MenuSelectEventDetail,
        bubbles: true,
        composed: true
      })
    );
  }

  override render() {
    if (!this.isOpen) {
      return nothing;
    }

    return html`
      <div
        class="context-menu"
        style="left: ${this.position.x}px; top: ${this.position.y}px;"
        role="menu"
        aria-label="Context menu"
      >
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('create-spec', e)}>
          <span class="context-menu__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
          <span class="context-menu__label">Neue Spec erstellen</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('create-bug', e)}>
          <span class="context-menu__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="6"/><path d="M12 9V3"/><path d="m6.5 9.5-4-3"/><path d="m17.5 9.5 4-3"/><path d="M3 15h3"/><path d="M18 15h3"/><path d="m6.5 20.5-4 3"/><path d="m17.5 20.5 4 3"/></svg></span>
          <span class="context-menu__label">Bug erstellen</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('create-todo', e)}>
          <span class="context-menu__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
          <span class="context-menu__label">TODO erstellen</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('quick-todo', e)}>
          <span class="context-menu__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
          <span class="context-menu__label">Quick-To-Do</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('add-story', e)}>
          <span class="context-menu__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
          <span class="context-menu__label">Story zu Spec hinzufügen</span>
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
    'aos-context-menu': AosContextMenu;
  }
}
