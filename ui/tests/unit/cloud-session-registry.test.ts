import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  CloudSessionRegistry,
  type PersistedCloudSessionV1,
} from '../../src/server/services/cloud-session-registry.js';

function entry(id: string, overrides: Partial<PersistedCloudSessionV1> = {}): PersistedCloudSessionV1 {
  return {
    sessionId: id,
    projectPath: '/tmp/project',
    effectiveCwd: '/tmp/project',
    terminalType: 'claude-code',
    createdAt: new Date('2026-08-26T10:00:00Z').toISOString(),
    tmuxSessionName: `cs-${id}`,
    runScriptPath: `/tmp/run-${id}.sh`,
    autoMode: false,
    ...overrides,
  };
}

describe('CloudSessionRegistry', () => {
  let dir: string;
  let filePath: string;
  let registry: CloudSessionRegistry;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'registry-test-'));
    filePath = join(dir, 'sessions-3001.json');
    registry = new CloudSessionRegistry(filePath);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('missing file loads as healthy empty registry', async () => {
    const result = await registry.load();
    expect(result).toEqual({ entries: [], healthy: true });
  });

  it('round-trips upsert / remove / replaceAll', async () => {
    await registry.upsert(entry('a'));
    await registry.upsert(entry('b', { autoMode: true }));
    expect((await registry.load()).entries.map((e) => e.sessionId)).toEqual(['a', 'b']);

    // Upsert replaces in place
    await registry.upsert(entry('a', { effectiveCwd: '/elsewhere' }));
    const afterUpdate = await registry.load();
    expect(afterUpdate.entries).toHaveLength(2);
    expect(afterUpdate.entries.find((e) => e.sessionId === 'a')?.effectiveCwd).toBe('/elsewhere');

    await registry.remove('a');
    expect((await registry.load()).entries.map((e) => e.sessionId)).toEqual(['b']);

    await registry.replaceAll([entry('c')]);
    expect((await registry.load()).entries.map((e) => e.sessionId)).toEqual(['c']);
  });

  it('serializes concurrent writes without losing updates', async () => {
    await Promise.all([
      registry.upsert(entry('a')),
      registry.upsert(entry('b')),
      registry.upsert(entry('c')),
    ]);
    const { entries } = await registry.load();
    expect(entries.map((e) => e.sessionId).sort()).toEqual(['a', 'b', 'c']);
    // No leftover tmp files from the atomic write
    expect(readdirSync(dir).filter((f) => f.includes('.tmp.'))).toEqual([]);
  });

  it('corrupt file → backup rename instead of silent discard, healthy=false', async () => {
    writeFileSync(filePath, '{ this is not json', 'utf-8');
    const result = await registry.load();
    expect(result.healthy).toBe(false);
    expect(result.entries).toEqual([]);
    const backups = readdirSync(dir).filter((f) => f.includes('.unrecognized-'));
    expect(backups).toHaveLength(1);
    expect(readFileSync(join(dir, backups[0]), 'utf-8')).toBe('{ this is not json');
  });

  it('unknown version → backup + healthy=false', async () => {
    writeFileSync(filePath, JSON.stringify({ version: 99, sessions: [] }), 'utf-8');
    const result = await registry.load();
    expect(result.healthy).toBe(false);
    expect(readdirSync(dir).some((f) => f.includes('.unrecognized-'))).toBe(true);
  });

  it('persists the worktree ownership record verbatim', async () => {
    await registry.upsert(
      entry('wt', {
        worktree: {
          worktreePath: '/tmp/proj-worktrees/session-wt',
          branchName: 'session/wt',
          mainProjectPath: '/tmp/proj',
          seededClaudeConfig: ['.claude/settings.json'],
        },
      })
    );
    const { entries } = await registry.load();
    expect(entries[0].worktree).toEqual({
      worktreePath: '/tmp/proj-worktrees/session-wt',
      branchName: 'session/wt',
      mainProjectPath: '/tmp/proj',
      seededClaudeConfig: ['.claude/settings.json'],
    });
  });
});
