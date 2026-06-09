import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { SpecsReader } from '../../src/server/specs-reader.js';

// Minimal V2 lean kanban.json for testing
function makeKanbanV2(specId: string, opts: {
  priority?: string;
  blockedBy?: string[];
} = {}) {
  return {
    version: '2.0',
    mode: 'lean',
    spec: {
      id: specId,
      name: `Spec ${specId}`,
      prefix: 'TEST',
      specFile: 'spec.md',
      createdAt: new Date().toISOString(),
      ...(opts.priority !== undefined ? { priority: opts.priority } : {}),
      ...(opts.blockedBy !== undefined ? { blockedBy: opts.blockedBy } : {}),
    },
    resumeContext: {
      currentPhase: 'task-complete',
      nextPhase: null,
      worktreePath: null,
      gitBranch: 'main',
      gitStrategy: 'current-branch',
      currentStory: null,
      currentStoryPhase: null,
      lastAction: null,
      nextAction: null,
      progressIndex: 0,
      totalStories: 1,
    },
    execution: { status: 'executing', startedAt: null, completedAt: null, model: null },
    tasks: [
      { id: 'T-001', title: 'Task 1', status: 'done', phase: 'done', dependencies: [] }
    ],
    boardStatus: { total: 1, ready: 0, inProgress: 0, done: 1, blocked: 0 },
    changeLog: [],
  };
}

async function writeKanban(specPath: string, data: object) {
  await fs.mkdir(specPath, { recursive: true });
  await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(data, null, 2), 'utf-8');
}

describe('SPD-008: deleteSpec + cleanupBlockedByRef', () => {
  let projectPath: string;
  let reader: SpecsReader;

  beforeEach(async () => {
    projectPath = join(tmpdir(), `spd-008-${randomUUID()}`);
    const specsPath = join(projectPath, 'specwright', 'specs');
    await fs.mkdir(specsPath, { recursive: true });
    reader = new SpecsReader();
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  async function setupSpec(specId: string, opts: { priority?: string; blockedBy?: string[] } = {}) {
    const specPath = join(projectPath, 'specwright', 'specs', specId);
    await writeKanban(specPath, makeKanbanV2(specId, opts));
    return specPath;
  }

  describe('cleanupBlockedByRef', () => {
    it('removes deleted spec ID from blockedBy of a dependent spec', async () => {
      await setupSpec('spec-A');
      await setupSpec('spec-B', { blockedBy: ['spec-A'] });

      await reader.cleanupBlockedByRef(projectPath, 'spec-A');

      const specs = await reader.listSpecs(projectPath);
      const specB = specs.find(s => s.id === 'spec-B');
      expect(specB?.blockedBy).toBeUndefined();
    });

    it('removes deleted spec ID while preserving other blockedBy entries', async () => {
      await setupSpec('spec-A');
      await setupSpec('spec-C');
      await setupSpec('spec-B', { blockedBy: ['spec-A', 'spec-C'] });

      await reader.cleanupBlockedByRef(projectPath, 'spec-A');

      const specs = await reader.listSpecs(projectPath);
      const specB = specs.find(s => s.id === 'spec-B');
      expect(specB?.blockedBy).toEqual(['spec-C']);
    });

    it('leaves specs unaffected when they do not reference the deleted spec', async () => {
      await setupSpec('spec-A');
      await setupSpec('spec-B', { blockedBy: ['spec-C'] }); // spec-C doesn't exist but not spec-A
      await setupSpec('spec-D'); // no blockedBy at all

      await reader.cleanupBlockedByRef(projectPath, 'spec-A');

      const specs = await reader.listSpecs(projectPath);
      const specB = specs.find(s => s.id === 'spec-B');
      expect(specB?.blockedBy).toEqual(['spec-C']);
      const specD = specs.find(s => s.id === 'spec-D');
      expect(specD?.blockedBy).toBeUndefined();
    });

    it('handles empty specs directory gracefully', async () => {
      await expect(reader.cleanupBlockedByRef(projectPath, 'spec-A')).resolves.not.toThrow();
    });

    it('does not crash when a spec has no kanban.json', async () => {
      // spec-B exists as directory but has no kanban.json
      const specBPath = join(projectPath, 'specwright', 'specs', 'spec-B');
      await fs.mkdir(specBPath, { recursive: true });
      await setupSpec('spec-C', { blockedBy: ['spec-A'] });

      await expect(reader.cleanupBlockedByRef(projectPath, 'spec-A')).resolves.not.toThrow();

      const specs = await reader.listSpecs(projectPath);
      const specC = specs.find(s => s.id === 'spec-C');
      expect(specC?.blockedBy).toBeUndefined();
    });
  });

  describe('deleteSpec (with cleanup)', () => {
    it('deletes the spec folder and cleans dangling blockedBy refs', async () => {
      await setupSpec('spec-A');
      await setupSpec('spec-B', { blockedBy: ['spec-A'] });
      await setupSpec('spec-C', { blockedBy: ['spec-A', 'spec-B'] });

      const success = await reader.deleteSpec(projectPath, 'spec-A');

      expect(success).toBe(true);

      // spec-A folder is gone
      const specAPath = join(projectPath, 'specwright', 'specs', 'spec-A');
      await expect(fs.access(specAPath)).rejects.toThrow();

      // spec-B blockedBy is cleared
      const specs = await reader.listSpecs(projectPath);
      const specB = specs.find(s => s.id === 'spec-B');
      expect(specB?.blockedBy).toBeUndefined();

      // spec-C retains spec-B but not spec-A
      const specC = specs.find(s => s.id === 'spec-C');
      expect(specC?.blockedBy).toEqual(['spec-B']);
    });

    it('returns true even when no other specs reference the deleted spec', async () => {
      await setupSpec('spec-A');
      await setupSpec('spec-B');

      const success = await reader.deleteSpec(projectPath, 'spec-A');
      expect(success).toBe(true);
    });
  });
});
