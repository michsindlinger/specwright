/**
 * Sprechpausen (INT-2026-026, D2) — cuts the microphone stream into spoken
 * pieces. Level per 30 ms frame against a learned noise floor; one second
 * below the threshold after speech closes a piece, which then goes to the
 * local recognition. Pure: no clock, no browser API — time is sample time
 * since opening, so tests are deterministic and background-tab timer
 * throttling does not matter.
 */

import { ANRUF_AUDIO_MAX_S, ANRUF_PAUSE_MS } from '../../../src/shared/types/anruf.protocol.js';
import { ANRUF_RATE, downsampleAuf16k, rms } from '../../../src/shared/anruf-audio.js';

/** Lower bound of the speech threshold (≈ −40 dBFS, INT-2026-025 D3). */
export const ANRUF_RMS_SCHWELLE = 0.01;
/** Upper bound, so a spoilt noise floor never deafens the call (R3). */
export const ANRUF_RMS_SCHWELLE_MAX = 0.05;
/** Pieces shorter than this (with lead-in and tail) are dropped. */
export const ANRUF_MIN_DAUER_S = 0.4;

export const RAHMEN_MS = 30;
export const VORLAUF_MS = 300;
export const START_RAHMEN = 3;
export const RAUSCH_FAKTOR = 3;
/** Kept after the last loud frame of a piece (end of the last syllable). */
const NACHLAUF_MS = 300;

const RAHMEN_PROBEN = (ANRUF_RATE * RAHMEN_MS) / 1000;
const RAHMEN_S = RAHMEN_MS / 1000;
const VORLAUF_RAHMEN = Math.round(VORLAUF_MS / RAHMEN_MS);
const NACHLAUF_RAHMEN = Math.round(NACHLAUF_MS / RAHMEN_MS);
const PAUSE_RAHMEN = Math.ceil(ANRUF_PAUSE_MS / RAHMEN_MS);
const MAX_RAHMEN = Math.floor((ANRUF_AUDIO_MAX_S * 1000) / RAHMEN_MS);
const PERZENTIL = 0.2;
const NACHFUEHRUNG = 0.05;

export interface SprechpausenOptionen {
  /** Sample rate of the incoming chunks (AudioContext). */
  rate: number;
  /** Noise floor learned by an earlier opening of the same call (Finding 5). */
  grundrauschen?: number;
  /** A spoken piece: 16 kHz Int16, sample time of its start and of its last loud frame. */
  onStueck(pcm: Int16Array, startSek: number, endeSek: number): void;
  /** One second of quiet after loudness that did not become a piece (Finding 1). */
  onRuhe?(): void;
}

interface Rahmen {
  pcm: Int16Array;
  pegel: number;
  /** Sample time at the end of this frame. */
  ende: number;
}

export class Sprechpausen {
  private readonly optionen: SprechpausenOptionen;
  private readonly rahmenRoh: number;
  private roh: Float32Array = new Float32Array(0);
  private anzahl = 0;
  private rauschen: number | undefined;
  private readonly lernen: number[] = [];
  private readonly vorlauf: Rahmen[] = [];
  private ueberInFolge = 0;
  private stueck: Rahmen[] | null = null;
  private stilleInFolge = 0;
  private letzterPegelEnde = -1;
  private ruheOffen = false;

  constructor(optionen: SprechpausenOptionen) {
    this.optionen = optionen;
    this.rauschen = optionen.grundrauschen;
    this.rahmenRoh = Math.max(1, Math.round((optionen.rate * RAHMEN_MS) / 1000));
  }

  /** Sample time since opening, in seconds. */
  get jetztSek(): number {
    return this.anzahl * RAHMEN_S;
  }

  /** A piece is open (speech started, pause not yet reached). */
  get sprichtGerade(): boolean {
    return this.stueck !== null;
  }

  /** Learned noise floor (undefined while still learning). */
  get grundrauschen(): number | undefined {
    return this.rauschen;
  }

  get schwelle(): number {
    const r = this.rauschen ?? 0;
    return Math.min(ANRUF_RMS_SCHWELLE_MAX, Math.max(ANRUF_RMS_SCHWELLE, RAUSCH_FAKTOR * r));
  }

  /** Whether a frame above the threshold ended after sample time `sek` (below the start limit too). */
  pegelSeit(sek: number): boolean {
    return this.letzterPegelEnde > sek + 1e-9;
  }

  fuettere(chunk: Float32Array): void {
    const alt = this.roh;
    const neu = new Float32Array(alt.length + chunk.length);
    neu.set(alt, 0);
    neu.set(chunk, alt.length);
    let pos = 0;
    while (neu.length - pos >= this.rahmenRoh) {
      const block = neu.subarray(pos, pos + this.rahmenRoh);
      pos += this.rahmenRoh;
      let pcm = downsampleAuf16k(block, this.optionen.rate);
      if (pcm.length !== RAHMEN_PROBEN) {
        const passend = new Int16Array(RAHMEN_PROBEN);
        passend.set(pcm.subarray(0, RAHMEN_PROBEN));
        pcm = passend;
      }
      this.rahmen(pcm);
    }
    this.roh = neu.slice(pos);
  }

  private rahmen(pcm: Int16Array): void {
    this.anzahl++;
    const r: Rahmen = { pcm, pegel: rms(pcm), ende: this.jetztSek };
    this.vorlauf.push(r);
    // Lead-in before the first loud frame: 300 ms plus the frames that confirm the start.
    if (this.vorlauf.length > VORLAUF_RAHMEN + START_RAHMEN) this.vorlauf.shift();

    if (this.rauschen === undefined) {
      // Cold start: learn the floor from the first 300 ms before deciding anything;
      // the lead-in keeps these frames, so no syllable is lost.
      this.lernen.push(r.pegel);
      if (this.lernen.length < VORLAUF_RAHMEN) return;
      const sortiert = [...this.lernen].sort((a, b) => a - b);
      this.rauschen = sortiert[Math.min(sortiert.length - 1, Math.floor(sortiert.length * PERZENTIL))] ?? 0;
      this.ueberInFolge = 0;
      for (let i = this.vorlauf.length - 1; i >= 0 && (this.vorlauf[i]?.pegel ?? 0) >= this.schwelle; i--) this.ueberInFolge++;
      for (const v of this.vorlauf) if (v.pegel >= this.schwelle) this.merkePegel(v);
      if (this.ueberInFolge >= START_RAHMEN) this.beginne();
      else this.pruefeRuhe();
      return;
    }

    const laut = r.pegel >= this.schwelle;
    if (laut) this.merkePegel(r);
    else this.rauschen = this.rauschen * (1 - NACHFUEHRUNG) + r.pegel * NACHFUEHRUNG;

    if (this.stueck) {
      this.stueck.push(r);
      this.stilleInFolge = laut ? 0 : this.stilleInFolge + 1;
      if (this.stilleInFolge >= PAUSE_RAHMEN) this.schliesse(false);
      else if (this.stueck.length >= MAX_RAHMEN) this.schliesse(true);
      return;
    }
    this.ueberInFolge = laut ? this.ueberInFolge + 1 : 0;
    if (this.ueberInFolge >= START_RAHMEN) this.beginne();
    else this.pruefeRuhe();
  }

  private merkePegel(r: Rahmen): void {
    this.letzterPegelEnde = Math.max(this.letzterPegelEnde, r.ende);
    if (!this.stueck) this.ruheOffen = true;
  }

  private beginne(): void {
    this.stueck = [...this.vorlauf];
    this.stilleInFolge = 0;
    this.ueberInFolge = 0;
    this.ruheOffen = false;
  }

  /** Pause reached (or 30 s of level): hand the piece over, or drop it as noise. */
  private schliesse(zwang: boolean): void {
    const rahmen = this.stueck ?? [];
    let letzterLaut = -1;
    for (let i = rahmen.length - 1; i >= 0; i--) {
      if ((rahmen[i]?.pegel ?? 0) >= this.schwelle) {
        letzterLaut = i;
        break;
      }
    }
    // Forced cut keeps the piece open: the speaker is still talking.
    this.stueck = zwang ? [] : null;
    this.stilleInFolge = 0;
    const bis = zwang ? rahmen.length : Math.min(rahmen.length, letzterLaut + 1 + NACHLAUF_RAHMEN);
    const teil = rahmen.slice(0, Math.max(0, bis));
    const erster = teil.findIndex((r) => r.pegel >= this.schwelle);
    const sprache = erster >= 0 && letzterLaut >= erster ? rahmen.slice(erster, letzterLaut + 1) : [];
    const pcm = verbinde(teil.map((r) => r.pcm));
    const dauer = pcm.length / ANRUF_RATE;
    const pegel = rms(verbinde(sprache.map((r) => r.pcm)));
    if (teil.length === 0 || dauer < ANRUF_MIN_DAUER_S || pegel < this.schwelle) {
      // Loudness without a piece: report quiet once the pause is over (it already is, unless forced).
      if (!zwang) {
        this.ruheOffen = true;
        this.pruefeRuhe();
      }
      return;
    }
    const start = (teil[0]?.ende ?? RAHMEN_S) - RAHMEN_S;
    const ende = rahmen[letzterLaut]?.ende ?? teil[teil.length - 1]?.ende ?? this.jetztSek;
    this.optionen.onStueck(pcm, start, ende);
  }

  private pruefeRuhe(): void {
    if (!this.ruheOffen || this.stueck) return;
    if (this.jetztSek - this.letzterPegelEnde + 1e-9 < ANRUF_PAUSE_MS / 1000) return;
    this.ruheOffen = false;
    this.optionen.onRuhe?.();
  }
}

function verbinde(teile: readonly Int16Array[]): Int16Array {
  const laenge = teile.reduce((n, t) => n + t.length, 0);
  const aus = new Int16Array(laenge);
  let pos = 0;
  for (const t of teile) {
    aus.set(t, pos);
    pos += t.length;
  }
  return aus;
}
