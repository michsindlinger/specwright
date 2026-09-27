// @vitest-environment happy-dom
/**
 * INT-2026-025 (FA-03, FA-04, FA-12, FA-18, FA-20, FA-22, FA-26, FA-29, D11
 * Review F18, Spec §4): the call box — states after the mock, buttons,
 * space bar held inside the box, plan confirmation, only-terminal messages,
 * another window, no focus theft while ringing, the ring tone differs from
 * the bell chime.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { anrufWelt, meldungFertig, meldungPlan, meldungRueckfrage, ruhe, state, verfuegbarkeitLokal, type AnrufWelt } from './anruf-fakes.js';
import type { AosAnruf } from '../../frontend/src/components/anruf/aos-anruf.js';
import type { AnrufMeldung } from '../../src/shared/types/anruf.protocol.js';

async function box(w: AnrufWelt): Promise<AosAnruf> {
  await import('../../frontend/src/components/anruf/aos-anruf.js');
  const el = document.createElement('aos-anruf');
  el.dienst = w.dienst;
  document.body.appendChild(el);
  w.gw.emit(verfuegbarkeitLokal);
  await ruhe();
  await el.updateComplete;
  return el;
}

async function zeige(el: AosAnruf): Promise<void> {
  await ruhe();
  await el.updateComplete;
}

function knoepfe(el: Element): string[] {
  return [...el.querySelectorAll('.anruf button')].map((b) => b.textContent?.trim() ?? '');
}

function knopf(el: Element, text: string): HTMLButtonElement {
  const b = [...el.querySelectorAll<HTMLButtonElement>('.anruf button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`Knopf ${text} fehlt: ${knoepfe(el).join(', ')}`);
  return b;
}

async function laeuft(w: AnrufWelt, el: AosAnruf, meldung: AnrufMeldung): Promise<void> {
  w.gw.emit(state({ zustand: 'laeuft', eigener: true, meldung }));
  await zeige(el);
}

async function sprichPerLeertaste(w: AnrufWelt, el: AosAnruf, text: string, meldungId: string): Promise<{ down: KeyboardEvent; up: KeyboardEvent }> {
  const kasten = el.querySelector('.anruf')!;
  const down = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
  kasten.dispatchEvent(down);
  await ruhe();
  w.mikro.letzter.liefere(1);
  const up = new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
  kasten.dispatchEvent(up);
  w.gw.emit({ type: 'anruf:erkannt', meldungId, text });
  await zeige(el);
  return { down, up };
}

describe('aos-anruf', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing at rest (Light DOM, no shadow root)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('.anruf')).toBeNull();
  });

  it('ringing (FA-03): kind, session, project, „noch 2 warten", Annehmen/Später/Ablehnen; own ring tone; no focus theft', async () => {
    const w = anrufWelt();
    const el = await box(w);
    const vorher = document.createElement('input');
    document.body.appendChild(vorher);
    vorher.focus();
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungRueckfrage, wartend: 2 }));
    await zeige(el);
    expect(el.querySelector('.anruf-art')?.textContent).toBe('Rückfrage');
    expect(el.querySelector('.anruf-kopf .anruf-sub')?.textContent).toBe('Specwright');
    expect(el.querySelector('.anruf-titel')?.textContent).toBe('Sitzung „plan-anruf“');
    expect(el.querySelector('.anruf-warten')?.textContent).toBe('noch 2 warten');
    expect(knoepfe(el)).toEqual(['Annehmen', 'Später', 'Ablehnen']);
    expect(document.activeElement).toBe(vorher);
    expect(w.klingeln.n).toBe(1);
    knopf(el, 'Annehmen').click();
    knopf(el, 'Später').click();
    knopf(el, 'Ablehnen').click();
    expect(w.gw.sent.filter((m) => m.type !== 'anruf:faehig').map((m) => m.type)).toEqual(['anruf:annehmen', 'anruf:spaeter', 'anruf:ablehnen']);
  });

  it('ring tone ≠ bell chime: three notes, different from the two-note chime (FA-03)', async () => {
    const toene: number[][] = [];
    let aktuell: number[] = [];
    class FakeCtx {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume(): Promise<void> {
        return Promise.resolve();
      }
      createOscillator() {
        const osc = { type: '', frequency: { value: 0 }, connect: (n: unknown) => n, start: () => aktuell.push(osc.frequency.value), stop: () => {} };
        return osc;
      }
      createGain() {
        const g = { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: (n: unknown) => n };
        return g;
      }
    }
    Object.defineProperty(window, 'AudioContext', { value: FakeCtx, configurable: true });
    const ton = await import('../../frontend/src/components/terminal/notification-sound.js');
    ton.playAnrufKlingeln();
    toene.push(aktuell);
    aktuell = [];
    ton.playAgentDoneChime(true);
    toene.push(aktuell);
    expect(toene[0]).toHaveLength(3);
    expect(toene[1]).toHaveLength(2);
    expect(toene[0]).not.toEqual(toene[1]);
  });

  it('background tab → system notification (FA-04)', async () => {
    const w = anrufWelt();
    await box(w);
    w.versteckt.v = true;
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungFertig }));
    expect(w.mitteilung.gezeigt).toEqual([{ titel: 'Anruf: Fertig', body: 'Sitzung „build-matching“ · Applai', tag: 'm-fertig' }]);
  });

  it('another window owns the call: hint, no buttons, nothing read', async () => {
    const w = anrufWelt();
    const el = await box(w);
    w.gw.emit(state({ zustand: 'laeuft', eigener: false, meldung: meldungFertig }));
    await zeige(el);
    expect(el.querySelector('.anruf-andere')?.textContent).toBe('Anruf läuft in einem anderen Fenster');
    expect(knoepfe(el)).toEqual([]);
    expect(w.sprache.gesprochen).toEqual([]);
  });

  it('reading (FA-13, FA-18): text with (gekürzt); Nochmal cancels and reads again; Rückfrage shows all options', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Ich habe das Matching umgebaut.');
    expect(el.querySelector('.anruf-gekuerzt')?.textContent).toBe('(gekürzt)');
    expect(knoepfe(el)).toEqual(['Nochmal', 'Sprechen', 'Auflegen']);
    const n = w.sprache.gesprochen.length;
    const c = w.sprache.cancels;
    knopf(el, 'Nochmal').click();
    expect(w.sprache.cancels).toBe(c + 1);
    expect(w.sprache.gesprochen.length).toBe(n * 2);

    const w2 = anrufWelt();
    const el2 = await box(w2);
    await laeuft(w2, el2, meldungRueckfrage);
    expect([...el2.querySelectorAll('.anruf-opt')].map((o) => o.textContent?.trim())).toEqual(['1Whisper large-v3', '2Whisper large-v3-turbo', '3Whisper small', 'oder eine eigene Antwort']);
  });

  it('space held inside the box records; keydown/keyup prevented so the focused button is not clicked (FA-29, Review F18)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    const sprechen = knopf(el, 'Sprechen');
    const klicks = vi.fn();
    sprechen.addEventListener('click', klicks);
    sprechen.focus();
    const { down, up } = await sprichPerLeertaste(w, el, 'Mach weiter', 'm-fertig');
    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
    expect(klicks).not.toHaveBeenCalled();
    expect(w.mikro.oeffnungen).toBe(1);
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.gw.ofType('anruf:erkennen')).toHaveLength(1);
    // focus followed into the next state (it was inside the box)
    expect(document.activeElement?.textContent?.trim()).toBe('Senden');
  });

  it('confirm (FA-20): „Wird gesendet als"; Senden, Verwerfen, Nochmal sprechen by button; „senden" by voice', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungRueckfrage);
    await sprichPerLeertaste(w, el, 'zwei', 'm-rf');
    expect(el.querySelector('.anruf-erkannt')?.textContent).toBe('„zwei“');
    expect(el.querySelector('.anruf-als')?.textContent).toBe('Wird gesendet als: Möglichkeit 2 — Whisper large-v3-turbo (Frage 1 von 2)');
    expect(knoepfe(el)).toEqual(['Weiter', 'Nochmal sprechen', 'Verwerfen', 'Auflegen']);
    knopf(el, 'Verwerfen').click();
    await zeige(el);
    expect(el.querySelector('.anruf-erkannt')).toBeNull();
    knopf(el, 'Sprechen').click();
    await ruhe();
    await zeige(el);
    expect(knoepfe(el)).toEqual(['Fertig']);
    w.mikro.letzter.liefere(1);
    knopf(el, 'Fertig').click();
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-rf', text: 'eins' });
    await zeige(el);
    knopf(el, 'Weiter').click();
    await zeige(el);
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Welche Stimme?');
    await sprichPerLeertaste(w, el, 'Anna', 'm-rf');
    expect(knoepfe(el)[0]).toBe('Senden');
    await sprichPerLeertaste(w, el, 'senden', 'm-rf');
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-rf', antwort: { art: 'rueckfrage', antworten: [{ nummern: [1] }, { nummern: [1] }] } }]);
  });

  it('plan (FA-22): „Freigeben …" asks; confirmation quotes the option; Nein goes back; Freigeben sends', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungPlan);
    knopf(el, 'Freigeben …').click();
    expect(w.gw.ofType('anruf:freigeben.anfragen')).toHaveLength(1);
    w.gw.emit(state({ zustand: 'freigabe_nachfrage', eigener: true, meldung: meldungPlan, freigabeWortlaut: 'Yes, and switch to BYPASS PERMISSIONS' }));
    await zeige(el);
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Plan für Sitzung „int-025-plan“ wirklich freigeben?');
    expect(el.querySelector('.anruf-als')?.textContent).toBe(
      'Freigabe wählt im Plan-Dialog „Yes, and switch to BYPASS PERMISSIONS“ — danach keine weiteren Rückfragen zu Berechtigungen in dieser Sitzung.'
    );
    expect(knoepfe(el)).toEqual(['Freigeben', 'Nein']);
    knopf(el, 'Nein').click();
    await zeige(el);
    expect(knoepfe(el)).toContain('Sprechen');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    knopf(el, 'Freigeben …').click();
    await zeige(el);
    // „ja, aber …" by voice is no yes
    await sprichPerLeertaste(w, el, 'ja, aber später', 'm-plan');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(knoepfe(el)).toEqual(['Freigeben', 'Nein']);
    knopf(el, 'Freigeben').click();
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-plan', antwort: { art: 'freigeben' } }]);
  });

  it('only on screen (AN-S11): only „Im Terminal öffnen" and Auflegen; opens via glocke-open', async () => {
    const w = anrufWelt();
    const el = await box(w);
    const nur: AnrufMeldung = { ...meldungRueckfrage, id: 'm-nur', nurBildschirm: true, sitzungName: 'build-x' };
    delete nur.fragen;
    delete nur.text;
    await laeuft(w, el, nur);
    expect(knoepfe(el)).toEqual(['Im Terminal öffnen', 'Auflegen']);
    expect(el.querySelector('.anruf-text')?.textContent).toBe('Rückfrage in Sitzung „build-x“ — die Frage steht nur im Terminal.');
    const seen: unknown[] = [];
    document.body.addEventListener('glocke-open', (e) => seen.push((e as CustomEvent).detail));
    knopf(el, 'Im Terminal öffnen').click();
    expect(seen).toEqual([{ sessionId: 'cloud-2', terminalSessionId: 'cloud-2' }]);
    // space does nothing here
    const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    el.querySelector('.anruf')!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(w.mikro.oeffnungen).toBe(0);
  });

  it('every button has a label and is focusable (FA-29)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    for (const m of [meldungFertig, meldungPlan, meldungRueckfrage]) {
      w.gw.emit(state({ zustand: 'klingelt', meldung: m }));
      await zeige(el);
      await laeuft(w, el, m);
      for (const b of el.querySelectorAll<HTMLButtonElement>('.anruf button')) {
        expect(b.textContent?.trim().length).toBeGreaterThan(0);
        expect(b.tabIndex).toBeGreaterThanOrEqual(0);
        expect(b.disabled).toBe(false);
        expect(b.getAttribute('type')).toBe('button');
      }
      w.gw.emit(state({ zustand: 'ruhe' }));
      await zeige(el);
    }
  });

  it('result: „✓ Gesendet"; failure reason and endeGrund shown (Spec §4)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
    w.gw.emit(state({ zustand: 'ruhe', wartend: 1 }));
    await zeige(el);
    expect(el.querySelector('.anruf-ergebnis.ok')?.textContent?.trim()).toBe('✓ Gesendet');
    expect(el.querySelector('.anruf-ergebnis-box .anruf-sub')?.textContent).toBe('nächster Anruf in Kürze · noch 1 wartet');

    const w2 = anrufWelt();
    const el2 = await box(w2);
    await laeuft(w2, el2, meldungFertig);
    w2.gw.emit(state({ zustand: 'ruhe', endeGrund: 'In der Sitzung schon beantwortet.' }));
    await zeige(el2);
    expect(el2.querySelector('.anruf-ergebnis.no')?.textContent?.trim()).toBe('Nicht gesendet: In der Sitzung schon beantwortet.');
  });

  it('microphone unplugged: announce, call ends without sending (Spec §4)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    knopf(el, 'Sprechen').click();
    await ruhe();
    w.mikro.letzter.endeVonAussen();
    await zeige(el);
    // the backend still says laeuft until it processed anruf:auflegen — the box already shows the reason
    expect(el.querySelector('.anruf-ergebnis')?.textContent?.trim()).toBe('Nicht gesendet: Mikrofon nicht verfügbar');
    w.gw.emit(state({ zustand: 'ruhe' }));
    await zeige(el);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(el.querySelector('.anruf-ergebnis')?.textContent?.trim()).toBe('Nicht gesendet: Mikrofon nicht verfügbar');
  });
});
