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
          <span class="context-menu__icon">📋</span>
          <span class="context-menu__label">Neue Spec erstellen</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('create-bug', e)}>
          <span class="context-menu__icon">🐛</span>
          <span class="context-menu__label">Bug erstellen</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('create-todo', e)}>
          <span class="context-menu__icon">✓</span>
          <span class="context-menu__label">TODO erstellen</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('quick-todo', e)}>
          <span class="context-menu__icon">⚡</span>
          <span class="context-menu__label">Quick-To-Do</span>
        </div>
        <div class="context-menu__item" role="menuitem" @click=${(e: Event) => this.handleMenuItemClick('add-story', e)}>
          <span class="context-menu__icon">➕</span>
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
