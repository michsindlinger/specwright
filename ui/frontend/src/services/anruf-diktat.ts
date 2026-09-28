/**
 * Diktat (INT-2026-026, D3) — the answer spoken so far, put together from
 * numbered pieces whose recognition may come back out of order. Only the
 * gap-free prefix counts; a result for a number that was already given up
 * (timeout, cleared) is dropped. Pure, memory only (FA-22).
 */

interface Stueck {
  dauer: number;
  endeSek: number;
  epoche: number;
  /** undefined = recognition pending; null = nothing understood. */
  text?: string | null;
}

export class Diktat {
  private naechste = 0;
  private bis = 0;
  private epoche = 0;
  private readonly stuecke = new Map<number, Stueck>();

  /** Recognised text so far (the held text while {@link gehalten}). */
  text = '';
  /** Text spoken since the microphone was last opened ({@link markiere}) — single-word commands look only at this. */
  neu = '';
  /** Seconds of speech sent for this question (FA-11). */
  sekunden = 0;
  /** Sample time (of the current opening) at which the last recognised words ended. */
  letzteSpracheSek: number | undefined;
  /** Text is fixed after a failed send or „zu lang": nothing more is appended (D6). */
  gehalten = false;

  /** Pieces sent whose result is not yet in. */
  get offen(): number {
    return this.naechste - this.bis;
  }

  /** Registers a spoken piece and returns its number. */
  neuesStueck(dauer: number, endeSek: number): number {
    const nr = this.naechste++;
    this.stuecke.set(nr, { dauer, endeSek, epoche: this.epoche });
    this.sekunden += dauer;
    return nr;
  }

  /**
   * Result for piece `nr` (null = nothing understood). Returns false when the
   * number is unknown or already given up. Consumes the gap-free prefix.
   */
  ergebnis(nr: number, text: string | null): boolean {
    const s = this.stuecke.get(nr);
    if (!s || nr < this.bis || s.text !== undefined) return false;
    s.text = text === null ? null : text.trim();
    for (let n = this.bis; ; n++) {
      const t = this.stuecke.get(n);
      if (!t || t.text === undefined) break;
      if (t.text) {
        if (!this.gehalten) this.text = verbinde(this.text, t.text);
        this.neu = verbinde(this.neu, t.text);
        if (t.epoche === this.epoche) this.letzteSpracheSek = Math.max(this.letzteSpracheSek ?? 0, t.endeSek);
      }
      this.stuecke.delete(n);
      this.bis = n + 1;
    }
    return true;
  }

  /** Microphone opened: new sample clock, single words count from here. */
  markiere(): void {
    this.epoche++;
    this.neu = '';
    this.letzteSpracheSek = undefined;
  }

  /** Forget everything (send, next question, „Antwort verwerfen", ambiguity, hang-up). */
  leeren(): void {
    this.text = '';
    this.neu = '';
    this.sekunden = 0;
    this.gehalten = false;
    this.bis = this.naechste;
    this.stuecke.clear();
  }

  halten(): void {
    this.gehalten = true;
  }
}

function verbinde(a: string, b: string): string {
  return a ? `${a} ${b}` : b;
}
