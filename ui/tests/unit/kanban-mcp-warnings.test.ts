/**
 * Unit tests for V2 Lean kanban_create description-cap soft-warnings (v3.12).
 *
 * Verifies that validateTaskDescriptions returns the right warnings for various
 * description lengths. The MCP server attaches these warnings to its response
 * when non-empty (length-only check, no multi-sentence regex).
 */

import { describe, it, expect } from 'vitest';
import {
  validateTaskDescriptions,
  DESCRIPTION_MAX_CHARS
} from '../../../specwright/scripts/mcp/kanban-validation.js';

function makeTask(id: string, descChars: number) {
  return { id, description: 'x'.repeat(descChars) };
}

describe('validateTaskDescriptions (v3.12)', () => {
  it('returns empty array when all descriptions ≤150 chars', () => {
    const warnings = validateTaskDescriptions([
      makeTask('TEST-001', 50),
      makeTask('TEST-002', 100),
      makeTask('TEST-003', 150)
    ]);
    expect(warnings).toEqual([]);
  });

  it('warns when single description = 151 chars', () => {
    const warnings = validateTaskDescriptions([makeTask('TEST-001', 151)]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('TEST-001');
    expect(warnings[0]).toContain('151 chars');
    expect(warnings[0]).toContain('V2 Lean');
  });

  it('warns for very long descriptions (500 chars)', () => {
    const warnings = validateTaskDescriptions([makeTask('TEST-001', 500)]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('500 chars');
  });

  it('warns only for violators in mixed compliant/violating tasks', () => {
    const warnings = validateTaskDescriptions([
      makeTask('TEST-001', 50),
      makeTask('TEST-002', 200),
      makeTask('TEST-003', 100),
      makeTask('TEST-004', 300)
    ]);
    expect(warnings).toHaveLength(2);
    const allWarnings = warnings.join('\n');
    expect(allWarnings).toContain('TEST-002');
    expect(allWarnings).toContain('TEST-004');
    expect(allWarnings).not.toContain('TEST-001');
    expect(allWarnings).not.toContain('TEST-003');
  });

  it('returns empty array for empty tasks list', () => {
    expect(validateTaskDescriptions([])).toEqual([]);
  });

  it('exact 150 chars boundary: no warning', () => {
    expect(validateTaskDescriptions([makeTask('TEST-001', 150)])).toEqual([]);
  });

  it('exposes DESCRIPTION_MAX_CHARS constant = 150', () => {
    expect(DESCRIPTION_MAX_CHARS).toBe(150);
  });

  it('honors custom maxChars parameter', () => {
    const warnings = validateTaskDescriptions([makeTask('TEST-001', 100)], 50);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('>50');
  });
});
