import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, statSync, chmodSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  CLOUD_SESSION_ID_ENV,
  CLOUD_SESSION_ID_RE,
  HOOK_TOKEN_HEADER,
  ensureStopHookSettingsFile,
  loadOrCreateHookSecret,
  renderStopHookSettings,
  summarizePreview,
} from '../../src/server/services/claude-stop-hook.js';

const SECRET = 'ab'.repeat(32);

interface HookSettings {
  hooks: { Stop: Array<{ hooks: Array<{ type: string; command: string; timeout: number; async?: boolean }> }> };
}

describe('renderStopHookSettings()', () => {
  it('produces a synchronous Stop hook targeting this backend port', () => {
    const parsed = JSON.parse(renderStopHookSettings(3001, SECRET)) as HookSettings;
    const hook = parsed.hooks.Stop[0].hooks[0];
    expect(hook.type).toBe('command');
    expect(hook.timeout).toBe(5);
    expect(hook.async).toBeUndefined();
    expect(hook.command).toContain('http://127.0.0.1:3001/api/cloud-terminal/$SPECWRIGHT_CLOUD_SESSION_ID/agent-event');
    expect(hook.command).toContain(`${HOOK_TOKEN_HEADER}: ${SECRET}`);
    expect(hook.command).toContain('--data-binary @-');
    expect(hook.command).toMatch(/; exit 0$/);
  });

  it('rejects invalid ports and malformed secrets', () => {
    expect(() => renderStopHookSettings(0, SECRET)).toThrow();
    expect(() => renderStopHookSettings(70000, SECRET)).toThrow();
    expect(() => renderStopHookSettings(3001, 'short')).toThrow();
    expect(() => renderStopHookSettings(3001, `${SECRET}'; rm -rf /`)).toThrow();
  });
});

describe('the rendered hook command, run through a real sh', () => {
  let dir: string;
  let curlLog: string;

  const command = (): string =>
    (JSON.parse(renderStopHookSettings(4242, SECRET)) as HookSettings).hooks.Stop[0].hooks[0].command;

  const run = (env: Record<string, string>, stdin = ''): number => {
    try {
      execFileSync('/bin/sh', ['-c', command()], { env, input: stdin, stdio: ['pipe', 'ignore', 'ignore'] });
      return 0;
    } catch (err) {
      return (err as { status?: number }).status ?? -1;
    }
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'stop-hook-'));
    curlLog = join(dir, 'curl.log');
    // Stub curl: records argv and stdin, so the test sees exactly what the hook sends.
    const stub = join(dir, 'curl');
    writeFileSync(stub, `#!/bin/sh\nprintf '%s\\n' "$@" > '${curlLog}'\n/bin/cat >> '${curlLog}'\n`);
    chmodSync(stub, 0o755);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('POSTs stdin to the session URL with the token header', () => {
    const status = run({ PATH: dir, [CLOUD_SESSION_ID_ENV]: 'cloud-1-7' }, '{"hook_event_name":"Stop"}');
    expect(status).toBe(0);
    const log = readFileSync(curlLog, 'utf-8');
    expect(log).toContain('http://127.0.0.1:4242/api/cloud-terminal/cloud-1-7/agent-event');
    expect(log).toContain(`${HOOK_TOKEN_HEADER}: ${SECRET}`);
    expect(log).toContain('{"hook_event_name":"Stop"}');
  });

  it('exits 0 and calls nothing when the session env var is missing', () => {
    expect(run({ PATH: dir })).toBe(0);
    expect(existsSync(curlLog)).toBe(false);
  });

  it('exits 0 and calls nothing when curl is not installed', () => {
    // PATH without our stub (and without system curl).
    expect(run({ PATH: join(dir, 'nope'), [CLOUD_SESSION_ID_ENV]: 'cloud-1-7' })).toBe(0);
    expect(existsSync(curlLog)).toBe(false);
  });
});

describe('loadOrCreateHookSecret() / ensureStopHookSettingsFile()', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'stop-hook-files-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('creates a 64-hex secret once and returns the same value afterwards', () => {
    const p = join(dir, 'nested', 'hook-secret');
    const first = loadOrCreateHookSecret(p);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(loadOrCreateHookSecret(p)).toBe(first);
    expect(statSync(p).mode & 0o777).toBe(0o600);
  });

  it('replaces a corrupt secret file', () => {
    const p = join(dir, 'hook-secret');
    writeFileSync(p, 'garbage\n');
    expect(loadOrCreateHookSecret(p)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('writes the settings file 0600 and is idempotent', () => {
    const p = join(dir, 'claude-hooks-3001.json');
    expect(ensureStopHookSettingsFile(3001, SECRET, p)).toBe(p);
    ensureStopHookSettingsFile(3001, SECRET, p);
    expect(statSync(p).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(p, 'utf-8'))).toHaveProperty('hooks.Stop');
  });
});

describe('summarizePreview()', () => {
  it('returns undefined for non-strings and empty input', () => {
    expect(summarizePreview(undefined)).toBeUndefined();
    expect(summarizePreview(42)).toBeUndefined();
    expect(summarizePreview('   \n\t ')).toBeUndefined();
  });

  it('strips ANSI/OSC sequences and control chars, collapses whitespace', () => {
    const raw = '\x1b[32mDone\x1b[0m\n\n  with \x1b]0;title\x07 two\t\x00lines';
    expect(summarizePreview(raw)).toBe('Done with two lines');
  });

  it('truncates with an ellipsis at the cap', () => {
    const out = summarizePreview('x'.repeat(500), 20)!;
    expect(out.length).toBe(20);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('CLOUD_SESSION_ID_RE', () => {
  it('matches the manager id format and rejects anything else', () => {
    expect(CLOUD_SESSION_ID_RE.test('cloud-1757400000000-12')).toBe(true);
    expect(CLOUD_SESSION_ID_RE.test('cloud-x')).toBe(false);
    expect(CLOUD_SESSION_ID_RE.test('cloud-1-2/../x')).toBe(false);
    expect(CLOUD_SESSION_ID_RE.test('restored-1-2')).toBe(false);
  });
});
