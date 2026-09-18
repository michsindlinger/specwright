/**
 * INT-2026-010 stage 2 (plan §4 #65): first input handed over at the
 * session's first Stop (AK-09, FA-11, FA-22 — exactly once, also when
 * queued; refusals keep it up to three times, then a visible
 * `nicht_bestaetigt` entry), `start-step` without a model (last model → step
 * default → refused when nothing is configured), the shared view state
 * `vorhaben:ansicht.set` (validation, broadcast, prune) and the row fields
 * `sessionBusy` / `nextStep` (FA-21). The terminal manager is a fake with a
 * screen, so a dialog cue can refuse the paste.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { PASTE_END, PASTE_START, VorhabenService, type VorhabenSessionInfo } from '../../src/server/services/vorhaben-service.js';
import { FIRST_INPUT_MAX_VERSUCHE, VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import { FREITEXT_MAX_CHARS, type ModelSelection, type VorhabenStateMessage, type VorhabenStep } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string, version = '1.0.0'): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "${version}"  \nbypass: "nein"  \n---\n`;

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'tui', '2.1.273');
const FRAGE_SCREEN = readFileSync(join(FIXTURE_DIR, 'askuserquestion-single.txt'), 'utf8');
const PROMPT_SCREEN = '─────\n❯ \n─────\n  ⏵⏵ bypass permissions on (shift+tab to cycle)\n';

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public writes: Array<[string, string]> = [];
  public created: unknown[][] = [];
  public screen: { text: string; live: boolean } | 'unstable' = { text: PROMPT_SCREEN, live: true };
  private n = 0;
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(id: string, data: string): boolean {
    this.writes.push([id, data]);
    return true;
  }
  async readScreen(): Promise<{ text: string; live: boolean }> {
    if (this.screen === 'unstable') return { text: String(++this.n), live: true };
    return this.screen;
  }
  async waitForIdle(): Promise<void> {}
  async withMachineWrite<T>(_id: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; grund: 'beschaeftigt' | 'nicht_aktiv' }> {
    return { ok: true, value: await fn() };
  }
  async createSession(...args: unknown[]): Promise<{ sessionId: string; effectiveCwd: string }> {
    this.created.push(args);
    const id = `cs-${++this.n}`;
    const projectPath = args[0] as string;
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath, effectiveCwd: projectPath, agentStatus: 'working', modelConfig: args[2] as { model: string; provider?: string } });
    return { sessionId: id, effectiveCwd: projectPath };
  }
  status(id: string, agentStatus: VorhabenSessionInfo['agentStatus'], blockKind?: VorhabenSessionInfo['blockKind']): void {
    const s = this.sessions.get(id)!;
    s.agentStatus = agentStatus;
    if (blockKind) s.blockKind = blockKind;
    else delete s.blockKind;
  }
  /** Claude finished a turn: status first, then the event — the order of CloudTerminalManager.applyAgentEvent. */
  stop(id: string): void {
    this.status(id, 'done');
    this.emit('session.agent-event', id, 'stop');
  }
}

const pastes = (m: FakeManager, id: string): string[] => m.writes.filter(([sid, d]) => sid === id && d.startsWith(PASTE_START)).map(([, d]) => d.slice(PASTE_START.length, -PASTE_END.length));
const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('VorhabenService stage 4 (INT-2026-010)', () => {
  let root: string;
  let projA: string;
  let store: VorhabenStateStore;
  let broadcast: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let reply: ReturnType<typeof vi.fn<(m: OutboundMessage) => void>>;
  let service: VorhabenService;
  let handler: VorhabenHandler;
  let watcher: VorhabenWatcher;
  let manager: FakeManager;
  let names: Record<string, string>;
  let stepDefaults: Partial<Record<VorhabenStep, ModelSelection>>;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const row = (id = 'INT-2026-004') => lastState().rows.find((r) => r.intentId === id)!;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-s4-'));
    projA = join(root, 'a');
    const dir = join(projA, 'intent', 'INT-2026-004-ui');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-004', 'angenommen', '1.2.0'));
    writeFileSync(join(dir, 'spec.md'), '# Spec\n\n> **Status:** entwurf\n');
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    names = {};
    stepDefaults = { spec: { providerId: 'anthropic', modelId: 'opus' }, intent: { providerId: 'anthropic', modelId: 'haiku' } };

    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    reply = vi.fn();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    manager = new FakeManager();
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      setSessionName: (id, name) => {
        names[id] = name;
      },
      resolveModel: (sel) => sel.providerId === 'anthropic' && ['opus', 'haiku', 'sonnet'].includes(sel.modelId),
      defaultModel: (step) => stepDefaults[step] ?? { providerId: 'nope', modelId: 'none' },
      timeZone: 'UTC',
      listWorktrees: async () => ({ isGitRepo: false, mainWorktreePath: null, entries: [] }),
    });
    handler = new VorhabenHandler(service, new ProjectDocsService({ gitDirty: async () => null }), store, broadcast);
    await service.start();
  });

  afterEach(async () => {
    vi.useRealTimers();
    service.stop();
    await store.flush();
    rmSync(root, { recursive: true, force: true });
  });

  describe('first input (AK-09, FA-11, FA-22)', () => {
    it('„Neue Absicht": the text is stored, the pending session shows firstInputPending, the first Stop pastes it once as a freitext entry and clears the flag', async () => {
      const { sessionId } = await service.startStep('pa', undefined, 'intent', { providerId: 'anthropic', modelId: 'haiku' }, undefined, 'Die Liste sortiert falsch, seit gestern, stört mich.');
      expect(manager.created[0]![5]).toBe('/specwright:intent'); // the start prompt stays the bare command (NZ-05)
      expect(store.getFirstInput(sessionId)).toEqual({ text: 'Die Liste sortiert falsch, seit gestern, stört mich.', versuche: 0 });
      await service.rescan();
      expect(lastState().pendingIntents[0]).toMatchObject({ sessionId, session: { firstInputPending: true } });
      expect(pastes(manager, sessionId)).toEqual([]);
      // a `blocked` event is not a Stop → nothing happens
      manager.emit('session.agent-event', sessionId, 'blocked');
      await tick();
      expect(pastes(manager, sessionId)).toEqual([]);
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toEqual(['Die Liste sortiert falsch, seit gestern, stört mich.']);
      expect(store.hasFirstInput(sessionId)).toBe(false);
      const entry = lastState().protocol.find((e) => e.sessionId === sessionId)!;
      expect(entry).toMatchObject({ art: 'freitext', status: 'gesendet', text: 'Die Liste sortiert falsch, seit gestern, stört mich.', projectId: 'pa' });
      expect(entry.intentId).toBeUndefined(); // claimed later by the folder like every pending entry
      expect(lastState().pendingIntents[0].session.firstInputPending).toBeUndefined();
      // a second Stop does not paste again
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toHaveLength(1);
    });

    it('„Freigeben" without a session: the Vorhaben session starts with the Freigabe as first input; queued (`eingereiht`) counts as delivered — never twice (review E1)', async () => {
      const { sessionId } = await service.startStep('pa', 'INT-2026-004', 'spec', undefined, undefined, 'Freigabe: spec.md (Stand 2026-09-16 10:00)');
      await service.rescan();
      expect(row().session).toMatchObject({ id: sessionId, firstInputPending: true });
      expect(row().sessionBusy).toBe(true);
      // the Stop arrives while the status already says working again (fast next turn) → eingereiht, still delivered
      manager.status(sessionId, 'working');
      manager.emit('session.agent-event', sessionId, 'stop');
      await tick(20);
      expect(pastes(manager, sessionId)).toEqual(['Freigabe: spec.md (Stand 2026-09-16 10:00)']);
      const entry = lastState().protocol.find((e) => e.sessionId === sessionId)!;
      expect(entry).toMatchObject({ art: 'freitext', status: 'eingereiht', intentId: 'INT-2026-004' });
      expect(store.hasFirstInput(sessionId)).toBe(false);
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toHaveLength(1);
    });

    it('a dialog on the screen refuses the paste; the text waits for the next Stop; after the third refusal it lands in the protocol as nicht_bestaetigt (review E7)', async () => {
      const { sessionId } = await service.startStep('pa', undefined, 'intent', { providerId: 'anthropic', modelId: 'haiku' }, undefined, 'Erster Text');
      manager.screen = { text: FRAGE_SCREEN, live: true };
      for (let i = 1; i < FIRST_INPUT_MAX_VERSUCHE; i++) {
        manager.stop(sessionId);
        await tick(20);
        expect(pastes(manager, sessionId)).toEqual([]);
        expect(store.getFirstInput(sessionId)).toEqual({ text: 'Erster Text', versuche: i });
        expect(lastState().protocol).toEqual([]); // the refused entry is removed again
      }
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toEqual([]);
      expect(store.hasFirstInput(sessionId)).toBe(false);
      expect(lastState().protocol[0]).toMatchObject({ art: 'freitext', status: 'nicht_bestaetigt', text: 'Erster Text', sessionId, projectId: 'pa' });
      // …and the next Stop with a free prompt line changes nothing any more
      manager.screen = { text: PROMPT_SCREEN, live: true };
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toEqual([]);
    });

    it('a refused attempt followed by a free prompt line delivers on the next Stop', async () => {
      const { sessionId } = await service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, undefined, 'Freigabe: spec.md (Stand x)');
      manager.screen = { text: FRAGE_SCREEN, live: true };
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toEqual([]);
      manager.screen = { text: PROMPT_SCREEN, live: true };
      manager.stop(sessionId);
      await tick(20);
      expect(pastes(manager, sessionId)).toEqual(['Freigabe: spec.md (Stand x)']);
      expect(store.hasFirstInput(sessionId)).toBe(false);
    });

    it('a session that closes before its first Stop drops the text; a Stop of an already closed session clears too (review E18)', async () => {
      const a = (await service.startStep('pa', undefined, 'intent', { providerId: 'anthropic', modelId: 'haiku' }, undefined, 'A')).sessionId;
      manager.sessions.delete(a);
      manager.emit('session.closed', a);
      expect(store.hasFirstInput(a)).toBe(false);
      const b = (await service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, undefined, 'B')).sessionId;
      manager.sessions.get(b)!.status = 'closed';
      manager.emit('session.agent-event', b, 'stop');
      await tick(20);
      expect(pastes(manager, b)).toEqual([]);
      expect(store.hasFirstInput(b)).toBe(false);
      expect(lastState().protocol).toEqual([]);
    });

    it('INT-2026-020 (AK-05): a firstInput carrying a pasted-image path arrives at the first Stop unchanged — spaces around the path and the path itself intact', async () => {
      const text = 'Bitte ansehen: /rt/intent-paste/img-1.png danke';
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r1', projectId: 'pa', step: 'intent', model: { providerId: 'anthropic', modelId: 'haiku' }, firstInput: text }, reply);
      await tick(10);
      const started = reply.mock.calls.map((c) => c[0]).find((m) => m.type === 'vorhaben:step-started') as { sessionId: string };
      expect(started).toBeDefined();
      expect(store.getFirstInput(started.sessionId)?.text).toBe(text);
      manager.stop(started.sessionId);
      await tick(20);
      expect(pastes(manager, started.sessionId)).toEqual([text]);
    });

    it('handler: firstInput is trimmed and bounded; empty or oversized → INVALID_MESSAGE', async () => {
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r1', projectId: 'pa', step: 'intent', model: { providerId: 'anthropic', modelId: 'haiku' }, firstInput: '  \n  Hallo Welt \t\n' }, reply);
      await tick(10);
      const started = reply.mock.calls.map((c) => c[0]).find((m) => m.type === 'vorhaben:step-started') as { sessionId: string };
      expect(started).toBeDefined();
      expect(store.getFirstInput(started.sessionId)?.text).toBe('Hallo Welt');
      reply.mockClear();
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r2', projectId: 'pa', step: 'intent', model: { providerId: 'anthropic', modelId: 'haiku' }, firstInput: '   ' }, reply);
      expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE', requestId: 'r2' });
      reply.mockClear();
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r3', projectId: 'pa', step: 'intent', model: { providerId: 'anthropic', modelId: 'haiku' }, firstInput: 'x'.repeat(FREITEXT_MAX_CHARS + 1) }, reply);
      expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE', requestId: 'r3' });
      reply.mockClear();
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r4', projectId: 'pa', step: 'intent', model: { providerId: 'anthropic', modelId: 'haiku' }, firstInput: 42 }, reply);
      expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE', requestId: 'r4' });
    });
  });

  describe('start-step without a model (FA-22, review E11)', () => {
    it('resolves the last model of (Vorhaben, step), else the step default; nothing configured → INVALID_MESSAGE naming the settings', async () => {
      // step default
      const a = await service.startStep('pa', 'INT-2026-004', 'spec', undefined, undefined);
      expect((manager.created[0] as unknown[])[2]).toEqual({ model: 'opus', provider: 'anthropic' });
      manager.sessions.delete(a.sessionId);
      manager.emit('session.closed', a.sessionId);
      // last model beats the step default
      store.setLastModel('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'sonnet' });
      const b = await service.startStep('pa', 'INT-2026-004', 'spec', undefined, undefined);
      expect((manager.created[1] as unknown[])[2]).toEqual({ model: 'sonnet', provider: 'anthropic' });
      manager.sessions.delete(b.sessionId);
      manager.emit('session.closed', b.sessionId);
      // an explicit model still wins
      await service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'haiku' }, undefined);
      expect((manager.created[2] as unknown[])[2]).toEqual({ model: 'haiku', provider: 'anthropic' });
      // nothing configured for the step
      await expect(service.startStep('pa', undefined, 'plan' as VorhabenStep, undefined, undefined)).rejects.toMatchObject({ code: 'INVALID_MESSAGE', message: 'intentId ist erforderlich' });
      stepDefaults = {};
      await expect(service.startStep('pa', undefined, 'intent', undefined, undefined)).rejects.toMatchObject({ code: 'INVALID_MESSAGE', message: expect.stringContaining('Kein Modell für intent konfiguriert') });
      // the handler accepts a message without `model`, but not a malformed one
      reply.mockClear();
      stepDefaults = { intent: { providerId: 'anthropic', modelId: 'haiku' } };
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r1', projectId: 'pa', step: 'intent' }, reply);
      await tick(10);
      expect(reply.mock.calls.map((c) => c[0])).toContainEqual(expect.objectContaining({ type: 'vorhaben:step-started', requestId: 'r1' }));
      reply.mockClear();
      handler.handle({ type: 'vorhaben:start-step', requestId: 'r2', projectId: 'pa', step: 'intent', model: { providerId: 'anthropic' } }, reply);
      expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE', requestId: 'r2' });
    });
  });

  describe('vorhaben:ansicht.set (FA-03, FA-12; AR-05)', () => {
    it('sets filter and phase, persists, answers with a broadcast; unchanged values broadcast nothing', async () => {
      expect(lastState().ansicht).toEqual({ filterProjectId: null, phase: {} });
      const before = broadcast.mock.calls.length;
      handler.handle({ type: 'vorhaben:ansicht.set', filterProjectId: 'pa' }, reply);
      expect(broadcast.mock.calls.length).toBe(before + 1);
      expect(lastState().ansicht.filterProjectId).toBe('pa');
      handler.handle({ type: 'vorhaben:ansicht.set', filterProjectId: 'pa' }, reply);
      expect(broadcast.mock.calls.length).toBe(before + 1);
      handler.handle({ type: 'vorhaben:ansicht.set', phase: { projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec' } }, reply);
      expect(lastState().ansicht).toEqual({ filterProjectId: 'pa', phase: { 'pa::INT-2026-004': 'spec' } });
      handler.handle({ type: 'vorhaben:ansicht.set', filterProjectId: null, phase: { projectId: 'pa', intentId: 'INT-2026-004', doc: 'design' } }, reply);
      expect(lastState().ansicht).toEqual({ filterProjectId: null, phase: { 'pa::INT-2026-004': 'design' } });
      expect(reply).not.toHaveBeenCalled();
      await store.flush();
      const again = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
      await again.load();
      expect(again.getAnsicht()).toEqual({ filterProjectId: null, phase: { 'pa::INT-2026-004': 'design' } });
    });

    it('validation: unknown project, malformed id, unknown doc, empty message → error reply, state untouched', () => {
      const cases: Array<Record<string, unknown>> = [
        { type: 'vorhaben:ansicht.set', filterProjectId: 'zz' },
        { type: 'vorhaben:ansicht.set', filterProjectId: 7 },
        { type: 'vorhaben:ansicht.set', phase: { projectId: 'zz', intentId: 'INT-2026-004', doc: 'spec' } },
        { type: 'vorhaben:ansicht.set', phase: { projectId: 'pa', intentId: 'INT-4', doc: 'spec' } },
        { type: 'vorhaben:ansicht.set', phase: { projectId: 'pa', intentId: 'INT-2026-004', doc: 'readme' } },
        { type: 'vorhaben:ansicht.set', phase: 'spec' },
        { type: 'vorhaben:ansicht.set' },
      ];
      for (const m of cases) {
        reply.mockClear();
        expect(handler.handle(m, reply)).toBe(true);
        expect(reply.mock.calls[0]?.[0]).toMatchObject({ type: 'vorhaben:error' });
      }
      expect(store.getAnsicht()).toEqual({ filterProjectId: null, phase: {} });
    });

    it('prune: the phase entry of a Vorhaben that vanished from the list goes with the next scan (review E14)', async () => {
      service.setAnsicht({ phase: { projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec' } });
      service.setAnsicht({ phase: { projectId: 'pa', intentId: 'INT-2026-009', doc: 'plan' } }); // no such row
      expect(store.getAnsicht().phase).toEqual({ 'pa::INT-2026-004': 'spec', 'pa::INT-2026-009': 'plan' });
      await service.rescan();
      expect(lastState().ansicht.phase).toEqual({ 'pa::INT-2026-004': 'spec' });
    });
  });

  describe('row fields (FA-21)', () => {
    it('nextStep is always on the row; sessionBusy follows the live session', async () => {
      expect(row()).toMatchObject({ sessionBusy: false, nextStep: { step: 'spec' }, freigabeDoc: 'spec' });
      const { sessionId } = await service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, undefined);
      await service.rescan();
      expect(row()).toMatchObject({ zustand: 'arbeitet', sessionBusy: true, nextStep: { step: 'spec' } });
      manager.status(sessionId, 'done');
      await service.rescan();
      expect(row()).toMatchObject({ zustand: 'wartet_auf_dich', sessionBusy: true, reviewDoc: 'spec', freigabeDoc: 'spec' });
      manager.sessions.delete(sessionId);
      manager.emit('session.closed', sessionId);
      await service.rescan();
      expect(row()).toMatchObject({ zustand: 'sitzung_beendet', sessionBusy: false, nextStep: { step: 'spec' } });
    });
  });
});
