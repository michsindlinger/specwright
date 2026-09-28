// @vitest-environment happy-dom
/**
 * INT-2026-025 (FA-01, FA-28, AK-18): the „Anrufmodus" switch on top of the
 * settings section „Allgemein" — locked with reason and next step when the
 * backend, this browser, the microphone or the voice are missing; turning it
 * on asks for the microphone once and sends `anruf:modus.set`; turning off
 * always works. Mounted by aos-settings-view in „Allgemein".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { anrufWelt, ruhe, state, type AnrufWelt } from './anruf-fakes.js';
import type { AosAnrufSchalter } from '../../frontend/src/components/anruf/aos-anruf-schalter.js';
import { ANRUF_NICHT_VERFUEGBAR_TEXT } from '../../src/shared/types/anruf.protocol.js';

async function schalter(w: AnrufWelt): Promise<AosAnrufSchalter> {
  await import('../../frontend/src/components/anruf/aos-anruf-schalter.js');
  const el = document.createElement('aos-anruf-schalter');
  el.dienst = w.dienst;
  document.body.appendChild(el);
  await ruhe();
  await el.updateComplete;
  return el;
}

async function zeige(el: AosAnrufSchalter): Promise<void> {
  await ruhe();
  await el.updateComplete;
}

const knopf = (el: Element): HTMLButtonElement => el.querySelector<HTMLButtonElement>('.anruf-schalter-knopf')!;
const grund = (el: Element): string | undefined => el.querySelector('.anruf-schalter-grund')?.textContent?.trim();

describe('aos-anruf-schalter (Einstellungen › Allgemein)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is part of the settings section „Allgemein"', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/views/settings-view.ts'), 'utf8');
    const general = src.slice(src.indexOf('private renderGeneralSection()'), src.indexOf('private renderModelsSection()'));
    expect(general).toContain('<aos-anruf-schalter></aos-anruf-schalter>');
  });

  it('labelled switch with the sentence; locked until the availability is known', async () => {
    const w = anrufWelt();
    const el = await schalter(w);
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('#anruf-schalter-label')?.textContent).toBe('Anrufmodus');
    expect(knopf(el).getAttribute('role')).toBe('switch');
    expect(knopf(el).getAttribute('aria-checked')).toBe('false');
    expect(el.querySelector('.anruf-schalter-satz')?.textContent).toContain('Sitzungen rufen an, wenn sie dich brauchen oder fertig sind.');
    expect(knopf(el).disabled).toBe(true);
    expect(grund(el)).toBe('Verfügbarkeit wird geprüft …');
  });

  it('other device (not local): locked with the reason; the bell is unaffected', async () => {
    const w = anrufWelt();
    const el = await schalter(w);
    w.gw.emit({ type: 'anruf:verfuegbarkeit', an: false, verfuegbarkeit: { verfuegbar: true }, lokal: false });
    await zeige(el);
    expect(knopf(el).disabled).toBe(true);
    expect(grund(el)).toBe(ANRUF_NICHT_VERFUEGBAR_TEXT.nicht_lokal);
    expect(w.gw.ofType('anruf:faehig')).toEqual([]);
  });

  it('backend reason (model missing) with the next step', async () => {
    const w = anrufWelt();
    const el = await schalter(w);
    w.gw.emit({ type: 'anruf:verfuegbarkeit', an: false, verfuegbarkeit: { verfuegbar: false, grund: 'modell_fehlt', text: ANRUF_NICHT_VERFUEGBAR_TEXT.modell_fehlt }, lokal: true });
    await zeige(el);
    expect(knopf(el).disabled).toBe(true);
    expect(grund(el)).toBe(ANRUF_NICHT_VERFUEGBAR_TEXT.modell_fehlt);
  });

  it('microphone denied / no local voice: locked with the client reason', async () => {
    const w = anrufWelt();
    w.mikro.erlaubnisWert = 'denied';
    const el = await schalter(w);
    w.gw.emit({ type: 'anruf:verfuegbarkeit', an: false, verfuegbarkeit: { verfuegbar: true }, lokal: true });
    await zeige(el);
    expect(knopf(el).disabled).toBe(true);
    expect(grund(el)).toMatch(/Mikrofon nicht freigegeben/);

    const w2 = anrufWelt();
    w2.sprache.voices = [{ name: 'Samantha', lang: 'en-US', localService: true }];
    const el2 = await schalter(w2);
    w2.gw.emit({ type: 'anruf:verfuegbarkeit', an: false, verfuegbarkeit: { verfuegbar: true }, lokal: true });
    await zeige(el2);
    expect(knopf(el2).disabled).toBe(true);
    expect(grund(el2)).toMatch(/keine lokale deutsche Stimme/);
  });

  it('available: click switches on (modus.set), state from the backend flips it; off always possible', async () => {
    const w = anrufWelt();
    const el = await schalter(w);
    w.gw.emit({ type: 'anruf:verfuegbarkeit', an: false, verfuegbarkeit: { verfuegbar: true }, lokal: true });
    await zeige(el);
    expect(knopf(el).disabled).toBe(false);
    expect(grund(el)).toBeUndefined();
    knopf(el).click();
    await zeige(el);
    expect(w.gw.ofType('anruf:modus.set')).toEqual([{ type: 'anruf:modus.set', an: true }]);
    w.gw.emit(state({ an: true }));
    await zeige(el);
    expect(knopf(el).getAttribute('aria-checked')).toBe('true');
    expect(knopf(el).classList.contains('an')).toBe(true);
    // microphone revoked while on: reason shown, switching off still possible
    w.mikro.aendere('denied');
    await zeige(el);
    expect(grund(el)).toMatch(/Mikrofon nicht freigegeben/);
    expect(knopf(el).disabled).toBe(false);
    knopf(el).click();
    await zeige(el);
    expect(w.gw.ofType('anruf:modus.set').at(-1)).toEqual({ type: 'anruf:modus.set', an: false });
  });
});
