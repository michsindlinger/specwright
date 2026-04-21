/**
 * Unit tests for V2 (Lean) kanban support in SpecsReader.
 *
 * Tests the V2-to-frontend conversion, isSpecReady, resolveDependencies,
 * updateStoryStatus, and getStoryDetail for V2 kanban.json format.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SpecsReader } from '../../src/server/specs-reader.js';

describe('SpecsReader V2 (Lean) Kanban', () => {
  let reader: SpecsReader;
  let tmpDir: string;
  let projectPath: string;
  let specPath: string;
  const specId = '2026-04-21-test-spec';

  beforeEach(async () => {
    reader = new SpecsReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'kanban-v2-test-'));
    projectPath = join(tmpDir, 'project');
    specPath = join(projectPath, 'specwright', 'specs', specId);
    await fs.mkdir(specPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeV2Kanban(overrides: Record<string, unknown> = {}): Promise<void> {
    const kanban = {
      version: '2.0',
      mode: 'lean',
      spec: {
        id: specId,
        name: 'Test Spec',
        prefix: 'TEST',
        specFile: 'spec.md',
        specLiteFile: 'spec-lite.md',
        createdAt: new Date().toISOString(),
        specTier: 'M',
        implementationPlan: 'implementation-plan.md'
      },
      resumeContext: {
        currentPhase: '2-complete',
        nextPhase: '3-execute-task',
        worktreePath: null,
        gitBranch: null,
        gitStrategy: null,
        currentStory: null,
        currentStoryPhase: null,
        lastAction: 'Test setup',
        nextAction: 'Execute next task',
        progressIndex: 0,
        totalStories: 3
      },
      execution: { status: 'not_started', startedAt: null, completedAt: null, model: null },
      tasks: [
        { id: 'TASK-001', title: 'Setup DB', description: 'Create DB schema', planSection: 'Phase 1', dependencies: [], status: 'ready', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } },
        { id: 'TASK-002', title: 'Build API', description: 'Create REST endpoints', planSection: 'Phase 1', dependencies: ['TASK-001'], status: 'blocked', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } },
        { id: 'TASK-003', title: 'Add Tests', description: 'Write integration tests', planSection: 'Phase 2', dependencies: ['TASK-002'], status: 'blocked', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } }
      ],
      boardStatus: { total: 3, ready: 1, inProgress: 0, inReview: 0, testing: 0, done: 0, blocked: 2 },
      changeLog: [],
      ...overrides
    };
    await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(kanban, null, 2));
  }

  describe('getKanbanBoard V2', () => {
    it('reads V2 kanban and maps tasks to stories', async () => {
      await writeV2Kanban();
      const board = await reader.getKanbanBoard(projectPath, specId);

      expect(board.specId).toBe(specId);
      expect(board.stories).toHaveLength(3);
      expect(board.stories[0].id).toBe('TASK-001');
      expect(board.stories[0].title).toBe('Setup DB');
      expect(board.stories[0].type).toBe('task');
    });

    it('maps V2 task statuses to frontend statuses', async () => {
      await writeV2Kanban();
      const board = await reader.getKanbanBoard(projectPath, specId);

      const readyTask = board.stories.find(s => s.id === 'TASK-001');
      const blockedTask = board.stories.find(s => s.id === 'TASK-002');
      expect(readyTask?.status).toBe('backlog'); // ready → backlog in frontend
      expect(blockedTask?.status).toBe('blocked');
    });

    it('computes dorComplete from done dependencies', async () => {
      await writeV2Kanban();
      const board = await reader.getKanbanBoard(projectPath, specId);

      // TASK-001 has no deps → dorComplete = true
      const task1 = board.stories.find(s => s.id === 'TASK-001');
      expect(task1?.dorComplete).toBe(true);

      // TASK-002 depends on TASK-001 (not done) → dorComplete = false
      const task2 = board.stories.find(s => s.id === 'TASK-002');
      expect(task2?.dorComplete).toBe(false);
    });

    it('returns correct currentPhase and executionStatus', async () => {
      await writeV2Kanban();
      const board = await reader.getKanbanBoard(projectPath, specId);

      expect(board.currentPhase).toBe('2-complete');
      expect(board.executionStatus).toBe('not_started');
    });
  });

  describe('isSpecReady V2', () => {
    it('returns false when some tasks are blocked', async () => {
      await writeV2Kanban();
      const kanban = JSON.parse(await fs.readFile(join(specPath, 'kanban.json'), 'utf-8'));
      expect(reader.isSpecReady(kanban)).toBe(false);
    });

    it('returns true when all tasks are ready', async () => {
      await writeV2Kanban({
        tasks: [
          { id: 'TASK-001', title: 'A', description: 'A', planSection: 'P1', dependencies: [], status: 'ready', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } },
          { id: 'TASK-002', title: 'B', description: 'B', planSection: 'P1', dependencies: [], status: 'ready', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } }
        ]
      });
      const kanban = JSON.parse(await fs.readFile(join(specPath, 'kanban.json'), 'utf-8'));
      expect(reader.isSpecReady(kanban)).toBe(true);
    });

    it('returns false for V1 kanban with blocked stories', async () => {
      // Write a V1 kanban
      const v1Kanban = {
        version: '1.0',
        spec: { id: specId, name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: new Date().toISOString() },
        stories: [
          { id: 'STORY-001', title: 'A', status: 'ready', dependencies: [] },
          { id: 'STORY-002', title: 'B', status: 'blocked', dependencies: ['STORY-001'] }
        ],
        resumeContext: { currentPhase: '2-complete' },
        execution: { status: 'not_started' },
        boardStatus: { total: 2, ready: 1, inProgress: 0, done: 0, blocked: 1 },
        changeLog: []
      };
      await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(v1Kanban, null, 2));
      const kanban = JSON.parse(await fs.readFile(join(specPath, 'kanban.json'), 'utf-8'));
      expect(reader.isSpecReady(kanban)).toBe(false);
    });
  });

  describe('resolveDependencies V2', () => {
    it('unblocks task when dependency is done', async () => {
      await writeV2Kanban({
        tasks: [
          { id: 'TASK-001', title: 'Setup DB', description: 'Create DB schema', planSection: 'Phase 1', dependencies: [], status: 'done', phase: 'done', model: null, timing: { startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T01:00:00Z' }, implementation: { filesModified: [], commits: [] } },
          { id: 'TASK-002', title: 'Build API', description: 'Create REST endpoints', planSection: 'Phase 1', dependencies: ['TASK-001'], status: 'blocked', phase: 'pending', model: null, timing: { startedAt: null, completedAt: null }, implementation: { filesModified: [], commits: [] } }
        ]
      });

      const unblocked = await reader.resolveDependencies(projectPath, specId);
      expect(unblocked).toContain('TASK-002');

      // Verify kanban.json was updated
      const updated = JSON.parse(await fs.readFile(join(specPath, 'kanban.json'), 'utf-8'));
      const task2 = updated.tasks.find((t: { id: string }) => t.id === 'TASK-002');
      expect(task2.status).toBe('ready');
    });
  });

  describe('updateStoryStatus V2', () => {
    it('updates task status in V2 kanban', async () => {
      await writeV2Kanban();
      await reader.updateStoryStatus(projectPath, specId, 'TASK-001', 'in_progress');

      const updated = JSON.parse(await fs.readFile(join(specPath, 'kanban.json'), 'utf-8'));
      const task = updated.tasks.find((t: { id: string }) => t.id === 'TASK-001');
      expect(task.status).toBe('in_progress');
      expect(task.phase).toBe('in_progress');
      expect(task.timing.startedAt).toBeTruthy();
    });

    it('sets completedAt when marking done', async () => {
      await writeV2Kanban();
      await reader.updateStoryStatus(projectPath, specId, 'TASK-001', 'done');

      const updated = JSON.parse(await fs.readFile(join(specPath, 'kanban.json'), 'utf-8'));
      const task = updated.tasks.find((t: { id: string }) => t.id === 'TASK-001');
      expect(task.status).toBe('done');
      expect(task.timing.completedAt).toBeTruthy();
    });
  });

  describe('getStoryDetail V2', () => {
    it('returns task detail from V2 kanban', async () => {
      await writeV2Kanban();
      await fs.writeFile(join(specPath, 'spec.md'), '# Test Spec\n\nA test spec.');
      await fs.writeFile(join(specPath, 'spec-lite.md'), '# Test Spec Lite');

      const detail = await reader.getStoryDetail(projectPath, specId, 'TASK-001');
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe('TASK-001');
      expect(detail!.title).toBe('Setup DB');
      expect(detail!.type).toBe('task');
      expect(detail!.status).toBe('backlog'); // ready → backlog
      expect(detail!.acceptanceCriteria).toBeNull(); // V2 has no AC
      expect(detail!.dorChecklist).toBeNull();
      expect(detail!.dodChecklist).toBeNull();
    });

    it('returns null for non-existent task', async () => {
      await writeV2Kanban();
      const detail = await reader.getStoryDetail(projectPath, specId, 'TASK-999');
      expect(detail).toBeNull();
    });

    it('includes implementation plan section when available', async () => {
      await writeV2Kanban();
      const plan = `# Implementation Plan

## Executive Summary

Build the core feature.

### Phase 1: Foundation

- Create database schema
- Setup API endpoints

### Phase 2: Frontend

- Build UI components
`;
      await fs.writeFile(join(specPath, 'implementation-plan.md'), plan);

      const detail = await reader.getStoryDetail(projectPath, specId, 'TASK-001');
      expect(detail).not.toBeNull();
      expect(detail!.content).toContain('Phase 1');
      expect(detail!.content).toContain('database schema');
    });
  });
});
