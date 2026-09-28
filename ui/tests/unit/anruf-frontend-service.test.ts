// @vitest-environment happy-dom
/**
 * INT-2026-025 (D4, D11; FA-03, FA-04, FA-26, FA-28, Spec §4) and
 * INT-2026-026 (D3, D4, D6–D10; FA-01–FA-24): the browser side of the call
 * mode with fake browser APIs — capability report, ringing, reading
 * sentence-wise with an end signal, hands-free listening after reading,
 * pieces at speaking pauses, closing phrase „Antwort senden", 20-s silence,
 * plan confirmation, Rückfragen, failures.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));
vi.mock('../../frontend/src/components/terminal/notification-sound.js', () => ({ playAnrufKlingeln: vi.fn(), playAnrufHinweis: vi.fn() }));

import { anrufWelt, leitungFertig, meldungFertig, meldungPlan, meldungRueckfrage, ruhe, state, verfuegbarkeitLokal, type AnrufWelt } from './anruf-fakes.js';
import { schalterSperrgrund, waehleStimme, saetze, anrufAktiv, vorleseFristMs, ANRUF_HINWEIS_VORLAUF_MS, ANRUF_TEXT } from '../../frontend/src/services/anruf.service.js';
import { base64ZuInt16 } from '../../src/shared/anruf-audio.js';
import { ANRUF_NICHT_VERFUEGBAR_TEXT } from '../../src/shared/types/anruf.protocol.js';

async function laufenderAnruf(w: AnrufWelt, meldung = meldungFertig): Promise<void> {
  w.dienst.subscribe(() => {});
  w.gw.emit(verfuegbarkeitLokal);
  await ruhe();
  w.gw.emit(state({ zustand: 'laeuft', eigener: true, meldung }));
}

/** Reading ends (onend) → microphone opens; 300 ms of room noise to learn the floor. */
async function hoert(w: AnrufWelt): Promise<void> {
  w.sprache.fertig();
  await ruhe();
  expect(w.dienst.ansicht.phase).toBe('zuhoeren');
  w.mikro.letzter.stille(0.3);
}

/** Speaks one piece; returns its number (the recognition result is not in yet). */
function stueck(w: AnrufWelt, sekunden = 1): number {
  w.mikro.letzter.sprich(sekunden);
  const nr = w.gw.ofType('anruf:erkennen').at(-1)?.abschnitt;
  expect(typeof nr).toBe('number');
  return nr as number;
}

function erkannt(w: AnrufWelt, nr: number, text: string, meldungId = w.dienst.ansicht.meldung?.id ?? ''): void {
  w.gw.emit({ type: 'anruf:erkannt', meldungId, abschnitt: nr, text });
}

/** One piece with its recognised text. */
function sage(w: AnrufWelt, text: string, sekunden = 1): void {
  erkannt(w, stueck(w, sekunden), text);
}

describe('anruf.service — capability (FA-26, FA-28)', () => {
  it('reports microphone and a local German voice only once this browser is local', async () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    await ruhe();
    expect(w.gw.ofType('anruf:faehig')).toEqual([]);
    w.gw.emit({ type: 'anruf:verfuegbarkeit', an: false, verfuegbarkeit: { verfuegbar: true }, lokal: false });
    expect(w.gw.ofType('anruf:faehig')).toEqual([]);
    w.gw.emit(verfuegbarkeitLokal);
    expect(w.gw.ofType('anruf:faehig')).toEqual([{ type: 'anruf:faehig', mikrofon: 'ok', stimme: true }]);
  });

  it('re-reports after a permission change; denied → verweigert, no input → fehlt', async () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(verfuegbarkeitLokal);
    await ruhe();
    w.mikro.aendere('denied');
    await ruhe();
    expect(w.gw.ofType('anruf:faehig').at(-1)).toMatchObject({ mikrofon: 'verweigert' });
    w.mikro.eingang = false;
    w.mikro.aendere('granted');
    await ruhe();
    expect(w.gw.ofType('anruf:faehig').at(-1)).toMatchObject({ mikrofon: 'fehlt' });
  });

  it('voice: only localService de-*, „Anna" preferred; none → stimme false', async () => {
    expect(waehleStimme([{ name: 'Markus', lang: 'de-DE', localService: true }, { name: 'Anna', lang: 'de-DE', localService: true }])?.name).toBe('Anna');
    expect(waehleStimme([{ name: 'Google Deutsch', lang: 'de-DE', localService: false }, { name: 'Samantha', lang: 'en-US', localService: true }])).toBeUndefined();
    const w = anrufWelt();
    w.sprache.voices = [{ name: 'Google Deutsch', lang: 'de-DE', localService: false }];
    w.dienst.subscribe(() => {});
    w.gw.emit(verfuegbarkeitLokal);
    await ruhe();
    expect(w.gw.ofType('anruf:faehig').at(-1)).toMatchObject({ stimme: false });
  });

  it('switch lock reasons: other device, backend reason, microphone, voice', () => {
    const basis = { an: false, bekannt: true, verfuegbar: true, lokal: true, mikrofon: 'ok' as const, stimme: true };
    expect(schalterSperrgrund(basis)).toBeNull();
    expect(anrufAktiv({ ...basis, an: true })).toBe(true);
    expect(schalterSperrgrund({ ...basis, lokal: false })).toBe(ANRUF_NICHT_VERFUEGBAR_TEXT.nicht_lokal);
    expect(schalterSperrgrund({ ...basis, verfuegbar: false, text: ANRUF_NICHT_VERFUEGBAR_TEXT.modell_fehlt })).toBe(ANRUF_NICHT_VERFUEGBAR_TEXT.modell_fehlt);
    expect(schalterSperrgrund({ ...basis, mikrofon: 'verweigert' })).toMatch(/Mikrofon nicht freigegeben/);
    expect(schalterSperrgrund({ ...basis, mikrofon: 'fehlt' })).toMatch(/kein Mikrofon/);
    expect(schalterSperrgrund({ ...basis, stimme: false })).toMatch(/keine lokale deutsche Stimme/);
    expect(anrufAktiv({ ...basis, an: true, stimme: false })).toBe(false);
  });

  it('switching on asks for the microphone once when the browser has not decided, then sets the mode; denied → stays off', async () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(verfuegbarkeitLokal);
    await ruhe();
    w.mikro.erlaubnisWert = 'prompt';
    w.mitteilung.erlaubnisWert = 'default';
    expect(await w.dienst.setModus(true)).toBe(true);
    expect(w.mikro.oeffnungen).toBe(1);
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.mitteilung.anfragen_).toBe(1);
    expect(w.gw.ofType('anruf:modus.set')).toEqual([{ type: 'anruf:modus.set', an: true }]);

    w.mikro.erlaubnisWert = 'denied';
    expect(await w.dienst.setModus(true)).toBe(false);
    expect(w.gw.ofType('anruf:modus.set')).toHaveLength(1);
    await w.dienst.setModus(false);
    expect(w.gw.ofType('anruf:modus.set').at(-1)).toEqual({ type: 'anruf:modus.set', an: false });
  });
});

describe('anruf.service — ringing (FA-03, FA-04, D6)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ring tone 3× every 4 s, then silent; stops when answered elsewhere', () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungFertig, wartend: 2 }));
    expect(w.klingeln.n).toBe(1);
    vi.advanceTimersByTime(4000);
    expect(w.klingeln.n).toBe(2);
    vi.advanceTimersByTime(4000);
    expect(w.klingeln.n).toBe(3);
    vi.advanceTimersByTime(20000);
    expect(w.klingeln.n).toBe(3);
    expect(w.dienst.ansicht.phase).toBe('klingelt');
    // same message again: no new ring
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungFertig, wartend: 1 }));
    expect(w.klingeln.n).toBe(3);

    const w2 = anrufWelt();
    w2.dienst.subscribe(() => {});
    w2.gw.emit(state({ zustand: 'klingelt', meldung: meldungFertig }));
    w2.gw.emit(state({ zustand: 'ruhe' }));
    vi.advanceTimersByTime(10000);
    expect(w2.klingeln.n).toBe(1);
  });

  it('notification only when the tab is hidden and permitted, tagged with the message id', () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungFertig }));
    expect(w.mitteilung.gezeigt).toEqual([]);
    w.gw.emit(state({ zustand: 'ruhe' }));
    w.versteckt.v = true;
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungRueckfrage }));
    expect(w.mitteilung.gezeigt).toEqual([{ titel: 'Anruf: Rückfrage', body: 'Sitzung „plan-anruf“ · Specwright', tag: 'm-rf' }]);
    w.gw.emit(state({ zustand: 'ruhe' }));
    w.mitteilung.erlaubnisWert = 'denied';
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungPlan }));
    expect(w.mitteilung.gezeigt).toHaveLength(1);
  });

  it('another window took the call: phase fremd, nothing read aloud', () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(state({ zustand: 'laeuft', eigener: false, meldung: meldungFertig }));
    expect(w.dienst.ansicht.phase).toBe('fremd');
    expect(w.sprache.gesprochen).toEqual([]);
  });
});

describe('anruf.service — reading aloud (D4)', () => {
  it('reads sentence-wise with Anna; „gekürzt" announced; Nochmal cancels and reads again', async () => {
    expect(saetze('Eins. Zwei? Drei!')).toEqual(['Eins.', 'Zwei?', 'Drei!']);
    const w = anrufWelt();
    await laufenderAnruf(w);
    expect(w.sprache.gesprochen).toEqual([
      { text: 'Ich habe das Matching umgebaut.', stimme: 'Anna' },
      { text: 'Jetzt brauche ich deine Freigabe.', stimme: 'Anna' },
      { text: 'Gekürzt.', stimme: 'Anna' },
    ]);
    const cancels = w.sprache.cancels;
    w.dienst.nochmal();
    expect(w.sprache.cancels).toBe(cancels + 1);
    expect(w.sprache.texte.slice(3)).toEqual(['Ich habe das Matching umgebaut.', 'Jetzt brauche ich deine Freigabe.', 'Gekürzt.']);
  });

  it('without a Sprechfassung it says so; without content it points to the terminal', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, { ...meldungFertig, text: { vorlesen: 'Erster Satz.', gekuerzt: false, ohneSprechfassung: true, anzeige: 'Erster Satz.' } });
    expect(w.sprache.texte[0]).toBe('Keine Sprechfassung — hier der Anfang der Antwort.');
    const w2 = anrufWelt();
    const ohne = { ...meldungFertig };
    delete ohne.text;
    await laufenderAnruf(w2, ohne);
    expect(w2.sprache.texte).toEqual([ANRUF_TEXT.keineSprechfassungTerminal]);
    expect(w2.dienst.ansicht.nurTerminal).toBe(false);
  });

  it('auflegen cancels speech and sends anruf:auflegen', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    const c = w.sprache.cancels;
    w.dienst.auflegen();
    expect(w.sprache.cancels).toBeGreaterThan(c);
    expect(w.gw.ofType('anruf:auflegen')).toEqual([{ type: 'anruf:auflegen', meldungId: 'm-fertig' }]);
  });
});

describe('anruf.service — listening after reading (FA-01, FA-02, FA-03, AK-01, AK-02)', () => {
  it('microphone closed while reading, opens after the last sentence; „Ich höre zu" only once recording runs', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    expect(w.mikro.oeffnungen).toBe(0);
    expect(w.dienst.ansicht.phase).toBe('vorlesen');
    w.sprache.fertig();
    expect(w.dienst.ansicht.phase).toBe('vorlesen');
    await ruhe();
    expect(w.mikro.oeffnungen).toBe(1);
    expect(w.mikro.letzter.laeuft).toBe(true);
    expect(w.dienst.ansicht.phase).toBe('zuhoeren');
  });

  it('cancelled reading does not open the microphone', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    w.sprache.abbrechen();
    await ruhe();
    expect(w.mikro.oeffnungen).toBe(0);
  });

  it('Nochmal closes the microphone, reads again, opens afterwards (FA-02); the text stays (D7)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach die Tests.');
    const strom = w.mikro.letzter;
    w.dienst.nochmal();
    expect(strom.gestoppt).toBe(true);
    expect(strom.aufnahmeGestoppt).toBe(true);
    expect(w.dienst.ansicht).toMatchObject({ phase: 'vorlesen', text: 'Mach die Tests.' });
    await hoert(w);
    expect(w.mikro.oeffnungen).toBe(2);
  });

  it('fallback: aktiv() false twice → listening; onend and fallback both → one opening (D4, Finding 1)', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      w.sprache.aktivWert = false;
      vi.advanceTimersByTime(500);
      await ruhe();
      expect(w.mikro.oeffnungen).toBe(0);
      vi.advanceTimersByTime(500);
      w.sprache.fertig();
      await ruhe();
      expect(w.mikro.oeffnungen).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gap between two sentences (pending) is no end', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      vi.advanceTimersByTime(3000);
      await ruhe();
      expect(w.mikro.oeffnungen).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('background tab: speech paused (aktiv stays true) → hard limit cancels and listens (R11)', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      const text = 'Ich habe das Matching umgebaut. Jetzt brauche ich deine Freigabe. Gekürzt.';
      const c = w.sprache.cancels;
      vi.advanceTimersByTime(vorleseFristMs(text) - 1);
      await ruhe();
      expect(w.mikro.oeffnungen).toBe(0);
      vi.advanceTimersByTime(1);
      await ruhe();
      expect(w.sprache.cancels).toBe(c + 1);
      expect(w.mikro.oeffnungen).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no microphone while ringing, in another window, after hanging up, with mode off (FA-03, FA-24)', async () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(state({ zustand: 'klingelt', meldung: meldungFertig }));
    w.gw.emit(state({ zustand: 'laeuft', eigener: false, meldung: meldungFertig }));
    w.sprache.fertig();
    await ruhe();
    expect(w.mikro.oeffnungen).toBe(0);

    const w2 = anrufWelt();
    await laufenderAnruf(w2);
    await hoert(w2);
    const strom = w2.mikro.letzter;
    w2.gw.emit(state({ an: false, zustand: 'laeuft', eigener: true, meldung: meldungFertig }));
    expect(strom.gestoppt).toBe(true);
    expect(w2.gw.ofType('anruf:senden')).toEqual([]);

    const w3 = anrufWelt();
    await laufenderAnruf(w3);
    await hoert(w3);
    w3.dienst.auflegen();
    expect(w3.mikro.letzter.gestoppt).toBe(true);
  });

  it('nurTerminal: after reading the microphone stays closed', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, { ...meldungRueckfrage, fragen: [] });
    w.sprache.fertig();
    await ruhe();
    expect(w.mikro.oeffnungen).toBe(0);
    expect(w.dienst.ansicht.phase).toBe('vorlesen');
  });
});

describe('anruf.service — pieces and the closing phrase (FA-04–FA-08, AK-03, AK-04, AK-08)', () => {
  it('„Mach die Tests. Antwort senden." → sent without the phrase, nothing read before (AK-03, FA-05)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    const vorher = w.sprache.texte.length;
    sage(w, 'Mach die Tests. Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-fertig', antwort: { art: 'text', text: 'Mach die Tests.' } }]);
    expect(w.sprache.texte.length).toBe(vorher);
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.dienst.ansicht.phase).toBe('sendet');
  });

  it('pieces carry numbers and 16-kHz audio; results out of order → text in order (FA-04, D5)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    const a = stueck(w, 1);
    const b = stueck(w, 1);
    expect(b).toBe(a + 1);
    const audio = w.gw.ofType('anruf:erkennen')[0]!.audio as string;
    expect(base64ZuInt16(audio).length).toBeGreaterThan(16000);
    erkannt(w, b, 'Und den PR. Antwort senden.');
    expect(w.dienst.ansicht).toMatchObject({ erkenntNoch: true });
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    erkannt(w, a, 'Mach bitte die Tests.');
    expect(w.gw.ofType('anruf:senden')).toEqual([
      { type: 'anruf:senden', meldungId: 'm-fertig', antwort: { art: 'text', text: 'Mach bitte die Tests. Und den PR.' } },
    ]);
  });

  it('after each pause the text so far and „Wird gesendet als" are shown (FA-19, AK-08)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach bitte noch die Tests.');
    expect(w.dienst.ansicht).toMatchObject({
      phase: 'zuhoeren',
      text: 'Mach bitte noch die Tests.',
      als: 'Neue Eingabe an Sitzung „build-matching“',
      erkenntNoch: false,
    });
  });

  it('phrase over two pieces: „… Antwort" + „senden." → sent (FA-05)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach die Tests. Antwort');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    sage(w, 'senden.');
    expect(w.gw.ofType('anruf:senden')[0]).toMatchObject({ antwort: { art: 'text', text: 'Mach die Tests.' } });
  });

  it('phrase in the middle → nothing, listening goes on; later phrase sends the whole text (AK-04, FA-06)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Antwort senden und dann die Doku.');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.dienst.ansicht.phase).toBe('zuhoeren');
    sage(w, 'Antwort senden.');
    expect(w.gw.ofType('anruf:senden')[0]).toMatchObject({ antwort: { text: 'Antwort senden und dann die Doku.' } });
  });

  it('level right after the phrase piece (below the start limit) → wait for quiet (Finding 1, R6)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    const s = w.mikro.letzter;
    s.liefere(1, 0.3);
    s.stille(1.1);
    const nr = w.gw.ofType('anruf:erkennen').at(-1)!.abschnitt as number;
    s.liefere(0.05, 0.3, 0.05); // 1–2 loud frames: no piece yet
    erkannt(w, nr, 'Mach die Tests. Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    s.stille(1.1); // onRuhe
    expect(w.gw.ofType('anruf:senden')).toHaveLength(1);
  });

  it('speaking on while the phrase piece is recognised → only the next result decides (FA-06)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    const a = stueck(w, 1);
    w.mikro.letzter.liefere(0.5, 0.3); // next piece open
    erkannt(w, a, 'Mach die Tests. Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    w.mikro.letzter.stille(1.1);
    const b = w.gw.ofType('anruf:erkennen').at(-1)!.abschnitt as number;
    erkannt(w, b, 'und dann noch die Doku');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('„senden" without „Antwort" → hint shown, not spoken, nothing sent (FA-07)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    const n = w.sprache.texte.length;
    sage(w, 'Mach den PR auf und dann senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.dienst.ansicht).toMatchObject({ phase: 'zuhoeren', hinweis: ANRUF_TEXT.schlussHinweis });
    expect(w.sprache.texte.length).toBe(n);
  });

  it('only the phrase → nothing sent, „Noch keine Antwort" read, listening again (FA-08)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.sprache.texte.at(-1)).toBe(ANRUF_TEXT.nochKeineAntwort);
    await hoert(w);
  });

  it('„… Antwort verwerfen" clears, says „Verworfen", listens again (FA-12)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach das so.');
    sage(w, 'Ach nein. Antwort verwerfen.');
    expect(w.dienst.ansicht.text).toBeUndefined();
    expect(w.sprache.texte.at(-1)).toBe('Verworfen.');
    await hoert(w);
    sage(w, 'Neu. Antwort senden.');
    expect(w.gw.ofType('anruf:senden')[0]).toMatchObject({ antwort: { text: 'Neu.' } });
  });

  it('single words only as everything said since opening (FA-13): „auflegen" hangs up, inside a sentence it is text', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Das war es. Auflegen.');
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    expect(w.dienst.ansicht.text).toBe('Das war es. Auflegen.');

    const w2 = anrufWelt();
    await laufenderAnruf(w2);
    await hoert(w2);
    sage(w2, 'Auflegen.');
    expect(w2.gw.ofType('anruf:auflegen')).toHaveLength(1);
    expect(w2.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('„nochmal" as a word reads again and is no text', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Noch mal.');
    expect(w.dienst.ansicht).toMatchObject({ phase: 'vorlesen' });
    expect(w.dienst.ansicht.text).toBeUndefined();
    expect(w.sprache.texte.at(-1)).toBe('Gekürzt.');
  });

  it('„auflegen" after a spoken hint acts as a single word (Finding 12)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Antwort senden.');
    await hoert(w);
    sage(w, 'Auflegen');
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
  });
});

describe('anruf.service — silence and length (FA-09, FA-10, FA-11, AK-05)', () => {
  it('20 s silence → hang up, „Keine Antwort, aufgelegt" after cancelling, nothing sent (FA-09, D10)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    w.mikro.letzter.stille(19.5);
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    const c = w.sprache.cancels;
    w.mikro.letzter.stille(0.5);
    expect(w.gw.ofType('anruf:auflegen')).toEqual([{ type: 'anruf:auflegen', meldungId: 'm-fertig' }]);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.sprache.cancels).toBeGreaterThan(c);
    expect(w.sprache.texte.at(-1)).toBe('Keine Antwort, aufgelegt.');
    expect(w.dienst.ansicht).toMatchObject({ phase: 'ergebnis', ergebnis: { ok: false, text: ANRUF_TEXT.keineAntwort, glocke: true } });
    expect(w.mikro.letzter.gestoppt).toBe(true);
  });

  it('recognised words reset the clock; a started text is not sent on silence', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    w.mikro.letzter.stille(8);
    sage(w, 'Mach die Tests.'); // ends at ≈ 9.3 s
    w.mikro.letzter.stille(17);
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    w.mikro.letzter.stille(2);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('a piece with nothing understood does not reset the clock (FA-10)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    w.mikro.letzter.stille(10);
    const nr = stueck(w, 1);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', abschnitt: nr, grund: 'nichts_verstanden' });
    w.mikro.letzter.stille(8);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
  });

  it('no hang-up while a recognition is open', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    w.mikro.letzter.stille(18);
    const nr = stueck(w, 1);
    w.mikro.letzter.stille(3);
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', abschnitt: nr, grund: 'nichts_verstanden' });
    w.mikro.letzter.stille(0.1);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
  });

  it('two minutes per question → „Antwort zu lang", microphone off, text held; then only the phrase alone sends (FA-11)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    for (let i = 0; i < 5; i++) sage(w, `Teil ${i + 1}.`, 25);
    // 5 pieces × (25 s + lead-in/tail) ≥ 120 s
    expect(w.dienst.ansicht).toMatchObject({ phase: 'mikrofon_zu', hinweis: ANRUF_TEXT.zuLang, gehalten: true, text: 'Teil 1. Teil 2. Teil 3. Teil 4. Teil 5.' });
    expect(w.sprache.texte.at(-1)).toBe('Antwort zu lang.');
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    w.dienst.zuhoeren();
    await ruhe();
    w.mikro.letzter.stille(0.3);
    sage(w, 'Und noch was.');
    expect(w.dienst.ansicht).toMatchObject({ text: 'Teil 1. Teil 2. Teil 3. Teil 4. Teil 5.', hinweis: ANRUF_TEXT.gehaltenHinweis });
    sage(w, 'Antwort senden.');
    expect(w.gw.ofType('anruf:senden')[0]).toMatchObject({ antwort: { text: 'Teil 1. Teil 2. Teil 3. Teil 4. Teil 5.' } });
  });
});

describe('anruf.service — plan and Rückfrage (FA-14, FA-15, FA-16, AK-06, AK-07)', () => {
  it('„freigeben" → confirmation read, then listening; „ja" releases', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungPlan);
    await hoert(w);
    sage(w, 'Frei geben.');
    expect(w.gw.ofType('anruf:freigeben.anfragen')).toEqual([{ type: 'anruf:freigeben.anfragen', meldungId: 'm-plan' }]);
    expect(w.mikro.letzter.gestoppt).toBe(true);
    w.gw.emit(state({ zustand: 'freigabe_nachfrage', eigener: true, meldung: meldungPlan, freigabeWortlaut: 'Yes, and switch to BYPASS PERMISSIONS' }));
    expect(w.dienst.ansicht).toMatchObject({ phase: 'nachfrage', freigabeWortlaut: 'Yes, and switch to BYPASS PERMISSIONS' });
    expect(w.sprache.texte.slice(-2)).toEqual(['Plan für Sitzung „int-025-plan“ wirklich freigeben?', 'Sag ja oder nein.']);
    await hoert(w);
    expect(w.dienst.ansicht.hoertInNachfrage).toBe(true);
    sage(w, 'ja, aber nimm das kleinere Modell');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.sprache.texte.at(-1)).toBe('Sag ja oder nein.');
    await hoert(w);
    sage(w, 'Ja.');
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-plan', antwort: { art: 'freigeben' } }]);
  });

  it('„nein" → „Nicht freigegeben", nothing sent, listening in the answer context; 20 s silence hangs up unreleased', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungPlan);
    await hoert(w);
    w.dienst.freigebenAnfragen();
    w.gw.emit(state({ zustand: 'freigabe_nachfrage', eigener: true, meldung: meldungPlan }));
    await hoert(w);
    sage(w, 'Nein.');
    expect(w.sprache.texte.at(-1)).toBe('Nicht freigegeben.');
    expect(w.dienst.ansicht.phase).toBe('vorlesen');
    await hoert(w);
    expect(w.dienst.ansicht.hoertInNachfrage).toBe(false);
    w.mikro.letzter.stille(20);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('any other text with the phrase → revision, plan stays unreleased (FA-15)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungPlan);
    await hoert(w);
    sage(w, 'Nimm das kleinere Modell. Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-plan', antwort: { art: 'ueberarbeiten', text: 'Nimm das kleinere Modell.' } }]);
  });

  it('freigeben without the confirmation state sends nothing', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungPlan);
    w.dienst.freigeben();
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('Rückfrage with two questions: phrase advances, sends after the last (FA-16)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungRueckfrage);
    await hoert(w);
    sage(w, 'Die zweite.');
    expect(w.dienst.ansicht).toMatchObject({ als: 'Möglichkeit 2 — Whisper large-v3-turbo (Frage 1 von 2)', weiter: true });
    sage(w, 'Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.dienst.ansicht).toMatchObject({ phase: 'vorlesen', frageIndex: 1 });
    expect(w.dienst.ansicht.text).toBeUndefined();
    expect(w.sprache.texte.some((t) => t.startsWith('Nächste Frage.'))).toBe(true);
    await hoert(w);
    sage(w, 'Lieber eine Männerstimme. Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toEqual([
      { type: 'anruf:senden', meldungId: 'm-rf', antwort: { art: 'rueckfrage', antworten: [{ nummern: [2] }, { nummern: [], eigene: 'Lieber eine Männerstimme.' }] } },
    ]);
  });

  it('ambiguous → „Passt auf 1 und 3 — Nummer sagen" read, nothing sent, listening again', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungRueckfrage);
    await hoert(w);
    sage(w, 'eins und drei, Antwort senden');
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.sprache.texte.at(-1)).toBe('Passt auf 1 und 3 — Nummer sagen');
    expect(w.dienst.ansicht.text).toBeUndefined();
    await hoert(w);
  });

  it('20 s silence after the first of two questions: nothing sent', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungRueckfrage);
    await hoert(w);
    sage(w, 'eins. Antwort senden.');
    await hoert(w);
    w.mikro.letzter.stille(20);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });
});

describe('anruf.service — results and failures (FA-17, FA-18, FA-21, D9, Finding 9, 13, 21)', () => {
  it('ok → „Gesendet." spoken after ending, no new opening; result 3 s (FA-18, D10)', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      await hoert(w);
      sage(w, 'weiter. Antwort senden.');
      w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
      expect(w.sprache.texte.at(-1)).toBe('Gesendet.');
      w.sprache.fertig();
      await ruhe();
      expect(w.mikro.oeffnungen).toBe(1);
      w.gw.emit(state({ zustand: 'ruhe' }));
      expect(w.dienst.ansicht.ergebnis).toEqual({ ok: true, text: 'Gesendet' });
      vi.advanceTimersByTime(3000);
      expect(w.dienst.ansicht.phase).toBe('ruhe');
    } finally {
      vi.useRealTimers();
    }
  });

  it('failure → „Nicht gesendet …" read, text held, listening; more speech is not appended; phrase alone resends (FA-17, D6)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach die Tests. Antwort senden.');
    const text = 'In der Eingabezeile steht noch Text — im Terminal abschicken oder löschen.';
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: false, grund: 'eingabe_nicht_leer', text });
    expect(w.sprache.texte.join(' ')).toContain('Nicht gesendet.');
    expect(w.dienst.ansicht).toMatchObject({ gehalten: true, hinweis: `Nicht gesendet: ${text}` });
    await hoert(w);
    sage(w, 'Und die Doku.');
    expect(w.dienst.ansicht.text).toBe('Mach die Tests. Antwort senden.');
    sage(w, 'Antwort senden.');
    expect(w.gw.ofType('anruf:senden')).toHaveLength(2);
    expect(w.gw.ofType('anruf:senden')[1]).toMatchObject({ antwort: { art: 'text', text: 'Mach die Tests.' } });
  });

  it('failure, then „Antwort verwerfen" clears the held text', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'X. Antwort senden.');
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: false, grund: 'eingabe_nicht_leer', text: 'Text in der Eingabezeile.' });
    await hoert(w);
    sage(w, 'Antwort verwerfen.');
    expect(w.dienst.ansicht).toMatchObject({ gehalten: false });
    expect(w.dienst.ansicht.text).toBeUndefined();
  });

  it('endeGrund of the backend is announced (answered elsewhere)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    w.gw.emit(state({ zustand: 'ruhe', endeGrund: 'In der Sitzung schon beantwortet.' }));
    expect(w.dienst.ansicht.ergebnis).toEqual({ ok: false, text: 'In der Sitzung schon beantwortet.' });
    expect(w.sprache.texte.at(-1)).toBe('In der Sitzung schon beantwortet.');
  });

  it('microphone denied: reason spoken and shown, „Zuhören", no hang-up, no faehig during the call; reported afterwards (FA-21, D9)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    const faehig = w.gw.ofType('anruf:faehig').length;
    w.mikro.fehler = { name: 'NotAllowedError' };
    w.sprache.fertig();
    await ruhe();
    expect(w.dienst.ansicht).toMatchObject({ phase: 'mikrofon_zu', hinweis: ANRUF_TEXT.mikrofonVerweigert });
    expect(w.sprache.texte.at(-1)).toBe('Mikrofon nicht freigegeben.');
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    expect(w.gw.ofType('anruf:faehig')).toHaveLength(faehig);
    w.mikro.fehler = null;
    w.dienst.zuhoeren();
    await ruhe();
    expect(w.dienst.ansicht.phase).toBe('zuhoeren');
    w.dienst.auflegen();
    expect(w.gw.ofType('anruf:faehig').at(-1)).toMatchObject({ mikrofon: 'verweigert' });
  });

  it('track ends while listening: „Mikrofon nicht verfügbar", nothing sent; button „Senden" works without microphone (FA-21)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach die Tests.');
    w.mikro.letzter.endeVonAussen();
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.dienst.ansicht).toMatchObject({ phase: 'mikrofon_zu', hinweis: ANRUF_TEXT.mikrofonWeg, text: 'Mach die Tests.' });
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.gw.ofType('anruf:auflegen')).toEqual([]);
    w.dienst.senden();
    expect(w.gw.ofType('anruf:senden')[0]).toMatchObject({ antwort: { art: 'text', text: 'Mach die Tests.' } });
  });

  it('buttons: Senden sends the shown text without the phrase; Verwerfen clears and listening goes on (FA-20)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach den PR auf und dann senden');
    w.dienst.verwerfen();
    expect(w.dienst.ansicht.text).toBeUndefined();
    expect(w.dienst.ansicht.phase).toBe('zuhoeren');
    sage(w, 'Zweiter Versuch.');
    w.dienst.senden();
    expect(w.gw.ofType('anruf:senden')[0]).toMatchObject({ antwort: { text: 'Zweiter Versuch.' } });
  });

  it('no result for a piece within 15 s → not understood, clock runs on, late result dropped (Finding 9)', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      await hoert(w);
      const nr = stueck(w, 1);
      vi.advanceTimersByTime(15_000);
      expect(w.dienst.ansicht).toMatchObject({ erkenntNoch: false, hinweis: ANRUF_TEXT.nichtsVerstanden });
      erkannt(w, nr, 'zu spät. Antwort senden.');
      expect(w.gw.ofType('anruf:senden')).toEqual([]);
      expect(w.dienst.ansicht.text).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('anruf:error while listening (audio limit) → microphone off, reason shown (Finding 13)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    w.gw.emit({ type: 'anruf:error', code: 'INVALID_MESSAGE', message: 'Zu viel Audio in diesem Anruf.' });
    expect(w.dienst.ansicht).toMatchObject({ phase: 'mikrofon_zu', hinweis: 'Zu viel Audio in diesem Anruf.' });
    expect(w.mikro.letzter.gestoppt).toBe(true);
  });

  it('connection lost while listening → listening stops, nothing sent (Finding 21)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Mach die Tests.');
    w.gw.emit({ type: 'gateway.disconnected' });
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.dienst.ansicht.ergebnis).toEqual({ ok: false, text: ANRUF_TEXT.verbindungWeg });
    w.mikro.letzter.stille(1);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('erkennung_neustart → hint read, listening again; erkennung_fehlt → microphone off', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    const nr = stueck(w, 1);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', abschnitt: nr, grund: 'erkennung_neustart' });
    expect(w.sprache.texte.at(-1)).toBe('Nicht verstanden — Spracherkennung startet neu, bitte nochmal sprechen');
    await hoert(w);
    const nr2 = stueck(w, 1);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', abschnitt: nr2, grund: 'erkennung_fehlt' });
    expect(w.dienst.ansicht).toMatchObject({ phase: 'mikrofon_zu', hinweis: ANRUF_TEXT.erkennungFehlt });
  });

  it('memory: nothing kept after hanging up (FA-22)', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'Geheim.');
    w.dienst.auflegen();
    w.gw.emit(state({ zustand: 'laeuft', eigener: true, meldung: meldungFertig }));
    expect(w.dienst.ansicht.text).toBeUndefined();
  });
});

describe('anruf.service — open line after „Gesendet" (INT-2026-027)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Call answered and sent; the backend keeps the line open. */
  async function offeneLeitung(w: AnrufWelt): Promise<void> {
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'weiter. Antwort senden.');
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
    w.gw.emit(state({ zustand: 'offen', eigener: true, leitung: leitungFertig }));
  }

  it('AK-01, AK-02: phase leitung with the session, „Gesendet" shown, microphone stays closed', async () => {
    const w = anrufWelt();
    await offeneLeitung(w);
    expect(w.dienst.ansicht).toMatchObject({
      phase: 'leitung',
      zustand: 'offen',
      leitung: { sitzungName: 'build-matching', projektName: 'Specwright' },
      ergebnis: { ok: true, text: 'Gesendet' },
    });
    expect(w.sprache.texte.at(-1)).toBe('Gesendet.');
    w.sprache.fertig();
    await ruhe();
    vi.advanceTimersByTime(60_000);
    await ruhe();
    expect(w.mikro.oeffnungen).toBe(1);
    expect(w.dienst.ansicht.phase).toBe('leitung');
  });

  it('AK-03, AK-11: same session reports again → one note, then reading, then listening; no ring', async () => {
    const w = anrufWelt();
    await offeneLeitung(w);
    const vorher = w.sprache.texte.length;
    w.gw.emit(state({ zustand: 'laeuft', eigener: true, meldung: { ...meldungFertig, id: 'm-fertig-2' } }));
    expect(w.hinweis.n).toBe(1);
    expect(w.klingeln.n).toBe(0);
    expect(w.sprache.texte.length).toBe(vorher);
    expect(w.dienst.ansicht.ergebnis).toBeUndefined();
    vi.advanceTimersByTime(ANRUF_HINWEIS_VORLAUF_MS);
    expect(w.hinweis.beiTexten).toEqual([vorher]);
    expect(w.sprache.texte.slice(vorher)).toEqual(['Ich habe das Matching umgebaut.', 'Jetzt brauche ich deine Freigabe.', 'Gekürzt.']);
    w.sprache.fertig();
    await ruhe();
    expect(w.dienst.ansicht.phase).toBe('zuhoeren');
    expect(w.mikro.oeffnungen).toBe(2);
  });

  it('AK-04: new message right after sending (no offen in between) → note and reading as well', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await hoert(w);
    sage(w, 'weiter. Antwort senden.');
    w.gw.emit(state({ zustand: 'sendet', eigener: true, meldung: meldungFertig }));
    w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
    w.gw.emit(state({ zustand: 'laeuft', eigener: true, meldung: { ...meldungFertig, id: 'm-fertig-2' } }));
    expect(w.hinweis.n).toBe(1);
    vi.advanceTimersByTime(ANRUF_HINWEIS_VORLAUF_MS);
    expect(w.sprache.texte.at(-3)).toBe('Ich habe das Matching umgebaut.');
  });

  it('AK-10: deadline → „Leitung geschlossen." spoken and shown without „Nicht gesendet"', async () => {
    const w = anrufWelt();
    await offeneLeitung(w);
    w.gw.emit(state({ zustand: 'ruhe', endeGrund: 'Leitung geschlossen.' }));
    expect(w.sprache.texte.at(-1)).toBe('Leitung geschlossen.');
    expect(w.dienst.ansicht).toMatchObject({ phase: 'ergebnis', ergebnis: { ok: false, text: 'Leitung geschlossen.', leitung: true } });
    expect(w.hinweis.n).toBe(0);
  });

  it('AK-10: button „Auflegen" sends the leitungId and says nothing', async () => {
    const w = anrufWelt();
    await offeneLeitung(w);
    const vorher = w.sprache.texte.length;
    w.dienst.auflegen();
    expect(w.gw.ofType('anruf:auflegen')).toEqual([{ type: 'anruf:auflegen', meldungId: 'm-fertig' }]);
    expect(w.dienst.ansicht.phase).not.toBe('leitung');
    w.gw.emit(state({ zustand: 'ruhe' }));
    vi.advanceTimersByTime(3000);
    expect(w.sprache.texte.length).toBe(vorher);
    expect(w.dienst.ansicht.phase).toBe('ruhe');
  });

  it('another window holds the open line: phase fremd, nothing spoken, no microphone', async () => {
    const w = anrufWelt();
    w.dienst.subscribe(() => {});
    w.gw.emit(verfuegbarkeitLokal);
    await ruhe();
    w.gw.emit(state({ zustand: 'offen', eigener: false }));
    expect(w.dienst.ansicht.phase).toBe('fremd');
    expect(w.dienst.ansicht.leitung).toBeUndefined();
    w.gw.emit(state({ zustand: 'ruhe', endeGrund: 'Leitung geschlossen.' }));
    expect(w.sprache.texte).toEqual([]);
    expect(w.mikro.oeffnungen).toBe(0);
  });
});
