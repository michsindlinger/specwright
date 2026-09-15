/**
 * aos-vorhaben-view — the new work surface (INT-2026-004): routes
 * `vorhaben` (overview, Vorhaben page) and `projekt` (project page) inside the
 * unchanged app frame. Light DOM like the other views. On phones it composes
 * the mobile shell (top bar, bottom nav with the "wartet auf dich" counter,
 * drawer) from the existing mobile components — the old dashboard did the
 * same by template composition, so the shell survives its removal (plan §2).
 *
 * Routes: `#/vorhaben` · `#/vorhaben/<projectId>/<INT-…>[/<doc>]` ·
 * `#/projekt[/<projectId>[/<docKey>]]` (projectId URL-encoded).
 */

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { projectContext, type ProjectContextValue, defaultProjectContext } from '../context/project-context.js';
import { routerService } from '../services/router.service.js';
import { gateway } from '../gateway.js';
import { vorhabenService } from '../services/vorhaben.service.js';
import { MobileBreakpointController } from '../controllers/mobile-breakpoint-controller.js';
import type { ParsedRoute, ViewType } from '../types/route.types.js';
import type { ProjectDocKey, VorhabenRow, VorhabenState } from '../../../src/shared/types/vorhaben.protocol.js';
import { PROJECT_DOC_KEYS, VORHABEN_DOC_ORDER, draftKey } from '../../../src/shared/types/vorhaben.protocol.js';
import { countWaitingForMe } from '../components/vorhaben/vorhaben-sort.js';
import { defaultDoc } from '../components/vorhaben/aos-vorhaben-seite.js';
import type { LeserDoc } from '../components/vorhaben/aos-dokument-leser.js';
import type { BottomNavItem } from '../components/mobile/aos-mobile-bottom-nav.js';
import type { DrawerNavRoute } from '../components/mobile/aos-mobile-side-drawer.js';
import '../components/vorhaben/aos-vorhaben-uebersicht.js';
import '../components/vorhaben/aos-vorhaben-seite.js';
import '../components/vorhaben/aos-projekt-seite.js';
import '../components/mobile/aos-mobile-top-bar.js';
import '../components/mobile/aos-mobile-bottom-nav.js';
import '../components/mobile/aos-mobile-side-drawer.js';
import '../components/mobile/aos-mobile-terminal-pill.js';

export type VorhabenRoute = 'vorhaben' | 'projekt';

const INTENT_ID_RE = /^INT-\d{4}-\d{3}$/;

@customElement('aos-vorhaben-view')
export class AosVorhabenView extends LitElement {
  @property({ type: String }) route: VorhabenRoute = 'vorhaben';

  @consume({ context: projectContext, subscribe: true })
  private projectCtx: ProjectContextValue = defaultProjectContext;

  @state() private vorhabenState: VorhabenState | null = null;
  @state() private segments: string[] = [];
  @state() private connected = true;
  @state() private filterProjectId: string | null = null;
  @state() private drawerOpen = false;

  private readonly breakpoint = new MobileBreakpointController(this);
  private unsubscribeState: (() => void) | null = null;
  private readonly onRoute = (route: ParsedRoute): void => {
    if (route.view === 'vorhaben' || route.view === 'projekt') {
      this.route = route.view;
      this.segments = route.segments;
    }
  };
  private readonly onConnected = (): void => {
    this.connected = true;
    vorhabenService.refresh();
  };
  private readonly onDisconnected = (): void => {
    this.connected = false;
  };

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribeState = vorhabenService.subscribe((s) => {
      this.vorhabenState = s;
    });
    routerService.on('route-changed', this.onRoute);
    const current = routerService.getCurrentRoute();
    if (current) this.onRoute(current);
    gateway.on('gateway.connected', this.onConnected);
    gateway.on('gateway.disconnected', this.onDisconnected);
    this.connected = gateway.getConnectionStatus() || gateway.isConnecting();
    vorhabenService.refresh();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribeState?.();
    routerService.off('route-changed', this.onRoute);
    gateway.off('gateway.connected', this.onConnected);
    gateway.off('gateway.disconnected', this.onDisconnected);
  }

  // ---- navigation helpers ----

  private go(view: ViewType, segments: string[] = []): void {
    routerService.navigate(view, segments);
  }

  private openRow(row: VorhabenRow, doc?: LeserDoc): void {
    this.go('vorhaben', [encodeURIComponent(row.projectId), row.intentId, ...(doc ? [doc] : [])]);
  }

  private currentRow(): { row: VorhabenRow | undefined; missing: boolean } {
    const [pid, intentId] = this.segments;
    if (!pid || !intentId || !INTENT_ID_RE.test(intentId)) return { row: undefined, missing: false };
    const projectId = safeDecode(pid);
    const row = this.vorhabenState?.rows.find((r) => r.projectId === projectId && r.intentId === intentId);
    return { row, missing: !row && !!this.vorhabenState && !this.vorhabenState.loading };
  }

  private currentDoc(row: VorhabenRow): LeserDoc {
    const seg = this.segments[2];
    if (seg === 'design' && row.designFiles.length) return 'design';
    if (seg && (VORHABEN_DOC_ORDER as readonly string[]).includes(seg) && row.docs.some((d) => d.key === seg)) return seg as LeserDoc;
    return defaultDoc(row);
  }

  private currentProjectId(): string | null {
    if (this.route === 'projekt' && this.segments[0]) return safeDecode(this.segments[0]);
    return this.projectCtx.activeProject?.id ?? null;
  }

  private currentDocKey(): ProjectDocKey | null {
    const seg = this.segments[1];
    return seg && (PROJECT_DOC_KEYS as readonly string[]).includes(seg) ? (seg as ProjectDocKey) : null;
  }

  // ---- events from children ----

  private onVorhabenOpen(e: CustomEvent<{ row: VorhabenRow }>): void {
    this.openRow(e.detail.row);
  }

  private onDocChange(e: CustomEvent<{ doc: LeserDoc }>): void {
    const { row } = this.currentRow();
    if (row) this.openRow(row, e.detail.doc);
  }

  private onVorhabenNew(e: CustomEvent<{ projectId: string }>): void {
    this.go('projekt', [encodeURIComponent(e.detail.projectId)]);
  }

  /**
   * A step was started from this view (FA-35): on the Mac the event bubbles
   * on to app.ts, which selects the new tab and opens the terminal sidebar;
   * on the phone Michael stays on the page (AN-S14).
   */
  private onSessionStarted(e: CustomEvent<{ sessionId: string; step: string }>): void {
    if (this.breakpoint.isMobile) {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('show-toast', { bubbles: true, composed: true, detail: { message: 'Sitzung gestartet', type: 'success' } }));
    }
  }

  private onDocSelect(e: CustomEvent<{ key: ProjectDocKey | null }>): void {
    const pid = this.currentProjectId();
    if (!pid) return;
    this.go('projekt', [encodeURIComponent(pid), ...(e.detail.key ? [e.detail.key] : [])]);
  }

  private onNavTap(e: CustomEvent<{ item: BottomNavItem }>): void {
    switch (e.detail.item) {
      case 'home':
        // Stage 3: the old dashboard is gone; „Home" on the phone is the project page (AN-S19).
        this.go('projekt');
        break;
      case 'specs':
        this.go('vorhaben');
        break;
      case 'terminal':
        this.dispatchEvent(new CustomEvent('terminal-pill-tap', { bubbles: true, composed: true, detail: { route: 'cloud-terminal' } }));
        break;
      case 'me':
        this.go('settings');
        break;
    }
  }

  private onDrawerNav(e: CustomEvent<{ route: DrawerNavRoute }>): void {
    if (e.detail.route === 'cloud-terminal') {
      this.dispatchEvent(new CustomEvent('terminal-pill-tap', { bubbles: true, composed: true, detail: { route: 'cloud-terminal' } }));
    } else if (e.detail.route === 'vorhaben' || e.detail.route === 'projekt') {
      this.go(e.detail.route);
    }
  }

  // ---- render ----

  override render() {
    const content = this.renderContent();
    if (!this.breakpoint.isMobile) return html`<div class="vorhaben-view">${content}</div>`;
    const waiting = this.vorhabenState ? countWaitingForMe(this.vorhabenState.rows) : 0;
    const title = this.route === 'projekt' ? 'Projekt' : this.segments.length ? this.segments[1] ?? 'Vorhaben' : 'Vorhaben';
    return html`
      <div class="mobile-dashboard vorhaben-mobile">
        <aos-mobile-top-bar
          .workspaceName=${this.projectCtx.activeProject?.name ?? ''}
          .breadcrumb=${title}
          @menu-open=${() => (this.drawerOpen = true)}
        ></aos-mobile-top-bar>
        <div class="mobile-content vorhaben-mobile-content">${content}</div>
        <aos-mobile-terminal-pill></aos-mobile-terminal-pill>
        <aos-mobile-bottom-nav
          .activeItem=${'specs'}
          .waitingCount=${waiting}
          @nav-tap=${this.onNavTap}
          @fab-tap=${() => this.go('projekt')}
        ></aos-mobile-bottom-nav>
        <aos-mobile-side-drawer
          .open=${this.drawerOpen}
          .workspaceName=${this.projectCtx.activeProject?.name ?? ''}
          .activeRoute=${this.route}
          @drawer-close=${() => (this.drawerOpen = false)}
          @drawer-nav=${this.onDrawerNav}
        ></aos-mobile-side-drawer>
      </div>
    `;
  }

  private renderContent() {
    if (this.route === 'projekt') return this.renderProjekt();
    const { row, missing } = this.currentRow();
    if (row) {
      const doc = this.currentDoc(row);
      const state = this.vorhabenState;
      const drafts = doc !== 'design' && state ? state.drafts[draftKey(row.projectId, row.intentId, doc)] ?? [] : [];
      return html`<aos-vorhaben-seite
        .row=${row}
        .doc=${doc}
        .mobile=${this.breakpoint.isMobile}
        .drafts=${drafts}
        .protocol=${state?.protocol ?? []}
        .lastModel=${state?.lastModel ?? {}}
        @vorhaben-back=${() => this.go('vorhaben')}
        @doc-change=${this.onDocChange}
        @vorhaben-session-started=${this.onSessionStarted}
      ></aos-vorhaben-seite>`;
    }
    if (missing) {
      return html`<div class="vorhaben-status">
        <p>Vorhaben <code>${this.segments[1]}</code> nicht gefunden — vielleicht ist das Projekt nicht mehr geöffnet.</p>
        <button type="button" class="vorhaben-btn" @click=${() => this.go('vorhaben')}>Zur Übersicht</button>
      </div>`;
    }
    if (this.segments.length >= 2) return html`<div class="vorhaben-status">Vorhaben werden gelesen …</div>`;
    return html`<aos-vorhaben-uebersicht
      .vorhabenState=${this.vorhabenState}
      .activeProjectId=${this.projectCtx.activeProject?.id ?? null}
      .filterProjectId=${this.filterProjectId}
      .connected=${this.connected}
      @filter-change=${(e: CustomEvent<{ projectId: string | null }>) => (this.filterProjectId = e.detail.projectId)}
      @vorhaben-open=${this.onVorhabenOpen}
      @vorhaben-new=${this.onVorhabenNew}
    ></aos-vorhaben-uebersicht>`;
  }

  private renderProjekt() {
    const pid = this.currentProjectId();
    const project = pid ? this.vorhabenState?.projects.find((p) => p.id === pid) ?? null : null;
    if (pid && !project && this.vorhabenState && !this.vorhabenState.loading) {
      const open = this.projectCtx.openProjects.find((p) => p.id === pid);
      if (!open) return html`<div class="vorhaben-status">Projekt nicht geöffnet.</div>`;
    }
    return html`<aos-projekt-seite
      .project=${project}
      .docDrafts=${this.vorhabenState?.docDrafts ?? {}}
      .selectedKey=${this.currentDocKey()}
      .mobile=${this.breakpoint.isMobile}
      @doc-select=${this.onDocSelect}
      @vorhaben-session-started=${this.onSessionStarted}
    ></aos-projekt-seite>`;
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-vorhaben-view': AosVorhabenView;
  }
}
