/**
 * SPD-001: Unit tests for spec-level priority and blockedBy persistence.
 *
 * Verifies setSpecPriority / setSpecBlockedBy lock-safe writes,
 * read-back via getSpecInfo / getKanbanBoard, and backward-compatible
 * absence of fields in existing kanbans.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SpecsReader } from '../../src/server/specs-reader.js';

const SPEC_ID = '2026-01-01-test-spec';

describe('SPD-001: setSpecPriority / setSpecBlockedBy', () => {
  let reader: SpecsReader;
  let tmpDir: string;
  let projectPath: string;
  let specPath: string;

  beforeEach(async () => {
    reader = new SpecsReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'spd-001-test-'));
    projectPath = join(tmpDir, 'project');
    specPath = join(projectPath, 'specwright', 'specs', SPEC_ID);
    await fs.mkdir(specPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeV2Kanban(overrides: Record<string, unknown> = {}): Promise<void> {
    const base = {
      version: '2.0',
      mode: 'lean',
      spec: {
        id: SPEC_ID,
        name: 'Test Spec',
        prefix: 'TEST',
        specFile: 'spec.md',
        specLiteFile: 'spec-lite.md',
        createdAt: '2026-01-01T00:00:00.000Z',
        implementationPlan: 'implementation-plan.md'
      },
      resumeContext: {
        currentPhase: '2-complete',
        nextPhase: '3-execute-task',
        worktreePath: null,
        gitBranch: 'main',
        gitStrategy: 'current-branch',
        currentStory: null,
        currentStoryPhase: null,
        lastAction: 'setup',
        nextAction: 'execute',
        progressIndex: 0,
        totalStories: 1
      },
      execution: { status: 'not_started', startedAt: null, completedAt: null, model: null },
      tasks: [
        {
          id: 'TEST-001',
          title: 'A task',
          description: '',
          planSection: 'Phase 1',
          dependencies: [],
          status: 'ready',
          phase: 'pending',
          model: null,
          timing: { startedAt: null, completedAt: null },
          implementation: { filesModified: [], commits: [] }
        }
      ],
      boardStatus: { total: 1, ready: 1, inProgress: 0, done: 0, blocked: 0 },
      changeLog: [],
      ...overrides
    };
    await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(base, null, 2));
  }

  async function readKanban(): Promise<Record<string, unknown>> {
    const raw = await fs.readFile(join(specPath, 'kanban.json'), 'utf-8');
    return JSON.parse(raw);
  }

  // ─── setSpecPriority ────────────────────────────────────────────────────────

  describe('setSpecPriority', () => {
    it('sets a valid priority and persists it', async () => {
      await writeV2Kanban();
      const result = await reader.setSpecPriority(projectPath, SPEC_ID, 'P1');
      expect(result.error).toBeUndefined();
      expect(result.priority).toBe('P1');

      const kanban = await readKanban();
      expect((kanban.spec as Record<string, unknown>).priority).toBe('P1');
    });

    it('overwrites an existing priority', async () => {
      await writeV2Kanban({ spec: { id: SPEC_ID, name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: '2026-01-01T00:00:00.000Z', priority: 'P0' } });
      await reader.setSpecPriority(projectPath, SPEC_ID, 'P3');
      const kanban = await readKanban();
      expect((kanban.spec as Record<string, unknown>).priority).toBe('P3');
    });

    it('clears priority when null is passed', async () => {
      await writeV2Kanban({ spec: { id: SPEC_ID, name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: '2026-01-01T00:00:00.000Z', priority: 'P2' } });
      const result = await reader.setSpecPriority(projectPath, SPEC_ID, null);
      expect(result.error).toBeUndefined();
      const kanban = await readKanban();
      expect((kanban.spec as Record<string, unknown>).priority).toBeUndefined();
    });

    it('rejects invalid priority values', async () => {
      await writeV2Kanban();
      const result = await reader.setSpecPriority(projectPath, SPEC_ID, 'HIGH');
      expect(result.error).toMatch(/Invalid priority/);
    });

    it('adds a changeLog entry', async () => {
      await writeV2Kanban();
      await reader.setSpecPriority(projectPath, SPEC_ID, 'P0');
      const kanban = await readKanban();
      const log = kanban.changeLog as Array<{ action: string; details: string }>;
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('spec_priority_set');
      expect(log[0].details).toContain('P0');
    });

    it('returns error when kanban.json does not exist', async () => {
      // Directory exists but has no kanban.json (withKanbanLock needs the dir to exist)
      const emptySpecId = '2026-01-01-empty-spec';
      const emptySpecPath = join(projectPath, 'specwright', 'specs', emptySpecId);
      await fs.mkdir(emptySpecPath, { recursive: true });
      const result = await reader.setSpecPriority(projectPath, emptySpecId, 'P1');
      expect(result.error).toMatch(/kanban\.json not found/);
    });
  });

  // ─── setSpecBlockedBy ───────────────────────────────────────────────────────

  describe('setSpecBlockedBy', () => {
    it('sets a blockedBy list and persists it', async () => {
      await writeV2Kanban();
      const result = await reader.setSpecBlockedBy(projectPath, SPEC_ID, ['2026-01-01-other-spec']);
      expect(result.error).toBeUndefined();
      expect(result.blockedBy).toEqual(['2026-01-01-other-spec']);

      const kanban = await readKanban();
      expect((kanban.spec as Record<string, unknown>).blockedBy).toEqual(['2026-01-01-other-spec']);
    });

    it('overwrites an existing blockedBy list', async () => {
      await writeV2Kanban({ spec: { id: SPEC_ID, name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: '2026-01-01T00:00:00.000Z', blockedBy: ['old-spec'] } });
      await reader.setSpecBlockedBy(projectPath, SPEC_ID, ['new-spec-a', 'new-spec-b']);
      const kanban = await readKanban();
      expect((kanban.spec as Record<string, unknown>).blockedBy).toEqual(['new-spec-a', 'new-spec-b']);
    });

    it('removes blockedBy field when empty array is passed', async () => {
      await writeV2Kanban({ spec: { id: SPEC_ID, name: 'Test', prefix: 'T', specFile: 'spec.md', createdAt: '2026-01-01T00:00:00.000Z', blockedBy: ['some-spec'] } });
      const result = await reader.setSpecBlockedBy(projectPath, SPEC_ID, []);
      expect(result.error).toBeUndefined();
      const kanban = await readKanban();
      expect((kanban.spec as Record<string, unknown>).blockedBy).toBeUndefined();
    });

    it('adds a changeLog entry', async () => {
      await writeV2Kanban();
      await reader.setSpecBlockedBy(projectPath, SPEC_ID, ['spec-a', 'spec-b']);
      const kanban = await readKanban();
      const log = kanban.changeLog as Array<{ action: string; details: string }>;
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('spec_blocked_by_set');
      expect(log[0].details).toContain('spec-a');
    });

    it('returns error when kanban.json does not exist', async () => {
      const emptySpecId = '2026-01-01-empty-spec-b';
      const emptySpecPath = join(projectPath, 'specwright', 'specs', emptySpecId);
      await fs.mkdir(emptySpecPath, { recursive: true });
      const result = await reader.setSpecBlockedBy(projectPath, emptySpecId, ['x']);
      expect(result.error).toMatch(/kanban\.json not found/);
    });
  });

  // ─── Backward compatibility ─────────────────────────────────────────────────

  describe('backward compatibility (no priority/blockedBy in spec)', () => {
    it('getSpecInfo returns undefined priority and blockedBy when fields absent', async () => {
      await writeV2Kanban(); // no priority/blockedBy in spec
      const specs = await reader.listSpecs(projectPath);
      expect(specs).toHaveLength(1);
      expect(specs[0].priority).toBeUndefined();
      expect(specs[0].blockedBy).toBeUndefined();
    });

    it('getKanbanBoard returns undefined priority and blockedBy when fields absent', async () => {
      await writeV2Kanban();
      const board = await reader.getKanbanBoard(projectPath, SPEC_ID);
      expect(board.priority).toBeUndefined();
      expect(board.blockedBy).toBeUndefined();
    });
  });

  // ─── Read-back via getSpecInfo / getKanbanBoard ──────────────────────────────

  describe('read-back via public API', () => {
    it('getSpecInfo reflects written priority', async () => {
      await writeV2Kanban();
      await reader.setSpecPriority(projectPath, SPEC_ID, 'P2');
      const specs = await reader.listSpecs(projectPath);
      expect(specs[0].priority).toBe('P2');
    });

    it('getSpecInfo reflects written blockedBy', async () => {
      await writeV2Kanban();
      await reader.setSpecBlockedBy(projectPath, SPEC_ID, ['dep-spec']);
      const specs = await reader.listSpecs(projectPath);
      expect(specs[0].blockedBy).toEqual(['dep-spec']);
    });

    it('getKanbanBoard reflects written priority', async () => {
      await writeV2Kanban();
      await reader.setSpecPriority(projectPath, SPEC_ID, 'P0');
      const board = await reader.getKanbanBoard(projectPath, SPEC_ID);
      expect(board.priority).toBe('P0');
    });

    it('getKanbanBoard reflects written blockedBy', async () => {
      await writeV2Kanban();
      await reader.setSpecBlockedBy(projectPath, SPEC_ID, ['blocker-a', 'blocker-b']);
      const board = await reader.getKanbanBoard(projectPath, SPEC_ID);
      expect(board.blockedBy).toEqual(['blocker-a', 'blocker-b']);
    });
  });
});
