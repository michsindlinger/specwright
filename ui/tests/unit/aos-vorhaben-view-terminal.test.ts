// @vitest-environment happy-dom
/**
 * INT-2026-011 (FA-01, FA-16, FA-18, FA-24, AN-S01, AN-S03): the Vorhaben
 * view renders the page only — no split, no Gespräch; the session stands
 * next to it as the docked terminal sidebar, which app.ts owns. The view
 * tells app.ts which session belongs to the page (`vorhaben-page-session` on
 * `document`, Mac only, on every change — including the change to `null`
 * when the session ends or the page has none, INT-2026-013 B3) and
 * feeds the document's Kennungen to `kennungenService` (set on
 * `kennungen-changed`, cleared when the page goes away).
 *
 * Kept from INT-2026-007/010: a started step stays on the page (the event
 * no longer reaches app.ts), „Absicht beginnen" opens the new Vorhaben page
 * once a row carries the session (FA-22, AN-S03), the phone has no shell of
 * its own (FA-20), the route `neu` renders `aos-neue-absicht`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenPendingIntent, VorhabenRow, VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));

let mobile = false;
vi.mock('../../frontend/src/controllers/mobile-breakpoint-controller.js', () => ({
  MobileBreakpointController: class {
    get isMobile(): boolean {
      return mobile;
    }
    constructor(host: { addController(c: unknown): void }) {
      host.addController(this);
    }
    onChange(): void {}
    hostConnected(): void {}
    hostDisconnected(): void {}
  },
}));

let route: { view: string; segments: string[] } = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
const navigate = vi.fn();
vi.mock('../../frontend/src/services/router.service.js', () => ({
  routerService: { on: vi.fn(), off: vi.fn(), navigate: (...a: unknown[]) => navigate(...(a as [])), getCurrentRoute: () => route },
}));

type StateListener = (s: VorhabenState | null) => void;
let stateListener: StateListener | null = null;
const setAnsicht = vi.fn();
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    subscribe: (l: StateListener) => {
      stateListener = l;
      l(null);
      return () => (stateListener = null);
    },
    refresh: vi.fn(),
    readDoc: vi.fn(async () => ({ content: '# T\n\nText.', mtimeMs: 1000 })),
    readDesign: vi.fn(async () => null),
    listProjectDocs: vi.fn(async () => []),
    modelList: vi.fn(async () => ({ providers: [], defaultSelection: { providerId: 'anthropic', modelId: 'opus' }, stepDefaults: {} })),
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: vi.fn(),
    setAnsicht: (...a: unknown[]) => setAnsicht(...(a as [])),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
  },
  VorhabenRequestError: class extends Error {},
  gatewayRequest: vi.fn(),
}));
import { kennungenService } from '../../frontend/src/services/kennungen.service.js';

/** `vorhaben-page-session` events seen on `document` since the last reset. */
let pageSessions: (string | null)[] = [];
const onPageSession = (e: Event): void => {
  pageSessions.push((e as CustomEvent<{ terminalSessionId: string | null }>).detail.terminalSessionId);
};
document.addEventListener('vorhaben-page-session', onPageSession);

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-003', dirName: 'INT-2026-003-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'wartet', zustandDetail: '', reviewDoc: 'spec', step: 'spec', sessionBusy: true,
  docs: [{ key: 'spec', file: 'spec.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  session: { id: 'cloud-1-1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'done' },
  ...o,
});

const pendingOf = (o: Partial<VorhabenPendingIntent> = {}): VorhabenPendingIntent => ({
  sessionId: 'cloud-1-7', projectId: 'p', cwd: '/p', arbeitskopie: 'main', since: '2026-09-16T09:00:00.000Z',
  session: { id: 'cloud-1-7', name: 'intent', model: 'opus', agentStatus: 'done' },
  ...o,
});

const state = (rows: VorhabenRow[], pendingIntents: VorhabenPendingIntent[] = [], protocol: VorhabenState['protocol'] = [], ansicht: VorhabenState['ansicht'] = { filterProjectId: null, phase: {} }): VorhabenState => ({
  rows,
  projects: [{ id: 'p', path: '/p', name: 'P', arbeitskopie: 'main', worktrees: [], hasIntentDir: true }],
  pendingIntents,
  ansicht,
  docDrafts: {},
  drafts: {},
  protocol,
  lastModel: {},
  loading: false,
  updatedAt: '',
});

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
};

async function view(r: 'vorhaben' | 'neu' | 'projekt' = 'vorhaben') {
  await import('../../frontend/src/views/aos-vorhaben-view.js');
  const el = document.createElement('aos-vorhaben-view');
  el.route = r;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

describe('aos-vorhaben-view — page only, the session is the docked terminal (FA-01, FA-24, AN-S03)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
    setAnsicht.mockClear();
    pageSessions = [];
    kennungenService.clear();
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
  });

  it('Mac + assigned session: the page alone (no split, no Gespräch) and ONE vorhaben-page-session with the session id', async () => {
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    const frame = el.querySelector('.vorhaben-view')!;
    expect(frame.classList.contains('split')).toBe(false);
    expect(el.querySelector('.vorhaben-split, aos-gespraech')).toBeNull();
    expect(frame.children.length).toBe(1);
    expect(frame.children[0].tagName.toLowerCase()).toBe('aos-vorhaben-seite');
    expect(pageSessions).toEqual(['cloud-1-1']);
    // a state broadcast with the same session announces nothing again
    stateListener!(state([row()]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1']);
    // a new session of the same Vorhaben (next step started) is announced (FA-08)
    stateListener!(state([row({ session: { id: 'cloud-1-2', name: 'plan INT-2026-003', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1', 'cloud-1-2']);
    el.remove();
  });

  it('no session, an ended session, the list, the phone: nothing is announced (FA-06, FA-24, FA-20)', async () => {
    const el = await view();
    stateListener!(state([row({ zustand: 'keine_sitzung', session: undefined })]));
    await settle(el);
    expect(el.querySelector('aos-vorhaben-seite')).not.toBeNull();
    expect(pageSessions).toEqual([]);
    // the session ends while the page is open → `null` is announced once, the page stays (FA-24, INT-2026-013 B3)
    stateListener!(state([row()]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1']);
    stateListener!(state([row({ zustand: 'sitzung_beendet', session: { id: 'cloud-1-1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'unknown', ended: true } })]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1', null]);
    expect(el.querySelector('aos-vorhaben-seite')).not.toBeNull();
    el.remove();
    pageSessions = [];
    route = { view: 'vorhaben', segments: [] };
    const l = await view();
    stateListener!(state([row()]));
    await settle(l);
    expect(pageSessions).toEqual([]);
    l.remove();
    mobile = true;
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
    const m = await view();
    stateListener!(state([row()]));
    await settle(m);
    expect(pageSessions).toEqual([]);
    expect(m.querySelector('aos-vorhaben-seite')).not.toBeNull();
    // INT-2026-010 (FA-20): no phone shell of its own
    expect(m.querySelector('aos-mobile-bottom-nav, aos-mobile-top-bar, aos-mobile-side-drawer, aos-mobile-terminal-pill, .mobile-dashboard')).toBeNull();
    expect(m.querySelector('.vorhaben-view')!.classList.contains('mobil')).toBe(true);
    m.remove();
  });

  it('Kennungen: kennungen-changed from the page fills kennungenService, leaving the page clears it; kennung-open reaches the page (FA-13, FA-16, AN-S01)', async () => {
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    const seite = el.querySelector('aos-vorhaben-seite')!;
    const map = new Map([['FA-01', { ref: 'FA-01 · §3', snippet: 'FA-01 Die Liste …' }]]);
    seite.dispatchEvent(new CustomEvent('kennungen-changed', { bubbles: true, composed: true, detail: { kennungen: map } }));
    expect(kennungenService.get().get('FA-01')?.ref).toBe('FA-01 · §3');
    // a click on the link in the terminal → the page's openKennung
    const opened: string[] = [];
    (seite as unknown as { openKennung(code: string): boolean }).openKennung = (code: string) => {
      opened.push(code);
      return true;
    };
    document.dispatchEvent(new CustomEvent('kennung-open', { detail: { code: 'FA-01' } }));
    expect(opened).toEqual(['FA-01']);
    // route to the list → no page → no Kennungen
    route = { view: 'vorhaben', segments: [] };
    (el as unknown as { segments: string[] }).segments = [];
    await settle(el);
    expect(el.querySelector('aos-vorhaben-seite')).toBeNull();
    expect(kennungenService.get().size).toBe(0);
    // and after leaving the view entirely
    seite.dispatchEvent(new CustomEvent('kennungen-changed', { bubbles: true, composed: true, detail: { kennungen: map } }));
    el.remove();
    expect(kennungenService.get().size).toBe(0);
  });

  it('INT-2026-010: „Neue Absicht" in the overview navigates to the route neu of that project', async () => {
    route = { view: 'vorhaben', segments: [] };
    const el = await view();
    stateListener!(state([]));
    await settle(el);
    const list = el.querySelector('aos-vorhaben-uebersicht')!;
    list.dispatchEvent(new CustomEvent('vorhaben-new', { bubbles: true, composed: true, detail: { projectId: 'p' } }));
    expect(navigate).toHaveBeenCalledWith('neu', ['p']);
    el.remove();
  });
});

describe('aos-vorhaben-view — started step stays on the page (FA-22, AN-S03)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
    pageSessions = [];
  });

  it('a step started on the Vorhaben page does not bubble to the app; the page stays and shows a toast', async () => {
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    const outside: string[] = [];
    const toasts: string[] = [];
    document.body.addEventListener('vorhaben-session-started', () => outside.push('bubbled'));
    el.addEventListener('show-toast', (e) => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    el.querySelector('aos-vorhaben-seite')!.dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cloud-1-2', step: 'plan', intentId: 'INT-2026-003' } }));
    await settle(el);
    expect(outside).toEqual([]);
    expect(toasts).toEqual(['Sitzung gestartet']);
    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('aos-vorhaben-seite')).not.toBeNull();
    el.remove();
  });

  it('„Starten" on the route neu: the pending session from the state is announced for the docked terminal (FA-18); navigation to the new Vorhaben once a row carries the session — same broadcast that drops the pending entry, same session id → same tab (AK-01, AK-03, FA-19)', async () => {
    route = { view: 'neu', segments: ['p'] };
    const el = await view('neu');
    stateListener!(state([]));
    await settle(el);
    const block = el.querySelector('.neue-absicht')!;
    expect(block).not.toBeNull();
    const neu = block.querySelector('aos-neue-absicht')!;
    expect(neu).not.toBeNull();
    expect(neu.projectId).toBe('p');
    expect(neu.pending).toBeNull();
    expect(block.querySelector('aos-naechster-schritt')).toBeNull();
    expect(el.querySelector('aos-projekt-seite')).toBeNull();
    expect(el.querySelector('.vorhaben-split, aos-gespraech')).toBeNull();
    expect(pageSessions).toEqual([]);
    neu.dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cloud-1-7', step: 'intent' } }));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    // an unrelated broadcast before the pending entry arrives does not forget the memory
    stateListener!(state([row({ intentId: 'INT-2026-008', session: { id: 'cloud-1-1', name: 'x', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    expect(pageSessions).toEqual([]);
    // the backend lists the pending session → the card, and the page announces that session (the terminal docks on its tab)
    stateListener!(state([], [pendingOf()]));
    await settle(el);
    expect(el.querySelector('.vorhaben-view')!.classList.contains('split')).toBe(false);
    expect(el.querySelector('.vorhaben-split, aos-gespraech')).toBeNull();
    const card = el.querySelector('.neue-absicht aos-neue-absicht')!;
    expect(card.pending?.sessionId).toBe('cloud-1-7'); // the card replaces the form (AK-04)
    expect(pageSessions).toEqual(['cloud-1-7']);
    expect(navigate).not.toHaveBeenCalled();
    // ONE broadcast: pending gone, the new row carries the session → navigate; the same session id is not announced again (FA-19: same tab, no replay)
    stateListener!(state([row({ intentId: 'INT-2026-009', session: { id: 'cloud-1-7', name: 'intent', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(navigate).toHaveBeenCalledWith('vorhaben', ['p', 'INT-2026-009']);
    expect(pageSessions).toEqual(['cloud-1-7']);
    el.remove();
  });

  it('a pending session typed by hand or seen after a reload is followed too; an aborted one is forgotten (AK-07, AK-03)', async () => {
    route = { view: 'neu', segments: ['p'] };
    const el = await view('neu');
    stateListener!(state([], [pendingOf({ sessionId: 'cloud-2-2', session: { id: 'cloud-2-2', name: 'intent', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(el.querySelector('.neue-absicht aos-neue-absicht')?.pending?.sessionId).toBe('cloud-2-2');
    expect(pageSessions).toEqual(['cloud-2-2']);
    // aborted: neither pending nor a row → no navigation, the form is back
    stateListener!(state([]));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('.neue-absicht aos-neue-absicht')?.pending).toBeNull();
    // seen again later → followed
    stateListener!(state([], [pendingOf({ sessionId: 'cloud-2-3', session: { id: 'cloud-2-3', name: 'intent', model: 'opus', agentStatus: 'done' } })]));
    await settle(el);
    stateListener!(state([row({ intentId: 'INT-2026-010', session: { id: 'cloud-2-3', name: 'intent', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(navigate).toHaveBeenCalledWith('vorhaben', ['p', 'INT-2026-010']);
    expect(pageSessions).toEqual(['cloud-2-2', null, 'cloud-2-3']);
    el.remove();
  });

  it('two pending sessions: the oldest is shown (the one the next folder claims, R-3)', async () => {
    route = { view: 'neu', segments: ['p'] };
    const el = await view('neu');
    stateListener!(state([], [pendingOf({ sessionId: 'cloud-3-2', since: '2026-09-16T10:00:00.000Z' }), pendingOf({ sessionId: 'cloud-3-1', since: '2026-09-16T09:00:00.000Z' })]));
    await settle(el);
    expect(el.querySelector('.neue-absicht aos-neue-absicht')?.pending?.sessionId).toBe('cloud-3-1');
    expect(pageSessions).toEqual(['cloud-3-1']);
    el.remove();
  });

  it('neu page card: „Im Terminal öffnen" dispatches open-terminal-session with the session id, Mac says „Terminal rechts"; on the phone nothing is announced (AK-04, AK-06)', async () => {
    route = { view: 'neu', segments: ['p'] };
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    const el = await view('neu');
    stateListener!(state([], [pendingOf()]));
    await settle(el);
    const card = el.querySelector('.neue-absicht aos-neue-absicht')!;
    await card.updateComplete;
    (card.shadowRoot!.querySelector('button.terminal') as HTMLButtonElement).click();
    expect(seen).toEqual(['cloud-1-7']);
    expect(card.shadowRoot!.textContent).toContain('Terminal rechts');
    expect(card.shadowRoot!.textContent).not.toContain('Gespräch');
    el.remove();
    pageSessions = [];
    mobile = true;
    const m = await view('neu');
    stateListener!(state([], [pendingOf()]));
    await settle(m);
    expect(pageSessions).toEqual([]);
    const mb = m.querySelector('.neue-absicht aos-neue-absicht')!;
    await mb.updateComplete;
    expect(mb.mobile).toBe(true);
    expect(mb.shadowRoot!.querySelector('textarea')).toBeNull();
    expect(mb.shadowRoot!.textContent).toContain('im Terminal antworten');
    (mb.shadowRoot!.querySelector('button.terminal') as HTMLButtonElement).click();
    expect(seen).toEqual(['cloud-1-7', 'cloud-1-7']);
    document.removeEventListener('open-terminal-session', onOpen);
    m.remove();
  });

  it('INT-2026-010: the project page no longer carries the start block; without a project the neu page points to the project page', async () => {
    route = { view: 'projekt', segments: ['p'] };
    const el = await view('projekt');
    stateListener!(state([], [pendingOf()]));
    await settle(el);
    const projekt = el.querySelector('aos-projekt-seite')!;
    expect(projekt.querySelector('aos-naechster-schritt')).toBeNull();
    expect(pageSessions).toEqual([]); // the project page has no session of its own
    el.remove();
    route = { view: 'neu', segments: [] };
    const n = await view('neu');
    stateListener!(state([]));
    await settle(n);
    expect(n.querySelector('.neue-absicht')?.textContent).toContain('Kein Projekt geöffnet');
    n.remove();
  });
});

describe('aos-vorhaben-view — shared view state (INT-2026-010 FA-03, FA-12; AR-05)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
    setAnsicht.mockClear();
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
  });

  it('the shown document comes from state.ansicht.phase, else the row default; an old third URL segment is ignored; a chip click writes the choice to the backend instead of the URL', async () => {
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003', 'intent'] };
    const docs = [{ key: 'intent', file: 'intent.md', mtimeMs: 900 }, { key: 'spec', file: 'spec.md', mtimeMs: 1000 }, { key: 'plan', file: 'plan.md', mtimeMs: 1100 }];
    const el = await view();
    stateListener!(state([row({ docs, reviewDoc: undefined, phase: 'plan' })]));
    await settle(el);
    const seite = el.querySelector('aos-vorhaben-seite')!;
    expect(seite.doc).toBe('plan'); // default: document of the reached phase (URL segment `intent` ignored)
    stateListener!(state([row({ docs, reviewDoc: undefined, phase: 'plan' })], [], [], { filterProjectId: null, phase: { 'p::INT-2026-003': 'spec' } }));
    await settle(el);
    expect(el.querySelector('aos-vorhaben-seite')!.doc).toBe('spec');
    // design without sketches falls back
    stateListener!(state([row({ docs, reviewDoc: undefined, phase: 'plan' })], [], [], { filterProjectId: null, phase: { 'p::INT-2026-003': 'design' } }));
    await settle(el);
    expect(el.querySelector('aos-vorhaben-seite')!.doc).toBe('plan');
    // a chip click → setAnsicht, no navigation
    el.querySelector('aos-vorhaben-seite')!.dispatchEvent(new CustomEvent('doc-change', { bubbles: true, composed: true, detail: { doc: 'intent' } }));
    expect(setAnsicht).toHaveBeenCalledWith({ phase: { projectId: 'p', intentId: 'INT-2026-003', doc: 'intent' } });
    expect(navigate).not.toHaveBeenCalled();
    el.remove();
  });

  it('overview: the project chip comes from state.ansicht.filterProjectId and a chip click goes to the backend', async () => {
    route = { view: 'vorhaben', segments: [] };
    const el = await view();
    stateListener!(state([row()], [], [], { filterProjectId: 'p', phase: {} }));
    await settle(el);
    const ueb = el.querySelector('aos-vorhaben-uebersicht')!;
    expect(ueb.filterProjectId).toBe('p');
    ueb.dispatchEvent(new CustomEvent('filter-change', { detail: { projectId: null } }));
    expect(setAnsicht).toHaveBeenCalledWith({ filterProjectId: null });
    el.remove();
  });

  it('phone: a step started on the Vorhaben page opens the terminal with the new session (review F12); a Freigabe start names the handover in the toast', async () => {
    mobile = true;
    const seen: string[] = [];
    const onOpen = (e: Event): void => {
      seen.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    const el = await view();
    stateListener!(state([row({ session: undefined, zustand: 'keine_sitzung', sessionBusy: false })]));
    await settle(el);
    const toasts: string[] = [];
    el.addEventListener('show-toast', (e) => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    el.querySelector('aos-vorhaben-seite')!.dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cs-5', step: 'spec', intentId: 'INT-2026-003', firstInput: true } }));
    await settle(el);
    expect(seen).toEqual(['cs-5']);
    expect(toasts[0]).toContain('Freigabe wird nach der ersten Frage übergeben');
    document.removeEventListener('open-terminal-session', onOpen);
    el.remove();
  });
});

describe('aos-vorhaben-view — vorhaben-page-session announces every change, including null (INT-2026-013, B3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
    setAnsicht.mockClear();
    pageSessions = [];
    kennungenService.clear();
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
  });

  it('losing the session announces null exactly once; a fresh page without a session announces nothing', async () => {
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1']);
    // the session vanishes from the row (closed elsewhere) → one null
    stateListener!(state([row({ zustand: 'keine_sitzung', session: undefined })]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1', null]);
    // further broadcasts without a session: nothing more
    stateListener!(state([row({ zustand: 'keine_sitzung', session: undefined })]));
    stateListener!(state([row({ zustand: 'sitzung_beendet', session: { id: 'cloud-1-1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'unknown', ended: true } })]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1', null]);
    el.remove();
    // a fresh page whose row has no session: null → null is no change
    pageSessions = [];
    const f = await view();
    stateListener!(state([row({ zustand: 'keine_sitzung', session: undefined })]));
    await settle(f);
    stateListener!(state([row({ zustand: 'keine_sitzung', session: undefined })]));
    await settle(f);
    expect(pageSessions).toEqual([]);
    f.remove();
  });

  it('the same session id is never announced twice (FA-19), a switch to another session and back is', async () => {
    const el = await view();
    stateListener!(state([row()]));
    stateListener!(state([row()]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1']);
    stateListener!(state([row({ session: { id: 'cloud-1-2', name: 'plan INT-2026-003', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    stateListener!(state([row()]));
    await settle(el);
    expect(pageSessions).toEqual(['cloud-1-1', 'cloud-1-2', 'cloud-1-1']);
    el.remove();
  });
});
