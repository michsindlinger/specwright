/**
 * INT-2026-007 FA-01: the session env drops inherited Claude Code markers and
 * forces transcript persistence (plan §3 A.3/A.12, review E11/G13).
 */
import { describe, it, expect } from 'vitest';
import { FORCE_PERSISTENCE_ENV, isStrippedSessionEnvKey, sanitizeSessionEnv } from '../../src/server/utils/session-env.js';

describe('sanitizeSessionEnv()', () => {
  const inherited = {
    PATH: '/usr/bin',
    HOME: '/home/me',
    CLAUDE_CODE_CHILD_SESSION: '1',
    CLAUDE_CODE_SESSION_ATTENDED: '1',
    CLAUDE_CODE_SESSION_ID: 'abc',
    CLAUDE_CODE_MESSAGING_SOCKET: '/tmp/x.sock',
    CLAUDE_CODE_MESSAGING_TOKEN: 'tok',
    CLAUDE_CODE_EXECPATH: '/bin/claude',
    CLAUDE_CODE_ENTRYPOINT: 'cli',
    CLAUDECODE: '1',
    CLAUDE_PID: '4711',
    SPECWRIGHT_CLOUD_SESSION_ID: 'cloud-1-1',
    CLAUDE_MODEL: 'opus',
    CLAUDE_PROVIDER: 'anthropic',
    CLAUDE_CONFIG_DIR: '/home/me/.claude-glm',
    CLAUDE_EFFORT: 'high',
    ANTHROPIC_BASE_URL: 'https://proxy',
    GITHUB_TOKEN: 'ghp',
    UNDEF: undefined,
  };

  it('drops every CLAUDE_CODE_* marker, CLAUDECODE, CLAUDE_PID and the inherited hook session id', () => {
    const out = sanitizeSessionEnv(inherited);
    for (const k of Object.keys(out)) {
      expect(k === FORCE_PERSISTENCE_ENV || !k.startsWith('CLAUDE_CODE_')).toBe(true);
    }
    expect(out).not.toHaveProperty('CLAUDECODE');
    expect(out).not.toHaveProperty('CLAUDE_PID');
    expect(out).not.toHaveProperty('SPECWRIGHT_CLOUD_SESSION_ID');
    expect(out).not.toHaveProperty('UNDEF');
  });

  it('forces transcript persistence on', () => {
    expect(sanitizeSessionEnv(inherited)[FORCE_PERSISTENCE_ENV]).toBe('1');
    expect(sanitizeSessionEnv({})[FORCE_PERSISTENCE_ENV]).toBe('1');
    // an inherited "0" must not win
    expect(sanitizeSessionEnv({ [FORCE_PERSISTENCE_ENV]: '0' })[FORCE_PERSISTENCE_ENV]).toBe('1');
  });

  it('keeps provider and unrelated variables byte-identical', () => {
    const out = sanitizeSessionEnv(inherited);
    expect(out).toMatchObject({
      PATH: '/usr/bin',
      HOME: '/home/me',
      CLAUDE_MODEL: 'opus',
      CLAUDE_PROVIDER: 'anthropic',
      CLAUDE_CONFIG_DIR: '/home/me/.claude-glm',
      CLAUDE_EFFORT: 'high',
      ANTHROPIC_BASE_URL: 'https://proxy',
      GITHUB_TOKEN: 'ghp',
    });
  });

  it('prefix rule: an unknown future CLAUDE_CODE_X marker is removed too (E11)', () => {
    expect(sanitizeSessionEnv({ CLAUDE_CODE_SOMETHING_NEW: 'x' })).not.toHaveProperty('CLAUDE_CODE_SOMETHING_NEW');
    expect(isStrippedSessionEnvKey('CLAUDE_CODE_SOMETHING_NEW')).toBe(true);
    expect(isStrippedSessionEnvKey(FORCE_PERSISTENCE_ENV)).toBe(false);
    expect(isStrippedSessionEnvKey('CLAUDE_MODEL')).toBe(false);
  });

  it('does not mutate its input', () => {
    const input = { CLAUDECODE: '1', PATH: '/x' };
    sanitizeSessionEnv(input);
    expect(input).toEqual({ CLAUDECODE: '1', PATH: '/x' });
  });
});
