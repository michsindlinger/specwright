/**
 * INT-2026-025: AnrufService (Plan D1, D2, D5a, D6, D10; §8 FA-01…FA-05,
 * FA-11, FA-12, FA-25, FA-27, D5a, D6 F6/F15).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  AnrufService,
  type AnrufErkennungPort,
  type AnrufEventDetail,
  type AnrufSenderPort,
  type AnrufSendeAuftragPort,
  type AnrufSitzung,
  type AnrufSitzungsQuelle,
} from '../../src/server/services/anruf-service.js';
import {
  ANRUF_ANWEISUNG_AN,
  ANRUF_ANWEISUNG_AUS,
  ANRUF_CLIENT_KULANZ_MS,
  type AnrufServerMessage,
  type AnrufStateMessage,
  type AnrufVerfuegbarkeit,
} from '../../src/shared/types/anruf.protocol.js';

const S1 = 'cloud-1-1';
const S2 = 'cloud-1-2';
const S3 = 'cloud-1-3';
const GEHEIM = 'GEHEIMER-PROJEKTINHALT-4711';

class FakeQuelle extends EventEmitter implements AnrufSitzungsQuelle {
  sessions = new Map<string, AnrufSitzung>();
  add(id: string, extra: Partial<AnrufSitzung> = {}): void {
    this.sessions.set(id, { sessionId: id, projectPath: '/p/specwright', effectiveCwd: `/w/${id}-wt`, terminalType: 'claude-code', status: 'active', agentStatus: 'working', ...extra });
  }
  getSession(id: string): AnrufSitzung | undefined {
    return this.sessions.get(id);
  }
  getAllSessions(): AnrufSitzung[] {
    return [...this.sessions.values()];
  }
  /** Setzt den Sitzungszustand wie applyAgentEvent und emittiert. */
  event(id: string, event: string, detail: AnrufEventDetail): void {
    const s = this.sessions.get(id);
    if (s) {
      s.agentStatus = detail.status;
      s.blockKind = detail.status === 'blocked' ? detail.blockKind : undefined;
      s.agentDoneAt = detail.doneAt;
    }
    this.emit('session.agent-event', id, event, detail);
  }
  close(id: string): void {
    this.sessions.delete(id);
    this.emit('session.closed', id);
  }
}

class FakeErkennung extends EventEmitter implements AnrufErkennungPort {
  verf: AnrufVerfuegbarkeit = { verfuegbar: true };
  gestartet = 0;
  gestoppt = 0;
  antwort: { text: string } | { grund: 'nichts_verstanden' } = { text: 'zwei' };
  verfuegbarkeit(): AnrufVerfuegbarkeit {
    return this.verf;
  }
  async start(): Promise<void> {
    this.gestartet++;
  }
  async stop(): Promise<void> {
    this.gestoppt++;
  }
  laeuft(): boolean {
    return this.gestartet > this.gestoppt;
  }
  async erkenne(): Promise<{ text: string } | { grund: 'nichts_verstanden' }> {
    return this.antwort;
  }
}

class FakeSender implements AnrufSenderPort {
  auftraege: AnrufSendeAuftragPort[] = [];
  ergebnis: { ok: true } | { ok: false; grund: 'eingabe_nicht_leer'; text: string } = { ok: true };
  wortlaut: { wortlaut: string } | { ok: false; grund: 'plan_review_laeuft'; text: string } = { wortlaut: 'Yes, manually approve edits' };
  async freigabeWortlaut(): Promise<typeof this.wortlaut> {
    return this.wortlaut;
  }
  async sende(auftrag: AnrufSendeAuftragPort): Promise<typeof this.ergebnis> {
    this.auftraege.push(auftrag);
    return this.ergebnis;
  }
}

let tmp: string;
let quelle: FakeQuelle;
let erkennung: FakeErkennung;
let sender: FakeSender;
let ids: number;

function baue(extra: { abgeschaltet?: boolean } = {}): AnrufService {
  const service = new AnrufService({
    quelle,
    erkennung,
    sender,
    statePath: path.join(tmp, 'anruf-3111.json'),
    kontextDir: path.join(tmp, 'anruf-kontext-3111'),
    neueId: () => `m${++ids}`,
    ...extra,
  });
  service.start();
  return service;
}

/** Client mit Posteingang. */
function client(service: AnrufService, id: string, opts: { lokal?: boolean; faehig?: boolean } = {}): AnrufServerMessage[] {
  const inbox: AnrufServerMessage[] = [];
  service.clientDa(id, opts.lokal ?? true, (m) => inbox.push(m));
  if (opts.faehig ?? true) service.faehig(id, 'ok', true);
  return inbox;
}

function letzterState(inbox: AnrufServerMessage[]): AnrufStateMessage {
  const states = inbox.filter((m): m is AnrufStateMessage => m.type === 'anruf:state');
  return states[states.length - 1];
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function rueckfrageHook(service: AnrufService, id: string, frage = 'Welche Farbe?'): void {
  service.hookInhalt(id, {
    hook_event_name: 'PreToolUse',
    tool_name: 'AskUserQuestion',
    tool_input: { questions: [{ question: frage, header: 'Farbe', options: [{ label: 'Rot' }, { label: 'Blau' }], multiSelect: false }] },
  });
  quelle.event(id, 'blocked', { status: 'blocked', blockKind: 'rueckfrage', blockedBy: 'hook' });
}

function planHook(service: AnrufService, id: string): void {
  service.hookInhalt(id, { hook_event_name: 'PreToolUse', tool_name: 'ExitPlanMode', tool_input: { plan: 'Sprechfassung: Ich baue den Knopf.\n\nDetails' } });
  quelle.event(id, 'blocked', { status: 'blocked', blockKind: 'plan', blockedBy: 'hook' });
}

function stopHook(service: AnrufService, id: string, text = `Erledigt. ${GEHEIM}\n\nSprechfassung: Ich bin fertig.`): void {
  service.hookInhalt(id, { hook_event_name: 'Stop', last_assistant_message: text });
  quelle.event(id, 'stop', { status: 'done', doneAt: new Date() });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anruf-service-'));
  quelle = new FakeQuelle();
  erkennung = new FakeErkennung();
  sender = new FakeSender();
  ids = 0;
  quelle.add(S1);
  quelle.add(S2);
  quelle.add(S3);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('FA-01 Schalter', () => {
  it('Standard aus, übersteht Neustart, Datei 0600, Umschalten broadcastet', async () => {
    const service = baue();
    expect(service.istAn()).toBe(false);
    const inbox = client(service, 'c1');
    const fern = client(service, 'c2', { lokal: false, faehig: false });
    expect(await service.setModus('c1', true)).toBeUndefined();
    const statePath = path.join(tmp, 'anruf-3111.json');
    expect(JSON.parse(fs.readFileSync(statePath, 'utf-8'))).toEqual({ an: true });
    expect(fs.statSync(statePath).mode & 0o777).toBe(0o600);
    expect(letzterState(inbox).an).toBe(true);
    expect(fern.some((m) => m.type === 'anruf:verfuegbarkeit' && m.an && !m.lokal && m.verfuegbarkeit.grund === 'nicht_lokal')).toBe(true);
    expect(fern.some((m) => m.type === 'anruf:state')).toBe(false);
    expect(erkennung.gestartet).toBe(1);
    await service.stop();

    const neu = baue();
    expect(neu.istAn()).toBe(true);
    expect(erkennung.gestartet).toBe(2);
  });

  it('nicht verfügbar → Einschalten abgelehnt mit Grund', async () => {
    erkennung.verf = { verfuegbar: false, grund: 'modell_fehlt', text: 'Modell fehlt' };
    const service = baue();
    const err = await service.setModus('c1', true);
    expect(err).toMatchObject({ code: 'ANRUF_NICHT_VERFUEGBAR', message: 'Modell fehlt' });
    expect(service.istAn()).toBe(false);
  });

  it('Kill-Switch: „abgeschaltet", auch wenn die Datei an sagt', async () => {
    fs.writeFileSync(path.join(tmp, 'anruf-3111.json'), '{"an":true}');
    const service = baue({ abgeschaltet: true });
    expect(service.istAn()).toBe(false);
    expect(service.verfuegbarkeit()).toMatchObject({ verfuegbar: false, grund: 'abgeschaltet' });
    expect((await service.setModus('c1', true))?.code).toBe('ANRUF_NICHT_VERFUEGBAR');
    expect(fs.existsSync(path.join(tmp, 'anruf-kontext-3111', 'an.json'))).toBe(false);
  });
});

describe('FA-02 Modus aus', () => {
  it('speichert keinen Inhalt, schreibt kein an.json, klingelt nicht', () => {
    const service = baue();
    const inbox = client(service, 'c1');
    rueckfrageHook(service, S1);
    stopHook(service, S2);
    expect(fs.existsSync(path.join(tmp, 'anruf-kontext-3111', 'an.json'))).toBe(false);
    expect(letzterState(inbox).zustand).toBe('ruhe');
    expect(service.wartend()).toBe(0);
  });

  it('Inhalt aus der Aus-Zeit fehlt nach dem Einschalten (nicht gespeichert)', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    service.hookInhalt(S1, { hook_event_name: 'Stop', last_assistant_message: GEHEIM });
    await service.setModus('c1', true);
    quelle.event(S1, 'stop', { status: 'done', doneAt: new Date() });
    const m = letzterState(inbox).meldung;
    expect(m?.art).toBe('fertig');
    service.annehmen('c1', m!.id);
    expect(letzterState(inbox).meldung?.text).toBeUndefined();
  });
});

describe('D2 Kontext-Dateien', () => {
  it('an → an.json (0700/0600); aus → an.json weg, aus-<id>.json je Sitzung der An-Zeit; Schließen räumt auf', async () => {
    const service = baue();
    client(service, 'c1');
    await service.setModus('c1', true);
    const dir = path.join(tmp, 'anruf-kontext-3111');
    const an = JSON.parse(fs.readFileSync(path.join(dir, 'an.json'), 'utf-8'));
    expect(an).toEqual({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ANRUF_ANWEISUNG_AN } });
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
    expect(fs.statSync(path.join(dir, 'an.json')).mode & 0o777).toBe(0o600);

    await service.setModus('c1', false);
    expect(fs.existsSync(path.join(dir, 'an.json'))).toBe(false);
    for (const id of [S1, S2, S3]) {
      const aus = JSON.parse(fs.readFileSync(path.join(dir, `aus-${id}.json`), 'utf-8'));
      expect(aus.hookSpecificOutput.additionalContext).toBe(ANRUF_ANWEISUNG_AUS);
    }
    quelle.close(S2);
    expect(fs.existsSync(path.join(dir, `aus-${S2}.json`))).toBe(false);
    expect(fs.readdirSync(dir).some((n) => n.includes('.tmp-'))).toBe(false);
  });

  it('Boot räumt verwaiste aus-* auf und entfernt an.json bei Modus aus', () => {
    const dir = path.join(tmp, 'anruf-kontext-3111');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'aus-cloud-9-9.json'), '{}');
    fs.writeFileSync(path.join(dir, `aus-${S1}.json`), '{}');
    fs.writeFileSync(path.join(dir, 'an.json'), '{}');
    baue();
    expect(fs.readdirSync(dir).sort()).toEqual([`aus-${S1}.json`]);
  });
});

describe('FA-03 Klingeln', () => {
  it('blocked/rueckfrage → klingelt sofort mit Sitzung, Projekt, Art; Inhalt erst nach Annahme', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    const st = letzterState(inbox);
    expect(st.zustand).toBe('klingelt');
    expect(st.meldung).toMatchObject({ sessionId: S1, sitzungName: `${S1}-wt`, projektName: 'specwright', art: 'rueckfrage', nurBildschirm: false });
    expect(st.meldung?.text).toBeUndefined();
    expect(service.annehmen('c1', st.meldung!.id)).toBeUndefined();
    const lauf = letzterState(inbox);
    expect(lauf).toMatchObject({ zustand: 'laeuft', eigener: true });
    expect(lauf.meldung?.text?.vorlesen).toContain('Welche Farbe?');
    expect(lauf.meldung?.fragen?.[0].optionen).toEqual(['Rot', 'Blau']);
  });

  it('stop → fertig mit Sprechfassung (D7)', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    stopHook(service, S1);
    service.annehmen('c1', letzterState(inbox).meldung!.id);
    expect(letzterState(inbox).meldung?.text).toMatchObject({ vorlesen: 'Ich bin fertig.', ohneSprechfassung: false });
  });

  it('beim Einschalten klingelt nichts Altes (AN-S06)', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'rueckfrage', blockedBy: 'hook' });
    await service.setModus('c1', true);
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'rueckfrage', blockedBy: 'hook' });
    expect(letzterState(inbox).zustand).toBe('ruhe');
  });
});

describe('FA-04 nur mit lokalem fähigem Client (O2)', () => {
  it('ohne fähigen Client keine Meldung; nach Trennen 30 s Kulanz', async () => {
    const service = baue();
    const inbox = client(service, 'c1', { faehig: false });
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    expect(letzterState(inbox).zustand).toBe('ruhe');
    quelle.event(S1, 'unblocked', { status: 'working' });

    service.faehig('c1', 'ok', true);
    service.clientWeg('c1');
    vi.advanceTimersByTime(10_000);
    rueckfrageHook(service, S1);
    expect(service.zustandName()).toBe('klingelt');
    vi.advanceTimersByTime(ANRUF_CLIENT_KULANZ_MS);
    expect(service.zustandName()).toBe('ruhe');
    rueckfrageHook(service, S2);
    expect(service.zustandName()).toBe('ruhe');
    expect(service.wartend()).toBe(0);
  });

  it('nicht lokaler Client zählt nicht als fähig', async () => {
    const service = baue();
    const lokal = client(service, 'c1', { faehig: false });
    client(service, 'c2', { lokal: false, faehig: true });
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    expect(letzterState(lokal).zustand).toBe('ruhe');
  });
});

describe('FA-05 kein Anruf', () => {
  it('berechtigung, unbekannt, stop-failure, Probe unbekannt klingeln nicht', async () => {
    const service = baue();
    client(service, 'c1');
    await service.setModus('c1', true);
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'berechtigung', blockedBy: 'hook' });
    quelle.event(S2, 'blocked', { status: 'blocked', blockKind: 'unbekannt', blockedBy: 'hook' });
    quelle.event(S3, 'stop-failure', { status: 'error' });
    quelle.event(S3, 'blocked', { status: 'blocked', blockKind: 'unbekannt', blockedBy: 'probe' });
    expect(service.zustandName()).toBe('ruhe');
    expect(service.wartend()).toBe(0);
  });
});

describe('FA-06/FA-07 Warteschlange', () => {
  it('weitere Meldungen warten, Zahl im Zustand; nach Ende klingelt die erste wartende (Rückfrage vor fertig)', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    stopHook(service, S1);
    stopHook(service, S2);
    rueckfrageHook(service, S3);
    const st = letzterState(inbox);
    expect(st.meldung?.sessionId).toBe(S1);
    expect(st.wartend).toBe(2);
    service.ablehnen('c1', st.meldung!.id);
    expect(letzterState(inbox).meldung?.sessionId).toBe(S3);
  });
});

describe('FA-11 anderweitig erledigt', () => {
  it('klingelnde Rückfrage endet bei unblocked; laufender Anruf sagt „schon beantwortet"', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    quelle.event(S1, 'unblocked', { status: 'working' });
    expect(letzterState(inbox).zustand).toBe('ruhe');

    rueckfrageHook(service, S1);
    service.annehmen('c1', letzterState(inbox).meldung!.id);
    quelle.event(S1, 'unblocked', { status: 'working' });
    expect(letzterState(inbox)).toMatchObject({ zustand: 'ruhe', endeGrund: 'In der Sitzung schon beantwortet.' });
  });

  it('wartende Meldung verlässt die Schlange; Schließen der Sitzung ebenso', async () => {
    const service = baue();
    client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    rueckfrageHook(service, S2);
    stopHook(service, S3);
    expect(service.wartend()).toBe(2);
    quelle.event(S2, 'unblocked', { status: 'working' });
    expect(service.wartend()).toBe(1);
    quelle.close(S3);
    expect(service.wartend()).toBe(0);
  });

  it('fertig: idle-timeout/idle-prompt lösen nicht auf, session-start und stop-failure schon (D5a)', async () => {
    const service = baue();
    client(service, 'c1');
    await service.setModus('c1', true);
    stopHook(service, S1);
    const doneAt = quelle.getSession(S1)!.agentDoneAt;
    quelle.event(S1, 'idle-timeout', { status: 'idle', doneAt });
    quelle.event(S1, 'idle-prompt', { status: 'idle', doneAt });
    expect(service.zustandName()).toBe('klingelt');
    quelle.event(S1, 'session-start', { status: 'idle' });
    expect(service.zustandName()).toBe('ruhe');

    stopHook(service, S2);
    quelle.event(S2, 'stop-failure', { status: 'error' });
    expect(service.zustandName()).toBe('ruhe');
  });
});

describe('D5a Meldungslogik', () => {
  it('blocked→blocked klingelt nicht neu und hebt die Ablehnung nicht auf', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    service.ablehnen('c1', letzterState(inbox).meldung!.id);
    quelle.event(S1, 'review-injected', { status: 'blocked', blockKind: 'rueckfrage', blockedBy: 'hook' });
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'unbekannt', blockedBy: 'hook' });
    expect(service.zustandName()).toBe('ruhe');
    expect(service.wartend()).toBe(0);
  });

  it('Probe-Block → nur am Bildschirm; späterer Hook hängt den Inhalt an', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'rueckfrage', blockedBy: 'probe' });
    const st = letzterState(inbox);
    expect(st.meldung).toMatchObject({ art: 'rueckfrage', nurBildschirm: true });
    service.hookInhalt(S1, {
      hook_event_name: 'PreToolUse',
      tool_name: 'AskUserQuestion',
      tool_input: { questions: [{ question: 'Welche Stadt?', options: [{ label: 'Rom' }], multiSelect: false }] },
    });
    expect(letzterState(inbox).meldung?.nurBildschirm).toBe(false);
    service.annehmen('c1', st.meldung!.id);
    expect(letzterState(inbox).meldung?.text?.vorlesen).toContain('Welche Stadt?');
  });

  it('Wechsel rueckfrage↔plan innerhalb blocked ist eine neue Meldung', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    const alt = letzterState(inbox).meldung!.id;
    planHook(service, S1);
    const neu = letzterState(inbox).meldung!;
    expect(neu.art).toBe('plan');
    expect(neu.id).not.toBe(alt);
    expect(service.zustandName()).toBe('klingelt');
  });

  it('Probe-Meldung übernimmt keinen alten Inhalt', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1, 'Alte Frage?');
    service.ablehnen('c1', letzterState(inbox).meldung!.id);
    // PostToolUse ging verloren; die Sitzung blockiert erneut, nur der Bildschirm sieht es.
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'plan', blockedBy: 'probe' });
    quelle.event(S1, 'blocked', { status: 'blocked', blockKind: 'rueckfrage', blockedBy: 'probe' });
    expect(letzterState(inbox).meldung).toMatchObject({ art: 'rueckfrage', nurBildschirm: true });
  });
});

describe('FA-12 Anrufen aus der Glocke', () => {
  it('ohne Klingeln; klingelnde geht zurück an ihren Platz; ANRUF_BESETZT', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    stopHook(service, S1);
    expect(letzterState(inbox).meldung?.sessionId).toBe(S1);
    // S2 blockiert, bevor der Modus an war → per Anrufen holen.
    quelle.sessions.get(S2)!.agentStatus = 'blocked';
    quelle.sessions.get(S2)!.blockKind = 'plan';
    expect(service.anrufen('c1', S2)).toBeUndefined();
    const st = letzterState(inbox);
    expect(st).toMatchObject({ zustand: 'laeuft', eigener: true, wartend: 1 });
    expect(st.meldung).toMatchObject({ sessionId: S2, art: 'plan', nurBildschirm: true });
    expect(service.anrufen('c1', S1)?.code).toBe('ANRUF_BESETZT');
    service.auflegen('c1', st.meldung!.id);
    expect(letzterState(inbox).meldung?.sessionId).toBe(S1);
  });

  it('Sitzung ohne wartenden Zustand → MELDUNG_WEG; Modus aus → nicht verfügbar', async () => {
    const service = baue();
    client(service, 'c1');
    expect(service.anrufen('c1', S1)?.code).toBe('ANRUF_NICHT_VERFUEGBAR');
    await service.setModus('c1', true);
    expect(service.anrufen('c1', S1)?.code).toBe('MELDUNG_WEG');
  });
});

describe('FA-25 Senden und Auflegen', () => {
  it('Senden ok → „Gesendet" an den Besitzer, Anruf endet, nächste klingelt', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    stopHook(service, S2);
    const id = letzterState(inbox).meldung!.id;
    service.annehmen('c1', id);
    expect(service.senden('c1', id, { art: 'rueckfrage', antworten: [{ nummern: [2] }] })).toBeUndefined();
    expect(service.zustandName()).toBe('sendet');
    await flush();
    expect(sender.auftraege[0]).toMatchObject({ sessionId: S1, art: 'rueckfrage', antwort: { art: 'rueckfrage' } });
    expect(sender.auftraege[0].fragen?.[0].frage).toBe('Welche Farbe?');
    expect(inbox).toContainEqual({ type: 'anruf:ergebnis', meldungId: id, ok: true });
    expect(letzterState(inbox).meldung?.sessionId).toBe(S2);
  });

  it('Senden scheitert → Anruf bleibt offen mit Grund', async () => {
    sender.ergebnis = { ok: false, grund: 'eingabe_nicht_leer', text: 'Text steht noch' };
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    stopHook(service, S1);
    const id = letzterState(inbox).meldung!.id;
    service.annehmen('c1', id);
    service.senden('c1', id, { art: 'text', text: 'weiter so' });
    await flush();
    expect(inbox).toContainEqual({ type: 'anruf:ergebnis', meldungId: id, ok: false, grund: 'eingabe_nicht_leer', text: 'Text steht noch' });
    expect(service.zustandName()).toBe('laeuft');
  });

  it('Auflegen ohne Senden: kein Senden, Meldung klingelt nicht erneut', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    const id = letzterState(inbox).meldung!.id;
    service.annehmen('c1', id);
    service.auflegen('c1', id);
    await flush();
    expect(sender.auftraege).toHaveLength(0);
    expect(service.zustandName()).toBe('ruhe');
    expect(service.wartend()).toBe(0);
  });
});

describe('D6 Freigabe und mehrere Fenster (Review F6, F15)', () => {
  it('freigeben ohne Nachfrage → INVALID_MESSAGE; nach Nachfrage des Besitzers → sendet', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    planHook(service, S1);
    const id = letzterState(inbox).meldung!.id;
    service.annehmen('c1', id);
    expect(service.senden('c1', id, { art: 'freigeben' })?.code).toBe('INVALID_MESSAGE');
    expect(await service.freigebenAnfragen('c1', id)).toBeUndefined();
    expect(letzterState(inbox)).toMatchObject({ zustand: 'freigabe_nachfrage', freigabeWortlaut: 'Yes, manually approve edits' });
    expect(service.senden('c1', id, { art: 'freigeben' })).toBeUndefined();
    await flush();
    expect(sender.auftraege[0].antwort).toEqual({ art: 'freigeben' });
  });

  it('Nachfrage scheitert (Plan-Review läuft) → Ergebnis mit Grund, Zustand bleibt', async () => {
    sender.wortlaut = { ok: false, grund: 'plan_review_laeuft', text: 'Review läuft' };
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    planHook(service, S1);
    const id = letzterState(inbox).meldung!.id;
    service.annehmen('c1', id);
    await service.freigebenAnfragen('c1', id);
    expect(inbox).toContainEqual({ type: 'anruf:ergebnis', meldungId: id, ok: false, grund: 'plan_review_laeuft', text: 'Review läuft' });
    expect(service.zustandName()).toBe('laeuft');
  });

  it('zweites Fenster: klingelt in beiden; nach Annahme nur Kopfdaten, erkannt nur an den Besitzer', async () => {
    const service = baue();
    const a = client(service, 'c1');
    const b = client(service, 'c2');
    await service.setModus('c1', true);
    stopHook(service, S1);
    expect(letzterState(a).zustand).toBe('klingelt');
    expect(letzterState(b).zustand).toBe('klingelt');
    const id = letzterState(a).meldung!.id;
    service.annehmen('c2', id);
    expect(service.annehmen('c1', id)?.code).toBe('ANRUF_BESETZT');
    expect(letzterState(a)).toMatchObject({ zustand: 'laeuft', eigener: false });
    expect(letzterState(a).meldung?.text).toBeUndefined();
    expect(letzterState(b).meldung?.text).toBeDefined();
    expect((await service.erkennen('c1', id, new Int16Array(10)))?.code).toBe('INVALID_MESSAGE');
    await service.erkennen('c2', id, new Int16Array(10));
    expect(b).toContainEqual({ type: 'anruf:erkannt', meldungId: id, text: 'zwei' });
    expect(a.some((m) => m.type === 'anruf:erkannt')).toBe(false);
  });

  it('Besitzer trennt sich → Anruf endet ohne Senden, Meldung klingelt wieder (AN-S08)', async () => {
    const service = baue();
    const a = client(service, 'c1');
    client(service, 'c2');
    await service.setModus('c1', true);
    stopHook(service, S1);
    const id = letzterState(a).meldung!.id;
    service.annehmen('c2', id);
    service.clientWeg('c2');
    expect(letzterState(a)).toMatchObject({ zustand: 'klingelt', meldung: { id } });
  });
});

describe('Ausschalten (A5)', () => {
  it('beendet den Anruf, leert Schlange und Inhalte, stoppt die Erkennung', async () => {
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    rueckfrageHook(service, S1);
    stopHook(service, S2);
    service.annehmen('c1', letzterState(inbox).meldung!.id);
    await service.setModus('c1', false);
    expect(letzterState(inbox)).toMatchObject({ an: false, zustand: 'ruhe', wartend: 0 });
    expect(erkennung.gestoppt).toBe(1);
    await service.setModus('c1', true);
    expect(service.anrufen('c1', S2)).toBeUndefined();
    expect(letzterState(inbox).meldung?.text).toBeUndefined();
  });
});

describe('FA-27 keine Inhalte auf Platte oder im Log', () => {
  it('Schreibaufrufe und Logs enthalten weder Inhalt noch erkannten Text', async () => {
    const writes: string[] = [];
    const orig = fs.writeFileSync;
    vi.spyOn(fs, 'writeFileSync').mockImplementation((file, data, opts) => {
      writes.push(String(file) + String(data));
      return orig(file, data, opts);
    });
    const logs: string[] = [];
    for (const k of ['log', 'warn', 'error', 'info', 'debug'] as const) {
      vi.spyOn(console, k).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });
    }
    erkennung.antwort = { text: `erkannt ${GEHEIM}` };
    const service = baue();
    const inbox = client(service, 'c1');
    await service.setModus('c1', true);
    stopHook(service, S1);
    const id = letzterState(inbox).meldung!.id;
    service.annehmen('c1', id);
    await service.erkennen('c1', id, new Int16Array(100));
    service.senden('c1', id, { art: 'text', text: `Antwort ${GEHEIM}` });
    await flush();
    await service.setModus('c1', false);
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.join('\n')).not.toContain(GEHEIM);
    expect(logs.join('\n')).not.toContain(GEHEIM);
  });
});
