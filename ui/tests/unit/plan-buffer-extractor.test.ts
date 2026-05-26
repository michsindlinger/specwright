import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PlanBufferExtractor } from '../../src/server/utils/plan-buffer-extractor.js';

const extractor = new PlanBufferExtractor();

let tmpDir: string;
let planFile: string;
let secondPlanFile: string;
let emptyPlanFile: string;
const PLAN_CONTENT = '# Plan A\n\n## Context\nSome plan body.\n';
const SECOND_PLAN_CONTENT = '# Plan B\n\n## Context\nNewer plan.\n';

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'plan-buffer-test-'));
  const plansDir = join(tmpDir, '.claude', 'plans');
  // Create the .claude/plans directory structure matching the regex
  const fs = require('fs');
  fs.mkdirSync(plansDir, { recursive: true });
  planFile = join(plansDir, 'plan-a.md');
  secondPlanFile = join(plansDir, 'plan-b.md');
  emptyPlanFile = join(plansDir, 'empty.md');
  writeFileSync(planFile, PLAN_CONTENT, 'utf8');
  writeFileSync(secondPlanFile, SECOND_PLAN_CONTENT, 'utf8');
  writeFileSync(emptyPlanFile, '   \n  \n', 'utf8');
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
