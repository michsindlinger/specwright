import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { createCloudTerminalRouter, tokenMatches } from '../../src/server/routes/cloud-terminal.routes.js';
import { HOOK_TOKEN_HEADER } from '../../src/server/services/claude-hooks.js';
import type { CloudTerminalManager } from '../../src/server/services/cloud-terminal-manager.js';

const SECRET = 'cd'.repeat(32);

interface Captured { status?: number; body?: unknown; ended: boolean }

function fakeRes(): { res: Response; out: Captured } {
  const out: Captured = { ended: false };
  const res = {
    status(code: number) { out.status = code; return res; },
    json(body: unknown) { out.body = body; out.ended = true; return res; },
    end() { out.ended = true; return res; },
  } as unknown as Response;
  return { res, out };
}

function fakeReq(sessionId: string, headers: Record<string, string> = {}, body?: unknown): Request {
  return {
    params: { sessionId },
    body,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

/** Pulls the single POST handler out of the router without spinning up express. */
function handlerOf(getManager: () => CloudTerminalManager | undefined) {
  const router = createCloudTerminalRouter(getManager);
  const layer = (router as unknown as { stack: Array<{ route?: { stack: Array<{ handle: (req: Request, res: Response) => void }> } }> })
    .stack.find((l) => l.route)!;
  return layer.route!.stack[0].handle;
}

describe('tokenMatches()', () => {
  it('accepts only the exact secret', () => {
    expect(tokenMatches(SECRET, SECRET)).toBe(true);
    expect(tokenMatches(SECRET.slice(1), SECRET)).toBe(false);
    expect(tokenMatches(SECRET + 'x', SECRET)).toBe(false);
    expect(tokenMatches(undefined, SECRET)).toBe(false);
  });
});

describe('POST /api/cloud-terminal/:sessionId/agent-event', () => {
  const report = vi.fn<(id: string, ev: string, d: { preview?: string; reason?: string; blockKind?: string }) => boolean>();
  const reportPrompt = vi.fn<(id: string, prompt: string) => boolean>();
  // INT-2026-007: context, dialogs and Beiträge travel next to the status.
  const reportContext = vi.fn<(id: string, ctx: Record<string, unknown>) => boolean>();
  const reportDialog = vi.fn<(id: string, change: Record<string, unknown>) => boolean>();
  const reportBeitrag = vi.fn<(id: string, b: Record<string, unknown>) => boolean>();
  const manager = {
    getHookSecret: () => SECRET,
    reportAgentEvent: report,
    reportPromptText: reportPrompt,
    reportHookContext: reportContext,
    reportDialog,
    reportBeitrag,
  } as unknown as CloudTerminalManager;
  const auth = { [HOOK_TOKEN_HEADER]: SECRET };
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    report.mockReset().mockReturnValue(true);
    reportPrompt.mockReset().mockReturnValue(true);
    reportContext.mockReset().mockReturnValue(true);
    reportDialog.mockReset().mockReturnValue(true);
    reportBeitrag.mockReset().mockReturnValue(true);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('503 while the manager is not available', () => {
    const { res, out } = fakeRes();
    handlerOf(() => undefined)(fakeReq('cloud-1-1', auth), res);
    expect(out.status).toBe(503);
  });

  it('503 when the hook is disabled (no secret)', () => {
    const { res, out } = fakeRes();
    const noSecret = { ...manager, getHookSecret: () => undefined } as unknown as CloudTerminalManager;
    handlerOf(() => noSecret)(fakeReq('cloud-1-1', auth), res);
    expect(out.status).toBe(503);
  });

  it('403 without or with a wrong token, and logs it', () => {
    const { res, out } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', {}), res);
    expect(out.status).toBe(403);
    const r2 = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', { [HOOK_TOKEN_HEADER]: 'nope' }), r2.res);
    expect(r2.out.status).toBe(403);
    expect(report).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('400 for a malformed session id', () => {
    const { res, out } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-x', auth), res);
    expect(out.status).toBe(400);
  });

  it('400 (logged) for an unregistered hook payload', () => {
    const { res, out } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'SubagentStop' }), res);
    expect(out.status).toBe(400);
    const r2 = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'PreToolUse', tool_name: 'Read' }), r2.res);
    expect(r2.out.status).toBe(400);
    expect(report).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('204 without a log for known-but-irrelevant payloads', () => {
    for (const body of [
      { hook_event_name: 'SessionStart', source: 'compact' },
      { hook_event_name: 'Notification', notification_type: 'permission_prompt' },
      { hook_event_name: 'Notification', notification_type: 'auth_success' },
    ]) {
      const { res, out } = fakeRes();
      handlerOf(() => manager)(fakeReq('cloud-1-1', auth, body), res);
      expect(out.status).toBe(204);
    }
    expect(report).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('maps status events to the manager with their reason', () => {
    const cases: Array<[Record<string, unknown>, string, { preview?: string; reason?: string; blockKind?: string }]> = [
      [{ hook_event_name: 'PermissionRequest', tool_name: 'Bash' }, 'blocked', { reason: 'Berechtigung: Bash', blockKind: 'berechtigung' }],
      [{ hook_event_name: 'UserPromptSubmit', user_prompt: 'x' }, 'prompt-submitted', {}],
      [{ hook_event_name: 'StopFailure', error: 'rate_limit' }, 'stop-failure', { reason: 'rate_limit' }],
      [{ hook_event_name: 'SessionStart', source: 'startup' }, 'session-start', {}],
      [{ hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion' }, 'unblocked', {}],
    ];
    for (const [body, ev, detail] of cases) {
      const { res, out } = fakeRes();
      handlerOf(() => manager)(fakeReq('cloud-1-1', auth, body), res);
      expect(out.status).toBe(204);
      expect(report).toHaveBeenLastCalledWith('cloud-1-1', ev, detail);
    }
  });

  it('forwards the UserPromptSubmit prompt server-internally, never in the agent-event detail (INT-2026-004)', () => {
    const { res, out } = fakeRes();
    handlerOf(() => manager)(
      fakeReq('cloud-1-1', auth, { hook_event_name: 'UserPromptSubmit', prompt: '/plan INT-2026-004\nzweite Zeile' }),
      res
    );
    expect(out.status).toBe(204);
    expect(report).toHaveBeenLastCalledWith('cloud-1-1', 'prompt-submitted', {});
    expect(reportPrompt).toHaveBeenCalledWith('cloud-1-1', '/plan INT-2026-004\nzweite Zeile');
  });

  it('does not forward prompt text for other events or when the session is inactive', () => {
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'Stop', prompt: 'x' }), fakeRes().res);
    expect(reportPrompt).not.toHaveBeenCalled();
    report.mockReturnValue(false);
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'UserPromptSubmit', prompt: 'x' }), fakeRes().res);
    expect(reportPrompt).not.toHaveBeenCalled();
  });

  it('404 when the manager rejects (unknown/closed session)', () => {
    report.mockReturnValue(false);
    const { res, out } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'Stop' }), res);
    expect(out.status).toBe(404);
  });

  it('204 with a sanitized preview', () => {
    const { res, out } = fakeRes();
    handlerOf(() => manager)(
      fakeReq('cloud-1-1', auth, { hook_event_name: 'Stop', last_assistant_message: '\x1b[1mAll   done\x1b[0m\n' }),
      res
    );
    expect(out.status).toBe(204);
    expect(out.ended).toBe(true);
    expect(report).toHaveBeenCalledWith('cloud-1-1', 'stop', { preview: 'All done' });
  });

  it('204 without a body and without last_assistant_message', () => {
    const a = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, undefined), a.res);
    expect(a.out.status).toBe(204);
    const b = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'Stop' }), b.res);
    expect(b.out.status).toBe(204);
    expect(report).toHaveBeenLastCalledWith('cloud-1-1', 'stop', { preview: undefined });
  });
  // ---- INT-2026-007: Gespräch ----

  it('reports the hook context (transcript path, Claude session id) before the status', () => {
    const { res, out } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'SessionStart', source: 'startup', transcript_path: '/t/x.jsonl', session_id: 'abc', cwd: '/p' }), res);
    expect(out.status).toBe(204);
    expect(reportContext).toHaveBeenCalledWith('cloud-1-1', { transcriptPath: '/t/x.jsonl', claudeSessionId: 'abc', cwd: '/p' });
    expect(reportContext.mock.invocationCallOrder[0]).toBeLessThan(report.mock.invocationCallOrder[0]);
  });

  it('forwards the full Stop text as Beitrag, never in the agent-event detail', () => {
    const { res } = fakeRes();
    const text = 'Antwort\n\n' + 'x'.repeat(1000);
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'Stop', last_assistant_message: text }), res);
    expect(reportBeitrag).toHaveBeenCalledWith('cloud-1-1', { kind: 'claude', text });
    expect(report.mock.calls[0][2].preview!.length).toBeLessThanOrEqual(160);
  });

  it('opens the dialog with the blocked status; a dialog the manager already closed drops both (monotony)', () => {
    const body = { hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_use_id: 'toolu_1', tool_input: { questions: [{ question: 'Q?', options: [{ label: 'A' }] }] } };
    const first = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, body), first.res);
    expect(reportDialog).toHaveBeenCalledWith('cloud-1-1', { open: expect.objectContaining({ kind: 'rueckfrage', toolUseId: 'toolu_1' }) });
    expect(report).toHaveBeenCalledWith('cloud-1-1', 'blocked', expect.objectContaining({ blockKind: 'rueckfrage' }));

    report.mockClear();
    reportDialog.mockReturnValueOnce(false);
    const late = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, body), late.res);
    expect(late.out.status).toBe(204);
    expect(report).not.toHaveBeenCalled();
  });

  it('PostToolUse closes the dialog before the unblocked status', () => {
    const { res } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion', tool_use_id: 'toolu_1', tool_response: { answers: { 'Q?': 'A' } } }), res);
    expect(reportDialog).toHaveBeenCalledWith('cloud-1-1', { closed: { toolUseId: 'toolu_1', tool: 'AskUserQuestion', answers: { 'Q?': 'A' } } });
    expect(reportDialog.mock.invocationCallOrder[0]).toBeLessThan(report.mock.invocationCallOrder[0]);
    expect(report).toHaveBeenCalledWith('cloud-1-1', 'unblocked', expect.anything());
  });

  it('404 when the session is gone before the context is stored', () => {
    reportContext.mockReturnValue(false);
    const { res, out } = fakeRes();
    handlerOf(() => manager)(fakeReq('cloud-1-1', auth, { hook_event_name: 'Stop' }), res);
    expect(out.status).toBe(404);
    expect(report).not.toHaveBeenCalled();
  });
});
