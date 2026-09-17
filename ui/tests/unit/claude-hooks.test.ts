import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, statSync, chmodSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  CLOUD_SESSION_ID_ENV,
  CLOUD_SESSION_ID_RE,
  HOOK_EVENTS,
  HOOK_TOKEN_HEADER,
  ensureHookSettingsFile,
  loadOrCreateHookSecret,
  mapHookPayload,
  renderHookSettings,
  summarizePreview,
} from '../../src/server/services/claude-hooks.js';

const SECRET = 'ab'.repeat(32);

interface HookEntry { matcher?: string; hooks: Array<{ type: string; command: string; timeout: number; async?: boolean }> }
interface HookSettings { hooks: Record<string, HookEntry[]> }

const parse = (port = 3001): HookSettings => JSON.parse(renderHookSettings(port, SECRET)) as HookSettings;

describe('renderHookSettings()', () => {
  it('registers exactly the eight events, each with the identical async command', () => {
    const { hooks } = parse();
    expect(Object.keys(hooks).sort()).toEqual(HOOK_EVENTS.map((e) => e.event).sort());
    expect(Object.keys(hooks)).toHaveLength(8);
    const commands = new Set<string>();
    for (const entries of Object.values(hooks)) {
      expect(entries).toHaveLength(1);
      expect(entries[0].hooks).toHaveLength(1);
      const hook = entries[0].hooks[0];
      expect(hook.type).toBe('command');
      expect(hook.async).toBe(true);
      expect(hook.timeout).toBe(2);
      commands.add(hook.command);
    }
    expect(commands.size).toBe(1);
  });

  it('uses the immediate PermissionRequest signal, never the 6-second permission_prompt notification', () => {
    const { hooks } = parse();
    expect(hooks.PermissionRequest[0].matcher).toBeUndefined();
    expect(hooks.Notification[0].matcher).toBe('elicitation_dialog|elicitation_url_dialog|agent_needs_input|idle_prompt');
    expect(hooks.Notification[0].matcher).not.toContain('permission_prompt');
  });

  it('scopes tool hooks to AskUserQuestion|ExitPlanMode and excludes compact from SessionStart', () => {
    const { hooks } = parse();
    expect(hooks.PreToolUse[0].matcher).toBe('AskUserQuestion|ExitPlanMode');
    expect(hooks.PostToolUse[0].matcher).toBe('AskUserQuestion|ExitPlanMode');
    expect(hooks.SessionStart[0].matcher).toBe('startup|resume|clear|fork');
    expect(hooks.UserPromptSubmit[0].matcher).toBeUndefined();
    expect(hooks.Stop[0].matcher).toBeUndefined();
    expect(hooks.StopFailure[0].matcher).toBeUndefined();
  });

  it('targets this backend port with tight curl timeouts and always exits 0', () => {
    const hook = parse(3001).hooks.Stop[0].hooks[0];
    expect(hook.command).toContain('http://127.0.0.1:3001/api/cloud-terminal/$SPECWRIGHT_CLOUD_SESSION_ID/agent-event');
    expect(hook.command).toContain(`${HOOK_TOKEN_HEADER}: ${SECRET}`);
    expect(hook.command).toContain('--data-binary @-');
    expect(hook.command).toContain('--connect-timeout 0.2 -m 1');
    expect(hook.command).toContain('>/dev/null 2>&1');
    expect(hook.command).toMatch(/; exit 0$/);
  });

  it('rejects invalid ports and malformed secrets', () => {
    expect(() => renderHookSettings(0, SECRET)).toThrow();
    expect(() => renderHookSettings(70000, SECRET)).toThrow();
    expect(() => renderHookSettings(3001, 'short')).toThrow();
    expect(() => renderHookSettings(3001, `${SECRET}'; rm -rf /`)).toThrow();
  });
});

describe('the rendered hook command, run through a real sh', () => {
  let dir: string;
  let curlLog: string;

  const command = (): string => parse(4242).hooks.Stop[0].hooks[0].command;

  const run = (env: Record<string, string>, stdin = ''): number => {
    try {
      execFileSync('/bin/sh', ['-c', command()], { env, input: stdin, stdio: ['pipe', 'ignore', 'ignore'] });
      return 0;
    } catch (err) {
      return (err as { status?: number }).status ?? -1;
    }
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'claude-hooks-'));
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

describe('loadOrCreateHookSecret() / ensureHookSettingsFile()', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'claude-hooks-files-')); });
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
    expect(ensureHookSettingsFile(3001, SECRET, p)).toBe(p);
    ensureHookSettingsFile(3001, SECRET, p);
    expect(statSync(p).mode & 0o777).toBe(0o600);
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as HookSettings;
    expect(parsed).toHaveProperty('hooks.Stop');
    expect(parsed).toHaveProperty('hooks.UserPromptSubmit');
  });
});

describe('mapHookPayload()', () => {
  const event = (body: Record<string, unknown>) => {
    const m = mapHookPayload(body);
    expect(m.kind).toBe('event');
    return m.kind === 'event' ? m : (undefined as never);
  };
  const kind = (body: Record<string, unknown>) => mapHookPayload(body).kind;

  it('Stop (and a body without hook_event_name) → stop with sanitized preview', () => {
    expect(event({ hook_event_name: 'Stop', last_assistant_message: '\x1b[1mAll   done\x1b[0m' }))
      .toMatchObject({ kind: 'event', event: 'stop', detail: { preview: 'All done' } });
    expect(event({})).toMatchObject({ kind: 'event', event: 'stop', detail: { preview: undefined } });
  });

  it('StopFailure → stop-failure, reason from message, then error, then a static fallback', () => {
    expect(event({ hook_event_name: 'StopFailure', last_assistant_message: 'API Error: 429', error: 'rate_limit' }).detail)
      .toEqual({ reason: 'API Error: 429' });
    expect(event({ hook_event_name: 'StopFailure', error: 'rate_limit' }).detail).toEqual({ reason: 'rate_limit' });
    expect(event({ hook_event_name: 'StopFailure' }).detail).toEqual({ reason: 'API-Fehler' });
  });

  it('UserPromptSubmit → prompt-submitted without forwarding the prompt text', () => {
    expect(event({ hook_event_name: 'UserPromptSubmit', user_prompt: 'secret plans' }))
      .toMatchObject({ kind: 'event', event: 'prompt-submitted', detail: {} });
  });

  it('PermissionRequest → blocked, tool name optional', () => {
    expect(event({ hook_event_name: 'PermissionRequest', tool_name: 'Bash' }).detail).toMatchObject({ reason: 'Berechtigung: Bash' });
    expect(event({ hook_event_name: 'PermissionRequest' }).detail).toMatchObject({ reason: 'Berechtigung' });
  });

  it('PreToolUse/PostToolUse only for AskUserQuestion', () => {
    const pre = event({
      hook_event_name: 'PreToolUse',
      tool_name: 'AskUserQuestion',
      tool_input: { questions: [{ question: 'Which colour?' }] },
    });
    expect(pre).toMatchObject({ kind: 'event', event: 'blocked', detail: { reason: 'Which colour?' } });
    expect(event({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion' }).detail).toMatchObject({ reason: 'Frage' });
    expect(event({ hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion' }))
      .toMatchObject({ kind: 'event', event: 'unblocked', detail: {} });
    expect(kind({ hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBe('reject');
    expect(kind({ hook_event_name: 'PostToolUse', tool_name: 'Read' })).toBe('reject');
  });

  it('Notification: blocking types → blocked, idle_prompt → idle-prompt, everything else ignored', () => {
    expect(event({ hook_event_name: 'Notification', notification_type: 'elicitation_dialog', message: 'Pick one' }))
      .toMatchObject({ kind: 'event', event: 'blocked', detail: { reason: 'Pick one' } });
    expect(event({ hook_event_name: 'Notification', notification_type: 'agent_needs_input' }).event).toBe('blocked');
    expect(event({ hook_event_name: 'Notification', notification_type: 'idle_prompt' }))
      .toMatchObject({ kind: 'event', event: 'idle-prompt', detail: {} });
    // The 6-second permission_prompt must never re-block an answered session.
    expect(kind({ hook_event_name: 'Notification', notification_type: 'permission_prompt' })).toBe('ignore');
    expect(kind({ hook_event_name: 'Notification', notification_type: 'auth_success' })).toBe('ignore');
    expect(kind({ hook_event_name: 'Notification' })).toBe('ignore');
  });

  it('SessionStart → session-start, except compact which is ignored', () => {
    expect(event({ hook_event_name: 'SessionStart', source: 'startup' }).event).toBe('session-start');
    expect(event({ hook_event_name: 'SessionStart', source: 'resume' }).event).toBe('session-start');
    expect(kind({ hook_event_name: 'SessionStart', source: 'compact' })).toBe('ignore');
  });

  it('rejects unregistered events', () => {
    expect(kind({ hook_event_name: 'SubagentStop' })).toBe('reject');
    expect(kind({ hook_event_name: 'PreCompact' })).toBe('reject');
    expect(kind({ hook_event_name: 42 })).toBe('reject');
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

/**
 * INT-2026-007 (FA-01, FA-09): the mapping carries the hook context (transcript
 * path, Claude session id) and a structured block kind. INT-2026-011 removed
 * the dialog contents and turn texts (the UI shows the session itself,
 * ADR-0004) — the mapping is status, block kind and context, nothing else.
 * Payload shapes recorded on 2026-09-16 against Claude Code 2.1.273.
 */
describe('mapHookPayload() — hook context and block kind (INT-2026-007, reduced in INT-2026-011)', () => {
  const ctx = { session_id: '061876cd-d221-416b-9e33-6b474dde574b', transcript_path: '/home/me/.claude/projects/-tmp-scratch/061876cd-d221-416b-9e33-6b474dde574b.jsonl', cwd: '/tmp/scratch' };
  const questions = [{ question: 'Welche Farbe magst du?', header: 'Farbe', multiSelect: false, options: [{ label: 'Rot', description: 'warm' }, { label: 'Blau', description: 'kalt' }, { label: 'Grün' }] }];
  const ev = (body: Record<string, unknown>) => {
    const m = mapHookPayload(body);
    if (m.kind !== 'event') throw new Error(`expected event, got ${m.kind}`);
    return m;
  };

  it('every event carries the hook context; non-string fields are dropped', () => {
    expect(ev({ hook_event_name: 'Stop', ...ctx }).context).toEqual({ transcriptPath: ctx.transcript_path, claudeSessionId: ctx.session_id, cwd: ctx.cwd });
    expect(ev({ hook_event_name: 'SessionStart', source: 'startup', ...ctx, cwd: 7 }).context).toEqual({ transcriptPath: ctx.transcript_path, claudeSessionId: ctx.session_id });
    expect(ev({ hook_event_name: 'Stop' }).context).toEqual({});
  });

  it('Stop and UserPromptSubmit carry no turn text — only the 160-char preview of a Stop (INT-2026-011)', () => {
    const text = 'Zeile 1\n\n' + 'x'.repeat(6000);
    const stop = ev({ hook_event_name: 'Stop', last_assistant_message: text });
    expect(stop.detail.preview!.length).toBeLessThanOrEqual(160);
    expect(Object.keys(stop).sort()).toEqual(['context', 'detail', 'event', 'kind']);
    const prompt = ev({ hook_event_name: 'UserPromptSubmit', prompt: '/specwright:spec INT-2026-007' });
    expect(prompt).toEqual({ kind: 'event', event: 'prompt-submitted', detail: {}, context: {} });
  });

  it('PreToolUse AskUserQuestion → blocked, blockKind rueckfrage, reason = first question; no dialog contents', () => {
    const m = ev({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_use_id: 'toolu_01JcYX3hozXAZiZ3B7ZsGX4C', tool_input: { questions } });
    expect(m.event).toBe('blocked');
    expect(m.detail).toEqual({ reason: 'Welche Farbe magst du?', blockKind: 'rueckfrage' });
    expect(Object.keys(m).sort()).toEqual(['context', 'detail', 'event', 'kind']);
    // malformed questions → static reason, never a throw
    expect(ev({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: { questions: ['text', { nope: true }] } }).detail).toEqual({ reason: 'Frage', blockKind: 'rueckfrage' });
    expect(ev({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: { questions: 'x' } }).detail).toEqual({ reason: 'Frage', blockKind: 'rueckfrage' });
  });

  it('PermissionRequest AskUserQuestion → blocked rueckfrage (recorded: fires 2 ms after PreToolUse)', () => {
    const m = ev({ hook_event_name: 'PermissionRequest', tool_name: 'AskUserQuestion', tool_input: { questions } });
    expect(m.event).toBe('blocked');
    expect(m.detail).toEqual({ reason: 'Berechtigung: AskUserQuestion', blockKind: 'rueckfrage' });
  });

  it('PreToolUse/PermissionRequest ExitPlanMode → blocked plan without the plan text', () => {
    const plan = '# Plan: hallo.txt\n\n1. anlegen\n2. prüfen';
    const pre = ev({ hook_event_name: 'PreToolUse', tool_name: 'ExitPlanMode', tool_use_id: 'toolu_01L8', tool_input: { plan } });
    expect(pre.event).toBe('blocked');
    expect(pre.detail).toEqual({ reason: 'Berechtigung: ExitPlanMode', blockKind: 'plan' });
    expect(JSON.stringify(pre)).not.toContain('hallo.txt');
    const perm = ev({ hook_event_name: 'PermissionRequest', tool_name: 'ExitPlanMode', tool_input: { plan } });
    expect(perm.detail).toEqual({ reason: 'Berechtigung: ExitPlanMode', blockKind: 'plan' });
  });

  it('PermissionRequest for other tools → blocked berechtigung without the tool input', () => {
    const m = ev({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'rm -rf ' + 'x'.repeat(500), description: 'd' } });
    expect(m.detail).toEqual({ reason: 'Berechtigung: Bash', blockKind: 'berechtigung' });
    expect(JSON.stringify(m)).not.toContain('rm -rf');
    expect(ev({ hook_event_name: 'PermissionRequest' }).detail).toEqual({ reason: 'Berechtigung', blockKind: 'berechtigung' });
  });

  it('PostToolUse AskUserQuestion / ExitPlanMode → unblocked, the tool_response is not carried', () => {
    const q = ev({ hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion', tool_use_id: 'toolu_01Jc', tool_input: { questions }, tool_response: { questions, answers: { 'Welche Farbe magst du?': 'Blau' }, annotations: {} } });
    expect(q).toEqual({ kind: 'event', event: 'unblocked', detail: {}, context: {} });
    const plan = ev({ hook_event_name: 'PostToolUse', tool_name: 'ExitPlanMode', tool_use_id: 'toolu_01L8', tool_response: { plan: '# Plan', filePath: '/x.md' } });
    expect(plan).toEqual({ kind: 'event', event: 'unblocked', detail: {}, context: {} });
  });

  it('PreToolUse/PostToolUse still reject other tools', () => {
    expect(mapHookPayload({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }).kind).toBe('reject');
    expect(mapHookPayload({ hook_event_name: 'PostToolUse', tool_name: 'Edit' }).kind).toBe('reject');
  });

  it('blocking Notification → blockKind unbekannt (FA-10)', () => {
    expect(ev({ hook_event_name: 'Notification', notification_type: 'elicitation_dialog', message: 'm' }).detail).toMatchObject({ blockKind: 'unbekannt' });
  });
});
