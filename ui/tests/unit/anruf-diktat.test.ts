/**
 * INT-2026-026 (D3; FA-04, FA-11, FA-17, FA-22, Finding 9, Finding 16):
 * Diktat — Reihenfolge, Lücken, verspätete und aufgegebene Nummern,
 * Sekunden, Halten, Leeren.
 */
import { describe, it, expect } from 'vitest';
import { Diktat } from '../../frontend/src/services/anruf-diktat.js';

describe('Diktat', () => {
  it('Ergebnisse in vertauschter Reihenfolge → Text in Reihenfolge, nur lückenlos (FA-04)', () => {
    const d = new Diktat();
    d.markiere();
    const a = d.neuesStueck(2, 2.5);
    const b = d.neuesStueck(1, 5);
    expect(d.offen).toBe(2);
    expect(d.ergebnis(b, 'Und den PR.')).toBe(true);
    expect(d.text).toBe('');
    expect(d.offen).toBe(2);
    expect(d.ergebnis(a, ' Mach die Tests. ')).toBe(true);
    expect(d.text).toBe('Mach die Tests. Und den PR.');
    expect(d.neu).toBe('Mach die Tests. Und den PR.');
    expect(d.offen).toBe(0);
    expect(d.letzteSpracheSek).toBe(5);
    expect(d.sekunden).toBe(3);
  });

  it('nichts verstanden (null) schließt die Lücke, ändert Text und Uhr nicht (FA-10)', () => {
    const d = new Diktat();
    d.markiere();
    const a = d.neuesStueck(1, 1);
    const b = d.neuesStueck(1, 4);
    d.ergebnis(b, 'Hallo.');
    d.ergebnis(a, null);
    expect(d.text).toBe('Hallo.');
    expect(d.letzteSpracheSek).toBe(4);
    const c = d.neuesStueck(1, 9);
    d.ergebnis(c, null);
    expect(d.letzteSpracheSek).toBe(4);
  });

  it('aufgegebene oder doppelte Nummer wird verworfen (Finding 9)', () => {
    const d = new Diktat();
    const a = d.neuesStueck(1, 1);
    expect(d.ergebnis(a, null)).toBe(true);
    expect(d.ergebnis(a, 'zu spät')).toBe(false);
    expect(d.ergebnis(99, 'unbekannt')).toBe(false);
    expect(d.text).toBe('');
  });

  it('leeren vergisst offene Nummern und Sekunden', () => {
    const d = new Diktat();
    const a = d.neuesStueck(3, 3);
    d.leeren();
    expect(d.offen).toBe(0);
    expect(d.ergebnis(a, 'alt')).toBe(false);
    expect(d.text).toBe('');
    expect(d.sekunden).toBe(0);
    const b = d.neuesStueck(1, 1);
    expect(b).toBeGreaterThan(a);
    d.ergebnis(b, 'neu');
    expect(d.text).toBe('neu');
  });

  it('gehalten: Text bleibt, Neues landet nur in `neu` (D6, FA-17)', () => {
    const d = new Diktat();
    d.ergebnis(d.neuesStueck(1, 1), 'Mach die Tests.');
    d.halten();
    d.markiere();
    d.ergebnis(d.neuesStueck(1, 2), 'Antwort senden.');
    expect(d.text).toBe('Mach die Tests.');
    expect(d.neu).toBe('Antwort senden.');
    d.leeren();
    expect(d.gehalten).toBe(false);
  });

  it('markiere: neue Uhr, Ergebnisse alter Öffnungen setzen sie nicht', () => {
    const d = new Diktat();
    d.markiere();
    const a = d.neuesStueck(1, 15);
    d.markiere();
    d.ergebnis(a, 'alt');
    expect(d.letzteSpracheSek).toBeUndefined();
    expect(d.text).toBe('alt');
    expect(d.neu).toBe('alt');
  });
});
