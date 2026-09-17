import { describe, it, expect } from 'vitest';
import {
  formatRelativeTime,
  resolveJumpTarget,
  soloJumpTarget,
  buildBellRows,
  ringsForAgentEvent,
  type BellSession,
  type BellVorhabenRow,
  type JumpInput,
} from '../../frontend/src/components/terminal/agent-notifications.js';

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

describe('soloJumpTarget() (INT-2026-005)', () => {
  const full = ['a1', 'b1'];
  it('turns a plain pane focus into a zoom — the session must be alone on the screen', () => {
    expect(soloJumpTarget({ kind: 'focus-pane', pane: 1 }, full)).toEqual({ kind: 'zoom-pane', pane: 1 });
  });
  it('keeps the zoom on the pane a background session is assigned to, even when nothing was zoomed', () => {
    expect(soloJumpTarget({ kind: 'assign-pane', pane: 0, keepZoom: false }, full)).toEqual({ kind: 'assign-pane', pane: 0, keepZoom: true });
    expect(soloJumpTarget({ kind: 'assign-pane', pane: 3, keepZoom: true }, ['a', 'b', 'c', 'd'])).toEqual({ kind: 'assign-pane', pane: 3, keepZoom: true });
  });
  it('prefers an empty pane over evicting the session the user was looking at (E2E finding 15.09.)', () => {
    expect(soloJumpTarget({ kind: 'assign-pane', pane: 0, keepZoom: false }, ['a1', null])).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: true });
    // the target pane itself is empty → stays
    expect(soloJumpTarget({ kind: 'assign-pane', pane: 1, keepZoom: false }, ['a1', null])).toEqual({ kind: 'assign-pane', pane: 1, keepZoom: true });
  });
  it('leaves single mode and an existing zoom target alone', () => {
    expect(soloJumpTarget({ kind: 'select-tab' }, [])).toEqual({ kind: 'select-tab' });
    expect(soloJumpTarget({ kind: 'zoom-pane', pane: 2 }, ['a', 'b', 'c', 'd'])).toEqual({ kind: 'zoom-pane', pane: 2 });
  });
});

describe('buildBellRows() — INT-2026-016 (AK-02, AK-03): one source, the backend', () => {
  const s = (id: string, o: Partial<BellSession> = {}): BellSession => ({ id, terminalSessionId: `cloud-${id}`, ...o });
  const vr = (o: Partial<BellVorhabenRow> & { intentId: string; sessionId?: string }): BellVorhabenRow => ({
    projectId: '/p',
    titel: 'Titel ' + o.intentId,
    zustand: 'keine_sitzung',
    zustandDetail: '',
    lastChangedMs: 0,
    ...(o.sessionId ? { session: { id: o.sessionId } } : {}),
    ...o,
  });

  it('lists a session while it shows a dialog (blocked) or carries the „fertig, unbeantwortet" mark; nothing else', () => {
    const sessions = [
      s('blk', { agentStatus: 'blocked', agentStatusAt: 5, agentStatusReason: 'Berechtigung: Bash' }),
      s('fin', { agentStatus: 'idle', agentDoneAt: 3 }),
      s('done-no-mark', { agentStatus: 'done' }), // after a restart the mark can be gone → not listed
      s('working', { agentStatus: 'working', agentStatusAt: 9 }),
      s('fresh', { agentStatus: 'unknown' }),
      s('idle', { agentStatus: 'idle', agentStatusAt: 1 }),
      s('shell'),
    ];
    const rows = buildBellRows(sessions, [], null);
    expect(rows.map((r) => [r.sessionId, r.kind, r.at])).toEqual([
      ['blk', 'blocked', 5],
      ['fin', 'done', 3],
    ]);
    expect(rows[0]).toMatchObject({ terminalSessionId: 'cloud-blk', preview: 'Berechtigung: Bash' });
  });

  it('orders blocked above finished, newest first inside each group', () => {
    const sessions = [
      s('b-old', { agentStatus: 'blocked', agentStatusAt: 1 }),
      s('d-new', { agentStatus: 'done', agentDoneAt: 8 }),
      s('b-new', { agentStatus: 'blocked', agentStatusAt: 9 }),
      s('d-old', { agentStatus: 'idle', agentDoneAt: 2 }),
    ];
    expect(buildBellRows(sessions, [], null).map((r) => r.sessionId)).toEqual(['b-new', 'b-old', 'd-new', 'd-old']);
  });

  it('never lists the session the user is looking at (sidebar open, tab active); with the sidebar closed it is back (INT-2026-010 review E2)', () => {
    expect(buildBellRows([s('a', { agentStatus: 'blocked', agentStatusAt: 1 })], [], 'a')).toEqual([]);
    expect(buildBellRows([s('a', { agentStatus: 'done', agentDoneAt: 1 })], [], 'a')).toEqual([]);
    expect(buildBellRows([s('a', { agentStatus: 'done', agentDoneAt: 1 })], [], null).map((r) => r.sessionId)).toEqual(['a']);
    expect(buildBellRows([s('a', { agentStatus: 'done', agentDoneAt: 1 })], [], undefined).map((r) => r.sessionId)).toEqual(['a']);
  });

  it('a session of a Vorhaben row is labelled with Kennung, Titel, the row state and the project — the row never decides the listing', () => {
    const sessions = [
      s('spec', { agentStatus: 'idle', agentDoneAt: 4 }),
      s('plan', { agentStatus: 'blocked', agentStatusAt: 6, agentStatusReason: 'ExitPlanMode' }),
      s('quiet', { agentStatus: 'idle' }),
    ];
    const rows: BellVorhabenRow[] = [
      vr({ intentId: 'INT-2026-004', sessionId: 'cloud-spec', zustand: 'wartet_auf_dich', zustandDetail: 'spec.md', step: 'spec', projectId: '/applai' }),
      vr({ intentId: 'INT-2026-002', sessionId: 'cloud-plan', zustand: 'wartet_plan', zustandDetail: 'Plan-Entscheidung', projectId: '/compass' }),
      vr({ intentId: 'INT-2026-009', sessionId: 'cloud-quiet', zustand: 'wartet', zustandDetail: '' }), // row waits (F8: unknown/idle) but no mark → not listed
    ];
    const out = buildBellRows(sessions, rows, null);
    expect(out.map((r) => r.sessionId)).toEqual(['plan', 'spec']);
    expect(out[0]).toMatchObject({ kind: 'blocked', title: 'INT-2026-002 · Titel INT-2026-002', label: 'wartet · Plan-Entscheidung', projectPath: '/compass', preview: 'ExitPlanMode' });
    expect(out[1]).toMatchObject({ kind: 'done', title: 'INT-2026-004 · Titel INT-2026-004', label: 'wartet auf dich · Spec · spec.md', projectPath: '/applai', at: 4 });
  });

  it('a session assigned to two rows takes the label of the newest row; an ended assignment does not label', () => {
    const sessions = [s('x', { agentStatus: 'done', agentDoneAt: 1 })];
    const rows: BellVorhabenRow[] = [
      vr({ intentId: 'INT-2026-001', sessionId: 'cloud-x', zustand: 'wartet', lastChangedMs: 10 }),
      vr({ intentId: 'INT-2026-002', sessionId: 'cloud-x', zustand: 'wartet', lastChangedMs: 20 }),
      vr({ intentId: 'INT-2026-003', session: { id: 'cloud-x', ended: true }, zustand: 'sitzung_beendet', lastChangedMs: 99 }),
    ];
    expect(buildBellRows(sessions, rows, null)[0].title).toBe('INT-2026-002 · Titel INT-2026-002');
    expect(buildBellRows(sessions, [rows[2]], null)[0].title).toBeUndefined();
  });

  it('a session without a row keeps its own preview and no title; a missing timestamp reads 0', () => {
    expect(buildBellRows([s('a', { agentStatus: 'done', agentDoneAt: 7, agentDonePreview: 'All done' })], [], null)[0]).toMatchObject({ kind: 'done', preview: 'All done', at: 7 });
    expect(buildBellRows([{ id: 'a', agentStatus: 'blocked' }], [], null)[0]).toMatchObject({ at: 0 });
    expect(buildBellRows([{ id: 'a', agentStatus: 'blocked' }], [], null)[0].terminalSessionId).toBeUndefined();
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
