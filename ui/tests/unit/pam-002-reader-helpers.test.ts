/**
 * Unit tests for PAM-002: getReadyStories, getReadyBacklogItems, activeIncidents layer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SpecsReader } from '../../src/server/specs-reader.js';
import { BacklogReader } from '../../src/server/backlog-reader.js';

// ============================================================================
// Helpers
// ============================================================================

function makeV2Kanban(taskOverrides: Record<string, unknown>[] = []) {
  const tasks = taskOverrides.length > 0 ? taskOverrides : [
    { id: 'T-001', title: 'First task', description: '', planSection: 'Phase 1', dependencies: [], status: 'ready', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } },
    { id: 'T-002', title: 'Second task', description: '', planSection: 'Phase 1', dependencies: ['T-001'], status: 'blocked', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } },
    { id: 'T-003', title: 'Third task', description: '', planSection: 'Phase 2', dependencies: [], status: 'ready', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } },
  ];
  return {
    version: '2.0',
    mode: 'lean',
    spec: { id: 'test-spec', name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: new Date().toISOString() },
    resumeContext: { currentPhase: '2-complete', nextPhase: null, worktreePath: null, gitBranch: null, gitStrategy: null, currentStory: null, currentStoryPhase: null, lastAction: null, nextAction: null, progressIndex: 0, totalStories: tasks.length },
    execution: { status: 'not_started', startedAt: null, completedAt: null, model: null },
    tasks,
    boardStatus: { total: tasks.length, ready: tasks.filter((t: Record<string, unknown>) => t.status === 'ready').length, inProgress: 0, done: 0, blocked: tasks.filter((t: Record<string, unknown>) => t.status === 'blocked').length },
    changeLog: []
  };
}

function makeV1Kanban(storyOverrides: Record<string, unknown>[] = []) {
  const stories = storyOverrides.length > 0 ? storyOverrides : [
    { id: 'S-001', title: 'Story one', type: 'feature', priority: 'high', effort: '3', status: 'ready', phase: 'pending', dependencies: [], blockedBy: [], model: null, timing: { createdAt: new Date().toISOString(), startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [], notes: null }, verification: { dodChecked: false, integrationVerified: false } },
    { id: 'S-002', title: 'Story two', type: 'feature', priority: 'medium', effort: '2', status: 'blocked', phase: 'pending', dependencies: ['S-001'], blockedBy: [], model: null, timing: { createdAt: new Date().toISOString(), startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [], notes: null }, verification: { dodChecked: false, integrationVerified: false } },
  ];
  return {
    version: '1.0',
    spec: { id: 'test-spec-v1', name: 'Test V1', prefix: 'S', specFile: 'spec.md', createdAt: new Date().toISOString() },
    resumeContext: { currentPhase: '2-complete', nextPhase: null, worktreePath: null, gitBranch: null, gitStrategy: null, currentStory: null, currentStoryPhase: null, lastAction: null, nextAction: null, progressIndex: 0, totalStories: stories.length },
    execution: { status: 'not_started', startedAt: null, completedAt: null, model: null },
    stories,
    boardStatus: { total: stories.length, ready: stories.filter((s: Record<string, unknown>) => s.status === 'ready').length, inProgress: 0, done: 0, blocked: stories.filter((s: Record<string, unknown>) => s.status === 'blocked').length },
    changeLog: []
  };
}

// ============================================================================
// SpecsReader.getReadyStories
// ============================================================================

describe('SpecsReader.getReadyStories', () => {
  let reader: SpecsReader;
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    reader = new SpecsReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam002-spec-'));
    projectPath = join(tmpDir, 'project');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeKanban(specId: string, kanban: Record<string, unknown>): Promise<void> {
    const specPath = join(projectPath, 'specwright', 'specs', specId);
    await fs.mkdir(specPath, { recursive: true });
    await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(kanban, null, 2));
  }

  it('returns ready tasks from V2 kanban', async () => {
    await writeKanban('test-spec', makeV2Kanban());
    const ready = await reader.getReadyStories(projectPath, 'test-spec');
    expect(ready).toHaveLength(2);
    expect(ready.map(r => r.id)).toContain('T-001');
    expect(ready.map(r => r.id)).toContain('T-003');
  });

  it('excludes IDs in excludeIds from V2 kanban', async () => {
    await writeKanban('test-spec', makeV2Kanban());
    const ready = await reader.getReadyStories(projectPath, 'test-spec', new Set(['T-001']));
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe('T-003');
  });

  it('returns ready stories from V1 kanban', async () => {
    await writeKanban('test-spec-v1', makeV1Kanban());
    const ready = await reader.getReadyStories(projectPath, 'test-spec-v1');
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe('S-001');
    expect(ready[0].title).toBe('Story one');
  });

  it('excludes IDs from V1 kanban', async () => {
    await writeKanban('test-spec-v1', makeV1Kanban());
    const ready = await reader.getReadyStories(projectPath, 'test-spec-v1', new Set(['S-001']));
    expect(ready).toHaveLength(0);
  });

  it('returns empty array when kanban.json missing', async () => {
    const specPath = join(projectPath, 'specwright', 'specs', 'no-kanban');
    await fs.mkdir(specPath, { recursive: true });
    const ready = await reader.getReadyStories(projectPath, 'no-kanban');
    expect(ready).toHaveLength(0);
  });
});

// ============================================================================
// BacklogReader.getReadyBacklogItems
// ============================================================================

describe('BacklogReader.getReadyBacklogItems', () => {
  let reader: BacklogReader;
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    reader = new BacklogReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam002-backlog-'));
    projectPath = join(tmpDir, 'project');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeBacklogIndex(items: Record<string, unknown>[]): Promise<void> {
    const backlogPath = join(projectPath, 'specwright', 'backlog');
    await fs.mkdir(backlogPath, { recursive: true });
    await fs.writeFile(
      join(backlogPath, 'backlog-index.json'),
      JSON.stringify({ items }, null, 2)
    );
  }

  const baseItem = (id: string, status: string, model = 'opus') => ({
    id, type: 'todo', title: `Item ${id}`, priority: 'medium',
    status, effort: 3, model
  });

  it('returns ready/open/pending items', async () => {
    await writeBacklogIndex([
      baseItem('TODO-001', 'ready'),
      baseItem('TODO-002', 'open'),
      baseItem('TODO-003', 'pending'),
      baseItem('TODO-004', 'in_progress'),
      baseItem('TODO-005', 'done'),
    ]);
    const items = await reader.getReadyBacklogItems(projectPath);
    expect(items.map(i => i.id).sort()).toEqual(['TODO-001', 'TODO-002', 'TODO-003']);
  });

  it('excludes IDs in excludeIds', async () => {
    await writeBacklogIndex([
      baseItem('TODO-001', 'ready'),
      baseItem('TODO-002', 'ready'),
    ]);
    const items = await reader.getReadyBacklogItems(projectPath, new Set(['TODO-001']));
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('TODO-002');
  });

  it('preserves model from item', async () => {
    await writeBacklogIndex([baseItem('TODO-001', 'ready', 'sonnet')]);
    const items = await reader.getReadyBacklogItems(projectPath);
    expect(items[0].model).toBe('sonnet');
  });

  it('defaults model to opus when invalid', async () => {
    await writeBacklogIndex([baseItem('TODO-001', 'ready', 'unknown-model')]);
    const items = await reader.getReadyBacklogItems(projectPath);
    expect(items[0].model).toBe('opus');
  });

  it('returns empty array when backlog-index.json missing', async () => {
    const backlogPath = join(projectPath, 'specwright', 'backlog');
    await fs.mkdir(backlogPath, { recursive: true });
    const items = await reader.getReadyBacklogItems(projectPath);
    expect(items).toHaveLength(0);
  });
});

// ============================================================================
// activeIncidents layer
// ============================================================================

describe('SpecsReader activeIncidents layer', () => {
  let reader: SpecsReader;
  let tmpDir: string;
  let projectPath: string;
  let specPath: string;
  const specId = 'test-spec';

  beforeEach(async () => {
    reader = new SpecsReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam002-incidents-'));
    projectPath = join(tmpDir, 'project');
    specPath = join(projectPath, 'specwright', 'specs', specId);
    await fs.mkdir(specPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeKanban(kanban: Record<string, unknown>): Promise<void> {
    await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(kanban, null, 2));
  }

  async function readKanban(): Promise<Record<string, unknown>> {
    const content = await fs.readFile(join(specPath, 'kanban.json'), 'utf-8');
    return JSON.parse(content);
  }

  const incident = (storyId: string, type = 'crash' as const) => ({
    type,
    message: `Test incident for ${storyId}`,
    storyId,
    timestamp: new Date().toISOString()
  });

  it('setAutoModeIncident appends to activeIncidents[]', async () => {
    await writeKanban(makeV2Kanban());
    await reader.setAutoModeIncident(projectPath, specId, incident('T-001'));
    await reader.setAutoModeIncident(projectPath, specId, incident('T-002'));

    const kanban = await readKanban();
    const incidents = (kanban.execution as Record<string, unknown>).activeIncidents as unknown[];
    expect(incidents).toHaveLength(2);
  });

  it('setAutoModeIncident migrates V1 lastIncident on first write', async () => {
    const v1Incident = incident('S-001');
    await writeKanban({
      ...makeV1Kanban(),
      execution: { status: 'running', startedAt: null, completedAt: null, model: null, lastIncident: v1Incident }
    });

    await reader.setAutoModeIncident(projectPath, specId, incident('S-002'));

    const kanban = await readKanban();
    const exec = kanban.execution as Record<string, unknown>;
    expect(exec.lastIncident).toBeNull();
    const incidents = exec.activeIncidents as Array<Record<string, unknown>>;
    expect(incidents).toHaveLength(2);
    expect(incidents[0].storyId).toBe('S-001');
    expect(incidents[1].storyId).toBe('S-002');
  });

  it('clearAutoModeIncident with storyId removes only that incident', async () => {
    await writeKanban(makeV2Kanban());
    await reader.setAutoModeIncident(projectPath, specId, incident('T-001'));
    await reader.setAutoModeIncident(projectPath, specId, incident('T-002'));

    await reader.clearAutoModeIncident(projectPath, specId, 'T-001');

    const kanban = await readKanban();
    const incidents = (kanban.execution as Record<string, unknown>).activeIncidents as Array<Record<string, unknown>>;
    expect(incidents).toHaveLength(1);
    expect(incidents[0].storyId).toBe('T-002');
  });

  it('clearAutoModeIncident without storyId clears all', async () => {
    await writeKanban(makeV2Kanban());
    await reader.setAutoModeIncident(projectPath, specId, incident('T-001'));
    await reader.setAutoModeIncident(projectPath, specId, incident('T-002'));

    await reader.clearAutoModeIncident(projectPath, specId);

    const kanban = await readKanban();
    const incidents = (kanban.execution as Record<string, unknown>).activeIncidents as unknown[];
    expect(incidents).toHaveLength(0);
  });

  it('KanbanBoard.activeIncidents populated on read (V2)', async () => {
    const inc = incident('T-001');
    await writeKanban({
      ...makeV2Kanban(),
      execution: { status: 'running', startedAt: null, completedAt: null, model: null, activeIncidents: [inc] }
    });

    const board = await reader.getKanbanBoard(projectPath, specId);
    expect(board.activeIncidents).toHaveLength(1);
    expect(board.activeIncidents[0].storyId).toBe('T-001');
    expect(board.lastIncident?.storyId).toBe('T-001');
  });

  it('KanbanBoard migrates V1 lastIncident to activeIncidents on read', async () => {
    const v1Incident = incident('S-001');
    await writeKanban({
      ...makeV1Kanban(),
      execution: { status: 'running', startedAt: null, completedAt: null, model: null, lastIncident: v1Incident }
    });

    const board = await reader.getKanbanBoard(projectPath, specId);
    expect(board.activeIncidents).toHaveLength(1);
    expect(board.activeIncidents[0].storyId).toBe('S-001');
    expect(board.lastIncident?.storyId).toBe('S-001');
  });

  it('KanbanBoard.activeIncidents is empty array when no incidents', async () => {
    await writeKanban(makeV2Kanban());
    const board = await reader.getKanbanBoard(projectPath, specId);
    expect(board.activeIncidents).toEqual([]);
    expect(board.lastIncident).toBeNull();
  });
});
