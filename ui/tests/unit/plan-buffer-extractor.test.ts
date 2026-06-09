import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PlanBufferExtractor } from '../../src/server/utils/plan-buffer-extractor.js';

const extractor = new PlanBufferExtractor();

let tmpDir: string;
let plansDir: string;
let planFile: string;
let secondPlanFile: string;
let emptyPlanFile: string;
// Realistic slugs for subsequence-recovery tests (see "subsequence recovery").
let breezyFile: string;
let optimierungFile: string;
const PLAN_CONTENT = '# Plan A\n\n## Context\nSome plan body.\n';
const SECOND_PLAN_CONTENT = '# Plan B\n\n## Context\nNewer plan.\n';
const BREEZY_CONTENT = '# DB Indizes\n\n## Context\nPhase 1 plan.\n';
const OPTIMIERUNG_CONTENT = '# Cloud Terminal\n\n## Context\nModular refactor.\n';

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'plan-buffer-test-'));
  plansDir = join(tmpDir, '.claude', 'plans');
  // Create the .claude/plans directory structure matching the regex
  const fs = require('fs');
  fs.mkdirSync(plansDir, { recursive: true });
  planFile = join(plansDir, 'plan-a.md');
  secondPlanFile = join(plansDir, 'plan-b.md');
  emptyPlanFile = join(plansDir, 'empty.md');
  writeFileSync(planFile, PLAN_CONTENT, 'utf8');
  writeFileSync(secondPlanFile, SECOND_PLAN_CONTENT, 'utf8');
  writeFileSync(emptyPlanFile, '   \n  \n', 'utf8');

  // Real files whose parsed names lose characters to TUI redraw scraping.
  breezyFile = join(plansDir, 'plane-phase-1-db-indizes-breezy-storm.md');
  optimierungFile = join(plansDir, 'optimierung-cloud-terminal-soll-modular-manatee.md');
  writeFileSync(breezyFile, BREEZY_CONTENT, 'utf8');
  writeFileSync(optimierungFile, OPTIMIERUNG_CONTENT, 'utf8');

  // Ambiguity fixture: two files both supersequences of "alpha-brav-charlie.md".
  writeFileSync(join(plansDir, 'alpha-bravo-charlie.md'), '# A\n\nbody\n', 'utf8');
  writeFileSync(join(plansDir, 'alpha-bravo-charlie-x.md'), '# A\n\nbody\n', 'utf8');

  // Non-ENOENT fixture: a *directory* named like a plan file -> readFileSync EISDIR.
  fs.mkdirSync(join(plansDir, 'isadir.md'), { recursive: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('PlanBufferExtractor.extract (strict file-path mode)', () => {
  it('returns planText + planPath when an absolute plan-file path is present', () => {
    const buffer = [
      'Some Claude Code output',
      '╭───────────────────────────╮',
      '│ Plan box content here     │',
      `╰────────── ctrl-g · ${planFile} ──╯`,
    ].join('\n');

    const result = extractor.extract(buffer);
    expect(result).not.toBeNull();
    expect(result?.planPath).toBe(planFile);
    expect(result?.planText).toBe(PLAN_CONTENT);
  });

  it('returns null when buffer has no plan-file path', () => {
    const buffer = [
      'Some terminal output without any plan reference',
      '╭───────────────────────────╮',
      '│ Just a TUI box, no path   │',
      '╰───────────────────────────╯',
    ].join('\n');

    expect(extractor.extract(buffer)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(extractor.extract('')).toBeNull();
  });

  it('returns null when buffer contains only whitespace', () => {
    expect(extractor.extract('   \n\t  \n  ')).toBeNull();
  });

  it('returns null when the referenced plan file does not exist', () => {
    const missing = join(tmpDir, '.claude', 'plans', 'does-not-exist.md');
    const buffer = `ctrl-g to edit · ${missing}`;
    expect(extractor.extract(buffer)).toBeNull();
  });

  it('returns null when the referenced plan file is empty', () => {
    const buffer = `ctrl-g · ${emptyPlanFile}`;
    expect(extractor.extract(buffer)).toBeNull();
  });

  it('uses the LAST plan-file path when multiple are present', () => {
    const buffer = [
      `older reference ${planFile}`,
      'some intervening output',
      `newer reference ${secondPlanFile}`,
    ].join('\n');

    const result = extractor.extract(buffer);
    expect(result?.planPath).toBe(secondPlanFile);
    expect(result?.planText).toBe(SECOND_PLAN_CONTENT);
  });

  it('strips ANSI CSI sequences before scanning for path', () => {
    const buffer = `\x1b[32mctrl-g · \x1b[1m${planFile}\x1b[0m`;
    const result = extractor.extract(buffer);
    expect(result?.planPath).toBe(planFile);
  });

  it('strips OSC sequences before scanning for path', () => {
    const buffer = `\x1b]0;Terminal Title\x07ctrl-g · ${planFile}`;
    const result = extractor.extract(buffer);
    expect(result?.planPath).toBe(planFile);
  });

  it('strips carriage returns', () => {
    const buffer = `ctrl-g\r\n${planFile}\r\n`;
    const result = extractor.extract(buffer);
    expect(result?.planPath).toBe(planFile);
  });

  it('skips non-absolute relative paths (no tilde, no leading slash)', () => {
    // Regex requires (~/|/) prefix, so "relative/.claude/plans/x.md" would not match
    const buffer = 'relative/.claude/plans/relative-plan.md';
    expect(extractor.extract(buffer)).toBeNull();
  });
});

describe('PlanBufferExtractor.extract (subsequence recovery on dropped chars)', () => {
  it('recovers the real file when the parsed name drops one character', () => {
    // "plae-..." is a subsequence of the real "plane-..." (missing 'n').
    const corrupted = join(plansDir, 'plae-phase-1-db-indizes-breezy-storm.md');
    const buffer = `ctrl-g to edit in Vim · ${corrupted}`;

    const result = extractor.extract(buffer);
    expect(result?.planPath).toBe(breezyFile);
    expect(result?.planText).toBe(BREEZY_CONTENT);
  });

  it('recovers a second real-world dropped-char case', () => {
    // "ptimieng-..." is a subsequence of "optimierung-..." (missing o,r,u,...).
    const corrupted = join(plansDir, 'ptimieng-cloud-terminal-soll-modular-manatee.md');
    const buffer = `ctrl-g · ${corrupted}`;

    const result = extractor.extract(buffer);
    expect(result?.planPath).toBe(optimierungFile);
    expect(result?.planText).toBe(OPTIMIERUNG_CONTENT);
  });

  it('returns null on ambiguous match (subsequence of >1 file)', () => {
    // "alpha-brav-charlie.md" is a subsequence of BOTH alpha-bravo-charlie.md
    // and alpha-bravo-charlie-x.md -> fail closed.
    const corrupted = join(plansDir, 'alpha-brav-charlie.md');
    const buffer = `ctrl-g · ${corrupted}`;
    expect(extractor.extract(buffer)).toBeNull();
  });

  it('does not recover on a non-ENOENT error (EISDIR)', () => {
    // "isadir.md" exists as a directory -> readFileSync throws EISDIR, not ENOENT.
    // Recovery must not run and must not match any sibling file.
    const buffer = `ctrl-g · ${join(plansDir, 'isadir.md')}`;
    expect(extractor.extract(buffer)).toBeNull();
  });

  it('does not recover when the parsed name is shorter than the length guard', () => {
    // "abc.md" (< 8 chars) must not be guessed even if a long file could match.
    const buffer = `ctrl-g · ${join(plansDir, 'abc.md')}`;
    expect(extractor.extract(buffer)).toBeNull();
  });

  it('does not recover when the parsed name is too short relative to the file (ratio guard)', () => {
    // "plane-phase-1-db.md" is a subsequence of the breezy file but only ~50%
    // of its length -> rejected by the 0.8 ratio guard.
    const buffer = `ctrl-g · ${join(plansDir, 'plane-phase-1-db.md')}`;
    expect(extractor.extract(buffer)).toBeNull();
  });

  it('returns null when the parsed name is a subsequence of no file (zero match)', () => {
    // Passes both guards (long, no shorter candidate) but matches nothing -> null.
    const buffer = `ctrl-g · ${join(plansDir, 'zzz-nonexistent-unique-plan-slug.md')}`;
    expect(extractor.extract(buffer)).toBeNull();
  });
});
