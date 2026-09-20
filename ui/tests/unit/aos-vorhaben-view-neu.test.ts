// @vitest-environment happy-dom
/**
 * INT-2026-022 — the `neu` page with several pending intents (plan §3 Punkt 7,
 * §8 AK-04, AK-05, AK-07): ONE memory with an origin decides which session the
 * page shows (docked terminal, highlight) —
 *
 *  - „Starten" sets it (origin `start`) WITHOUT navigating; the page node and its
 *    model choice survive; the entry arrives with a later broadcast → no toast, no forgetting
 *  - a session in the address sets it (origin `adresse`): click from the overview
 *    (Mac → navigate, phone → terminal), bell, reload; the same segment again changes nothing;
 *    the overview keeps the memory
 *  - a row for the remembered session opens the Vorhaben page only while the page is `neu`;
 *    a row for ANOTHER pending session only leaves the list
 *  - a dead session in the address (loaded state, never seen) → one toast, segment dropped;
 *    the same situation with origin `start` → nothing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedRoute } from '../../frontend/src/types/route.types.js';
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

let route: ParsedRoute = { view: 'neu', segments: ['p'] } as ParsedRoute;
let routeListener: ((r: ParsedRoute) => void) | null = null;
const navigate = vi.fn();
vi.mock('../../frontend/src/services/router.service.js', () => ({
  routerService: {
    on: (_e: string, cb: (r: ParsedRoute) => void) => {
      routeListener = cb;
    },
    off: vi.fn(),
    navigate: (...a: unknown[]) => navigate(...(a as [])),
    getCurrentRoute: () => route,
  },
}));

type StateListener = (s: VorhabenState | null) => void;
let stateListener: StateListener | null = null;
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
    modelList: vi.fn(async () => ({ providers: [{ id: 'anthropic', name: 'Anthropic', models: [{ id: 'opus', name: 'Opus', providerId: 'anthropic' }, { id: 'haiku', name: 'Haiku', providerId: 'anthropic' }] }], defaultSelection: { providerId: 'anthropic', modelId: 'opus' }, stepDefaults: { intent: { providerId: 'anthropic', modelId: 'haiku' } } })),
    targets: vi.fn(async () => ({ isGitRepo: true, worktrees: [], worktreeCreationEnabled: true })),
    startStep: vi.fn(async () => ({ sessionId: 'cs-9', modus: 'neu' })),
    setAnsicht: vi.fn(),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
    resumeSession: vi.fn(async () => ({ ergebnis: 'nicht_noetig', grund: 'lebt' })),
  },
  VorhabenRequestError: class extends Error {},
  gatewayRequest: vi.fn(),
}));

let pageSessions: (string | null)[] = [];
document.addEventListener('vorhaben-page-session', (e) => {
  pageSessions.push((e as CustomEvent<{ terminalSessionId: string | null }>).detail.terminalSessionId);
});

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-003', dirName: 'INT-2026-003-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'absicht', phaseNote: '', bypass: false, zustand: 'arbeitet', zustandDetail: '', step: 'intent', sessionBusy: true,
  docs: [{ key: 'intent', file: 'intent.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  ...o,
});

const pend = (sessionId: string, since: string, o: Partial<VorhabenPendingIntent> = {}): VorhabenPendingIntent => ({
  sessionId, projectId: 'p', projectName: 'P', cwd: `/p-worktrees/session-${sessionId}`, arbeitskopie: `session/${sessionId}`, since,
  session: { id: sessionId, name: 'intent', model: 'haiku', agentStatus: 'working', step: 'intent' }, zustand: 'arbeitet', zustandDetail: 'haiku',
  ...o,
});
const ALT = pend('cloud-alt', '2026-09-19T08:00:00Z');
const NEU = pend('cloud-neu', '2026-09-19T09:00:00Z');

const state = (rows: VorhabenRow[], pendingIntents: VorhabenPendingIntent[] = [], loading = false): VorhabenState => ({
  rows,
  projects: [{ id: 'p', path: '/p', name: 'P', arbeitskopie: 'main', worktrees: [], hasIntentDir: true }],
  pendingIntents,
  ansicht: { filterProjectId: null, phase: {} },
  docDrafts: {},
  drafts: {},
  protocol: [],
  lastModel: {},
  loading,
  updatedAt: '',
});

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
};

async function view(r: 'vorhaben' | 'neu' | 'projekt' = 'neu') {
  await import('../../frontend/src/views/aos-vorhaben-view.js');
  const el = document.createElement('aos-vorhaben-view');
  el.route = r;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const form = (el: HTMLElement) => el.querySelector('.neue-absicht aos-neue-absicht')!;
const go = (r: ParsedRoute): void => {
  route = r;
  routeListener!(r);
};

describe('aos-vorhaben-view — route neu with several pending intents (INT-2026-022)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
    pageSessions = [];
    route = { view: 'neu', segments: ['p'] } as ParsedRoute;
  });

  it('AK-04/FA-06: after „Starten" the page announces the STARTED session (not the newest pending, not the address session) without navigate; the page node survives; the broadcast that lists it causes no toast', async () => {
    route = { view: 'neu', segments: ['p', 'cloud-alt'] } as ParsedRoute;
    const el = await view('neu');
    stateListener!(state([], [ALT, NEU]));
    await settle(el);
    const node = form(el);
    expect(node.selectedSessionId).toBe('cloud-alt'); // address wins over „newest"
    expect(pageSessions).toEqual(['cloud-alt']);
    const toasts: string[] = [];
    el.addEventListener('show-toast', (e) => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    node.dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cs-9', step: 'intent' } }));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    expect(toasts).toEqual(['Sitzung gestartet — Vorhaben entsteht']);
    // until the entry arrives the page falls back to the newest pending (the memory is not pending yet)
    expect(pageSessions).toEqual(['cloud-alt', 'cloud-neu']);
    // an unrelated broadcast in between: no toast, memory kept
    stateListener!(state([], [ALT, NEU]));
    await settle(el);
    expect(toasts).toHaveLength(1);
    // the entry arrives → the started session is the page's session and highlighted; same node (no re-mount)
    stateListener!(state([], [ALT, NEU, pend('cs-9', '2026-09-19T10:00:00Z')]));
    await settle(el);
    expect(form(el)).toBe(node);
    expect(node.selectedSessionId).toBe('cs-9');
    expect(node.pendings.map((p) => p.sessionId)).toEqual(['cloud-alt', 'cloud-neu', 'cs-9']);
    expect(pageSessions).toEqual(['cloud-alt', 'cloud-neu', 'cs-9']);
    expect(toasts).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
    el.remove();
  });

  it('AK-05/FA-10/FA-11: a row for the remembered session → navigate while on neu; on the overview the memory waits and the return to neu navigates; a row for ANOTHER pending session only leaves the list', async () => {
    const el = await view('neu');
    stateListener!(state([], [ALT, NEU]));
    await settle(el);
    form(el).dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cs-9', step: 'intent' } }));
    stateListener!(state([], [ALT, NEU, pend('cs-9', '2026-09-19T10:00:00Z')]));
    await settle(el);
    // another session's folder appears (FA-11): its entry goes, the page stays, no navigate
    stateListener!(state([row({ intentId: 'INT-2026-011', session: { id: 'cloud-alt', name: 'intent', model: 'haiku', agentStatus: 'working' } })], [NEU, pend('cs-9', '2026-09-19T10:00:00Z')]));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    expect(form(el).pendings.map((p) => p.sessionId)).toEqual(['cloud-neu', 'cs-9']);
    expect(form(el).selectedSessionId).toBe('cs-9');
    // Michael goes to the overview (Ablauf B.1) — the memory stays
    go({ view: 'vorhaben', segments: [] } as ParsedRoute);
    await settle(el);
    expect(el.querySelector('aos-vorhaben-uebersicht')).not.toBeNull();
    // the row of the remembered session appears while on the overview → no navigate (B.3)
    stateListener!(state([row({ intentId: 'INT-2026-012', session: { id: 'cs-9', name: 'intent', model: 'haiku', agentStatus: 'working' } })], [NEU]));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    // back on neu with the session in the address → the page opens the Vorhaben
    go({ view: 'neu', segments: ['p', 'cs-9'] } as ParsedRoute);
    await settle(el);
    expect(navigate).toHaveBeenCalledWith('vorhaben', ['p', 'INT-2026-012']);
    el.remove();
  });

  it('AK-07/FA-15: absicht-open from the overview → Mac navigates to neu/<p>/<sid>, phone opens the terminal; the address selects and highlights that session even when it is not the newest; the same segment again changes nothing', async () => {
    route = { view: 'vorhaben', segments: [] } as ParsedRoute;
    const el = await view('vorhaben');
    stateListener!(state([], [ALT, NEU]));
    await settle(el);
    const ueb = el.querySelector('aos-vorhaben-uebersicht')!;
    ueb.dispatchEvent(new CustomEvent('absicht-open', { bubbles: true, composed: true, detail: { pending: ALT } }));
    expect(navigate).toHaveBeenCalledWith('neu', ['p', 'cloud-alt']);
    // the router answers
    go({ view: 'neu', segments: ['p', 'cloud-alt'] } as ParsedRoute);
    await settle(el);
    expect(form(el).selectedSessionId).toBe('cloud-alt');
    expect(pageSessions).toEqual(['cloud-alt']);
    const seen = pageSessions.length;
    go({ view: 'neu', segments: ['p', 'cloud-alt'] } as ParsedRoute);
    stateListener!(state([], [ALT, NEU]));
    await settle(el);
    expect(pageSessions).toHaveLength(seen);
    expect(form(el).selectedSessionId).toBe('cloud-alt');
    el.remove();
    // phone
    mobile = true;
    navigate.mockClear();
    route = { view: 'vorhaben', segments: [] } as ParsedRoute;
    const opened: string[] = [];
    const onOpen = (e: Event): void => {
      opened.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId);
    };
    document.addEventListener('open-terminal-session', onOpen);
    const m = await view('vorhaben');
    stateListener!(state([], [ALT, NEU]));
    await settle(m);
    m.querySelector('aos-vorhaben-uebersicht')!.dispatchEvent(new CustomEvent('absicht-open', { bubbles: true, composed: true, detail: { pending: NEU } }));
    expect(opened).toEqual(['cloud-neu']);
    expect(navigate).not.toHaveBeenCalled();
    document.removeEventListener('open-terminal-session', onOpen);
    m.remove();
  });

  it('AK-07 (review E26): a dead session in the address → one toast „Sitzung ist beendet" and the segment is dropped; the same with origin start → no toast; nothing while the state still loads', async () => {
    route = { view: 'neu', segments: ['p', 'cloud-tot'] } as ParsedRoute;
    const el = await view('neu');
    const toasts: string[] = [];
    el.addEventListener('show-toast', (e) => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    stateListener!(state([], [ALT], true)); // still loading → nothing
    await settle(el);
    expect(toasts).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    stateListener!(state([], [ALT]));
    await settle(el);
    expect(toasts).toEqual(['Sitzung ist beendet']);
    expect(navigate).toHaveBeenCalledWith('neu', ['p']);
    // the page shows the newest pending now
    expect(form(el).selectedSessionId).toBe('cloud-alt');
    // a second broadcast does not toast again (memory forgotten)
    stateListener!(state([], [ALT]));
    await settle(el);
    expect(toasts).toHaveLength(1);
    // origin start: the broadcast comes later — no toast, no navigate
    navigate.mockClear();
    form(el).dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cs-9', step: 'intent' } }));
    stateListener!(state([], [ALT]));
    await settle(el);
    expect(toasts).toEqual(['Sitzung ist beendet', 'Sitzung gestartet — Vorhaben entsteht']);
    expect(navigate).not.toHaveBeenCalled();
    // it was seen pending once and then vanished (aborted) → forgotten quietly
    stateListener!(state([], [ALT, pend('cs-9', '2026-09-19T10:00:00Z')]));
    await settle(el);
    expect(form(el).selectedSessionId).toBe('cs-9');
    stateListener!(state([], [ALT]));
    await settle(el);
    expect(form(el).selectedSessionId).toBe('cloud-alt');
    expect(toasts).toHaveLength(2);
    el.remove();
  });
});
