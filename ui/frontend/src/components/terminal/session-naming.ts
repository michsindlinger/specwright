/**
 * Pure helpers that keep terminal-tab naming identical on every device.
 *
 * Auto names ("Terminal 2", "Claude Session 3") used to be assigned by a
 * per-browser counter in arrival order, so the Mac and the phone disagreed.
 * Now they are derived from a stable order (createdAt, then backend id) per
 * project and terminal type; user-given names come from the shared workspace
 * (`sessionNames`, keyed by backend session id) and win.
 */

import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';
import type { CloudTerminalAgentStatus } from '../../../../src/shared/types/cloud-terminal.protocol.js';

export interface BackendSessionLike {
  sessionId: string;
  projectPath: string;
  status: string;
  terminalType?: 'shell' | 'claude-code';
  createdAt: string | Date;
  effectiveCwd?: string;
  agentStatus?: CloudTerminalAgentStatus;
  agentStatusAt?: string | Date;
  agentStatusReason?: string;
}

export interface WorkflowMetadataLike {
  workflowName?: string;
  workflowContext?: string;
  workflowCommand?: string;
}

function toMs(v: string | Date | number | undefined): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** Tabs whose title never comes from the auto-name scheme. */
function isAutoNamed(s: TerminalSession): boolean {
  return !!s.terminalSessionId && !s.isWorkflow && !s.isSetupSession;
}

/**
 * Applies shared custom names and deterministic auto names.
 * Returns the SAME array when nothing changed, so callers can assign the
 * result in `willUpdate` without triggering another update cycle.
 */
export function assignAutoNames(
  sessions: TerminalSession[],
  sessionNames: Record<string, string>
): TerminalSession[] {
  // Group auto-named tabs per project + type, ordered by creation time.
  const groups = new Map<string, TerminalSession[]>();
  for (const s of sessions) {
    if (!isAutoNamed(s)) continue;
    const key = `${s.projectPath} ${s.terminalType ?? 'claude-code'}`;
    const g = groups.get(key) ?? [];
    g.push(s);
    groups.set(key, g);
  }
  const desired = new Map<string, { name: string; customNameSet: boolean }>();
  for (const g of groups.values()) {
    g.sort((a, b) => {
      const d = toMs(a.createdAt) - toMs(b.createdAt);
      return d !== 0 ? d : (a.terminalSessionId ?? '').localeCompare(b.terminalSessionId ?? '');
    });
    let n = 0;
    for (const s of g) {
      const custom = s.terminalSessionId ? sessionNames[s.terminalSessionId] : undefined;
      if (custom) {
        desired.set(s.id, { name: custom, customNameSet: true });
      } else {
        n++;
        const type = s.terminalType ?? 'claude-code';
        desired.set(s.id, { name: type === 'shell' ? `Terminal ${n}` : `Claude Session ${n}`, customNameSet: false });
      }
    }
  }

  let changed = false;
  const next = sessions.map((s) => {
    const d = desired.get(s.id);
    if (!d) return s;
    if (s.name === d.name && (s.customNameSet ?? false) === d.customNameSet) return s;
    changed = true;
    return { ...s, name: d.name, customNameSet: d.customNameSet };
  });
  return changed ? next : sessions;
}

/**
 * Builds the frontend tab for a session the backend already owns. Used both
 * by the list response and when adopting a `created` from another device.
 * The name is a placeholder; assignAutoNames() settles it.
 */
export function toRestoredTab(b: BackendSessionLike, workflow?: WorkflowMetadataLike): TerminalSession {
  const type = b.terminalType || 'claude-code';
  const at = toMs(b.agentStatusAt);
  const tab: TerminalSession = {
    id: `restored-${b.sessionId}`,
    name: type === 'shell' ? 'Terminal' : 'Claude Session',
    status: b.status === 'active' ? 'active' : 'disconnected',
    createdAt: new Date(toMs(b.createdAt) || Date.now()),
    projectPath: b.projectPath,
    terminalSessionId: b.sessionId,
    terminalType: type,
    ...(b.effectiveCwd ? { effectiveCwd: b.effectiveCwd } : {}),
    ...(b.agentStatus !== undefined
      ? {
          agentStatus: b.agentStatus,
          agentStatusAt: at || undefined,
          agentStatusReason: b.agentStatusReason,
        }
      : {}),
  };
  if (workflow?.workflowName) {
    tab.isWorkflow = true;
    tab.workflowName = workflow.workflowName;
    if (workflow.workflowContext) tab.workflowContext = workflow.workflowContext;
    tab.name = workflow.workflowName;
  }
  return tab;
}

/** A `created` is ours when its requestId matches one of our pending (not yet connected) tabs. */
export function isOwnCreateRequest(sessions: TerminalSession[], requestId: unknown): boolean {
  if (typeof requestId !== 'string' || !requestId) return false;
  return sessions.some((s) => s.id === requestId);
}
