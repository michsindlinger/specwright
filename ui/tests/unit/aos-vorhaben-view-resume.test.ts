// @vitest-environment happy-dom
/**
 * INT-2026-019 (AK-01, AK-02, AK-04, AK-08, AK-09): entering a Vorhaben page
 * sends „Seite geöffnet" (`vorhabenService.resumeSession`) exactly once — as
 * soon as a loaded state is there; a reconnect asks again against the next
 * state only; a refusal is shown on the page and not retried until the page
 * is opened again; the hint goes when the row has a live session; `gestartet`
 * is a toast (no fullscreen terminal on the phone, O1).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenRow, VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

type Handler = (...a: unknown[]) => void;
const gatewayHandlers = new Map<string, Handler[]>();
const fireGateway = (type: string): void => {
  for (const fn of gatewayHandlers.get(type) ?? []) fn();
};
vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: {
    send: vi.fn(),
    on: (type: string, fn: Handler) => gatewayHandlers.set(type, [...(gatewayHandlers.get(type) ?? []), fn]),
    off: vi.fn(),
    getConnectionStatus: () => true,
    isConnecting: () => false,
    getProjectPath: vi.fn(),
  },
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
let routeHandler: ((r: { view: string; segments: string[] }) => void) | null = null;
vi.mock('../../frontend/src/services/router.service.js', () => ({
  routerService: {
    on: (_type: string, fn: (r: { view: string; segments: string[] }) => void) => (routeHandler = fn),
    off: vi.fn(),
    navigate: vi.fn(),
    getCurrentRoute: () => route,
  },
}));

type StateListener = (s: VorhabenState | null) => void;
let stateListener: StateListener | null = null;
const resumeSession = vi.fn<(projectId: string, intentId: string) => Promise<{ ergebnis: string; sessionId?: string; grund?: string }>>();
class VorhabenRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}
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
    setAnsicht: vi.fn(),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
    resumeSession: (...a: [string, string]) => resumeSession(...a),
  },
  VorhabenRequestError,
  gatewayRequest: vi.fn(),
}));

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-003', dirName: 'INT-2026-003-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'bau', phaseNote: '', bypass: false, zustand: 'sitzung_beendet', zustandDetail: '', reviewDoc: 'plan', step: 'build', sessionBusy: false,
  nextStep: { step: 'build', label: 'Bauen', command: '/specwright:build INT-2026-003' },
  docs: [{ key: 'plan', file: 'plan.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  session: { id: 'cloud-1-1', name: 'build INT-2026-003', model: 'opus', agentStatus: 'unknown', ended: true },
  ...o,
});

const state = (rows: VorhabenRow[], loading = false): VorhabenState => ({
  rows,
  projects: [{ id: 'p', path: '/p', name: 'P', arbeitskopie: 'main', worktrees: [], hasIntentDir: true }],
  pendingIntents: [],
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

type ViewEl = HTMLElement & { route: string; updateComplete: Promise<boolean> };
async function view(): Promise<ViewEl> {
  await import('../../frontend/src/views/aos-vorhaben-view.js');
  const el = document.createElement('aos-vorhaben-view') as ViewEl;
  el.route = route.view;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const seite = (el: HTMLElement) => el.querySelector('aos-vorhaben-seite') as (HTMLElement & { resumeHinweis: string | null; shadowRoot: ShadowRoot; updateComplete: Promise<boolean> }) | null;

describe('aos-vorhaben-view — resume on opening (INT-2026-019)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    resumeSession.mockReset();
    resumeSession.mockResolvedValue({ ergebnis: 'nicht_noetig', grund: 'lebt' });
    gatewayHandlers.clear();
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
  });

  it('asks once per opening, only with a loaded state; a second state does not ask again; leaving and returning asks again (AK-04, AK-09)', async () => {
    const el = await view();
    expect(resumeSession).not.toHaveBeenCalled();
    stateListener!(state([row()], true));
    await settle(el);
    expect(resumeSession).not.toHaveBeenCalled();
    stateListener!(state([row()]));
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    expect(resumeSession).toHaveBeenCalledWith('p', 'INT-2026-003');
    stateListener!(state([row()]));
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    // The same route again (a hash re-fire) is no new opening.
    routeHandler!({ view: 'vorhaben', segments: ['p', 'INT-2026-003'] });
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    // Overview and back: a new opening.
    routeHandler!({ view: 'vorhaben', segments: [] });
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    routeHandler!({ view: 'vorhaben', segments: ['p', 'INT-2026-003'] });
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(2);
    // Entering with a loaded state in hand sends at once (overview → page).
    routeHandler!({ view: 'vorhaben', segments: ['p', 'INT-2026-004'] });
    await settle(el);
    expect(resumeSession).toHaveBeenLastCalledWith('p', 'INT-2026-004');
  });

  it('after a reconnect it asks again — against the next state from the backend, not the stale one', async () => {
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    fireGateway('gateway.connected');
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    stateListener!(state([row()]));
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(2);
    // A reconnect on the overview asks nothing.
    routeHandler!({ view: 'vorhaben', segments: [] });
    fireGateway('gateway.connected');
    stateListener!(state([row()]));
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(2);
  });

  it('a refusal is shown on the page with the reason, not retried until the page is opened again, and goes when the row has a live session (AK-08, AK-09)', async () => {
    resumeSession.mockRejectedValueOnce(new VorhabenRequestError('WORKTREE_MISSING', 'Arbeitskopie fehlt: /p-worktrees/session-x — von Hand anlegen (git worktree add) oder nächsten Schritt starten'));
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    const page = seite(el)!;
    expect(page.resumeHinweis).toContain('Arbeitskopie fehlt: /p-worktrees/session-x');
    expect(page.shadowRoot.textContent).toContain('Wiederaufnahme nicht möglich: Arbeitskopie fehlt: /p-worktrees/session-x');
    // „Nächster Schritt" stays usable.
    expect(page.shadowRoot.querySelector('aos-naechster-schritt')).not.toBeNull();
    stateListener!(state([row()]));
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    expect(seite(el)!.resumeHinweis).not.toBeNull();
    // The row got a live session (Nächster Schritt) → the hint goes.
    stateListener!(state([row({ zustand: 'arbeitet', sessionBusy: true, session: { id: 'cloud-1-2', name: 'build INT-2026-003', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(seite(el)!.resumeHinweis).toBeNull();
    // Opening again asks again.
    routeHandler!({ view: 'vorhaben', segments: [] });
    routeHandler!({ view: 'vorhaben', segments: ['p', 'INT-2026-003'] });
    await settle(el);
    expect(resumeSession).toHaveBeenCalledTimes(2);
  });

  it('a route change clears the hint; a late refusal for a page that was left is dropped', async () => {
    let reject!: (e: Error) => void;
    resumeSession.mockReturnValueOnce(new Promise((_r, rj) => (reject = rj)));
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    routeHandler!({ view: 'vorhaben', segments: [] });
    reject(new VorhabenRequestError('RESUME_FAILED', 'Maximale Anzahl Sessions (5) erreicht'));
    await settle(el);
    routeHandler!({ view: 'vorhaben', segments: ['p', 'INT-2026-003'] });
    await settle(el);
    expect(seite(el)!.resumeHinweis).toBeNull();
  });

  it('gestartet → toast „Sitzung nach Neustart fortgesetzt"; on the phone no fullscreen terminal (O1); the Mac docks via vorhaben-page-session once the row carries the session (AK-02)', async () => {
    resumeSession.mockResolvedValueOnce({ ergebnis: 'gestartet', sessionId: 'cloud-1-9' });
    const toasts: string[] = [];
    const opened: string[] = [];
    document.addEventListener('show-toast', (e) => toasts.push((e as CustomEvent<{ message: string }>).detail.message));
    document.addEventListener('open-terminal-session', (e) => opened.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId));
    const pageSessions: (string | null)[] = [];
    document.addEventListener('vorhaben-page-session', (e) => pageSessions.push((e as CustomEvent<{ terminalSessionId: string | null }>).detail.terminalSessionId));
    mobile = true;
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    expect(toasts).toEqual(['Sitzung nach Neustart fortgesetzt']);
    expect(opened).toEqual([]);
    expect(seite(el)!.resumeHinweis).toBeNull();
    // The next state carries the resumed session → the page shows the mark; on the Mac the terminal docks.
    mobile = false;
    stateListener!(state([row({ zustand: 'wartet', session: { id: 'cloud-1-9', name: 'build INT-2026-003', model: 'opus', agentStatus: 'idle', resumed: { at: '2026-09-18T06:00:00Z', von: 'cloud-1-1', stand: '2026-09-18T05:42:00Z' } } })]));
    await settle(el);
    expect(pageSessions[pageSessions.length - 1]).toBe('cloud-1-9');
    expect(seite(el)!.shadowRoot.textContent).toContain('fortgesetzt nach Neustart, Stand');
  });
});
