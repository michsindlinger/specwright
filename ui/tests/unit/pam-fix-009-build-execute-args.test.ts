/**
 * PAM-FIX-009 (defense-in-depth): buildExecuteArgs must always return
 * a non-empty argument string.
 *
 * If buildExecuteArgs ever returned "" then the spawned `/execute-tasks`
 * call would land in entry-point auto-detection — which contains an
 * AskUserQuestion path that conflicts with --disallowed-tools and would
 * deadlock under Auto-Mode. Lock the contract here.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AutoModeSpecOrchestrator } from '../../src/server/services/auto-mode-spec-orchestrator.js';
import { AutoModeBacklogOrchestrator } from '../../src/server/services/auto-mode-backlog-orchestrator.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';
import type { ReadyItem } from '../../src/server/services/auto-mode-orchestrator-base.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(join(tmpdir(), 'pam-fix-009-args-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function getBuildExecuteArgs(o: { buildExecuteArgs: (item: ReadyItem) => string }): (item: ReadyItem) => string {
  return o.buildExecuteArgs.bind(o);
}

describe('AutoModeSpecOrchestrator.buildExecuteArgs', () => {
  it('returns a non-empty arg string containing both specId and itemId', () => {
    const cloudTerminalManager = {} as CloudTerminalManager;
    const o = new AutoModeSpecOrchestrator({
      projectPath: tmpDir,
      kanbanPath: tmpDir,
      watchFilename: 'kanban.json',
      maxConcurrent: 1,
      commandPrefix: 'specwright',
      cloudTerminalManager,
      specId: '2026-04-27-some-spec',
      mainProjectPath: tmpDir,
    });

    const args = getBuildExecuteArgs(o as unknown as { buildExecuteArgs: (item: ReadyItem) => string })(
      { id: 'TEST-001', title: 'Hello' }
    );

    expect(args.length).toBeGreaterThan(0);
    expect(args.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(1);
    expect(args).toContain('2026-04-27-some-spec');
    expect(args).toContain('TEST-001');
  });
});

describe('AutoModeBacklogOrchestrator.buildExecuteArgs', () => {
  it('returns a non-empty arg string starting with "backlog" and containing the item id', () => {
    const cloudTerminalManager = {} as CloudTerminalManager;
    const o = new AutoModeBacklogOrchestrator({
      projectPath: tmpDir,
      kanbanPath: tmpDir,
      watchFilename: 'backlog-index.json',
      maxConcurrent: 1,
      commandPrefix: 'specwright',
      cloudTerminalManager,
    });

    const args = getBuildExecuteArgs(o as unknown as { buildExecuteArgs: (item: ReadyItem) => string })(
      { id: 'BUG-042', title: 'Fix it' }
    );

    expect(args.length).toBeGreaterThan(0);
    expect(args.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
    expect(args).toMatch(/^backlog\s+/);
    expect(args).toContain('BUG-042');
  });
});
