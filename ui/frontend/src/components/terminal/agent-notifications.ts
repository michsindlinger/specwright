/**
 * Pure helpers for the "agent finished" bell in the cloud-terminal header.
 *
 * DOM-free (unit-tested in ui/tests/unit/agent-notifications.test.ts). The list
 * itself is owned by app.ts (it owns the sessions and the active id); the
 * sidebar renders it and resolves where a click has to jump.
 */

import { paneShowingProject } from './pane-zoom.js';
import type { CloudTerminalAgentStatus } from '../../../../src/shared/types/cloud-terminal.protocol.js';

export interface AgentNotification {
  /** Frontend TerminalSession.id (what the sidebar / panes key on). */
  sessionId: string;
  /** Backend CloudTerminalSessionId (what WS messages carry). */
  terminalSessionId: string;
  /** Epoch ms of the Stop event. */
  finishedAt: number;
  /** Sanitized, truncated excerpt of the last assistant message, if delivered. */
  preview?: string;
}

/** One entry per session: replaces an existing one and moves it to the front (newest first). */
export function upsertNotification(
  list: readonly AgentNotification[],
  entry: AgentNotification
): AgentNotification[] {
  return [entry, ...list.filter((n) => n.sessionId !== entry.sessionId)];
}

/** Returns the SAME array when nothing was removed, so Lit sees no change. */
export function removeNotification(
  list: AgentNotification[],
  sessionId: string | null | undefined
): AgentNotification[] {
  if (!sessionId || !list.some((n) => n.sessionId === sessionId)) return list;
  return list.filter((n) => n.sessionId !== sessionId);
}

/** Drops entries whose session no longer exists. Same-reference when nothing changes. */
export function pruneNotifications(
  list: AgentNotification[],
  liveSessionIds: ReadonlySet<string>
): AgentNotification[] {
  if (list.every((n) => liveSessionIds.has(n.sessionId))) return list;
  return list.filter((n) => liveSessionIds.has(n.sessionId));
}

/** "gerade eben" | "vor 3 Min" | "vor 2 Std" | "HH:MM" (older than a day). */
export function formatRelativeTime(finishedAt: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.round((now - finishedAt) / 1000));
  if (diffSec < 45) return 'gerade eben';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `vor ${min} Min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const d = new Date(finishedAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface JumpInput {
  /** Layout is split-2 / quad-4 (single mode has no panes). */
  isSplit: boolean;
  /** Active session per pane (frontend ids), length >= paneCount. */
  paneSessionIds: readonly (string | null)[];
  paneCount: number;
  /** Project shown per pane (derived from paneSessionIds), length === paneCount. */
  paneProjects: readonly (string | null)[];
  /** Effective zoomed pane or null. */
  zoomedPane: number | null;
  focusedPane: number;
  sessionId: string;
  sessionProject: string;
}

export type JumpTarget =
  /** Single mode: just make the tab active (app.ts may need a project switch). */
  | { kind: 'select-tab' }
  /** Session is the visible tab of `pane`; focus that pane. */
  | { kind: 'focus-pane'; pane: number }
  /** Session is the visible tab of `pane`, but another pane is zoomed; move the zoom. */
  | { kind: 'zoom-pane'; pane: number }
  /** Session is a background tab; assign it into `pane` (keeping the zoom if any). */
  | { kind: 'assign-pane'; pane: number; keepZoom: boolean };

/**
 * Where a click on a bell entry has to go.
 *
 * Background tabs belong to no pane, so the target pane is chosen in this order:
 *   (a) the pane the user is looking at (zoomed ?? focused) — if it shows the same project,
 *   (b) otherwise the first pane showing that project,
 *   (c) otherwise the pane the user is looking at (it switches project).
 * Rule (a) stops a tab from being pulled into the "other" pane when two panes
 * show the same project.
 */
export function resolveJumpTarget(input: JumpInput): JumpTarget {
  const { isSplit, paneSessionIds, paneCount, paneProjects, zoomedPane, focusedPane } = input;
  if (!isSplit || paneCount <= 1) return { kind: 'select-tab' };

  const inPane = paneSessionIds.slice(0, paneCount).indexOf(input.sessionId);
  if (inPane >= 0) {
    if (zoomedPane !== null && zoomedPane !== inPane) return { kind: 'zoom-pane', pane: inPane };
    return { kind: 'focus-pane', pane: inPane };
  }

  const looking = zoomedPane ?? focusedPane;
  let pane = looking;
  if (paneProjects[looking] !== input.sessionProject) {
    const other = paneShowingProject(paneProjects, input.sessionProject, -1);
    if (other >= 0) pane = other;
  }
  return { kind: 'assign-pane', pane, keepZoom: zoomedPane !== null };
}

/**
 * A row in the bell dropdown. Two sources feed it (see {@link buildBellRows}):
 * `blocked` comes from the live agent status, `done` from a Stop notification.
 */
export interface BellRow {
  sessionId: string;
  kind: 'blocked' | 'done';
  /** Epoch ms of the event this row is about. */
  at: number;
  /** Reason (blocked) or last-assistant-message excerpt (done), when known. */
  preview?: string;
}

/** The session fields {@link buildBellRows} reads. */
export interface BellSession {
  id: string;
  agentStatus?: CloudTerminalAgentStatus;
  agentStatusAt?: number;
  agentStatusReason?: string;
}

/**
 * What the bell lists: sessions blocked on the user, then agents that finished.
 *
 * `blocked` is derived from the live agent status rather than kept as its own
 * notification, so it appears and disappears exactly when the status does — no
 * second copy of the state to clear. A session that is blocked never also shows
 * a done row. The session the user is looking at is never listed (same rule the
 * Stop path has always used).
 */
export function buildBellRows(
  notifications: readonly AgentNotification[],
  sessions: readonly BellSession[],
  activeSessionId: string | null
): BellRow[] {
  const blocked: BellRow[] = [];
  const blockedIds = new Set<string>();
  for (const s of sessions) {
    if (s.agentStatus !== 'blocked' || s.id === activeSessionId) continue;
    blockedIds.add(s.id);
    blocked.push({
      sessionId: s.id,
      kind: 'blocked',
      at: s.agentStatusAt ?? 0,
      ...(s.agentStatusReason ? { preview: s.agentStatusReason } : {}),
    });
  }

  const known = new Set(sessions.map((s) => s.id));
  const done: BellRow[] = [];
  for (const n of notifications) {
    if (!known.has(n.sessionId) || blockedIds.has(n.sessionId) || n.sessionId === activeSessionId) continue;
    done.push({
      sessionId: n.sessionId,
      kind: 'done',
      at: n.finishedAt,
      ...(n.preview ? { preview: n.preview } : {}),
    });
  }

  const newestFirst = (a: BellRow, b: BellRow): number => b.at - a.at;
  return [...blocked.sort(newestFirst), ...done.sort(newestFirst)];
}
