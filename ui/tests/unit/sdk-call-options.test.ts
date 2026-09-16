import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';
import { buildSdkCallOptions } from '../../src/server/utils/sdk-call-options.js';

const ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CONFIG_DIR',
] as const;

describe('buildSdkCallOptions', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    process.env.ANTHROPIC_API_KEY = 'k';
    delete process.env.CLAUDE_CONFIG_DIR;
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('sets strictMcpConfig: true and passes no mcpServers key (INT-2026-006)', () => {
    const opts = buildSdkCallOptions('anthropic', ['Read']);
    expect(opts.strictMcpConfig).toBe(true);
    expect('mcpServers' in opts).toBe(false);
  });

  it('uses exactly the given tools for tools and allowedTools (copy, not reference)', () => {
    const tools = ['Read', 'Grep', 'Glob'];
    const opts = buildSdkCallOptions('anthropic', tools);
    expect(opts.tools).toEqual(['Read', 'Grep', 'Glob']);
    expect(opts.allowedTools).toEqual(['Read', 'Grep', 'Glob']);
    expect(opts.tools).not.toBe(tools);
    expect(opts.allowedTools).not.toBe(tools);
    expect(opts.tools).not.toBe(opts.allowedTools);
  });

  it('empty tool list ⇒ tools: [] and allowedTools: [] (aggregator has no tools)', () => {
    const opts = buildSdkCallOptions('anthropic', []);
    expect(opts.tools).toEqual([]);
    expect(opts.allowedTools).toEqual([]);
  });

  it('keeps settingSources ["user"] (third-party env block lives in ~/.claude-<id>/settings.json)', () => {
    expect(buildSdkCallOptions('glm', []).settingSources).toEqual(['user']);
  });

  it('bypasses permissions only together with the given (read-only) tool list (RB-01)', () => {
    const opts = buildSdkCallOptions('anthropic', ['Read', 'Grep', 'Glob']);
    expect(opts.permissionMode).toBe('bypassPermissions');
    expect(opts.allowDangerouslySkipPermissions).toBe(true);
    expect(opts.allowedTools).toEqual(['Read', 'Grep', 'Glob']);
  });

  it('anthropic ⇒ env without CLAUDE_CONFIG_DIR and without ANTHROPIC_API_KEY', () => {
    const env = buildSdkCallOptions('anthropic', []).env;
    expect(env).toBeDefined();
    expect(env?.CLAUDE_CONFIG_DIR).toBeUndefined();
    expect(env?.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('glm ⇒ env with CLAUDE_CONFIG_DIR = ~/.claude-glm', () => {
    const env = buildSdkCallOptions('glm', []).env;
    expect(env?.CLAUDE_CONFIG_DIR).toBe(join(homedir(), '.claude-glm'));
  });
});
