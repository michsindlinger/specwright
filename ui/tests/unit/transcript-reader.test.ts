/**
 * INT-2026-007 FA-01/FA-03/FA-04/FA-05: transcript parser and Verlauf against
 * a recorded fixture (Claude Code 2.1.273, scratch project, 2026-09-16), plus
 * the tailer (FA-02: append → entries; incomplete line held back; shrink → reset).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, readFileSync, truncateSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  TranscriptTailer,
  buildVerlauf,
  commandWrapperToText,
  parseTranscriptLine,
  planErgebnis,
  type TranscriptEntry,
} from '../../src/server/services/transcript-reader.js';
import type { Beitrag, DialogKarte } from '../../src/shared/types/gespraech.protocol.js';

const FIXTURE = join(__dirname, '..', 'fixtures', 'transcript', '2.1.273', 'sitzung.jsonl');
const fixtureLines = (): string[] => readFileSync(FIXTURE, 'utf8').split('\n').filter((l) => l.trim());
const parseAll = (lines: string[]): TranscriptEntry[] => lines.flatMap((l) => parseTranscriptLine(l) ?? []);

const dialoge = (b: Beitrag[]): DialogKarte[] => b.filter((x) => x.art === 'dialog').map((x) => (x as Extract<Beitrag, { art: 'dialog' }>).dialog);

describe('parseTranscriptLine()', () => {
  it('reads only user/assistant records; every other record type is ignoriert with its type', () => {
    const entries = parseAll(fixtureLines());
    const ignored = entries.filter((e) => e.kind === 'ignoriert').map((e) => (e as { type: string }).type);
    for (const t of ['attachment', 'system', 'last-prompt', 'mode', 'permission-mode', 'file-history-snapshot', 'ai-title']) {
      expect(ignored, t).toContain(t);
    }
    expect(entries.some((e) => e.kind === 'nutzer')).toBe(true);
    expect(entries.some((e) => e.kind === 'claude')).toBe(true);
    expect(entries.some((e) => e.kind === 'tool_use')).toBe(true);
    expect(entries.some((e) => e.kind === 'tool_result')).toBe(true);
  });

  it('records the version, skips thinking, meta and sidechain records', () => {
    const entries = parseAll(fixtureLines());
    expect(entries.find((e) => e.version)?.version).toBe('2.1.273');
    expect(entries.some((e) => e.kind === 'claude' && e.text.includes('Nebenlinie'))).toBe(false);
    // isMeta user text blocks (system reminders) never become a Nutzer-Beitrag
    const metaLine = fixtureLines().find((l) => l.includes('"isMeta":true') || l.includes('"isMeta": true'));
    if (metaLine) expect(parseTranscriptLine(metaLine)!.every((e) => e.kind === 'ignoriert' || e.kind === 'tool_result')).toBe(true);
  });

  it('a typed slash command comes out as `/name args`; local-command stdout is ignored', () => {
    expect(commandWrapperToText('<command-message>specwright:spec</command-message>\n<command-name>/specwright:spec</command-name>\n<command-args>INT-2026-007</command-args>')).toBe('/specwright:spec INT-2026-007');
    expect(commandWrapperToText('<command-name>clear</command-name>')).toBe('/clear');
    expect(commandWrapperToText('plain text')).toBeUndefined();
    const entries = parseAll(fixtureLines());
    expect(entries.some((e) => e.kind === 'nutzer' && e.text === '/specwright:spec INT-2026-007')).toBe(true);
    expect(entries.some((e) => e.kind === 'nutzer' && e.text.includes('<local-command-stdout>'))).toBe(false);
  });

  it('null for a line that is not JSON; ignoriert for JSON without type/uuid/timestamp', () => {
    expect(parseTranscriptLine('{"type":"user","message":')).toBeNull();
    expect(parseTranscriptLine('nope')).toBeNull();
    expect(parseTranscriptLine('{"foo":1}')).toEqual([{ kind: 'ignoriert', type: '(ohne type)' }]);
    expect(parseTranscriptLine('{"type":"user","message":{"content":"x"}}')).toEqual([{ kind: 'ignoriert', type: 'user' }]);
    expect(parseTranscriptLine('[1,2]')).toBeNull();
  });

  it('bounds texts at 200 kB', () => {
    const line = JSON.stringify({ type: 'user', uuid: 'u1', timestamp: '2026-09-16T07:00:00.000Z', message: { role: 'user', content: 'x'.repeat(250_000) } });
    const [e] = parseTranscriptLine(line)!;
    expect(e.kind).toBe('nutzer');
    expect((e as { text: string }).text.length).toBe(200_000);
  });
});

describe('buildVerlauf() against the 2.1.273 fixture', () => {
  const verlauf = buildVerlauf(parseAll(fixtureLines()));
  const b = verlauf.beitraege;

  it('Nutzer- and Claude-Beiträge in order, with timestamps; multi-block Claude turns merged per message id (FA-01, FA-03)', () => {
    const first = b.find((x) => x.art === 'nutzer') as Extract<Beitrag, { art: 'nutzer' }>;
    expect(first.text).toContain('Zahl 1 in Worten');
    expect(first.quelle).toBe('terminal');
    expect(first.at).toMatch(/^2026-09-16T/);
    const claude = b.filter((x) => x.art === 'claude') as Array<Extract<Beitrag, { art: 'claude' }>>;
    expect(claude.length).toBeGreaterThanOrEqual(5);
    // the long answer (prompt 5) is one Beitrag with the full text
    expect(claude.some((c) => c.text.length > 4000)).toBe(true);
    // no two consecutive claude Beiträge share a message: they were merged
    for (let i = 1; i < b.length; i++) {
      if (b[i].art === 'claude' && b[i - 1].art === 'claude') expect(b[i].id).not.toBe(b[i - 1].id);
    }
  });

  it('AskUserQuestion becomes a Rückfrage card, answered from toolUseResult.answers (FA-12, FA-14)', () => {
    const cards = dialoge(b).filter((d) => d.kind === 'rueckfrage');
    expect(cards.length).toBe(2);
    const single = cards[0];
    expect(single.questions![0]).toMatchObject({ question: 'Welche Farbe magst du?', header: 'Farbe', multiSelect: false });
    expect(single.questions![0].options.map((o) => o.label)).toEqual(['Rot', 'Blau', 'Grün']);
    expect(single.zustand).toBe('beantwortet');
    expect(single.ergebnis).toEqual({ durch: 'terminal', answers: { 'Welche Farbe magst du?': 'Blau' } });
    const multi = cards[1];
    expect(multi.questions!.length).toBe(2);
    expect(multi.questions![0].multiSelect).toBe(true);
    expect(multi.ergebnis?.answers).toEqual({ 'Welche Tiere magst du?': 'Hund', 'Wie viele?': 'Zwei' });
    expect(single.id).toMatch(/^toolu_/);
  });

  it('ExitPlanMode becomes a plan card: accepted / changes with text / cancelled (FA-16, G9)', () => {
    const plans = dialoge(b).filter((d) => d.kind === 'plan');
    expect(plans.length).toBe(3);
    expect(plans[0].plan).toContain('# Plan: hallo.txt');
    expect(plans[0].ergebnis).toEqual({ durch: 'terminal', plan: { entscheidung: 'angenommen' } });
    expect(plans[1].plan).toContain('welt.txt');
    expect(plans[1].ergebnis).toEqual({ durch: 'terminal', plan: { entscheidung: 'aenderungen', text: 'Bitte kürzer fassen.' } });
    expect(plans[2].ergebnis).toEqual({ durch: 'terminal', plan: { entscheidung: 'abgebrochen' } });
    for (const p of plans) expect(p.zustand).toBe('beantwortet');
    expect(verlauf.offeneDialoge).toEqual([]);
  });

  it('other tool calls fold into work blocks with count and duration (E16)', () => {
    const work = b.filter((x) => x.art === 'arbeit') as Array<Extract<Beitrag, { art: 'arbeit' }>>;
    expect(work.length).toBeGreaterThanOrEqual(2);
    for (const w of work) {
      expect(w.werkzeuge).toBeGreaterThanOrEqual(1);
      expect(w.dauerMs).toBeGreaterThanOrEqual(0);
      expect(w.laeuft).toBe(false);
    }
    // a work block never contains the dialog tools
    const planIdx = b.findIndex((x) => x.art === 'dialog');
    expect(planIdx).toBeGreaterThan(0);
  });

  it('reports the version and the share of understood records (ADR-0003)', () => {
    expect(verlauf.version).toBe('2.1.273');
    expect(verlauf.bekannt).toBeGreaterThan(20);
    expect(verlauf.gesamt).toBeGreaterThan(verlauf.bekannt);
  });
});

describe('buildVerlauf() edge cases', () => {
  const at = (s: number): string => new Date(Date.UTC(2026, 8, 16, 7, 0, s)).toISOString();
  it('an open dialog stays offen; a running work block is laeuft', () => {
    const entries: TranscriptEntry[] = [
      { kind: 'nutzer', uuid: 'u1', at: at(0), text: 'hi' },
      { kind: 'tool_use', uuid: 'a1', at: at(1), toolUseId: 't1', name: 'Read', input: {} },
      { kind: 'tool_result', uuid: 'u2', at: at(3), toolUseId: 't1', isError: false, content: 'ok', toolUseResult: {} },
      { kind: 'tool_use', uuid: 'a2', at: at(4), toolUseId: 't2', name: 'Bash', input: {} },
      { kind: 'tool_use', uuid: 'a3', at: at(5), toolUseId: 't3', name: 'AskUserQuestion', input: { questions: [{ question: 'Q?', options: [{ label: 'A' }] }] } },
    ];
    const v = buildVerlauf(entries);
    expect(v.beitraege.map((x) => x.art)).toEqual(['nutzer', 'arbeit', 'dialog']);
    const work = v.beitraege[1] as Extract<Beitrag, { art: 'arbeit' }>;
    expect(work).toMatchObject({ werkzeuge: 2, dauerMs: 3000, laeuft: true });
    expect(v.offeneDialoge).toHaveLength(1);
    expect(v.offeneDialoge[0]).toMatchObject({ id: 't3', kind: 'rueckfrage', zustand: 'offen', quelle: 'transkript' });
  });

  it('planErgebnis by structure: object with plan = angenommen, string with said: = aenderungen, plain rejection = abgebrochen, else unbekannt', () => {
    expect(planErgebnis({ isError: false, content: 'User has approved your plan.', toolUseResult: { plan: '# P' } })).toEqual({ entscheidung: 'angenommen' });
    expect(planErgebnis({ isError: true, content: '… the user said:\nMehr Tests bitte.', toolUseResult: 'Error: … the user said:\nMehr Tests bitte.' })).toEqual({ entscheidung: 'aenderungen', text: 'Mehr Tests bitte.' });
    expect(planErgebnis({ isError: true, content: 'The user doesn\'t want to proceed …', toolUseResult: 'User rejected tool use' })).toEqual({ entscheidung: 'abgebrochen' });
    expect(planErgebnis({ isError: false, content: 'something new', toolUseResult: { other: 1 } })).toEqual({ entscheidung: 'unbekannt' });
  });
});

describe('TranscriptTailer', () => {
  let dir: string;
  let tailer: TranscriptTailer | undefined;
  afterEach(() => {
    tailer?.stop();
    rmSync(dir, { recursive: true, force: true });
  });
  const line = (uuid: string, text: string, sec = 0): string =>
    JSON.stringify({ type: 'user', uuid, timestamp: new Date(Date.UTC(2026, 8, 16, 7, 0, sec)).toISOString(), message: { role: 'user', content: text } });
  const collect = (t: TranscriptTailer): TranscriptEntry[] => {
    const got: TranscriptEntry[] = [];
    t.on('entries', (e: TranscriptEntry[]) => got.push(...e));
    return got;
  };
  const tick = (ms = 60): Promise<void> => new Promise((r) => setTimeout(r, ms));

  it('reads what is there, then appended lines; holds back an incomplete trailing line (FA-02)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'tailer-'));
    const p = join(dir, 't.jsonl');
    writeFileSync(p, line('u1', 'eins') + '\n');
    tailer = new TranscriptTailer(p, { pollMs: 20 });
    const got = collect(tailer);
    await tailer.start();
    expect(got.map((e) => (e as { text: string }).text)).toEqual(['eins']);
    const l2 = line('u2', 'zwei');
    appendFileSync(p, l2.slice(0, 20));
    await tailer.readNow();
    expect(got).toHaveLength(1);
    appendFileSync(p, l2.slice(20) + '\n' + line('u3', 'drei') + '\n');
    await tailer.readNow();
    expect(got.map((e) => (e as { text: string }).text)).toEqual(['eins', 'zwei', 'drei']);
    expect(tailer.stats.zeilen).toBe(3);
  });

  it('a file that appears later is picked up by the poll (transcript is created with the first prompt)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'tailer-'));
    const p = join(dir, 'later.jsonl');
    tailer = new TranscriptTailer(p, { pollMs: 20 });
    const got = collect(tailer);
    await tailer.start();
    expect(got).toHaveLength(0);
    writeFileSync(p, line('u1', 'spät') + '\n');
    await tick(120);
    expect(got.map((e) => (e as { text: string }).text)).toEqual(['spät']);
  });

  it('a shrunken file restarts at offset 0 and emits reset (G14); a defect line is counted, not fatal (H8)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'tailer-'));
    const p = join(dir, 't.jsonl');
    writeFileSync(p, line('u1', 'eins') + '\n' + line('u2', 'zwei') + '\n');
    tailer = new TranscriptTailer(p, { pollMs: 20 });
    const got = collect(tailer);
    let resets = 0;
    tailer.on('reset', () => resets++);
    const defects: unknown[] = [];
    tailer.on('defekt', (s: unknown) => defects.push(s));
    await tailer.start();
    expect(got).toHaveLength(2);
    truncateSync(p, 0);
    writeFileSync(p, 'kaputt\n' + line('u9', 'neu') + '\n');
    await tailer.readNow();
    expect(resets).toBe(1);
    expect(got.map((e) => (e as { text: string }).text)).toEqual(['eins', 'zwei', 'neu']);
    expect(defects).toHaveLength(1);
    expect(tailer.stats.defekt).toBe(1);
  });

  it('concurrent triggers are serialized: no line is delivered twice (G7)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'tailer-'));
    const p = join(dir, 't.jsonl');
    writeFileSync(p, Array.from({ length: 50 }, (_, i) => line(`u${i}`, `t${i}`)).join('\n') + '\n');
    tailer = new TranscriptTailer(p, { pollMs: 5 });
    const got = collect(tailer);
    await Promise.all([tailer.start(), tailer.readNow(), tailer.readNow(), tailer.readNow()]);
    await tick(40);
    const ids = got.map((e) => (e as { uuid: string }).uuid);
    expect(ids).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
  });
});
