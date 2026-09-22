import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, writeFileSync, readFileSync, statSync, mkdirSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VorhabenStateStore } from '../../src/server/services/vorhaben-state.js';
import type { Anmerkung, ProtokollEintrag } from '../../src/shared/types/vorhaben.protocol.js';

describe('VorhabenStateStore (FA-47, FA-26 durability)', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vorhaben-state-'));
    file = join(dir, 'vorhaben-3111.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('starts empty without a file', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(await store.load()).toEqual({ existed: false, healthy: true });
    expect(store.getDocDrafts()).toEqual({});
  });

  it('doc drafts survive load(); write is atomic and 0600', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(store.setDocDraft('p1', 'architecture', '# neu', 123)).toBe(true);
    expect(store.setDocDraft('p1', 'architecture', '# neu', 123)).toBe(false);
    await store.flush();
    expect(readdirSync(dir)).toEqual(['vorhaben-3111.json']);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as { version: number; port: number; state: { docDrafts: Record<string, unknown> } };
    expect(parsed.version).toBe(1);
    expect(parsed.port).toBe(3111);

    const again = new VorhabenStateStore(file, { port: 3111 });
    expect(await again.load()).toEqual({ existed: true, healthy: true });
    expect(again.getDocDraft('p1', 'architecture')).toMatchObject({ text: '# neu', openedMtime: 123 });
    expect(again.clearDocDraft('p1', 'architecture')).toBe(true);
    expect(again.clearDocDraft('p1', 'architecture')).toBe(false);
    await again.flush();
  });

  it('unreadable file is backed up, store starts empty and reports unhealthy', async () => {
    writeFileSync(file, '{not json');
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(await store.load()).toEqual({ existed: true, healthy: false });
    const names = readdirSync(dir);
    expect(names.some((n) => n.startsWith('vorhaben-3111.json.unrecognized-'))).toBe(true);
    expect(store.getDocDrafts()).toEqual({});
  });

  it('unknown version is treated as unreadable', async () => {
    writeFileSync(file, JSON.stringify({ version: 9, state: {} }));
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect((await store.load()).healthy).toBe(false);
  });
});

describe('VorhabenStateStore stage 2 (FA-21/22/26/32/40)', () => {
  let dir: string;
  let file: string;
  const anm = (id: string, ordinal: number, text = 'T'): Anmerkung => ({ id, ordinal, ref: `AK-0${ordinal}`, snippet: 's', text, updatedAt: '2026-09-15T10:00:00.000Z' });
  const entry = (id: string, sentAt: string, intentId = 'INT-2026-004'): ProtokollEintrag => ({
    id, projectId: 'p1', intentId, doc: 'spec', art: 'aenderungen', anzahl: 1, stand: '2026-09-15 16:42', sessionId: 's1', sessionName: 'spec INT-2026-004',
    text: 'Änderungen zu spec.md (Stand 2026-09-15 16:42):\n1. [AK-01] T', anmerkungen: [anm('a', 1)], status: 'gesendet', sentAt,
  });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vorhaben-state2-'));
    file = join(dir, 'vorhaben-3111.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('INT-2026-016 (AK-08): moveAssignment drops the other rows of the session, keeps foreign sessions, commits once; clearAssignmentsOfSession empties them', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    const a = (sessionId: string) => ({ sessionId, step: 'build' as const, model: 'opus', cwd: '/p', at: '2026-09-17T10:00:00.000Z' });
    store.setAssignment('p', 'INT-2026-001', a('s1'));
    store.setAssignment('p', 'INT-2026-002', a('s1'));
    store.setAssignment('p', 'INT-2026-003', a('s2'));
    store.moveAssignment('s1', 'p', 'INT-2026-004', a('s1'));
    expect(store.allAssignments().map(([k, v]) => [k, v.sessionId])).toEqual([
      ['p::INT-2026-003', 's2'],
      ['p::INT-2026-004', 's1'],
    ]);
    expect(store.clearAssignmentsOfSession('s1')).toBe(1);
    expect(store.clearAssignmentsOfSession('s1')).toBe(0);
    expect(store.allAssignments().map(([k]) => k)).toEqual(['p::INT-2026-003']);
  });

  it('assignments: newest wins, ended marks every row of the session, survives load() (FA-21, FA-22)', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    store.setAssignment('p1', 'INT-2026-004', { sessionId: 's1', step: 'spec', model: 'opus', cwd: '/a', at: '2026-09-15T10:00:00Z' });
    store.setAssignment('p1', 'INT-2026-004', { sessionId: 's2', step: 'plan', model: 'glm-5.2', cwd: '/a-wt', at: '2026-09-15T11:00:00Z' });
    store.setAssignment('p1', 'INT-2026-005', { sessionId: 's2', step: 'intent', model: 'glm-5.2', cwd: '/a-wt', at: '2026-09-15T11:00:00Z' });
    expect(store.getAssignment('p1', 'INT-2026-004')?.sessionId).toBe('s2');
    expect(store.markSessionEnded('s2')).toBe(2);
    expect(store.markSessionEnded('s2')).toBe(0);
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getAssignment('p1', 'INT-2026-004')).toMatchObject({ sessionId: 's2', ended: true, cwd: '/a-wt' });
    expect(again.allAssignments()).toHaveLength(2);
  });

  it('pending /intent claims are stored per session and cleared once', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    store.setPendingIntent('s9', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-09-15T10:00:00Z' });
    expect(store.getPendingIntents()).toHaveLength(1);
    expect(store.clearPendingIntent('s9')).toBe(true);
    expect(store.clearPendingIntent('s9')).toBe(false);
    await store.flush();
  });

  it('review drafts: upsert by id, document order, delete, take (FA-25, FA-26)', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(store.setDraft('p1', 'INT-2026-004', 'spec', anm('b', 5))).toBe(true);
    expect(store.setDraft('p1', 'INT-2026-004', 'spec', anm('a', 2))).toBe(true);
    expect(store.setDraft('p1', 'INT-2026-004', 'spec', anm('a', 2))).toBe(false);
    expect(store.setDraft('p1', 'INT-2026-004', 'spec', anm('a', 2, 'neu'))).toBe(true);
    expect(store.getDrafts('p1', 'INT-2026-004', 'spec').map((a) => `${a.id}:${a.text}`)).toEqual(['a:neu', 'b:T']);
    expect(Object.keys(store.getAllDrafts())).toEqual(['p1::INT-2026-004::spec']);
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getDrafts('p1', 'INT-2026-004', 'spec')).toHaveLength(2);
    expect(again.deleteDraft('p1', 'INT-2026-004', 'spec', 'b')).toBe(true);
    expect(again.deleteDraft('p1', 'INT-2026-004', 'spec', 'b')).toBe(false);
    expect(again.takeDrafts('p1', 'INT-2026-004', 'spec').map((a) => a.id)).toEqual(['a']);
    expect(again.getDrafts('p1', 'INT-2026-004', 'spec')).toEqual([]);
    expect(again.getAllDrafts()).toEqual({});
    await again.flush();
  });

  it('protocol: newest first, addProtocolEntry resolves after the write landed, status patch, pendingSends (FA-31, FA-34)', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.addProtocolEntry(entry('e1', '2026-09-15T10:00:00Z'));
    expect(JSON.parse(readFileSync(file, 'utf-8')).state.protocol).toHaveLength(1);
    await store.addProtocolEntry(entry('e2', '2026-09-15T11:00:00Z'));
    expect(store.getProtocol().map((e) => e.id)).toEqual(['e2', 'e1']);
    expect(store.pendingSends().map((e) => e.id)).toEqual(['e2', 'e1']);
    expect(store.updateProtocolEntry('e1', { status: 'angenommen', acceptedAt: '2026-09-15T10:00:05Z' })).toBe(true);
    expect(store.updateProtocolEntry('e1', { status: 'angenommen' })).toBe(false);
    expect(store.updateProtocolEntry('nope', { status: 'angenommen' })).toBe(false);
    expect(store.pendingSends().map((e) => e.id)).toEqual(['e2']);
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getProtocolEntry('e1')).toMatchObject({ status: 'angenommen', acceptedAt: '2026-09-15T10:00:05Z' });
  });

  it('prune keeps entries younger than 30 days or of a live Vorhaben (FA-32)', async () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const store = new VorhabenStateStore(file, { port: 3111, now: () => now });
    await store.addProtocolEntry(entry('old-live', '2026-09-01T10:00:00Z', 'INT-2026-004'));
    await store.addProtocolEntry(entry('old-gone', '2026-09-01T10:00:00Z', 'INT-2026-001'));
    await store.addProtocolEntry(entry('young-gone', '2026-10-15T10:00:00Z', 'INT-2026-002'));
    expect(store.prune(new Set(['p1::INT-2026-004']))).toBe(1);
    expect(store.getProtocol().map((e) => e.id).sort()).toEqual(['old-live', 'young-gone']);
    await store.flush();
  });

  it('last model per (Vorhaben, step) (FA-40)', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(store.getLastModel('p1', 'INT-2026-004', 'plan')).toBeUndefined();
    expect(store.setLastModel('p1', 'INT-2026-004', 'plan', { providerId: 'glm', modelId: 'glm-5.2' })).toBe(true);
    expect(store.setLastModel('p1', 'INT-2026-004', 'plan', { providerId: 'glm', modelId: 'glm-5.2' })).toBe(false);
    expect(store.getAllLastModels()).toEqual({ 'p1::INT-2026-004::plan': { providerId: 'glm', modelId: 'glm-5.2' } });
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getLastModel('p1', 'INT-2026-004', 'plan')).toEqual({ providerId: 'glm', modelId: 'glm-5.2' });
  });

  it('INT-2026-008: claim gives the pending session\'s unclaimed entries the intentId, drop removes them, prune treats them as not live', async () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const store = new VorhabenStateStore(file, { port: 3111, now: () => now });
    const pendingEntry = (id: string, sessionId: string, sentAt = '2026-10-19T10:00:00Z'): ProtokollEintrag => {
      const { intentId: _drop, ...rest } = entry(id, sentAt);
      void _drop;
      return { ...rest, sessionId, art: 'freitext', doc: undefined, anzahl: 0, stand: '', text: 'x', anmerkungen: [] };
    };
    await store.addProtocolEntry(pendingEntry('a1', 'sA'));
    await store.addProtocolEntry(pendingEntry('a2', 'sA'));
    await store.addProtocolEntry(pendingEntry('b1', 'sB'));
    await store.addProtocolEntry(entry('a3', '2026-10-19T10:00:00Z', 'INT-2026-004'));
    store.setPendingIntent('sA', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-10-19T09:00:00Z' });
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111, now: () => now });
    await again.load();
    expect(again.getPendingIntents()).toEqual([['sA', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-10-19T09:00:00Z' }]]);
    expect(again.getProtocol().filter((e) => !e.intentId).map((e) => e.id).sort()).toEqual(['a1', 'a2', 'b1']);
    // claim: only sA's unclaimed entries; sB and the already-assigned a3 untouched
    expect(again.claimPendingProtocol('sA', 'INT-2026-009')).toBe(2);
    expect(again.claimPendingProtocol('sA', 'INT-2026-009')).toBe(0);
    expect(again.getProtocolEntry('a1')?.intentId).toBe('INT-2026-009');
    expect(again.getProtocolEntry('a2')?.intentId).toBe('INT-2026-009');
    expect(again.getProtocolEntry('b1')?.intentId).toBeUndefined();
    expect(again.getProtocolEntry('a3')?.intentId).toBe('INT-2026-004');
    // drop: only unclaimed entries of that session
    expect(again.dropUnclaimedProtocol('sA')).toBe(0);
    expect(again.dropUnclaimedProtocol('sB')).toBe(1);
    expect(again.getProtocol().map((e) => e.id).sort()).toEqual(['a1', 'a2', 'a3']);
    // prune: an unclaimed entry never matches a live key → only the 30-day net keeps it
    await again.addProtocolEntry(pendingEntry('c-old', 'sC', '2026-09-01T10:00:00Z'));
    await again.addProtocolEntry(pendingEntry('c-young', 'sC', '2026-10-19T10:00:00Z'));
    expect(again.prune(new Set(['p1::INT-2026-004', 'p1::INT-2026-009']))).toBe(1);
    expect(again.getProtocol().map((e) => e.id).sort()).toEqual(['a1', 'a2', 'a3', 'c-young']);
    await again.flush();
  });

  it('stage-1 files without the new maps load healthy', async () => {
    writeFileSync(file, JSON.stringify({ version: 1, port: 3111, updatedAt: 'x', state: { docDrafts: { 'p::claude': { text: 't', openedMtime: 1, updatedAt: 'x' } } } }));
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(await store.load()).toEqual({ existed: true, healthy: true });
    expect(store.getDocDraft('p', 'claude')?.text).toBe('t');
    expect(store.getProtocol()).toEqual([]);
    expect(store.getPendingIntents()).toEqual([]);
    // INT-2026-010: the new maps default when absent
    expect(store.getAnsicht()).toEqual({ filterProjectId: null, phase: {} });
    expect(store.hasFirstInput('s1')).toBe(false);
  });

  it('INT-2026-010 (FA-03, FA-12): ansicht round-trip — filter and phase per Vorhaben, unchanged writes report false, prune drops phase entries of vanished rows at once (review E14)', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    expect(store.setAnsicht({ filterProjectId: 'p1' })).toBe(true);
    expect(store.setAnsicht({ filterProjectId: 'p1' })).toBe(false);
    expect(store.setAnsicht({ phase: { key: 'p1::INT-2026-004', doc: 'plan' } })).toBe(true);
    expect(store.setAnsicht({ phase: { key: 'p1::INT-2026-004', doc: 'plan' } })).toBe(false);
    expect(store.setAnsicht({ phase: { key: 'p1::INT-2026-005', doc: 'design' } })).toBe(true);
    expect(store.setAnsicht({})).toBe(false);
    expect(store.getAnsicht()).toEqual({ filterProjectId: 'p1', phase: { 'p1::INT-2026-004': 'plan', 'p1::INT-2026-005': 'design' } });
    // the snapshot is a copy
    store.getAnsicht().phase['x'] = 'spec';
    expect(store.getAnsicht().phase['x']).toBeUndefined();
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getAnsicht()).toEqual({ filterProjectId: 'p1', phase: { 'p1::INT-2026-004': 'plan', 'p1::INT-2026-005': 'design' } });
    // „Alle" = null; prune removes the phase entry whose row is gone, keeps the live one
    expect(again.setAnsicht({ filterProjectId: null })).toBe(true);
    expect(again.prune(new Set(['p1::INT-2026-004']))).toBe(1);
    expect(again.getAnsicht()).toEqual({ filterProjectId: null, phase: { 'p1::INT-2026-004': 'plan' } });
    await again.flush();
  });

  it('INT-2026-010 (AK-09, FA-22): first inputs per session — set, bump, clear, survive load(), never in the ansicht/protocol snapshots', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    store.setFirstInput('cs-1', { text: 'Was stört: die Liste sortiert falsch.', versuche: 0 });
    expect(store.hasFirstInput('cs-1')).toBe(true);
    expect(store.getFirstInput('cs-1')).toEqual({ text: 'Was stört: die Liste sortiert falsch.', versuche: 0 });
    expect(store.bumpFirstInputVersuche('cs-1')).toBe(1);
    expect(store.bumpFirstInputVersuche('cs-1')).toBe(2);
    expect(store.bumpFirstInputVersuche('nope')).toBe(0);
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getFirstInput('cs-1')).toEqual({ text: 'Was stört: die Liste sortiert falsch.', versuche: 2 });
    expect(again.clearFirstInput('cs-1')).toBe(true);
    expect(again.clearFirstInput('cs-1')).toBe(false);
    expect(again.hasFirstInput('cs-1')).toBe(false);
    await again.flush();
    const raw = JSON.parse(readFileSync(file, 'utf-8')) as { state: { firstInputs: Record<string, unknown> } };
    expect(raw.state.firstInputs).toEqual({});
  });
  it('INT-2026-019 (AK-01): setSessionContext writes the Claude session id into every assignment of the session, commits only on change, survives load()', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    store.setAssignment('p1', 'INT-2026-004', { sessionId: 's1', step: 'spec', model: 'opus', cwd: '/a', at: '2026-09-17T10:00:00Z', provider: 'anthropic' });
    store.setAssignment('p1', 'INT-2026-005', { sessionId: 's1', step: 'plan', model: 'opus', cwd: '/a', at: '2026-09-17T10:01:00Z' });
    store.setAssignment('p1', 'INT-2026-006', { sessionId: 's2', step: 'build', model: 'opus', cwd: '/b', at: '2026-09-17T10:02:00Z' });
    expect(store.assignmentsWithoutContext().map(([k]) => k)).toEqual(['p1::INT-2026-004', 'p1::INT-2026-005', 'p1::INT-2026-006']);
    expect(store.setSessionContext('s1', { claudeSessionId: 'a208d3a5-1da0-4f76-88fd-80493778110e' })).toBe(2);
    expect(store.setSessionContext('s1', { claudeSessionId: 'a208d3a5-1da0-4f76-88fd-80493778110e' })).toBe(0);
    expect(store.setSessionContext('nope', { claudeSessionId: 'a208d3a5-1da0-4f76-88fd-80493778110e' })).toBe(0);
    expect(store.getAssignment('p1', 'INT-2026-006')?.claudeSessionId).toBeUndefined();
    expect(store.assignmentsWithoutContext().map(([k]) => k)).toEqual(['p1::INT-2026-006']);
    // A `/clear` brings a new id — the newest one wins.
    expect(store.setSessionContext('s1', { claudeSessionId: '11111111-2222-4333-8444-555555555555' })).toBe(2);
    store.setAssignment('p1', 'INT-2026-007', {
      sessionId: 's3', step: 'build', model: 'opus', cwd: '/c', at: '2026-09-18T06:00:00Z', provider: 'anthropic', claudeSessionId: '11111111-2222-4333-8444-555555555555',
      resumed: { at: '2026-09-18T06:00:00Z', von: 's1', stand: '2026-09-18T05:42:00Z' },
    });
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getAssignment('p1', 'INT-2026-004')).toMatchObject({ provider: 'anthropic', claudeSessionId: '11111111-2222-4333-8444-555555555555' });
    expect(again.getAssignment('p1', 'INT-2026-007')).toMatchObject({ resumed: { at: '2026-09-18T06:00:00Z', von: 's1', stand: '2026-09-18T05:42:00Z' } });
    // Ended assignments never need a backfill.
    again.markSessionEnded('s2');
    expect(again.assignmentsWithoutContext()).toEqual([]);
    await again.flush();
  });

  it('INT-2026-019 (AK-07): hasOpenAssignmentIn — true while a not-ended assignment lives in the directory, false after its session ended, keyed by realpath', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    const wt = join(dir, 'worktrees', 'session-x');
    mkdirSync(wt, { recursive: true });
    const link = join(dir, 'link-to-x');
    symlinkSync(wt, link);
    expect(store.hasOpenAssignmentIn(wt)).toBe(false);
    store.setAssignment('p1', 'INT-2026-004', { sessionId: 's1', step: 'build', model: 'opus', cwd: wt, at: '2026-09-17T10:00:00Z' });
    expect(store.hasOpenAssignmentIn(wt)).toBe(true);
    expect(store.hasOpenAssignmentIn(wt + '/')).toBe(true);
    expect(store.hasOpenAssignmentIn(link)).toBe(true);
    expect(store.hasOpenAssignmentIn(join(dir, 'worktrees'))).toBe(false);
    expect(store.hasOpenAssignmentIn(join(dir, 'worktrees', 'session-y'))).toBe(false);
    // AK-05 (Stillstand): the exit file marks the session ended → the reaper may remove the worktree.
    expect(store.markSessionEnded('s1')).toBe(1);
    expect(store.hasOpenAssignmentIn(wt)).toBe(false);
    await store.flush();
  });

  it('INT-2026-019: assignments and pending intents without the new fields load unchanged', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    store.setAssignment('p1', 'INT-2026-004', { sessionId: 's1', step: 'spec', model: 'opus', cwd: '/a', at: '2026-09-17T10:00:00Z' });
    store.setPendingIntent('s9', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-09-15T10:00:00Z', provider: 'openai' });
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getAssignment('p1', 'INT-2026-004')).toEqual({ sessionId: 's1', step: 'spec', model: 'opus', cwd: '/a', at: '2026-09-17T10:00:00Z' });
    expect(again.getPendingIntents()).toEqual([['s9', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-09-15T10:00:00Z', provider: 'openai' }]]);
  });
  it('INT-2026-022 (FA-14, FA-18): a pending intent carries its optional arbeitstitel across load(); entries without it load unchanged', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    store.setPendingIntent('sT', { projectId: 'p1', cwd: '/a-worktrees/session-sT', step: 'intent', model: 'opus', since: '2026-09-19T09:00:00Z', provider: 'anthropic', arbeitstitel: 'Die Liste sortiert falsch' });
    store.setPendingIntent('sH', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-09-19T09:01:00Z' });
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getPendingIntents()).toEqual([
      ['sT', { projectId: 'p1', cwd: '/a-worktrees/session-sT', step: 'intent', model: 'opus', since: '2026-09-19T09:00:00Z', provider: 'anthropic', arbeitstitel: 'Die Liste sortiert falsch' }],
      ['sH', { projectId: 'p1', cwd: '/a', step: 'intent', model: 'opus', since: '2026-09-19T09:01:00Z' }],
    ]);
    expect(again.getPendingIntents()[1][1]).not.toHaveProperty('arbeitstitel');
  });

  it('INT-2026-024 (FA-10, FA-12, AN-S16): abschluesse — mark and failure per Vorhaben survive load(), an old file without the map loads, prune drops dead keys, tolerant read', async () => {
    const store = new VorhabenStateStore(file, { port: 3111 });
    await store.load();
    expect(store.getAbschluss('p1', 'INT-2026-024')).toBeUndefined();
    store.setAbschlussFehler('p1', 'INT-2026-024', { message: 'Nicht abgeschlossen: a — b', at: '2026-09-22T10:00:00Z' });
    expect(store.getAbschluss('p1', 'INT-2026-024')).toEqual({ fehler: { message: 'Nicht abgeschlossen: a — b', at: '2026-09-22T10:00:00Z' } });
    expect(store.clearAbschlussFehler('p1', 'INT-2026-024')).toBe(true);
    expect(store.getAbschluss('p1', 'INT-2026-024')).toBeUndefined();
    expect(store.clearAbschlussFehler('p1', 'INT-2026-024')).toBe(false);
    const marke = { prNumber: 91, prUrl: 'https://github.com/x/y/pull/91', zweig: 'chore/INT-2026-024-abschluss', at: '2026-09-22T10:01:00Z' };
    store.setAbschlussFehler('p1', 'INT-2026-024', { message: 'alt', at: 't' });
    store.setAbschlussMarke('p1', 'INT-2026-024', marke);
    // the mark drops the failure
    expect(store.getAbschluss('p1', 'INT-2026-024')).toEqual({ marke });
    // a later failure keeps the mark; clearing the failure keeps the mark
    store.setAbschlussFehler('p1', 'INT-2026-024', { message: 'neu', at: 't2' });
    expect(store.getAbschluss('p1', 'INT-2026-024')).toEqual({ marke, fehler: { message: 'neu', at: 't2' } });
    expect(store.clearAbschlussFehler('p1', 'INT-2026-024')).toBe(true);
    expect(store.getAbschluss('p1', 'INT-2026-024')).toEqual({ marke });
    store.setAbschlussMarke('p1', 'INT-2026-099', { ...marke, prNumber: 99 });
    await store.flush();
    const again = new VorhabenStateStore(file, { port: 3111 });
    await again.load();
    expect(again.getAbschluss('p1', 'INT-2026-024')).toEqual({ marke });
    expect(again.getAbschluss('p1', 'INT-2026-099')?.marke.prNumber).toBe(99);
    // prune: only live keys stay
    expect(again.prune(new Set(['p1::INT-2026-024']))).toBe(1);
    expect(again.getAbschluss('p1', 'INT-2026-099')).toBeUndefined();
    expect(again.getAbschluss('p1', 'INT-2026-024')).toEqual({ marke });
    expect(again.clearAbschlussMarke('p1', 'INT-2026-024')).toBe(true);
    expect(again.clearAbschlussMarke('p1', 'INT-2026-024')).toBe(false);
    await again.flush();
    // an old file without the map, and a broken entry
    const raw = JSON.parse(readFileSync(file, 'utf-8')) as { state: Record<string, unknown> };
    delete raw.state.abschluesse;
    writeFileSync(file, JSON.stringify(raw));
    const alt = new VorhabenStateStore(file, { port: 3111 });
    expect((await alt.load()).healthy).toBe(true);
    expect(alt.getAbschluss('p1', 'INT-2026-024')).toBeUndefined();
    raw.state.abschluesse = { 'p1::INT-2026-001': { marke: { prNumber: 'x' } }, 'p1::INT-2026-002': { marke, extra: 1 }, 'p1::INT-2026-003': 'kaputt' };
    writeFileSync(file, JSON.stringify(raw));
    const tolerant = new VorhabenStateStore(file, { port: 3111 });
    expect((await tolerant.load()).healthy).toBe(true);
    expect(tolerant.getAbschluss('p1', 'INT-2026-001')).toBeUndefined();
    expect(tolerant.getAbschluss('p1', 'INT-2026-002')).toEqual({ marke });
    expect(tolerant.getAbschluss('p1', 'INT-2026-003')).toBeUndefined();
  });
});
