/**
 * Unit tests for TerminalManager.resize() hardening.
 *
 * Regression: bad dimensions (0 / negative / NaN / Infinity) used to reach node-pty, which throws
 * ("resizing must be done using positive cols and rows"). That throw was surfaced to the UI as a
 * SESSION_NOT_FOUND and tore down a live session. resize() now clamps before pty.resize(), so it
 * never throws on a live session — only a genuinely missing session throws.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalManager } from '../../src/server/services/terminal-manager.js';

describe('TerminalManager.resize()', () => {
  let terminalManager: TerminalManager;
  const execId = 'resize-test-1';

  beforeEach(() => {
    terminalManager = new TerminalManager();
    terminalManager.spawn({ executionId: execId, cwd: process.cwd(), shell: 'bash' });
  });

  afterEach(() => {
    terminalManager.shutdown();
  });

  it('applies a valid resize without throwing', () => {
    expect(() => terminalManager.resize({ executionId: execId, cols: 100, rows: 30 })).not.toThrow();
  });

  it('does not throw on a below-MIN grid (clamped)', () => {
    expect(() => terminalManager.resize({ executionId: execId, cols: 2, rows: 2 })).not.toThrow();
  });

  it.each([
    ['zero', 0, 0],
    ['negative', -5, -5],
    ['NaN', NaN, NaN],
    ['Infinity', Infinity, Infinity],
  ])('does not throw on %s dimensions (previously node-pty threw)', (_label, cols, rows) => {
    expect(() => terminalManager.resize({ executionId: execId, cols, rows })).not.toThrow();
  });

  it('throws for an unknown session (genuine not-found)', () => {
    expect(() => terminalManager.resize({ executionId: 'does-not-exist', cols: 80, rows: 24 }))
      .toThrowError(/Terminal session not found/);
  });
});
