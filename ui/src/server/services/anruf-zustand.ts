/**
 * Anruf-Zustand (INT-2026-025, Plan D6, ext. Review 7).
 *
 * Reine Übergangsfunktion: `anrufUebergang(zustand, ereignis, jetzt)` liefert
 * den neuen Zustand und eine Liste von Effekten. Kein IO, keine Timer, keine
 * Warteschlange — der AnrufService führt die Effekte aus (Schlange pflegen,
 * Sender starten, nächste Meldung klingeln lassen, an Clients senden).
 *
 * Zustände: `ruhe` → `klingelt(m)` → `laeuft(m, besitzer)` →
 * [`freigabe_nachfrage(m, besitzer)`] → `sendet(m, besitzer)` → `offen(sitzung, besitzer)`.
 *
 * `offen` (INT-2026-027): Nach erfolgreichem Senden bleibt die Leitung bis `bis`
 * für dieselbe Sitzung offen. Eine neue Meldung dieser Sitzung geht ohne Klingeln
 * nach `laeuft`; andere Meldungen werden nur eingereiht (`naechste` wirkt nur in
 * `ruhe`). Auflegen, Frist (`leitung.frist`), Fenster weg oder Modus aus → `ruhe`.
 * `offen` hat einen Besitzer, aber keine Meldung.
 *
 * Unerlaubte Paare (falscher Zustand, fremde Meldung, fremder Besitzer)
 * lassen den Zustand unverändert und tragen einen Fehler mit Code und Grund.
 */

import { ANRUF_LEITUNG_OFFEN_MS, type AnrufArt, type AnrufAntwort, type AnrufErrorCode, type AnrufSendeGrund } from '../../shared/types/anruf.protocol.js';

/** Was der Zustand von einer Meldung wissen muss. */
export interface ZustandMeldung {
  id: string;
  sessionId: string;
  art: AnrufArt;
}

export type AnrufZustand =
  | { name: 'ruhe' }
  | { name: 'klingelt'; meldung: ZustandMeldung; seit: number }
  | { name: 'laeuft'; meldung: ZustandMeldung; besitzer: string; seit: number }
  | { name: 'freigabe_nachfrage'; meldung: ZustandMeldung; besitzer: string; seit: number; wortlaut: string }
  | { name: 'sendet'; meldung: ZustandMeldung; besitzer: string; seit: number }
  /** `leitungId`: ID der zuletzt gesendeten Meldung (für `auflegen` und `leitung.frist`). */
  | { name: 'offen'; sessionId: string; besitzer: string; leitungId: string; seit: number; bis: number };

export type AnrufEreignis =
  /** Eine neue Meldung ist entstanden (D5a). */
  | { art: 'meldung.neu'; meldung: ZustandMeldung }
  /** Der Dienst hat den Kopf der Schlange gewählt (nur in `ruhe` sinnvoll). */
  | { art: 'klingeln'; meldung: ZustandMeldung }
  /** Die Meldungen einer Sitzung sind anderweitig erledigt (FA-11). */
  | { art: 'meldung.erledigt'; sessionId: string }
  | { art: 'annehmen'; meldungId: string; clientId: string }
  | { art: 'ablehnen'; meldungId: string; clientId: string }
  | { art: 'spaeter'; meldungId: string; clientId: string }
  | { art: 'auflegen'; meldungId: string; clientId: string }
  | { art: 'client.weg'; clientId: string }
  /** Kein lokaler fähiger Client mehr, Kulanz abgelaufen (O2). */
  | { art: 'niemand_da' }
  | { art: 'modus.aus' }
  | { art: 'freigeben.anfragen'; meldungId: string; clientId: string; nurBildschirm: boolean; wortlaut: string }
  | { art: 'senden'; meldungId: string; clientId: string; antwort: AnrufAntwort['art']; nurBildschirm: boolean }
  /** `wartend`: Meldung derselben Sitzung, die schon in der Schlange steht (AK-04). */
  | { art: 'senden.ok'; meldungId: string; wartend?: ZustandMeldung }
  | { art: 'senden.fehler'; meldungId: string; grund: AnrufSendeGrund }
  /** Glocke „Anrufen" (FA-12): Anruf beginnt ohne Klingeln. */
  | { art: 'anrufen'; meldung: ZustandMeldung; clientId: string }
  /** Frist der offenen Leitung abgelaufen (INT-2026-027, AK-06). */
  | { art: 'leitung.frist'; leitungId: string };

export type AnrufEffekt =
  /** Meldung in die Schlange (bzw. dort die der Sitzung ersetzen, FA-08). */
  | { art: 'einreihen'; meldungId: string }
  /** Einträge der Sitzung aus der Schlange (FA-11). */
  | { art: 'austragen'; sessionId: string }
  /** Meldung aus der Schlange nehmen — sie klingelt jetzt bzw. läuft. */
  | { art: 'entnehmen'; meldungId: string }
  /** Meldung an ihren alten Platz zurück (AN-S08, FA-12). */
  | { art: 'zurueck'; meldungId: string }
  | { art: 'ablehnen'; meldungId: string }
  | { art: 'spaeter'; meldungId: string }
  /** Meldung ist erledigt oder aufgelegt: vergessen (nicht mehr in der Schlange). */
  | { art: 'verwerfen'; meldungId: string }
  /** Sender starten. */
  | { art: 'senden'; meldungId: string }
  /** Nächste wartende Meldung klingeln lassen, falls `ruhe`. */
  | { art: 'naechste' }
  | { art: 'schlange_leeren' }
  /** Modus aus: Schlange, Inhalte, Erkennung, Kontext-Dateien. */
  | { art: 'alles_leeren' }
  | { art: 'broadcast' };

export interface AnrufFehler {
  code: AnrufErrorCode;
  grund: string;
}

export interface AnrufUebergangErgebnis {
  zustand: AnrufZustand;
  effekte: AnrufEffekt[];
  fehler?: AnrufFehler;
  /** Ansage, mit der ein Anruf ohne Senden endete. */
  endeGrund?: string;
}

export const ENDE_SCHON_BEANTWORTET = 'In der Sitzung schon beantwortet.';
export const ENDE_MODUS_AUS = 'Anrufmodus ausgeschaltet.';
export const ENDE_FENSTER_WEG = 'Das Fenster des Anrufs ist weg.';
export const ENDE_LEITUNG_FRIST = 'Leitung geschlossen.';

/** Gründe, bei denen nach gescheitertem Senden nichts mehr zu beantworten ist. */
const SENDE_GRUND_ENDE: ReadonlySet<AnrufSendeGrund> = new Set<AnrufSendeGrund>(['schon_beantwortet', 'sitzung_weg']);

/** Welche Antwort-Art zu welcher Meldungs-Art passt. */
const ANTWORT_FUER_ART: Record<AnrufArt, ReadonlyArray<AnrufAntwort['art']>> = {
  rueckfrage: ['rueckfrage'],
  plan: ['freigeben', 'ueberarbeiten'],
  fertig: ['text'],
};

const RUHE: AnrufZustand = { name: 'ruhe' };

function unveraendert(zustand: AnrufZustand, code: AnrufErrorCode, grund: string): AnrufUebergangErgebnis {
  return { zustand, effekte: [], fehler: { code, grund } };
}

export type MitMeldung = Extract<AnrufZustand, { meldung: ZustandMeldung }>;
export type MitBesitzer = Extract<AnrufZustand, { besitzer: string }>;
export type Offen = Extract<AnrufZustand, { name: 'offen' }>;
/** Angenommener Anruf mit Meldung: `laeuft`, `freigabe_nachfrage`, `sendet`. */
type Angenommen = Extract<MitMeldung, { besitzer: string }>;

export function hatMeldung(z: AnrufZustand): z is MitMeldung {
  return 'meldung' in z;
}

export function hatBesitzer(z: AnrufZustand): z is MitBesitzer {
  return 'besitzer' in z;
}

export function istOffen(z: AnrufZustand): z is Offen {
  return z.name === 'offen';
}

/**
 * Prüft, ob das Ereignis den laufenden Anruf seines Besitzers betrifft.
 * Liefert den Fehler oder `null`.
 */
function pruefeBesitz(z: AnrufZustand, meldungId: string, clientId: string): AnrufFehler | null {
  if (!hatMeldung(z) || z.meldung.id !== meldungId) return { code: 'MELDUNG_WEG', grund: 'Diese Meldung ist nicht (mehr) der aktuelle Anruf.' };
  if (!hatBesitzer(z)) return { code: 'INVALID_MESSAGE', grund: 'Der Anruf ist noch nicht angenommen.' };
  if (z.besitzer !== clientId) return { code: 'INVALID_MESSAGE', grund: 'Der Anruf läuft in einem anderen Fenster.' };
  return null;
}

export function anrufUebergang(zustand: AnrufZustand, ereignis: AnrufEreignis, jetzt: number): AnrufUebergangErgebnis {
  switch (ereignis.art) {
    case 'meldung.neu': {
      const m = ereignis.meldung;
      if (istOffen(zustand) && zustand.sessionId === m.sessionId) {
        // AK-03: dieselbe Sitzung meldet sich in der offenen Leitung — ohne Klingeln weiter.
        return {
          zustand: { name: 'laeuft', meldung: m, besitzer: zustand.besitzer, seit: jetzt },
          effekte: [{ art: 'entnehmen', meldungId: m.id }, { art: 'broadcast' }],
        };
      }
      if (hatMeldung(zustand) && zustand.meldung.sessionId === m.sessionId) {
        // Dieselbe Sitzung meldet neu (FA-08, D5a Wechsel rueckfrage↔plan).
        if (zustand.name === 'sendet') {
          // Im Senden ist der Wechsel die eigene Bestätigung; die neue Meldung wartet.
          return { zustand, effekte: [{ art: 'einreihen', meldungId: m.id }, { art: 'broadcast' }] };
        }
        const ende = zustand.name === 'klingelt' ? undefined : ENDE_SCHON_BEANTWORTET;
        return {
          zustand: { name: 'klingelt', meldung: m, seit: jetzt },
          effekte: [
            { art: 'verwerfen', meldungId: zustand.meldung.id },
            { art: 'austragen', sessionId: m.sessionId },
            { art: 'entnehmen', meldungId: m.id },
            { art: 'broadcast' },
          ],
          ...(ende ? { endeGrund: ende } : {}),
        };
      }
      const effekte: AnrufEffekt[] = [{ art: 'einreihen', meldungId: m.id }];
      if (zustand.name === 'ruhe') effekte.push({ art: 'naechste' });
      effekte.push({ art: 'broadcast' });
      return { zustand, effekte };
    }

    case 'klingeln': {
      if (zustand.name !== 'ruhe') return unveraendert(zustand, 'ANRUF_BESETZT', 'Es klingelt oder läuft schon ein Anruf.');
      return {
        zustand: { name: 'klingelt', meldung: ereignis.meldung, seit: jetzt },
        effekte: [{ art: 'entnehmen', meldungId: ereignis.meldung.id }, { art: 'broadcast' }],
      };
    }

    case 'meldung.erledigt': {
      const effekte: AnrufEffekt[] = [{ art: 'austragen', sessionId: ereignis.sessionId }];
      if (!hatMeldung(zustand) || zustand.meldung.sessionId !== ereignis.sessionId || zustand.name === 'sendet') {
        effekte.push({ art: 'broadcast' });
        return { zustand, effekte };
      }
      effekte.push({ art: 'verwerfen', meldungId: zustand.meldung.id }, { art: 'naechste' }, { art: 'broadcast' });
      return {
        zustand: RUHE,
        effekte,
        ...(zustand.name === 'klingelt' ? {} : { endeGrund: ENDE_SCHON_BEANTWORTET }),
      };
    }

    case 'annehmen': {
      if (!hatMeldung(zustand) || zustand.meldung.id !== ereignis.meldungId) {
        return unveraendert(zustand, 'MELDUNG_WEG', 'Diese Meldung klingelt nicht mehr.');
      }
      if (zustand.name !== 'klingelt') return unveraendert(zustand, 'ANRUF_BESETZT', 'Der Anruf wurde schon angenommen.');
      return {
        zustand: { name: 'laeuft', meldung: zustand.meldung, besitzer: ereignis.clientId, seit: jetzt },
        effekte: [{ art: 'broadcast' }],
      };
    }

    case 'ablehnen':
    case 'spaeter': {
      if (!hatMeldung(zustand) || zustand.meldung.id !== ereignis.meldungId) {
        return unveraendert(zustand, 'MELDUNG_WEG', 'Diese Meldung ist nicht (mehr) der aktuelle Anruf.');
      }
      if (zustand.name === 'sendet') return unveraendert(zustand, 'INVALID_MESSAGE', 'Die Antwort wird gerade gesendet.');
      if (hatBesitzer(zustand) && zustand.besitzer !== ereignis.clientId) {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Der Anruf läuft in einem anderen Fenster.');
      }
      return {
        zustand: RUHE,
        effekte: [{ art: ereignis.art, meldungId: zustand.meldung.id }, { art: 'naechste' }, { art: 'broadcast' }],
      };
    }

    case 'auflegen': {
      if (istOffen(zustand)) {
        if (zustand.leitungId !== ereignis.meldungId) return unveraendert(zustand, 'MELDUNG_WEG', 'Diese Leitung ist nicht (mehr) offen.');
        if (zustand.besitzer !== ereignis.clientId) return unveraendert(zustand, 'INVALID_MESSAGE', 'Die Leitung ist in einem anderen Fenster offen.');
        // AK-07, AK-10: Knopf „Auflegen" — ohne Ansage, die nächste wartende Meldung klingelt.
        return { zustand: RUHE, effekte: [{ art: 'naechste' }, { art: 'broadcast' }] };
      }
      const fehler = pruefeBesitz(zustand, ereignis.meldungId, ereignis.clientId);
      if (fehler) return unveraendert(zustand, fehler.code, fehler.grund);
      if (zustand.name === 'sendet') return unveraendert(zustand, 'INVALID_MESSAGE', 'Die Antwort wird gerade gesendet.');
      // FA-25: ohne Senden aufgelegt — die Glocke bleibt, die Meldung klingelt nicht erneut.
      const m = (zustand as MitMeldung).meldung;
      return { zustand: RUHE, effekte: [{ art: 'verwerfen', meldungId: m.id }, { art: 'naechste' }, { art: 'broadcast' }] };
    }

    case 'client.weg': {
      if (istOffen(zustand)) {
        // AK-08: Fenster der offenen Leitung weg — ohne Meldung gibt es nichts zurückzulegen.
        if (zustand.besitzer !== ereignis.clientId) return { zustand, effekte: [] };
        return { zustand: RUHE, effekte: [{ art: 'naechste' }, { art: 'broadcast' }] };
      }
      if (!hatBesitzer(zustand) || zustand.besitzer !== ereignis.clientId || zustand.name === 'sendet') {
        return { zustand, effekte: [] };
      }
      // AN-S08: Anruf endet ohne Senden, Meldung an ihren Platz zurück.
      return {
        zustand: RUHE,
        effekte: [{ art: 'zurueck', meldungId: zustand.meldung.id }, { art: 'naechste' }, { art: 'broadcast' }],
        endeGrund: ENDE_FENSTER_WEG,
      };
    }

    case 'niemand_da': {
      if (zustand.name === 'klingelt') {
        return { zustand: RUHE, effekte: [{ art: 'verwerfen', meldungId: zustand.meldung.id }, { art: 'schlange_leeren' }, { art: 'broadcast' }] };
      }
      return { zustand, effekte: [{ art: 'schlange_leeren' }, { art: 'broadcast' }] };
    }

    case 'modus.aus': {
      return {
        zustand: RUHE,
        effekte: [{ art: 'alles_leeren' }, { art: 'broadcast' }],
        ...(hatBesitzer(zustand) ? { endeGrund: ENDE_MODUS_AUS } : {}),
      };
    }

    case 'freigeben.anfragen': {
      const fehler = pruefeBesitz(zustand, ereignis.meldungId, ereignis.clientId);
      if (fehler) return unveraendert(zustand, fehler.code, fehler.grund);
      const z = zustand as Angenommen;
      if (z.name === 'sendet') return unveraendert(zustand, 'INVALID_MESSAGE', 'Die Antwort wird gerade gesendet.');
      if (z.meldung.art !== 'plan' || ereignis.nurBildschirm) {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Freigeben geht nur bei einer Plan-Freigabe mit Inhalt.');
      }
      return {
        zustand: { name: 'freigabe_nachfrage', meldung: z.meldung, besitzer: z.besitzer, seit: z.seit, wortlaut: ereignis.wortlaut },
        effekte: [{ art: 'broadcast' }],
      };
    }

    case 'senden': {
      const fehler = pruefeBesitz(zustand, ereignis.meldungId, ereignis.clientId);
      if (fehler) return unveraendert(zustand, fehler.code, fehler.grund);
      const z = zustand as Angenommen;
      if (z.name === 'sendet') return unveraendert(zustand, 'INVALID_MESSAGE', 'Die Antwort wird gerade gesendet.');
      if (!ANTWORT_FUER_ART[z.meldung.art].includes(ereignis.antwort)) {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Diese Antwort passt nicht zur Art der Meldung.');
      }
      if (ereignis.nurBildschirm && z.meldung.art !== 'fertig') {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Die Meldung wurde nur am Bildschirm erkannt — bitte im Terminal beantworten.');
      }
      // Review F6: Freigeben nur nach der Nachfrage desselben Besitzers für dieselbe Meldung.
      if (ereignis.antwort === 'freigeben' && z.name !== 'freigabe_nachfrage') {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Freigeben braucht erst die Nachfrage (anruf:freigeben.anfragen).');
      }
      return {
        zustand: { name: 'sendet', meldung: z.meldung, besitzer: z.besitzer, seit: z.seit },
        effekte: [{ art: 'senden', meldungId: z.meldung.id }, { art: 'broadcast' }],
      };
    }

    case 'senden.ok': {
      if (zustand.name !== 'sendet' || zustand.meldung.id !== ereignis.meldungId) {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Es wird gerade nichts gesendet.');
      }
      const alt = zustand.meldung;
      const w = ereignis.wartend;
      if (w && w.sessionId === alt.sessionId) {
        // AK-04: dieselbe Sitzung hat sich schon während des Sendens neu gemeldet — direkt durchstellen.
        return {
          zustand: { name: 'laeuft', meldung: w, besitzer: zustand.besitzer, seit: jetzt },
          effekte: [{ art: 'verwerfen', meldungId: alt.id }, { art: 'entnehmen', meldungId: w.id }, { art: 'broadcast' }],
        };
      }
      // AK-01, AK-05, AK-09: Leitung bleibt offen; kein `naechste`, andere Sitzungen warten.
      return {
        zustand: { name: 'offen', sessionId: alt.sessionId, besitzer: zustand.besitzer, leitungId: alt.id, seit: jetzt, bis: jetzt + ANRUF_LEITUNG_OFFEN_MS },
        effekte: [{ art: 'verwerfen', meldungId: alt.id }, { art: 'broadcast' }],
      };
    }

    case 'senden.fehler': {
      if (zustand.name !== 'sendet' || zustand.meldung.id !== ereignis.meldungId) {
        return unveraendert(zustand, 'INVALID_MESSAGE', 'Es wird gerade nichts gesendet.');
      }
      if (SENDE_GRUND_ENDE.has(ereignis.grund)) {
        return {
          zustand: RUHE,
          effekte: [{ art: 'verwerfen', meldungId: zustand.meldung.id }, { art: 'naechste' }, { art: 'broadcast' }],
        };
      }
      // Anruf bleibt offen: Grund ansagen, erkannter Text bleibt sichtbar (Spec §4).
      return {
        zustand: { name: 'laeuft', meldung: zustand.meldung, besitzer: zustand.besitzer, seit: zustand.seit },
        effekte: [{ art: 'broadcast' }],
      };
    }

    case 'anrufen': {
      if (hatBesitzer(zustand)) return unveraendert(zustand, 'ANRUF_BESETZT', 'Es läuft schon ein Anruf.');
      const m = ereignis.meldung;
      const effekte: AnrufEffekt[] = [];
      if (zustand.name === 'klingelt') {
        // FA-12: die klingelnde geht an ihren Platz zurück — außer es ist dieselbe Sitzung.
        effekte.push(
          zustand.meldung.sessionId === m.sessionId
            ? { art: 'verwerfen', meldungId: zustand.meldung.id }
            : { art: 'zurueck', meldungId: zustand.meldung.id }
        );
      }
      effekte.push({ art: 'entnehmen', meldungId: m.id }, { art: 'broadcast' });
      return { zustand: { name: 'laeuft', meldung: m, besitzer: ereignis.clientId, seit: jetzt }, effekte };
    }

    case 'leitung.frist': {
      // Ein veralteter Timer ist normal (R6): ohne passende offene Leitung ändert sich nichts.
      if (!istOffen(zustand) || zustand.leitungId !== ereignis.leitungId) return { zustand, effekte: [] };
      return { zustand: RUHE, effekte: [{ art: 'naechste' }, { art: 'broadcast' }], endeGrund: ENDE_LEITUNG_FRIST };
    }
  }
}
