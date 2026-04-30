/**
 * Unit tests for SpecsReader.forceResetItem.
 *
 * forceResetItem is the public single-item reset used by the stall-recovery
 * path. It must:
 *  - reset status, phase, and timing for both V1 stories and V2 tasks
 *  - append a `stall_recovery` changeLog entry
 *  - update boardStatus counts
 *  - be idempotent (no-op when the item is missing or already not-in_progress)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SpecsReader } from '../../src/server/specs-reader.js';

describe('SpecsReader.forceResetItem (V2 lean kanban)', () => {
  let projectPath: string;
  const specId = '2026-04-29-test-stall-recovery';

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'stall-recovery-v2-'));
    const specPath = join(projectPath, 'specwright', 'specs', specId);
    await mkdir(specPath, { recursive: true });
    const kanban = {
      version: '2.0',
      mode: 'lean',
      spec: { id: specId, name: 'Test', prefix: 'T', specFile: 'spec.md', specLiteFile: 'spec-lite.md', createdAt: '', specTier: 'S', implementationPlan: 'plan.md' },
      resumeContext: { currentPhase: '', nextPhase: '', worktreePath: null, gitBranch: null, gitStrategy: null, currentStory: null, currentStoryPhase: null, lastAction: '', nextAction: '', progressIndex: 0, totalStories: 2 },
      execution: { status: 'executing', startedAt: null, completedAt: null, model: null },
      tasks: [
        { id: 'T-001', title: 'A', status: 'in_progress', phase: 'in_progress', dependencies: [], model: null, timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: null } },
        { id: 'T-002', title: 'B', status: 'ready', phase: 'pending', dependencies: [], model: null, timing: { startedAt: null, completedAt: null } },
      ],
      boardStatus: { total: 2, ready: 1, inProgress: 1, inReview: 0, testing: 0, done: 0, blocked: 0 },
      changeLog: [],
    };
    await writeFile(join(specPath, 'kanban.json'), JSON.stringify(kanban, null, 2));
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('resets a single in_progress task to ready with stall_recovery changeLog', async () => {
    const reader = new SpecsReader();
    const ok = await reader.forceResetItem(projectPath, specId, 'T-001', 'Stall recovery test');
    expect(ok).toBe(true);

    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'specs', specId, 'kanban.json'),
      'utf-8'
    ));
    const t1 = written.tasks.find((t: { id: string }) => t.id === 'T-001');
    expect(t1.status).toBe('ready');
    expect(t1.phase).toBe('pending');
    expect(t1.timing.startedAt).toBeNull();
    expect(t1.timing.completedAt).toBeNull();

    expect(written.boardStatus.inProgress).toBe(0);
    expect(written.boardStatus.ready).toBe(2);

    expect(written.changeLog.some((e: { action: string; storyId: string | null }) =>
      e.action === 'stall_recovery' && e.storyId === 'T-001'
    )).toBe(true);
  });

  it('returns false and does not mutate when the item is not in_progress', async () => {
    const reader = new SpecsReader();
    const ok = await reader.forceResetItem(projectPath, specId, 'T-002', 'noop');
    expect(ok).toBe(false);

    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'specs', specId, 'kanban.json'),
      'utf-8'
    ));
    expect(written.changeLog.length).toBe(0);
    expect(written.boardStatus.ready).toBe(1);
  });

  it('returns false for unknown itemId', async () => {
    const reader = new SpecsReader();
    const ok = await reader.forceResetItem(projectPath, specId, 'T-DOES-NOT-EXIST', 'noop');
    expect(ok).toBe(false);
  });
});

describe('SpecsReader.forceResetItem (V1 kanban)', () => {
  let projectPath: string;
  const specId = '2026-04-29-test-stall-recovery-v1';

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'stall-recovery-v1-'));
    const specPath = join(projectPath, 'specwright', 'specs', specId);
    await mkdir(specPath, { recursive: true });
    const kanban = {
      version: '1.0',
      spec: { id: specId, name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: '' },
      resumeContext: { currentPhase: '', nextPhase: '', worktreePath: null, gitBranch: null, gitStrategy: null, currentStory: null, currentStoryPhase: null, lastAction: '', nextAction: '', progressIndex: 0, totalStories: 1 },
      execution: { status: 'executing', startedAt: null, completedAt: null, model: null },
      stories: [
        {
          id: 'S-001',
          title: 'A',
          file: 'story-001.md',
          type: 'task',
          priority: 'medium',
          effort: 1,
          status: 'in_progress',
          phase: 'in_progress',
          dependencies: [],
          blockedBy: [],
          model: null,
          timing: { createdAt: '2026-01-01T00:00:00Z', startedAt: '2026-01-01T00:00:00Z', completedAt: null },
          implementation: { filesModified: [], commits: [], notes: null },
          verification: { dodChecked: false, integrationVerified: false },
        },
      ],
      boardStatus: { total: 1, ready: 0, inProgress: 1, inReview: 0, testing: 0, done: 0, blocked: 0 },
      changeLog: [],
    };
    await writeFile(join(specPath, 'kanban.json'), JSON.stringify(kanban, null, 2));
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('resets a single in_progress V1 story with full timing fields', async () => {
    const reader = new SpecsReader();
    const ok = await reader.forceResetItem(projectPath, specId, 'S-001', 'Stall recovery test');
    expect(ok).toBe(true);

    const written = JSON.parse(await readFile(
      join(projectPath, 'specwright', 'specs', specId, 'kanban.json'),
      'utf-8'
    ));
    const s1 = written.stories.find((s: { id: string }) => s.id === 'S-001');
    expect(s1.status).toBe('ready');
    expect(s1.phase).toBe('pending');
    expect(s1.timing.startedAt).toBeNull();
    expect(s1.timing.completedAt).toBeNull();
    // createdAt is preserved
    expect(s1.timing.createdAt).toBe('2026-01-01T00:00:00Z');

    expect(written.boardStatus.ready).toBe(1);
    expect(written.boardStatus.inProgress).toBe(0);
  });
});
