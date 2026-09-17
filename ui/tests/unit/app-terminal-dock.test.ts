// @vitest-environment happy-dom
/**
 * INT-2026-011 (FA-02, FA-06, FA-08, FA-12, AN-S04): app.ts docks the terminal
 * from the route and follows the page's session. `vorhaben-page-session`
 * opens the sidebar on that tab without solo/fullscreen; a tab that arrives
 * later is remembered (`pendingDockSessionId`) and selected once it is in
 * `terminalSessions`; a session of another project switches the project the
 * way the bell does. The whole app is mounted with its services mocked —
 * the assertions read the app's own state, the terminal panels are stubs.
 *
 * INT-2026-013 (AK-03, AK-04, B3/B4): the page's session is app state
 * (`pageSessionId`, `null` = none); one sync in willUpdate() opens the docked
 * column on that tab whenever page, session, dock or the tab list change,
 * retries a failed project switch (at most three attempts, then a toast) and
 * never fires a second switch while one is in flight. Cmd+D and the header
 * toggle open on the page's tab; explicit openers keep their own tab.
 *
 * INT-2026-015 (AK-01 … AK-09, NZ-05, NZ-06): leaving a docked page for one
 * without a column closes the terminal window (sessions stay, the bell rings
 * for a waiting one, Cmd+D reopens floating); Cmd+← on the two docked routes
 * goes to the overview unless the key lands in a text field — the terminal's
 * own textarea (marked `data-terminal-input`) excepted. Text fields live in
 * shadow roots, so the fixtures are `div` hosts with `attachShadow`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TerminalSession } from '../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js';
import type { BellRow } from '../../frontend/src/components/terminal/agent-notifications.js';
import { gateway } from '../../frontend/src/gateway.js';

type RouteListener = (route: { view: string; segments: string[]; params?: Record<string, string> }) => void;
/** app.ts and the mounted view both subscribe — every listener gets the route. */
const routeListeners = new Set<RouteListener>();
const navigate = vi.fn();
vi.mock('../../frontend/src/services/router.service.js', () => ({
  routerService: {
    on: (_ev: string, l: RouteListener) => {
      routeListeners.add(l);
    },
    off: (_ev: string, l: RouteListener) => {
      routeListeners.delete(l);
    },
    init: vi.fn(),
    navigate: (...a: unknown[]) => navigate(...(a as [])),
    getCurrentRoute: () => ({ view: 'vorhaben', segments: [] }),
    parseHash: () => ({ view: 'vorhaben', segments: [] }),
  },
}));
vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: {
    send: vi.fn(), on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn(),
    getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn(), setProjectPath: vi.fn(),
  },
}));
vi.mock('../../frontend/src/utils/mermaid-render.js', () => ({ renderMermaidDiagrams: vi.fn(async () => undefined) }));
vi.mock('../../frontend/src/services/vorhaben.service.js', () => ({
  vorhabenService: {
    subscribe: () => () => undefined,
    refresh: vi.fn(),
    readDoc: vi.fn(async () => ({ content: '# T', mtimeMs: 1 })),
    readDesign: vi.fn(async () => null),
    listProjectDocs: vi.fn(async () => []),
    modelList: vi.fn(async () => ({ providers: [], defaultSelection: { providerId: 'anthropic', modelId: 'opus' }, stepDefaults: {} })),
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: vi.fn(),
    setAnsicht: vi.fn(),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
  },
  VorhabenRequestError: class extends Error {},
  gatewayRequest: vi.fn(),
}));
vi.mock('../../frontend/src/services/git-state.service.js', () => {
  const state = {
    gitStatus: null, loading: false, showCommitDialog: false, commitError: null, committing: false, pendingAutoPush: false,
    commitAndPushPhase: null, generatingCommitMessage: false, showPullStrategyDialog: false, pullStrategyRetryPush: false, showDiff: false, diffFile: null, diffContent: '',
  };
  return {
    gitState: {
      subscribe: (cb: (s: unknown) => void) => {
        cb(state);
        return () => undefined;
      },
      onGeneratedMessage: () => () => undefined,
      loadStatus: vi.fn(),
      commit: vi.fn(), revertFile: vi.fn(), revertAll: vi.fn(), deleteUntracked: vi.fn(), generateCommitMessage: vi.fn(), closeCommitDialog: vi.fn(),
      pullStrategySelect: vi.fn(), pullStrategyCancel: vi.fn(), closeDiff: vi.fn(),
    },
  };
});
type SwitchResult = { success: boolean; error?: string };
/** Default: the backend acks at once. Tests replace the implementation (deferred / failing). */
const switchProject = vi.fn<() => Promise<SwitchResult>>(async () => ({ success: true }));
vi.mock('../../frontend/src/services/project-state.service.js', () => ({
  projectStateService: {
    switchProject: (...a: unknown[]) => switchProject(...(a as [])),
    loadPersistedState: () => null,
    restoreProjects: vi.fn(async () => ({ restored: [], failed: [] })),
    persistState: vi.fn(),
    openProject: vi.fn(),
  },
}));
vi.mock('../../frontend/src/services/recently-opened.service.js', () => ({
  recentlyOpenedService: { getRecentlyOpened: () => [], add: vi.fn(), remove: vi.fn() },
}));
vi.mock('../../frontend/src/components/terminal/notification-sound.js', () => ({ playAgentDoneChime: vi.fn(), isBellSoundEnabled: () => false, setBellSoundEnabled: vi.fn() }));
vi.mock('../../frontend/src/components/terminal/aos-terminal-session.js', () => {
  class StubTerminalSession extends HTMLElement {
    refreshTerminal(): void {}
    focusTerminal(): void {}
  }
  customElements.define('aos-terminal-session', StubTerminalSession);
  return {};
});
vi.mock('../../frontend/src/components/terminal/aos-terminal-tabs.js', () => ({}));
vi.mock('../../frontend/src/components/terminal/aos-auto-review-toggle.js', () => ({}));
vi.mock('../../frontend/src/components/aos-claude-log-panel.js', () => ({}));
vi.mock('../../frontend/src/components/file-editor/aos-file-tree-sidebar.js', () => {
  // app.ts calls reset() on a project switch
  customElements.define('aos-file-tree-sidebar', class extends HTMLElement {
    reset(): void {}
  });
  return {};
});
vi.mock('../../frontend/src/components/file-editor/aos-file-editor-panel.js', () => ({}));
vi.mock('../../frontend/src/components/document-preview/aos-document-preview-panel.js', () => ({}));
vi.mock('../../frontend/src/components/aos-notepad-panel.js', () => ({}));
vi.mock('../../frontend/src/components/git/aos-git-diff-viewer.js', () => ({}));

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

interface Project { id: string; name: string; path: string }
/** The private state the assertions read and seed — typed here instead of `any`. */
interface AppInternals extends HTMLElement {
  terminalSessions: TerminalSession[];
  activeTerminalSessionId: string | null;
  isTerminalSidebarOpen: boolean;
  terminalDocked: boolean;
  pageSessionId: string | null;
  pendingDockSessionId: string | null;
  openProjects: Project[];
  activeProjectId: string | null;
  lastActiveSessionByProject: Map<string, string>;
  glockeRows: BellRow[];
  _showSessionSolo(tabId: string): void;
  showToast(message: string, type?: string): void;
  updateComplete: Promise<boolean>;
}
/** The sidebar's private layout state the AK-04 assertions read. */
interface SidebarInternals extends HTMLElement {
  docked: boolean;
  isOpen: boolean;
  _isSplit: boolean;
}

function tab(id: string, projectPath: string): TerminalSession {
  return { id, name: id, status: 'active', createdAt: new Date('2026-09-17T08:00:00Z'), projectPath, terminalType: 'claude-code', terminalSessionId: `cloud-${id}` };
}

const settle = async (el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> => {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 2));
  }
};

async function app(): Promise<AppInternals> {
  window.innerWidth = 1440;
  await import('../../frontend/src/app.js');
  const el = document.createElement('aos-app') as AppInternals;
  document.body.appendChild(el);
  await settle(el);
  el.openProjects = [{ id: 'pa', name: 'A', path: '/a' }, { id: 'pb', name: 'B', path: '/b' }];
  el.activeProjectId = 'pa';
  el.terminalSessions = [tab('a1', '/a'), tab('a2', '/a'), tab('b1', '/b')];
  el.activeTerminalSessionId = 'a1';
  el._showSessionSolo = vi.fn();
  el.showToast = vi.fn();
  await settle(el);
  return el;
}

const pageSession = (id: string | null): void => {
  document.dispatchEvent(new CustomEvent('vorhaben-page-session', { detail: { terminalSessionId: id } }));
};
const route = (view: string, segments: string[]): void => {
  for (const l of routeListeners) l({ view, segments });
};
/** Cmd/Ctrl+D on the document — the app's global shortcut (FA-05). */
const cmdD = (): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', metaKey: true, bubbles: true, cancelable: true }));
};
const sidebarOf = (el: HTMLElement): SidebarInternals => el.querySelector('aos-cloud-terminal-sidebar') as SidebarInternals;
/**
 * Cmd+← as the browser sends it: bubbles, cancelable, composed — so a press inside an open
 * shadow root reaches the app's `document` listener with the field as `composedPath()[0]`
 * (INT-2026-015). Returns the event for `defaultPrevented`.
 */
const cmdLeft = (target: EventTarget = document.body, init: KeyboardEventInit = {}): KeyboardEvent => {
  const e = new KeyboardEvent('keydown', { key: 'ArrowLeft', metaKey: true, bubbles: true, cancelable: true, composed: true, ...init });
  target.dispatchEvent(e);
  return e;
};
/** A shadow host with one child — the shape of the Anmerkung/Absicht fields and of `aos-terminal`'s textarea. */
function shadowChild<T extends HTMLElement>(child: T): T {
  const host = document.createElement('div');
  document.body.appendChild(host);
  host.attachShadow({ mode: 'open' }).appendChild(child);
  return child;
}
/** A switch whose ack the test releases by hand. */
function deferredSwitch(): { resolve: (r: SwitchResult) => void } {
  let resolve: (r: SwitchResult) => void = () => undefined;
  switchProject.mockImplementation(() => new Promise<SwitchResult>((r) => { resolve = r; }));
  return { resolve: (r) => resolve(r) };
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  mobile = false;
  navigate.mockClear();
  switchProject.mockReset();
  switchProject.mockImplementation(async () => ({ success: true }));
});

describe('app.ts — docked terminal from the route (INT-2026-011, FA-01/FA-18)', () => {
  it('Vorhaben page and neu dock; the list, the project page and other views do not', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    expect(el.terminalDocked).toBe(true);
    route('vorhaben', []);
    expect(el.terminalDocked).toBe(false);
    route('neu', ['p']);
    expect(el.terminalDocked).toBe(true);
    route('neu', []);
    expect(el.terminalDocked).toBe(true);
    route('projekt', ['p']);
    expect(el.terminalDocked).toBe(false);
    route('terminal', []);
    expect(el.terminalDocked).toBe(false);
    // the sidebar receives the flag
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    const sidebar = el.querySelector('aos-cloud-terminal-sidebar') as HTMLElement & { docked: boolean };
    expect(sidebar.docked).toBe(true);
    el.remove();
  });
});

describe('app.ts — vorhaben-page-session (FA-02, FA-08, FA-12, AN-S04)', () => {
  it('tab present: sidebar opens on that tab, no solo/fullscreen', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    expect(el.isTerminalSidebarOpen).toBe(false);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a2');
    expect(el.pendingDockSessionId).toBeNull();
    expect(el._showSessionSolo).not.toHaveBeenCalled();
    expect(switchProject).not.toHaveBeenCalled();
    el.remove();
  });

  it('tab missing: remembered and selected once the tab arrives in terminalSessions (race with cloud-terminal:created)', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a9');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.pendingDockSessionId).toBe('cloud-a9');
    expect(el.activeTerminalSessionId).toBe('a1'); // unchanged until the tab exists
    // an unrelated list update keeps the memory
    el.terminalSessions = [...el.terminalSessions, tab('a3', '/a')];
    await settle(el);
    expect(el.pendingDockSessionId).toBe('cloud-a9');
    expect(el.activeTerminalSessionId).toBe('a1');
    // the tab arrives (adoption / list / own create)
    el.terminalSessions = [...el.terminalSessions, tab('a9', '/a')];
    await settle(el);
    expect(el.pendingDockSessionId).toBeNull();
    expect(el.activeTerminalSessionId).toBe('a9');
    expect(el._showSessionSolo).not.toHaveBeenCalled();
    el.remove();
  });

  it('session of another project: switches the project like the bell jump and lands on the tab', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-b1');
    await settle(el);
    expect(switchProject).toHaveBeenCalledTimes(1);
    expect(el.activeProjectId).toBe('pb');
    expect(el.activeTerminalSessionId).toBe('b1');
    expect(el.isTerminalSidebarOpen).toBe(true);
    el.remove();
  });

  it('a later page session replaces a pending one; null or an empty id means „no page session" and drops the memory (B3)', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a9');
    pageSession('cloud-a2');
    await settle(el);
    expect(el.pendingDockSessionId).toBeNull();
    expect(el.activeTerminalSessionId).toBe('a2');
    document.dispatchEvent(new CustomEvent('vorhaben-page-session', { detail: { terminalSessionId: '' } }));
    await settle(el);
    expect(el.pageSessionId).toBeNull();
    expect(el.activeTerminalSessionId).toBe('a2');
    expect(el.isTerminalSidebarOpen).toBe(true); // the sidebar is left alone (FA-24)
    pageSession('cloud-a9');
    await settle(el);
    expect(el.pendingDockSessionId).toBe('cloud-a9');
    pageSession(null);
    await settle(el);
    expect(el.pendingDockSessionId).toBeNull();
    el.terminalSessions = [...el.terminalSessions, tab('a9', '/a')];
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a2'); // the late tab is not chosen any more
    el.remove();
  });
});

describe('app.ts — page session as state, one sync in willUpdate (INT-2026-013, AK-03)', () => {
  it('sidebar closed with Cmd+D, list → Vorhaben: the column opens in the same update on the page\'s tab', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    // back to the list (the view announces null), another tab looked at meanwhile
    route('vorhaben', []);
    pageSession(null);
    el.activeTerminalSessionId = 'a1';
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    // into the Vorhaben again: one update → open, docked, page tab in front
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await el.updateComplete;
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.terminalDocked).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a2');
    expect(el.pendingDockSessionId).toBeNull();
    expect(sidebarOf(el).isOpen).toBe(true);
    expect(sidebarOf(el).docked).toBe(true);
    expect(el._showSessionSolo).not.toHaveBeenCalled();
    el.remove();
  });

  it('session of another project: the column opens before the ack and lands on the tab after it', async () => {
    const el = await app();
    const sw = deferredSwitch();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-b1');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(switchProject).toHaveBeenCalledTimes(1);
    expect(el.activeProjectId).toBe('pa');
    expect(el.pendingDockSessionId).toBe('cloud-b1'); // stays armed until the tab is really in front
    // updates while the switch is in flight do not fire a second switch
    el.terminalSessions = [...el.terminalSessions];
    await settle(el);
    el.terminalSessions = [...el.terminalSessions, tab('a3', '/a')];
    await settle(el);
    expect(switchProject).toHaveBeenCalledTimes(1);
    sw.resolve({ success: true });
    await settle(el);
    expect(el.activeProjectId).toBe('pb');
    expect(el.activeTerminalSessionId).toBe('b1');
    expect(el.pendingDockSessionId).toBeNull();
    el.remove();
  });

  it('a failed switch is retried on the next update; after the third failure the memory is dropped and a toast says so', async () => {
    const el = await app();
    switchProject.mockImplementation(async () => ({ success: false, error: 'Switch already in progress' }));
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-b1');
    await settle(el);
    await settle(el);
    expect(switchProject).toHaveBeenCalledTimes(3);
    expect(el.pendingDockSessionId).toBeNull();
    expect(el.activeProjectId).toBe('pa');
    expect(el.activeTerminalSessionId).toBe('a1');
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.showToast).toHaveBeenCalledWith(expect.stringMatching(/Projektwechsel .*fehlgeschlagen/), 'warning');
    // the next arming (Cmd+D twice) tries again from zero
    switchProject.mockClear();
    switchProject.mockImplementation(async () => ({ success: true }));
    cmdD();
    await settle(el);
    cmdD();
    await settle(el);
    expect(switchProject).toHaveBeenCalledTimes(1);
    expect(el.activeProjectId).toBe('pb');
    expect(el.activeTerminalSessionId).toBe('b1');
    expect(el.pendingDockSessionId).toBeNull();
    el.remove();
  });

  it('leaving the page drops the memory: a tab arriving later is not chosen on the list', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a9');
    await settle(el);
    expect(el.pendingDockSessionId).toBe('cloud-a9');
    route('vorhaben', []);
    await settle(el);
    expect(el.pageSessionId).toBeNull();
    expect(el.pendingDockSessionId).toBeNull();
    el.terminalSessions = [...el.terminalSessions, tab('a9', '/a')];
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a1');
    el.remove();
  });

  it('an unknown route after a Vorhaben forgets the page session (review #7)', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.pageSessionId).toBe('cloud-a2');
    route('not-found', []);
    await settle(el);
    expect(el.pageSessionId).toBeNull();
    expect(el.terminalDocked).toBe(false);
    // Cmd+D off and on outside the docked routes: the tab is left alone
    el.activeTerminalSessionId = 'a1';
    cmdD();
    await settle(el);
    cmdD();
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a1');
    el.remove();
  });

  it('the session ends while its tab is still pending: the view announces null, the memory is gone (review #8)', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a9');
    await settle(el);
    expect(el.pendingDockSessionId).toBe('cloud-a9');
    pageSession(null);
    await settle(el);
    expect(el.pendingDockSessionId).toBeNull();
    expect(el.isTerminalSidebarOpen).toBe(true);
    el.terminalSessions = [...el.terminalSessions, tab('a9', '/a')];
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a1');
    el.remove();
  });
});

describe('app.ts — Cmd+D and the header toggle open on the page\'s tab (INT-2026-013, AK-04)', () => {
  it('after another tab was looked at, Cmd+D and terminal-toggle reopen on the page session', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a2');
    el.activeTerminalSessionId = 'a1';
    await settle(el);
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    expect(el.activeTerminalSessionId).toBe('a1');
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a2');
    // header toggle (aos-kopfzeile → terminal-toggle)
    el.activeTerminalSessionId = 'a1';
    await settle(el);
    const kopf = el.querySelector('aos-kopfzeile')!;
    kopf.dispatchEvent(new CustomEvent('terminal-toggle', { bubbles: true, composed: true }));
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    kopf.dispatchEvent(new CustomEvent('terminal-toggle', { bubbles: true, composed: true }));
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a2');
    expect(el._showSessionSolo).not.toHaveBeenCalled();
    el.remove();
  });

  it('Cmd+D on a docked page without a session opens a single pane with the current tab, whatever layout is stored', async () => {
    localStorage.setItem('cloud-terminal-layout-mode', 'split-2');
    localStorage.setItem('cloud-terminal-pane-sessions', JSON.stringify(['a1', 'b1']));
    localStorage.setItem('cloud-terminal-pane-projects', JSON.stringify(['/a', '/b']));
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a1');
    expect(el.pendingDockSessionId).toBeNull();
    const sb = sidebarOf(el);
    expect(sb.docked).toBe(true);
    expect(sb._isSplit).toBe(false);
    expect(sb.querySelector('aos-terminal-tabs')).not.toBeNull();
    expect(sb.querySelector('.pane-headers')).toBeNull();
    expect(localStorage.getItem('cloud-terminal-layout-mode')).toBe('split-2');
    el.remove();
  });

  it('Cmd+D outside the docked routes leaves the tab alone', async () => {
    const el = await app();
    route('vorhaben', []);
    pageSession('cloud-a2'); // a stray announcement on the list must not arm anything
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a1');
    expect(sidebarOf(el).docked).toBe(false);
    el.remove();
  });

  it('an explicit open-terminal-session keeps its own tab on the docked page', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a2');
    document.dispatchEvent(new CustomEvent('open-terminal-session', { detail: { sessionId: 'cloud-a1' } }));
    await settle(el);
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a1');
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.pendingDockSessionId).toBeNull();
    el.remove();
  });
});

describe('app.ts — open-terminal-session with a docked terminal (AN-S08)', () => {
  it('docked page: „Im Terminal öffnen" only selects the tab; the list view still goes solo', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    document.dispatchEvent(new CustomEvent('open-terminal-session', { detail: { sessionId: 'cloud-a2' } }));
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a2');
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el._showSessionSolo).not.toHaveBeenCalled();
    route('vorhaben', []);
    document.dispatchEvent(new CustomEvent('open-terminal-session', { detail: { sessionId: 'cloud-a1' } }));
    await settle(el);
    expect(el._showSessionSolo).toHaveBeenCalledWith('a1');
    el.remove();
  });
});

describe('app.ts — leaving a docked page closes the terminal, Cmd+← (INT-2026-015)', () => {
  /** Vorhaben page with the page's session open and docked — the starting point of most cases. */
  async function dockedPage(): Promise<AppInternals> {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.terminalDocked).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a2');
    return el;
  }

  it('AK-01: back to the list closes the window in the same update; a late announcement cannot reopen it', async () => {
    const el = await dockedPage();
    route('vorhaben', []);
    // synchronous — one task, one Lit update: no intermediate "floating open" render (review G3)
    expect(el.isTerminalSidebarOpen).toBe(false);
    expect(el.terminalDocked).toBe(false);
    await settle(el);
    expect(sidebarOf(el).isOpen).toBe(false);
    expect(sidebarOf(el).docked).toBe(false);
    expect(el.pendingDockSessionId).toBeNull();
    // the view's late announcement after leaving (review E2/E12)
    pageSession('cloud-a2');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    expect(el.pendingDockSessionId).toBeNull();
    el.remove();
  });

  it('AK-01: the project page and „Neue Absicht" → list close it too', async () => {
    const el = await dockedPage();
    route('projekt', ['p']);
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    expect(sidebarOf(el).isOpen).toBe(false);
    el.remove();

    const el2 = await app();
    route('neu', ['p']);
    pageSession('cloud-a2');
    await settle(el2);
    expect(el2.isTerminalSidebarOpen).toBe(true);
    route('vorhaben', []);
    await settle(el2);
    expect(el2.isTerminalSidebarOpen).toBe(false);
    el2.remove();
  });

  it('AK-01 start case: the first route being a Vorhaben page opens, never closes (wasDocked starts false, review G4)', async () => {
    const el = await app();
    expect(el.terminalDocked).toBe(false);
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a2');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(sidebarOf(el).docked).toBe(true);
    el.remove();
  });

  it('AK-02: docked → docked keeps the window open on the new page\'s session', async () => {
    const el = await dockedPage();
    route('vorhaben', ['p', 'INT-2026-004']);
    pageSession('cloud-a1');
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.activeTerminalSessionId).toBe('a1');
    route('neu', ['p']);
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(el.terminalDocked).toBe(true);
    el.remove();
  });

  it('AK-03: the session left behind rings the bell once the window is closed', async () => {
    const el = await dockedPage();
    const blocked = (): TerminalSession[] => el.terminalSessions.map((s) => (s.id === 'a2' ? { ...s, agentStatus: 'blocked' as const, agentStatusAt: 5 } : s));
    // before leaving: a2 is looked at → not listed
    el.terminalSessions = blocked();
    await settle(el);
    expect(el.glockeRows.some((r) => r.sessionId === 'a2')).toBe(false);
    route('vorhaben', []);
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(false);
    const row = el.glockeRows.find((r) => r.sessionId === 'a2');
    expect(row?.kind).toBe('blocked');
    el.remove();
  });

  it('AK-04: Cmd+D after leaving reopens floating on the same tab, nothing armed', async () => {
    const el = await dockedPage();
    route('vorhaben', []);
    await settle(el);
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(sidebarOf(el).docked).toBe(false);
    expect(el.activeTerminalSessionId).toBe('a2');
    expect(el.pendingDockSessionId).toBeNull();
    el.remove();
  });

  it('NZ-06: closing the window keeps every session and sends no close to the backend', async () => {
    const el = await dockedPage();
    const count = el.terminalSessions.length;
    vi.mocked(gateway.send).mockClear();
    route('vorhaben', []);
    await settle(el);
    expect(el.terminalSessions).toHaveLength(count);
    const closes = vi.mocked(gateway.send).mock.calls.filter((c) => (c[0] as { type?: string })?.type === 'cloud-terminal:close');
    expect(closes).toHaveLength(0);
    el.remove();
  });

  it('NZ-05: on the phone nothing closes and Cmd+← does nothing', async () => {
    mobile = true;
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    el.isTerminalSidebarOpen = true;
    await settle(el);
    route('vorhaben', []);
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    const e = cmdLeft();
    expect(navigate).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    el.remove();
  });

  it('AK-05: Cmd+← on the Vorhaben page and on „Neue Absicht" goes to the overview', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    let e = cmdLeft();
    expect(navigate).toHaveBeenCalledWith('vorhaben');
    expect(e.defaultPrevented).toBe(true);
    navigate.mockClear();
    route('neu', ['p']);
    await settle(el);
    e = cmdLeft();
    expect(navigate).toHaveBeenCalledWith('vorhaben');
    expect(e.defaultPrevented).toBe(true);
    el.remove();
  });

  it('AK-09: everywhere else the browser keeps Cmd+← — also with the floating terminal focused', async () => {
    const el = await app();
    for (const [view, segments] of [['vorhaben', []], ['projekt', ['p']], ['not-found', []]] as const) {
      route(view, [...segments]);
      await settle(el);
      const e = cmdLeft();
      expect(navigate).not.toHaveBeenCalled();
      expect(e.defaultPrevented).toBe(false);
    }
    // floating terminal on the list, key pressed in its textarea (reviews E7/E13)
    route('vorhaben', []);
    cmdD();
    await settle(el);
    expect(el.isTerminalSidebarOpen).toBe(true);
    expect(sidebarOf(el).docked).toBe(false);
    const ta = shadowChild(document.createElement('textarea'));
    ta.setAttribute('data-terminal-input', '');
    const e = cmdLeft(ta);
    expect(navigate).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    el.remove();
  });

  it('G12: a held key counts once — repeats are ignored', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    let e = cmdLeft(document.body, { repeat: true });
    expect(navigate).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    e = cmdLeft();
    expect(navigate).toHaveBeenCalledWith('vorhaben');
    expect(e.defaultPrevented).toBe(true);
    el.remove();
  });

  it('AK-06: text fields keep the key — light DOM and inside shadow roots (textarea, contenteditable, input)', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    const light = document.createElement('input');
    document.body.appendChild(light);
    const ta = shadowChild(document.createElement('textarea'));
    const ce = shadowChild(document.createElement('div'));
    ce.setAttribute('contenteditable', 'true');
    const input = shadowChild(document.createElement('input'));
    for (const field of [light, ta, ce, input]) {
      const e = cmdLeft(field);
      expect(navigate).not.toHaveBeenCalled();
      expect(e.defaultPrevented).toBe(false);
    }
    el.remove();
  });

  it('AK-06 control: a composed keydown from a non-editable shadow child does reach the app (review G1)', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    const div = shadowChild(document.createElement('div'));
    const e = cmdLeft(div);
    expect(navigate).toHaveBeenCalledWith('vorhaben');
    expect(e.defaultPrevented).toBe(true);
    el.remove();
  });

  it('AK-07: the terminal\'s own textarea (data-terminal-input) does not keep the key; without the marker it does', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    await settle(el);
    const ta = shadowChild(document.createElement('textarea'));
    ta.setAttribute('data-terminal-input', '');
    let e = cmdLeft(ta);
    expect(navigate).toHaveBeenCalledWith('vorhaben');
    expect(e.defaultPrevented).toBe(true);
    navigate.mockClear();
    ta.removeAttribute('data-terminal-input');
    e = cmdLeft(ta);
    expect(navigate).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    el.remove();
  });
});
