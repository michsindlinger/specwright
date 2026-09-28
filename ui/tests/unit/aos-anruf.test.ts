// @vitest-environment happy-dom
/**
 * INT-2026-025 (FA-03, FA-04, FA-12, FA-22, FA-26, D11, Spec §4) and
 * INT-2026-026 (FA-19, FA-20, FA-21, AN-S04, Mock anruf-freihaendig-mock):
 * the call box — ringing, reading, listening with the text so far and the
 * closing-phrase hint, microphone closed with „Zuhören", plan confirmation,
 * only-terminal messages, another window, no space bar, no focus theft while
 * ringing, the ring tone differs from the bell chime.
 * INT-2026-027: the open line after „Gesendet" (AK-01, AK-10).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));

import { anrufWelt, leitungFertig, meldungFertig, meldungPlan, meldungRueckfrage, ruhe, state, verfuegbarkeitLokal, type AnrufWelt } from './anruf-fakes.js';
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

/** Reading ends → the box listens. */
async function hoert(w: AnrufWelt, el: AosAnruf): Promise<void> {
  w.sprache.fertig();
  await zeige(el);
  w.mikro.letzter.stille(0.3);
}

/** One spoken piece with its recognised text. */
async function sage(w: AnrufWelt, el: AosAnruf, text: string, meldungId: string, erkennen = true): Promise<number> {
  w.mikro.letzter.sprich(1);
  const nr = w.gw.ofType('anruf:erkennen').at(-1)!.abschnitt as number;
  if (erkennen) w.gw.emit({ type: 'anruf:erkannt', meldungId, abschnitt: nr, text });
  await zeige(el);
  return nr;
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

  it('reading (FA-02): text with (gekürzt), microphone off; Nochmal, Im Terminal öffnen, Auflegen; Rückfrage shows all options', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Ich habe das Matching umgebaut.');
    expect(el.querySelector('.anruf-gekuerzt')?.textContent).toBe('(gekürzt)');
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('liest vor … danach hört der Anruf zu');
    expect(knoepfe(el)).toEqual(['Nochmal', 'Im Terminal öffnen', 'Auflegen']);
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

  it('listening, nothing said (FA-19): „Ich höre zu", hint with 20 s, Senden disabled; no space bar (AN-S04)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    await hoert(w, el);
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('Ich höre zu');
    expect(el.querySelector('.anruf-punkt.puls')).not.toBeNull();
    expect(el.querySelector('.anruf-vorlesen')?.textContent).toContain('Ich habe das Matching umgebaut.');
    expect(el.querySelector('.anruf-schluss')?.textContent).toBe('Zum Senden: „Antwort senden“ · 20 s Stille legen auf');
    expect(knoepfe(el)).toEqual(['Senden', 'Nochmal', 'Im Terminal öffnen', 'Auflegen']);
    expect(knopf(el, 'Senden').disabled).toBe(true);
    const down = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
    el.querySelector('.anruf')!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(w.mikro.oeffnungen).toBe(1);
  });

  it('listening with text (FA-19, AK-08): text so far, „… wird erkannt", „Wird gesendet als"; Senden sends, Verwerfen clears (FA-20)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    await hoert(w, el);
    await sage(w, el, 'Mach bitte noch die Tests.', 'm-fertig');
    const nr = await sage(w, el, '', 'm-fertig', false);
    expect(el.querySelector('.anruf-diktat')?.textContent?.trim()).toBe('Mach bitte noch die Tests. … wird erkannt');
    expect(el.querySelector('.anruf-als')?.textContent).toBe('Wird gesendet als: Neue Eingabe an Sitzung „build-matching“');
    expect(el.querySelector('.anruf-schluss')?.textContent).toBe('Zum Senden: „Antwort senden“');
    expect(knoepfe(el)).toEqual(['Senden', 'Verwerfen', 'Nochmal', 'Im Terminal öffnen', 'Auflegen']);
    expect(knopf(el, 'Senden').className).toBe('pri');
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', abschnitt: nr, text: 'Und den PR.' });
    await zeige(el);
    knopf(el, 'Verwerfen').click();
    await zeige(el);
    expect(el.querySelector('.anruf-diktat')).toBeNull();
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('Ich höre zu');
    await sage(w, el, 'Neu.', 'm-fertig');
    knopf(el, 'Senden').click();
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-fertig', antwort: { art: 'text', text: 'Neu.' } }]);
  });

  it('„senden" without „Antwort": the hint replaces the closing-phrase line (FA-07)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    await hoert(w, el);
    await sage(w, el, 'Mach den PR auf und dann senden', 'm-fertig');
    expect(el.querySelector('.anruf-hinweis')?.textContent).toBe('Zum Senden: „Antwort senden“');
    expect(el.querySelector('.anruf-schluss')).toBeNull();
  });

  it('Rückfrage listening: question block, „Weiter", phrase leads to the next question (AK-07)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungRueckfrage);
    await hoert(w, el);
    await sage(w, el, 'Die zweite.', 'm-rf');
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Frage 1 von 2');
    expect(el.querySelector('.anruf-als')?.textContent).toBe('Wird gesendet als: Möglichkeit 2 — Whisper large-v3-turbo (Frage 1 von 2)');
    expect(el.querySelector('.anruf-schluss')?.textContent).toBe('„Antwort senden“ führt zur nächsten Frage — gesendet wird nach der letzten');
    expect(knoepfe(el)[0]).toBe('Weiter');
    knopf(el, 'Weiter').click();
    await zeige(el);
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Welche Stimme?');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('plan (FA-14): listening hint, „Freigeben …" asks; confirmation listens for ja/nein; Nein goes back; Freigeben sends', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungPlan);
    await hoert(w, el);
    expect(el.querySelector('.anruf-schluss')?.textContent).toBe('„freigeben“ gibt frei (mit Nachfrage) · ein Wunsch mit „Antwort senden“ geht als Überarbeitung');
    expect(knoepfe(el)).toEqual(['Senden', 'Nochmal', 'Freigeben …', 'Im Terminal öffnen', 'Auflegen']);
    knopf(el, 'Freigeben …').click();
    expect(w.gw.ofType('anruf:freigeben.anfragen')).toHaveLength(1);
    w.gw.emit(state({ zustand: 'freigabe_nachfrage', eigener: true, meldung: meldungPlan, freigabeWortlaut: 'Yes, and switch to BYPASS PERMISSIONS' }));
    await zeige(el);
    expect(el.querySelector('.anruf-text')?.textContent).toContain('Plan für Sitzung „int-025-plan“ wirklich freigeben?');
    expect(el.querySelector('.anruf-als')?.textContent).toBe(
      'Freigabe wählt im Plan-Dialog „Yes, and switch to BYPASS PERMISSIONS“ — danach keine weiteren Rückfragen zu Berechtigungen in dieser Sitzung.'
    );
    expect(knoepfe(el)).toEqual(['Freigeben', 'Nein', 'Auflegen']);
    await hoert(w, el);
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('„ja“ oder „nein“');
    expect(knoepfe(el)).toEqual(['Freigeben', 'Nein', 'Auflegen']);
    knopf(el, 'Nein').click();
    await zeige(el);
    expect(knoepfe(el)).toContain('Freigeben …');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    knopf(el, 'Freigeben …').click();
    await zeige(el);
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
    w.sprache.fertig();
    await zeige(el);
    expect(w.mikro.oeffnungen).toBe(0);
  });

  it('every button has a label and is focusable, reading and listening (FA-20)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    for (const m of [meldungFertig, meldungPlan, meldungRueckfrage]) {
      w.gw.emit(state({ zustand: 'klingelt', meldung: m }));
      await zeige(el);
      await laeuft(w, el, m);
      for (const phase of ['vorlesen', 'zuhoeren']) {
        if (phase === 'zuhoeren') await hoert(w, el);
        expect(el.querySelector('.anruf')?.className).toContain(`anruf-phase-${phase}`);
        for (const b of el.querySelectorAll<HTMLButtonElement>('.anruf button')) {
          expect(b.textContent?.trim().length).toBeGreaterThan(0);
          expect(b.tabIndex).toBeGreaterThanOrEqual(0);
          expect(b.disabled).toBe(b.textContent?.trim() === 'Senden' || b.textContent?.trim() === 'Weiter');
          expect(b.getAttribute('type')).toBe('button');
        }
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

  it('„Keine Antwort, aufgelegt": no „Nicht gesendet" prefix, message stays in the bell (FA-09, Mock i)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    await hoert(w, el);
    w.mikro.letzter.stille(20);
    await zeige(el);
    expect(el.querySelector('.anruf-ergebnis.no')?.textContent?.trim()).toBe('Keine Antwort, aufgelegt');
    expect(el.querySelector('.anruf-ergebnis-box .anruf-sub')?.textContent).toBe('Meldung bleibt in der Glocke');
  });

  it('microphone unplugged (FA-21): reason, „Zuhören", the call stays; Zuhören opens again; focus follows inside the box', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    await hoert(w, el);
    await sage(w, el, 'Mach die Tests.', 'm-fertig');
    knopf(el, 'Nochmal').focus();
    w.mikro.letzter.endeVonAussen();
    await zeige(el);
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('Mikrofon nicht verfügbar');
    expect(el.querySelector('.anruf-diktat')?.textContent?.trim()).toBe('Mach die Tests.');
    expect(knoepfe(el)).toEqual(['Zuhören', 'Senden', 'Verwerfen', 'Im Terminal öffnen', 'Auflegen']);
    expect(document.activeElement?.textContent?.trim()).toBe('Zuhören');
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    knopf(el, 'Zuhören').click();
    await zeige(el);
    expect(w.mikro.oeffnungen).toBe(2);
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('Ich höre zu');
  });

  it('open line (INT-2026-027, AK-01): „Leitung offen — wartet auf …", project, microphone off, „Gesendet", only „Auflegen"', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
    w.gw.emit(state({ zustand: 'offen', eigener: true, wartend: 1, leitung: leitungFertig }));
    await zeige(el);
    expect(el.querySelector('.anruf')?.className).toContain('anruf-phase-leitung');
    expect(el.querySelector('.anruf-titel')?.textContent).toBe('Leitung offen — wartet auf „build-matching“ …');
    expect(el.querySelector('.anruf-sub')?.textContent).toBe('Specwright');
    expect(el.querySelector('.anruf-leitung-ergebnis')?.textContent?.trim()).toBe('✓ Gesendet');
    expect(el.querySelector('.anruf-hoeren')?.textContent).toContain('Mikrofon aus');
    expect(el.querySelector('.anruf-punkt.puls')).toBeNull();
    expect(el.querySelector('.anruf-warten')?.textContent).toBe('noch 1 wartet');
    expect(knoepfe(el)).toEqual(['Auflegen']);
    const b = knopf(el, 'Auflegen');
    expect(b.getAttribute('type')).toBe('button');
    expect(b.tabIndex).toBeGreaterThanOrEqual(0);
    b.click();
    expect(w.gw.ofType('anruf:auflegen')).toEqual([{ type: 'anruf:auflegen', meldungId: 'm-fertig' }]);
  });

  it('open line in another window: hint without buttons (INT-2026-027)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    w.gw.emit(state({ zustand: 'offen', eigener: false }));
    await zeige(el);
    expect(el.querySelector('.anruf-andere')?.textContent).toBe('Leitung offen in einem anderen Fenster');
    expect(knoepfe(el)).toEqual([]);
  });

  it('open line closed by the deadline: „Leitung geschlossen." without „Nicht gesendet" (INT-2026-027, AK-10)', async () => {
    const w = anrufWelt();
    const el = await box(w);
    await laeuft(w, el, meldungFertig);
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
    w.gw.emit(state({ zustand: 'offen', eigener: true, leitung: leitungFertig }));
    w.gw.emit(state({ zustand: 'ruhe', endeGrund: 'Leitung geschlossen.' }));
    await zeige(el);
    expect(el.querySelector('.anruf-ergebnis.no')?.textContent?.trim()).toBe('Leitung geschlossen.');
  });
});
