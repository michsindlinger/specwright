import type { TerminalSession } from './aos-cloud-terminal-sidebar.js';

/**
 * Derive the display title for a terminal tab.
 *
 * Precedence:
 * 1. User-set custom name (`customNameSet === true`) wins.
 * 2. Workflow tabs derive from `workflowName` (+ optional `workflowContext`).
 * 3. Fallback to `session.name`.
 */
export function getTabTitle(session: Pick<TerminalSession, 'name' | 'customNameSet' | 'isWorkflow' | 'workflowName' | 'workflowContext'>): string {
  if (session.customNameSet) return session.name;
  if (session.isWorkflow && session.workflowName) {
    return session.workflowContext
      ? `${session.workflowName}: ${session.workflowContext}`
      : session.workflowName;
  }
  return session.name;
}

/**
 * Where this session is actually running, for the tab tooltip.
 *
 * Deliberately NOT folded into {@link getTabTitle}: that value seeds the rename
 * input and the persisted tab name, so a location suffix would leak into
 * user-set names. Returns an empty string when the session runs in its own
 * project directory (the unremarkable case) or before the server has reported
 * an `effectiveCwd`.
 */
export function getSessionLocationHint(
  session: Pick<TerminalSession, 'projectPath' | 'effectiveCwd'>
): string {
  const cwd = session.effectiveCwd;
  if (!cwd) return '';
  const normalize = (p: string): string => p.replace(/\/+$/, '');
  if (normalize(cwd) === normalize(session.projectPath)) return '';
  const dirName = normalize(cwd).split('/').filter(Boolean).pop() ?? cwd;
  return dirName;
}
