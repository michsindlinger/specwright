import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';
import { buildProviderEnv, expandTilde } from '../../src/server/utils/provider-env.js';

const ANTHROPIC_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CONFIG_DIR',
] as const;

describe('buildProviderEnv', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ANTHROPIC_KEYS) saved[k] = process.env[k];
    process.env.ANTHROPIC_API_KEY = 'k';
    process.env.ANTHROPIC_AUTH_TOKEN = 't';
    process.env.ANTHROPIC_BASE_URL = 'u';
    delete process.env.CLAUDE_CONFIG_DIR;
  });

  afterEach(() => {
    for (const k of ANTHROPIC_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('strips ANTHROPIC_* env for any provider (stale key must not shadow OAuth)', () => {
    const env = buildProviderEnv('glm');
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
  });

  it('anthropic ⇒ no CLAUDE_CONFIG_DIR override (uses default ~/.claude OAuth)', () => {
    const env = buildProviderEnv('anthropic');
    expect(env.CLAUDE_CONFIG_DIR).toBeUndefined();
  });

  it('non-anthropic ⇒ CLAUDE_CONFIG_DIR scoped to ~/.claude-<id>', () => {
    expect(buildProviderEnv('deepseek').CLAUDE_CONFIG_DIR).toBe(
      join(homedir(), '.claude-deepseek')
    );
    expect(buildProviderEnv('glm').CLAUDE_CONFIG_DIR).toBe(join(homedir(), '.claude-glm'));
  });
});

describe('expandTilde', () => {
  it('expands a leading ~', () => {
    expect(expandTilde('~/.claude-x')).toBe(join(homedir(), '.claude-x'));
  });

  it('leaves absolute paths unchanged', () => {
    expect(expandTilde('/abs/path')).toBe('/abs/path');
  });
});
