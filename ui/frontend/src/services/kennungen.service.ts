/**
 * kennungen.service — the Kennungen of the document on the Vorhaben page
 * (INT-2026-011, FA-13/FA-16/FA-17): code → reference and snippet, derived
 * by the document reader from its anchors and set by the page/view once per
 * loaded document. The terminal's link provider reads it to mark exactly
 * these codes as links — nothing else, so no false hits. Transient: cleared
 * when the page goes away; never stored (AR-05 does not apply, no user state).
 * Same shape as themeService: one instance, get/subscribe.
 */

export interface KennungEintrag {
  /** Derived reference of the block, e.g. `FA-03 · §3`. */
  ref: string;
  /** Normalized block text (≤ 200 chars) — the tooltip shows it. */
  snippet: string;
}

type KennungenListener = (kennungen: ReadonlyMap<string, KennungEintrag>) => void;

const EMPTY: ReadonlyMap<string, KennungEintrag> = new Map();

class KennungenService {
  private kennungen: ReadonlyMap<string, KennungEintrag> = EMPTY;
  private readonly listeners = new Set<KennungenListener>();

  get(): ReadonlyMap<string, KennungEintrag> {
    return this.kennungen;
  }

  set(kennungen: ReadonlyMap<string, KennungEintrag>): void {
    this.kennungen = kennungen;
    for (const cb of this.listeners) cb(kennungen);
  }

  clear(): void {
    if (this.kennungen.size === 0) return;
    this.set(EMPTY);
  }

  subscribe(cb: KennungenListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

export const kennungenService = new KennungenService();
