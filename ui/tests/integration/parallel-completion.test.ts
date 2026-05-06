/**
 * Integration: parallel story-completion race prevention (BPAM v3.28.0).
 *
 * Verifies that `withMainProjectLock` + dual-lock in `commitMainKanbanIfDirty`
 * prevent git index.lock contention when concurrent story completions fire
 * against the same main repo (gitStrategy=worktree + maxConcurrent>1).
 *
 * Uses real git repositories — the race being guarded against is filesystem-level
 * git index.lock contention that cannot be reproduced with mocks alone.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { commitMainKanbanIfDirty } from '../../src/server/utils/worktree-story.js';
import { withMainProjectLock } from '../../src/server/utils/main-project-mutex.js';

const SPEC_ID = 'parallel-completion-spec';

interface Repo {
  base: string;
  projectPath: string;
  kanbanPath: string;
}

async function mkRepo(): Promise<Repo> {
  const base = await fs.mkdtemp(join(tmpdir(), 'parallel-completion-'));
  const projectPath = join(base, 'myproject');
  const specDir = join(projectPath, 'specwright', 'specs', SPEC_ID);
  await fs.mkdir(specDir, { recursive: true });

  execSync('git init -q -b main', { cwd: projectPath });
  execSync('git config user.email test@test.com', { cwd: projectPath });
  execSync('git config user.name test', { cwd: projectPath });
  await fs.writeFile(join(projectPath, 'README.md'), 'init');
  const kanbanPath = join(specDir, 'kanban.json');
  await fs.writeFile(kanbanPath, '{"version":"2.0","tasks":[]}');
  execSync('git add . && git commit -q -m init', { cwd: projectPath });

  return { base, projectPath, kanbanPath };
}

async function tearDown(repo: Repo): Promise<void> {
  await fs.rm(repo.base, { recursive: true, force: true });
}

// ============================================================================
// commitMainKanbanIfDirty: concurrent callers on same repo
// ============================================================================

describe('parallel-completion: commitMainKanbanIfDirty concurrent', () => {
  let repo: Repo;

  beforeEach(async () => { repo = await mkRepo(); });
  afterEach(async () => { await tearDown(repo); });

  it('two concurrent calls: both resolve, no index.lock error, exactly one commit', async () => {
    // Dirty the kanban
    await fs.writeFile(repo.kanbanPath, '{"version":"2.0","tasks":[{"id":"T1"}]}');

    const headBefore = execSync('git rev-parse HEAD', { cwd: repo.projectPath, encoding: 'utf-8' }).trim();

    // Fire both concurrently — without the mutex these would race on `git add`
    const [r1, r2] = await Promise.all([
      commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T1] sync-A'),
      commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T1] sync-B'),
    ]);

    // Mutex serializes: first commits, second finds nothing staged
    expect(r1 || r2).toBe(true);   // at least one committed
    expect(r1 && r2).toBe(false);  // not both (second sees clean index after first)

    const headAfter = execSync('git rev-parse HEAD', { cwd: repo.projectPath, encoding: 'utf-8' }).trim();
    expect(headAfter).not.toBe(headBefore);

    const commitCount = execSync('git rev-list --count HEAD', { cwd: repo.projectPath, encoding: 'utf-8' }).trim();
    expect(Number(commitCount)).toBe(2); // init + exactly one sync

    // Repo is clean — no dangling index or working tree changes
    const status = execSync('git status --porcelain', { cwd: repo.projectPath, encoding: 'utf-8' });
    expect(status.trim()).toBe('');
  });

  it('three concurrent calls: all resolve, exactly one commit produced', async () => {
    await fs.writeFile(repo.kanbanPath, '{"version":"2.0","tasks":[{"id":"T2"}]}');

    const results = await Promise.all([
      commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T2] A'),
      commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T2] B'),
      commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T2] C'),
    ]);

    expect(results).toHaveLength(3);
    expect(results.filter(Boolean)).toHaveLength(1); // exactly one committed
  });

  it('rejection inside withMainProjectLock does not block subsequent commitMainKanbanIfDirty', async () => {
    // Regression for the rejection-safe chain: a throwing lock holder must not
    // permanently poison the next waiter in the queue for the same project path.
    await fs.writeFile(repo.kanbanPath, '{"version":"2.0","tasks":[{"id":"T3"}]}');

    const order: string[] = [];

    const p1 = commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T3] first')
      .then(() => order.push('p1-done'));

    // Inject a failing operation on the same project path
    const p2 = withMainProjectLock(repo.projectPath, 'bad-op', async () => {
      order.push('p2-start');
      throw new Error('simulated failure');
    }).catch(() => order.push('p2-caught'));

    const p3 = commitMainKanbanIfDirty(repo.projectPath, SPEC_ID, 'chore: [T3] after-bad')
      .then(() => order.push('p3-done'));

    await Promise.all([p1, p2, p3]);

    expect(order).toContain('p1-done');
    expect(order).toContain('p2-caught');
    expect(order).toContain('p3-done'); // must not be starved by p2's rejection
  });
});

// ============================================================================
// withMainProjectLock + real git: two story completion flows
// ============================================================================

describe('parallel-completion: withMainProjectLock serializes concurrent git ops', () => {
  let repo: Repo;

  beforeEach(async () => { repo = await mkRepo(); });
  afterEach(async () => { await tearDown(repo); });

  it('two story completions each commit a different file — both land on main', async () => {
    // Simulates two concurrent onItemCompleted handlers each adding their own
    // file to the main repo. Without the mutex both `git add` + `git commit`
    // sequences could interleave, producing an index.lock error.
    const fileA = join(repo.projectPath, 'story-A.txt');
    const fileB = join(repo.projectPath, 'story-B.txt');
    await fs.writeFile(fileA, 'story A output');
    await fs.writeFile(fileB, 'story B output');

    const completionA = withMainProjectLock(repo.projectPath, 'story-A-completion', async () => {
      execSync('git add story-A.txt', { cwd: repo.projectPath });
      execSync('git commit -q -m "feat: story-A done"', { cwd: repo.projectPath });
    });

    const completionB = withMainProjectLock(repo.projectPath, 'story-B-completion', async () => {
      execSync('git add story-B.txt', { cwd: repo.projectPath });
      execSync('git commit -q -m "feat: story-B done"', { cwd: repo.projectPath });
    });

    await Promise.all([completionA, completionB]);

    const log = execSync('git log --oneline', { cwd: repo.projectPath, encoding: 'utf-8' });
    expect(log).toContain('story-A done');
    expect(log).toContain('story-B done');

    const commitCount = execSync('git rev-list --count HEAD', { cwd: repo.projectPath, encoding: 'utf-8' }).trim();
    expect(Number(commitCount)).toBe(3); // init + story-A + story-B
  });

  it('concurrent mergeStoryBranchIntoSpec: two story branches both land on spec branch', async () => {
    // Exercises the race surface from BPAM-004 (mergeStoryBranchIntoSpec wrapped in
    // withMainProjectLock). Uses inline git ops to avoid importing the full
    // WorkflowExecutor; the mutex serialization is what is being tested.
    const { projectPath } = repo;

    // Create spec branch
    execSync('git checkout -b feature/test-spec', { cwd: projectPath, stdio: 'pipe' });

    // Story A branch
    execSync('git checkout -b story/test-spec/T-001', { cwd: projectPath, stdio: 'pipe' });
    await fs.writeFile(join(projectPath, 'story-001.txt'), 'T-001 work');
    execSync('git add story-001.txt && git commit -q -m "feat: T-001"', { cwd: projectPath });

    // Story B branch (branched from spec, not from T-001)
    execSync('git checkout feature/test-spec', { cwd: projectPath, stdio: 'pipe' });
    execSync('git checkout -b story/test-spec/T-002', { cwd: projectPath, stdio: 'pipe' });
    await fs.writeFile(join(projectPath, 'story-002.txt'), 'T-002 work');
    execSync('git add story-002.txt && git commit -q -m "feat: T-002"', { cwd: projectPath });

    execSync('git checkout feature/test-spec', { cwd: projectPath, stdio: 'pipe' });

    // Fire both merges concurrently (serialized by mutex = no concurrent checkout/merge race)
    const mergeA = withMainProjectLock(projectPath, 'merge-T-001', async () => {
      execSync('git checkout feature/test-spec', { cwd: projectPath, stdio: 'pipe' });
      execSync('git merge --no-ff story/test-spec/T-001 -m "merge: T-001 into spec"', { cwd: projectPath, stdio: 'pipe' });
    });

    const mergeB = withMainProjectLock(projectPath, 'merge-T-002', async () => {
      execSync('git checkout feature/test-spec', { cwd: projectPath, stdio: 'pipe' });
      execSync('git merge --no-ff story/test-spec/T-002 -m "merge: T-002 into spec"', { cwd: projectPath, stdio: 'pipe' });
    });

    await Promise.all([mergeA, mergeB]);

    const log = execSync('git log --oneline feature/test-spec', { cwd: projectPath, encoding: 'utf-8' });
    expect(log).toContain('merge: T-001 into spec');
    expect(log).toContain('merge: T-002 into spec');
  });
});
