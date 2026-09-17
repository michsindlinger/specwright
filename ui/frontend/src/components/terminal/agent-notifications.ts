/**
 * Pure helpers for the agent bell (blocked / finished) in the app header
 * (`aos-glocke`, INT-2026-010; before that in the cloud-terminal header).
 *
 * DOM-free (unit-tested in ui/tests/unit/agent-notifications.test.ts). The
 * list is derived — never kept — from what app.ts owns: the terminal sessions
 * (backend snapshot: status, the „fertig, unbeantwortet"-mark), the Vorhaben
 * rows (labels only) and the visible session. INT-2026-016 (AK-02): the
 * browser-side notification list of earlier stages is gone; the backend is
 * the single source, so a reload, another device or a restart all show the
 * same bell.
 */

import { paneShowingProject } from './pane-zoom.js';
import { STEP_LABELS, ZUSTAND_LABELS } from '../vorhaben/vorhaben-sort.js';
import type { CloudTerminalAgentStatus } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import type { VorhabenStep, VorhabenZustand } from '../../../../src/shared/types/vorhaben.protocol.js';

/** What {@link ringsForAgentEvent} needs to know about one agent-event message. */
export interface RingInput {
  /** `event` from the message (untyped: an unknown event must not throw). */
  event: string;
  /** Reduced status carried by the message. */
  status: CloudTerminalAgentStatus;
  /** Status the session had before this message. */
  prevStatus: CloudTerminalAgentStatus | undefined;
  /** The user is looking at this very session (active tab of an open sidebar). */
  isActive: boolean;
}

/**
 * Whether an agent event rings the chime. Never for the session the user is
 * looking at (INT-2026-010: "looking at" = sidebar open and tab active). The two plan-review events ring once per review even when the
 * session was already blocked (review-failed only changes the reason, the
 * status stays). Otherwise: every stop, and each transition into blocked —
 * not every blocked event, because Claude re-notifies while a prompt waits.
 */
export function ringsForAgentEvent(input: RingInput): boolean {
  if (input.isActive) return false;
  if (input.event === 'review-injected' || input.event === 'review-failed') return true;
  if (input.event === 'stop') return true;
  return input.status === 'blocked' && input.prevStatus !== 'blocked';
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
 * Sharpen a jump into "alone on the screen" (INT-2026-005, FA-35): whatever pane the
 * session ends up in gets zoomed, as Cmd/Ctrl+Shift+Enter would. A background session
 * takes an empty pane before it evicts one — after un-zooming the user finds the old
 * arrangement plus the new session, not minus a shell. Single mode has no panes, so
 * `select-tab` stays as it is (the tab already fills the area).
 */
export function soloJumpTarget(target: JumpTarget, paneSessionIds: readonly (string | null)[]): JumpTarget {
  switch (target.kind) {
    case 'focus-pane':
      return { kind: 'zoom-pane', pane: target.pane };
    case 'assign-pane': {
      const empty = paneSessionIds[target.pane] ? paneSessionIds.findIndex((id) => !id) : -1;
      return { kind: 'assign-pane', pane: empty >= 0 ? empty : target.pane, keepZoom: true };
    }
    default:
      return target;
  }
}

/**
 * A row in the bell dropdown, derived from one terminal session
 * (see {@link buildBellRows}).
 */
export interface BellRow {
  /** Frontend TerminalSession.id — what the sidebar, the panes and the visible-session rule key on. */
  sessionId: string;
  /** Backend CloudTerminalSessionId — what `vorhaben:state` and the WS carry (INT-2026-010, FA-06). */
  terminalSessionId?: string;
  kind: 'blocked' | 'done';
  /** Epoch ms: when the dialog opened (blocked) or the Stop that set the mark (done). */
  at: number;
  /** Reason (blocked) or last-assistant-message excerpt (done), when known. */
  preview?: string;
  /** INT-2026-016 (AK-03): „INT-2026-004 · Titel" when the session belongs to a Vorhaben row. */
  title?: string;
  /** INT-2026-016 (AK-03): the row's state as the list shows it („wartet auf dich · Spec · spec.md"). */
  label?: string;
  /** Project of the Vorhaben row (its id is the path); falls back to the session's project in the bell. */
  projectPath?: string;
}

/** The session fields {@link buildBellRows} reads. */
export interface BellSession {
  id: string;
  terminalSessionId?: string;
  agentStatus?: CloudTerminalAgentStatus;
  agentStatusAt?: number;
  agentStatusReason?: string;
  /** Epoch ms of the „fertig, unbeantwortet"-mark (backend, INT-2026-016). */
  agentDoneAt?: number;
  /** Excerpt of the last assistant message that came with the Stop, when this browser saw it. */
  agentDonePreview?: string;
}

/** The Vorhaben row fields {@link buildBellRows} reads for labels (a subset of VorhabenRow). */
export interface BellVorhabenRow {
  projectId: string;
  intentId: string;
  titel: string;
  zustand: VorhabenZustand;
  zustandDetail: string;
  step?: VorhabenStep;
  lastChangedMs: number;
  session?: { id: string; ended?: boolean };
}

/** The state text of a row as the list renders it (mirrors aos-vorhaben-zeile). */
export function bellLabelOf(row: BellVorhabenRow): string {
  const detail = row.zustand === 'wartet_auf_dich' && row.step ? `${STEP_LABELS[row.step]} · ${row.zustandDetail}` : row.zustandDetail;
  const base = ZUSTAND_LABELS[row.zustand];
  // Dialog labels already name the kind („wartet · Plan-Entscheidung"); do not say it twice.
  return detail && !base.endsWith(detail) ? `${base} · ${detail}` : base;
}

/**
 * What the bell lists (INT-2026-016, AK-02): every session that shows a
 * dialog (`blocked`) or carries the backend's „fertig, unbeantwortet"-mark
 * (`agentDoneAt`) — nothing else, so a fresh session (`unknown`), a working
 * one, or a `done` whose mark did not survive a restart is never listed.
 * The session the user is *looking at* is never listed: that is the active
 * tab of an OPEN terminal sidebar (`sichtbareSessionId`); with the sidebar
 * closed every session is listed, the last active one included (INT-2026-010
 * review E2). The Vorhaben rows only label: a session that is the live
 * session of a row shows Kennung · Titel, the row's state and its project
 * (AK-03); among several rows the newest change wins, as the bell jump does.
 * Blocked rows come first, then finished ones, each newest first.
 */
export function buildBellRows(
  sessions: readonly BellSession[],
  rows: readonly BellVorhabenRow[],
  sichtbareSessionId: string | null | undefined
): BellRow[] {
  const rowByBackendId = new Map<string, BellVorhabenRow>();
  for (const r of rows) {
    if (!r.session || r.session.ended) continue;
    const prev = rowByBackendId.get(r.session.id);
    if (!prev || r.lastChangedMs > prev.lastChangedMs) rowByBackendId.set(r.session.id, r);
  }

  const blocked: BellRow[] = [];
  const done: BellRow[] = [];
  for (const s of sessions) {
    if (s.id === sichtbareSessionId) continue;
    const isBlocked = s.agentStatus === 'blocked';
    if (!isBlocked && !s.agentDoneAt) continue;
    const row = s.terminalSessionId ? rowByBackendId.get(s.terminalSessionId) : undefined;
    const preview = isBlocked ? s.agentStatusReason : s.agentDonePreview;
    const entry: BellRow = {
      sessionId: s.id,
      ...(s.terminalSessionId ? { terminalSessionId: s.terminalSessionId } : {}),
      kind: isBlocked ? 'blocked' : 'done',
      at: isBlocked ? (s.agentStatusAt ?? 0) : (s.agentDoneAt ?? 0),
      ...(preview ? { preview } : {}),
      ...(row ? { title: `${row.intentId} · ${row.titel}`, label: bellLabelOf(row), projectPath: row.projectId } : {}),
    };
    (isBlocked ? blocked : done).push(entry);
  }

  const newestFirst = (a: BellRow, b: BellRow): number => b.at - a.at;
  return [...blocked.sort(newestFirst), ...done.sort(newestFirst)];
}
