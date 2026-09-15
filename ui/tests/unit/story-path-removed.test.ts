// @vitest-environment happy-dom
/**
 * EK-04 / FA-36 / FA-39 guard (INT-2026-004, stage 3): the story path is gone
 * from the Web-UI. Reads `ui/src` and `ui/frontend/src` recursively and
 * expects no trace of the old data (`kanban.json`), the old story workflow
 * (`execute-tasks`) or the old components. Control case: the Kanban-MCP
 * server under `specwright/scripts/mcp/` still owns kanban.json (NZ-02).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const UI = resolve(__dirname, '../..');
const REPO = resolve(UI, '..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      sourceFiles(p, out);
    } else if (/\.(ts|css|html)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function hits(files: string[], needle: RegExp): string[] {
  return files.filter((f) => needle.test(readFileSync(f, 'utf8'))).map((f) => f.slice(UI.length + 1));
}

const files = [...sourceFiles(join(UI, 'src')), ...sourceFiles(join(UI, 'frontend', 'src'))];

describe('story path removed from the UI (EK-04)', () => {
  it('no source under ui/src or ui/frontend/src mentions kanban.json', () => {
    expect(hits(files, /kanban\.json/)).toEqual([]);
  });

  it('no source mentions the story workflow execute-tasks', () => {
    expect(hits(files, /execute-tasks/)).toEqual([]);
  });

  it('the old components and views are gone (files and tag names)', () => {
    const gone = [
      'frontend/src/views/dashboard-view.ts',
      'frontend/src/components/kanban-board.ts',
      'frontend/src/components/story-card.ts',
      'frontend/src/components/queue/aos-global-queue-panel.ts',
      'src/server/specs-reader.ts',
      'src/server/backlog-reader.ts',
      'src/server/services/auto-mode-spec-orchestrator.ts',
    ];
    for (const rel of gone) expect(existsSync(join(UI, rel)), rel).toBe(false);
    expect(hits(files, /aos-kanban-board|aos-story-card|aos-mobile-story|aos-dashboard-view|aos-global-queue-panel/)).toEqual([]);
  });

  it('control case: the Kanban-MCP server still owns kanban.json (NZ-02)', () => {
    const mcp = sourceFiles(join(REPO, 'specwright', 'scripts', 'mcp'));
    expect(mcp.filter((f) => /kanban\.json/.test(readFileSync(f, 'utf8'))).length).toBeGreaterThan(0);
  });

  it('the removed elements are not registered in the browser (FA-36)', async () => {
    await import('../../frontend/src/views/aos-vorhaben-view.js');
    for (const tag of ['aos-kanban-board', 'aos-story-card', 'aos-dashboard-view', 'aos-mobile-story-list', 'aos-global-queue-panel']) {
      expect(customElements.get(tag), tag).toBeUndefined();
    }
    expect(customElements.get('aos-vorhaben-view')).toBeDefined();
  });
});
