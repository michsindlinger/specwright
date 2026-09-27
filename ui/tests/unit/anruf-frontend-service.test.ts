// @vitest-environment happy-dom
/**
 * INT-2026-025 (D4, D11; FA-03, FA-04, FA-19, FA-20, FA-21, FA-22, FA-26,
 * FA-28, Spec §4): the browser side of the call mode with fake browser APIs —
 * capability report, ringing, microphone only between „Sprechen" and
 * „Fertig", 30-s limit, silence check, microphone lost, reading sentence-wise
 * with a local voice, multi-question answers, plan confirmation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../frontend/src/gateway.js', () => ({
  gateway: { send: vi.fn(), on: vi.fn(), off: vi.fn(), getConnectionStatus: () => false },
}));
vi.mock('../../frontend/src/components/terminal/notification-sound.js', () => ({ playAnrufKlingeln: vi.fn() }));

import { anrufWelt, meldungFertig, meldungPlan, meldungRueckfrage, ruhe, state, verfuegbarkeitLokal, type AnrufWelt } from './anruf-fakes.js';
import { schalterSperrgrund, waehleStimme, saetze, anrufAktiv, ANRUF_TEXT } from '../../frontend/src/services/anruf.service.js';
import { base64ZuInt16 } from '../../src/shared/anruf-audio.js';
import { ANRUF_NICHT_VERFUEGBAR_TEXT } from '../../src/shared/types/anruf.protocol.js';

async function laufenderAnruf(w: AnrufWelt, meldung = meldungFertig): Promise<void> {
  w.dienst.subscribe(() => {});
  w.gw.emit(verfuegbarkeitLokal);
  await ruhe();
  w.gw.emit(state({ zustand: 'laeuft', eigener: true, meldung }));
}

async function sprich(w: AnrufWelt, sekunden = 1, amplitude = 0.5): Promise<void> {
  const start = w.dienst.sprechenStart();
  await ruhe();
  await start;
  w.mikro.letzter.liefere(sekunden, amplitude);
  w.dienst.sprechenEnde();
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

describe('anruf.service — reading aloud (D4, FA-18)', () => {
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

describe('anruf.service — recording (FA-19, FA-26, Review F14)', () => {
  it('microphone only between Sprechen and Fertig; tracks stopped at once; 16-kHz audio sent', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    expect(w.mikro.oeffnungen).toBe(0);
    await sprich(w, 1);
    const strom = w.mikro.letzter;
    expect(w.mikro.oeffnungen).toBe(1);
    expect(strom.gestoppt).toBe(true);
    expect(strom.aufnahmeGestoppt).toBe(true);
    const erkennen = w.gw.ofType('anruf:erkennen');
    expect(erkennen).toHaveLength(1);
    expect(erkennen[0]!.meldungId).toBe('m-fertig');
    expect(base64ZuInt16(erkennen[0]!.audio as string).length).toBe(16000);
    expect(w.dienst.ansicht.phase).toBe('erkennen');
  });

  it('30-s limit ends the recording on its own', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      const start = w.dienst.sprechenStart();
      await ruhe();
      await start;
      w.mikro.letzter.liefere(31);
      vi.advanceTimersByTime(30_000);
      expect(w.mikro.letzter.gestoppt).toBe(true);
      const audio = w.gw.ofType('anruf:erkennen')[0]!.audio as string;
      expect(base64ZuInt16(audio).length).toBe(30 * 16000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('too short or too quiet → „Nichts verstanden", nothing sent', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await sprich(w, 0.2);
    expect(w.gw.ofType('anruf:erkennen')).toEqual([]);
    expect(w.dienst.ansicht.hinweis).toBe(ANRUF_TEXT.nichtsVerstanden);
    expect(w.dienst.ansicht.phase).toBe('vorlesen');
    await sprich(w, 1, 0.001);
    expect(w.gw.ofType('anruf:erkennen')).toEqual([]);
  });

  it('microphone unplugged during recording: announce, hang up without sending, report', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    const start = w.dienst.sprechenStart();
    await ruhe();
    await start;
    w.mikro.letzter.endeVonAussen();
    expect(w.mikro.letzter.gestoppt).toBe(true);
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.gw.ofType('anruf:faehig').at(-1)).toMatchObject({ mikrofon: 'fehlt' });
    expect(w.sprache.texte.at(-1)).toBe('Mikrofon nicht verfügbar.');
    expect(w.dienst.ansicht.ergebnis).toEqual({ ok: false, text: 'Mikrofon nicht verfügbar' });
  });

  it('getUserMedia denied → verweigert, call ends', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    w.mikro.fehler = { name: 'NotAllowedError' };
    await w.dienst.sprechenStart();
    expect(w.gw.ofType('anruf:faehig').at(-1)).toMatchObject({ mikrofon: 'verweigert' });
    expect(w.gw.ofType('anruf:auflegen')).toHaveLength(1);
  });
});

describe('anruf.service — answers (FA-20, FA-21, FA-22)', () => {
  it('fertig: recognised text → „Neue Eingabe an Sitzung …"; spoken „senden" sends', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', text: 'Mach weiter mit dem Plan' });
    expect(w.dienst.ansicht).toMatchObject({ phase: 'bestaetigen', erkannt: 'Mach weiter mit dem Plan', als: 'Neue Eingabe an Sitzung „build-matching“' });
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', text: 'Senden.' });
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-fertig', antwort: { art: 'text', text: 'Mach weiter mit dem Plan' } }]);
  });

  it('recognition reasons are shown; nothing sent', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', grund: 'erkennung_neustart' });
    expect(w.dienst.ansicht).toMatchObject({ phase: 'vorlesen', hinweis: ANRUF_TEXT.erkennungNeustart });
  });

  it('Rückfrage with two questions: asks one after the other, sends only after the last', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungRueckfrage);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-rf', text: 'zwei' });
    expect(w.dienst.ansicht).toMatchObject({ als: 'Möglichkeit 2 — Whisper large-v3-turbo (Frage 1 von 2)', weiter: true });
    w.dienst.absenden();
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.dienst.ansicht).toMatchObject({ phase: 'vorlesen', frageIndex: 1 });
    expect(w.sprache.texte.at(-1)).toMatch(/Oder eine eigene Antwort\.$/);
    expect(w.sprache.texte.some((t) => t.startsWith('Nächste Frage.'))).toBe(true);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-rf', text: 'lieber eine Männerstimme' });
    expect(w.dienst.ansicht).toMatchObject({ als: 'Eigene Antwort (Frage 2 von 2)', weiter: false });
    w.dienst.absenden();
    expect(w.gw.ofType('anruf:senden')).toEqual([
      { type: 'anruf:senden', meldungId: 'm-rf', antwort: { art: 'rueckfrage', antworten: [{ nummern: [2] }, { nummern: [], eigene: 'lieber eine Männerstimme' }] } },
    ]);
  });

  it('ambiguous wording: own answer with „passt auf … — Nummer sagen"', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungRueckfrage);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-rf', text: 'eins und drei' });
    expect(w.dienst.ansicht).toMatchObject({ als: 'Eigene Antwort (Frage 1 von 2)', hinweis: 'passt auf 1 und 3 — Nummer sagen' });
  });

  it('hang up after the first of two questions: nothing sent', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungRueckfrage);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-rf', text: 'eins' });
    w.dienst.absenden();
    w.dienst.auflegen();
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('plan: „freigeben" → confirmation; „ja, aber …" is not a yes; „ja" releases; other text → revision', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungPlan);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-plan', text: 'Frei geben' });
    expect(w.gw.ofType('anruf:freigeben.anfragen')).toEqual([{ type: 'anruf:freigeben.anfragen', meldungId: 'm-plan' }]);
    w.gw.emit(state({ zustand: 'freigabe_nachfrage', eigener: true, meldung: meldungPlan, freigabeWortlaut: 'Yes, and switch to BYPASS PERMISSIONS' }));
    expect(w.dienst.ansicht).toMatchObject({ phase: 'nachfrage', freigabeWortlaut: 'Yes, and switch to BYPASS PERMISSIONS' });
    expect(w.sprache.texte.slice(-2)).toEqual(['Plan für Sitzung „int-025-plan“ wirklich freigeben?', 'Sag ja oder nein.']);
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-plan', text: 'ja, aber nimm das kleinere Modell' });
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
    expect(w.dienst.ansicht.phase).toBe('nachfrage');
    await sprich(w);
    w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-plan', text: 'Ja.' });
    expect(w.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-plan', antwort: { art: 'freigeben' } }]);

    const w2 = anrufWelt();
    await laufenderAnruf(w2, meldungPlan);
    await sprich(w2);
    w2.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-plan', text: 'Nimm das kleinere Modell' });
    expect(w2.dienst.ansicht.als).toBe('Überarbeitungswunsch');
    w2.dienst.absenden();
    expect(w2.gw.ofType('anruf:senden')).toEqual([{ type: 'anruf:senden', meldungId: 'm-plan', antwort: { art: 'ueberarbeiten', text: 'Nimm das kleinere Modell' } }]);
  });

  it('freigeben without the confirmation state sends nothing', async () => {
    const w = anrufWelt();
    await laufenderAnruf(w, meldungPlan);
    w.dienst.freigeben();
    expect(w.gw.ofType('anruf:senden')).toEqual([]);
  });

  it('result: „Gesendet" for 3 s; failure keeps the recognised text; endeGrund announced', async () => {
    vi.useFakeTimers();
    try {
      const w = anrufWelt();
      await laufenderAnruf(w);
      await sprich(w);
      w.gw.emit({ type: 'anruf:erkannt', meldungId: 'm-fertig', text: 'weiter' });
      w.dienst.absenden();
      w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: false, grund: 'eingabe_nicht_leer', text: 'In der Eingabezeile steht noch Text — im Terminal abschicken oder löschen.' });
      expect(w.dienst.ansicht).toMatchObject({ phase: 'bestaetigen', erkannt: 'weiter' });
      expect(w.dienst.ansicht.hinweis).toMatch(/^Nicht gesendet: In der Eingabezeile/);
      w.dienst.absenden();
      w.gw.emit({ type: 'anruf:ergebnis', meldungId: 'm-fertig', ok: true });
      w.gw.emit(state({ zustand: 'ruhe' }));
      expect(w.dienst.ansicht.phase).toBe('ergebnis');
      expect(w.dienst.ansicht.ergebnis).toEqual({ ok: true, text: 'Gesendet' });
      vi.advanceTimersByTime(3000);
      expect(w.dienst.ansicht.phase).toBe('ruhe');

      const w2 = anrufWelt();
      await laufenderAnruf(w2);
      w2.gw.emit(state({ zustand: 'ruhe', endeGrund: 'In der Sitzung schon beantwortet.' }));
      expect(w2.dienst.ansicht.ergebnis).toEqual({ ok: false, text: 'In der Sitzung schon beantwortet.' });
      expect(w2.sprache.texte.at(-1)).toBe('In der Sitzung schon beantwortet.');
    } finally {
      vi.useRealTimers();
    }
  });
});
