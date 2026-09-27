import { describe, it, expect, beforeEach } from 'vitest';
import { AnrufWarteschlange } from '../../src/server/services/anruf-warteschlange.js';
import { ANRUF_SPAETER_MS } from '../../src/shared/types/anruf.protocol.js';

let jetzt = 1_000_000;
const uhr = (): number => jetzt;
const ids = (q: AnrufWarteschlange): string[] => q.alle().map((e) => e.id);

describe('AnrufWarteschlange', () => {
  let q: AnrufWarteschlange;
  beforeEach(() => {
    jetzt = 1_000_000;
    q = new AnrufWarteschlange(uhr);
  });

  it('reiht Rückfrage/Plan vor fertig, innerhalb des Rangs nach Eingang (FA-07)', () => {
    q.neu({ id: 'f1', sessionId: 's1', art: 'fertig' });
    jetzt += 10;
    q.neu({ id: 'r2', sessionId: 's2', art: 'rueckfrage' });
    jetzt += 10;
    q.neu({ id: 'p3', sessionId: 's3', art: 'plan' });
    jetzt += 10;
    q.neu({ id: 'f4', sessionId: 's4', art: 'fertig' });
    expect(ids(q)).toEqual(['r2', 'p3', 'f1', 'f4']);
    expect(q.alle().map((e) => e.rang)).toEqual([0, 0, 1, 1]);
    expect(q.naechste()).toEqual({ eintrag: expect.objectContaining({ id: 'r2' }) });
    expect(q.groesse()).toBe(4);
  });

  it('ersetzt den Eintrag derselben Sitzung (FA-08)', () => {
    q.neu({ id: 'a', sessionId: 's1', art: 'rueckfrage' });
    q.neu({ id: 'b', sessionId: 's2', art: 'fertig' });
    jetzt += 50;
    q.neu({ id: 'c', sessionId: 's1', art: 'fertig' });
    expect(q.groesse()).toBe(2);
    expect(ids(q)).toEqual(['b', 'c']);
    expect(q.eintragFuerSitzung('s1')).toMatchObject({ id: 'c', art: 'fertig', rang: 1, seit: jetzt });
  });

  it('Ablehnen entfernt, setzt die Marke; neue Meldung hebt sie auf (FA-09)', () => {
    q.neu({ id: 'a', sessionId: 's1', art: 'plan' });
    expect(q.ablehnen('a')).toMatchObject({ id: 'a' });
    expect(q.groesse()).toBe(0);
    expect(q.istAbgelehnt('s1')).toBe(true);
    expect(q.istAbgelehnt('s2')).toBe(false);
    q.neu({ id: 'b', sessionId: 's1', art: 'fertig' });
    expect(q.istAbgelehnt('s1')).toBe(false);
    expect(q.ablehnen('gibtsnicht')).toBeNull();
  });

  it('Ablehnen eines entnommenen (klingelnden) Eintrags setzt die Marke', () => {
    const e = q.neu({ id: 'a', sessionId: 's1', art: 'rueckfrage' });
    expect(q.entnehmen('a')).toMatchObject({ id: 'a' });
    expect(q.groesse()).toBe(0);
    q.ablehnen(e);
    expect(q.istAbgelehnt('s1')).toBe(true);
  });

  it('Später stellt hinter alle wartenden, auch hinter fertig (FA-10)', () => {
    q.neu({ id: 'r', sessionId: 's1', art: 'rueckfrage' });
    jetzt += 10;
    q.neu({ id: 'f', sessionId: 's2', art: 'fertig' });
    jetzt += 10;
    const s = q.spaeter('r');
    expect(s).toMatchObject({ id: 'r', rang: 2, seit: jetzt });
    expect(s?.nichtVor).toBeUndefined();
    expect(ids(q)).toEqual(['f', 'r']);
    // Eine spätere neue Meldung kommt trotzdem vor den zurückgestellten
    jetzt += 10;
    q.neu({ id: 'f2', sessionId: 's3', art: 'fertig' });
    expect(ids(q)).toEqual(['f', 'f2', 'r']);
  });

  it('Später wartet 5 Minuten nur, wenn die Meldung allein ist (AN-S09)', () => {
    const e = q.neu({ id: 'a', sessionId: 's1', art: 'plan' });
    q.entnehmen('a');
    const s = q.spaeter(e);
    expect(s?.nichtVor).toBe(jetzt + ANRUF_SPAETER_MS);
    expect(q.naechste()).toEqual({ wartenBis: jetzt + ANRUF_SPAETER_MS });
    jetzt += ANRUF_SPAETER_MS - 1;
    expect(q.naechste()).toEqual({ wartenBis: 1_000_000 + ANRUF_SPAETER_MS });
    jetzt += 1;
    expect(q.naechste()).toEqual({ eintrag: expect.objectContaining({ id: 'a' }) });
  });

  it('naechste: wartender Später-Eintrag blockiert neue Meldungen nicht', () => {
    q.neu({ id: 'a', sessionId: 's1', art: 'plan' });
    q.spaeter('a');
    jetzt += 1000;
    q.neu({ id: 'b', sessionId: 's2', art: 'fertig' });
    expect(q.naechste()).toEqual({ eintrag: expect.objectContaining({ id: 'b' }) });
    q.entnehmen('b');
    expect(q.naechste()).toEqual({ wartenBis: 1_000_000 + ANRUF_SPAETER_MS });
  });

  it('naechste: leer → null', () => {
    expect(q.naechste()).toBeNull();
  });

  it('zurueck legt die Meldung an ihren alten Platz (AN-S08)', () => {
    const r = q.neu({ id: 'r', sessionId: 's1', art: 'rueckfrage' });
    jetzt += 10;
    q.neu({ id: 'f', sessionId: 's2', art: 'fertig' });
    q.entnehmen('r');
    jetzt += 10;
    q.neu({ id: 'p', sessionId: 's3', art: 'plan' });
    expect(q.zurueck(r)).toBe(true);
    expect(ids(q)).toEqual(['r', 'p', 'f']);
    expect(q.eintragFuerSitzung('s1')).toMatchObject({ seit: 1_000_000, rang: 0 });
  });

  it('zurueck verliert gegen eine neuere Meldung derselben Sitzung', () => {
    const r = q.neu({ id: 'r', sessionId: 's1', art: 'rueckfrage' });
    q.entnehmen('r');
    q.neu({ id: 'r2', sessionId: 's1', art: 'fertig' });
    expect(q.zurueck(r)).toBe(false);
    expect(ids(q)).toEqual(['r2']);
  });

  it('erledigt entfernt den Eintrag der Sitzung (FA-11)', () => {
    q.neu({ id: 'a', sessionId: 's1', art: 'plan' });
    q.neu({ id: 'b', sessionId: 's2', art: 'fertig' });
    expect(q.erledigt('s1')).toMatchObject({ id: 'a' });
    expect(q.erledigt('s1')).toBeNull();
    expect(ids(q)).toEqual(['b']);
  });

  it('leeren entfernt Einträge und Marken', () => {
    q.neu({ id: 'a', sessionId: 's1', art: 'plan' });
    q.neu({ id: 'b', sessionId: 's2', art: 'fertig' });
    q.ablehnen('b');
    q.leeren();
    expect(q.groesse()).toBe(0);
    expect(q.istAbgelehnt('s2')).toBe(false);
  });

  it('alle() liefert Kopien', () => {
    q.neu({ id: 'a', sessionId: 's1', art: 'plan' });
    q.alle()[0].rang = 2;
    expect(q.alle()[0].rang).toBe(0);
  });
});
