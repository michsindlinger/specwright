import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, writeFileSync, readFileSync, statSync } from 'fs';
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

  it('stage-1 files without the new maps load healthy', async () => {
    writeFileSync(file, JSON.stringify({ version: 1, port: 3111, updatedAt: 'x', state: { docDrafts: { 'p::claude': { text: 't', openedMtime: 1, updatedAt: 'x' } } } }));
    const store = new VorhabenStateStore(file, { port: 3111 });
    expect(await store.load()).toEqual({ existed: true, healthy: true });
    expect(store.getDocDraft('p', 'claude')?.text).toBe('t');
    expect(store.getProtocol()).toEqual([]);
    expect(store.getPendingIntents()).toEqual([]);
  });
});
