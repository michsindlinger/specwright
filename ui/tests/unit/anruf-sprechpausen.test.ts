/**
 * INT-2026-026 (D2; FA-04, FA-10, Finding 1, Finding 5): Sprechpausen über
 * Probenzeit — synthetische Signale für Sprache, Pause, Rauschen,
 * Zwangsschnitt und Vorlauf.
 */
import { describe, it, expect } from 'vitest';
import { ANRUF_RMS_SCHWELLE_MAX, Sprechpausen } from '../../frontend/src/services/anruf-sprechpausen.js';

const RATE = 48000;

interface Stueck {
  dauer: number;
  start: number;
  ende: number;
}

function welt(grundrauschen?: number) {
  const stuecke: Stueck[] = [];
  let ruhen = 0;
  const p = new Sprechpausen({
    rate: RATE,
    ...(grundrauschen !== undefined ? { grundrauschen } : {}),
    onStueck: (pcm, start, ende) => stuecke.push({ dauer: pcm.length / 16000, start, ende }),
    onRuhe: () => ruhen++,
  });
  // Feeds in worklet-sized chunks of 128 samples.
  const gib = (sek: number, amp: number): void => {
    const n = Math.round(RATE * sek);
    for (let pos = 0; pos < n; pos += 128) {
      const len = Math.min(128, n - pos);
      const c = new Float32Array(len);
      for (let i = 0; i < len; i++) c[i] = amp * Math.sin((2 * Math.PI * 220 * (pos + i)) / RATE);
      p.fuettere(c);
    }
  };
  return { p, stuecke, ruhen: () => ruhen, sprache: (s: number) => gib(s, 0.3), stille: (s: number) => gib(s, 0), rauschen: gib };
}

describe('Sprechpausen', () => {
  it('Sprache, dann 1 s Pause → ein Stück mit Vorlauf; Probenzeit zählt', () => {
    const w = welt();
    w.stille(0.5);
    w.sprache(2);
    expect(w.p.sprichtGerade).toBe(true);
    w.stille(0.9);
    expect(w.stuecke).toHaveLength(0);
    w.stille(0.2);
    expect(w.stuecke).toHaveLength(1);
    const s = w.stuecke[0]!;
    // 300 ms lead-in + 2 s speech + 300 ms tail
    expect(s.dauer).toBeCloseTo(2.6, 1);
    expect(s.start).toBeCloseTo(0.2, 1);
    expect(s.ende).toBeCloseTo(2.5, 1);
    expect(w.p.sprichtGerade).toBe(false);
    expect(w.p.jetztSek).toBeCloseTo(3.6, 1);
  });

  it('zwei Sätze mit Denkpause → zwei Stücke (FA-04)', () => {
    const w = welt();
    w.stille(0.5);
    w.sprache(1.5);
    w.stille(2);
    w.sprache(1);
    w.stille(1.2);
    expect(w.stuecke).toHaveLength(2);
    expect(w.stuecke[1]!.start).toBeGreaterThan(w.stuecke[0]!.ende);
  });

  it('kurze Lücke unter 1 s bleibt ein Stück', () => {
    const w = welt();
    w.stille(0.5);
    w.sprache(1);
    w.stille(0.6);
    w.sprache(1);
    w.stille(1.2);
    expect(w.stuecke).toHaveLength(1);
  });

  it('konstantes Rauschen 0,02 zählt nicht als Sprache (FA-10)', () => {
    const w = welt();
    w.rauschen(25, 0.02 * Math.SQRT2);
    expect(w.stuecke).toHaveLength(0);
    expect(w.p.sprichtGerade).toBe(false);
    expect(w.p.grundrauschen).toBeCloseTo(0.02, 2);
    // Speech above the noise is still found.
    w.rauschen(1.5, 0.3);
    w.rauschen(1.2, 0.02 * Math.SQRT2);
    expect(w.stuecke).toHaveLength(1);
  });

  it('Sprache ab dem ersten Rahmen: Grundrauschen aus dem 20.-Perzentil, Schwelle ≤ 0,05 (Finding 5)', () => {
    const w = welt();
    // Speech with gaps between syllables from the very start.
    for (let i = 0; i < 5; i++) {
      w.sprache(0.12);
      w.stille(0.06);
    }
    w.stille(1.2);
    expect(w.p.grundrauschen).toBeLessThan(0.02);
    expect(w.p.schwelle).toBeLessThanOrEqual(ANRUF_RMS_SCHWELLE_MAX);
    expect(w.stuecke).toHaveLength(1);
    expect(w.stuecke[0]!.start).toBe(0);
  });

  it('dauernd lauter Beginn: Schwelle bleibt ≤ 0,05, danach normale Sprache erkannt (R3)', () => {
    const w = welt();
    w.rauschen(0.3, 0.8);
    expect(w.p.schwelle).toBe(ANRUF_RMS_SCHWELLE_MAX);
    w.stille(1.5);
    w.sprache(1);
    w.stille(1.2);
    expect(w.stuecke.length).toBeGreaterThanOrEqual(1);
  });

  it('zweites Öffnen übernimmt das Grundrauschen und entscheidet sofort', () => {
    const w = welt(0.015);
    expect(w.p.grundrauschen).toBe(0.015);
    expect(w.p.schwelle).toBeCloseTo(0.045, 3);
    w.sprache(0.3);
    expect(w.p.sprichtGerade).toBe(true);
  });

  it('Dauerpegel → Zwangsschnitt nach 30 s, Stück bleibt offen', () => {
    const w = welt();
    w.stille(0.5);
    w.sprache(31);
    expect(w.stuecke).toHaveLength(1);
    expect(w.stuecke[0]!.dauer).toBeCloseTo(30, 0);
    expect(w.p.sprichtGerade).toBe(true);
    w.stille(1.2);
    expect(w.stuecke).toHaveLength(2);
  });

  it('Klick unter 3 Rahmen ergibt kein Stück, aber onRuhe nach 1 s und pegelSeit (Finding 1)', () => {
    const w = welt();
    w.stille(0.5);
    const vorher = w.p.jetztSek;
    w.sprache(0.02);
    expect(w.p.pegelSeit(vorher)).toBe(true);
    expect(w.p.sprichtGerade).toBe(false);
    w.stille(0.9);
    expect(w.ruhen()).toBe(0);
    w.stille(0.2);
    expect(w.ruhen()).toBe(1);
    expect(w.stuecke).toHaveLength(0);
  });

  it('pegelSeit(endeSek) ist nach einem Stück falsch, bis wieder Pegel kommt', () => {
    const w = welt();
    w.stille(0.5);
    w.sprache(1);
    w.stille(1.2);
    const ende = w.stuecke[0]!.ende;
    expect(w.p.pegelSeit(ende)).toBe(false);
    w.sprache(0.03);
    expect(w.p.pegelSeit(ende)).toBe(true);
  });

  it('andere Rate (44,1 kHz): Probenzeit bleibt genau', () => {
    const stuecke: number[] = [];
    const p = new Sprechpausen({ rate: 44100, onStueck: () => stuecke.push(1) });
    const n = 44100 * 10;
    for (let pos = 0; pos < n; pos += 128) p.fuettere(new Float32Array(Math.min(128, n - pos)));
    expect(p.jetztSek).toBeCloseTo(10, 1);
  });
});
