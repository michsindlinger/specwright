// @vitest-environment happy-dom

/**
 * INT-2026-011 (FA-01, FA-03, FA-04, FA-07): `docked` turns the same sidebar
 * instance into the right column of the Vorhaben page — half the content width
 * (window minus file tree), class `docked` (top = header, no shadow), no
 * resizer, `--terminal-open-width` = that width so the page yields. Below
 * 1024 px it falls back to the floating sidebar; fullscreen wins over docked.
 * The terminal panels are stubbed as in the solo test — this is about geometry.
 *
 * INT-2026-013 (AK-04, B4): docked is always ONE pane — the stored layout
 * (`split-2`/`quad-4`) is neither applied nor overwritten while docked
 * (`effectiveLayoutMode`), the layout switcher is hidden, a stored quad never
 * forces fullscreen while docked, and dock ↔ undock keeps the same
 * `aos-terminal-session` elements (no remount, RB-01).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false, isConnecting: () => false, getProjectPath: vi.fn() },
}));
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

import type { TerminalSession } from '../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js';

interface SidebarInternals extends HTMLElement {
  isOpen: boolean;
  docked: boolean;
  sessions: TerminalSession[];
  allSessions: TerminalSession[];
  activeSessionId: string | null;
  isFullscreen: boolean;
  sidebarWidth: number;
  layoutMode: 'single' | 'split-2' | 'quad-4';
  effectiveLayoutMode: 'single' | 'split-2' | 'quad-4';
  paneSessionIds: (string | null)[];
  _isSplit: boolean;
  updateComplete: Promise<boolean>;
}

type Layout = { mode: 'single' | 'split-2' | 'quad-4'; paneSessions?: (string | null)[]; paneProjects?: (string | null)[] };

function tab(id: string, projectPath: string): TerminalSession {
  return { id, name: id, status: 'active', createdAt: new Date('2026-09-17T08:00:00Z'), projectPath, terminalType: 'claude-code', terminalSessionId: `cloud-${id}` };
}

const rootVar = (name: string): string => document.documentElement.style.getPropertyValue(name);
const panel = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.terminal-sidebar')!;
const resizer = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.sidebar-resizer')!;
const widthOf = (el: HTMLElement): string => panel(el).style.getPropertyValue('--sidebar-width');

/** Seeds the persisted layout the way `_persistLayout` writes it (mode, pane session ids, pane projects). */
function seedLayout(layout: Layout): void {
  localStorage.setItem('cloud-terminal-layout-mode', layout.mode);
  const count = layout.mode === 'quad-4' ? 4 : layout.mode === 'split-2' ? 2 : 0;
  const panes = (layout.paneSessions ?? []).slice(0, count);
  while (panes.length < count) panes.push(null);
  localStorage.setItem('cloud-terminal-pane-sessions', JSON.stringify(panes));
  const projects = (layout.paneProjects ?? []).slice(0, count);
  while (projects.length < count) projects.push(null);
  localStorage.setItem('cloud-terminal-pane-projects', JSON.stringify(projects));
}
const storedKeys = (): Record<string, string | null> => ({
  mode: localStorage.getItem('cloud-terminal-layout-mode'),
  panes: localStorage.getItem('cloud-terminal-pane-sessions'),
  projects: localStorage.getItem('cloud-terminal-pane-projects'),
  ratios: localStorage.getItem('cloud-terminal-split-ratios'),
});

async function sidebar(opts: { docked: boolean; width?: number; open?: boolean; fileTree?: string; layout?: Layout }): Promise<SidebarInternals> {
  localStorage.clear();
  if (opts.layout) seedLayout(opts.layout);
  window.innerWidth = opts.width ?? 1440;
  if (opts.fileTree) document.documentElement.style.setProperty('--file-tree-open-width', opts.fileTree);
  else document.documentElement.style.removeProperty('--file-tree-open-width');
  await import('../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js');
  const el = document.createElement('aos-cloud-terminal-sidebar') as SidebarInternals;
  const all = [tab('a1', '/a'), tab('b1', '/b')];
  el.allSessions = all;
  el.sessions = all.filter((s) => s.projectPath === '/a');
  el.activeSessionId = 'a1';
  el.docked = opts.docked;
  el.isOpen = opts.open ?? true;
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}
const container = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.terminal-sessions-container')!;
const panels = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>('aos-terminal-session'));
const panelIds = (el: HTMLElement): string[] => panels(el).map((p) => p.dataset.sessionId ?? '');
const visiblePanelIds = (el: HTMLElement): string[] => panels(el).filter((p) => p.style.display !== 'none').map((p) => p.dataset.sessionId ?? '');
const keydown = (init: KeyboardEventInit): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.removeProperty('--terminal-open-width');
});

describe('aos-cloud-terminal-sidebar docked (INT-2026-011)', () => {
  it('docked at 1440 px: width = half the window, class docked, resizer hidden, --terminal-open-width = that width (FA-01, FA-03)', async () => {
    const el = await sidebar({ docked: true });
    expect(widthOf(el)).toBe('720px');
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(panel(el).classList.contains('open')).toBe(true);
    expect(resizer(el).style.display).toBe('none');
    expect(rootVar('--terminal-open-width')).toBe('720px');
    // exactly one sidebar, the same tabs/actions as before (FA-03/FA-04)
    expect(document.querySelectorAll('aos-cloud-terminal-sidebar').length).toBe(1);
    expect(el.querySelector('.sidebar-header')).not.toBeNull();
    expect(el.querySelector('.new-session-btn')).not.toBeNull();
  });

  it('docked subtracts an open file tree: (1440 − 240) / 2 = 600 (plan review F5)', async () => {
    const el = await sidebar({ docked: true, fileTree: '240px' });
    expect(widthOf(el)).toBe('600px');
    expect(rootVar('--terminal-open-width')).toBe('600px');
    document.documentElement.style.removeProperty('--file-tree-open-width');
  });

  it('not docked: the dragged width (500 px), resizer visible, no docked class', async () => {
    const el = await sidebar({ docked: false });
    expect(widthOf(el)).toBe('500px');
    expect(el.sidebarWidth).toBe(500);
    expect(panel(el).classList.contains('docked')).toBe(false);
    expect(resizer(el).style.display).toBe('');
    expect(rootVar('--terminal-open-width')).toBe('500px');
  });

  it('docked below 1024 px falls back to the floating width; growing the window docks again — same instance, same tab (FA-07)', async () => {
    const el = await sidebar({ docked: true, width: 1000 });
    expect(panel(el).classList.contains('docked')).toBe(false);
    expect(widthOf(el)).toBe('500px');
    expect(resizer(el).style.display).toBe('');
    expect(rootVar('--terminal-open-width')).toBe('500px');
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await el.updateComplete;
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(widthOf(el)).toBe('720px');
    expect(rootVar('--terminal-open-width')).toBe('720px');
    expect(el.activeSessionId).toBe('a1');
    expect(document.querySelectorAll('aos-cloud-terminal-sidebar').length).toBe(1);
  });

  it('toggling docked on an open sidebar only changes the width and the offset (no remount)', async () => {
    const el = await sidebar({ docked: false });
    const before = panel(el);
    el.docked = true;
    await el.updateComplete;
    expect(panel(el)).toBe(before);
    expect(widthOf(el)).toBe('720px');
    expect(rootVar('--terminal-open-width')).toBe('720px');
    el.docked = false;
    await el.updateComplete;
    expect(widthOf(el)).toBe('500px');
    expect(rootVar('--terminal-open-width')).toBe('500px');
  });

  it('closed: no offset even when docked; fullscreen wins over docked (FA-04, FA-05)', async () => {
    const el = await sidebar({ docked: true, open: false });
    expect(rootVar('--terminal-open-width')).toBe('0px');
    el.isOpen = true;
    await el.updateComplete;
    expect(rootVar('--terminal-open-width')).toBe('720px');
    el.isFullscreen = true;
    await el.updateComplete;
    expect(widthOf(el)).toBe('1440px');
    expect(panel(el).classList.contains('docked')).toBe(false);
    expect(resizer(el).style.display).toBe('none');
    el.isFullscreen = false;
    await el.updateComplete;
    expect(widthOf(el)).toBe('720px');
    expect(panel(el).classList.contains('docked')).toBe(true);
  });
});

describe('aos-cloud-terminal-sidebar docked = one pane (INT-2026-013, AK-04)', () => {
  it('split-2 stored + docked: one pane, tab bar, no pane headers/splitters, container .single; b1 stays mounted but hidden', async () => {
    const el = await sidebar({ docked: true, layout: { mode: 'split-2', paneSessions: ['a1', 'b1'], paneProjects: ['/a', '/b'] } });
    expect(el.layoutMode).toBe('split-2');
    expect(el.effectiveLayoutMode).toBe('single');
    expect(el._isSplit).toBe(false);
    expect(container(el).classList.contains('single')).toBe(true);
    expect(container(el).classList.contains('split-2')).toBe(false);
    expect(el.querySelector('aos-terminal-tabs')).not.toBeNull();
    expect(el.querySelector('.pane-headers')).toBeNull();
    expect(el.querySelectorAll('.pane-splitter').length).toBe(0);
    expect(panelIds(el).sort()).toEqual(['a1', 'b1']);
    expect(visiblePanelIds(el)).toEqual(['a1']);
    expect(el.paneSessionIds).toEqual(['a1', 'b1']);
    expect(storedKeys().mode).toBe('split-2');
  });

  it('quad-4 stored + docked: no fullscreen; undocked and open → fullscreen quad with the stored panes; docked again → single; stored keys untouched', async () => {
    const el = await sidebar({ docked: true, layout: { mode: 'quad-4', paneSessions: ['a1', 'b1', null, null], paneProjects: ['/a', '/b', null, null] } });
    const before = storedKeys();
    expect(el.isFullscreen).toBe(false);
    expect(container(el).classList.contains('single')).toBe(true);
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(widthOf(el)).toBe('720px');
    el.docked = false;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.isFullscreen).toBe(true);
    expect(el.effectiveLayoutMode).toBe('quad-4');
    expect(container(el).classList.contains('quad-4')).toBe(true);
    expect(el.querySelector('.pane-headers')).not.toBeNull();
    expect(el.paneSessionIds).toEqual(['a1', 'b1', null, null]);
    expect(widthOf(el)).toBe('1440px');
    el.docked = true;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.isFullscreen).toBe(false);
    expect(container(el).classList.contains('single')).toBe(true);
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(rootVar('--terminal-open-width')).toBe('720px');
    expect(storedKeys()).toEqual(before);
  });

  it('docked: layout switcher hidden, Cmd+Shift+F = fullscreen single pane, Escape back to the column without downgrade or persistence', async () => {
    const el = await sidebar({ docked: true, layout: { mode: 'quad-4', paneSessions: ['a1', 'b1', null, null], paneProjects: ['/a', '/b', null, null] } });
    const before = storedKeys();
    expect(el.querySelector('.layout-switcher')).toBeNull();
    keydown({ key: 'F', metaKey: true, shiftKey: true });
    await el.updateComplete;
    expect(el.isFullscreen).toBe(true);
    expect(el.effectiveLayoutMode).toBe('single');
    expect(container(el).classList.contains('single')).toBe(true);
    expect(el.querySelector('.pane-headers')).toBeNull();
    expect(widthOf(el)).toBe('1440px');
    keydown({ key: 'Escape' });
    await el.updateComplete;
    expect(el.isFullscreen).toBe(false);
    expect(el.layoutMode).toBe('quad-4'); // no downgrade to split-2
    expect(container(el).classList.contains('single')).toBe(true);
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(storedKeys()).toEqual(before);
    // undocked, the switcher is back
    el.docked = false;
    await el.updateComplete;
    expect(el.querySelector('.layout-switcher')).not.toBeNull();
  });

  it('dock ↔ undock keeps the same aos-terminal-session elements and paneSessionIds (0 remounts, RB-01)', async () => {
    const el = await sidebar({ docked: false, layout: { mode: 'split-2', paneSessions: ['a1', 'b1'], paneProjects: ['/a', '/b'] } });
    expect(el._isSplit).toBe(true);
    const before = panels(el);
    expect(before.length).toBe(2);
    const panesBefore = [...el.paneSessionIds];
    el.docked = true;
    await el.updateComplete;
    await el.updateComplete;
    expect(el._isSplit).toBe(false);
    const docked = panels(el);
    expect(docked.length).toBe(2);
    expect(docked.every((p, i) => p === before[i])).toBe(true);
    expect(visiblePanelIds(el)).toEqual(['a1']);
    el.docked = false;
    await el.updateComplete;
    await el.updateComplete;
    expect(el._isSplit).toBe(true);
    const after = panels(el);
    expect(after.every((p, i) => p === before[i])).toBe(true);
    expect(el.paneSessionIds).toEqual(panesBefore);
    expect(visiblePanelIds(el).sort()).toEqual(['a1', 'b1']);
  });

  it('docking ends an active fullscreen', async () => {
    const el = await sidebar({ docked: false });
    el.isFullscreen = true;
    await el.updateComplete;
    expect(widthOf(el)).toBe('1440px');
    el.docked = true;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.isFullscreen).toBe(false);
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(widthOf(el)).toBe('720px');
    expect(rootVar('--terminal-open-width')).toBe('720px');
  });

  it('below 1024 px the stored split returns (floating); at 1024 px and up docked is single again, no fullscreen', async () => {
    const el = await sidebar({ docked: true, width: 1000, layout: { mode: 'split-2', paneSessions: ['a1', 'b1'], paneProjects: ['/a', '/b'] } });
    expect(panel(el).classList.contains('docked')).toBe(false);
    expect(el.effectiveLayoutMode).toBe('split-2');
    expect(container(el).classList.contains('split-2')).toBe(true);
    expect(el.querySelector('.pane-headers')).not.toBeNull();
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await el.updateComplete;
    await el.updateComplete;
    expect(panel(el).classList.contains('docked')).toBe(true);
    expect(el.effectiveLayoutMode).toBe('single');
    expect(container(el).classList.contains('single')).toBe(true);
    expect(el.isFullscreen).toBe(false);
    window.innerWidth = 1000;
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await el.updateComplete;
    await el.updateComplete;
    expect(panel(el).classList.contains('docked')).toBe(false);
    expect(container(el).classList.contains('split-2')).toBe(true);
  });

  it('no persistence while docked; after undock the pane restore resolves to a1/b1 and persists', async () => {
    const el = await sidebar({ docked: true, layout: { mode: 'split-2', paneSessions: ['old-a', 'old-b'], paneProjects: ['/a', '/b'] } });
    expect(el.paneSessionIds).toEqual(['old-a', 'old-b']);
    expect(storedKeys().panes).toBe(JSON.stringify(['old-a', 'old-b']));
    // updates while docked never write the layout
    el.activeSessionId = 'a1';
    el.allSessions = [...el.allSessions];
    await el.updateComplete;
    await el.updateComplete;
    expect(storedKeys().panes).toBe(JSON.stringify(['old-a', 'old-b']));
    expect(storedKeys().mode).toBe('split-2');
    el.docked = false;
    await el.updateComplete;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.paneSessionIds).toEqual(['a1', 'b1']);
    expect(storedKeys().panes).toBe(JSON.stringify(['a1', 'b1']));
    expect(storedKeys().mode).toBe('split-2');
  });
});

describe('aos-cloud-terminal-sidebar docked stacking (INT-2026-014, AK-01/AK-02)', () => {
  /** The sidebar injects one <style> into the document (light DOM); happy-dom does not cascade, so the rule text is the proof. */
  const sidebarCss = (): string => Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').find((t) => t.includes('.terminal-sidebar.docked')) ?? '';
  const rule = (css: string, selector: string): string => {
    const m = new RegExp(`(?:^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
    return m ? m[1].replace(/\s+/g, ' ') : '';
  };

  it('docked column stacks below the header (z-index 55 < 60) so the bell dropdown lies in front; floating/fullscreen keep 1000', async () => {
    await sidebar({ docked: true });
    const css = sidebarCss();
    expect(css).not.toBe('');
    expect(rule(css, '.terminal-sidebar.docked')).toMatch(/z-index:\s*55\b/);
    expect(rule(css, '.terminal-sidebar')).toMatch(/z-index:\s*1000\b/);
  });
});
