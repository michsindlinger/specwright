import { describe, it, expect } from 'vitest';
import {
  upsertNotification,
  removeNotification,
  pruneNotifications,
  formatRelativeTime,
  resolveJumpTarget,
  buildBellRows,
  ringsForAgentEvent,
  type AgentNotification,
  type BellSession,
  type JumpInput,
} from '../../frontend/src/components/terminal/agent-notifications.js';

const n = (sessionId: string, finishedAt = 0, preview?: string): AgentNotification => ({
  sessionId,
  terminalSessionId: `cloud-${sessionId}`,
  finishedAt,
  preview,
});

describe('upsertNotification()', () => {
  it('prepends new entries (newest first)', () => {
    const list = upsertNotification([n('a', 1)], n('b', 2));
    expect(list.map((x) => x.sessionId)).toEqual(['b', 'a']);
  });

  it('keeps one entry per session, refreshing time/preview and moving it to the front', () => {
    const list = upsertNotification([n('a', 1), n('b', 2, 'old')], n('b', 3, 'new'));
    expect(list.map((x) => x.sessionId)).toEqual(['b', 'a']);
    expect(list[0]).toMatchObject({ finishedAt: 3, preview: 'new' });
    expect(list).toHaveLength(2);
  });
});

describe('removeNotification() / pruneNotifications()', () => {
  it('remove: same reference when nothing matches, filtered copy otherwise', () => {
    const list = [n('a'), n('b')];
    expect(removeNotification(list, 'zzz')).toBe(list);
    expect(removeNotification(list, null)).toBe(list);
    expect(removeNotification(list, 'a').map((x) => x.sessionId)).toEqual(['b']);
  });

  it('prune: same reference when all sessions live, drops dead ones otherwise', () => {
    const list = [n('a'), n('b')];
    expect(pruneNotifications(list, new Set(['a', 'b', 'c']))).toBe(list);
    expect(pruneNotifications(list, new Set(['b'])).map((x) => x.sessionId)).toEqual(['b']);
    expect(pruneNotifications(list, new Set())).toEqual([]);
  });
});

describe('formatRelativeTime()', () => {
  const now = Date.UTC(2026, 8, 9, 12, 0, 0);
  it('buckets seconds, minutes and hours', () => {
    expect(formatRelativeTime(now - 10_000, now)).toBe('gerade eben');
    expect(formatRelativeTime(now - 3 * 60_000, now)).toBe('vor 3 Min');
    expect(formatRelativeTime(now - 2 * 3_600_000, now)).toBe('vor 2 Std');
    expect(formatRelativeTime(now + 5_000, now)).toBe('gerade eben');
  });
  it('falls back to HH:MM after a day', () => {
    expect(formatRelativeTime(now - 30 * 3_600_000, now)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('resolveJumpTarget()', () => {
  const base: JumpInput = {
    isSplit: true,
    paneCount: 2,
    paneSessionIds: ['s1', 's2'],
    paneProjects: ['/p1', '/p2'],
    zoomedPane: null,
    focusedPane: 0,
    sessionId: 's2',
    sessionProject: '/p2',
  };

  it('single mode → select-tab regardless of anything else', () => {
    expect(resolveJumpTarget({ ...base, isSplit: false, paneCount: 1 })).toEqual({ kind: 'select-tab' });
  });

  it('session visible in a pane, no zoom → focus that pane', () => {
    expect(resolveJumpTarget(base)).toEqual({ kind: 'focus-pane', pane: 1 });
  });

  it('session visible in pane B while pane A is zoomed → move zoom to B', () => {
    expect(resolveJumpTarget({ ...base, zoomedPane: 0 })).toEqual({ kind: 'zoom-pane', pane: 1 });
  });

  it('session visible in the zoomed pane → just focus it', () => {
    expect(resolveJumpTarget({ ...base, zoomedPane: 1 })).toEqual({ kind: 'focus-pane', pane: 1 });
  });

  it('background tab, focused pane shows the same project → assign into the focused pane', () => {
    const r = resolveJumpTarget({ ...base, sessionId: 'bg', sessionProject: '/p1', focusedPane: 0 });
    expect(r).toEqual({ kind: 'assign-pane', pane: 0, keepZoom: false });
  });

  it('background tab, two panes show the same project → the focused one wins (no stealing)', () => {
    const r = resolveJumpTarget({
      ...base,
      paneProjects: ['/p1', '/p1'],
      focusedPane: 1,
      sessionId: 'bg',
      sessionProject: '/p1',
    });
    expect(r).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: false });
  });

  it('background tab, only a non-focused pane shows the project → assign there', () => {
    const r = resolveJumpTarget({ ...base, sessionId: 'bg', sessionProject: '/p2', focusedPane: 0 });
    expect(r).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: false });
  });

  it('background tab, no pane shows the project → assign into the focused pane', () => {
    const r = resolveJumpTarget({ ...base, sessionId: 'bg', sessionProject: '/p3', focusedPane: 1 });
    expect(r).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: false });
  });

  it('zoomed + background tab of another project → assign into the zoomed pane, keep zoom', () => {
    const r = resolveJumpTarget({ ...base, zoomedPane: 0, focusedPane: 1, sessionId: 'bg', sessionProject: '/p3' });
    expect(r).toEqual({ kind: 'assign-pane', pane: 0, keepZoom: true });
  });

  it('zoomed on A, background tab whose project is shown by B → assign into B, keep zoom', () => {
    const r = resolveJumpTarget({ ...base, zoomedPane: 0, focusedPane: 0, sessionId: 'bg', sessionProject: '/p2' });
    expect(r).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: true });
  });

  it('quad: ignores pane slots beyond paneCount', () => {
    const r = resolveJumpTarget({
      ...base,
      paneCount: 2,
      paneSessionIds: ['s1', 's2', 'bg', null],
      sessionId: 'bg',
      sessionProject: '/p2',
    });
    expect(r).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: false });
  });
});

describe('buildBellRows()', () => {
  const s = (id: string, agentStatus?: BellSession['agentStatus'], agentStatusAt = 0, reason?: string): BellSession => ({
    id,
    agentStatus,
    agentStatusAt,
    agentStatusReason: reason,
  });

  it('lists blocked sessions above finished agents', () => {
    const rows = buildBellRows([n('done-1', 500)], [s('done-1', 'done', 500), s('blk', 'blocked', 1)], null);
    expect(rows.map((r) => [r.sessionId, r.kind])).toEqual([
      ['blk', 'blocked'],
      ['done-1', 'done'],
    ]);
  });

  it('orders newest first inside each group', () => {
    const sessions = [s('b-old', 'blocked', 1), s('b-new', 'blocked', 9), s('d-old', 'idle'), s('d-new', 'idle')];
    const rows = buildBellRows([n('d-old', 2), n('d-new', 8)], sessions, null);
    expect(rows.map((r) => r.sessionId)).toEqual(['b-new', 'b-old', 'd-new', 'd-old']);
  });

  it('never lists the session the user is looking at', () => {
    expect(buildBellRows([n('a', 1)], [s('a', 'blocked', 1)], 'a')).toEqual([]);
    expect(buildBellRows([n('a', 1)], [s('a', 'done', 1)], 'a')).toEqual([]);
  });

  it('drops notifications whose session is gone', () => {
    expect(buildBellRows([n('ghost', 1)], [s('other', 'idle')], null)).toEqual([]);
  });

  it('shows a blocked session once, never also as finished', () => {
    const rows = buildBellRows([n('a', 1, 'All done')], [s('a', 'blocked', 2, 'Berechtigung: Bash')], null);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'blocked', preview: 'Berechtigung: Bash', at: 2 });
  });

  it('carries the stop preview through and copes with a missing status timestamp', () => {
    expect(buildBellRows([n('a', 7, 'All done')], [s('a', 'done', 7)], null)[0])
      .toMatchObject({ kind: 'done', preview: 'All done', at: 7 });
    expect(buildBellRows([], [{ id: 'a', agentStatus: 'blocked' }], null)[0]).toMatchObject({ at: 0 });
  });
});

describe('ringsForAgentEvent()', () => {
  const ring = (event: string, status: BellSession['agentStatus'], prevStatus: BellSession['agentStatus'], isActive = false) =>
    ringsForAgentEvent({ event, status: status ?? 'unknown', prevStatus, isActive });

  it('never rings for the session the user is looking at', () => {
    expect(ring('stop', 'done', 'working', true)).toBe(false);
    expect(ring('blocked', 'blocked', 'working', true)).toBe(false);
    expect(ring('review-injected', 'blocked', 'blocked', true)).toBe(false);
    expect(ring('review-failed', 'blocked', 'blocked', true)).toBe(false);
  });

  it('plan-review events ring once each, even when the session was already blocked', () => {
    expect(ring('review-injected', 'blocked', 'blocked')).toBe(true);
    expect(ring('review-injected', 'blocked', 'working')).toBe(true);
    expect(ring('review-failed', 'blocked', 'blocked')).toBe(true);
  });

  it('every stop rings; a transition into blocked rings once, a repeated blocked does not', () => {
    expect(ring('stop', 'done', 'working')).toBe(true);
    expect(ring('stop', 'done', 'done')).toBe(true);
    expect(ring('blocked', 'blocked', 'working')).toBe(true);
    expect(ring('blocked', 'blocked', undefined)).toBe(true);
    expect(ring('blocked', 'blocked', 'blocked')).toBe(false);
  });

  it('working / idle / unknown events stay silent', () => {
    expect(ring('prompt-submitted', 'working', 'idle')).toBe(false);
    expect(ring('user-input', 'working', 'blocked')).toBe(false);
    expect(ring('idle-timeout', 'idle', 'done')).toBe(false);
    expect(ring('something-new', 'working', 'working')).toBe(false);
  });
});
