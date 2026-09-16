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
import type { ProjectDocKey, VorhabenPendingIntent, VorhabenRow, VorhabenState } from '../../../src/shared/types/vorhaben.protocol.js';
import { PROJECT_DOC_KEYS, VORHABEN_DOC_ORDER, draftKey } from '../../../src/shared/types/vorhaben.protocol.js';
import { countWaitingForMe } from '../components/vorhaben/vorhaben-sort.js';
import { defaultDoc, type AosVorhabenSeite } from '../components/vorhaben/aos-vorhaben-seite.js';
import { GESPRAECH_BREITE } from '../components/vorhaben/aos-gespraech.js';
import type { LeserDoc } from '../components/vorhaben/aos-dokument-leser.js';
import type { BottomNavItem } from '../components/mobile/aos-mobile-bottom-nav.js';
import type { DrawerNavRoute } from '../components/mobile/aos-mobile-side-drawer.js';
import '../components/vorhaben/aos-vorhaben-uebersicht.js';
import '../components/vorhaben/aos-vorhaben-seite.js';
import '../components/vorhaben/aos-projekt-seite.js';
import '../components/vorhaben/aos-gespraech.js';
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
  /**
   * Navigation memory, not state (INT-2026-008 plan §3.7): the `/intent`
   * session to follow to its new Vorhaben page once a row carries it (FA-22,
   * AN-S03). Set by „Absicht beginnen" or when the project page first shows a
   * pending session from `state.pendingIntents`; cleared after the navigation
   * or when the session vanished without a folder (aborted). What is shown
   * always comes from the state.
   */
  @state() private pendingIntentSessionId: string | null = null;
  /** The memory's session was seen in `state.pendingIntents` at least once — only then a missing session means "aborted". */
  private pendingSeen = false;
  /** Navigation to the claimed row was requested; the memory is kept until the route changed (no flash, review 15). */
  private pendingNavigated = false;

  private forgetPending(): void {
    this.pendingIntentSessionId = null;
    this.pendingSeen = false;
    this.pendingNavigated = false;
  }

  private readonly breakpoint = new MobileBreakpointController(this);
  private unsubscribeState: (() => void) | null = null;
  private readonly onRoute = (route: ParsedRoute): void => {
    if (route.view === 'vorhaben' || route.view === 'projekt') {
      // The Vorhaben page of the claimed row is up → the project page no longer needs the memory.
      if (route.view === 'vorhaben' && this.pendingNavigated) this.forgetPending();
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
      this.notePendingIntent(s);
      this.followStartedIntent(s);
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
   * A step was started from this view (FA-35): Michael stays on the page —
   * on the Mac the Gespräch follows the new session (INT-2026-007, FA-22),
   * on the phone as before (AN-S14). „Absicht beginnen" has no Vorhaben yet:
   * the view remembers the session and opens the Vorhaben page once a row
   * carries it (AN-S03). The event no longer reaches app.ts.
   */
  private onSessionStarted(e: CustomEvent<{ sessionId: string; step: string; intentId?: string }>): void {
    e.stopPropagation();
    if (e.detail.step === 'intent' && !e.detail.intentId) {
      this.forgetPending();
      this.pendingIntentSessionId = e.detail.sessionId;
    }
    this.dispatchEvent(new CustomEvent('show-toast', { bubbles: true, composed: true, detail: { message: e.detail.step === 'intent' ? 'Sitzung gestartet — Vorhaben entsteht' : 'Sitzung gestartet', type: 'success' } }));
  }

  /** Oldest pending `/intent` session of a project — the one `onDirAdded` claims next (INT-2026-008, R-3). */
  private pendingOf(state: VorhabenState | null, projectId: string | null): VorhabenPendingIntent | undefined {
    if (!state || !projectId) return undefined;
    return state.pendingIntents.filter((p) => p.projectId === projectId).sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0))[0];
  }

  /**
   * On the project page a pending session from the state (typed by hand, or
   * after a reload) is followed like one started here (AK-07); a memory whose
   * session shows up as pending is marked as seen.
   */
  private notePendingIntent(state: VorhabenState | null): void {
    if (!state) return;
    const memory = this.pendingIntentSessionId;
    if (memory) {
      if (state.pendingIntents.some((p) => p.sessionId === memory)) this.pendingSeen = true;
      return;
    }
    if (this.route !== 'projekt') return;
    const pending = this.pendingOf(state, this.currentProjectId());
    if (pending) {
      this.pendingIntentSessionId = pending.sessionId;
      this.pendingSeen = true;
    }
  }

  /**
   * First `vorhaben:state` whose row carries the remembered intent session →
   * open that Vorhaben (FA-22). The same broadcast drops the session from
   * `pendingIntents` (review 14). A session that is neither pending nor on a
   * row any more was aborted: forget it.
   */
  private followStartedIntent(state: VorhabenState | null): void {
    const pending = this.pendingIntentSessionId;
    if (!pending || !state) return;
    const row = state.rows.find((r) => r.session?.id === pending);
    if (row) {
      // Memory stays until the route changed (onRoute): the project page keeps the claimed row's Gespräch mounted meanwhile.
      if (this.pendingNavigated) return;
      this.pendingNavigated = true;
      this.openRow(row);
      return;
    }
    if (this.pendingSeen && !state.pendingIntents.some((p) => p.sessionId === pending)) this.forgetPending();
  }

  /**
   * Gespräch of the project page (INT-2026-008, AK-01): the oldest pending
   * `/intent` session; right after the claim — pending gone, row there, route
   * not yet switched — the claimed row keeps the same `aos-gespraech` mounted
   * (review 15: no flash, same session id → no re-subscribe).
   */
  private projektGespraech(): { pending?: VorhabenPendingIntent; claimedRow?: VorhabenRow } {
    const pid = this.currentProjectId();
    const state = this.vorhabenState;
    const pending = this.pendingOf(state, pid);
    if (pending) return { pending };
    const memory = this.pendingIntentSessionId;
    const claimedRow = memory && state && pid ? state.rows.find((r) => r.projectId === pid && r.session?.id === memory) : undefined;
    return claimedRow ? { claimedRow } : {};
  }

  private onGespraechNextStep(): void {
    (this.querySelector('aos-vorhaben-seite') as AosVorhabenSeite | null)?.scrollToNextStep();
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
    if (!this.breakpoint.isMobile) {
      const g = this.route === 'projekt' ? this.projektGespraech() : {};
      const split = this.route === 'vorhaben' ? !!this.currentRow().row?.session : !!(g.pending || g.claimedRow);
      return html`<div class="vorhaben-view ${split ? 'split' : ''}">${content}</div>`;
    }
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
      const protocol = state?.protocol ?? [];
      // Mac with an assigned session: page left, Gespräch right (mock 08, FA-01); phone: page only (NZ-01).
      const split = !this.breakpoint.isMobile && !!row.session;
      const seite = html`<aos-vorhaben-seite
        .row=${row}
        .doc=${doc}
        .mobile=${this.breakpoint.isMobile}
        .drafts=${drafts}
        .protocol=${protocol}
        .lastModel=${state?.lastModel ?? {}}
        .gespraechBreite=${split ? GESPRAECH_BREITE : ''}
        @vorhaben-back=${() => this.go('vorhaben')}
        @doc-change=${this.onDocChange}
        @vorhaben-session-started=${this.onSessionStarted}
      ></aos-vorhaben-seite>`;
      if (!split) return seite;
      return html`<div class="vorhaben-split" style="--gespraech-width: ${GESPRAECH_BREITE}">
        ${seite}
        <div class="vorhaben-split-gespraech">
          <aos-gespraech .row=${row} .protocol=${protocol.filter((e) => e.projectId === row.projectId && e.intentId === row.intentId)} @gespraech-next-step=${this.onGespraechNextStep}></aos-gespraech>
        </div>
      </div>`;
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
    const { pending, claimedRow } = this.projektGespraech();
    const seite = html`<aos-projekt-seite
      .project=${project}
      .docDrafts=${this.vorhabenState?.docDrafts ?? {}}
      .selectedKey=${this.currentDocKey()}
      .mobile=${this.breakpoint.isMobile}
      .pending=${pending ?? null}
      @doc-select=${this.onDocSelect}
      @vorhaben-session-started=${this.onSessionStarted}
    ></aos-projekt-seite>`;
    // Mac with a pending `/intent` session: page left, its Gespräch right (INT-2026-008, AK-01); phone: hint only (AK-06).
    if (this.breakpoint.isMobile || !(pending || claimedRow)) return seite;
    const sessionId = pending?.sessionId ?? claimedRow?.session?.id;
    const protocol = (this.vorhabenState?.protocol ?? []).filter((e) => e.sessionId === sessionId);
    return html`<div class="vorhaben-split" style="--gespraech-width: ${GESPRAECH_BREITE}">
      ${seite}
      <div class="vorhaben-split-gespraech">
        <aos-gespraech .row=${claimedRow} .pending=${pending} .protocol=${protocol}></aos-gespraech>
      </div>
    </div>`;
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
