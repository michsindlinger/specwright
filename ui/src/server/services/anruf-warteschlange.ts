/**
 * Warteschlange des Anrufmodus (INT-2026-025, Plan D5).
 *
 * Reine Logik ohne IO und ohne Timer: der AnrufService fragt `naechste()` und
 * stellt selbst einen Timer auf `wartenBis`. Die Uhr ist injizierbar, damit
 * die Tests Zeit ohne Fake-Timer vorspulen können.
 *
 * Reihenfolge `(rang, seit)`: Rang 0 = Rückfrage/Plan, 1 = fertig, 2 = „später"
 * (FA-07, FA-10). Je Sitzung höchstens ein Eintrag (FA-08). Eine abgelehnte
 * Sitzung trägt eine Marke bis zu ihrer nächsten Meldung (FA-09).
 *
 * Ein klingelnder oder angenommener Anruf liegt nicht in der Schlange (der
 * Dienst nimmt ihn per `entnehmen` heraus). Deshalb nehmen `ablehnen` und
 * `spaeter` neben der ID auch den entnommenen Eintrag selbst an.
 */

import { ANRUF_SPAETER_MS, type AnrufArt } from '../../shared/types/anruf.protocol.js';

export type AnrufRang = 0 | 1 | 2;

export interface AnrufEintrag {
  id: string;
  sessionId: string;
  art: AnrufArt;
  /** Eingang (ms seit Epoche); bei „später" der Zeitpunkt des Zurückstellens. */
  seit: number;
  rang: AnrufRang;
  /** Frühester Zeitpunkt zum erneuten Klingeln (AN-S09). */
  nichtVor?: number;
}

export interface AnrufNeueMeldung {
  id: string;
  sessionId: string;
  art: AnrufArt;
}

export type AnrufNaechste = { eintrag: AnrufEintrag } | { wartenBis: number };

function rangFuerArt(art: AnrufArt): AnrufRang {
  return art === 'fertig' ? 1 : 0;
}

function vergleich(a: AnrufEintrag, b: AnrufEintrag): number {
  return a.rang - b.rang || a.seit - b.seit;
}

export class AnrufWarteschlange {
  private eintraege: AnrufEintrag[] = [];
  private readonly abgelehnt = new Set<string>();

  constructor(private readonly uhr: () => number = Date.now) {}

  /** Neue Meldung: ersetzt den Eintrag derselben Sitzung (FA-08), hebt deren Ablehnung auf. */
  neu(meldung: AnrufNeueMeldung): AnrufEintrag {
    this.entferneSitzung(meldung.sessionId);
    this.abgelehnt.delete(meldung.sessionId);
    const eintrag: AnrufEintrag = {
      id: meldung.id,
      sessionId: meldung.sessionId,
      art: meldung.art,
      seit: this.uhr(),
      rang: rangFuerArt(meldung.art),
    };
    this.einfuegen(eintrag);
    return eintrag;
  }

  /** Ablehnen (FA-09): Eintrag raus, Sitzung als abgelehnt markiert. Liefert den Eintrag oder null. */
  ablehnen(idOderEintrag: string | AnrufEintrag): AnrufEintrag | null {
    const eintrag = this.aufloesen(idOderEintrag);
    if (!eintrag) return null;
    this.entferneId(eintrag.id);
    this.abgelehnt.add(eintrag.sessionId);
    return eintrag;
  }

  istAbgelehnt(sessionId: string): boolean {
    return this.abgelehnt.has(sessionId);
  }

  /**
   * „Später" (FA-10): Rang 2, `seit = jetzt`, also hinter alle wartenden.
   * Ist sie danach die einzige, klingelt sie frühestens nach ANRUF_SPAETER_MS (AN-S09).
   */
  spaeter(idOderEintrag: string | AnrufEintrag): AnrufEintrag | null {
    const alt = this.aufloesen(idOderEintrag);
    if (!alt) return null;
    this.entferneId(alt.id);
    const jetzt = this.uhr();
    const eintrag: AnrufEintrag = { id: alt.id, sessionId: alt.sessionId, art: alt.art, seit: jetzt, rang: 2 };
    if (this.eintraege.length === 0) eintrag.nichtVor = jetzt + ANRUF_SPAETER_MS;
    this.einfuegen(eintrag);
    return eintrag;
  }

  /**
   * Meldung geht an ihren alten Platz zurück (abgebrochener/klingelnder Anruf,
   * AN-S08): ursprüngliches `seit`/`rang` bleiben. Hat die Sitzung inzwischen
   * eine neuere Meldung in der Schlange, gewinnt die neuere → false.
   */
  zurueck(eintrag: AnrufEintrag): boolean {
    if (this.eintragFuerSitzung(eintrag.sessionId)) return false;
    this.einfuegen({ ...eintrag });
    return true;
  }

  /** Nimmt einen Eintrag heraus (z. B. weil er jetzt klingelt). */
  entnehmen(id: string): AnrufEintrag | null {
    return this.entferneId(id);
  }

  /** In der Sitzung beantwortet (FA-11): Eintrag der Sitzung raus. */
  erledigt(sessionId: string): AnrufEintrag | null {
    return this.entferneSitzung(sessionId);
  }

  /** Erster klingelbereiter Eintrag; sonst frühester `nichtVor`; leer → null. */
  naechste(): AnrufNaechste | null {
    if (this.eintraege.length === 0) return null;
    const jetzt = this.uhr();
    let wartenBis = Number.POSITIVE_INFINITY;
    for (const eintrag of this.eintraege) {
      if (eintrag.nichtVor === undefined || eintrag.nichtVor <= jetzt) return { eintrag: { ...eintrag } };
      wartenBis = Math.min(wartenBis, eintrag.nichtVor);
    }
    return { wartenBis };
  }

  groesse(): number {
    return this.eintraege.length;
  }

  /** Alles leeren (Modus aus, A5), auch die Ablehnungs-Marken. */
  leeren(): void {
    this.eintraege = [];
    this.abgelehnt.clear();
  }

  eintragFuerSitzung(sessionId: string): AnrufEintrag | null {
    const eintrag = this.eintraege.find((e) => e.sessionId === sessionId);
    return eintrag ? { ...eintrag } : null;
  }

  /** Kopie in Reihenfolge. */
  alle(): AnrufEintrag[] {
    return this.eintraege.map((e) => ({ ...e }));
  }

  private aufloesen(idOderEintrag: string | AnrufEintrag): AnrufEintrag | null {
    if (typeof idOderEintrag !== 'string') return { ...idOderEintrag };
    const eintrag = this.eintraege.find((e) => e.id === idOderEintrag);
    return eintrag ? { ...eintrag } : null;
  }

  private einfuegen(eintrag: AnrufEintrag): void {
    this.eintraege.push(eintrag);
    this.eintraege.sort(vergleich);
  }

  private entferneId(id: string): AnrufEintrag | null {
    const index = this.eintraege.findIndex((e) => e.id === id);
    if (index < 0) return null;
    const [eintrag] = this.eintraege.splice(index, 1);
    return eintrag;
  }

  private entferneSitzung(sessionId: string): AnrufEintrag | null {
    const index = this.eintraege.findIndex((e) => e.sessionId === sessionId);
    if (index < 0) return null;
    const [eintrag] = this.eintraege.splice(index, 1);
    return eintrag;
  }
}
