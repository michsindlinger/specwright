// @vitest-environment happy-dom
/**
 * INT-2026-028 (AK-04): „Remote-SSH-Host für VS Code" in Einstellungen ›
 * Allgemein — loads the value, saves trimmed, refuses invalid input locally,
 * clears with '', shows the hint for an unreadable stored file and the
 * backend's rejection. Mounted in both branches of renderGeneralSection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { FakeGateway } from './anruf-fakes.js';
import { EditorLinkService } from '../../frontend/src/services/editor-link.service.js';
import {
  EDITOR_HOST_UNGUELTIG,
  EDITOR_LESEFEHLER,
  type AosEditorEinstellung,
} from '../../frontend/src/components/settings/aos-editor-einstellung.js';

async function feld() {
  await import('../../frontend/src/components/settings/aos-editor-einstellung.js');
  const gw = new FakeGateway();
  const el = document.createElement('aos-editor-einstellung');
  el.quelle = new EditorLinkService(gw);
  document.body.appendChild(el);
  await el.updateComplete;
  return { el, gw };
}

async function zeige(el: AosEditorEinstellung) {
  await el.updateComplete;
}

const input = (el: Element) => el.querySelector<HTMLInputElement>('#editor-remote-host-input')!;
const speichern = (el: Element) => el.querySelector<HTMLButtonElement>('.editor-speichern')!;
const leeren = (el: Element) => el.querySelector<HTMLButtonElement>('.editor-leeren')!;

function tippe(el: Element, wert: string) {
  const i = input(el);
  i.value = wert;
  i.dispatchEvent(new Event('input'));
}

describe('aos-editor-einstellung', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is mounted in both branches of the settings section „Allgemein"', () => {
    const src = readFileSync(resolve(__dirname, '../../frontend/src/views/settings-view.ts'), 'utf8');
    expect(src).toContain("import '../components/settings/aos-editor-einstellung.js';");
    const general = src.slice(src.indexOf('private renderGeneralSection()'), src.indexOf('private renderModelsSection()'));
    expect(general).toContain('<aos-editor-einstellung></aos-editor-einstellung>');
    // the shared snippet is used in the loading branch and in the loaded branch
    expect(general.match(/\$\{anrufSchalter\}/g)).toHaveLength(2);
    expect(general.indexOf('<aos-editor-einstellung>')).toBeLessThan(general.indexOf('if (!this.generalConfig)'));
  });

  it('Light DOM, labelled field; locked until the value is loaded, then shows it', async () => {
    const { el, gw } = await feld();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('label[for="editor-remote-host-input"]')?.textContent).toBe('Remote-SSH-Host für VS Code');
    expect(gw.ofType('settings.editor.get')).toHaveLength(1);
    expect(input(el).disabled).toBe(true);
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: 'devbox' } });
    await zeige(el);
    expect(input(el).disabled).toBe(false);
    expect(input(el).value).toBe('devbox');
    expect(speichern(el).disabled).toBe(true);
  });

  it('save sends the trimmed value', async () => {
    const { el, gw } = await feld();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await zeige(el);
    tippe(el, '  me@devbox.example ');
    await zeige(el);
    speichern(el).click();
    expect(gw.ofType('settings.editor.update')).toEqual([{ type: 'settings.editor.update', remoteSshHost: 'me@devbox.example' }]);
  });

  it('invalid input sends nothing and shows the error', async () => {
    const { el, gw } = await feld();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await zeige(el);
    tippe(el, 'devbox:22');
    await zeige(el);
    speichern(el).click();
    await zeige(el);
    expect(gw.ofType('settings.editor.update')).toEqual([]);
    expect(el.querySelector('.editor-fehler')?.textContent).toBe(EDITOR_HOST_UNGUELTIG);
  });

  it('clear sends an empty host', async () => {
    const { el, gw } = await feld();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: 'devbox' } });
    await zeige(el);
    leeren(el).click();
    expect(gw.ofType('settings.editor.update')).toEqual([{ type: 'settings.editor.update', remoteSshHost: '' }]);
  });

  it('unreadable stored file: shows the hint', async () => {
    const { el, gw } = await feld();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '', lesefehler: true } });
    await zeige(el);
    expect(el.querySelector('.editor-lesefehler')?.textContent).toBe(EDITOR_LESEFEHLER);
  });

  it('backend rejection is shown', async () => {
    const { el, gw } = await feld();
    gw.emit({ type: 'settings.editor', config: { remoteSshHost: '' } });
    await zeige(el);
    tippe(el, 'devbox');
    await zeige(el);
    speichern(el).click();
    gw.emit({ type: 'settings.error', error: 'Ungültiger Remote-SSH-Host.' });
    await zeige(el);
    expect(el.querySelector('.editor-fehler')?.textContent).toBe('Ungültiger Remote-SSH-Host.');
    expect(input(el).disabled).toBe(false);
  });
});
