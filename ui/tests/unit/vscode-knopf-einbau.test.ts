// @vitest-environment happy-dom
/**
 * INT-2026-028 (AK-01): „In VS Code öffnen" sits in the tab of every running
 * session with a known folder (aos-terminal-tabs), in the session header of
 * the single view (aos-terminal-session) and in the split-pane header
 * (aos-cloud-terminal-sidebar, active session of the pane). A click on the
 * link in a tab must not switch the tab.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { gateway } from '../../frontend/src/gateway.js';
import type { TerminalSession } from '../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js';
import type { AosVscodeKnopf } from '../../frontend/src/components/terminal/aos-vscode-knopf.js';

function sitzung(id: string, effectiveCwd?: string): TerminalSession {
  return { id, name: id, status: 'active', createdAt: new Date(), projectPath: '/srv/app', effectiveCwd };
}

async function ruhe(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

/** Delivers `settings.editor` to every handler the (mocked) gateway got. */
function hostGeladen(remoteSshHost: string): void {
  const on = vi.mocked(gateway.on);
  for (const [type, handler] of on.mock.calls) {
    if (type === 'settings.editor') handler({ type: 'settings.editor', config: { remoteSshHost } });
  }
}

function quelltext(datei: string): string {
  return readFileSync(resolve(__dirname, '../../frontend/src/components/terminal', datei), 'utf8');
}

describe('aos-vscode-knopf einbau', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('aos-terminal-tabs: one button per tab with a folder, none without; click does not select the tab', async () => {
    await import('../../frontend/src/components/terminal/aos-terminal-tabs.js');
    const tabs = document.createElement('aos-terminal-tabs');
    tabs.sessions = [sitzung('a', '/srv/app-worktrees/a'), sitzung('b')];
    tabs.activeSessionId = 'a';
    document.body.appendChild(tabs);
    await tabs.updateComplete;
    hostGeladen('');
    await ruhe();

    const knoepfe = Array.from(tabs.querySelectorAll<AosVscodeKnopf>('.tab aos-vscode-knopf.tab-vscode'));
    expect(knoepfe).toHaveLength(2);
    await Promise.all(knoepfe.map((k) => k.updateComplete));
    const links = knoepfe.map((k) => k.shadowRoot!.querySelector('a'));
    expect(links[0]?.getAttribute('href')).toBe('vscode://file/srv/app-worktrees/a');
    expect(links[1]).toBeNull();
    expect(knoepfe[1].hidden).toBe(true);

    const select = vi.fn();
    tabs.addEventListener('session-select', select);
    links[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    expect(select).not.toHaveBeenCalled();
    (tabs.querySelector('.tab') as HTMLElement).click();
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('aos-terminal-session: button in .session-header, after .session-info', () => {
    const src = quelltext('aos-terminal-session.ts');
    expect(src).toContain("import './aos-vscode-knopf.js';");
    const header = src.slice(src.indexOf('<div class="session-header">'), src.indexOf('${showModelOverlay'));
    expect(header).toContain('<aos-vscode-knopf .session=${this.session}></aos-vscode-knopf>');
    expect(header.indexOf('<aos-vscode-knopf')).toBeGreaterThan(header.indexOf('class="session-info"'));
  });

  it('aos-cloud-terminal-sidebar: button in .pane-header-row for the active session, before the new-session button', () => {
    const src = quelltext('aos-cloud-terminal-sidebar.ts');
    expect(src).toContain("import './aos-vscode-knopf.js';");
    const row = src.slice(src.indexOf('<div class="pane-header-row">'), src.indexOf('<div class="pane-header-tabs">'));
    expect(row).toContain('<aos-vscode-knopf .session=${activeSession}></aos-vscode-knopf>');
    expect(row.indexOf('<aos-vscode-knopf')).toBeLessThan(row.indexOf('class="pane-new-btn"'));
  });
});
