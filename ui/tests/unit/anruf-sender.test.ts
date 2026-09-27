/**
 * INT-2026-025 (Plan §4 #10, D8, §8 FA-21…FA-24, Review F7–F9): AnrufSender
 * gegen eine Fake-Sitzung, deren Bildschirm eine Zustandsmaschine aus den mit
 * Claude Code 2.1.283 aufgenommenen Bildschirmen ist (Taste → nächster
 * Bildschirm). Geprüft werden die exakte Tastenfolge, `inferUnblock: false`
 * und die Abbruchfälle — nie ein Esc.
 */
import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  AnrufSender,
  rueckfrageObergrenze,
  type AnrufAgentEventListener,
  type AnrufSenderQuelle,
} from '../../src/server/services/anruf-sender.js';
import type { MachineWriteResult } from '../../src/server/services/cloud-terminal-manager.js';
import type { CursorProbe } from '../../src/server/services/dialog-driver.js';
import type { AnrufFrage } from '../../src/shared/types/anruf.protocol.js';
import type { CloudTerminalAgentEvent, CloudTerminalAgentStatus } from '../../src/shared/types/cloud-terminal.protocol.js';
import type { BlockKind } from '../../src/shared/types/hook-events.protocol.js';

const FIXTURES = resolve(process.cwd(), 'tests', 'fixtures', 'tui', '2.1.283');
const fx = (name: string): string => readFileSync(resolve(FIXTURES, `${name}.txt`), 'utf8');

// ---------------------------------------------------------------------------
// Bildschirm-Helfer (synthetische Zwischenbilder aus den Aufnahmen)
// ---------------------------------------------------------------------------

/** Rückfrage: `❯` auf Zeile `nr` (Optionen beginnen in Spalte 0/2). */
function fokusAuf(bild: string, nr: number): string {
  return bild
    .replace(/^❯ (\d+\.)/gm, '  $1')
    .replace(/^ {3}❯ Submit$/gm, '     Submit')
    .replace(new RegExp(`^  (${nr}\\.)`, 'm'), '❯ $1');
}

/** Rückfrage: `❯` auf „Submit". */
function fokusSubmit(bild: string): string {
  return bild.replace(/^❯ (\d+\.)/gm, '  $1').replace(/^ {5}Submit$/m, '   ❯ Submit');
}

function haken(bild: string, nr: number): string {
  return bild.replace(`${nr}. [ ]`, `${nr}. [✔]`);
}

/** Plan: `❯` auf Option `nr` (Optionen in Spalte 3/5). */
function planFokus(bild: string, nr: number): string {
  return bild.replace(/^ {3}❯ (\d+\.)/gm, '     $1').replace(new RegExp(`^ {5}(${nr}\\.)`, 'm'), '   ❯ $1');
}

/** Leere Eingabezeile `❯` (letzte) durch Text ersetzen. */
function eingabe(bild: string, text: string): string {
  const zeilen = bild.split('\n');
  const idx = zeilen.map((z) => /^❯\s*$/.test(z)).lastIndexOf(true);
  zeilen[idx] = `❯ ${text}`;
  return zeilen.join('\n');
}

const PLAN_VIER = fx('plan-dialog').replace(
  '     2. Yes, manually approve edits\n     3. Tell Claude what to change',
  '     2. Yes, and auto-accept edits\n     3. Yes, manually approve edits\n     4. Tell Claude what to change'
);

// ---------------------------------------------------------------------------
// Fake-Quelle
// ---------------------------------------------------------------------------

type Uebergang = { bild: string; ereignis?: [CloudTerminalAgentEvent, CloudTerminalAgentStatus] } | { ereignis: [CloudTerminalAgentEvent, CloudTerminalAgentStatus] };

/** Lesbare Tastennamen fürs Protokoll. */
function tastenName(daten: string): string {
  if (daten === '\r') return 'ENTER';
  if (daten === '\t') return 'TAB';
  if (daten === '\x1b[B') return 'DOWN';
  if (daten === '\x1b[A') return 'UP';
  if (daten === '\x1b') return 'ESC';
  const paste = /^\x1b\[200~([\s\S]*)\x1b\[201~$/.exec(daten);
  if (paste) return `PASTE:${paste[1]}`;
  return daten;
}

class FakeQuelle extends EventEmitter implements AnrufSenderQuelle {
  bild: string;
  tasten: string[] = [];
  inferUnblock: Array<boolean | undefined> = [];
  session: { status: 'active'; agentStatus: CloudTerminalAgentStatus; blockKind?: BlockKind } | undefined;
  beschaeftigt = false;
  cursorProbe: CursorProbe | null = null;
  private readonly tabelle = new Map<string, Uebergang>();

  constructor(start: string, agentStatus: CloudTerminalAgentStatus, blockKind?: BlockKind) {
    super();
    this.bild = start;
    this.session = { status: 'active', agentStatus, blockKind };
  }

  /** Taste `name` auf Bild `von` führt zu … */
  bei(von: string, name: string, nach: Uebergang): this {
    this.tabelle.set(`${von}\u0000${name}`, nach);
    return this;
  }

  async withMachineWrite<T>(_id: string, fn: () => Promise<T>): Promise<MachineWriteResult<T>> {
    if (!this.session) return { ok: false, grund: 'nicht_aktiv' };
    if (this.beschaeftigt) return { ok: false, grund: 'beschaeftigt' };
    this.beschaeftigt = true;
    try {
      return { ok: true, value: await fn() };
    } finally {
      this.beschaeftigt = false;
    }
  }

  sendInput(id: string, data: string, opts?: { inferUnblock?: boolean }): boolean {
    const name = tastenName(data);
    this.tasten.push(name);
    this.inferUnblock.push(opts?.inferUnblock);
    const u = this.tabelle.get(`${this.bild}\u0000${name}`);
    if (u) {
      if ('bild' in u) this.bild = u.bild;
      if (u.ereignis) this.emit('session.agent-event', id, u.ereignis[0], { status: u.ereignis[1] });
    }
    return true;
  }

  async readScreen(): Promise<{ text: string; live: boolean }> {
    return { text: this.bild, live: true };
  }

  async readCursorProbe(): Promise<CursorProbe | null> {
    return this.cursorProbe;
  }

  async waitForIdle(): Promise<void> {}

  getSession(): { status: 'active'; agentStatus: CloudTerminalAgentStatus; blockKind?: BlockKind } | undefined {
    return this.session;
  }

  override on(event: 'session.agent-event', l: AnrufAgentEventListener): this {
    return super.on(event, l);
  }

  override off(event: 'session.agent-event', l: AnrufAgentEventListener): this {
    return super.off(event, l);
  }
}

const sender = (q: FakeQuelle, review = false, bestaetigungMs = 50): AnrufSender =>
  new AnrufSender({ quelle: q, planReview: { isReviewRunning: () => review }, pauseMs: 0, bestaetigungMs });

const ID = 'sess-1';
const ERLEDIGT = fx('einzelfrage-beantwortet');

const FARBE_KNOPF: AnrufFrage = { frage: 'Welche Farbe soll der Knopf haben?', optionen: ['Rot', 'Blau', 'Gruen'], mehrfach: false };
const FARBEN: AnrufFrage = { frage: 'Welche Farben magst du?', optionen: ['Rot', 'Blau', 'Gruen'], mehrfach: true };
const ZWEI: AnrufFrage[] = [
  { frage: 'Welche Farbe?', optionen: ['Rot', 'Blau', 'Gruen'], mehrfach: false },
  { frage: 'Welche Tiere?', optionen: ['Hund', 'Katze', 'Maus'], mehrfach: true },
];

function erwarteKeinEsc(q: FakeQuelle): void {
  expect(q.tasten).not.toContain('ESC');
  expect(q.inferUnblock.every((v) => v === false)).toBe(true);
}

// ---------------------------------------------------------------------------
// Rückfrage (FA-21)
// ---------------------------------------------------------------------------

describe('AnrufSender — Rückfrage, Tastenprotokoll 2.1.283', () => {
  it('Einzelfrage, Möglichkeit 2: nur die Ziffer, Bestätigung = Dialog weg', async () => {
    const q = new FakeQuelle(fx('einzelfrage'), 'blocked', 'rueckfrage').bei(fx('einzelfrage'), '2', { bild: ERLEDIGT, ereignis: ['unblocked', 'working'] });
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBE_KNOPF], antwort: { art: 'rueckfrage', antworten: [{ nummern: [2] }] } });
    expect(r).toEqual({ ok: true });
    expect(q.tasten).toEqual(['2']);
    erwarteKeinEsc(q);
  });

  it('Einzelfrage, eigene Antwort: Ziffer fokussiert, Paste, Enter sendet', async () => {
    const start = fx('einzelfrage');
    const fokus = fokusAuf(start, 4);
    const text = fokus.replace('❯ 4. Type something.', '❯ 4. Lila, bitte');
    const q = new FakeQuelle(start, 'blocked', 'rueckfrage')
      .bei(start, '4', { bild: fokus })
      .bei(fokus, 'PASTE:Lila, bitte', { bild: text })
      .bei(text, 'ENTER', { bild: ERLEDIGT });
    const r = await sender(q).sende({
      sessionId: ID,
      art: 'rueckfrage',
      fragen: [FARBE_KNOPF],
      antwort: { art: 'rueckfrage', antworten: [{ nummern: [], eigene: 'Lila,\nbitte' }] },
    });
    expect(r).toEqual({ ok: true });
    expect(q.tasten).toEqual(['4', 'PASTE:Lila, bitte', 'ENTER']);
    erwarteKeinEsc(q);
  });

  it('Mehrfachauswahl allein: Ziffern setzen Haken, Tab → Prüfseite, 1 sendet', async () => {
    const start = fx('mehrfach-einzig');
    const nachEins = haken(start, 1).replace('☐ Farben', '☒ Farben');
    const q = new FakeQuelle(start, 'blocked', 'rueckfrage')
      .bei(start, '1', { bild: nachEins })
      .bei(nachEins, '3', { bild: fx('mehrfach-einzig-haken') })
      .bei(fx('mehrfach-einzig-haken'), 'TAB', { bild: fx('mehrfach-einzig-tab') })
      .bei(fx('mehrfach-einzig-tab'), '1', { bild: ERLEDIGT, ereignis: ['unblocked', 'working'] });
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBEN], antwort: { art: 'rueckfrage', antworten: [{ nummern: [3, 1] }] } });
    expect(r).toEqual({ ok: true });
    expect(q.tasten).toEqual(['1', '3', 'TAB', '1']);
    erwarteKeinEsc(q);
  });

  it('zwei Fragen: eigene Antwort, dann Mehrfachauswahl mit eigener Antwort, Prüfseite', async () => {
    const q1 = fx('zwei-fragen-start');
    const q2 = fx('zwei-frage2');
    const q2Katze = haken(q2, 2).replace('☐ Tiere', '☒ Tiere');
    const mef = fx('mehrfach-eigene-fokus');
    const met = fx('mehrfach-eigene-text');
    const q = new FakeQuelle(q1, 'blocked', 'rueckfrage')
      .bei(q1, '4', { bild: fx('zwei-eigene-fokus') })
      .bei(fx('zwei-eigene-fokus'), 'PASTE:Türkis, aber hell', { bild: fx('zwei-eigene-text') })
      .bei(fx('zwei-eigene-text'), 'ENTER', { bild: q2 })
      .bei(q2, '2', { bild: q2Katze })
      .bei(q2Katze, '4', { bild: mef })
      .bei(mef, 'DOWN', { bild: fokusAuf(mef, 2) })
      .bei(fokusAuf(mef, 2), 'DOWN', { bild: fokusAuf(mef, 3) })
      .bei(fokusAuf(mef, 3), 'DOWN', { bild: fokusAuf(mef, 4) })
      .bei(fokusAuf(mef, 4), 'PASTE:Igel', { bild: met })
      .bei(met, 'TAB', { bild: fokusSubmit(met) })
      .bei(fokusSubmit(met), 'ENTER', { bild: fx('pruefseite-zwei') })
      .bei(fx('pruefseite-zwei'), '1', { bild: ERLEDIGT, ereignis: ['unblocked', 'working'] });
    const antworten = [{ nummern: [], eigene: 'Türkis, aber hell' }, { nummern: [2], eigene: 'Igel' }];
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: ZWEI, antwort: { art: 'rueckfrage', antworten } });
    expect(r).toEqual({ ok: true });
    expect(q.tasten).toEqual(['4', 'PASTE:Türkis, aber hell', 'ENTER', '2', '4', 'DOWN', 'DOWN', 'DOWN', 'PASTE:Igel', 'TAB', 'ENTER', '1']);
    expect(q.tasten.length).toBeLessThanOrEqual(rueckfrageObergrenze(ZWEI, antworten));
    erwarteKeinEsc(q);
  });
});

// ---------------------------------------------------------------------------
// Rückfrage: Vorzustand und Abbruch (Review F7, FA-24)
// ---------------------------------------------------------------------------

describe('AnrufSender — Rückfrage, Abbruch ohne Taste', () => {
  const einfach = { art: 'rueckfrage' as const, antworten: [{ nummern: [1] }, { nummern: [1] }] };

  it('Fokus auf „Type something" → Abbruch ohne Taste', async () => {
    const q = new FakeQuelle(fx('zwei-eigene-fokus'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: ZWEI, antwort: einfach });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual([]);
  });

  it('vorgesetzte Haken → Abbruch ohne Taste', async () => {
    const q = new FakeQuelle(fx('mehrfach-einzig-haken'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBEN], antwort: { art: 'rueckfrage', antworten: [{ nummern: [2] }] } });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual([]);
  });

  it('Haken ohne ☒ im Kopf (nur Zeile gesetzt) → Abbruch ohne Taste', async () => {
    const q = new FakeQuelle(haken(fx('mehrfach-einzig'), 2), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBEN], antwort: { art: 'rueckfrage', antworten: [{ nummern: [1] }] } });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual([]);
  });

  it('zweite Frage schon im Terminal begonnen (Tab ☒) → Abbruch', async () => {
    const q = new FakeQuelle(fx('zwei-frage2'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: ZWEI, antwort: einfach });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual([]);
  });

  it('andere Frage auf dem Bildschirm → anderer_dialog', async () => {
    const q = new FakeQuelle(fx('einzelfrage'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({
      sessionId: ID,
      art: 'rueckfrage',
      fragen: [{ ...FARBE_KNOPF, frage: 'Welche Größe?' }],
      antwort: { art: 'rueckfrage', antworten: [{ nummern: [1] }] },
    });
    expect(r).toMatchObject({ ok: false, grund: 'anderer_dialog' });
    expect(q.tasten).toEqual([]);
  });

  it('falscher Status: working → schon_beantwortet; blocked plan → anderer_dialog', async () => {
    const auftrag = { sessionId: ID, art: 'rueckfrage' as const, fragen: [FARBE_KNOPF], antwort: { art: 'rueckfrage' as const, antworten: [{ nummern: [1] }] } };
    const a = new FakeQuelle(fx('einzelfrage'), 'working');
    expect(await sender(a).sende(auftrag)).toMatchObject({ ok: false, grund: 'schon_beantwortet' });
    const b = new FakeQuelle(fx('einzelfrage'), 'blocked', 'plan');
    expect(await sender(b).sende(auftrag)).toMatchObject({ ok: false, grund: 'anderer_dialog' });
    expect([...a.tasten, ...b.tasten]).toEqual([]);
  });

  it('Plan-Dialog auf dem Bildschirm bei Rückfrage-Status → anderer_dialog', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBE_KNOPF], antwort: { art: 'rueckfrage', antworten: [{ nummern: [1] }] } });
    expect(r).toMatchObject({ ok: false, grund: 'anderer_dialog' });
    expect(q.tasten).toEqual([]);
  });

  it('Ziffer ohne Wirkung → Abbruch nach einer Taste, kein Esc', async () => {
    const q = new FakeQuelle(fx('einzelfrage'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBE_KNOPF], antwort: { art: 'rueckfrage', antworten: [{ nummern: [2] }] } });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual(['2']);
    erwarteKeinEsc(q);
  });

  it('Paste kommt nicht an → Abbruch nennt den stehengebliebenen Text', async () => {
    const q = new FakeQuelle(fx('zwei-fragen-start'), 'blocked', 'rueckfrage').bei(fx('zwei-fragen-start'), '4', { bild: fx('zwei-eigene-fokus') });
    const r = await sender(q).sende({
      sessionId: ID,
      art: 'rueckfrage',
      fragen: ZWEI,
      antwort: { art: 'rueckfrage', antworten: [{ nummern: [], eigene: 'Türkis, aber hell' }, { nummern: [1] }] },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.grund).toBe('bildschirm_unpassend');
    expect(r.text).toContain('Dein Text steht noch in der Eingabezeile bzw. im Plan-Dialog — im Terminal prüfen, abschicken oder löschen');
    expect(r.text).toContain('Türkis, aber hell');
    expect(q.tasten).toEqual(['4', 'PASTE:Türkis, aber hell']);
    erwarteKeinEsc(q);
  });

  it('Fokus bewegt sich nicht: Pfeiltasten enden an der festen Obergrenze', async () => {
    const q2 = fx('zwei-frage2');
    const q2Katze = haken(q2, 2);
    const mef = fx('mehrfach-eigene-fokus');
    const start = fx('zwei-fragen-start');
    const q = new FakeQuelle(start, 'blocked', 'rueckfrage')
      .bei(start, '1', { bild: q2 })
      .bei(q2, '2', { bild: q2Katze })
      .bei(q2Katze, '4', { bild: mef });
    const antworten = [{ nummern: [1] }, { nummern: [2], eigene: 'Igel' }];
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: ZWEI, antwort: { art: 'rueckfrage', antworten } });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual(['1', '2', '4', 'DOWN', 'DOWN', 'DOWN', 'DOWN']);
    expect(q.tasten.length).toBeLessThanOrEqual(rueckfrageObergrenze(ZWEI, antworten));
    erwarteKeinEsc(q);
  });

  it('Obergrenze Σ(Ziffern + 3) + 2', () => {
    expect(rueckfrageObergrenze([FARBE_KNOPF], [{ nummern: [2] }])).toBe(6);
    expect(rueckfrageObergrenze(ZWEI, [{ nummern: [], eigene: 'x' }, { nummern: [1, 2] }])).toBe(2 + 4 + 5);
  });

  it('Antwort passt nicht zu den Fragen → kein Senden', async () => {
    const q = new FakeQuelle(fx('einzelfrage'), 'blocked', 'rueckfrage');
    const r = await sender(q).sende({ sessionId: ID, art: 'rueckfrage', fragen: [FARBE_KNOPF], antwort: { art: 'rueckfrage', antworten: [{ nummern: [1, 2] }] } });
    expect(r.ok).toBe(false);
    expect(q.tasten).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Plan (FA-22, FA-23, Review F8, F9)
// ---------------------------------------------------------------------------

const BYPASS = 'Yes, and switch to BYPASS PERMISSIONS (no further prompts) for this session';

describe('AnrufSender — Plan', () => {
  it('freigabeWortlaut liest Option 1 ohne Taste', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan');
    expect(await sender(q).freigabeWortlaut(ID)).toEqual({ wortlaut: BYPASS });
    expect(q.tasten).toEqual([]);
  });

  it('freigeben: Taste 1, Bestätigung = Cue weg', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan').bei(fx('plan-dialog'), '1', { bild: ERLEDIGT });
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toEqual({ ok: true });
    expect(q.tasten).toEqual(['1']);
    erwarteKeinEsc(q);
  });

  it('freigeben ohne Wirkung → nicht_bestaetigt', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan');
    expect(await sender(q, false, 20).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'nicht_bestaetigt' });
    expect(q.tasten).toEqual(['1']);
  });

  it('unbekannte Ja-Beschriftung oder „clear context" → unbekannte_freigabe, keine Taste', async () => {
    for (const ersatz of ['Yes, clear context and auto-accept edits', 'Ja, los']) {
      const bild = fx('plan-dialog').replace(BYPASS, ersatz);
      const q = new FakeQuelle(bild, 'blocked', 'plan');
      expect(await sender(q).freigabeWortlaut(ID)).toMatchObject({ ok: false, grund: 'unbekannte_freigabe' });
      expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'unbekannte_freigabe' });
      expect(q.tasten).toEqual([]);
    }
  });

  it('Plan-Review läuft → plan_review_laeuft; Überarbeiten bleibt möglich', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan');
    expect(await sender(q, true).freigabeWortlaut(ID)).toMatchObject({ ok: false, grund: 'plan_review_laeuft' });
    expect(await sender(q, true).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'plan_review_laeuft' });
    expect(q.tasten).toEqual([]);

    q.bei(fx('plan-dialog'), '3', { bild: fx('plan-option3-fokus') })
      .bei(fx('plan-option3-fokus'), 'PASTE:Inhalt soll hallo sein', { bild: fx('plan-option3-text') })
      .bei(fx('plan-option3-text'), 'ENTER', { bild: ERLEDIGT });
    expect(await sender(q, true).sende({ sessionId: ID, art: 'plan', antwort: { art: 'ueberarbeiten', text: 'Inhalt soll hallo sein' } })).toEqual({ ok: true });
  });

  it('überarbeiten: 3, Paste, Enter; neuer Plan-Dialog ohne unseren Text bestätigt', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan')
      .bei(fx('plan-dialog'), '3', { bild: fx('plan-option3-fokus') })
      .bei(fx('plan-option3-fokus'), 'PASTE:Inhalt soll hallo sein', { bild: fx('plan-option3-text') })
      .bei(fx('plan-option3-text'), 'ENTER', { bild: fx('plan-dialog-2') });
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'ueberarbeiten', text: 'Inhalt soll\nhallo sein' } })).toEqual({ ok: true });
    expect(q.tasten).toEqual(['3', 'PASTE:Inhalt soll hallo sein', 'ENTER']);
    erwarteKeinEsc(q);
  });

  it('Freitext-Nummer aus target, nicht fest 3', async () => {
    const fokus = planFokus(PLAN_VIER, 4);
    const text = fokus.replace('❯ 4. Tell Claude what to change', '❯ 4. Bitte kleiner');
    const q = new FakeQuelle(PLAN_VIER, 'blocked', 'plan')
      .bei(PLAN_VIER, '4', { bild: fokus })
      .bei(fokus, 'PASTE:Bitte kleiner', { bild: text })
      .bei(text, 'ENTER', { ereignis: ['prompt-submitted', 'working'] });
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'ueberarbeiten', text: 'Bitte kleiner' } })).toEqual({ ok: true });
    expect(q.tasten).toEqual(['4', 'PASTE:Bitte kleiner', 'ENTER']);
  });

  it('Text schon in der Freitext-Option (Plan-Review-Kollision) → text_im_dialog', async () => {
    const q = new FakeQuelle(fx('plan-option3-text'), 'blocked', 'plan');
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'text_im_dialog' });
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'ueberarbeiten', text: 'x y' } })).toMatchObject({ ok: false, grund: 'text_im_dialog' });
    expect(q.tasten).toEqual([]);
  });

  it('Fokus auf der Freitext-Option → Abbruch ohne Taste', async () => {
    const q = new FakeQuelle(fx('plan-option3-fokus'), 'blocked', 'plan');
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'ueberarbeiten', text: 'x' } })).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    expect(q.tasten).toEqual([]);
  });

  it('Paste in Option 3 nicht übernommen → Abbruch mit Hinweis auf den Text', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan').bei(fx('plan-dialog'), '3', { bild: fx('plan-option3-fokus') });
    const r = await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'ueberarbeiten', text: 'Inhalt soll hallo sein' } });
    expect(r).toMatchObject({ ok: false, grund: 'bildschirm_unpassend' });
    if (!r.ok) expect(r.text).toContain('Dein Text steht noch');
    expect(q.tasten).toEqual(['3', 'PASTE:Inhalt soll hallo sein']);
    erwarteKeinEsc(q);
  });
});

// ---------------------------------------------------------------------------
// Fertig → neue Eingabe, Sperren, Sitzung weg (FA-24)
// ---------------------------------------------------------------------------

describe('AnrufSender — fertig und Vorprüfung', () => {
  it('fertig: Paste, Enter; Bestätigung prompt-submitted', async () => {
    const mitText = eingabe(ERLEDIGT, 'Bitte noch Tests schreiben');
    const q = new FakeQuelle(ERLEDIGT, 'done')
      .bei(ERLEDIGT, 'PASTE:Bitte noch Tests schreiben', { bild: mitText })
      .bei(mitText, 'ENTER', { ereignis: ['prompt-submitted', 'working'] });
    expect(await sender(q).sende({ sessionId: ID, art: 'fertig', antwort: { art: 'text', text: 'Bitte noch\nTests schreiben' } })).toEqual({ ok: true });
    expect(q.tasten).toEqual(['PASTE:Bitte noch Tests schreiben', 'ENTER']);
    erwarteKeinEsc(q);
  });

  it('fertig ohne Bestätigung → nicht_bestaetigt mit Hinweis auf den Text', async () => {
    const mitText = eingabe(ERLEDIGT, 'Bitte noch Tests schreiben');
    const q = new FakeQuelle(ERLEDIGT, 'idle').bei(ERLEDIGT, 'PASTE:Bitte noch Tests schreiben', { bild: mitText });
    const r = await sender(q, false, 20).sende({ sessionId: ID, art: 'fertig', antwort: { art: 'text', text: 'Bitte noch Tests schreiben' } });
    expect(r).toMatchObject({ ok: false, grund: 'nicht_bestaetigt' });
    if (!r.ok) expect(r.text).toContain('„Bitte noch Tests schreiben"');
    expect(q.tasten).toEqual(['PASTE:Bitte noch Tests schreiben', 'ENTER']);
  });

  it('Eingabezeile voll (Cursor-Probe) → eingabe_nicht_leer, keine Taste', async () => {
    const voll = eingabe(ERLEDIGT, 'halb getippt');
    const q = new FakeQuelle(voll, 'done');
    q.cursorProbe = { zeilen: ['❯ halb getippt'], x: 14, y: 0 };
    expect(await sender(q).sende({ sessionId: ID, art: 'fertig', antwort: { art: 'text', text: 'neu' } })).toMatchObject({ ok: false, grund: 'eingabe_nicht_leer' });
    expect(q.tasten).toEqual([]);
  });

  it('Vorschlag in leerer Zeile (Cursor links) → sendet', async () => {
    const vorschlag = eingabe(ERLEDIGT, 'letzter Befehl');
    const mitText = eingabe(ERLEDIGT, 'neu hier');
    const q = new FakeQuelle(vorschlag, 'done')
      .bei(vorschlag, 'PASTE:neu hier', { bild: mitText })
      .bei(mitText, 'ENTER', { ereignis: ['prompt-submitted', 'working'] });
    q.cursorProbe = { zeilen: ['❯ letzter Befehl'], x: 2, y: 0 };
    expect(await sender(q).sende({ sessionId: ID, art: 'fertig', antwort: { art: 'text', text: 'neu hier' } })).toEqual({ ok: true });
  });

  it('fertig bei falschem Status: blocked → anderer_dialog, working → beschaeftigt', async () => {
    const a = new FakeQuelle(ERLEDIGT, 'blocked', 'rueckfrage');
    expect(await sender(a).sende({ sessionId: ID, art: 'fertig', antwort: { art: 'text', text: 'x' } })).toMatchObject({ ok: false, grund: 'anderer_dialog' });
    const b = new FakeQuelle(ERLEDIGT, 'working');
    expect(await sender(b).sende({ sessionId: ID, art: 'fertig', antwort: { art: 'text', text: 'x' } })).toMatchObject({ ok: false, grund: 'beschaeftigt' });
    expect([...a.tasten, ...b.tasten]).toEqual([]);
  });

  it('laufender Maschinen-Schreibvorgang → beschaeftigt, keine Taste', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan');
    q.beschaeftigt = true;
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'beschaeftigt' });
    expect(q.tasten).toEqual([]);
  });

  it('Sitzung weg → sitzung_weg', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan');
    q.session = undefined;
    expect(await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'freigeben' } })).toMatchObject({ ok: false, grund: 'sitzung_weg' });
    expect(await sender(q).freigabeWortlaut(ID)).toMatchObject({ ok: false, grund: 'sitzung_weg' });
  });

  it('Art und Antwort passen nicht zusammen → kein Senden', async () => {
    const q = new FakeQuelle(fx('plan-dialog'), 'blocked', 'plan');
    expect((await sender(q).sende({ sessionId: ID, art: 'plan', antwort: { art: 'text', text: 'x' } })).ok).toBe(false);
    expect(q.tasten).toEqual([]);
  });
});
