/**
 * INT-2026-012 (AK-01, AK-07, E1): the one rule for the session kind of a
 * provider — basename of the CLI command starts with `claude`.
 */
import { describe, it, expect } from 'vitest';
import { isClaudeCli, providerCliKind } from '../../src/shared/provider-cli.js';

describe('provider-cli (INT-2026-012)', () => {
  it('claude and claude-* wrappers are Claude CLIs', () => {
    expect(providerCliKind('claude')).toBe('claude');
    expect(providerCliKind('claude-codex')).toBe('claude');
    expect(providerCliKind('claude-glm')).toBe('claude');
    expect(isClaudeCli('claude-grok')).toBe(true);
  });

  it('codex and other commands are foreign', () => {
    expect(providerCliKind('codex')).toBe('foreign');
    expect(isClaudeCli('codex')).toBe(false);
    expect(providerCliKind('aider')).toBe('foreign');
    expect(providerCliKind('')).toBe('foreign');
  });

  it('uses the basename for absolute POSIX paths', () => {
    expect(providerCliKind('/home/me/bin/claude-glm')).toBe('claude');
    expect(providerCliKind('/usr/local/bin/codex')).toBe('foreign');
  });

  it('uses the basename for Windows paths (E1)', () => {
    expect(providerCliKind('C:\\tools\\claude-glm.cmd')).toBe('claude');
    expect(providerCliKind('C:\\tools\\codex.exe')).toBe('foreign');
  });

  it('ignores surrounding whitespace but not a foreign prefix', () => {
    expect(providerCliKind('  claude  ')).toBe('claude');
    expect(providerCliKind('my-claude')).toBe('foreign');
  });
});
