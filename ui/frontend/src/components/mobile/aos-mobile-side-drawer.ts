import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import {
  projectContext,
  defaultProjectContext,
  type ProjectContextValue,
} from '../../context/project-context.js';
import { routerService } from '../../services/router.service.js';
import type { ViewType } from '../../types/route.types.js';
import './aos-mobile-sheet.js';

export type DrawerNavRoute = 'dashboard' | 'specs' | 'cloud-terminal' | 'prompt-templates' | 'settings';

@customElement('aos-mobile-side-drawer')
export class AosMobileSideDrawer extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) avatarSrc = '';
  @property({ type: String }) avatarInitials = '';
  @property({ type: String }) workspaceName = '';
  @property({ type: String }) activeRoute: DrawerNavRoute = 'dashboard';

  @consume({ context: projectContext, subscribe: true })
  private _projectCtx: ProjectContextValue = defaultProjectContext;

  private _close(): void {
    this.dispatchEvent(new CustomEvent('drawer-close', { bubbles: true, composed: true }));
  }

  private _onProjectTap(projectId: string): void {
    this._projectCtx.switchProject(projectId);
    this._close();
  }

  private _onNavTap(route: DrawerNavRoute): void {
    const routerRoutes: Partial<Record<DrawerNavRoute, ViewType>> = {
      dashboard: 'dashboard',
      'prompt-templates': 'prompt-templates',
      settings: 'settings',
    };
    const viewType = routerRoutes[route];
    if (viewType) {
      routerService.navigate(viewType);
    } else {
      this.dispatchEvent(
        new CustomEvent<{ route: DrawerNavRoute }>('drawer-nav', {
          bubbles: true,
          composed: true,
          detail: { route },
        })
      );
    }
    this._close();
  }

  private _onLogout(): void {
    this.dispatchEvent(new CustomEvent('logout-tap', { bubbles: true, composed: true }));
  }

  private _renderAvatar() {
    if (this.avatarSrc) {
      return html`<img class="avatar-img" src=${this.avatarSrc} alt="" aria-hidden="true" />`;
    }
    return html`<span class="avatar-initials">${this.avatarInitials || '?'}</span>`;
  }

  private _navIcon(route: DrawerNavRoute) {
    if (route === 'dashboard') {
      return html`
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 8L9 2l7 6v8a1 1 0 0 1-1 1H12v-5H6v5H3a1 1 0 0 1-1-1V8Z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
        </svg>
      `;
    }
    if (route === 'specs') {
      return html`
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/>
          <path d="M5 6.5h8M5 9.5h6M5 12.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      `;
    }
    if (route === 'cloud-terminal') {
      return html`
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="1.5" y="3" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/>
          <path d="M5 7.5l2.5 2L5 12M10 12h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    if (route === 'prompt-templates') {
      return html`
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M10.5 2H4.5A1.5 1.5 0 0 0 3 3.5v11A1.5 1.5 0 0 0 4.5 16h9a1.5 1.5 0 0 0 1.5-1.5V6.5L10.5 2Z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
          <path d="M10.5 2v4.5H15M6 9.5h6M6 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    return html`
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.4" fill="none"/>
        <circle cx="9" cy="7" r="2.5" stroke="currentColor" stroke-width="1.4" fill="none"/>
        <path d="M3.5 15.5C3.5 13 6 11 9 11s5.5 2 5.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      </svg>
    `;
  }

  override render() {
    const { openProjects, activeProject } = this._projectCtx;

    const navItems: { route: DrawerNavRoute; label: string }[] = [
      { route: 'dashboard', label: 'Dashboard' },
      { route: 'specs', label: 'Specs' },
      { route: 'cloud-terminal', label: 'Terminal' },
      { route: 'prompt-templates', label: 'Prompt Templates' },
      { route: 'settings', label: 'Settings' },
    ];

    return html`
      <aos-mobile-sheet
        ?open=${this.open}
        position="left"
        label="Navigation"
        @sheet-close=${this._close}
      >
        <div class="drawer">
          <!-- Header: Avatar + Workspace -->
          <div class="drawer-header">
            <div class="avatar-wrap">${this._renderAvatar()}</div>
            <div class="workspace-info">
              <span class="workspace-name">${this.workspaceName || 'Workspace'}</span>
            </div>
          </div>

          <!-- Projects -->
          ${openProjects.length > 0
            ? html`
                <section class="section" aria-label="Projects">
                  <p class="section-label">Projects</p>
                  <ul class="project-list" role="list">
                    ${openProjects.map(
                      (p) => html`
                        <li role="listitem">
                          <button
                            class="project-item touch-target ${activeProject?.id === p.id ? 'project-item--active' : ''}"
                            aria-current=${activeProject?.id === p.id ? 'true' : nothing}
                            @click=${() => this._onProjectTap(p.id)}
                          >
                            <span class="project-dot" aria-hidden="true"></span>
                            <span class="project-name">${p.name}</span>
                          </button>
                        </li>
                      `
                    )}
                  </ul>
                </section>
              `
            : nothing}

          <!-- Navigation -->
          <section class="section" aria-label="Navigation">
            <p class="section-label">Navigation</p>
            <ul class="nav-list" role="list">
              ${navItems.map(
                ({ route, label }) => html`
                  <li role="listitem">
                    <button
                      class="nav-item touch-target ${this.activeRoute === route ? 'nav-item--active' : ''}"
                      aria-current=${this.activeRoute === route ? 'page' : nothing}
                      @click=${() => this._onNavTap(route)}
                    >
                      <span class="nav-icon">${this._navIcon(route)}</span>
                      <span class="nav-label">${label}</span>
                    </button>
                  </li>
                `
              )}
            </ul>
          </section>

          <!-- Spacer -->
          <div class="spacer"></div>

          <!-- Footer: Logout -->
          <div class="drawer-footer">
            <button class="logout-btn touch-target" @click=${this._onLogout}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M7 15H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M12 12l3-3-3-3M7 9h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aos-mobile-sheet>
    `;
  }

  static styles = css`
    :host {
      display: contents;
    }

    .touch-target {
      min-height: var(--touch-target-min, 44px);
    }

    .drawer {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100dvh;
      overflow: hidden auto;
      overscroll-behavior: contain;
    }

    /* Header */
    .drawer-header {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-md, 0.75rem);
      padding: var(--space-mobile-lg, 1rem) var(--space-mobile-md, 0.75rem);
      padding-top: calc(var(--space-mobile-lg, 1rem) + env(safe-area-inset-top, 0px));
      border-bottom: 1px solid var(--color-border, #1e3a5f);
    }

    .avatar-wrap {
      flex-shrink: 0;
    }

    .avatar-img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .avatar-initials {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-accent-primary, #00d4ff);
      color: var(--color-bg-sidebar, #0b1929);
      font-size: 0.875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .workspace-info {
      min-width: 0;
    }

    .workspace-name {
      display: block;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary, #e8edf2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Sections */
    .section {
      padding: var(--space-mobile-sm, 0.5rem) 0;
    }

    .section-label {
      margin: 0 0 2px;
      padding: 0 var(--space-mobile-md, 0.75rem);
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-muted, #64748b);
    }

    /* Project list */
    .project-list,
    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .project-item {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-sm, 0.5rem);
      width: 100%;
      padding: 0 var(--space-mobile-md, 0.75rem);
      background: none;
      border: none;
      color: var(--color-text-secondary, #94a3b8);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      border-radius: 0;
      transition: background 0.12s, color 0.12s;
      -webkit-tap-highlight-color: transparent;
    }

    .project-item:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .project-item--active {
      color: var(--color-text-primary, #e8edf2);
      font-weight: 600;
    }

    .project-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
      opacity: 0.4;
    }

    .project-item--active .project-dot {
      background: var(--color-accent-primary, #00d4ff);
      opacity: 1;
    }

    .project-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Nav items */
    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-md, 0.75rem);
      width: 100%;
      padding: 0 var(--space-mobile-md, 0.75rem);
      background: none;
      border: none;
      color: var(--color-text-secondary, #94a3b8);
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      border-radius: 0;
      transition: background 0.12s, color 0.12s;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item:active {
      background: var(--color-bg-hover, #1e3a5f);
    }

    .nav-item--active {
      color: var(--color-accent-primary, #00d4ff);
      font-weight: 600;
    }

    .nav-icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .nav-label {
      line-height: 1.2;
    }

    /* Spacer + Footer */
    .spacer {
      flex: 1;
    }

    .drawer-footer {
      padding: var(--space-mobile-sm, 0.5rem) 0;
      padding-bottom: calc(var(--space-mobile-sm, 0.5rem) + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid var(--color-border, #1e3a5f);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: var(--space-mobile-md, 0.75rem);
      width: 100%;
      padding: 0 var(--space-mobile-md, 0.75rem);
      background: none;
      border: none;
      color: var(--color-accent-error, #ef4444);
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      border-radius: 0;
      transition: background 0.12s;
      -webkit-tap-highlight-color: transparent;
    }

    .logout-btn:active {
      background: var(--color-bg-hover, #1e3a5f);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-mobile-side-drawer': AosMobileSideDrawer;
  }
}
