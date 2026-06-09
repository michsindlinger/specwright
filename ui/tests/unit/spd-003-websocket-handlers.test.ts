/**
 * SPD-003: Integration tests for the specs.setPriority / specs.setBlockedBy handler logic.
 *
 * Tests the complete handler flow:
 * - setSpecPriority → persists + listSpecs reflects updated priority
 * - setSpecBlockedBy → cycle pre-check (reject on cycle) + persists + listSpecs reflects updated state
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SpecsReader } from '../../src/server/specs-reader.js';
import { wouldCreateCycle, type GraphSpec } from '../../src/server/utils/spec-graph.js';

const SPEC_A = '2026-01-01-spec-a';
const SPEC_B = '2026-01-02-spec-b';
const SPEC_C = '2026-01-03-spec-c';

async function writeV2Kanban(specPath: string, specId: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const base = {
    version: '2.0',
    mode: 'lean',
    spec: {
      id: specId,
      name: `Test ${specId}`,
      prefix: 'TEST',
      specFile: 'spec.md',
      specLiteFile: 'spec-lite.md',
      createdAt: '2026-01-01T00:00:00.000Z',
      implementationPlan: 'implementation-plan.md',
      ...((overrides.specFields as Record<string, unknown>) ?? {})
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
    changeLog: []
  };
  await fs.writeFile(join(specPath, 'kanban.json'), JSON.stringify(base, null, 2));
}

describe('SPD-003: setPriority / setBlockedBy handler logic', () => {
  let reader: SpecsReader;
  let tmpDir: string;
  let projectPath: string;

  beforeEach(async () => {
    reader = new SpecsReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'spd-003-test-'));
    projectPath = join(tmpDir, 'project');

    for (const id of [SPEC_A, SPEC_B, SPEC_C]) {
      const specPath = join(projectPath, 'specwright', 'specs', id);
      await fs.mkdir(specPath, { recursive: true });
      await writeV2Kanban(specPath, id);
    }
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ─── setPriority ─────────────────────────────────────────────────────────────

  it('setPriority: persists P0 and listSpecs reflects it', async () => {
    const result = await reader.setSpecPriority(projectPath, SPEC_A, 'P0');
    expect(result.error).toBeUndefined();
    expect(result.priority).toBe('P0');

    const specs = await reader.listSpecs(projectPath);
    const a = specs.find(s => s.id === SPEC_A);
    expect(a?.priority).toBe('P0');
  });

  it('setPriority: clears priority when null passed', async () => {
    await reader.setSpecPriority(projectPath, SPEC_A, 'P1');
    const result = await reader.setSpecPriority(projectPath, SPEC_A, null);
    expect(result.error).toBeUndefined();

    const specs = await reader.listSpecs(projectPath);
    const a = specs.find(s => s.id === SPEC_A);
    expect(a?.priority).toBeUndefined();
  });

  it('setPriority: rejects invalid priority value', async () => {
    const result = await reader.setSpecPriority(projectPath, SPEC_A, 'P9');
    expect(result.error).toBeTruthy();
  });

  // ─── setBlockedBy ─────────────────────────────────────────────────────────────

  it('setBlockedBy: persists dependency and listSpecs reflects dependencyStatus', async () => {
    // B depends on A (A must be done before B)
    const result = await reader.setSpecBlockedBy(projectPath, SPEC_B, [SPEC_A]);
    expect(result.error).toBeUndefined();
    expect(result.blockedBy).toEqual([SPEC_A]);

    const specs = await reader.listSpecs(projectPath);
    const b = specs.find(s => s.id === SPEC_B);
    expect(b?.blockedBy).toEqual([SPEC_A]);
    expect(b?.dependencyStatus).toBe('blocked');
  });

  it('setBlockedBy: clears dependencies when empty array passed', async () => {
    await reader.setSpecBlockedBy(projectPath, SPEC_B, [SPEC_A]);
    const result = await reader.setSpecBlockedBy(projectPath, SPEC_B, []);
    expect(result.error).toBeUndefined();

    const specs = await reader.listSpecs(projectPath);
    const b = specs.find(s => s.id === SPEC_B);
    expect(b?.blockedBy).toBeUndefined();
    expect(b?.dependencyStatus).toBe('ready');
  });

  // ─── cycle pre-check (handler logic) ──────────────────────────────────────────

  it('cycle check: self-loop rejected', async () => {
    const allSpecs = await reader.listSpecs(projectPath);
    const graphSpecs: GraphSpec[] = allSpecs.map(s => ({
      id: s.id,
      blockedBy: s.blockedBy,
      priority: s.priority,
      createdDate: s.createdDate,
      isDone: s.storyCount > 0 && s.completedCount >= s.storyCount
    }));

    expect(wouldCreateCycle(graphSpecs, SPEC_A, SPEC_A)).toBe(true);
  });

  it('cycle check: A→B→C chain allows C→A (no cycle yet)', async () => {
    await reader.setSpecBlockedBy(projectPath, SPEC_B, [SPEC_A]);
    await reader.setSpecBlockedBy(projectPath, SPEC_C, [SPEC_B]);

    const allSpecs = await reader.listSpecs(projectPath);
    const graphSpecs: GraphSpec[] = allSpecs.map(s => ({
      id: s.id,
      blockedBy: s.blockedBy,
      priority: s.priority,
      createdDate: s.createdDate,
      isDone: s.storyCount > 0 && s.completedCount >= s.storyCount
    }));

    // Adding A.blockedBy = [C] would close the cycle A←B←C←A
    expect(wouldCreateCycle(graphSpecs, SPEC_A, SPEC_C)).toBe(true);
  });

  it('cycle check: no cycle for independent specs', async () => {
    const allSpecs = await reader.listSpecs(projectPath);
    const graphSpecs: GraphSpec[] = allSpecs.map(s => ({
      id: s.id,
      blockedBy: s.blockedBy,
      priority: s.priority,
      createdDate: s.createdDate,
      isDone: s.storyCount > 0 && s.completedCount >= s.storyCount
    }));

    // Fresh graph: no edges — adding B→A should be fine
    expect(wouldCreateCycle(graphSpecs, SPEC_B, SPEC_A)).toBe(false);
  });

  it('full handler flow: setPriority then setBlockedBy then listSpecs', async () => {
    // Simulate what the WS handler does: mutate then re-list
    await reader.setSpecPriority(projectPath, SPEC_A, 'P0');
    await reader.setSpecPriority(projectPath, SPEC_B, 'P1');

    // B depends on A
    const preSpecs = await reader.listSpecs(projectPath);
    const graphSpecs: GraphSpec[] = preSpecs.map(s => ({
      id: s.id,
      blockedBy: s.blockedBy,
      priority: s.priority,
      createdDate: s.createdDate,
      isDone: s.storyCount > 0 && s.completedCount >= s.storyCount
    }));

    // No cycle — proceed
    expect(wouldCreateCycle(graphSpecs, SPEC_B, SPEC_A)).toBe(false);
    await reader.setSpecBlockedBy(projectPath, SPEC_B, [SPEC_A]);

    // Broadcast-equivalent: re-list after mutation
    const postSpecs = await reader.listSpecs(projectPath);
    const a = postSpecs.find(s => s.id === SPEC_A)!;
    const b = postSpecs.find(s => s.id === SPEC_B)!;

    expect(a.priority).toBe('P0');
    expect(a.dependencyStatus).toBe('ready');
    expect(a.orderIndex).toBe(1);

    expect(b.priority).toBe('P1');
    expect(b.dependencyStatus).toBe('blocked');
    expect(b.orderIndex).toBe(2);
  });
});
