/**
 * Unit tests for PAM-FIX-006:
 *  - SpecsReader.resetStaleInProgress flips stale in_progress → ready
 *  - BacklogReader.resetStaleInProgressItems mirror behavior
 *  - Active IDs are preserved (not reset)
 *  - No-op when there is nothing to recover (no write)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SpecsReader } from '../../src/server/specs-reader.js';
import { BacklogReader } from '../../src/server/backlog-reader.js';

describe('SpecsReader.resetStaleInProgress (V2 lean kanban)', () => {
  let projectPath: string;
  const specId = '2026-04-28-test-stale-recovery';

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'pam-fix-006-spec-'));
    const specPath = join(projectPath, 'specwright', 'specs', specId);
    await mkdir(specPath, { recursive: true });
    const kanban = {
      version: '2.0',
      mode: 'lean',
      spec: { id: specId, name: 'Test', prefix: 'T', specFile: 'spec.md', specLiteFile: 'spec-lite.md', createdAt: '', specTier: 'S', implementationPlan: 'plan.md' },
      resumeContext: { currentPhase: '', nextPhase: '', worktreePath: null, gitBranch: null, gitStrategy: null, currentStory: null, currentStoryPhase: null, lastAction: '', nextAction: '', progressIndex: 0, totalStories: 3 },
      execution: { status: 'executing', startedAt: null, completedAt: null, model: null },
      tasks: [
        { id: 'T-001', title: 'A', status: 'in_progress', phase: 'in_progress', dependencies: [], model: null, timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: null } },
        { id: 'T-002', title: 'B', status: 'in_progress', phase: 'in_progress', dependencies: [], model: null, timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: null } },
        { id: 'T-003', title: 'C', status: 'ready',       phase: 'pending',     dependencies: [], model: null, timing: { startedAt: null, completedAt: null } },
      ],
      boardStatus: { total: 3, ready: 1, inProgress: 2, inReview: 0, testing: 0, done: 0, blocked: 0 },
      changeLog: [],
    };
    await writeFile(join(specPath, 'kanban.json'), JSON.stringify(kanban, null, 2));
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('resets in_progress without active slot, keeps in_progress with active slot', async () => {
    const reader = new SpecsReader();
    const recovered = await reader.resetStaleInProgress(projectPath, specId, new Set(['T-002']));

    expect(recovered).toEqual(['T-001']);

    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'specs', specId, 'kanban.json'),
      'utf-8'
    ));
    const t1 = written.tasks.find((t: { id: string }) => t.id === 'T-001');
    const t2 = written.tasks.find((t: { id: string }) => t.id === 'T-002');
    const t3 = written.tasks.find((t: { id: string }) => t.id === 'T-003');

    expect(t1.status).toBe('ready');
    expect(t1.phase).toBe('pending');
    expect(t1.timing.startedAt).toBeNull();

    expect(t2.status).toBe('in_progress'); // protected by activeIds
    expect(t2.timing.startedAt).toBe('2026-01-01T00:00:00Z');

    expect(t3.status).toBe('ready'); // unchanged

    expect(written.boardStatus.inProgress).toBe(1);
    expect(written.boardStatus.ready).toBe(2);
    expect(written.changeLog.some((e: { action: string }) => e.action === 'stale_recovery')).toBe(true);
  });

  it('returns empty array and skips write when nothing to recover', async () => {
    const reader = new SpecsReader();
    const recovered = await reader.resetStaleInProgress(projectPath, specId, new Set(['T-001', 'T-002']));
    expect(recovered).toEqual([]);
  });
});

describe('BacklogReader.markItemInProgress (PAM-FIX-007)', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'pam-fix-007-mark-'));
    const backlogPath = join(projectPath, 'specwright', 'backlog');
    await mkdir(backlogPath, { recursive: true });
    const backlog = {
      version: '1.0',
      items: [
        { id: 'B-001', title: 'A', status: 'ready' },
        { id: 'B-002', title: 'B', status: 'in_progress' },
      ],
    };
    await writeFile(join(backlogPath, 'backlog-index.json'), JSON.stringify(backlog, null, 2));
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('flips ready → in_progress', async () => {
    const reader = new BacklogReader();
    await reader.markItemInProgress(projectPath, 'B-001');
    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'backlog', 'backlog-index.json'),
      'utf-8'
    ));
    expect(written.items.find((i: { id: string }) => i.id === 'B-001').status).toBe('in_progress');
  });

  it('is no-op when already in_progress', async () => {
    const reader = new BacklogReader();
    await reader.markItemInProgress(projectPath, 'B-002');
    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'backlog', 'backlog-index.json'),
      'utf-8'
    ));
    expect(written.items.find((i: { id: string }) => i.id === 'B-002').status).toBe('in_progress');
  });

  it('is no-op for unknown item', async () => {
    const reader = new BacklogReader();
    await expect(reader.markItemInProgress(projectPath, 'B-DOES-NOT-EXIST')).resolves.toBeUndefined();
  });
});

describe('BacklogReader.resetStaleInProgressItems', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'pam-fix-006-backlog-'));
    const backlogPath = join(projectPath, 'specwright', 'backlog');
    await mkdir(backlogPath, { recursive: true });
    const backlog = {
      version: '1.0',
      items: [
        { id: 'B-001', title: 'A', status: 'in_progress' },
        { id: 'B-002', title: 'B', status: 'in_progress' },
        { id: 'B-003', title: 'C', status: 'ready' },
      ],
    };
    await writeFile(join(backlogPath, 'backlog-index.json'), JSON.stringify(backlog, null, 2));
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('resets stale in_progress, keeps active ones', async () => {
    const reader = new BacklogReader();
    const recovered = await reader.resetStaleInProgressItems(projectPath, new Set(['B-002']));

    expect(recovered).toEqual(['B-001']);

    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'backlog', 'backlog-index.json'),
      'utf-8'
    ));
    const b1 = written.items.find((i: { id: string }) => i.id === 'B-001');
    const b2 = written.items.find((i: { id: string }) => i.id === 'B-002');
    const b3 = written.items.find((i: { id: string }) => i.id === 'B-003');

    expect(b1.status).toBe('ready');
    expect(b2.status).toBe('in_progress');
    expect(b3.status).toBe('ready');
  });

  it('returns empty array when nothing to recover', async () => {
    const reader = new BacklogReader();
    const recovered = await reader.resetStaleInProgressItems(projectPath, new Set(['B-001', 'B-002']));
    expect(recovered).toEqual([]);
  });
});
