// @vitest-environment happy-dom
/**
 * INT-2026-028 (AK-01, AK-05): aos-vscode-knopf — no link before the host
 * setting is loaded, no link without a folder, the link appears as soon as a
 * new session object brings `effectiveCwd`, follows the host, and a click does
 * not bubble past the element (the tab must not switch).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { FakeGateway } from './anruf-fakes.js';
import { EditorLinkService } from '../../frontend/src/services/editor-link.service.js';
import type { AosVscodeKnopf } from '../../frontend/src/components/terminal/aos-vscode-knopf.js';

type Sitzung = AosVscodeKnopf['session'];

async function knopf(session: Sitzung, gw = new FakeGateway()) {
  await import('../../frontend/src/components/terminal/aos-vscode-knopf.js');
  const quelle = new EditorLinkService(gw);
  const el = document.createElement('aos-vscode-knopf');
  el.quelle = quelle;
  el.session = session;
  document.body.appendChild(el);
  await el.updateComplete;
  return { el, gw, quelle };
}

const link = (el: AosVscodeKnopf) => el.shadowRoot!.querySelector('a');

describe('aos-vscode-knopf', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('asks for the host setting and shows nothing until it is loaded', async () => {
    const { el, gw } = await knopf({ status: 'active', effectiveCwd: '/srv/app' });
    expect(gw.ofType('settings.editor.get')).toHaveLength(1);
    expect(link(el)).toBeNull();
    expect(el.hidden).toBe(true);
  });

  it('local link once the host setting is loaded (empty host)', async () => {
    const { el, gw } = await knopf({ status: 'active', effectiveCwd: '/srv/my app' });
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await el.updateComplete;
    expect(el.hidden).toBe(false);
    const a = link(el)!;
    expect(a.getAttribute('href')).toBe('vscode://file/srv/my%20app');
    expect(a.getAttribute('title')).toBe('In VS Code öffnen');
    expect(a.getAttribute('aria-label')).toBe('In VS Code öffnen');
  });

  it('no link without a folder; a new session object with effectiveCwd brings it (AK-05)', async () => {
    const { el, gw } = await knopf({ status: 'active' });
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await el.updateComplete;
    expect(link(el)).toBeNull();
    expect(el.hidden).toBe(true);
    el.session = { status: 'active', effectiveCwd: '/srv/app' };
    await el.updateComplete;
    expect(link(el)?.getAttribute('href')).toBe('vscode://file/srv/app');
    expect(el.hidden).toBe(false);
  });

  it('href follows the host setting', async () => {
    const { el, gw } = await knopf({ status: 'paused', effectiveCwd: '/srv/app' });
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await el.updateComplete;
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: 'devbox' } });
    await el.updateComplete;
    expect(link(el)?.getAttribute('href')).toBe('vscode://vscode-remote/ssh-remote+devbox/srv/app');
  });

  it('no link for a disconnected session', async () => {
    const { el, gw } = await knopf({ status: 'disconnected', effectiveCwd: '/srv/app' });
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await el.updateComplete;
    expect(link(el)).toBeNull();
  });

  it('a click on the link does not bubble past the element', async () => {
    const { el, gw } = await knopf({ status: 'active', effectiveCwd: '/srv/app' });
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await el.updateComplete;
    const parent = vi.fn();
    document.body.addEventListener('click', parent);
    link(el)!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    expect(parent).not.toHaveBeenCalled();
    document.body.removeEventListener('click', parent);
  });

  it('stops listening when removed', async () => {
    const { el, gw } = await knopf({ status: 'active', effectiveCwd: '/srv/app' });
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await el.updateComplete;
    el.remove();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: 'devbox' } });
    await el.updateComplete;
    expect(link(el)?.getAttribute('href')).toBe('vscode://file/srv/app');
  });
});
