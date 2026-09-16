// @vitest-environment happy-dom
/**
 * INT-2026-007 stage 1: the Vorhaben view splits page and Gespräch on the
 * Mac when a session is assigned (mock 08, FA-01), phone shows the page only
 * (NZ-01); a started step stays on the page — the event no longer reaches
 * app.ts — and „Absicht beginnen" opens the new Vorhaben page once a row
 * carries the session (FA-22, AN-S03).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VorhabenRow, VorhabenState } from '../../src/shared/types/vorhaben.protocol.js';

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

let route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
const navigate = vi.fn();
vi.mock('../../frontend/src/services/router.service.js', () => ({
  routerService: { on: vi.fn(), off: vi.fn(), navigate: (...a: unknown[]) => navigate(...(a as [])), getCurrentRoute: () => route },
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
    modelList: vi.fn(async () => ({ providers: [], defaultSelection: { providerId: 'anthropic', modelId: 'opus' }, stepDefaults: {} })),
    targets: vi.fn(async () => ({ isGitRepo: false, worktrees: [], worktreeCreationEnabled: false })),
    startStep: vi.fn(),
    setDraft: vi.fn(),
    deleteDraft: vi.fn(),
    send: vi.fn(),
  },
  VorhabenRequestError: class extends Error {},
  gatewayRequest: vi.fn(),
}));
vi.mock('../../frontend/src/services/gespraech.service.js', () => ({
  gespraechService: { subscribe: vi.fn(() => () => undefined), send: vi.fn(), discard: vi.fn() },
}));

const row = (o: Partial<VorhabenRow> = {}): VorhabenRow => ({
  projectId: 'p', projectPath: '/p', projectName: 'P', intentId: 'INT-2026-003', dirName: 'INT-2026-003-x', cwd: '/p', arbeitskopie: 'main', titel: 'T',
  phase: 'spec', phaseNote: '', bypass: false, zustand: 'wartet', zustandDetail: '', reviewDoc: 'spec', step: 'spec',
  docs: [{ key: 'spec', file: 'spec.md', mtimeMs: 1000 }], designFiles: [], hasBuildStand: false, lastChangedAt: '', lastChangedMs: 0,
  session: { id: 'cloud-1-1', name: 'spec INT-2026-003', model: 'opus', agentStatus: 'done' },
  ...o,
});

const state = (rows: VorhabenRow[]): VorhabenState => ({
  rows,
  projects: [{ id: 'p', path: '/p', name: 'P', arbeitskopie: 'main', worktrees: [], hasIntentDir: true }],
  docDrafts: {},
  drafts: {},
  protocol: [],
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

async function view(r: 'vorhaben' | 'projekt' = 'vorhaben') {
  await import('../../frontend/src/views/aos-vorhaben-view.js');
  const el = document.createElement('aos-vorhaben-view');
  el.route = r;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

describe('aos-vorhaben-view — split with Gespräch (FA-01, NZ-01)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
    route = { view: 'vorhaben', segments: ['p', 'INT-2026-003'] };
  });

  it('Mac + assigned session: page left, Gespräch right with the same row; the page gets the Gespräch width for its send bar', async () => {
    const el = await view();
    stateListener!(state([row()]));
    await settle(el);
    const frame = el.querySelector('.vorhaben-view')!;
    expect(frame.classList.contains('split')).toBe(true);
    const split = el.querySelector('.vorhaben-split')!;
    expect(split).not.toBeNull();
    const seite = split.querySelector('aos-vorhaben-seite')!;
    const gespraech = split.querySelector('aos-gespraech')!;
    expect(seite).not.toBeNull();
    expect(gespraech).not.toBeNull();
    expect(gespraech.row.intentId).toBe('INT-2026-003');
    expect(seite.gespraechBreite).toContain('clamp(');
    expect(seite.style.getPropertyValue('--gespraech-width')).toContain('clamp(');
    el.remove();
  });

  it('Mac without a session: page only, no split; phone: never a Gespräch', async () => {
    const el = await view();
    stateListener!(state([row({ zustand: 'keine_sitzung', session: undefined })]));
    await settle(el);
    expect(el.querySelector('.vorhaben-view')!.classList.contains('split')).toBe(false);
    expect(el.querySelector('aos-gespraech')).toBeNull();
    expect(el.querySelector('aos-vorhaben-seite')!.gespraechBreite).toBe('');
    el.remove();
    mobile = true;
    const m = await view();
    stateListener!(state([row()]));
    await settle(m);
    expect(m.querySelector('aos-gespraech')).toBeNull();
    expect(m.querySelector('aos-vorhaben-seite')).not.toBeNull();
    m.remove();
  });
});

describe('aos-vorhaben-view — started step stays on the page (FA-22, AN-S03)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mobile = false;
    navigate.mockClear();
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

  it('„Absicht beginnen": hint on the project page, navigation to the new Vorhaben once a row carries the session', async () => {
    route = { view: 'projekt', segments: ['p'] };
    const el = await view('projekt');
    stateListener!(state([]));
    await settle(el);
    const projekt = el.querySelector('aos-projekt-seite')!;
    expect(projekt.startedSessionId).toBe('');
    projekt.dispatchEvent(new CustomEvent('vorhaben-session-started', { bubbles: true, composed: true, detail: { sessionId: 'cloud-1-7', step: 'intent' } }));
    await settle(el);
    expect(projekt.startedSessionId).toBe('cloud-1-7');
    expect(projekt.shadowRoot!.textContent).toContain('Sitzung gestartet — Vorhaben entsteht');
    expect(navigate).not.toHaveBeenCalled();
    // a state whose row carries another session changes nothing
    stateListener!(state([row({ intentId: 'INT-2026-008', session: { id: 'cloud-1-1', name: 'x', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(navigate).not.toHaveBeenCalled();
    // the new Vorhaben's row with the started session → open its page
    stateListener!(state([row({ intentId: 'INT-2026-009', session: { id: 'cloud-1-7', name: 'intent', model: 'opus', agentStatus: 'working' } })]));
    await settle(el);
    expect(navigate).toHaveBeenCalledWith('vorhaben', ['p', 'INT-2026-009']);
    expect(projekt.startedSessionId).toBe('');
    el.remove();
  });
});
