import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SpecsReader } from '../../src/server/specs-reader.js';

describe('SpecsReader.listAllSpecs()', () => {
  let reader: SpecsReader;
  let tmpDir: string;
  let projectA: string;
  let projectB: string;

  beforeEach(async () => {
    reader = new SpecsReader();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'specs-test-'));
    projectA = join(tmpDir, 'project-a');
    projectB = join(tmpDir, 'project-b');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function createSpecWithKanban(
    projectPath: string,
    specId: string,
    kanbanData: Record<string, unknown>
  ): Promise<void> {
    const specPath = join(projectPath, 'agent-os', 'specs', specId);
    await fs.mkdir(join(specPath, 'stories'), { recursive: true });
    await fs.writeFile(
      join(specPath, 'kanban.json'),
      JSON.stringify(kanbanData, null, 2),
      'utf-8'
    );
  }

  function makeKanban(specId: string, name: string, done: number, total: number) {
    return {
      version: '1.0',
      spec: { id: specId, name, prefix: 'TEST', specFile: 'spec.md', createdAt: '2026-01-01T00:00:00Z' },
      resumeContext: {
        currentPhase: '2-complete', nextPhase: '3-execute-story',
        worktreePath: null, gitBranch: 'feature/test', gitStrategy: 'branch',
        currentStory: null, currentStoryPhase: null,
        lastAction: null, nextAction: null, progressIndex: done, totalStories: total
      },
      execution: { status: 'not_started', startedAt: null, completedAt: null, model: null },
      stories: [],
      boardStatus: { total, ready: total - done, inProgress: 0, done, blocked: 0 },
      changeLog: []
    };
  }

  it('should return specs grouped by project', async () => {
    await createSpecWithKanban(projectA, '2026-01-01-feature-a', makeKanban('2026-01-01-feature-a', 'Feature A', 1, 3));
    await createSpecWithKanban(projectB, '2026-01-02-feature-b', makeKanban('2026-01-02-feature-b', 'Feature B', 0, 5));

    const result = await reader.listAllSpecs([
      { path: projectA, name: 'Project A' },
      { path: projectB, name: 'Project B' }
    ]);

    expect(result).toHaveLength(2);

    // Project A
    expect(result[0].projectPath).toBe(projectA);
    expect(result[0].projectName).toBe('Project A');
    expect(result[0].specs).toHaveLength(1);
    expect(result[0].specs[0].id).toBe('2026-01-01-feature-a');
    expect(result[0].specs[0].projectPath).toBe(projectA);
    expect(result[0].specs[0].projectName).toBe('Project A');

    // Project B
    expect(result[1].projectPath).toBe(projectB);
    expect(result[1].projectName).toBe('Project B');
    expect(result[1].specs).toHaveLength(1);
    expect(result[1].specs[0].id).toBe('2026-01-02-feature-b');
    expect(result[1].specs[0].projectPath).toBe(projectB);
    expect(result[1].specs[0].projectName).toBe('Project B');
  });

  it('should return empty specs for a project without specs directory', async () => {
    await fs.mkdir(projectA, { recursive: true });

    const result = await reader.listAllSpecs([
      { path: projectA, name: 'Empty Project' }
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].projectPath).toBe(projectA);
    expect(result[0].projectName).toBe('Empty Project');
    expect(result[0].specs).toHaveLength(0);
  });

  it('should include projectPath and projectName on each SpecInfo', async () => {
    await createSpecWithKanban(projectA, '2026-02-01-spec-x', makeKanban('2026-02-01-spec-x', 'Spec X', 2, 4));
    await createSpecWithKanban(projectA, '2026-02-02-spec-y', makeKanban('2026-02-02-spec-y', 'Spec Y', 0, 2));

    const result = await reader.listAllSpecs([
      { path: projectA, name: 'Multi Spec Project' }
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].specs).toHaveLength(2);
    for (const spec of result[0].specs) {
      expect(spec.projectPath).toBe(projectA);
      expect(spec.projectName).toBe('Multi Spec Project');
    }
  });

  it('should handle multiple projects including one without specs', async () => {
    await createSpecWithKanban(projectA, '2026-01-01-only-spec', makeKanban('2026-01-01-only-spec', 'Only Spec', 0, 1));
    await fs.mkdir(projectB, { recursive: true });

    const result = await reader.listAllSpecs([
      { path: projectA, name: 'Has Specs' },
      { path: projectB, name: 'No Specs' }
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].specs).toHaveLength(1);
    expect(result[1].specs).toHaveLength(0);
  });
});
