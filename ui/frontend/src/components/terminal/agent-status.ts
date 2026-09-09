/**
 * Pure helpers for rendering a claude-code session's agent status
 * (see src/shared/types/cloud-terminal.protocol.ts, CloudTerminalAgentStatus).
 * DOM-free so they can be unit-tested and reused by desktop tabs, pane headers
 * and the mobile tab bar.
 *
 * Rules:
 * - The server status is authoritative once known. The legacy `needsInput`
 *   regex flag only counts while no status is known (shell sessions, restored
 *   sessions before their first hook event).
 * - The PTY lifecycle wins over the agent status: a paused / disconnected /
 *   errored terminal shows that, never "working".
 */

import type { CloudTerminalAgentStatus } from '../../../../src/shared/types/cloud-terminal.protocol.js';
import { formatRelativeTime } from './agent-notifications.js';

export interface AgentStatusView {
  status: 'active' | 'paused' | 'disconnected' | 'error';
  agentStatus?: CloudTerminalAgentStatus;
  agentStatusAt?: number;
  agentStatusReason?: string;
  needsInput?: boolean;
}

export const AGENT_STATUS_LABEL: Record<CloudTerminalAgentStatus, string> = {
  unknown: '',
  idle: 'Bereit',
  working: 'Arbeitet',
  blocked: 'Wartet auf Eingabe',
  error: 'Fehler',
  done: 'Fertig',
};

/** Colours shared by desktop CSS classes and the mobile inline style. */
export const AGENT_STATUS_COLOR: Record<Exclude<CloudTerminalAgentStatus, 'unknown'>, string> = {
  idle: '#6e6e6e',
  working: '#4fc1ff',
  blocked: '#ff9800',
  error: '#f44336',
  done: '#4caf50',
};

/** True when a real agent status (not `unknown`) is known for this session. */
export function hasAgentStatus(s: Pick<AgentStatusView, 'agentStatus'>): boolean {
  return s.agentStatus !== undefined && s.agentStatus !== 'unknown';
}

/**
 * CSS modifier for the status dot: '' when no agent status is known or the
 * PTY itself is not active (its own colour must show through).
 */
export function agentStatusClass(s: Pick<AgentStatusView, 'status' | 'agentStatus'>): string {
  if (s.status !== 'active' || !hasAgentStatus(s)) return '';
  return `agent-${s.agentStatus}`;
}

/** Inline colour for the mobile dot; null → keep the PTY-derived colour. */
export function agentStatusColor(s: Pick<AgentStatusView, 'status' | 'agentStatus'>): string | null {
  if (s.status !== 'active' || !hasAgentStatus(s)) return null;
  return AGENT_STATUS_COLOR[s.agentStatus as Exclude<CloudTerminalAgentStatus, 'unknown'>];
}

/** Orange "!" badge: server-known blocked, else the legacy regex flag. */
export function needsAttention(s: Pick<AgentStatusView, 'agentStatus' | 'needsInput'>): boolean {
  if (hasAgentStatus(s)) return s.agentStatus === 'blocked';
  return s.needsInput === true;
}

/**
 * Tooltip text, e.g. "Wartet auf Eingabe: Berechtigung: Bash (vor 2 Min)".
 * Empty when no agent status is known.
 */
export function agentStatusTitle(
  s: Pick<AgentStatusView, 'agentStatus' | 'agentStatusAt' | 'agentStatusReason'>,
  now: number = Date.now()
): string {
  if (!hasAgentStatus(s)) return '';
  const label = AGENT_STATUS_LABEL[s.agentStatus as CloudTerminalAgentStatus];
  const reason = s.agentStatusReason ? `: ${s.agentStatusReason}` : '';
  const when = typeof s.agentStatusAt === 'number' ? ` (${formatRelativeTime(s.agentStatusAt, now)})` : '';
  return `${label}${reason}${when}`;
}
