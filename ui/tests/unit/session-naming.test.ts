import { describe, it, expect } from 'vitest';
import type { TerminalSession } from '../../frontend/src/components/terminal/aos-cloud-terminal-sidebar.js';
import { assignAutoNames, isOwnCreateRequest, toRestoredTab } from '../../frontend/src/components/terminal/session-naming.js';

function tab(over: Partial<TerminalSession> & { id: string }): TerminalSession {
  return {
    name: 'x',
    status: 'active',
    createdAt: new Date('2026-09-10T10:00:00Z'),
    projectPath: '/p',
    terminalType: 'claude-code',
    ...over,
  };
}

describe('assignAutoNames()', () => {
  it('numbers per project and type by createdAt, then by backend id', () => {
    const sessions = [
      tab({ id: 'c', terminalSessionId: 'cloud-3', createdAt: new Date('2026-09-10T10:02:00Z') }),
      tab({ id: 'a', terminalSessionId: 'cloud-1', createdAt: new Date('2026-09-10T10:00:00Z') }),
      tab({ id: 'b', terminalSessionId: 'cloud-2', createdAt: new Date('2026-09-10T10:00:00Z') }),
      tab({ id: 's', terminalSessionId: 'cloud-4', terminalType: 'shell' }),
      tab({ id: 'q', terminalSessionId: 'cloud-5', projectPath: '/other' }),
    ];
    const out = assignAutoNames(sessions, {});
    const byId = Object.fromEntries(out.map((s) => [s.id, s.name]));
    expect(byId).toEqual({ a: 'Claude Session 1', b: 'Claude Session 2', c: 'Claude Session 3', s: 'Terminal 1', q: 'Claude Session 1' });
    // Original order is preserved; only names change.
    expect(out.map((s) => s.id)).toEqual(['c', 'a', 'b', 's', 'q']);
  });

  it('custom names win, do not consume a number, and flip customNameSet', () => {
    const sessions = [
      tab({ id: 'a', terminalSessionId: 'cloud-1', createdAt: new Date(1000) }),
      tab({ id: 'b', terminalSessionId: 'cloud-2', createdAt: new Date(2000) }),
      tab({ id: 'c', terminalSessionId: 'cloud-3', createdAt: new Date(3000), name: 'Old', customNameSet: true }),
    ];
    const out = assignAutoNames(sessions, { 'cloud-2': 'Deploy' });
    expect(out.map((s) => [s.name, s.customNameSet ?? false])).toEqual([
      ['Claude Session 1', false],
      ['Deploy', true],
      // Name removed elsewhere → back to auto (2nd unnamed one)
      ['Claude Session 2', false],
    ]);
  });

  it('leaves placeholders (no backend id), workflow and setup tabs untouched', () => {
    const sessions = [
      tab({ id: 'pending', name: 'Neue Session' }),
      tab({ id: 'wf', terminalSessionId: 'cloud-9', isWorkflow: true, name: 'execute-tasks' }),
      tab({ id: 'setup', terminalSessionId: 'cloud-8', isSetupSession: true, name: 'Install' }),
    ];
    const out = assignAutoNames(sessions, { 'cloud-9': 'ignored' });
    expect(out).toBe(sessions);
    expect(out.map((s) => s.name)).toEqual(['Neue Session', 'execute-tasks', 'Install']);
  });

  it('returns the same array reference when nothing changes', () => {
    const sessions = [tab({ id: 'a', terminalSessionId: 'cloud-1', name: 'Claude Session 1', customNameSet: false })];
    expect(assignAutoNames(sessions, {})).toBe(sessions);
    expect(assignAutoNames([], {})).toEqual([]);
  });
});

describe('toRestoredTab()', () => {
  it('maps a backend session, including agent status and workflow metadata', () => {
    const t = toRestoredTab(
      {
        sessionId: 'cloud-7',
        projectPath: '/p',
        status: 'active',
        terminalType: 'claude-code',
        createdAt: '2026-09-10T10:00:00Z',
        effectiveCwd: '/p/wt',
        agentStatus: 'working',
        agentStatusAt: '2026-09-10T10:01:00Z',
        agentStatusReason: undefined,
      },
      { workflowName: 'execute-tasks', workflowContext: 'FE-001' }
    );
    expect(t).toMatchObject({
      id: 'restored-cloud-7',
      status: 'active',
      terminalSessionId: 'cloud-7',
      effectiveCwd: '/p/wt',
      agentStatus: 'working',
      agentStatusAt: Date.parse('2026-09-10T10:01:00Z'),
      isWorkflow: true,
      workflowName: 'execute-tasks',
      workflowContext: 'FE-001',
    });
    expect(t.createdAt.toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('shell sessions become disconnected placeholders when not active', () => {
    const t = toRestoredTab({ sessionId: 's', projectPath: '/p', status: 'paused', terminalType: 'shell', createdAt: 'garbage' });
    expect(t.status).toBe('disconnected');
    expect(t.name).toBe('Terminal');
    expect(t.agentStatus).toBeUndefined();
  });
});

describe('isOwnCreateRequest()', () => {
  it('matches only a pending tab id', () => {
    const sessions = [tab({ id: 'mine' })];
    expect(isOwnCreateRequest(sessions, 'mine')).toBe(true);
    expect(isOwnCreateRequest(sessions, 'other')).toBe(false);
    expect(isOwnCreateRequest(sessions, undefined)).toBe(false);
    expect(isOwnCreateRequest(sessions, '')).toBe(false);
  });
});
