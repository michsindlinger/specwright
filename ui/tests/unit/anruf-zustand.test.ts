/**
 * INT-2026-025 (D6, ext. Review 7): Übergangstabelle aller Zustände × Ereignisse.
 */
import { describe, it, expect } from 'vitest';
import {
  anrufUebergang,
  ENDE_SCHON_BEANTWORTET,
  type AnrufEreignis,
  type AnrufZustand,
  type ZustandMeldung,
} from '../../src/server/services/anruf-zustand.js';

const M1: ZustandMeldung = { id: 'm1', sessionId: 's1', art: 'plan' };
const M2: ZustandMeldung = { id: 'm2', sessionId: 's1', art: 'rueckfrage' };
const MA: ZustandMeldung = { id: 'ma', sessionId: 's2', art: 'fertig' };
const M3: ZustandMeldung = { id: 'm3', sessionId: 's3', art: 'fertig' };
const JETZT = 1000;

const ZUSTAENDE: Record<AnrufZustand['name'], AnrufZustand> = {
  ruhe: { name: 'ruhe' },
  klingelt: { name: 'klingelt', meldung: M1, seit: 1 },
  laeuft: { name: 'laeuft', meldung: M1, besitzer: 'c1', seit: 1 },
  freigabe_nachfrage: { name: 'freigabe_nachfrage', meldung: M1, besitzer: 'c1', seit: 1, wortlaut: 'Yes, manually approve edits' },
  sendet: { name: 'sendet', meldung: M1, besitzer: 'c1', seit: 1 },
};

const EREIGNISSE: Record<string, AnrufEreignis> = {
  neu_andere: { art: 'meldung.neu', meldung: MA },
  neu_gleich: { art: 'meldung.neu', meldung: M2 },
  klingeln: { art: 'klingeln', meldung: M1 },
  erledigt: { art: 'meldung.erledigt', sessionId: 's1' },
  annehmen: { art: 'annehmen', meldungId: 'm1', clientId: 'c1' },
  ablehnen: { art: 'ablehnen', meldungId: 'm1', clientId: 'c1' },
  spaeter: { art: 'spaeter', meldungId: 'm1', clientId: 'c1' },
  auflegen: { art: 'auflegen', meldungId: 'm1', clientId: 'c1' },
  client_weg: { art: 'client.weg', clientId: 'c1' },
  niemand_da: { art: 'niemand_da' },
  modus_aus: { art: 'modus.aus' },
  freigeben_anfragen: { art: 'freigeben.anfragen', meldungId: 'm1', clientId: 'c1', nurBildschirm: false, wortlaut: 'Yes, manually approve edits' },
  senden_ueberarbeiten: { art: 'senden', meldungId: 'm1', clientId: 'c1', antwort: 'ueberarbeiten', nurBildschirm: false },
  senden_freigeben: { art: 'senden', meldungId: 'm1', clientId: 'c1', antwort: 'freigeben', nurBildschirm: false },
  senden_ok: { art: 'senden.ok', meldungId: 'm1' },
  senden_fehler: { art: 'senden.fehler', meldungId: 'm1', grund: 'eingabe_nicht_leer' },
  anrufen: { art: 'anrufen', meldung: M3, clientId: 'c1' },
};

/** Erwartung: [Zustand danach | Fehlercode, Effekte, endeGrund?] */
type Erwartung = { zu: AnrufZustand['name']; effekte: string[]; ende?: boolean } | { fehler: string };

const Z = (zu: AnrufZustand['name'], effekte: string[], ende = false): Erwartung => ({ zu, effekte, ende });
const F = (fehler: string): Erwartung => ({ fehler });

const TABELLE: Record<string, Record<AnrufZustand['name'], Erwartung>> = {
  neu_andere: {
    ruhe: Z('ruhe', ['einreihen', 'naechste', 'broadcast']),
    klingelt: Z('klingelt', ['einreihen', 'broadcast']),
    laeuft: Z('laeuft', ['einreihen', 'broadcast']),
    freigabe_nachfrage: Z('freigabe_nachfrage', ['einreihen', 'broadcast']),
    sendet: Z('sendet', ['einreihen', 'broadcast']),
  },
  neu_gleich: {
    ruhe: Z('ruhe', ['einreihen', 'naechste', 'broadcast']),
    klingelt: Z('klingelt', ['verwerfen', 'austragen', 'entnehmen', 'broadcast']),
    laeuft: Z('klingelt', ['verwerfen', 'austragen', 'entnehmen', 'broadcast'], true),
    freigabe_nachfrage: Z('klingelt', ['verwerfen', 'austragen', 'entnehmen', 'broadcast'], true),
    sendet: Z('sendet', ['einreihen', 'broadcast']),
  },
  klingeln: {
    ruhe: Z('klingelt', ['entnehmen', 'broadcast']),
    klingelt: F('ANRUF_BESETZT'),
    laeuft: F('ANRUF_BESETZT'),
    freigabe_nachfrage: F('ANRUF_BESETZT'),
    sendet: F('ANRUF_BESETZT'),
  },
  erledigt: {
    ruhe: Z('ruhe', ['austragen', 'broadcast']),
    klingelt: Z('ruhe', ['austragen', 'verwerfen', 'naechste', 'broadcast']),
    laeuft: Z('ruhe', ['austragen', 'verwerfen', 'naechste', 'broadcast'], true),
    freigabe_nachfrage: Z('ruhe', ['austragen', 'verwerfen', 'naechste', 'broadcast'], true),
    sendet: Z('sendet', ['austragen', 'broadcast']),
  },
  annehmen: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: Z('laeuft', ['broadcast']),
    laeuft: F('ANRUF_BESETZT'),
    freigabe_nachfrage: F('ANRUF_BESETZT'),
    sendet: F('ANRUF_BESETZT'),
  },
  ablehnen: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: Z('ruhe', ['ablehnen', 'naechste', 'broadcast']),
    laeuft: Z('ruhe', ['ablehnen', 'naechste', 'broadcast']),
    freigabe_nachfrage: Z('ruhe', ['ablehnen', 'naechste', 'broadcast']),
    sendet: F('INVALID_MESSAGE'),
  },
  spaeter: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: Z('ruhe', ['spaeter', 'naechste', 'broadcast']),
    laeuft: Z('ruhe', ['spaeter', 'naechste', 'broadcast']),
    freigabe_nachfrage: Z('ruhe', ['spaeter', 'naechste', 'broadcast']),
    sendet: F('INVALID_MESSAGE'),
  },
  auflegen: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: F('INVALID_MESSAGE'),
    laeuft: Z('ruhe', ['verwerfen', 'naechste', 'broadcast']),
    freigabe_nachfrage: Z('ruhe', ['verwerfen', 'naechste', 'broadcast']),
    sendet: F('INVALID_MESSAGE'),
  },
  client_weg: {
    ruhe: Z('ruhe', []),
    klingelt: Z('klingelt', []),
    laeuft: Z('ruhe', ['zurueck', 'naechste', 'broadcast'], true),
    freigabe_nachfrage: Z('ruhe', ['zurueck', 'naechste', 'broadcast'], true),
    sendet: Z('sendet', []),
  },
  niemand_da: {
    ruhe: Z('ruhe', ['schlange_leeren', 'broadcast']),
    klingelt: Z('ruhe', ['verwerfen', 'schlange_leeren', 'broadcast']),
    laeuft: Z('laeuft', ['schlange_leeren', 'broadcast']),
    freigabe_nachfrage: Z('freigabe_nachfrage', ['schlange_leeren', 'broadcast']),
    sendet: Z('sendet', ['schlange_leeren', 'broadcast']),
  },
  modus_aus: {
    ruhe: Z('ruhe', ['alles_leeren', 'broadcast']),
    klingelt: Z('ruhe', ['alles_leeren', 'broadcast']),
    laeuft: Z('ruhe', ['alles_leeren', 'broadcast'], true),
    freigabe_nachfrage: Z('ruhe', ['alles_leeren', 'broadcast'], true),
    sendet: Z('ruhe', ['alles_leeren', 'broadcast'], true),
  },
  freigeben_anfragen: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: F('INVALID_MESSAGE'),
    laeuft: Z('freigabe_nachfrage', ['broadcast']),
    freigabe_nachfrage: Z('freigabe_nachfrage', ['broadcast']),
    sendet: F('INVALID_MESSAGE'),
  },
  senden_ueberarbeiten: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: F('INVALID_MESSAGE'),
    laeuft: Z('sendet', ['senden', 'broadcast']),
    freigabe_nachfrage: Z('sendet', ['senden', 'broadcast']),
    sendet: F('INVALID_MESSAGE'),
  },
  senden_freigeben: {
    ruhe: F('MELDUNG_WEG'),
    klingelt: F('INVALID_MESSAGE'),
    laeuft: F('INVALID_MESSAGE'),
    freigabe_nachfrage: Z('sendet', ['senden', 'broadcast']),
    sendet: F('INVALID_MESSAGE'),
  },
  senden_ok: {
    ruhe: F('INVALID_MESSAGE'),
    klingelt: F('INVALID_MESSAGE'),
    laeuft: F('INVALID_MESSAGE'),
    freigabe_nachfrage: F('INVALID_MESSAGE'),
    sendet: Z('ruhe', ['verwerfen', 'naechste', 'broadcast']),
  },
  senden_fehler: {
    ruhe: F('INVALID_MESSAGE'),
    klingelt: F('INVALID_MESSAGE'),
    laeuft: F('INVALID_MESSAGE'),
    freigabe_nachfrage: F('INVALID_MESSAGE'),
    sendet: Z('laeuft', ['broadcast']),
  },
  anrufen: {
    ruhe: Z('laeuft', ['entnehmen', 'broadcast']),
    klingelt: Z('laeuft', ['zurueck', 'entnehmen', 'broadcast']),
    laeuft: F('ANRUF_BESETZT'),
    freigabe_nachfrage: F('ANRUF_BESETZT'),
    sendet: F('ANRUF_BESETZT'),
  },
};

describe('anrufUebergang — Tabelle Zustände × Ereignisse (D6)', () => {
  it('deckt alle Ereignisse und Zustände ab', () => {
    expect(Object.keys(TABELLE).sort()).toEqual(Object.keys(EREIGNISSE).sort());
  });

  for (const [ereignisName, zeile] of Object.entries(TABELLE)) {
    for (const [zustandName, erwartung] of Object.entries(zeile) as Array<[AnrufZustand['name'], Erwartung]>) {
      it(`${zustandName} × ${ereignisName}`, () => {
        const vorher = ZUSTAENDE[zustandName];
        const erg = anrufUebergang(vorher, EREIGNISSE[ereignisName], JETZT);
        if ('fehler' in erwartung) {
          expect(erg.fehler?.code).toBe(erwartung.fehler);
          expect(erg.fehler?.grund.length).toBeGreaterThan(0);
          expect(erg.zustand).toBe(vorher);
          expect(erg.effekte).toEqual([]);
        } else {
          expect(erg.fehler).toBeUndefined();
          expect(erg.zustand.name).toBe(erwartung.zu);
          expect(erg.effekte.map((e) => e.art)).toEqual(erwartung.effekte);
          expect(Boolean(erg.endeGrund)).toBe(Boolean(erwartung.ende));
        }
      });
    }
  }
});

describe('anrufUebergang — Einzelfälle', () => {
  it('annehmen setzt den Besitzer; erste Reaktion gewinnt (AN-S07)', () => {
    const erst = anrufUebergang(ZUSTAENDE.klingelt, { art: 'annehmen', meldungId: 'm1', clientId: 'c2' }, JETZT);
    expect(erst.zustand).toMatchObject({ name: 'laeuft', besitzer: 'c2' });
    const zweit = anrufUebergang(erst.zustand, { art: 'annehmen', meldungId: 'm1', clientId: 'c1' }, JETZT);
    expect(zweit.fehler?.code).toBe('ANRUF_BESETZT');
  });

  it('Nicht-Besitzer darf nicht senden, auflegen, freigeben (Review F6, F15)', () => {
    for (const e of [
      { art: 'auflegen', meldungId: 'm1', clientId: 'c2' },
      { art: 'freigeben.anfragen', meldungId: 'm1', clientId: 'c2', nurBildschirm: false, wortlaut: 'x' },
      { art: 'senden', meldungId: 'm1', clientId: 'c2', antwort: 'freigeben', nurBildschirm: false },
      { art: 'ablehnen', meldungId: 'm1', clientId: 'c2' },
    ] as AnrufEreignis[]) {
      const erg = anrufUebergang(ZUSTAENDE.freigabe_nachfrage, e, JETZT);
      expect(erg.fehler?.code).toBe('INVALID_MESSAGE');
    }
  });

  it('Freigeben nur nach der Nachfrage für dieselbe Meldung (Review F6)', () => {
    const fremd = anrufUebergang(ZUSTAENDE.freigabe_nachfrage, { art: 'senden', meldungId: 'mX', clientId: 'c1', antwort: 'freigeben', nurBildschirm: false }, JETZT);
    expect(fremd.fehler?.code).toBe('MELDUNG_WEG');
  });

  it('Freigabe-Nachfrage nur für Pläne mit Inhalt', () => {
    const rueck: AnrufZustand = { name: 'laeuft', meldung: M2, besitzer: 'c1', seit: 1 };
    expect(anrufUebergang(rueck, { art: 'freigeben.anfragen', meldungId: 'm2', clientId: 'c1', nurBildschirm: false, wortlaut: 'x' }, JETZT).fehler?.code).toBe('INVALID_MESSAGE');
    expect(anrufUebergang(ZUSTAENDE.laeuft, { art: 'freigeben.anfragen', meldungId: 'm1', clientId: 'c1', nurBildschirm: true, wortlaut: 'x' }, JETZT).fehler?.code).toBe('INVALID_MESSAGE');
  });

  it('Antwort muss zur Art passen; nur-Bildschirm-Rückfrage ist nicht per Stimme beantwortbar (AN-S11)', () => {
    const rueck: AnrufZustand = { name: 'laeuft', meldung: M2, besitzer: 'c1', seit: 1 };
    expect(anrufUebergang(rueck, { art: 'senden', meldungId: 'm2', clientId: 'c1', antwort: 'text', nurBildschirm: false }, JETZT).fehler?.code).toBe('INVALID_MESSAGE');
    expect(anrufUebergang(rueck, { art: 'senden', meldungId: 'm2', clientId: 'c1', antwort: 'rueckfrage', nurBildschirm: true }, JETZT).fehler?.code).toBe('INVALID_MESSAGE');
    expect(anrufUebergang(rueck, { art: 'senden', meldungId: 'm2', clientId: 'c1', antwort: 'rueckfrage', nurBildschirm: false }, JETZT).zustand.name).toBe('sendet');
    const fertig: AnrufZustand = { name: 'laeuft', meldung: MA, besitzer: 'c1', seit: 1 };
    expect(anrufUebergang(fertig, { art: 'senden', meldungId: 'ma', clientId: 'c1', antwort: 'text', nurBildschirm: true }, JETZT).zustand.name).toBe('sendet');
  });

  it('Senden scheitert endgültig bei schon beantwortet / Sitzung weg → ruhe', () => {
    for (const grund of ['schon_beantwortet', 'sitzung_weg'] as const) {
      const erg = anrufUebergang(ZUSTAENDE.sendet, { art: 'senden.fehler', meldungId: 'm1', grund }, JETZT);
      expect(erg.zustand.name).toBe('ruhe');
      expect(erg.effekte.map((e) => e.art)).toEqual(['verwerfen', 'naechste', 'broadcast']);
    }
  });

  it('erledigt im laufenden Anruf sagt „schon beantwortet" an (FA-11)', () => {
    expect(anrufUebergang(ZUSTAENDE.laeuft, { art: 'meldung.erledigt', sessionId: 's1' }, JETZT).endeGrund).toBe(ENDE_SCHON_BEANTWORTET);
  });

  it('erledigt einer anderen Sitzung lässt den Anruf unverändert', () => {
    const erg = anrufUebergang(ZUSTAENDE.laeuft, { art: 'meldung.erledigt', sessionId: 's9' }, JETZT);
    expect(erg.zustand).toBe(ZUSTAENDE.laeuft);
    expect(erg.effekte.map((e) => e.art)).toEqual(['austragen', 'broadcast']);
  });

  it('client.weg eines anderen Fensters lässt den Anruf laufen', () => {
    expect(anrufUebergang(ZUSTAENDE.laeuft, { art: 'client.weg', clientId: 'c2' }, JETZT).zustand).toBe(ZUSTAENDE.laeuft);
  });

  it('anrufen bei klingelnder Meldung derselben Sitzung verwirft die klingelnde', () => {
    const erg = anrufUebergang(ZUSTAENDE.klingelt, { art: 'anrufen', meldung: { id: 'm9', sessionId: 's1', art: 'plan' }, clientId: 'c1' }, JETZT);
    expect(erg.effekte.map((e) => e.art)).toEqual(['verwerfen', 'entnehmen', 'broadcast']);
    expect(erg.zustand).toMatchObject({ name: 'laeuft', besitzer: 'c1', seit: JETZT });
  });
});
