/**
 * INT-2026-019 (AK-09): the pre-check before `claude --resume` — the
 * transcript is looked up by id across the candidate Claude homes without
 * being read; a non-UUID id is refused before any disk access.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { CLAUDE_SESSION_ID_RE, claudeHomes, findTranscript, isClaudeSessionId } from '../../src/server/utils/claude-transcript.js';

const ID = 'a208d3a5-1da0-4f76-88fd-80493778110e';

describe('claude-transcript (INT-2026-019)', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'claude-transcript-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('claudeHomes: ~/.claude always first; CLAUDE_CONFIG_DIR and ~/.claude-<provider> follow, deduplicated', () => {
    const home = '/Users/x';
    expect(claudeHomes('anthropic', {}, home)).toEqual(['/Users/x/.claude']);
    expect(claudeHomes(undefined, {}, home)).toEqual(['/Users/x/.claude']);
    expect(claudeHomes('codex', {}, home)).toEqual(['/Users/x/.claude', '/Users/x/.claude-codex']);
    expect(claudeHomes('anthropic', { CLAUDE_CONFIG_DIR: '/tmp/cfg' }, home)).toEqual(['/Users/x/.claude', '/tmp/cfg']);
    expect(claudeHomes('codex', { CLAUDE_CONFIG_DIR: '/Users/x/.claude-codex' }, home)).toEqual(['/Users/x/.claude', '/Users/x/.claude-codex']);
    expect(claudeHomes('anthropic', { CLAUDE_CONFIG_DIR: '/Users/x/.claude' }, home)).toEqual(['/Users/x/.claude']);
  });

  it('finds projects/*/<id>.jsonl in the first home that has it and reports its mtime', () => {
    const h1 = join(root, 'h1');
    const h2 = join(root, 'h2');
    mkdirSync(join(h1, 'projects', 'a'), { recursive: true });
    mkdirSync(join(h1, 'projects', 'b'), { recursive: true });
    mkdirSync(join(h2, 'projects', 'c'), { recursive: true });
    const p = join(h2, 'projects', 'c', `${ID}.jsonl`);
    writeFileSync(p, '{}\n');
    const stand = new Date('2026-09-18T05:42:00Z');
    utimesSync(p, stand, stand);
    expect(findTranscript([h1, h2], ID)).toEqual({ path: p, mtimeMs: stand.getTime() });
    // Upper-case ids hit the same file (the file name is lower-case).
    expect(findTranscript([h1, h2], ID.toUpperCase())?.path).toBe(p);
    // A home without a projects dir is skipped, not an error.
    expect(findTranscript([join(root, 'nope'), h2], ID)?.path).toBe(p);
    expect(findTranscript([h1], ID)).toBeUndefined();
    expect(findTranscript([h1, h2], '11111111-2222-4333-8444-555555555555')).toBeUndefined();
  });

  it('refuses a non-UUID id even when a file sits at the traversal target (security.md §6)', () => {
    const h1 = join(root, 'h1');
    mkdirSync(join(h1, 'projects', 'a'), { recursive: true });
    // `../x` as id would resolve to projects/x.jsonl — the file exists, the guard still says no.
    writeFileSync(join(h1, 'projects', 'x.jsonl'), '{}\n');
    writeFileSync(join(h1, 'projects', 'a', `${ID}.jsonl`), '{}\n');
    for (const bad of ['../x', '--dangerously-skip-permissions', 'a208d3a5', '', `${ID}/../x`, `${ID}.jsonl`]) {
      expect(isClaudeSessionId(bad)).toBe(false);
      expect(findTranscript([h1], bad)).toBeUndefined();
    }
    expect(findTranscript([h1], ID)).toBeDefined();
    expect(isClaudeSessionId(ID)).toBe(true);
    expect(CLAUDE_SESSION_ID_RE.test(ID.toUpperCase())).toBe(true);
    expect(isClaudeSessionId(42)).toBe(false);
  });
});
