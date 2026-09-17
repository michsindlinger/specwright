// @vitest-environment happy-dom

/**
 * INT-2026-011 (FA-01, FA-03, FA-04, FA-07): `docked` turns the same sidebar
 * instance into the right column of the Vorhaben page — half the content width
 * (window minus file tree), class `docked` (top = header, no shadow), no
 * resizer, `--terminal-open-width` = that width so the page yields. Below
 * 1024 px it falls back to the floating sidebar; fullscreen wins over docked.
 * The terminal panels are stubbed as in the solo test — this is about geometry.
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
  updateComplete: Promise<boolean>;
}

function tab(id: string, projectPath: string): TerminalSession {
  return { id, name: id, status: 'active', createdAt: new Date('2026-09-17T08:00:00Z'), projectPath, terminalType: 'claude-code', terminalSessionId: `cloud-${id}` };
}

const rootVar = (name: string): string => document.documentElement.style.getPropertyValue(name);
const panel = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.terminal-sidebar')!;
const resizer = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.sidebar-resizer')!;
const widthOf = (el: HTMLElement): string => panel(el).style.getPropertyValue('--sidebar-width');

async function sidebar(opts: { docked: boolean; width?: number; open?: boolean; fileTree?: string }): Promise<SidebarInternals> {
  localStorage.clear();
  window.innerWidth = opts.width ?? 1440;
  if (opts.fileTree) document.documentElement.style.setProperty('--file-tree-open-width', opts.fileTree);
  else document.documentElement.style.removeProperty('--file-tree-open-width');
  await import('../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js');
  const el = document.createElement('aos-cloud-terminal-sidebar') as SidebarInternals;
  const all = [tab('a1', '/a')];
  el.allSessions = all;
  el.sessions = all;
  el.activeSessionId = 'a1';
  el.docked = opts.docked;
  el.isOpen = opts.open ?? true;
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

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
