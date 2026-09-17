// @vitest-environment happy-dom
/**
 * INT-2026-011 (FA-02, FA-06, FA-08, FA-12, AN-S04): app.ts docks the terminal
 * from the route and follows the page's session. `vorhaben-page-session`
 * opens the sidebar on that tab without solo/fullscreen; a tab that arrives
 * later is remembered (`pendingDockSessionId`) and selected once it is in
 * `terminalSessions`; a session of another project switches the project the
 * way the bell does. The whole app is mounted with its services mocked —
 * the assertions read the app's own state, the terminal panels are stubs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TerminalSession } from '../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js';

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
const switchProject = vi.fn(async () => ({ success: true }));
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
  pendingDockSessionId: string | null;
  openProjects: Project[];
  activeProjectId: string | null;
  lastActiveSessionByProject: Map<string, string>;
  _showSessionSolo(tabId: string): void;
  updateComplete: Promise<boolean>;
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
  await settle(el);
  return el;
}

const pageSession = (id: string): void => {
  document.dispatchEvent(new CustomEvent('vorhaben-page-session', { detail: { terminalSessionId: id } }));
};
const route = (view: string, segments: string[]): void => {
  for (const l of routeListeners) l({ view, segments });
};

beforeEach(() => {
  document.body.innerHTML = '';
  mobile = false;
  navigate.mockClear();
  switchProject.mockClear();
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

  it('a later page session replaces a pending one; an empty id is ignored', async () => {
    const el = await app();
    route('vorhaben', ['p', 'INT-2026-003']);
    pageSession('cloud-a9');
    pageSession('cloud-a2');
    await settle(el);
    expect(el.pendingDockSessionId).toBeNull();
    expect(el.activeTerminalSessionId).toBe('a2');
    document.dispatchEvent(new CustomEvent('vorhaben-page-session', { detail: { terminalSessionId: '' } }));
    await settle(el);
    expect(el.activeTerminalSessionId).toBe('a2');
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
