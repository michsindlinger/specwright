/**
 * INT-2026-004 stage 2: session assignment (FA-21/22), review channel
 * (FA-27–FA-34, V-10/V-11), next step (FA-35/40, V-13). The terminal manager
 * is a fake that records PTY writes and createSession arguments.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  PASTE_END,
  PASTE_START,
  SendRejectedError,
  VorhabenService,
  buildAenderungenText,
  buildFreigabeText,
  detectV4Command,
  formatStandLabel,
  normalizeAnmerkungText,
  type VorhabenSessionInfo,
} from '../../src/server/services/vorhaben-service.js';
import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import { VorhabenWatcher } from '../../src/server/services/vorhaben-watcher.js';
import { VorhabenHandler, type OutboundMessage } from '../../src/server/services/vorhaben-handler.js';
import { ProjectDocsService } from '../../src/server/services/project-docs.service.js';
import type { Anmerkung, VorhabenStateMessage } from '../../src/shared/types/vorhaben.protocol.js';

const intentText = (id: string, status: string, version = '1.0.0'): string =>
  `---\nintent_id: "${id}"  \ntitel: "Titel ${id}"  \nstatus: "${status}"  \nversion: "${version}"  \nbypass: "nein"  \n---\n`;

class FakeManager extends EventEmitter {
  public sessions = new Map<string, VorhabenSessionInfo>();
  public writes: Array<[string, string]> = [];
  public created: unknown[][] = [];
  public writeOk = true;
  private n = 0;
  getSession(id: string): VorhabenSessionInfo | undefined {
    return this.sessions.get(id);
  }
  sendInput(id: string, data: string): boolean {
    this.writes.push([id, data]);
    return this.writeOk;
  }
  async createSession(...args: unknown[]): Promise<{ sessionId: string; effectiveCwd: string }> {
    this.created.push(args);
    const id = `cs-${++this.n}`;
    const projectPath = args[0] as string;
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath, effectiveCwd: projectPath, agentStatus: 'unknown', modelConfig: args[2] as { model: string; provider?: string } });
    return { sessionId: id, effectiveCwd: projectPath };
  }
  add(id: string, projectPath: string, agentStatus: VorhabenSessionInfo['agentStatus'] = 'done', model = 'opus', terminalType: 'shell' | 'claude-code' = 'claude-code'): void {
    this.sessions.set(id, { sessionId: id, status: 'active', projectPath, effectiveCwd: projectPath, agentStatus, terminalType, modelConfig: { model, provider: 'anthropic' } });
  }
}

const STAND = Date.UTC(2026, 8, 15, 16, 42, 0);

describe('pure helpers', () => {
  it('detectV4Command: short and long form, with and without id (FA-21)', () => {
    expect(detectV4Command('/plan INT-2026-004')).toEqual({ step: 'plan', intentId: 'INT-2026-004' });
    expect(detectV4Command('  /specwright:build INT-2026-004 weiter')).toEqual({ step: 'build', intentId: 'INT-2026-004' });
    expect(detectV4Command('/intent')).toEqual({ step: 'intent' });
    expect(detectV4Command('/intent\nzweite Zeile')).toEqual({ step: 'intent' });
    // INT-2026-016 (AK-08): the short form resolves later; the long form must win the alternation
    expect(detectV4Command('/specwright:plan INT-002')).toEqual({ step: 'plan', intentId: 'INT-002' });
    expect(detectV4Command('/plan INT-2026-002')).toEqual({ step: 'plan', intentId: 'INT-2026-002' });
    expect(detectV4Command('/build INT-0021')).toEqual({ step: 'build' });
    expect(detectV4Command('bitte /plan INT-2026-004')).toBeUndefined();
    expect(detectV4Command('/planen INT-2026-004')).toBeUndefined();
    expect(detectV4Command('Änderungen zu spec.md')).toBeUndefined();
  });

  it('formatStandLabel is JJJJ-MM-TT HH:MM in the given zone', () => {
    expect(formatStandLabel(STAND, 'UTC')).toBe('2026-09-15 16:42');
    expect(formatStandLabel(STAND, 'Europe/Berlin')).toBe('2026-09-15 18:42');
  });

  it('text build: one input, Anmerkungen as single lines, control characters out (FA-27, FA-28, FA-33)', () => {
    const a: Anmerkung[] = [
      { id: 'a', ordinal: 3, ref: 'AK-01', snippet: '', text: 'Bitte\nzwei Zeilen\r\n  und   Tabs\t.', updatedAt: '' },
      { id: 'b', ordinal: 7, ref: '§4', snippet: '', text: '/nicht ein Befehl \x1b[31m!auch nicht', updatedAt: '' },
    ];
    const text = buildAenderungenText('spec', 'Stand 2026-09-15 16:42', a);
    expect(text).toBe('Änderungen zu spec.md (Stand 2026-09-15 16:42):\n1. [AK-01] Bitte zwei Zeilen und Tabs .\n2. [§4] /nicht ein Befehl [31m!auch nicht');
    for (const line of text.split('\n').slice(1)) expect(line).toMatch(/^\d+\. \[/);
    expect(buildAenderungenText('intent', '1.2.0', a.slice(0, 1))).toMatch(/^Änderungen zu intent\.md \(1\.2\.0\):\n1\. /);
    expect(buildFreigabeText('intent', '1.2.0')).toBe('Freigabe: intent.md 1.2.0');
    expect(buildFreigabeText('spec', 'Stand 2026-09-15 16:42')).toBe('Freigabe: spec.md (Stand 2026-09-15 16:42)');
    expect(buildFreigabeText('plan', 'Stand 2026-09-15 16:42')).toBe('Freigabe: plan.md (Stand 2026-09-15 16:42)');
    expect(normalizeAnmerkungText('x'.repeat(5000))).toHaveLength(4000);
  });
});

describe('VorhabenService stage 2', () => {
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
  let setSessionName: ReturnType<typeof vi.fn<(id: string, name: string) => void>>;
  const openProjects: Array<{ id: string; path: string; name: string }> = [];

  const lastState = (): VorhabenStateMessage['state'] => {
    const states = broadcast.mock.calls.map((c) => c[0]).filter((m) => m.type === 'vorhaben:state') as VorhabenStateMessage[];
    return states[states.length - 1].state;
  };
  const row = (id = 'INT-2026-004') => lastState().rows.find((r) => r.intentId === id)!;
  const specMtime = (): number => row().docs.find((d) => d.key === 'spec')!.mtimeMs;
  const draft = (id: string, ordinal: number, ref: string, text: string): Anmerkung => ({ id, ordinal, ref, snippet: '', text, updatedAt: '2026-09-15T10:00:00.000Z' });

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'vorhaben-s2-'));
    projA = join(root, 'a');
    const dir = join(projA, 'intent', 'INT-2026-004-ui');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-004', 'angenommen', '1.2.0'));
    writeFileSync(join(dir, 'spec.md'), '# Spec\n\n> **Status:** entwurf\n');
    utimesSync(join(dir, 'spec.md'), new Date(STAND), new Date(STAND));
    const dir5 = join(projA, 'intent', 'INT-2026-005-absicht');
    mkdirSync(dir5, { recursive: true });
    writeFileSync(join(dir5, 'intent.md'), intentText('INT-2026-005', 'entwurf', '0.3.0'));
    openProjects.splice(0, openProjects.length, { id: 'pa', path: projA, name: 'A' });
    names = {};

    store = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.load();
    broadcast = vi.fn();
    reply = vi.fn();
    watcher = new VorhabenWatcher({ debounceMs: 30 });
    manager = new FakeManager();
    setSessionName = vi.fn((id: string, name: string) => {
      names[id] = name;
    });
    service = new VorhabenService({
      workspace: { getState: () => ({ openProjects, sessionNames: names }) },
      store,
      broadcast,
      watcher,
      sessions: manager,
      setSessionName,
      resolveModel: (sel) => sel.providerId === 'anthropic' || sel.providerId === 'glm',
      timeZone: 'UTC',
      // INT-2026-022 (FA-09): an intent start refuses without a git repo — the fake reports the main copy as one.
      listWorktrees: async () => ({ isGitRepo: true, mainWorktreePath: projA, entries: [{ path: projA, branch: 'main', head: 'x', bare: false, detached: false, locked: false, prunable: false }] }),
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

  it('startStep creates the session with the command as initial prompt, names the tab, assigns and remembers the model (FA-35, FA-40, V-13)', async () => {
    const before = row();
    expect(before.zustand).toBe('keine_sitzung');
    expect(before.nextStep?.command).toBe('/specwright:spec INT-2026-004');
    const { sessionId } = await service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'glm', modelId: 'glm-5.2' }, undefined);
    expect(manager.created[0]).toEqual([
      projA, 'claude-code', { model: 'glm-5.2', provider: 'glm' }, undefined, undefined, '/specwright:spec INT-2026-004', undefined, undefined,
      { sessionTarget: { target: { kind: 'main' }, explicit: true } },
    ]);
    expect(setSessionName).toHaveBeenCalledWith(sessionId, 'spec INT-2026-004');
    await service.rescan();
    // INT-2026-018: the reference carries step, provider and target of the assignment (AK-03, AK-07)
    expect(row().session).toEqual({ id: sessionId, name: 'spec INT-2026-004', model: 'glm-5.2', agentStatus: 'unknown', step: 'spec', provider: 'glm', target: { kind: 'main' } });
    // INT-2026-010 (FA-21): the step stays on the row, the page greys it out via sessionBusy
    expect(row().nextStep?.step).toBe('spec');
    expect(row().sessionBusy).toBe(true);
    expect(lastState().lastModel['pa::INT-2026-004::spec']).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
    // INT-2026-018 (AK-02): the button is locked while the first session lives (status unknown) — end it before the next start
    await expect(service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, { kind: 'new-worktree', name: 'spec-4' })).rejects.toMatchObject({ code: 'SESSION_BUSY' });
    manager.sessions.delete(sessionId);
    manager.emit('session.closed', sessionId, 0);
    await service.rescan();
    // explicit worktree target is passed through
    await service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, { kind: 'new-worktree', name: 'spec-4' });
    expect((manager.created[1] as unknown[])[8]).toEqual({ sessionTarget: { target: { kind: 'new-worktree', name: 'spec-4' }, explicit: true } });
    // unknown model / unknown project / missing id
    await expect(service.startStep('pa', 'INT-2026-004', 'spec', { providerId: 'nope', modelId: 'x' }, undefined)).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    await expect(service.startStep('zz', 'INT-2026-004', 'spec', { providerId: 'anthropic', modelId: 'opus' }, undefined)).rejects.toMatchObject({ code: 'UNKNOWN_PROJECT' });
    await expect(service.startStep('pa', undefined, 'plan', { providerId: 'anthropic', modelId: 'opus' }, undefined)).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
  });

  it('a v4 command typed by hand assigns the session; the newest assignment wins (FA-21)', async () => {
    manager.add('s1', projA, 'done');
    manager.add('s2', projA, 'working', 'sonnet');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    expect(row().session?.id).toBe('s1');
    expect(row().zustand).toBe('wartet_auf_dich');
    expect(row().reviewDoc).toBe('spec');
    manager.emit('session.prompt-text', 's2', '/specwright:plan INT-2026-004');
    await service.rescan();
    expect(row().session).toMatchObject({ id: 's2', model: 'sonnet', agentStatus: 'working' });
    expect(row().zustand).toBe('arbeitet');
    expect(row().zustandDetail).toBe('sonnet');
    // a prompt without a command changes nothing
    manager.emit('session.prompt-text', 's1', 'bitte weiter');
    await service.rescan();
    expect(row().session?.id).toBe('s2');
  });

  it('/intent claims the first folder that appears under its cwd (FA-21)', async () => {
    const { sessionId } = await service.startStep('pa', undefined, 'intent', { providerId: 'anthropic', modelId: 'opus' }, undefined);
    expect((manager.created[0] as unknown[])[5]).toBe('/specwright:intent');
    expect(setSessionName).toHaveBeenCalledWith(sessionId, 'intent');
    expect(store.getPendingIntents()).toHaveLength(1);
    const dir = join(projA, 'intent', 'INT-2026-006-neu');
    mkdirSync(dir);
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-006', 'entwurf'));
    watcher.emit('dir-added', projA, 'INT-2026-006');
    watcher.emit('changed', projA);
    await service.rescan();
    expect(store.getPendingIntents()).toHaveLength(0);
    expect(row('INT-2026-006').session?.id).toBe(sessionId);
    // the same by hand: /intent typed in a terminal session
    manager.add('s7', projA, 'working');
    manager.emit('session.prompt-text', 's7', '/intent');
    expect(store.getPendingIntents().map(([id]) => id)).toEqual(['s7']);
  });

  it('INT-2026-016 (AK-08): a session that moves on by command leaves its old row; the short id resolves when unique; ambiguous or unknown short ids assign nothing', async () => {
    manager.add('s1', projA, 'working');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    expect(row('INT-2026-004').session?.id).toBe('s1');
    // the same session now plans another Vorhaben, typed with the short id
    manager.emit('session.prompt-text', 's1', '/specwright:plan INT-005');
    await service.rescan();
    expect(row('INT-2026-005').session?.id).toBe('s1');
    expect(row('INT-2026-004').session).toBeUndefined();
    expect(row('INT-2026-004').zustand).toBe('keine_sitzung');
    expect(store.getAssignment('pa', 'INT-2026-004')).toBeUndefined();
    // unknown short id → nothing changes
    manager.emit('session.prompt-text', 's1', '/build INT-099');
    await service.rescan();
    expect(row('INT-2026-005').session?.id).toBe('s1');
    // ambiguous short id (two years) → nothing changes, a warning
    const alt = join(projA, 'intent', 'INT-2025-005-alt');
    mkdirSync(alt, { recursive: true });
    writeFileSync(join(alt, 'intent.md'), intentText('INT-2025-005', 'angenommen'));
    watcher.emit('dir-added', projA, 'INT-2025-005');
    watcher.emit('changed', projA);
    await service.rescan();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    manager.add('s2', projA, 'working');
    manager.emit('session.prompt-text', 's2', '/spec INT-005');
    await service.rescan();
    expect(row('INT-2026-005').session?.id).toBe('s1');
    expect(row('INT-2025-005').session).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('INT-005'));
    warn.mockRestore();
    // /intent without id: the session starts something new → its assignments go, it is pending
    manager.emit('session.prompt-text', 's1', '/intent');
    await service.rescan();
    expect(row('INT-2026-005').session).toBeUndefined();
    expect(store.getPendingIntents().map(([id]) => id)).toEqual(['s1']);
    // the claim of a new folder is a move as well
    const dir = join(projA, 'intent', 'INT-2026-007-neu');
    mkdirSync(dir);
    writeFileSync(join(dir, 'intent.md'), intentText('INT-2026-007', 'entwurf'));
    watcher.emit('dir-added', projA, 'INT-2026-007');
    watcher.emit('changed', projA);
    await service.rescan();
    expect(row('INT-2026-007').session?.id).toBe('s1');
    expect(store.allAssignments().filter(([, a]) => a.sessionId === 's1').map(([k]) => k)).toEqual(['pa::INT-2026-007']);
  });

  it('INT-2026-016 (AK-08): a pending /intent session closed before its folder exists leaves no assignment and no pending', async () => {
    manager.add('s9', projA, 'working');
    manager.emit('session.prompt-text', 's9', '/intent');
    expect(store.getPendingIntents()).toHaveLength(1);
    manager.sessions.delete('s9');
    manager.emit('session.closed', 's9');
    await service.rescan();
    expect(store.getPendingIntents()).toHaveLength(0);
    expect(store.allAssignments().some(([, a]) => a.sessionId === 's9')).toBe(false);
  });

  it('INT-2026-016 (AK-06/AK-07): assignSession binds a live claude-code tab of the project to a row without a session, never moves, and names every refusal', async () => {
    manager.add('t1', projA, 'idle');
    manager.add('t2', projA, 'idle');
    manager.add('sh', projA, undefined, 'opus', 'shell');
    manager.add('fremd', join(root, 'b'), 'idle');
    await service.rescan();
    await service.assignSession('pa', 'INT-2026-004', 't1');
    await service.rescan();
    expect(row('INT-2026-004').session).toMatchObject({ id: 't1', agentStatus: 'idle' });
    expect(store.getAssignment('pa', 'INT-2026-004')).toMatchObject({ sessionId: 't1', step: 'spec' });
    // the row has a session now → a second tab is refused
    await expect(service.assignSession('pa', 'INT-2026-004', 't2')).rejects.toMatchObject({ code: 'ROW_HAS_SESSION' });
    // t1 belongs to INT-2026-004 → it cannot be clicked onto INT-2026-005
    await expect(service.assignSession('pa', 'INT-2026-005', 't1')).rejects.toMatchObject({ code: 'SESSION_ASSIGNED_ELSEWHERE', message: expect.stringContaining('INT-2026-004') });
    expect(store.getAssignment('pa', 'INT-2026-005')).toBeUndefined();
    await expect(service.assignSession('pa', 'INT-2026-005', 'sh')).rejects.toMatchObject({ code: 'SESSION_NOT_CLAUDE' });
    await expect(service.assignSession('pa', 'INT-2026-005', 'fremd')).rejects.toMatchObject({ code: 'SESSION_NOT_IN_PROJECT' });
    await expect(service.assignSession('pa', 'INT-2026-005', 'gibt-es-nicht')).rejects.toMatchObject({ code: 'SESSION_NOT_ACTIVE' });
    await expect(service.assignSession('pa', 'INT-2026-999', 't2')).rejects.toMatchObject({ code: 'UNKNOWN_VORHABEN' });
    await expect(service.assignSession('zz', 'INT-2026-005', 't2')).rejects.toMatchObject({ code: 'UNKNOWN_PROJECT' });
    // an ended assignment does not block the row nor the session
    manager.sessions.delete('t1');
    manager.emit('session.closed', 't1');
    await service.rescan();
    expect(row('INT-2026-004').zustand).toBe('sitzung_beendet');
    await service.assignSession('pa', 'INT-2026-004', 't2');
    await service.rescan();
    expect(row('INT-2026-004').session?.id).toBe('t2');
    // handler: request/reply with requestId, validation errors carry the requestId
    handler.handle({ type: 'vorhaben:session.assign', requestId: 'r1', projectId: 'pa', intentId: 'INT-2026-005', sessionId: 't2' } as never, reply);
    await new Promise((r) => setTimeout(r, 20));
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'r1', code: 'SESSION_ASSIGNED_ELSEWHERE' }));
    handler.handle({ type: 'vorhaben:session.assign', requestId: 'r2', projectId: 'pa', intentId: 'nope', sessionId: 't2' } as never, reply);
    await new Promise((r) => setTimeout(r, 20));
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:error', requestId: 'r2', code: 'INVALID_MESSAGE' }));
    manager.add('t3', projA, 'idle');
    handler.handle({ type: 'vorhaben:session.assign', requestId: 'r3', projectId: 'pa', intentId: 'INT-2026-005', sessionId: 't3' } as never, reply);
    await new Promise((r) => setTimeout(r, 20));
    expect(reply).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'vorhaben:session-assigned', requestId: 'r3', projectId: 'pa', intentId: 'INT-2026-005', sessionId: 't3' }));
  });

  it('session.closed marks the assignment ended: row shows "Sitzung beendet" and offers the next step again (FA-22)', async () => {
    manager.add('s1', projA, 'done');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    manager.sessions.delete('s1');
    manager.emit('session.closed', 's1');
    await service.rescan();
    expect(row().session).toMatchObject({ id: 's1', ended: true });
    expect(row().zustand).toBe('sitzung_beendet');
    expect(row().nextStep?.step).toBe('spec');
    // a restart keeps it (store)
    const again = new VorhabenStateStore(join(root, 'state.json'), { port: 3111 });
    await store.flush();
    await again.load();
    expect(again.getAssignment('pa', 'INT-2026-004')).toMatchObject({ sessionId: 's1', ended: true });
  });

  it('send aenderungen: text on disk first, bracketed paste then Enter after 150 ms, drafts move into the protocol, confirmed by the prompt text (FA-27, FA-31, FA-34, V-10)', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T16:50:00Z') });
    manager.add('s1', projA, 'done');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('b', 9, '§4', 'zweite'));
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('a', 2, 'AK-01', 'erste\nmit Umbruch'));

    const entry = await service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime());
    const expected = 'Änderungen zu spec.md (Stand 2026-09-15 16:42):\n1. [AK-01] erste mit Umbruch\n2. [§4] zweite';
    expect(entry).toMatchObject({ art: 'aenderungen', anzahl: 2, doc: 'spec', stand: '2026-09-15 16:42', sessionId: 's1', text: expected, status: 'gesendet' });
    expect(manager.writes).toEqual([['s1', PASTE_START + expected + PASTE_END]]);
    await vi.advanceTimersByTimeAsync(150);
    expect(manager.writes[1]).toEqual(['s1', '\r']);
    expect(lastState().drafts['pa::INT-2026-004::spec']).toBeUndefined();
    expect(lastState().protocol[0]).toMatchObject({ id: entry.id, status: 'gesendet', anmerkungen: [{ id: 'a' }, { id: 'b' }] });
    expect(service.hasPendingSend()).toBe(true);

    // Claude accepted the input: the hook reports the prompt text.
    manager.emit('session.agent-event', 's1', 'prompt-submitted');
    manager.emit('session.prompt-text', 's1', expected);
    expect(lastState().protocol[0]).toMatchObject({ status: 'angenommen', acceptedAt: '2026-09-15T16:50:00.150Z' });
    expect(service.hasPendingSend()).toBe(false);
    await vi.advanceTimersByTimeAsync(11_000);
    expect(lastState().protocol[0].status).toBe('angenommen');
    expect(manager.writes).toHaveLength(2);
  });

  it('without confirmation the entry is "nicht bestätigt" after 10 s and nothing is resent (FA-31, FA-30)', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T16:50:00Z') });
    manager.add('s1', projA, 'done');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('a', 1, 'AK-01', 'x'));
    await service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime());
    await vi.advanceTimersByTimeAsync(9_000);
    expect(service.hasPendingSend()).toBe(true);
    // unrelated typing in the terminal does not confirm
    manager.emit('session.prompt-text', 's1', 'etwas anderes');
    expect(lastState().protocol[0].status).toBe('gesendet');
    await vi.advanceTimersByTimeAsync(1_100);
    expect(lastState().protocol[0].status).toBe('nicht_bestaetigt');
    expect(service.hasPendingSend()).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(manager.writes.filter(([, d]) => d.startsWith(PASTE_START))).toHaveLength(1);
  });

  it('fallback: an old CLI without prompt text confirms on the next prompt-submitted', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T16:50:00Z') });
    manager.add('s1', projA, 'done');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('a', 1, 'AK-01', 'x'));
    await service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime());
    manager.emit('session.agent-event', 's1', 'prompt-submitted');
    await vi.advanceTimersByTimeAsync(120);
    expect(lastState().protocol[0].status).toBe('angenommen');
  });

  it('freigabe: one line, only for the review document, only with the current stand (FA-28, FA-29)', async () => {
    manager.add('s1', projA, 'idle');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'freigabe', specMtime() - 1000)).rejects.toMatchObject({ grund: 'stand_veraltet', currentStand: specMtime() });
    await expect(service.send('pa', 'INT-2026-004', 'intent', 'freigabe', 0)).rejects.toMatchObject({ grund: 'kein_review_dokument' });
    const entry = await service.send('pa', 'INT-2026-004', 'spec', 'freigabe', specMtime());
    expect(entry).toMatchObject({ art: 'freigabe', anzahl: 0, text: 'Freigabe: spec.md (Stand 2026-09-15 16:42)', stand: '2026-09-15 16:42' });
    expect(manager.writes[0][1]).toBe(PASTE_START + 'Freigabe: spec.md (Stand 2026-09-15 16:42)' + PASTE_END);
    // ungesendete Anmerkungen bleiben (never mixed)
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('a', 1, 'AK-01', 'bleibt'));
    await service.send('pa', 'INT-2026-004', 'spec', 'freigabe', specMtime());
    expect(store.getDrafts('pa', 'INT-2026-004', 'spec')).toHaveLength(1);
    // intent: version instead of stand
    manager.add('s5', projA, 'done');
    manager.emit('session.prompt-text', 's5', '/intent INT-2026-005');
    await service.rescan();
    const e5 = await service.send('pa', 'INT-2026-005', 'intent', 'freigabe', row('INT-2026-005').docs[0].mtimeMs);
    expect(e5.text).toBe('Freigabe: intent.md 0.3.0');
  });

  it('refuses with the four reasons and never sends by itself later (FA-30)', async () => {
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('a', 1, 'AK-01', 'x'));
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toMatchObject({ grund: 'keine_sitzung' });
    manager.add('s1', projA, 'working');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toMatchObject({ grund: 'arbeitet' });
    manager.sessions.get('s1')!.agentStatus = 'blocked';
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toMatchObject({ grund: 'dialog' });
    manager.sessions.get('s1')!.agentStatus = 'error';
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toMatchObject({ grund: 'beendet' });
    manager.sessions.get('s1')!.agentStatus = 'done';
    manager.emit('session.closed', 's1');
    await service.rescan();
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toMatchObject({ grund: 'beendet' });
    // session becomes ready again → still nothing written
    manager.add('s2', projA, 'done');
    manager.emit('session.prompt-text', 's2', '/spec INT-2026-004');
    manager.emit('session.agent-event', 's2', 'stop');
    await service.rescan();
    expect(manager.writes).toEqual([]);
    expect(store.getDrafts('pa', 'INT-2026-004', 'spec')).toHaveLength(1);
    store.takeDrafts('pa', 'INT-2026-004', 'spec');
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toMatchObject({ grund: 'keine_anmerkungen' });
  });

  it('a failed PTY write removes the entry again', async () => {
    manager.add('s1', projA, 'done');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    store.setDraft('pa', 'INT-2026-004', 'spec', draft('a', 1, 'AK-01', 'x'));
    manager.writeOk = false;
    await expect(service.send('pa', 'INT-2026-004', 'spec', 'aenderungen', specMtime())).rejects.toBeInstanceOf(SendRejectedError);
    expect(store.getProtocol()).toEqual([]);
    expect(store.getDrafts('pa', 'INT-2026-004', 'spec')).toHaveLength(1);
  });

  it('start() settles a send that was pending across a restart (FA-34)', async () => {
    const other = new VorhabenStateStore(join(root, 'state2.json'), { port: 3111 });
    await other.load();
    await other.addProtocolEntry({
      id: 'old', projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec', art: 'aenderungen', anzahl: 1, stand: 'x', sessionId: 's1', sessionName: 'n',
      text: 't', anmerkungen: [], status: 'gesendet', sentAt: new Date(Date.now() - 20_000).toISOString(),
    });
    const svc = new VorhabenService({ workspace: { getState: () => ({ openProjects }) }, store: other, broadcast: vi.fn(), watcher: new VorhabenWatcher({ debounceMs: 30 }), listWorktrees: async () => ({ isGitRepo: false, mainWorktreePath: null, entries: [] }) });
    await svc.start();
    expect(other.getProtocolEntry('old')?.status).toBe('nicht_bestaetigt');
    expect(svc.hasPendingSend()).toBe(false);
    svc.stop();
    await other.flush();
  });

  it('handler: draft.set/delete validate and broadcast; send replies sent/send-rejected; start-step replies step-started', async () => {
    const n = broadcast.mock.calls.length;
    handler.handle({ type: 'vorhaben:draft.set', projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec', anmerkung: { id: 'a', ordinal: 1, ref: 'AK-01', snippet: 's', text: 'T\x00T' } }, reply);
    expect(broadcast.mock.calls.length).toBe(n + 1);
    expect(lastState().drafts['pa::INT-2026-004::spec'][0]).toMatchObject({ id: 'a', text: 'TT' });
    handler.handle({ type: 'vorhaben:draft.set', projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec', anmerkung: { id: '../x', ordinal: 1, ref: '', snippet: '', text: '' } }, reply);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE' });
    reply.mockClear();

    handler.handle({ type: 'vorhaben:send', requestId: 'r1', projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec', art: 'aenderungen', stand: specMtime() }, reply);
    await vi.waitFor(() => expect(reply).toHaveBeenCalled());
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:send-rejected', requestId: 'r1', grund: 'keine_sitzung' });
    reply.mockClear();

    manager.add('s1', projA, 'done');
    manager.emit('session.prompt-text', 's1', '/spec INT-2026-004');
    await service.rescan();
    handler.handle({ type: 'vorhaben:send', requestId: 'r2', projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec', art: 'aenderungen', stand: specMtime() }, reply);
    await vi.waitFor(() => expect(reply).toHaveBeenCalled());
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:sent', requestId: 'r2', entry: { anzahl: 1 } });
    reply.mockClear();

    handler.handle({ type: 'vorhaben:draft.delete', projectId: 'pa', intentId: 'INT-2026-004', doc: 'spec', id: 'a' }, reply);
    expect(reply).not.toHaveBeenCalled();

    // INT-2026-018: s1 waits with spec.md awaiting approval → the rule refuses (freigabe_offen); ended → a new session starts (AK-10, modus neu)
    handler.handle({ type: 'vorhaben:start-step', requestId: 'r3', projectId: 'pa', intentId: 'INT-2026-004', step: 'plan', model: { providerId: 'anthropic', modelId: 'opus' } }, reply);
    await vi.waitFor(() => expect(reply).toHaveBeenCalled());
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'SESSION_BUSY', requestId: 'r3' });
    reply.mockClear();
    manager.sessions.delete('s1');
    manager.emit('session.closed', 's1', 0);
    await service.rescan();
    handler.handle({ type: 'vorhaben:start-step', requestId: 'r3', projectId: 'pa', intentId: 'INT-2026-004', step: 'plan', model: { providerId: 'anthropic', modelId: 'opus' } }, reply);
    await vi.waitFor(() => expect(reply).toHaveBeenCalled());
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:step-started', requestId: 'r3', step: 'plan', intentId: 'INT-2026-004', modus: 'neu' });
    expect((reply.mock.calls[0][0] as { geschlossen?: string }).geschlossen).toBeUndefined();
    reply.mockClear();
    handler.handle({ type: 'vorhaben:start-step', projectId: 'pa', step: 'plan', model: { providerId: 'anthropic', modelId: 'opus' } }, reply);
    expect(reply.mock.calls[0][0]).toMatchObject({ type: 'vorhaben:error', code: 'INVALID_MESSAGE' });
  });
});
