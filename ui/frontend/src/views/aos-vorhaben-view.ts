/**
 * aos-vorhaben-view — the work surface (INT-2026-004; INT-2026-010): routes
 * `vorhaben` (overview, Vorhaben page), `neu` (new intent) and `projekt`
 * (project page) inside the frame of app.ts (header line only). Light DOM
 * like the other views; the phone has no shell of its own any more (FA-20) —
 * the header carries bell, project and terminal symbol on every device.
 *
 * Routes: `#/vorhaben` · `#/vorhaben/<projectId>/<INT-…>` ·
 * `#/neu[/<projectId>]` · `#/projekt[/<projectId>[/<docKey>]]`
 * (projectId URL-encoded). The project chip of the overview and the shown
 * document of a Vorhaben are shared view state from the backend
 * (`state.ansicht`, INT-2026-010 FA-03/FA-12, AR-05) — a third URL segment of
 * old links is ignored.
 *
 * Route `neu` (INT-2026-010 stage 2, AK-08/AK-09): `aos-neue-absicht` — text,
 * model, „Starten"; while a `/intent` session of the project is pending the
 * card shows that session and the follow logic opens the Vorhaben page once a
 * folder claims the session.
 *
 * INT-2026-011: the session itself stands next to the document — the cloud
 * terminal sidebar docked as the right column (app.ts sets `docked` from the
 * route). This view only says which session belongs to the page
 * (`vorhaben-page-session` on `document`, Mac only) and feeds the document's
 * Kennungen to `kennungenService` so the terminal can link them; a click on
 * such a link comes back as `kennung-open` and the page jumps to the block.
 *
 * INT-2026-019: entering a Vorhaben page (and every reconnect on one) tells
 * the backend „Seite geöffnet" once — `vorhabenService.resumeSession` —
 * which resumes a session lost to a crash (AK-01). One trigger path only
 * (review E31): the entry points set `resume`, `maybeFire` sends as soon as a
 * loaded state is there; a refusal is shown as a line on the page and not
 * retried until the page is opened again (AK-09).
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
import { PROJECT_DOC_KEYS, VORHABEN_DOC_ORDER, assignmentKey, draftKey } from '../../../src/shared/types/vorhaben.protocol.js';
import { defaultDoc, type AosVorhabenSeite } from '../components/vorhaben/aos-vorhaben-seite.js';
import type { LeserDoc } from '../components/vorhaben/aos-dokument-leser.js';
import { kennungenService, type KennungEintrag } from '../services/kennungen.service.js';
import '../components/vorhaben/aos-vorhaben-uebersicht.js';
import '../components/vorhaben/aos-vorhaben-seite.js';
import '../components/vorhaben/aos-projekt-seite.js';
import '../components/vorhaben/aos-neue-absicht.js';

export type VorhabenRoute = 'vorhaben' | 'neu' | 'projekt';

const INTENT_ID_RE = /^INT-\d{4}-\d{3}$/;
const VIEW_ROUTES: readonly string[] = ['vorhaben', 'neu', 'projekt'];

@customElement('aos-vorhaben-view')
export class AosVorhabenView extends LitElement {
  @property({ type: String }) route: VorhabenRoute = 'vorhaben';

  @consume({ context: projectContext, subscribe: true })
  private projectCtx: ProjectContextValue = defaultProjectContext;

  @state() private vorhabenState: VorhabenState | null = null;
  @state() private segments: string[] = [];
  @state() private connected = true;
  /**
   * Navigation memory, not state (INT-2026-008 plan §3.7): the `/intent`
   * session to follow to its new Vorhaben page once a row carries it (FA-22,
   * AN-S03). Set by „Absicht beginnen" or when the `neu` page first shows a
   * pending session from `state.pendingIntents`; cleared after the navigation
   * or when the session vanished without a folder (aborted). What is shown
   * always comes from the state.
   */
  @state() private pendingIntentSessionId: string | null = null;
  /** The memory's session was seen in `state.pendingIntents` at least once — only then a missing session means "aborted". */
  private pendingSeen = false;
  /** Navigation to the claimed row was requested; the memory is kept until the route changed (no flash, review 15). */
  private pendingNavigated = false;
  /**
   * INT-2026-019: the pending „Seite geöffnet" of the shown Vorhaben page
   * (`key` = `assignmentKey`). `wartet` until a loaded state is there, then
   * `gesendet` — once per opening. `freshOnly` after a reconnect: the state
   * in hand is stale, only the next one from the backend counts.
   */
  private resume: { key: string; phase: 'wartet' | 'gesendet'; freshOnly: boolean } | null = null;
  /** INT-2026-019 (AK-08/AK-09): why the resume was refused — shown on the page until the route changes or the row has a live session. */
  @state() private resumeHinweis: { key: string; text: string } | null = null;

  private forgetPending(): void {
    this.pendingIntentSessionId = null;
    this.pendingSeen = false;
    this.pendingNavigated = false;
  }

  private readonly breakpoint = new MobileBreakpointController(this);
  private unsubscribeState: (() => void) | null = null;
  /**
   * Last session announced to app.ts (`vorhaben-page-session`). Every change
   * is announced, including the change to `null` (session ended, page without
   * one — INT-2026-013 B3); a fresh page without a session is no change
   * (null → null) and announces nothing (AN-S03).
   */
  private lastPageSessionId: string | null = null;
  /** A Kennung link in the terminal was clicked (FA-13): the page jumps to the block. */
  private readonly onKennungOpen = (e: Event): void => {
    const code = (e as CustomEvent<{ code: string }>).detail?.code;
    if (!code) return;
    (this.querySelector('aos-vorhaben-seite') as AosVorhabenSeite | null)?.openKennung(code);
  };
  private readonly onRoute = (route: ParsedRoute): void => {
    if (VIEW_ROUTES.includes(route.view)) {
      // The Vorhaben page of the claimed row is up → the `neu` page no longer needs the memory.
      if (route.view === 'vorhaben' && this.pendingNavigated) this.forgetPending();
      this.route = route.view as VorhabenRoute;
      this.segments = route.segments;
      // INT-2026-019: a newly entered Vorhaben page asks once; another route forgets everything.
      const key = this.pageKey();
      if (!key) {
        this.resume = null;
        this.resumeHinweis = null;
      } else if (this.resume?.key !== key) {
        this.resume = { key, phase: 'wartet', freshOnly: false };
        this.resumeHinweis = null;
        this.maybeFire(this.vorhabenState, false);
      }
    }
  };
  private readonly onConnected = (): void => {
    this.connected = true;
    // INT-2026-019: after a reconnect the page asks again — against the next state, not the stale one.
    const key = this.pageKey();
    if (key) this.resume = { key, phase: 'wartet', freshOnly: true };
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
      this.maybeFire(s, true);
      this.clearHinweisIfLive(s);
    });
    routerService.on('route-changed', this.onRoute);
    const current = routerService.getCurrentRoute();
    if (current) this.onRoute(current);
    gateway.on('gateway.connected', this.onConnected);
    gateway.on('gateway.disconnected', this.onDisconnected);
    document.addEventListener('kennung-open', this.onKennungOpen);
    this.connected = gateway.getConnectionStatus() || gateway.isConnecting();
    vorhabenService.refresh();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribeState?.();
    routerService.off('route-changed', this.onRoute);
    gateway.off('gateway.connected', this.onConnected);
    gateway.off('gateway.disconnected', this.onDisconnected);
    document.removeEventListener('kennung-open', this.onKennungOpen);
    kennungenService.clear();
  }

  /**
   * After every render: tell app.ts which session belongs to the page when
   * that changed (FA-02, FA-08, FA-18/FA-19) — the terminal docks on that tab;
   * `null` says the page has none any more (INT-2026-013 B3, app.ts drops a
   * pending tab). Mac only; the phone keeps „Im Terminal öffnen" (FA-20). A
   * page without a document (list, project page, `neu` before „Starten") has
   * no Kennungen (FA-16).
   */
  protected override updated(): void {
    const sessionId = this.pageSessionId();
    if (sessionId !== this.lastPageSessionId) {
      this.lastPageSessionId = sessionId;
      if (!this.breakpoint.isMobile) {
        document.dispatchEvent(new CustomEvent<{ terminalSessionId: string | null }>('vorhaben-page-session', { detail: { terminalSessionId: sessionId } }));
      }
    }
    if (!this.querySelector('aos-vorhaben-seite')) kennungenService.clear();
  }

  // ---- INT-2026-019: resume on opening ----

  /** `assignmentKey` of the shown Vorhaben page, null on every other route. */
  private pageKey(): string | null {
    if (this.route !== 'vorhaben') return null;
    const [pid, intentId] = this.segments;
    if (!pid || !intentId || !INTENT_ID_RE.test(intentId)) return null;
    return assignmentKey(safeDecode(pid), intentId);
  }

  /** The one trigger path: sends „Seite geöffnet" once a loaded state is there (`fresh` = this state just arrived from the backend). */
  private maybeFire(s: VorhabenState | null, fresh: boolean): void {
    const r = this.resume;
    if (!r || r.phase !== 'wartet' || !s || s.loading) return;
    if (r.freshOnly && !fresh) return;
    r.phase = 'gesendet';
    void this.sendResume(r.key);
  }

  private async sendResume(key: string): Promise<void> {
    const [projectId, intentId] = key.split('::');
    try {
      const result = await vorhabenService.resumeSession(projectId, intentId);
      if (result.ergebnis === 'gestartet') {
        // The Mac docks the terminal as soon as the row carries the session (`updated()`); the phone keeps „Im Terminal öffnen" (O1).
        this.dispatchEvent(new CustomEvent('show-toast', { bubbles: true, composed: true, detail: { message: 'Sitzung nach Neustart fortgesetzt', type: 'success' } }));
      }
    } catch (err) {
      // Only for the page that asked; a route change in between already forgot it.
      if (this.resume?.key === key) this.resumeHinweis = { key, text: (err as Error).message };
    }
  }

  /** The hint goes as soon as the row has a live session again — „Nächster Schritt", a click, a typed command (review E15). */
  private clearHinweisIfLive(s: VorhabenState | null): void {
    const h = this.resumeHinweis;
    if (!h || !s) return;
    const [projectId, intentId] = h.key.split('::');
    const row = s.rows.find((r) => r.projectId === projectId && r.intentId === intentId);
    if (row?.session && !row.session.ended) this.resumeHinweis = null;
  }

  /** The live session of the shown page: the row's (not ended) on `vorhaben`, the pending or just claimed `/intent` session on `neu`. */
  private pageSessionId(): string | null {
    if (this.route === 'vorhaben') {
      const session = this.currentRow().row?.session;
      return session && !session.ended ? session.id : null;
    }
    if (this.route === 'neu') {
      const { pending, claimedRow } = this.neuSitzung();
      return pending?.sessionId ?? claimedRow?.session?.id ?? null;
    }
    return null;
  }

  /** The document reader announced its Kennungen (per document, FA-13/FA-17); the terminal links exactly these. */
  private onKennungenChanged(e: CustomEvent<{ kennungen: ReadonlyMap<string, KennungEintrag> }>): void {
    kennungenService.set(e.detail.kennungen);
  }

  // ---- navigation helpers ----

  private go(view: ViewType, segments: string[] = []): void {
    routerService.navigate(view, segments);
  }

  private openRow(row: VorhabenRow): void {
    this.go('vorhaben', [encodeURIComponent(row.projectId), row.intentId]);
  }

  private currentRow(): { row: VorhabenRow | undefined; missing: boolean } {
    const [pid, intentId] = this.segments;
    if (!pid || !intentId || !INTENT_ID_RE.test(intentId)) return { row: undefined, missing: false };
    const projectId = safeDecode(pid);
    const row = this.vorhabenState?.rows.find((r) => r.projectId === projectId && r.intentId === intentId);
    return { row, missing: !row && !!this.vorhabenState && !this.vorhabenState.loading };
  }

  /** Shown document: the chosen phase from the shared view state, else the row's default (FA-12). */
  private currentDoc(row: VorhabenRow): LeserDoc {
    const chosen = this.vorhabenState?.ansicht?.phase[assignmentKey(row.projectId, row.intentId)];
    if (chosen === 'design') return row.designFiles.length ? 'design' : defaultDoc(row);
    if (chosen && (VORHABEN_DOC_ORDER as readonly string[]).includes(chosen)) return chosen;
    return defaultDoc(row);
  }

  /** Project chip of the overview from the shared view state (FA-03); null = „Alle". */
  private filterProjectId(): string | null {
    return this.vorhabenState?.ansicht?.filterProjectId ?? null;
  }

  /** Project of the `projekt` and `neu` pages: segment 1, else the active project. */
  private currentProjectId(): string | null {
    if ((this.route === 'projekt' || this.route === 'neu') && this.segments[0]) return safeDecode(this.segments[0]);
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

  /** Chip click (FA-12): persisted in the backend, every device follows with the next broadcast (AR-05). */
  private onDocChange(e: CustomEvent<{ doc: LeserDoc }>): void {
    const { row } = this.currentRow();
    if (row) vorhabenService.setAnsicht({ phase: { projectId: row.projectId, intentId: row.intentId, doc: e.detail.doc } });
  }

  /** Project chip of the overview (FA-03): same path. */
  private onFilterChange(e: CustomEvent<{ projectId: string | null }>): void {
    vorhabenService.setAnsicht({ filterProjectId: e.detail.projectId });
  }

  /** „Neue Absicht" (FA-02): the page `neu` of that project. */
  private onVorhabenNew(e: CustomEvent<{ projectId: string }>): void {
    this.go('neu', [encodeURIComponent(e.detail.projectId)]);
  }

  /**
   * A step was started from this view (FA-35): Michael stays on the page —
   * on the Mac the docked terminal follows the new session as soon as the row
   * carries it (`updated()` → `vorhaben-page-session`, INT-2026-011 FA-08),
   * on the phone as before (AN-S14). „Absicht beginnen" has no Vorhaben yet:
   * the view remembers the session and opens the Vorhaben page once a row
   * carries it (AN-S03). The event no longer reaches app.ts.
   */
  private onSessionStarted(e: CustomEvent<{ sessionId: string; step: string; intentId?: string; firstInput?: boolean; modus?: 'neu' | 'in_sitzung'; geschlossen?: string }>): void {
    e.stopPropagation();
    const neueAbsicht = e.detail.step === 'intent' && !e.detail.intentId;
    if (neueAbsicht) {
      this.forgetPending();
      this.pendingIntentSessionId = e.detail.sessionId;
    }
    // INT-2026-018 (AK-04/AK-05): the click continued in the live session, or closed it for a new one.
    const message = neueAbsicht
      ? 'Sitzung gestartet — Vorhaben entsteht'
      : e.detail.modus === 'in_sitzung'
        ? 'Nächster Schritt in der laufenden Sitzung gestartet'
        : e.detail.geschlossen
          ? 'Sitzung gestartet — die vorige wurde geschlossen'
          : e.detail.firstInput
            ? 'Sitzung gestartet — die Freigabe wird nach der ersten Frage übergeben'
            : 'Sitzung gestartet';
    this.dispatchEvent(new CustomEvent('show-toast', { bubbles: true, composed: true, detail: { message, type: 'success' } }));
    // Phone (INT-2026-010, review F12): no docked terminal → the fullscreen terminal opens with the new session.
    if (this.breakpoint.isMobile && !neueAbsicht) {
      document.dispatchEvent(new CustomEvent('open-terminal-session', { bubbles: true, composed: true, detail: { sessionId: e.detail.sessionId } }));
    }
  }

  /** Oldest pending `/intent` session of a project — the one `onDirAdded` claims next (INT-2026-008, R-3). */
  private pendingOf(state: VorhabenState | null, projectId: string | null): VorhabenPendingIntent | undefined {
    if (!state || !projectId) return undefined;
    return state.pendingIntents.filter((p) => p.projectId === projectId).sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0))[0];
  }

  /**
   * On the `neu` page a pending session from the state (typed by hand, or
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
    if (this.route !== 'neu') return;
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
      // Memory stays until the route changed (onRoute): the `neu` page keeps announcing the claimed row's session meanwhile (FA-19).
      if (this.pendingNavigated) return;
      this.pendingNavigated = true;
      this.openRow(row);
      return;
    }
    if (this.pendingSeen && !state.pendingIntents.some((p) => p.sessionId === pending)) this.forgetPending();
  }

  /**
   * Session of the `neu` page (INT-2026-008, AK-01): the oldest pending
   * `/intent` session; right after the claim — pending gone, row there, route
   * not yet switched — the claimed row's session (same id → the docked
   * terminal keeps its tab, FA-19).
   */
  private neuSitzung(): { pending?: VorhabenPendingIntent; claimedRow?: VorhabenRow } {
    const pid = this.currentProjectId();
    const state = this.vorhabenState;
    const pending = this.pendingOf(state, pid);
    if (pending) return { pending };
    const memory = this.pendingIntentSessionId;
    const claimedRow = memory && state && pid ? state.rows.find((r) => r.projectId === pid && r.session?.id === memory) : undefined;
    return claimedRow ? { claimedRow } : {};
  }

  private onDocSelect(e: CustomEvent<{ key: ProjectDocKey | null }>): void {
    const pid = this.currentProjectId();
    if (!pid) return;
    this.go('projekt', [encodeURIComponent(pid), ...(e.detail.key ? [e.detail.key] : [])]);
  }

  // ---- render ----

  override render() {
    return html`<div class="vorhaben-view ${this.breakpoint.isMobile ? 'mobil' : ''}">${this.renderContent()}</div>`;
  }

  private renderContent() {
    if (this.route === 'projekt') return this.renderProjekt();
    if (this.route === 'neu') return this.renderNeu();
    const { row, missing } = this.currentRow();
    if (row) {
      const doc = this.currentDoc(row);
      const state = this.vorhabenState;
      const drafts = doc !== 'design' && state ? state.drafts[draftKey(row.projectId, row.intentId, doc)] ?? [] : [];
      const protocol = state?.protocol ?? [];
      // The page only; the session stands right of it as the docked terminal sidebar (INT-2026-011, FA-01) — app.ts owns that.
      return html`<aos-vorhaben-seite
        .row=${row}
        .doc=${doc}
        .mobile=${this.breakpoint.isMobile}
        .drafts=${drafts}
        .protocol=${protocol}
        .lastModel=${state?.lastModel ?? {}}
        .resumeHinweis=${this.resumeHinweis?.key === assignmentKey(row.projectId, row.intentId) ? this.resumeHinweis.text : null}
        @vorhaben-back=${() => this.go('vorhaben')}
        @doc-change=${this.onDocChange}
        @vorhaben-session-started=${this.onSessionStarted}
        @kennungen-changed=${this.onKennungenChanged}
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
      .filterProjectId=${this.filterProjectId()}
      .connected=${this.connected}
      @filter-change=${this.onFilterChange}
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
    ></aos-projekt-seite>`;
  }

  /** Route `neu` (FA-10/FA-11): title, project, then `aos-neue-absicht` (form, or the pending session's card). */
  private renderNeu() {
    const pid = this.currentProjectId();
    const project = pid ? this.vorhabenState?.projects.find((p) => p.id === pid) ?? null : null;
    if (!pid || (!project && this.vorhabenState && !this.vorhabenState.loading)) {
      return html`<div class="vorhaben-status neue-absicht">
        <p>Kein Projekt geöffnet.</p>
        <button type="button" class="vorhaben-btn" @click=${() => this.go('projekt')}>Zur Projekt-Seite</button>
      </div>`;
    }
    const { pending } = this.neuSitzung();
    const mobile = this.breakpoint.isMobile;
    // The card of a pending session; its terminal is the docked sidebar (FA-18), the phone shows a hint only (AK-06).
    return html`<div class="neue-absicht">
      <h1>Neue Absicht</h1>
      <div class="sub">${project ? project.name : ''}</div>
      ${project
        ? html`<aos-neue-absicht
            .projectId=${project.id}
            .projectPath=${project.path}
            .projectName=${project.name}
            .pending=${pending ?? null}
            .mobile=${mobile}
            @vorhaben-session-started=${this.onSessionStarted}
          ></aos-neue-absicht>`
        : html`<div class="vorhaben-status">Vorhaben werden gelesen …</div>`}
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
