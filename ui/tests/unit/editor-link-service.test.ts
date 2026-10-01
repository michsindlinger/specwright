/**
 * INT-2026-028 (AK-04): editor-link.service — loads the Remote-SSH host once
 * via `settings.editor.get`, again after every reconnect, sets it from
 * `settings.editor` and notifies subscribers.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { FakeGateway } from './anruf-fakes.js';
import { EditorLinkService } from '../../frontend/src/services/editor-link.service.js';

describe('EditorLinkService', () => {
  it('unknown until loaded; ensureLoaded asks exactly once', () => {
    const gw = new FakeGateway();
    const svc = new EditorLinkService(gw);
    expect(svc.get()).toBeNull();
    svc.ensureLoaded();
    svc.ensureLoaded();
    expect(gw.ofType('settings.editor.get')).toHaveLength(1);
  });

  it('asks again after every reconnect', () => {
    const gw = new FakeGateway();
    const svc = new EditorLinkService(gw);
    svc.ensureLoaded();
    gw.emit({ type: 'gateway.connected' });
    gw.emit({ type: 'gateway.connected' });
    expect(gw.ofType('settings.editor.get')).toHaveLength(3);
  });

  it('settings.editor sets the value and notifies subscribers', () => {
    const gw = new FakeGateway();
    const svc = new EditorLinkService(gw);
    const seen: unknown[] = [];
    const ab = svc.subscribe((c) => seen.push(c));
    svc.ensureLoaded();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: 'devbox' } });
    expect(svc.get()).toEqual({ remoteSshHost: 'devbox' });
    expect(seen).toEqual([{ remoteSshHost: 'devbox' }]);
    ab();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    expect(seen).toHaveLength(1);
    expect(svc.get()).toEqual({ remoteSshHost: '' });
  });

  it('ignores malformed answers', () => {
    const gw = new FakeGateway();
    const svc = new EditorLinkService(gw);
    svc.ensureLoaded();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: 5 } });
    gw.emit({ type: 'settings.editor' });
    expect(svc.get()).toBeNull();
  });

  it('update sends settings.editor.update with the host', () => {
    const gw = new FakeGateway();
    const svc = new EditorLinkService(gw);
    svc.update('devbox');
    expect(gw.ofType('settings.editor.update')).toEqual([{ type: 'settings.editor.update', remoteSshHost: 'devbox' }]);
  });

  it('settings.error after an update is its rejection; other settings errors are not', () => {
    const gw = new FakeGateway();
    const svc = new EditorLinkService(gw);
    svc.ensureLoaded();
    gw.emit({ type: 'settings.error', error: 'fremd' });
    expect(svc.getFehler()).toBeNull();
    svc.update('devbox');
    gw.emit({ type: 'settings.error', error: 'Ungültiger Remote-SSH-Host.' });
    expect(svc.getFehler()).toBe('Ungültiger Remote-SSH-Host.');
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    expect(svc.getFehler()).toBeNull();
  });
});
