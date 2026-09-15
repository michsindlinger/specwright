// @vitest-environment happy-dom

/**
 * showSessionSolo(): a step started from the Vorhaben page must land alone on the screen
 * (INT-2026-005, FA-35) — fullscreen, the session in its project's pane, that pane zoomed;
 * in single mode with another project active, the sidebar asks app.ts to switch project
 * (`session-jump`, the bell's path). The terminal panels are stubbed: xterm has no place
 * in happy-dom, and the assertion is about the sidebar's bookkeeping, not the terminals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
vi.mock('../../frontend/src/components/terminal/aos-terminal-session.js', () => {
  // The sidebar calls these on every mounted panel after a layout change; the stub has no xterm.
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

import type { TerminalSession } from '../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js';

/** The private state the assertions read — typed here instead of reaching for `any`. */
interface SidebarInternals extends HTMLElement {
  isOpen: boolean;
  sessions: TerminalSession[];
  allSessions: TerminalSession[];
  activeSessionId: string | null;
  isFullscreen: boolean;
  layoutMode: 'single' | 'split-2' | 'quad-4';
  paneSessionIds: (string | null)[];
  focusedPaneIndex: number;
  _zoomedPane: number | null;
  showSessionSolo(sessionId: string): void;
  updateComplete: Promise<boolean>;
}

function tab(id: string, projectPath: string): TerminalSession {
  return { id, name: id, status: 'active', createdAt: new Date('2026-09-15T22:00:00Z'), projectPath, terminalType: 'claude-code', terminalSessionId: `cloud-${id}` };
}

async function sidebar(opts: { layout: 'single' | 'split-2'; panes?: (string | null)[]; activeProject: string; all: TerminalSession[]; active: string | null }): Promise<SidebarInternals> {
  localStorage.clear();
  localStorage.setItem('cloud-terminal-layout-mode', opts.layout);
  if (opts.panes) localStorage.setItem('cloud-terminal-pane-sessions', JSON.stringify(opts.panes));
  await import('../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js');
  const el = document.createElement('aos-cloud-terminal-sidebar') as SidebarInternals;
  el.allSessions = opts.all;
  el.sessions = opts.all.filter((s) => s.projectPath === opts.activeProject);
  el.activeSessionId = opts.active;
  el.isOpen = true;
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('aos-cloud-terminal-sidebar.showSessionSolo() (INT-2026-005, AK-01/AK-02)', () => {
  it('split-2: puts a background session into its project pane, zooms that pane and goes fullscreen', async () => {
    const all = [tab('a1', '/a'), tab('b1', '/b'), tab('b2', '/b')];
    const el = await sidebar({ layout: 'split-2', panes: ['a1', 'b1'], activeProject: '/a', all, active: 'a1' });
    expect(el.isFullscreen).toBe(false);
    const selected: string[] = [];
    el.addEventListener('session-select', (e) => selected.push((e as CustomEvent<{ sessionId: string }>).detail.sessionId));

    el.showSessionSolo('b2');
    await el.updateComplete;

    expect(el.isFullscreen).toBe(true);
    expect(el.paneSessionIds).toEqual(['a1', 'b2']);
    expect(el._zoomedPane).toBe(1);
    expect(el.focusedPaneIndex).toBe(1);
    expect(selected).toEqual(['b2']);
  });

  it('split-2: a session already visible in a pane just gets zoomed', async () => {
    const all = [tab('a1', '/a'), tab('b1', '/b')];
    const el = await sidebar({ layout: 'split-2', panes: ['a1', 'b1'], activeProject: '/a', all, active: 'a1' });

    el.showSessionSolo('b1');
    await el.updateComplete;

    expect(el.isFullscreen).toBe(true);
    expect(el.paneSessionIds).toEqual(['a1', 'b1']);
    expect(el._zoomedPane).toBe(1);
  });

  it('single mode, other project: asks app.ts to switch project (session-jump) and goes fullscreen', async () => {
    const all = [tab('a1', '/a'), tab('b1', '/b')];
    const el = await sidebar({ layout: 'single', activeProject: '/a', all, active: 'a1' });
    const jumps: { sessionId: string; projectPath: string }[] = [];
    el.addEventListener('session-jump', (e) => jumps.push((e as CustomEvent<{ sessionId: string; projectPath: string }>).detail));

    el.showSessionSolo('b1');
    await el.updateComplete;

    expect(el.isFullscreen).toBe(true);
    expect(jumps).toEqual([{ sessionId: 'b1', projectPath: '/b' }]);
    expect(el._zoomedPane).toBeNull();
  });

  it('unknown session: no-op, no fullscreen', async () => {
    const el = await sidebar({ layout: 'single', activeProject: '/a', all: [tab('a1', '/a')], active: 'a1' });
    el.showSessionSolo('nope');
    await el.updateComplete;
    expect(el.isFullscreen).toBe(false);
  });
});
